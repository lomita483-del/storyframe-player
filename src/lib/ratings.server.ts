import { supabase } from "@/integrations/supabase/client";

export type RatingRow = {
  id: string;
  user_id: string;
  movie_id: string;
  rating: number;
  review?: string | null;
  created_at: string;
};

export async function rateMovie(userId: string, movieId: string, rating: number, review?: string | null) {
  if (!userId) throw new Error("Authentication required");
  if (!movieId) throw new Error("movieId required");
  if (!rating || rating < 1 || rating > 5) throw new Error("rating must be between 1 and 5");

  // Upsert the user's rating for this movie
  const { error } = await supabase.from("ratings").upsert(
    { user_id: userId, movie_id: movieId, rating, review },
    { onConflict: "user_id,movie_id" },
  );
  if (error) throw error;

  // Recompute aggregates and write them back to movies table
  const { data, error: aggError } = await supabase
    .from("ratings")
    .select("movie_id,avg:avg(rating),count:count(id)")
    .eq("movie_id", movieId)
    .maybeSingle();

  if (aggError) {
    // not fatal — return success but log
    console.warn("Failed to compute aggregates", aggError);
    return { success: true };
  }

  // Compute average + count via a direct query instead (supabase sql aggregation above may not return expected shape)
  const { data: agg2, error: agg2Err } = await supabase.rpc("__supabase_custom_rating_agg", { m_id: movieId }).catch(() => ({ data: null, error: null }));

  // Fallback: compute via select
  const { data: rows, error: rowsErr } = await supabase.from("ratings").select("rating").eq("movie_id", movieId);
  if (!rowsErr && rows) {
    const vals = (rows as { rating: number }[]).map((r) => r.rating);
    if (vals.length) {
      const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
      const count = vals.length;
      await supabase.from("movies").update({ average_rating: avg, rating_count: count }).eq("id", movieId);
    }
  }

  return { success: true };
}

export async function getRatingsSummary(movieId: string) {
  const { data, error } = await supabase
    .from("ratings")
    .select("user_id,rating,review,created_at")
    .eq("movie_id", movieId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as RatingRow[];
}
