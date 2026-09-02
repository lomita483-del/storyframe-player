import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hydrateMediaRefs, parseWhereToWatch, type WhereToWatchLink } from "@/lib/media";

// Read TMDB key from env; fall back to placeholder so local dev doesn't crash
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || "YOUR_TMDB_API_KEY";

export type Movie = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  video_url: string | null;
  direct_stream_url: string | null;
  video_type: string;
  subtitle_url: string | null;
  trailer_url: string | null;
  embed_url: string | null;
  embed_provider: string | null;
  provider: string | null;
  provider_asset_id: string | null;
  where_to_watch: WhereToWatchLink[];
  genre: string | null;
  release_year: number | null;
  release_date?: string | null;
  runtime: number | null;
  rating: number | null; // legacy TMDB vote_average
  average_rating?: number | null; // aggregated from user ratings
  rating_count?: number | null;
  quality: string | null;
  cast: string[];
  director: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_trending: boolean;
  media_type: string;
  tmdb_id: number | null;
  popularity: number | null;
  first_air_date: string | null;
  created_at: string;
  updated_at: string;
};

export type WatchHistoryRow = {
  id: string;
  movie_id: string;
  progress_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  updated_at: string;
};

const MOVIE_FIELDS =
  'id,title,slug,description,poster_url,backdrop_url,video_url,direct_stream_url,video_type,subtitle_url,trailer_url,embed_url,embed_provider,provider,provider_asset_id,where_to_watch,genre,release_year,runtime,rating,quality,cast,director,is_published,is_featured,is_trending,media_type,tmdb_id,popularity,first_air_date,created_at,updated_at,average_rating,rating_count,release_date';

async function hydrate(rows: unknown): Promise<Movie[]> {
  const list = ((rows ?? []) as Movie[]).map((row) => ({
    ...row,
    where_to_watch: parseWhereToWatch((row as { where_to_watch?: unknown }).where_to_watch),
  }));
  return hydrateMediaRefs(list);
}

async function hydrateOne(row: unknown): Promise<Movie | null> {
  if (!row) return null;
  const [first] = await hydrate([row]);
  return first ?? null;
}

export const VIDEO_TYPES = [
  { value: "hls", label: "HLS (.m3u8)" },
  { value: "mp4", label: "MP4 / progressive" },
  { value: "dash", label: "DASH (.mpd)" },
] as const;

export const QUALITIES = ["480p", "720p", "1080p", "1440p", "4K"] as const;

