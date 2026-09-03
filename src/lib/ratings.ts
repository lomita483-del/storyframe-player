import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RatingSummary = {
  movie_id: string;
  average: number;
  count: number;
};

function summarise(rows: { movie_id: string; rating: number }[]): RatingSummary[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const current = map.get(row.movie_id) ?? { total: 0, count: 0 };
    current.total += row.rating;
    current.count += 1;
    map.set(row.movie_id, current);
  }
  return [...map.entries()].map(([movie_id, value]) => ({
    movie_id,
    average: value.total / value.count,
    count: value.count,
  }));
}

/** Community rating summary for one title. */
export const movieRatingSummaryQuery = (movieId?: string) =>
  queryOptions({
    queryKey: ["ratings", "summary", movieId ?? "none"],
    enabled: Boolean(movieId),
    queryFn: async (): Promise<RatingSummary> => {
      const { data, error } = await supabase
        .from("movie_ratings")
        .select("movie_id,rating")
        .eq("movie_id", movieId!);
      if (error) throw error;
      const [summary] = summarise(data ?? []);
      return summary ?? { movie_id: movieId!, average: 0, count: 0 };
    },
  });

/** The signed-in user's own rating + review for a title. */
export const myRatingQuery = (userId?: string, movieId?: string) =>
  queryOptions({
    queryKey: ["ratings", "mine", userId ?? "anon", movieId ?? "none"],
    enabled: Boolean(userId && movieId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movie_ratings")
        .select("id,rating,review")
        .eq("user_id", userId!)
        .eq("movie_id", movieId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

/** Reviews other viewers left, newest first. */
export const movieReviewsQuery = (movieId?: string) =>
  queryOptions({
    queryKey: ["ratings", "reviews", movieId ?? "none"],
    enabled: Boolean(movieId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movie_ratings")
        .select("id,rating,review,created_at")
        .eq("movie_id", movieId!)
        .not("review", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

/** Titles ranked by viewer ratings, used by the "Most rated by viewers" row. */
export const topRatedByViewersQuery = () =>
  queryOptions({
    queryKey: ["ratings", "top"],
    queryFn: async (): Promise<RatingSummary[]> => {
      const { data, error } = await supabase
        .from("movie_ratings")
        .select("movie_id,rating")
        .limit(1000);
      if (error) throw error;
      return summarise(data ?? [])
        .sort((a, b) => b.average - a.average || b.count - a.count)
        .slice(0, 24);
    },
  });

export async function rateMovie(args: {
  userId: string;
  movieId: string;
  rating: number;
  review?: string | null;
}) {
  const { error } = await supabase.from("movie_ratings").upsert(
    {
      user_id: args.userId,
      movie_id: args.movieId,
      rating: Math.max(1, Math.min(10, Math.round(args.rating))),
      review: args.review?.trim() ? args.review.trim() : null,
    },
    { onConflict: "user_id,movie_id" },
  );
  if (error) throw error;
}
