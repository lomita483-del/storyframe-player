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

  try {
    let query = "";
    let tmdbId = "";
    let type = "movie";
    let season = "1";
    let episode = "1";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      query = body.query || "";
      tmdbId = body.tmdbId || "";
      type = body.type || "movie";
      season = body.season || "1";
      episode = body.episode || "1";
    } else {
      const url = new URL(req.url);
      query = url.searchParams.get("query") || "";
      tmdbId = url.searchParams.get("tmdbId") || "";
      type = url.searchParams.get("type") || "movie";
      season = url.searchParams.get("season") || "1";
      episode = url.searchParams.get("episode") || "1";
    }

    const result = await scrapeProviders(query, tmdbId, type, season, episode);

    if (result) {
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({ error: "No direct stream found across providers" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function scrapeProviders(
  query: string,
  tmdbId: string | null,
  type: string,
  season: string,
  episode: string
) {
  // Provider 1: NetNaija Search & Parse
  if (query) {
    try {
      const term = `${query} ${type === "tv" ? `S${season}E${episode}` : ""}`;
      const searchRes = await fetch(`https://thenetnaija.net/search?t=${encodeURIComponent(term)}`);
      
      if (searchRes.ok) {
        const $ = cheerio.load(await searchRes.text());
        const postLink = $("article.post-item a").first().attr("href");
        
        if (postLink) {
          const postRes = await fetch(postLink);
          const $post = cheerio.load(await postRes.text());
          const downloadUrl = $post('a.download-button, a[href*=".mp4"]').first().attr("href");
          
          if (downloadUrl) {
            return { url: downloadUrl, type: "mp4", provider: "NetNaija Gateway" };
          }
        }
      }
    } catch (err) {
      console.error("[NetNaija Scraper Error]:", err);
    }
  }

  // Provider 2: AutoEmbed Engine
  if (tmdbId) {
    try {
      const targetUrl = type === "tv"
        ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://player.autoembed.cc/embed/movie/${tmdbId}`;

      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://autoembed.cc/",
        },
      });

      if (res.ok) {
        const html = await res.text();
        const match = html.match(/(https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*)/i);
        
        if (match) {
          return {
            url: match[1],
            type: match[1].includes(".m3u8") ? "hls" : "mp4",
            provider: "AutoEmbed Engine",
          };
        }
      }
    } catch (err) {
      console.error("[AutoEmbed Scraper Error]:", err);
    }
  }

  return null;
}
