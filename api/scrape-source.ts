export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const tmdbId = searchParams.get("tmdbId");
  const type = searchParams.get("type") || "movie";
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  if (!query && !tmdbId) {
    return new Response(JSON.stringify({ error: "Missing query or tmdbId parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cleanTitle = query ? query.replace(/[^a-zA-Z0-9 ]/g, "").trim() : "";

  // Provider Queue (Waterfall Execution)
  const providers = [
    {
      name: "AutoEmbed Stream Engine",
      fetch: () => fetchAutoEmbed(tmdbId, type, season, episode),
    },
    {
      name: "NetNaija Direct Gateway",
      fetch: () => fetchNetNaijaStream(cleanTitle, type, season, episode),
    },
    {
      name: "VidSrc Alternative Bridge",
      fetch: () => fetchVidSrcStream(tmdbId, type, season, episode),
    },
  ];

  for (const provider of providers) {
    try {
      const result = await provider.fetch();
      if (result?.url) {
        return new Response(
          JSON.stringify({
            url: result.url,
            type: result.type || (result.url.includes(".m3u8") ? "hls" : "mp4"),
            provider: provider.name,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (err) {
      console.warn(`[Scraper] ${provider.name} failed:`, err);
    }
  }

  return new Response(
    JSON.stringify({ error: "No direct stream found across providers" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}

// ---------------------------------------------------------------------------
// Provider 1: AutoEmbed / Fast Stream Engine
// ---------------------------------------------------------------------------
async function fetchAutoEmbed(tmdbId: string | null, type: string, season: string, episode: string) {
  if (!tmdbId) return null;

  const endpoint = type === "tv"
    ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
    : `https://player.autoembed.cc/embed/movie/${tmdbId}`;

  const res = await fetch(endpoint, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://autoembed.cc/",
    },
  });

  if (!res.ok) return null;
  const html = await res.text();

  // Extract m3u8 or mp4 URLs directly from inline script declarations
  const streamMatch = html.match(/(https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*)/i);
  if (streamMatch) {
    return { url: streamMatch[1], type: streamMatch[1].includes(".m3u8") ? "hls" : "mp4" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Provider 2: NetNaija & Sabishare File Resolver
// ---------------------------------------------------------------------------
async function fetchNetNaijaStream(title: string, type: string, season: string, episode: string) {
  if (!title) return null;

  const searchQuery = type === "tv"
    ? `${title} Season ${season} Episode ${episode}`
    : title;

  // 1. Search NetNaija post directory
  const searchUrl = `https://www.netnaija.com/search?t=${encodeURIComponent(searchQuery)}&sc=videos`;
  const searchRes = await fetch(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });

  if (!searchRes.ok) return null;
  const searchHtml = await searchRes.text();

  const postLinkMatch = searchHtml.match(/href="(https:\/\/(?:www\.)?netnaija\.com\/videos\/[^\s"]+)"/i);
  if (!postLinkMatch) return null;

  // 2. Extract download / Sabishare link from post page
  const postRes = await fetch(postLinkMatch[1]);
  const postHtml = await postRes.text();

  const sabishareMatch = postHtml.match(/href="(https:\/\/(?:www\.)?sabishare\.com\/file\/[^\s"]+)"/i);
  if (!sabishareMatch) return null;

  // 3. Resolve direct MP4 download link from Sabishare gate
  const sabiRes = await fetch(sabishareMatch[1]);
  const sabiHtml = await sabiRes.text();

  const directMp4Match = sabiHtml.match(/(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/i);
  if (directMp4Match) {
    return { url: directMp4Match[1], type: "mp4" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Provider 3: VidSrc Backup Engine
// ---------------------------------------------------------------------------
async function fetchVidSrcStream(tmdbId: string | null, type: string, season: string, episode: string) {
  if (!tmdbId) return null;

  const apiUrl = type === "tv"
    ? `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
    : `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;

  const res = await fetch(apiUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });

  if (!res.ok) return null;
  const html = await res.text();

  const streamMatch = html.match(/(https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*)/i);
  if (streamMatch) {
    return { url: streamMatch[1], type: streamMatch[1].includes(".m3u8") ? "hls" : "mp4" };
  }

  return null;
}
