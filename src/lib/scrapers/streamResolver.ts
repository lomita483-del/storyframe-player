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
    const params = new URLSearchParams();
    if (tmdbId) params.set("tmdbId", tmdbId.toString());
    if (title) params.set("query", title);
    params.set("type", type);
    params.set("season", season.toString());
    params.set("episode", episode.toString());

    const res = await fetch(`/api/scrape-source?${params.toString()}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.url) {
      return {
        url: data.url,
        type: data.type === "hls" || data.url.includes(".m3u8") ? "hls" : "mp4",
        provider: data.provider || "Direct Stream",
      };
    }
  } catch (err) {
    console.error("[streamResolver] Scraper resolution failed:", err);
  }

  return null;
}
