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

  const fetchers = [
    // 1. Scraping / Extracting via backend/CORS-proxied endpoint for custom sites
    async () => {
      if (!title) return null;
      const formattedTitle = encodeURIComponent(title.toLowerCase());
      
      // Hit your Serverless API route or custom CORS proxy scraper
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(
        `https://your-backend-scraper-api.com/extract?query=${formattedTitle}&type=${type}&s=${season}&e=${episode}`
      )}`;

      const res = await fetch(proxyUrl);
      if (!res.ok) return null;
      const data = await res.json();

      if (data?.streamUrl) {
        return {
          url: data.streamUrl,
          type: data.streamUrl.includes(".m3u8") ? ("hls" as const) : ("mp4" as const),
        };
      }
      return null;
    },

    // 2. Direct HLS/MP4 API Resolver
    async () => {
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
