import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("query") || "";
  const tmdbId = url.searchParams.get("tmdbId");
  const type = url.searchParams.get("type") || "movie";
  const season = url.searchParams.get("season") || "1";
  const episode = url.searchParams.get("episode") || "1";

  // Provider Scrape Logic
  const result = await scrapeProviders(query, tmdbId, type, season, episode);

  if (result) {
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  return new Response(
    JSON.stringify({ error: "No direct playable media stream found" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
  );
});

async function scrapeProviders(query: string, tmdbId: string | null, type: string, season: string, episode: string) {
  // 1. NetNaija Parse
  if (query) {
    try {
      const term = `${query} ${season ? `S${season}E${episode}` : ""}`;
      const searchRes = await fetch(`https://thenetnaija.net/search?t=${encodeURIComponent(term)}`);
      if (searchRes.ok) {
        const $ = cheerio.load(await searchRes.text());
        const postLink = $("article.post-item a").first().attr("href");
        if (postLink) {
          const postRes = await fetch(postLink);
          const $post = cheerio.load(await postRes.text());
          const downloadUrl = $post('a.download-button, a[href*=".mp4"]').first().attr("href");
          if (downloadUrl) return { url: downloadUrl, type: "mp4", provider: "NetNaija" };
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 2. Fast Embed Bridge Fallback
  if (tmdbId) {
    try {
      const targetUrl = type === "tv"
        ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://player.autoembed.cc/embed/movie/${tmdbId}`;

      const res = await fetch(targetUrl);
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/(https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*)/i);
        if (match) {
          return { url: match[1], type: match[1].includes(".m3u8") ? "hls" : "mp4", provider: "AutoEmbed" };
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  return null;
}
