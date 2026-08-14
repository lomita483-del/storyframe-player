import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Season = {
  id: string;
  season_number: number;
  name: string | null;
  overview: string | null;
  poster_url: string | null;
  episode_count: number | null;
  air_date: string | null;
};

export type Episode = {
  id: string;
  season_id: string;
  season_number: number;
  episode_number: number;
  name: string | null;
  overview: string | null;
  still_url: string | null;
  air_date: string | null;
  runtime: number | null;
  rating: number | null;
  video_url: string | null;
  video_type: string;
  embed_url: string | null;
  embed_provider: string | null;
  subtitle_url: string | null;
};

export const seasonsQuery = (movieId?: string) =>
  queryOptions({
    queryKey: ["seasons", movieId ?? "none"],
    enabled: Boolean(movieId),
    queryFn: async (): Promise<Season[]> => {
      const { data, error } = await supabase
        .from("seasons")
        .select("id,season_number,name,overview,poster_url,episode_count,air_date")
        .eq("movie_id", movieId!)
        .order("season_number");
      if (error) throw error;
      return (data ?? []) as Season[];
    },
  });

export const episodesQuery = (movieId?: string, seasonNumber?: number) =>
  queryOptions({
    queryKey: ["episodes", movieId ?? "none", seasonNumber ?? 0],
    enabled: Boolean(movieId && seasonNumber),
    queryFn: async (): Promise<Episode[]> => {
      const { data, error } = await supabase
        .from("episodes")
        .select(
          "id,season_id,season_number,episode_number,name,overview,still_url,air_date,runtime,rating,video_url,video_type,embed_url,embed_provider,subtitle_url",
        )
        .eq("movie_id", movieId!)
        .eq("season_number", seasonNumber!)
        .order("episode_number");
      if (error) throw error;
      return (data ?? []) as Episode[];
    },
  });
