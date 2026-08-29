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
  if (!tmdbId) return null;

  // List of direct scrapers/APIs to test concurrently
  const fetchers = [
    async () => {
      const endpoint =
        type === "tv"
          ? `https://autoembed.cc/api/get/tv?id=${tmdbId}&s=${season}&e=${episode}`
          : `https://autoembed.cc/api/get/movie?id=${tmdbId}`;

      const res = await fetch(endpoint);
      if (!res.ok) return null;
      const data = await res.json();
      const streamUrl = data?.file || data?.url || data?.sources?.[0]?.file;
      if (!streamUrl) return null;

      return {
        url: streamUrl,
        type: streamUrl.includes(".m3u8") ? ("hls" as const) : ("mp4" as const),
      };
    },
    async () => {
      const endpoint =
        type === "tv"
          ? `https://vidsrc.pro/api/stream/tv/${tmdbId}/${season}/${episode}`
          : `https://vidsrc.pro/api/stream/movie/${tmdbId}`;

      const res = await fetch(endpoint);
      if (!res.ok) return null;
      const data = await res.json();
      const streamUrl = data?.stream || data?.source;
      if (!streamUrl) return null;

      return {
        url: streamUrl,
        type: streamUrl.includes(".m3u8") ? ("hls" as const) : ("mp4" as const),
      };
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
