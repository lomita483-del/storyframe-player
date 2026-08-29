import { supabaseAdmin } from "@/integrations/supabase/client.server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const IMG = "https://image.tmdb.org/t/p";
const API = "https://api.themoviedb.org/3";

export type SyncResult = { inserted: number; updated: number; skipped?: string };

type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
};

function tmdbKey() {
  const key = process.env["TMDB_API_KEY"];
  if (!key) throw new Error("TMDB_API_KEY is not configured");
  return key;
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = tmdbKey();
  const url = new URL(`${API}${path}`);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const headers: Record<string, string> = { accept: "application/json" };
  if (key.startsWith("ey")) headers["Authorization"] = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`TMDB ${path} failed (${res.status})`);
  return (await res.json()) as T;
}

function img(path: string | null | undefined, size: string) {
  return path ? `${IMG}/${size}${path}` : null;
}

async function genreMap(kind: "movie" | "tv") {
  const data = await tmdb<{ genres: { id: number; name: string }[] }>(`/genre/${kind}/list`);
  const map = new Map<number, string>();
  for (const g of data.genres) map.set(g.id, g.name);
  return map;
}

/* ------------------------- catalogue sync (shallow) ------------------------- */

export async function syncCatalogue(): Promise<SyncResult> {
  const [movieGenres, tvGenres] = await Promise.all([genreMap("movie"), genreMap("tv")]);

  const lists: { path: string; type: "movie" | "tv"; trending: boolean }[] = [
    { path: "/trending/movie/day", type: "movie", trending: true },
    { path: "/trending/tv/week", type: "tv", trending: true },
    { path: "/movie/popular", type: "movie", trending: false },
    { path: "/tv/popular", type: "tv", trending: false },
    { path: "/movie/top_rated", type: "movie", trending: false },
    { path: "/tv/top_rated", type: "tv", trending: false },
    { path: "/movie/now_playing", type: "movie", trending: false },
    { path: "/tv/on_the_air", type: "tv", trending: false },
  ];

  type Candidate = { item: TmdbItem; type: "movie" | "tv"; trending: boolean };
  const found = new Map<string, Candidate>();

  for (const list of lists) {
    for (const page of ["1", "2"]) {
      const data = await tmdb<{ results: TmdbItem[] }>(list.path, { page });
      for (const item of data.results ?? []) {
        const key = `${list.type}:${item.id}`;
        const prev = found.get(key);
        found.set(key, {
          item,
          type: list.type,
          trending: list.trending || Boolean(prev?.trending),
        });
      }
    }
  }

  const candidates = [...found.values()];
  const ids = candidates.map((c) => c.item.id);

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("movies")
    .select("id,tmdb_id,media_type")
    .in("tmdb_id", ids.length ? ids : [0]);
  if (existingError) throw existingError;

  const existing = new Map<string, string>();
  for (const row of existingRows ?? []) {
    if (row.tmdb_id != null) existing.set(`${row.media_type}:${row.tmdb_id}`, row.id);
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];

  for (const { item, type, trending } of candidates) {
    const title = item.title ?? item.name ?? "Untitled";
    const genres = type === "movie" ? movieGenres : tvGenres;
    const genre = item.genre_ids?.length ? (genres.get(item.genre_ids[0]!) ?? null) : null;
    const date = type === "movie" ? item.release_date : item.first_air_date;
    const year = date ? Number(date.slice(0, 4)) : null;

    const shared = {
      title,
      description: item.overview || null,
      poster_url: img(item.poster_path, "w500"),
      backdrop_url: img(item.backdrop_path, "w1280"),
      genre,
      release_year: Number.isFinite(year) ? year : null,
      rating: item.vote_average != null ? Math.round(item.vote_average * 10) / 10 : null,
      popularity: item.popularity ?? null,
      first_air_date: type === "tv" && date ? date : null,
      is_trending: trending,
      last_synced_at: new Date().toISOString(),
    };

    const key = `${type}:${item.id}`;
    const id = existing.get(key);
    if (id) {
      toUpdate.push({ id, patch: shared });
    } else {
      toInsert.push({
        ...shared,
        tmdb_id: item.id,
        media_type: type,
        slug: `${slugify(title) || type}-${item.id}`,
        is_published: true,
        is_imported: true,
        quality: "1080p",
        video_type: "mp4",
      });
    }
  }

  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { error } = await supabaseAdmin.from("movies").insert(chunk as never);
    if (error) throw error;
  }

  for (const row of toUpdate) {
    const { error } = await supabaseAdmin
      .from("movies")
      .update(row.patch as never)
      .eq("id", row.id);
    if (error) throw error;
  }

  return { inserted: toInsert.length, updated: toUpdate.length };
}

