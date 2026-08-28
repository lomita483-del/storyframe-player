import {
  getEnabledStreamingProviders,
  getStreamingProvider,
} from "./providers";

import type {
  MediaType,
  WatchParams,
} from "@/types/streaming";

/**
 * Hosts that are explicitly trusted by the application.
 *
 * Add your authorized player hostname here.
 */
const ALLOWED_EMBED_HOSTS = new Set<string>([
  "your-authorized-player.example.com",
]);

/**
 * Normalizes a hostname for comparison.
 */
function normalizeHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .trim()
    .replace(/\.$/, "");
}

/**
 * Checks whether an embed URL belongs to an approved provider.
 */
export function isAllowedEmbedUrl(
  value: string
): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return false;
    }

    const hostname = normalizeHostname(
      url.hostname
    );

    return ALLOWED_EMBED_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

/**
 * Safely creates an authorized movie URL.
 */
export function buildMovieStreamUrl(
  mediaId: string,
  providerId?: string
): string | null {
  if (!mediaId.trim()) {
    return null;
  }

  const provider = providerId
    ? getStreamingProvider(providerId)
    : getEnabledStreamingProviders()[0];

  if (!provider) {
    return null;
  }

  const url = provider.buildMovieUrl(
    mediaId.trim()
  );

  return isAllowedEmbedUrl(url)
    ? url
    : null;
}

/**
 * Safely creates an authorized TV episode URL.
 */
export function buildEpisodeStreamUrl(
  mediaId: string,
  season: number,
  episode: number,
  providerId?: string
): string | null {
  if (!mediaId.trim()) {
    return null;
  }

  if (
    !Number.isInteger(season) ||
    season < 1
  ) {
    return null;
  }

  if (
    !Number.isInteger(episode) ||
    episode < 1
  ) {
    return null;
  }

  const provider = providerId
    ? getStreamingProvider(providerId)
    : getEnabledStreamingProviders()[0];

  if (!provider) {
    return null;
  }

  const url = provider.buildEpisodeUrl(
    mediaId.trim(),
    season,
    episode
  );

  return isAllowedEmbedUrl(url)
    ? url
    : null;
}

/**
 * Resolves the final playback URL.
 *
 * Explicit authorizedEmbedUrl takes priority.
 */
export function resolveStreamUrl(
  params: WatchParams
): string | null {
  if (params.authorizedEmbedUrl) {
    if (
      isAllowedEmbedUrl(
        params.authorizedEmbedUrl
      )
    ) {
      return params.authorizedEmbedUrl;
    }

    return null;
  }

  if (params.mediaType === "movie") {
    return buildMovieStreamUrl(
      params.mediaId
    );
  }

  if (
    typeof params.season !== "number" ||
    typeof params.episode !== "number"
  ) {
    return null;
  }

  return buildEpisodeStreamUrl(
    params.mediaId,
    params.season,
    params.episode
  );
}

/**
 * Helper used by UI code.
 */
export function isTvWatchParams(
  params: WatchParams
): boolean {
  return (
    params.mediaType === "tv" &&
    typeof params.season === "number" &&
    typeof params.episode === "number"
  );
}

export type { MediaType };
