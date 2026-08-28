export type MediaType = "movie" | "tv";

export interface StreamingSource {
  /**
   * Unique ID for this source.
   */
  id: string;

  /**
   * Human-readable provider name.
   */
  name: string;

  /**
   * Base URL used by the provider.
   *
   * Example:
   * https://authorized-player.example.com
   */
  baseUrl: string;

  /**
   * Whether this provider is currently enabled.
   */
  enabled: boolean;

  /**
   * Provider URL format.
   *
   * The provider receives the media ID and, for TV,
   * season + episode.
   */
  buildMovieUrl: (mediaId: string) => string;

  buildEpisodeUrl: (
    mediaId: string,
    season: number,
    episode: number
  ) => string;
}

export interface WatchParams {
  mediaType: MediaType;
  mediaId: string;

  /**
   * Optional TMDb ID associated with the media.
   */
  tmdbId?: string | number;

  /**
   * Optional IMDb ID associated with the media.
   */
  imdbId?: string;

  /**
   * TV only.
   */
  season?: number;

  /**
   * TV only.
   */
  episode?: number;

  /**
   * Explicit authorized playback URL.
   *
   * This is preferred over generating a provider URL.
   */
  authorizedEmbedUrl?: string;
}
