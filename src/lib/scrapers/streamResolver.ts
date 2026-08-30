export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "torrent";
  provider?: string;
};

async function scrapeNetNaija(cleanTitle: string): Promise<string | null> {
  const searchUrl = `https://www.thenetnaija.net/search?t=${encodeURIComponent(cleanTitle)}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
  
  const res = await fetch(proxyUrl);
  if (!res.ok) return null;
  
  const htmlText = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");

  let targetPostUrl = "";
  const items = doc.querySelectorAll("div.search-item, article.post, .loop-content article");
  for (const item of Array.from(items)) {
    const link = item.querySelector("h3 a, h2 a, a.post-title")?.getAttribute("href");
    if (link) {
      targetPostUrl = link;
      break;
    }
  }

  if (!targetPostUrl) return null;

  const postRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetPostUrl)}`);
  if (!postRes.ok) return null;
  
  const postHtml = await postRes.text();
  const postDoc = parser.parseFromString(postHtml, "text/html");

  const anchors = postDoc.querySelectorAll("a");
  for (const a of Array.from(anchors)) {
    const href = a.getAttribute("href") || "";
    const text = (a.textContent || "").toLowerCase();
    if ((href.endsWith(".mp4") || text.includes("download")) && href.startsWith("http")) {
      return href;
    }
  }
  return null;
}

async function scrapeFzMovies(cleanTitle: string): Promise<string | null> {
  // Fallback/secondary source provider pattern
  const searchUrl = `https://fzmovies.net/search.aspx?search=${encodeURIComponent(cleanTitle)}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
  
  const res = await fetch(proxyUrl);
  if (!res.ok) return null;
  
  const htmlText = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  
  const link = doc.querySelector(".main_link, .download-btn, a")?.getAttribute("href");
  if (link && link.startsWith("http")) return link;
  
  return null;
}

export async function fetchAutoStreamUrl(
  title?: string,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1
): Promise<DirectStreamResult | null> {
  if (!title) return null;

  const cleanTitle = title.replace(/\s+\d+$/, "").trim();
  console.log(`[streamResolver] Multi-scraper searching for: ${cleanTitle}`);

  // Array of scrapers to run concurrently or sequentially until one succeeds
  const scrapers = [
    { name: "NetNaija Index", fn: () => scrapeNetNaija(cleanTitle) },
    { name: "FzMovies Index", fn: () => scrapeFzMovies(cleanTitle) },
  ];

  for (const scraper of scrapers) {
    try {
      console.log(`[streamResolver] Trying scraper: ${scraper.name}`);
      const streamUrl = await scraper.fn();
      if (streamUrl) {
        console.log(`[streamResolver] Success with ${scraper.name}!`);
        return {
          url: streamUrl,
          type: "mp4",
          provider: scraper.name,
        };
      }
    } catch (err) {
      console.warn(`[streamResolver] Scraper ${scraper.name} failed:`, err);
    }
  }

  console.error("[streamResolver] All scrapers exhausted. No stream found.");
  return null;
}
