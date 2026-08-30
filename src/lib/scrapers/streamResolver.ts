export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "embed";
  provider?: string;
};

export async function fetchAutoStreamUrl(
  tmdbId?: number,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1
): Promise<DirectStreamResult | null> {
  if (!tmdbId) return null;

  try {
    // Reliable multi-embed providers standard in media apps using TMDB IDs
    // For movies: https://vidsrc.xyz/embed/movie?tmdb={id}
    // For TV shows: https://vidsrc.xyz/embed/tv?tmdb={id}&season={s}&episode={e}
    
    const embedUrl =
      type === "tv"
        ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
        : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`;

    return {
      url: embedUrl,
      type: "embed",
      provider: "VidSrc Primary Gateway",
    };
  } catch (err) {
    console.error("[streamResolver] Failed to resolve stream:", err);
    return null;
  }
}
