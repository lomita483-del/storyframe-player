export async function fetchAutoStreamUrl(
  tmdbId?: number,
  title?: string,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1
): Promise<DirectStreamResult | null> {
  if (!tmdbId && !title) return null;

  const fetchers = [
    // 1. Scrape with TV-specific query formatting
    async () => {
      if (!title) return null;

      // Format season/episode: S01E01 style
      const formattedSeason = String(season).padStart(2, "0");
      const formattedEpisode = String(episode).padStart(2, "0");
      
      const searchQuery = type === "tv"
        ? `${title} S${formattedSeason}E${formattedEpisode}`
        : title;

      const targetUrl = `/api/scrape-source?query=${encodeURIComponent(searchQuery)}&type=${type}&s=${season}&e=${episode}`;

      const res = await fetch(targetUrl);
      if (!res.ok) return null;

      const data = await res.json();
      if (data?.downloadUrl) {
        return {
          url: data.downloadUrl,
          type: data.downloadUrl.includes(".m3u8") ? ("hls" as const) : ("mp4" as const),
        };
      }
      return null;
    },

    // 2. Direct HLS Fallback API (AutoEmbed Stream Endpoint)
    async () => {
      if (!tmdbId) return null;
      const target =
        type === "tv"
          ? `https://autoembed.cc/api/get/tv?id=${tmdbId}&s=${season}&e=${episode}`
          : `https://autoembed.cc/api/get/movie?id=${tmdbId}`;

      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(target)}`);
      if (!res.ok) return null;

      const data = await res.json();
      const streamUrl = data?.file || data?.url || data?.sources?.[0]?.file;

      if (streamUrl) {
        return {
          url: streamUrl,
          type: streamUrl.includes(".m3u8") ? ("hls" as const) : ("mp4" as const),
        };
      }
      return null;
    },
  ];

  for (const fetcher of fetchers) {
    try {
      const result = await fetcher();
      if (result?.url) return result;
    } catch {
      continue;
    }
  }

  return null;
}
