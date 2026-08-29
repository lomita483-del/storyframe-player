export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "torrent";
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
    const params = new URLSearchParams();
    if (tmdbId) params.set("tmdbId", tmdbId.toString());
    if (title) params.set("query", title);
    params.set("type", type);
    params.set("season", season.toString());
    params.set("episode", episode.toString());

    // Resolve base path safely for both Client-Side and Server-Side Rendering
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const endpoint = `${baseUrl}/api/scrape-source?${params.toString()}`;

    const res = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`[streamResolver] API returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data?.url) {
      return {
        url: data.url,
        type: data.type,
        provider: data.provider || "Direct Scraper",
      };
    }
  } catch (err) {
    console.error("[streamResolver] Scraper request failed:", err);
  }

  return null;
}
