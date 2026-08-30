import { supabase } from "@/integrations/supabase/client";

export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "torrent";
  provider?: string;
};

type ResolverResponse = {
  url?: unknown;
  type?: unknown;
  provider?: unknown;
  error?: unknown;
  message?: unknown;
};

function isValidType(value: unknown): value is DirectStreamResult["type"] {
  return value === "hls" || value === "mp4" || value === "torrent";
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "magnet:"
    );
  } catch {
    return false;
  }
}

export async function fetchAutoStreamUrl(
  tmdbId?: number,
  title?: string,
  type: "movie" | "tv" = "movie",
  season = 1,
  episode = 1,
): Promise<DirectStreamResult | null> {
  if (!tmdbId && !title?.trim()) {
    console.warn("[streamResolver] No TMDB ID or title supplied.");
    return null;
  }

  try {
    console.log("[streamResolver] Resolving stream:", {
      tmdbId,
      title,
      type,
      season,
      episode,
    });

    const { data, error } = await supabase.functions.invoke(
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

      return null;
    }

    const result = data as ResolverResponse | null;

    if (!result) {
      console.error(
        "[streamResolver] Empty response from scrape-source.",
      );

      return null;
    }

    if (result.error || result.message) {
      console.warn(
        "[streamResolver] Resolver returned an error:",
        result.error || result.message,
      );

      return null;
    }

    if (!isValidUrl(result.url)) {
      console.error(
        "[streamResolver] Invalid stream URL:",
        result.url,
      );

      return null;
    }

    if (!isValidType(result.type)) {
      console.error(
        "[streamResolver] Invalid stream type:",
        result.type,
      );

      return null;
    }

    return {
      url: result.url,
      type: result.type,
      provider:
        typeof result.provider === "string" &&
        result.provider.trim()
          ? result.provider
          : "Stream Provider",
    };
  } catch (error) {
    console.error(
      "[streamResolver] Unexpected error:",
      error,
    );

    return null;
  }
}
