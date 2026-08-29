// src/routes/api/extract.ts
import { createAPIFileRoute } from "@tanstack/start/api";

export const Route = createAPIFileRoute("/api/extract")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const tmdbId = url.searchParams.get("tmdbId");
    const type = url.searchParams.get("type") ?? "movie";
    const season = url.searchParams.get("s") ?? "1";
    const episode = url.searchParams.get("e") ?? "1";

    if (!tmdbId) {
      return new Response(JSON.stringify({ streamUrl: null }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // Server-side fetch to extract stream link (bypasses browser CORS)
      const providerUrl = `https://movie-api-v2.vercel.app/api/${type}?id=${tmdbId}${
        type === "tv" ? `&s=${season}&e=${episode}` : ""
      }`;

      const res = await fetch(providerUrl);
      if (!res.ok) throw new Error("Extractor offline");

      const data = await res.json();
      const streamUrl = data.streamUrl || data.url || data.sources?.[0]?.url || null;

      return new Response(
        JSON.stringify({
          streamUrl: streamUrl && streamUrl.includes(".m3u8") ? streamUrl : null,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch {
      return new Response(JSON.stringify({ streamUrl: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
