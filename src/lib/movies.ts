import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hydrateMediaRefs, parseWhereToWatch, type WhereToWatchLink } from "@/lib/media";

export type Movie = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  video_url: string | null;
  video_type: string;
  subtitle_url: string | null;
  trailer_url: string | null;
  embed_url: string | null;
  embed_provider: string | null;
  where_to_watch: WhereToWatchLink[];
  genre: string | null;
  release_year: number | null;
  runtime: number | null;
  rating: number | null;
  quality: string | null;
  cast: string[];
  director: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_trending: boolean;
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
  'id,title,slug,description,poster_url,backdrop_url,video_url,video_type,subtitle_url,trailer_url,embed_url,embed_provider,where_to_watch,genre,release_year,runtime,rating,quality,"cast",director,is_published,is_featured,is_trending,created_at,updated_at';

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

export const publishedMoviesQuery = () =>
  queryOptions({
    queryKey: ["movies", "published"],
    queryFn: async (): Promise<Movie[]> => {
      const { data, error } = await supabase
        .from("movies")
        .select(MOVIE_FIELDS)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return hydrate(data);
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
