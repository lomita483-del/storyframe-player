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

  // 1. Primary: Pass request through local serverless endpoint (Bypasses browser CORS & origin blocks)
  try {
    const params = new URLSearchParams();
    if (tmdbId) params.append("tmdbId", String(tmdbId));
    if (title) params.append("query", title);
    params.append("type", type);
    params.append("season", String(season));
    params.append("episode", String(episode));

    const res = await fetch(`/api/scrape-source?${params.toString()}`);

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
    // Backend endpoint failed, proceed to client-side proxy fallback
  }

  // 2. Client-side fallback via CORS Proxy
  if (tmdbId) {
    const fallbackEndpoints = [
      type === "tv"
        ? `https://autoembed.cc/api/get/tv?id=${tmdbId}&s=${season}&e=${episode}`
        : `https://autoembed.cc/api/get/movie?id=${tmdbId}`,
      type === "tv"
        ? `https://api.vidsrc.icu/raw/tv/${tmdbId}/${season}/${episode}`
        : `https://api.vidsrc.icu/raw/movie/${tmdbId}`,
    ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(endpoint)}`;
        const res = await fetch(proxiedUrl);
        if (!res.ok) continue;

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          const streamUrl =
            data?.file || data?.url || data?.sources?.[0]?.file || data?.stream;

          if (streamUrl) {
            return {
              url: streamUrl,
              type: streamUrl.includes(".m3u8") ? "hls" : "mp4",
            };
          }
        } else {
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

  return null;
}
