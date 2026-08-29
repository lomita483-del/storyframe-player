export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "torrent";
  provider?: string;
};

export async function fetchAutoStreamUrl(
  tmdbId?: number,
  title?: string,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1,
): Promise<DirectStreamResult | null> {
  if (!tmdbId && !title) return null;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) return null;

    const res = await fetch(`${supabaseUrl}/functions/v1/scrape-source`, {
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
        type: data.type,
        provider: data.provider || "Direct Scraper",
      };
    }
  } catch (err) {
    console.error("[streamResolver] Execution error:", err);
  }

  return null;
}
