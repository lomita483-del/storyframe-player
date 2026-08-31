import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
  tmdbId?: number;
  title?: string;
  type?: "movie" | "tv";
  season?: number;
  episode?: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed. Use POST.",
      },
      405,
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;

    console.log("[scrape-source] Request received:", {
      tmdbId: body.tmdbId,
      title: body.title,
      type: body.type,
      season: body.season,
      episode: body.episode,
    });

    if (!body.tmdbId && !body.title?.trim()) {
      return jsonResponse(
        {
          error: "TMDB ID or title is required.",
        },
        400,
      );
    }

    /*
     * TEMPORARY PLAYBACK TEST
     *
     * This is only being used to prove that the complete
     * Supabase -> frontend -> video-player pipeline works.
     *
     * Once this test plays successfully, replace this with
     * your authorized streaming provider/resolver.
     */
    const testStream = {
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      type: "mp4" as const,
      provider: "Stellar Stream Core",
    };

    console.log("[scrape-source] Returning test stream:", {
      type: testStream.type,
      provider: testStream.provider,
    });

    return jsonResponse(testStream, 200);
  } catch (error) {
    console.error("[scrape-source] Error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      500,
    );
  }
});
