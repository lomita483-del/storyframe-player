import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const url = new URL(req.url);
  const title = url.searchParams.get("title");
  const type = url.searchParams.get("type");

  if (!title) {
    return new Response(JSON.stringify({ error: "Missing title" }), { status: 400 });
  }

  try {
    // Example: Fetch search results from your preferred index or aggregator API
    // and extract the direct .mp4 or .m3u8 CDN link without returning iframes or ads.

    // Placeholder for your scraper logic parsing the target site:
    const directVideoUrl = `https://example-cdn.com/stream/${encodeURIComponent(title)}.mp4`;

    return new Response(
      JSON.stringify({
        url: directVideoUrl,
        type: "mp4",
        provider: "Direct Index Scraper",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
