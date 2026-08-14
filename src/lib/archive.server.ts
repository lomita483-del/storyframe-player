import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Imports genuinely public-domain feature films from the Internet Archive.
 * Unlike TMDB metadata, these come with a real, directly playable MP4 URL,
 * so the titles are watchable inside the app straight away.
 */

const SEARCH = "https://archive.org/advancedsearch.php";

type SearchDoc = {
  identifier: string;
  title?: string;
  description?: string | string[];
  year?: string | number;
  downloads?: number;
  subject?: string | string[];
};

type MetaFile = { name: string; format?: string; size?: string; length?: string };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function search(rows: number): Promise<SearchDoc[]> {
  const url = new URL(SEARCH);
  url.searchParams.set(
    "q",
    'collection:(feature_films) AND mediatype:(movies) AND format:(MPEG4)',
  );
  for (const field of ["identifier", "title", "description", "year", "downloads", "subject"]) {
    url.searchParams.append("fl[]", field);
  }
  url.searchParams.set("sort[]", "downloads desc");
  url.searchParams.set("rows", String(rows));
  url.searchParams.set("page", "1");
  url.searchParams.set("output", "json");

  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Archive.org search failed (${res.status})`);
  const json = (await res.json()) as { response?: { docs?: SearchDoc[] } };
  return json.response?.docs ?? [];
}

/** Picks the best directly playable MP4 for an item, plus a poster + runtime. */
async function resolveItem(identifier: string) {
  const res = await fetch(`https://archive.org/metadata/${identifier}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { files?: MetaFile[] };
  const files = json.files ?? [];

  const videos = files.filter(
    (f) => /\.mp4$/i.test(f.name) && !/sample/i.test(f.name) && Number(f.size ?? 0) > 20_000_000,
  );
  videos.sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0));
  const video = videos[0];
  if (!video) return null;

  const thumb = files.find((f) => /\.(jpg|jpeg|png)$/i.test(f.name) && /thumb|001/i.test(f.name));
  const seconds = Number(video.length ?? 0);

  return {
    videoUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(video.name)}`,
    posterUrl: thumb
      ? `https://archive.org/download/${identifier}/${encodeURIComponent(thumb.name)}`
      : `https://archive.org/services/img/${identifier}`,
    runtime: Number.isFinite(seconds) && seconds > 60 ? Math.round(seconds / 60) : null,
  };
}

export async function importPublicDomainFilms(limit = 24) {
  const docs = await search(Math.max(limit * 2, 40));

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("movies")
    .select("id,slug,video_url")
    .not("video_url", "is", null)
    .like("video_url", "%archive.org%");
  if (existingError) throw existingError;
  const existing = new Set((existingRows ?? []).map((row) => row.slug));

  const toInsert: Record<string, unknown>[] = [];

  for (const doc of docs) {
    if (toInsert.length >= limit) break;
    const title = doc.title?.trim();
    if (!title) continue;
    const slug = `${slugify(title) || "film"}-ia-${doc.identifier.slice(0, 24).toLowerCase()}`;
    if (existing.has(slug)) continue;

    const resolved = await resolveItem(doc.identifier);
    if (!resolved) continue;

    const year = Number(String(doc.year ?? "").slice(0, 4));
    const subject = first(doc.subject);

    toInsert.push({
      title,
      slug,
      description: (first(doc.description) ?? "").replace(/<[^>]*>/g, "").slice(0, 1200) || null,
      poster_url: resolved.posterUrl,
      backdrop_url: resolved.posterUrl,
      video_url: resolved.videoUrl,
      video_type: "mp4",
      runtime: resolved.runtime,
      release_year: Number.isFinite(year) && year > 1870 ? year : null,
      genre: subject ? subject.split(/[,;]/)[0]!.trim().slice(0, 40) : "Classic",
      quality: "480p",
      media_type: "movie",
      is_published: true,
      is_imported: true,
      where_to_watch: [
        { name: "Internet Archive", url: `https://archive.org/details/${doc.identifier}` },
      ],
    });
  }

  for (let i = 0; i < toInsert.length; i += 50) {
    const { error } = await supabaseAdmin
      .from("movies")
      .insert(toInsert.slice(i, i + 50) as never);
    if (error) throw error;
  }

  return { inserted: toInsert.length, updated: 0 };
}
