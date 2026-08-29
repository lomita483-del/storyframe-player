export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4";
};

export async function fetchAutoStreamUrl(
  tmdbId?: number,
  title?: string,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1
): Promise<DirectStreamResult | null> {
  if (!tmdbId && !title) return null;

  // Option 1: Try Local API Scraper
  if (title) {
    try {
      const formattedSeason = String(season).padStart(2, "0");
      const formattedEpisode = String(episode).padStart(2, "0");
      const searchQuery =
        type === "tv"
          ? `${title} S${formattedSeason}E${formattedEpisode}`
          : title;

      const res = await fetch(
        `/api/scrape-source?query=${encodeURIComponent(searchQuery)}`
      );

      if (res.ok) {
        const data = await res.json();
        if (data?.downloadUrl) {
          return {
            url: data.downloadUrl,
            type: data.downloadUrl.includes(".m3u8") ? "hls" : "mp4",
          };
        }
      }
    } catch {
      // Continue to next resolver
    }
  }

  // Option 2: Fallback Direct Stream Service
  if (tmdbId) {
    try {
      const target =
        type === "tv"
          ? `https://autoembed.cc/api/get/tv?id=${tmdbId}&s=${season}&e=${episode}`
          : `https://autoembed.cc/api/get/movie?id=${tmdbId}`;

      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(target)}`);
      if (res.ok) {
        const data = await res.json();
        const streamUrl = data?.file || data?.url || data?.sources?.[0]?.file;
        if (streamUrl) {
          return {
            url: streamUrl,
            type: streamUrl.includes(".m3u8") ? "hls" : "mp4",
          };
        }
      }
    } catch {
      // Fallback failed
    }
  }

  return null;
}