export function formatRuntime(minutes?: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* ---------------- public catalogue ---------------- */

/**
 * Fetch multiple TMDB endpoints/pages and fall back to Supabase when needed.
 * This expands the catalogue beyond the single "trending/day" call.
 */
export const publishedMoviesQuery = () =>
  queryOptions({
    queryKey: ["movies", "published"],
    queryFn: async (): Promise<Movie[]> => {
      // If no TMDB key is configured, fall back to Supabase DB
      if (!TMDB_API_KEY || TMDB_API_KEY === "YOUR_TMDB_API_KEY") {
        const { data, error } = await supabase
          .from("movies")
          .select(MOVIE_FIELDS)
          .eq("is_published", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return hydrate(data);
      }

      try {
        const endpoints = [
          { url: (page: number) => `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`, media_type: "movie" },
          { url: (page: number) => `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`, media_type: "movie" },
          { url: (page: number) => `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&page=${page}`, media_type: "movie" },
          { url: (page: number) => `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&page=${page}`, media_type: "mixed" },
          { url: (page: number) => `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`, media_type: "tv" },
          { url: (page: number) => `https://api.themoviedb.org/3/tv/top_rated?api_key=${TMDB_API_KEY}&page=${page}`, media_type: "tv" },
        ];

        const maxPages = 2; // conservative default; increase if desired
        const results: any[] = [];

        for (const ep of endpoints) {
          for (let page = 1; page <= maxPages; page++) {
            const res = await fetch(ep.url(page));
            if (!res.ok) break; // stop paging this endpoint on error
            const data = await res.json();
            if (!data || !data.results || !data.results.length) break;
            results.push(...data.results.map((item: any) => ({ item, media_type_hint: ep.media_type })));
            if (page >= (data.total_pages ?? page)) break;
          }
        }

        // Map and dedupe by tmdb id + media_type
        const map = new Map<string, any>();
        for (const entry of results) {
          const item = entry.item;
          const mediaHint = entry.media_type_hint;
          const mediaType = (item.media_type || (mediaHint === 'tv' ? 'tv' : item.title ? 'movie' : 'tv'));
          const key = `${mediaType}:${item.id}`;
          if (!map.has(key)) map.set(key, { item, mediaType });
        }

        const list = Array.from(map.values()).map(({ item, mediaType }) => {
          const isTV = mediaType === 'tv' || item.media_type === 'tv';
          const title = isTV ? (item.name || item.original_name) : (item.title || item.original_title);
          const releaseDate = item.release_date || item.first_air_date || null;
          return {
            id: String(item.id) + (isTV ? ':tv' : ':movie'),
            tmdb_id: item.id,
            title: title,
            slug: slugify(title + (releaseDate ? `-${releaseDate}` : '')),
            description: item.overview || null,
            poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            backdrop_url: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
            video_url: null,
            direct_stream_url: null,
            video_type: "hls",
            subtitle_url: null,
            trailer_url: null,
            embed_url: `https://vidsrc.xyz/embed/${isTV ? 'tv' : 'movie'}?tmdb=${item.id}`,
            embed_provider: "vidsrc",
            provider: null,
            provider_asset_id: null,
            where_to_watch: [],
            genre: (item.genre_ids && item.genre_ids.length) ? String(item.genre_ids[0]) : null,
            release_year: releaseDate ? Number((releaseDate as string).split('-')[0]) : null,
            release_date: releaseDate,
            runtime: item.runtime ?? null,
            rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
            average_rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 0,
            rating_count: item.vote_count ?? 0,
            quality: "HD",
            cast: [],
            director: null,
            is_published: true,
            is_featured: false,
            is_trending: false,
            media_type: isTV ? "tv" : "movie",
            popularity: item.popularity || null,
            first_air_date: releaseDate || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

        // As a last step, hydrate media refs and return
        return hydrate(list as unknown as Movie[]);
      } catch (err) {
        // Fall back to DB on any error
        const { data, error } = await supabase
          .from("movies")
          .select(MOVIE_FIELDS)
          .eq("is_published", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return hydrate(data);
      }
    },
  });

export const movieBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["movies", "slug", slug],
    queryFn: async (): Promise<Movie | null> => {
      const { data, error } = await supabase
        .from("movies")
        .select(MOVIE_FIELDS)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return hydrateOne(data);
    },
  });

export const genresQuery = () =>
  queryOptions({
    queryKey: ["genres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genres")
        .select("id,name,slug")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const searchMoviesQuery = (term: string) =>
  queryOptions({
    queryKey: ["movies", "search", term],
    queryFn: async (): Promise<Movie[]> => {
      const q = term.trim();
      if (!q) return [];
      const year = /^\d{4}$/.test(q) ? Number(q) : null;
      const like = `%${q}%`;
      let filter = `title.ilike.${like},genre.ilike.${like},director.ilike.${like},description.ilike.${like}`;
      if (year) filter += `,release_year.eq.${year}`;

      const base = () => supabase.from("movies").select(MOVIE_FIELDS).eq("is_published", true);
      const [text, byCast] = await Promise.all([
        base().or(filter).limit(48),
        base().filter("cast", "cs", `{"${q.replace(/"/g, "")}"}`).limit(24),
      ]);
      if (text.error) throw text.error;

      const merged = new Map<string, Movie>();
      for (const row of [
        ...((text.data ?? []) as unknown as Movie[]),
        ...((byCast.error ? [] : ((byCast.data ?? []) as unknown as Movie[])) as Movie[]),
      ]) {
        merged.set(row.id, row);
      }
      return hydrate([...merged.values()]);
    },
  });

/* ---------------- admin ---------------- */

export const adminMoviesQuery = () =>
  queryOptions({
    queryKey: ["movies", "admin"],
    queryFn: async (): Promise<Movie[]> => {
      const { data, error } = await supabase
        .from("movies")
        .select(MOVIE_FIELDS)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return hydrate(data);
    },
  });

export const adminMovieByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["movies", "admin", id],
    queryFn: async (): Promise<Movie | null> => {
      const { data, error } = await supabase
        .from("movies")
        .select(MOVIE_FIELDS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return hydrateOne(data);
    },
  });

/* ---------------- user state ---------------- */

export const watchlistQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["watchlist", userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watchlists")
        .select(`id,movie_id,created_at,movies(${MOVIE_FIELDS})`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as {
        id: string;
        movie_id: string;
        created_at: string;
        movies: Movie | null;
      }[];
      const movies = await hydrate(rows.map((row) => row.movies).filter(Boolean));
      return rows.map((row, index) => ({ ...row, movies: movies[index] ?? row.movies }));
    },
  });

export const watchHistoryQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["watch-history", userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_history")
        .select(
          `id,movie_id,progress_seconds,duration_seconds,completed,updated_at,movies(${MOVIE_FIELDS})`,
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as (WatchHistoryRow & { movies: Movie | null })[];
      const movies = await hydrate(rows.map((row) => row.movies).filter(Boolean));
      return rows.map((row, index) => ({ ...row, movies: movies[index] ?? row.movies }));
    },
  });

export async function toggleWatchlist(userId: string, movieId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase
      .from("watchlists")
      .delete()
      .eq("user_id", userId)
      .eq("movie_id", movieId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("watchlists")
    .insert({ user_id: userId, movie_id: movieId });
  if (error) throw error;
  return true;
}

export async function saveProgress(args: {
  userId: string;
  movieId: string;
  progressSeconds: number;
  durationSeconds?: number | null;
}) {
  const completed =
    !!args.durationSeconds && args.progressSeconds >= args.durationSeconds - 30;
  const { error } = await supabase.from("watch_history").upsert(
    {
      user_id: args.userId,
      movie_id: args.movieId,
      progress_seconds: Math.floor(args.progressSeconds),
      duration_seconds: args.durationSeconds ? Math.floor(args.durationSeconds) : null,
      completed,
    },
    { onConflict: "user_id,movie_id" },
  );
  if (error) throw error;
}
