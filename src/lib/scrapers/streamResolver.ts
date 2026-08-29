export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4";
};

/**
 * Searches and extracts direct media (.mp4 / .m3u8) links.
 */
export async function fetchAutoStreamUrl(
  tmdbId?: number,
  title?: string,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1
): Promise<DirectStreamResult | null> {
  if (!tmdbId && !title) return null;

  const fetchers = [
    // 1. Scraping NetNaija / Nkiri / FzMovies via Serverless Scraper API
    async () => {
      if (!title) return null;
      const cleanTitle = encodeURIComponent(title.toLowerCase().trim());
      
      // Target your serverless API route or proxy extractor
      const targetUrl = `/api/scrape-source?title=${cleanTitle}&type=${type}&s=${season}&e=${episode}`;
      
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

    // 2. Fallback Direct Stream API (AutoEmbed Stream Endpoint)
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
