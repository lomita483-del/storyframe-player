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
    }

    const sFormatted = season.padStart(2, "0");
    const eFormatted = episode.padStart(2, "0");
    const searchTitle = type === "tv" ? `${query} S${sFormatted}E${eFormatted}` : query;

    // Run scraper pipeline across all providers sequentially
    const providers = [
      () => scrapeNetNaija(searchTitle),
      () => scrapeFzMovies(query, type),
      () => scrape123Movies(query, tmdbId, type, season, episode),
      () => scrape1337x(searchTitle),
      () => scrapeEZTV(query, season, episode),
    ];

    for (const provider of providers) {
      const result = await provider();
      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    return new Response(
      JSON.stringify({ error: "No direct playable video stream found across providers." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Scraper error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Provider 1: NetNaija (Direct MP4)
async function scrapeNetNaija(term: string) {
  try {
    const res = await fetch(`https://thenetnaija.net/search?t=${encodeURIComponent(term)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;

    const $ = cheerio.load(await res.text());
    const postLink = $("article.post-item a").first().attr("href");
    if (!postLink) return null;

    const postRes = await fetch(postLink, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $post = cheerio.load(await postRes.text());
    const gateLink = $post('a.btn[href*="/download/"]').first().attr("href");
    if (!gateLink) return null;

    const gateRes = await fetch(gateLink, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $gate = cheerio.load(await gateRes.text());
    const directUrl = $gate('a.download-primary, a[href*=".mp4"]').first().attr("href");

    if (directUrl && directUrl.startsWith("http")) {
      return { url: directUrl, type: "mp4", provider: "NetNaija Direct" };
    }
  } catch (e) {
    console.error("[NetNaija Error]", e);
  }
  return null;
}

// Provider 2: FzMovies (Direct MP4)
async function scrapeFzMovies(query: string, type: string) {
  if (type === "tv") return null;
  try {
    const res = await fetch(`https://fzmovies.net/csearch.php?stext=${encodeURIComponent(query)}&stype=name`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;

    const $ = cheerio.load(await res.text());
    const movieLink = $("a[href*='movie-']").first().attr("href");
    if (!movieLink) return null;

    const movieRes = await fetch(`https://fzmovies.net/${movieLink}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $movie = cheerio.load(await movieRes.text());
    const downloadPage = $movie("a[href*='download.php']").first().attr("href");
    if (!downloadPage) return null;

    const dlRes = await fetch(`https://fzmovies.net/${downloadPage}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $dl = cheerio.load(await dlRes.text());
    const finalMp4 = $dl("a[href*='.mp4']").first().attr("href");

    if (finalMp4) {
      return { url: finalMp4, type: "mp4", provider: "FzMovies Direct" };
    }
  } catch (e) {
    console.error("[FzMovies Error]", e);
  }
  return null;
}

// Provider 3: 123Movies Direct HLS Stream Extraction
async function scrape123Movies(query: string, tmdbId: string, type: string, season: string, episode: string) {
  try {
    const targetUrl = type === "tv"
      ? `https://api.vidsrc.icu/raw/tv/${tmdbId}/${season}/${episode}`
      : `https://api.vidsrc.icu/raw/movie/${tmdbId}`;

    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.streamUrl || data?.url) {
        const url = data.streamUrl || data.url;
        return { url, type: url.includes(".m3u8") ? "hls" : "mp4", provider: "123Movies Gateway" };
      }
    }
  } catch (e) {
    console.error("[123Movies Error]", e);
  }
  return null;
}

// Provider 4: 1337x (Torrent Magnet Extraction)
async function scrape1337x(term: string) {
  try {
    const res = await fetch(`https://1337x.to/search/${encodeURIComponent(term)}/1/`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;

    const $ = cheerio.load(await res.text());
    const detailPath = $("td.name a[href*='/torrent/']").first().attr("href");
    if (!detailPath) return null;

    const detailRes = await fetch(`https://1337x.to${detailPath}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $detail = cheerio.load(await detailRes.text());
    const magnet = $detail("a[href^='magnet:']").first().attr("href");

    if (magnet) {
      return { url: magnet, type: "torrent", provider: "1337x Torrent" };
    }
  } catch (e) {
    console.error("[1337x Error]", e);
  }
  return null;
}

// Provider 5: EZTV (TV Series Torrent Magnet)
async function scrapeEZTV(query: string, season: string, episode: string) {
  try {
    const sStr = season.padStart(2, "0");
    const eStr = episode.padStart(2, "0");
    const term = `${query} S${sStr}E${eStr}`;

    const res = await fetch(`https://eztvtorrent.co/search/${encodeURIComponent(term)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;

    const $ = cheerio.load(await res.text());
    const magnet = $("a[href^='magnet:']").first().attr("href");

    if (magnet) {
      return { url: magnet, type: "torrent", provider: "EZTV Torrent" };
    }
  } catch (e) {
    console.error("[EZTV Error]", e);
  }
  return null;
}
