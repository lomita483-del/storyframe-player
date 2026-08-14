import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "media";
export const STORAGE_PREFIX = "storage://";

export type WhereToWatchLink = { name: string; url: string };

/** Official services we can legally deep-link viewers out to. */
export const WATCH_SERVICES = [
  "Netflix",
  "Prime Video",
  "Disney+",
  "Apple TV",
  "Max",
  "Hulu",
  "Showmax",
  "YouTube Movies",
  "Google Play",
  "Other",
] as const;

/** Platforms that officially support third-party iframe embedding. */
export const EMBED_PROVIDERS = [
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "cloudflare", label: "Cloudflare Stream" },
] as const;

export function isStorageRef(value?: string | null) {
  return Boolean(value?.startsWith(STORAGE_PREFIX));
}

export function storagePath(ref: string) {
  return ref.slice(STORAGE_PREFIX.length);
}

/** Upload a file the operator owns to Cloud storage and return its portable ref. */
export async function uploadMedia(file: File, folder: "posters" | "backdrops" | "videos" | "subtitles") {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    ...(file.type ? { contentType: file.type } : {}),
  });
  if (error) throw error;
  const ref = `${STORAGE_PREFIX}${path}`;
  return { ref, url: (await resolveMediaUrl(ref)) ?? "" };
}

/** Turn a single storage ref into a temporary playable URL. */
export async function resolveMediaUrl(value?: string | null) {
  if (!value) return null;
  if (!isStorageRef(value)) return value;
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(storagePath(value), 60 * 60 * 6);
  if (error) return null;
  return data.signedUrl;
}

const MEDIA_KEYS = ["poster_url", "backdrop_url", "video_url", "subtitle_url", "trailer_url"] as const;

/** Batch-resolve every storage ref across a list of rows in one request. */
export async function hydrateMediaRefs<T extends Record<string, unknown>>(rows: T[]): Promise<T[]> {
  const paths = new Set<string>();
  for (const row of rows) {
    for (const key of MEDIA_KEYS) {
      const value = row[key];
      if (typeof value === "string" && isStorageRef(value)) paths.add(storagePath(value));
    }
  }
  if (paths.size === 0) return rows;

  const list = [...paths];
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(list, 60 * 60 * 6);
  if (error || !data) return rows;

  const map = new Map<string, string>();
  data.forEach((entry, index) => {
    const path = list[index];
    if (path && entry.signedUrl) map.set(path, entry.signedUrl);
  });

  return rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const key of MEDIA_KEYS) {
      const value = row[key];
      if (typeof value === "string" && isStorageRef(value)) {
        next[key] = map.get(storagePath(value)) ?? null;
      }
    }
    return next as T;
  });
}

/**
 * Build an iframe src for providers that allow embedding.
 * Returns null for anything we don't explicitly support.
 */
export function embedSrc(provider?: string | null, url?: string | null) {
  if (!provider || !url) return null;
  const raw = url.trim();
  try {
    if (provider === "youtube") {
      const id = /^[\w-]{11}$/.test(raw)
        ? raw
        : new URL(raw).searchParams.get("v") ??
          new URL(raw).pathname.split("/").filter(Boolean).pop() ??
          null;
      return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
    }
    if (provider === "vimeo") {
      const id = /^\d+$/.test(raw) ? raw : new URL(raw).pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (provider === "cloudflare") {
      const host = new URL(raw).hostname;
      const allowed =
        host === "iframe.videodelivery.net" ||
        host.endsWith(".cloudflarestream.com") ||
        host === "customer-embed.cloudflarestream.com";
      return allowed ? raw : null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Use Internet Archive's official player for imported public-domain films. */
export function archiveEmbedSrc(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "archive.org" && !parsed.hostname.endsWith(".archive.org")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const downloadIndex = parts.indexOf("download");
    const identifier = downloadIndex >= 0 ? parts[downloadIndex + 1] : null;
    return identifier ? `https://archive.org/embed/${encodeURIComponent(identifier)}` : null;
  } catch {
    return null;
  }
}

export function parseWhereToWatch(value: unknown): WhereToWatchLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = typeof record['name'] === "string" ? record['name'] : "";
    const url = typeof record['url'] === "string" ? record['url'] : "";
    return name && url ? [{ name, url }] : [];
  });
}
