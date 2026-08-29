import { supabase } from "@/integrations/supabase/client";

export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4";
  provider?: string;
};

export async function fetchAutoStreamUrl(
  tmdbId?: number,
  title?: string,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1
): Promise<DirectStreamResult | null> {
  if (!tmdbId && !title) return null;

  try {
    const { data, error } = await supabase.functions.invoke("scrape-source", {
      body: {
        tmdbId: tmdbId?.toString() || "",
        query: title || "",
        type,
        season: season.toString(),
        episode: episode.toString(),
      },
    });

    if (error || !data?.url) {
      console.warn("[streamResolver] No stream returned from Edge Function:", error);
      return null;
    }

    return {
      url: data.url,
      type: data.type === "hls" || data.url.includes(".m3u8") ? "hls" : "mp4",
      provider: data.provider || "Direct Stream",
    };
  } catch (err) {
    console.error("[streamResolver] Supabase Edge Function execution failed:", err);
    return null;
  }
}
