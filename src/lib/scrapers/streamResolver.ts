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

  // 1. Check direct JSON API resolvers (High success rate for raw HLS)
  if (tmdbId) {
    const apiEndpoints = [
      type === "tv"
        ? `https://corsproxy.io/?${encodeURIComponent(`https://autoembed.cc/api/get/tv?id=${tmdbId}&s=${season}&e=${episode}`)}`
        : `https://corsproxy.io/?${encodeURIComponent(`https://autoembed.cc/api/get/movie?id=${tmdbId}`)}`,
      
      type === "tv"
        ? `https://api.vidsrc.icu/raw/tv/${tmdbId}/${season}/${episode}`
        : `https://api.vidsrc.icu/raw/movie/${tmdbId}`
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) continue;

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          const streamUrl = data?.file || data?.url || data?.sources?.[0]?.file || data?.stream;
          
          if (streamUrl) {
            return {
              url: streamUrl,
              type: streamUrl.includes(".m3u8") ? "hls" : "mp4",
            };
          }
        } else {
          // Parse raw text fallback
          const text = await res.text();
          const match = text.match(/(https?:\/\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)/i);
          if (match?.[1]) {
            return {
              url: match[1],
              type: match[1].includes(".m3u8") ? "hls" : "mp4",
            };
          }
        }
      } catch {
        continue;
      }
    }
  }

  // 2. Fallback to serverless scraper API
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
      // Local scraper fallback failed
    }
  }

  return null;
}
