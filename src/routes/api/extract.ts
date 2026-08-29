import { createAPIFileRoute } from "@tanstack/start/api";
import { scrapeNetNaija } from "@/lib/scrapers/netnaija";

export const Route = createAPIFileRoute("/api/extract")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const tmdbId = url.searchParams.get("tmdbId");
    const title = url.searchParams.get("title");
    const type = url.searchParams.get("type") ?? "movie";
    const season = url.searchParams.get("s") ?? "1";
    const episode = url.searchParams.get("e") ?? "1";

    let streamUrl: string | null = null;

    // Strategy 1: Standard TMDB Scraper API (2Embed / AutoEmbed)
    if (tmdbId) {
      try {
        const providerUrl = `https://movie-api-v2.vercel.app/api/${type}?id=${tmdbId}${
          type === "tv" ? `&s=${season}&e=${episode}` : ""
        }`;
        const res = await fetch(providerUrl);
        if (res.ok) {
          const data = await res.json();
          streamUrl = data.streamUrl || data.url || data.sources?.[0]?.url || null;
        }
      } catch {
        streamUrl = null;
      }
    }

    // Strategy 2: NetNaija / FzMovies Search Fallback by Title
    if (!streamUrl && title) {
      streamUrl = await scrapeNetNaija(title);
    }

    return new Response(
      JSON.stringify({ streamUrl }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
});
