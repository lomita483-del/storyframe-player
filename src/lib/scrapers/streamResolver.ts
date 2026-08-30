export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "torrent";
  provider?: string;
};

type StreamApiResponse = {
  url?: unknown;
  type?: unknown;
  provider?: unknown;
  error?: unknown;
  message?: unknown;
};

function isValidStreamType(
  value: unknown,
): value is DirectStreamResult["type"] {
  return value === "hls" || value === "mp4" || value === "torrent";
}

function isValidStreamUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "magnet:"
    );
  } catch {
    return false;
  }
}

export async function fetchAutoStreamUrl(
  tmdbId?: number,
  title?: string,
  type: "movie" | "tv" = "movie",
  season = 1,
  episode = 1,
): Promise<DirectStreamResult | null> {
  if (!tmdbId && !title?.trim()) {
    console.warn("[streamResolver] Missing TMDB ID and title.");
    return null;
  }

  try {
    const params = new URLSearchParams();

    if (tmdbId) {
      params.set("tmdbId", String(tmdbId));
    }

    if (title?.trim()) {
      params.set("query", title.trim());
    }

    params.set("type", type);
    params.set("season", String(Math.max(1, season)));
    params.set("episode", String(Math.max(1, episode)));

    const endpoint = `/api/scrape-source?${params.toString()}`;

    console.log("[streamResolver] Requesting:", endpoint);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "same-origin",
    });

    /*
     * IMPORTANT:
     * Do not call response.json() blindly.
     *
     * A 404 from the server can return an HTML page instead of JSON.
     * Calling response.json() in that situation throws another error
     * and hides the actual problem.
     */
    const contentType = response.headers.get("content-type") || "";

    let data: StreamApiResponse | null = null;
    let rawText = "";

    if (contentType.includes("application/json")) {
      try {
        data = (await response.json()) as StreamApiResponse;
      } catch (error) {
        console.error(
          "[streamResolver] Failed to parse JSON response:",
          error,
        );
      }
    } else {
      try {
        rawText = await response.text();
      } catch (error) {
        console.error(
          "[streamResolver] Failed to read non-JSON response:",
          error,
        );
      }
    }

    if (!response.ok) {
      const serverMessage =
        typeof data?.message === "string"
          ? data.message
          : typeof data?.error === "string"
            ? data.error
            : rawText
              ? rawText.slice(0, 300)
              : `HTTP ${response.status}`;

      console.error(
        `[streamResolver] Stream API failed (${response.status}):`,
        serverMessage,
      );

      return null;
    }

    if (!data) {
      console.error(
        "[streamResolver] Stream API returned an invalid/non-JSON response.",
      );

      return null;
    }

    if (!isValidStreamUrl(data.url)) {
      console.error(
        "[streamResolver] API response does not contain a valid stream URL.",
        data,
      );

      return null;
    }

    if (!isValidStreamType(data.type)) {
      console.error(
        "[streamResolver] API returned an invalid stream type.",
        data,
      );

      return null;
    }

    return {
      url: data.url,
      type: data.type,
      provider:
        typeof data.provider === "string" && data.provider.trim()
          ? data.provider
          : "Direct Stream",
    };
  } catch (error) {
    console.error(
      "[streamResolver] Stream resolution request failed:",
      error,
    );

    return null;
  }
}
