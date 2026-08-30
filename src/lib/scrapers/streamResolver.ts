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
    // Clean up tracking numbers from the title (e.g., "In The Grey 1122573" -> "In The Grey")
    const cleanTitle = title.replace(/\s+\d+$/, "").trim();
    console.log(`[streamResolver] Resolving stream for: ${cleanTitle}`);

    const searchUrl = `https://www.thenetnaija.ng/search?t=${encodeURIComponent(cleanTitle)}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) return null;
    
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    // Find the first post link from search results
    let targetPostUrl = "";
    const searchItems = doc.querySelectorAll("div.search-item, article.post, .loop-content article, .posts-list article");
    for (const item of Array.from(searchItems)) {
      const link = item.querySelector("h3 a, h2 a, a.post-title, .title a")?.getAttribute("href");
      if (link) {
        targetPostUrl = link;
        break;
      }
    }

    if (!targetPostUrl) {
      console.warn("[streamResolver] No matching post link found.");
      return null;
    }

    // Fetch the target post page
    const postProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetPostUrl)}`;
    const postRes = await fetch(postProxyUrl);
    if (!postRes.ok) return null;

    const postHtmlText = await postRes.text();
    const postDoc = parser.parseFromString(postHtmlText, "text/html");

    // Look for download buttons or direct mp4 files inside the post
    let directDownloadUrl = "";
    const anchors = postDoc.querySelectorAll("a");
    for (const a of Array.from(anchors)) {
      const href = a.getAttribute("href") || "";
      const text = (a.textContent || "").toLowerCase();
      
      if (href.endsWith(".mp4") || text.includes("download") || text.includes("server")) {
        if (href.startsWith("http")) {
          directDownloadUrl = href;
          break;
        }
      }
    }

    if (!directDownloadUrl) {
      const fallbackBtn = postDoc.querySelector(".download-btn, .btn-download, a.download, .download-link");
      directDownloadUrl = fallbackBtn?.getAttribute("href") || "";
    }

    if (!directDownloadUrl) return null;

    return {
      url: directDownloadUrl,
      type: "mp4",
      provider: "NetNaija Index",
    };

  } catch (err) {
    console.error("[streamResolver] Error resolving stream:", err);
    return null;
  }
}
