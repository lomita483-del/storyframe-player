import type { StreamingSource } from "@/types/streaming";

/**
 * IMPORTANT
 *
 * Only put streaming providers here that you are authorized
 * to use for your application's content.
 *
 * The example below is intentionally disabled.
 *
 * Replace the example domain with your own authorized
 * streaming/embed provider.
 */

const authorizedProvider: StreamingSource = {
  id: "authorized-provider",

  name: "Authorized Player",

  baseUrl: "https://your-authorized-player.example.com",

  enabled: false,

  buildMovieUrl: (mediaId: string) => {
    return `https://your-authorized-player.example.com/movie/${encodeURIComponent(
      mediaId
    )}`;
  },

  buildEpisodeUrl: (
    mediaId: string,
    season: number,
    episode: number
  ) => {
    return `https://your-authorized-player.example.com/tv/${encodeURIComponent(
      mediaId
    )}/${season}/${episode}`;
  },
};

/**
 * Add additional authorized providers here.
 */
export const STREAMING_PROVIDERS: StreamingSource[] = [
  authorizedProvider,
];

/**
 * Returns only providers that have explicitly been enabled.
 */
export function getEnabledStreamingProviders(): StreamingSource[] {
  return STREAMING_PROVIDERS.filter((provider) => provider.enabled);
}

/**
 * Get a provider by ID.
 */
export function getStreamingProvider(
  providerId: string
): StreamingSource | undefined {
  return STREAMING_PROVIDERS.find(
    (provider) =>
      provider.id === providerId &&
      provider.enabled
  );
}
