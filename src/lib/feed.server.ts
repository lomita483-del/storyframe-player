import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildPlaybackUrl, type ProviderConfig } from "@/lib/providers";

/**
 * Ingests a licensed catalogue feed (the operator's own provider/aggregator API)
 * and turns each entry into a playable title. Playback URLs are either provided
 * directly by the feed or built from the provider asset ID + CDN settings.
 */

export type FeedConfig = {
  url: string;
  token?: string;
  token_header?: string;
  items_path?: string;
  default_provider?: string;
};

type FeedItem = Record<string, unknown>;

function str(item: FeedItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function num(item: FeedItem, ...keys: string[]) {
  const raw = str(item, ...keys);
  const value = Number(raw);
  return raw && Number.isFinite(value) ? value : null;
}

function list(item: FeedItem, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = item[key];
    if (Array.isArray(value)) {
      return value
        .map((entry) =>
          typeof entry === "string"
            ? entry
            : typeof (entry as { name?: string })?.name === "string"
              ? (entry as { name: string }).name
              : "",
        )
        .filter(Boolean)
        .slice(0, 20);
    }
    if (typeof value === "string" && value.trim()) {
      return value.split(",").map((entry) => entry.trim()).filter(Boolean).slice(0, 20);
    }
  }
  return [];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function dig(payload: unknown, path?: string): FeedItem[] {
  if (Array.isArray(payload)) return payload as FeedItem[];
  let current: unknown = payload;
  if (path) {
    for (const key of path.split(".").filter(Boolean)) {
      current = (current as Record<string, unknown> | null)?.[key];
    }
    return Array.isArray(current) ? (current as FeedItem[]) : [];
  }
  for (const key of ["items", "data", "results", "titles", "movies", "catalog", "catalogue"]) {
    const value = (payload as Record<string, unknown> | null)?.[key];
    if (Array.isArray(value)) return value as FeedItem[];
  }
  return [];
}

export async function fetchFeedItems(config: FeedConfig) {
  if (!config.url) throw new Error("Add your licensed feed URL first.");
  const headers: Record<string, string> = { accept: "application/json" };
  if (config.token) {
    const header = config.token_header?.trim() || "Authorization";
    headers[header] =
      header.toLowerCase() === "authorization" && !/^bearer /i.test(config.token)
        ? `Bearer ${config.token}`
        : config.token;
  }
  const res = await fetch(config.url, { headers });
  if (!res.ok) throw new Error(`Feed request failed (${res.status})`);
  const payload = (await res.json()) as unknown;
  return dig(payload, config.items_path);
}

async function providerConfigs() {
  const { data, error } = await supabaseAdmin
    .from("provider_settings")
    .select("provider,config,is_enabled");
  if (error) throw error;
  const map: Record<string, ProviderConfig> = {};
  for (const row of data ?? []) {
    const config = (row.config ?? {}) as Record<string, unknown>;
    const clean: ProviderConfig = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === "string") clean[key] = value;
    }
    map[row.provider as string] = clean;
  }
  return map;
}

export async function getFeedConfig(): Promise<FeedConfig> {
  const { data, error } = await supabaseAdmin
    .from("provider_settings")
    .select("config")
    .eq("provider", "licensed_feed")
    .maybeSingle();
  if (error) throw error;
  return ((data?.config ?? {}) as FeedConfig) ?? { url: "" };
}

/** Maps one feed entry onto a movies row, or null when it isn't playable. */
function mapItem(item: FeedItem, configs: Record<string, ProviderConfig>, fallbackProvider?: string) {
  const title = str(item, "title", "name", "original_title");
  if (!title) return null;

  const provider = str(item, "provider", "cdn", "host") ?? fallbackProvider ?? null;
  const assetId = str(item, "asset_id", "playback_id", "video_id", "video_uid", "uid", "guid");
  const directUrl = str(item, "video_url", "hls_url", "stream_url", "playback_url", "url", "m3u8");

  let videoUrl = directUrl;
  let videoType = directUrl && /\.m3u8(\?|$)/i.test(directUrl) ? "hls" : "mp4";
  if (!videoUrl && provider) {
    const built = buildPlaybackUrl(provider, assetId, configs[provider] ?? {});
    if (built) {
      videoUrl = built.url;
      videoType = built.type;
    }
  }
  if (!videoUrl) return null;

  const externalId = str(item, "external_id", "id", "uuid") ?? assetId ?? slugify(title);
  const mediaType = (str(item, "media_type", "type") ?? "movie").toLowerCase().includes("tv")
    ? "tv"
    : "movie";
  const genres = list(item, "genres", "genre", "categories");

  return {
    external_id: `feed:${externalId}`,
    title,
    slug: `${slugify(title) || "title"}-${String(externalId).slice(0, 12).toLowerCase()}`,
    description: str(item, "description", "overview", "synopsis")?.slice(0, 2000) ?? null,
    poster_url: str(item, "poster_url", "poster", "image", "thumbnail"),
    backdrop_url:
      str(item, "backdrop_url", "backdrop", "cover", "banner") ??
      str(item, "poster_url", "poster", "image", "thumbnail"),
    video_url: videoUrl,
    video_type: videoType,
    subtitle_url: str(item, "subtitle_url", "subtitles_url"),
    trailer_url: str(item, "trailer_url", "trailer"),
    provider,
    provider_asset_id: assetId,
    genre: genres[0]?.slice(0, 40) ?? "Featured",
    release_year: num(item, "release_year", "year"),
    runtime: num(item, "runtime", "duration_minutes"),
    rating: num(item, "rating", "vote_average"),
    quality: str(item, "quality") ?? "1080p",
    cast: list(item, "cast", "actors", "starring"),
    director: str(item, "director"),
    media_type: mediaType,
    is_published: true,
    is_imported: true,
  };
}

export async function importLicensedCatalogue(limit = 200) {
  const feed = await getFeedConfig();
  const configs = await providerConfigs();
  const items = await fetchFeedItems(feed);

  const rows: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const item of items.slice(0, limit)) {
    const row = mapItem(item, configs, feed.default_provider);
    if (row) rows.push(row);
    else skipped += 1;
  }

  if (rows.length === 0) {
    return { imported: 0, skipped, total: items.length };
  }

  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabaseAdmin
      .from("movies")
      .upsert(rows.slice(i, i + 50) as never, { onConflict: "external_id" });
    if (error) throw error;
  }

  return { imported: rows.length, skipped, total: items.length };
}

/** Dry run so the operator can confirm the feed shape before importing. */
export async function testLicensedFeedConnection() {
  const feed = await getFeedConfig();
  const configs = await providerConfigs();
  const items = await fetchFeedItems(feed);
  const sample = items.slice(0, 5).map((item) => mapItem(item, configs, feed.default_provider));
  return {
    total: items.length,
    playable: sample.filter(Boolean).length,
    preview: sample.filter(Boolean).map((row) => ({
      title: String(row!["title"]),
      video_url: String(row!["video_url"]),
      video_type: String(row!["video_type"]),
    })),
  };
}
