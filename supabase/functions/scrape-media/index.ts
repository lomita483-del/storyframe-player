export type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "torrent";
  provider?: string;
};

export async function fetchAutoStreamUrl(
  title?: string,
  type: "movie" | "tv" = "movie",
  season: number = 1,
  episode: number = 1
): Promise<DirectStreamResult | null> {
  if (!title) return null;

  try {
    // 1. Search via CORS proxy to bypass browser restrictions
    const searchUrl = `https://www.thenetnaija.net/search?t=${encodeURIComponent(title)}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Failed to reach search index.");
    
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    // 2. Find the first matching post link
    let targetPostUrl = "";
    const searchItems = doc.querySelectorAll("div.search-item, article.post, .loop-content article");
    for (const item of Array.from(searchItems)) {
      const link = item.querySelector("h3 a, h2 a, a.post-title")?.getAttribute("href");
      if (link) {
        targetPostUrl = link;
        break;
      }
    }

    if (!targetPostUrl) return null;

    // 3. Fetch the individual post page via proxy
    const postProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetPostUrl)}`;
    const postRes = await fetch(postProxyUrl);
    if (!postRes.ok) return null;

    const postHtmlText = await postRes.text();
    const postDoc = parser.parseFromString(postHtmlText, "text/html");

    // 4. Extract direct .mp4 link
    let directDownloadUrl = "";
    const anchors = postDoc.querySelectorAll("a");
    for (const a of Array.from(anchors)) {
      const href = a.getAttribute("href");
      const text = a.textContent?.toLowerCase() || "";
      if (href && (href.endsWith(".mp4") || text.includes("download") || text.includes("server"))) {
        if (href.startsWith("http")) {
          directDownloadUrl = href;
          break;
        }
      }
    }

    if (!directDownloadUrl) {
      const btn = postDoc.querySelector(".download-btn, .btn-download, a.download");
      directDownloadUrl = btn?.getAttribute("href") || "";
    }

    if (!directDownloadUrl) return null;

    return {
      url: directDownloadUrl,
      type: "mp4",
      provider: "NetNaija Index",
    };

  } catch (err) {
    console.error("[streamResolver] Error:", err);
    return null;
  }
}
