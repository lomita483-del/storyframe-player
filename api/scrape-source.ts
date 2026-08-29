import * as cheerio from "cheerio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const tmdbId = searchParams.get("tmdbId");
  const type = searchParams.get("type") || "movie";
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  if (!query && !tmdbId) {
    return new Response(JSON.stringify({ error: "Missing query or tmdbId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const title = query || "";

  // Sequentially resolve providers
  const results = await Promise.allSettled([
    scrapeNetNaija(title, season, episode),
    scrapeNkiri(title, season),
    scrapeEmbedEngine(tmdbId, type, season, episode),
  ]);

  for (const res of results) {
    if (res.status === "fulfilled" && res.value?.url) {
      return new Response(JSON.stringify(res.value), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(
    JSON.stringify({ error: "No direct playable media stream found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}

// NetNaija Scraper (Cheerio DOM Parser)
async function scrapeNetNaija(title: string, season: string, episode: string) {
  if (!title) return null;
  try {
    const term = `${title} ${season ? `S${season}E${episode}` : ""}`;
    const searchUrl = `https://thenetnaija.net/search?t=${encodeURIComponent(term)}`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    if (!res.ok) return null;
    const $ = cheerio.load(await res.text());
    const postLink = $("article.post-item a").first().attr("href");
    if (!postLink) return null;

    const postRes = await fetch(postLink);
    const $post = cheerio.load(await postRes.text());
    const downloadUrl = $post('a.download-button, a[href*=".mp4"]').first().attr("href");

    if (downloadUrl) {
      return { url: downloadUrl, type: "mp4", provider: "NetNaija" };
    }
  } catch {
    return null;
  }
  return null;
}

// Nkiri Scraper (Cheerio DOM Parser)
async function scrapeNkiri(title: string, season: string) {
  if (!title) return null;
  try {
    const term = `${title} ${season ? `Season ${season}` : ""}`;
    const res = await fetch(`https://nkiri.com/?s=${encodeURIComponent(term)}`);
    if (!res.ok) return null;

    const $ = cheerio.load(await res.text());
    const postLink = $("h2.entry-title a").first().attr("href");
    if (!postLink) return null;

    const mediaRes = await fetch(postLink);
    const $media = cheerio.load(await mediaRes.text());
    const mp4Url = $media('a.elementor-button[href*=".mp4"]').first().attr("href");

    if (mp4Url) {
      return { url: mp4Url, type: "mp4", provider: "Nkiri" };
    }
  } catch {
    return null;
  }
  return null;
}

// Embed Direct Media Bridge
async function scrapeEmbedEngine(tmdbId: string | null, type: string, season: string, episode: string) {
  if (!tmdbId) return null;
  try {
    const targetUrl = type === "tv"
      ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://player.autoembed.cc/embed/movie/${tmdbId}`;

    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/(https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*)/i);

    if (match) {
      return {
        url: match[1],
        type: match[1].includes(".m3u8") ? "hls" : "mp4",
        provider: "AutoEmbed Engine",
      };
    }
  } catch {
    return null;
  }
  return null;
}