/** Runs a sync while recording it in sync_runs, and never twice at once. */
export async function runSync(options: { force?: boolean; maxAgeHours?: number } = {}) {
  const maxAgeMs = (options.maxAgeHours ?? 12) * 3600_000;

  const { data: recent } = await supabaseAdmin
    .from("sync_runs")
    .select("id,status,started_at,finished_at")
    .order("started_at", { ascending: false })
    .limit(1);

  const last = recent?.[0];
  if (last) {
    const age = Date.now() - new Date(last.started_at).getTime();
    if (last.status === "running" && age < 10 * 60_000) {
      return { inserted: 0, updated: 0, skipped: "already-running" } satisfies SyncResult;
    }
    if (!options.force && last.status === "success" && age < maxAgeMs) {
      return { inserted: 0, updated: 0, skipped: "fresh" } satisfies SyncResult;
    }
  }

  const { data: run, error: runError } = await supabaseAdmin
    .from("sync_runs")
    .insert({ source: "tmdb", status: "running" })
    .select("id")
    .single();
  if (runError) throw runError;

  try {
    const result = await syncCatalogue();
    await supabaseAdmin
      .from("sync_runs")
      .update({
        status: "success",
        inserted_count: result.inserted,
        updated_count: result.updated,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return result;
  } catch (error) {
    await supabaseAdmin
      .from("sync_runs")
      .update({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}

/* ------------------------- per-title deep enrichment ------------------------ */

type Credits = { cast?: { name: string }[]; crew?: { name: string; job?: string }[] };
type Providers = {
  results?: Record<string, { link?: string; flatrate?: { provider_name: string }[] }>;
};
type Videos = { results?: { key: string; site: string; type: string }[] };

/** Fills in cast, crew, trailer, providers — and seasons/episodes for shows. */
export async function enrichTitle(slug: string) {
  const { data: movie, error } = await supabaseAdmin
    .from("movies")
    .select("id,tmdb_id,media_type,last_synced_at,director")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!movie?.tmdb_id) return { enriched: false };

  const kind = movie.media_type === "tv" ? "tv" : "movie";
  const detail = await tmdb<
    TmdbItem & {
      runtime?: number;
      episode_run_time?: number[];
      credits?: Credits;
      "watch/providers"?: Providers;
      videos?: Videos;
      created_by?: { name: string }[];
      seasons?: { id: number; season_number: number; name?: string; overview?: string; poster_path?: string | null; episode_count?: number; air_date?: string | null }[];
    }
  >(`/${kind}/${movie.tmdb_id}`, { append_to_response: "credits,watch/providers,videos" });

  const credits = detail.credits ?? {};
  const director =
    kind === "movie"
      ? (credits.crew?.find((c) => c.job === "Director")?.name ?? null)
      : (detail.created_by?.[0]?.name ?? null);

  const providerBlock = detail["watch/providers"]?.results ?? {};
  const region = providerBlock["US"] ?? Object.values(providerBlock)[0];
  const where = (region?.flatrate ?? [])
    .slice(0, 6)
    .map((p) => ({ name: p.provider_name, url: region?.link ?? "" }))
    .filter((p) => p.url);

  const trailer = (detail.videos?.results ?? []).find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );

  const runtime = kind === "movie" ? (detail.runtime ?? null) : (detail.episode_run_time?.[0] ?? null);

  await supabaseAdmin
    .from("movies")
    .update({
      description: detail.overview || null,
      runtime,
      director,
      cast: (credits.cast ?? []).slice(0, 12).map((c) => c.name),
      where_to_watch: where,
      embed_provider: trailer ? "youtube" : null,
      embed_url: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
      last_synced_at: new Date().toISOString(),
    } as never)
    .eq("id", movie.id);

  if (kind === "tv") await syncSeasons(movie.id, movie.tmdb_id, detail.seasons ?? []);

  return { enriched: true };
}

async function syncSeasons(
  movieId: string,
  tmdbId: number,
  seasons: {
    id: number;
    season_number: number;
    name?: string;
    overview?: string;
    poster_path?: string | null;
    episode_count?: number;
    air_date?: string | null;
  }[],
) {
  const real = seasons.filter((s) => s.season_number > 0).slice(0, 20);

  for (const season of real) {
    const { data: row, error } = await supabaseAdmin
      .from("seasons")
      .upsert(
        {
          movie_id: movieId,
          tmdb_id: season.id,
          season_number: season.season_number,
          name: season.name ?? `Season ${season.season_number}`,
          overview: season.overview || null,
          poster_url: img(season.poster_path, "w342"),
          episode_count: season.episode_count ?? null,
          air_date: season.air_date || null,
        } as never,
        { onConflict: "movie_id,season_number" },
      )
      .select("id")
      .single();
    if (error) throw error;

    const detail = await tmdb<{
      episodes?: {
        id: number;
        episode_number: number;
        name?: string;
        overview?: string;
        still_path?: string | null;
        air_date?: string | null;
        runtime?: number | null;
        vote_average?: number;
      }[];
    }>(`/tv/${tmdbId}/season/${season.season_number}`);

    const episodes = (detail.episodes ?? []).map((ep) => ({
      movie_id: movieId,
      season_id: row.id,
      tmdb_id: ep.id,
      season_number: season.season_number,
      episode_number: ep.episode_number,
      name: ep.name ?? `Episode ${ep.episode_number}`,
      overview: ep.overview || null,
      still_url: img(ep.still_path, "w500"),
      air_date: ep.air_date || null,
      runtime: ep.runtime ?? null,
      rating: ep.vote_average != null ? Math.round(ep.vote_average * 10) / 10 : null,
    }));

    if (episodes.length) {
      const { error: epError } = await supabaseAdmin
        .from("episodes")
        .upsert(episodes as never, { onConflict: "season_id,episode_number" });
      if (epError) throw epError;
    }
  }
}

/* --------------------- bulk trailer backfill (playable) --------------------- */

/**
 * Fills the authorized embed field with the official YouTube trailer for
 * imported titles that have no playable source yet, so every title has
 * something to play legally.
 */
export async function backfillTrailers(limit = 40) {
  const { data: rows, error } = await supabaseAdmin
    .from("movies")
    .select("id,tmdb_id,media_type")
    .not("tmdb_id", "is", null)
    .is("embed_url", null)
    .is("video_url", null)
    .order("popularity", { ascending: false })
    .limit(limit);
  if (error) throw error;

  let updated = 0;

  for (const row of rows ?? []) {
    const kind = row.media_type === "tv" ? "tv" : "movie";
    try {
      const videos = await tmdb<Videos>(`/${kind}/${row.tmdb_id}/videos`);
      const list = videos.results ?? [];
      const pick =
        list.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
        list.find((v) => v.site === "YouTube" && v.type === "Teaser") ??
        list.find((v) => v.site === "YouTube");
      if (!pick) continue;

      const { error: updateError } = await supabaseAdmin
        .from("movies")
        .update({
          embed_provider: "youtube",
          embed_url: `https://www.youtube.com/watch?v=${pick.key}`,
          trailer_url: `https://www.youtube.com/watch?v=${pick.key}`,
        } as never)
        .eq("id", row.id);
      if (updateError) throw updateError;
      updated += 1;
    } catch {
      /* skip individual failures */
    }
  }

  return { inserted: 0, updated };
}
