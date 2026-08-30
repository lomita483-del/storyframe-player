export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "torrent";
  provider?: string;
};

export async function fetchAutoStreamUrl(
  title?: string,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1
): Promise<DirectStreamResult | null> {
  if (!title) return null;

  try {
    // Call your Supabase Edge Function or backend scraper endpoint
    // that handles searching NetNaija, FzMovies, 1377x, etc., and returning a direct media link.
    const response = await fetch(
      `/functions/v1/scrape-media?title=${encodeURIComponent(title)}&type=${type}&season=${season}&episode=${episode}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch direct stream from scraper backend.");
    }

    const data = await response.json();

    if (!data?.url) {
      return null;
    }

    return {
      url: data.url,
      type: data.type || (data.url.includes(".m3u8") ? "hls" : "mp4"),
      provider: data.provider || "Direct Scraper Index",
    };
  } catch (err) {
    console.error("[streamResolver] Failed to resolve direct stream:", err);
    return null;
  }
}
