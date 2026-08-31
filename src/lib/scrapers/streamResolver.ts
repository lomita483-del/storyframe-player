import { supabase } from "@/integrations/supabase/client";

export interface DirectStreamResult {
  url: string;
  type: "mp4" | "hls" | "torrent";
  provider?: string;
}

/**
 * Calls the deployed Supabase Edge Function:
 * scrape-source
 */
export async function fetchAutoStreamUrl(
  tmdbId?: number,
  title?: string,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1,
): Promise<DirectStreamResult | null> {
  if (!tmdbId && !title?.trim()) {
    console.warn(
      "[streamResolver] Missing TMDB ID and title",
    );
    return null;
  }

  try {
    console.log(
      "[streamResolver] Calling scrape-source:",
      {
        tmdbId,
        title,
        type,
        season,
        episode,
      },
    );

    const { data, error } =
      await supabase.functions.invoke(
        "scrape-source",
        {
          body: {
            tmdbId,
            title: title?.trim(),
            type,
            season,
            episode,
          },
        },
      );

    if (error) {
      console.error(
        "[streamResolver] Edge Function error:",
        error,
      );

      throw new Error(
        error.message ||
          "Failed to invoke scrape-source",
      );
    }

    console.log(
      "[streamResolver] Edge Function response:",
      data,
    );

    if (!data?.url) {
      console.warn(
        "[streamResolver] No stream URL returned:",
        data,
      );

      return null;
    }

    const streamType =
      data.type === "hls" ||
      data.type === "torrent"
        ? data.type
        : "mp4";

    return {
      url: data.url,
      type: streamType,
      provider:
        typeof data.provider === "string"
          ? data.provider
          : "Stellar Stream Core",
    };
  } catch (err) {
    console.error(
      "[streamResolver] Critical stream resolver error:",
      err,
    );

    return null;
  }
}
