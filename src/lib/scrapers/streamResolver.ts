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
    // Lovable Cloud environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      console.error("[streamResolver] Missing Lovable Cloud environment keys.");
      return null;
    }

    const endpoint = `${supabaseUrl}/functions/v1/scrape-source`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        tmdbId: tmdbId?.toString() || "",
        query: title || "",
        type,
        season: season.toString(),
        episode: episode.toString(),
      }),
    });

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
    console.error("[streamResolver] Stream resolution error:", err);
  }

  return null;
}
