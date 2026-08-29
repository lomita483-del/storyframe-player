export type StreamSource = {
  url: string;
  quality?: string;
  type: "hls" | "mp4";
};

export async function resolveBestStream(
  tmdbId?: number | null,
  title?: string,
  type: string = "movie",
  season: number = 1,
  episode: number = 1
): Promise<StreamSource | null> {
  const sourcesToTest: string[] = [];

  // 1. Primary API Source (HLS Stream)
  if (tmdbId) {
    sourcesToTest.push(
      `https://movie-api-v2.vercel.app/api/${type}?id=${tmdbId}${
        type === "tv" ? `&s=${season}&e=${episode}` : ""
      }`
    );
  }

  // Iterate over endpoints and return the first active direct stream URL
  for (const endpoint of sourcesToTest) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;

      const data = await res.json();
      const directUrl = data.streamUrl ?? data.url ?? data.sources?.[0]?.url;

      if (directUrl) {
        // Verify link health with a lightweight fetch
        const checkRes = await fetch(directUrl, { method: "HEAD" });
        if (checkRes.ok) {
          return {
            url: directUrl,
            type: directUrl.includes(".m3u8") ? "hls" : "mp4",
          };
        }
      }
    } catch {
      // Continue silently to the next provider
      continue;
    }
  }

  return null;
}
