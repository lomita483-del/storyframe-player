export async function extractStreamUrl(
  tmdbId?: number | null,
  title?: string,
  type: string = "movie",
  season: number = 1,
  episode: number = 1
): Promise<string | null> {
  // Strategy 1: standard provider API
  if (tmdbId) {
    try {
      const providerUrl = `https://movie-api-v2.vercel.app/api/${type}?id=${tmdbId}${
        type === "tv" ? `&s=${season}&e=${episode}` : ""
      }`;
      const res = await fetch(providerUrl);
      if (res.ok) {
        const data = await res.json();
        const url = data.streamUrl ?? data.url ?? data.sources?.[0]?.url ?? null;
        if (url) return url;
      }
    } catch {
      // Fallback to next strategy
    }
  }

  // Strategy 2: NetNaija title fallback using native browser DOMParser
  if (title) {
    try {
      const searchUrl = `https://www.netnaija.com/search?t=${encodeURIComponent(title)}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const html = await searchRes.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const link = doc.querySelector(".post-entry h2 a")?.getAttribute("href");

        if (link) {
          const pageRes = await fetch(link);
          if (pageRes.ok) {
            const pageHtml = await pageRes.text();
            const pageDoc = parser.parseFromString(pageHtml, "text/html");
            return (
              pageDoc.querySelector("a.btn.download-btn")?.getAttribute("href") ??
              pageDoc.querySelector("a[href*='.mp4']")?.getAttribute("href") ??
              null
            );
          }
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}
