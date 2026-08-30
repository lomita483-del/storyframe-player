import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

type RequestBody = {
  tmdbId?: number;
  title?: string;
  type?: "movie" | "tv";
  season?: number;
  episode?: number;
};

type ProviderResponse = {
  url?: unknown;
  type?: unknown;
  provider?: unknown;
  error?: unknown;
  message?: unknown;
};

function json(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

function isValidStreamType(
  value: unknown,
): value is "hls" | "mp4" | "torrent" {
  return (
    value === "hls" ||
    value === "mp4" ||
    value === "torrent"
  );
}

function isValidStreamUrl(
  value: unknown,
): value is string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    const body =
      (await req.json()) as RequestBody;

    const {
      tmdbId,
      title,
      type = "movie",
      season = 1,
      episode = 1,
    } = body;

    if (!tmdbId && !title?.trim()) {
      return json(
        {
          error:
            "A TMDB ID or title is required.",
        },
        400,
      );
    }

    if (
      type !== "movie" &&
      type !== "tv"
    ) {
      return json(
        {
          error: "Invalid media type.",
        },
        400,
      );
    }

    /*
     * IMPORTANT:
     *
     * Configure this as a Supabase secret.
     *
     * Example:
     *
     * SCRAPER_API_URL=https://your-authorized-provider.example/resolve
     *
     * The provider should return:
     *
     * {
     *   "url": "https://...",
     *   "type": "hls",
     *   "provider": "Provider Name"
     * }
     */
    const scraperApiUrl =
      Deno.env.get("SCRAPER_API_URL");

    if (!scraperApiUrl) {
      console.error(
        "[scrape-source] SCRAPER_API_URL is not configured.",
      );

      return json(
        {
          error:
            "Stream provider is not configured.",
        },
        503,
      );
    }

    const providerUrl =
      new URL(scraperApiUrl);

    providerUrl.searchParams.set(
      "tmdbId",
      tmdbId
        ? String(tmdbId)
        : "",
    );

    providerUrl.searchParams.set(
      "title",
      title?.trim() || "",
    );

    providerUrl.searchParams.set(
      "type",
      type,
    );

    providerUrl.searchParams.set(
      "season",
      String(
        Math.max(
          1,
          season,
        ),
      ),
    );

    providerUrl.searchParams.set(
      "episode",
      String(
        Math.max(
          1,
          episode,
        ),
      ),
    );

    console.log(
      "[scrape-source] Requesting authorized provider.",
      {
        tmdbId,
        title,
        type,
        season,
        episode,
      },
    );

    const providerResponse =
      await fetch(
        providerUrl.toString(),
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        },
      );

    const contentType =
      providerResponse.headers.get(
        "content-type",
      ) || "";

    let providerData:
      | ProviderResponse
      | null = null;

    if (
      contentType.includes(
        "application/json",
      )
    ) {
      providerData =
        (await providerResponse.json()) as ProviderResponse;
    } else {
      const text =
        await providerResponse.text();

      console.error(
        "[scrape-source] Provider returned non-JSON response:",
        text.slice(0, 500),
      );

      return json(
        {
          error:
            "Stream provider returned an invalid response.",
        },
        502,
      );
    }

    if (!providerResponse.ok) {
      console.error(
        "[scrape-source] Provider HTTP error:",
        providerResponse.status,
        providerData,
      );

      return json(
        {
          error:
            typeof providerData?.error ===
            "string"
              ? providerData.error
              : "Stream provider failed.",
        },
        502,
      );
    }

    if (
      !isValidStreamUrl(
        providerData?.url,
      )
    ) {
      return json(
        {
          error:
            "No playable stream was returned.",
        },
        404,
      );
    }

    if (
      !isValidStreamType(
        providerData?.type,
      )
    ) {
      return json(
        {
          error:
            "Stream provider returned an invalid media type.",
        },
        502,
      );
    }

    return json({
      url: providerData.url,
      type: providerData.type,
      provider:
        typeof providerData.provider ===
        "string"
          ? providerData.provider
          : "Authorized Stream Provider",
    });
  } catch (error) {
    console.error(
      "[scrape-source] Unexpected error:",
      error,
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      500,
    );
  }
});
