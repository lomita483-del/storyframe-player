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
    // Construct the target search query for NetNaija (or your index of choice)
    const targetUrl = `https://www.thenetnaija.net/search?t=${encodeURIComponent(title)}`;
    
    // Use a public CORS proxy to safely fetch the search page content from the browser
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error("Failed to reach media index via proxy.");
    }

    const htmlText = await response.text();

    // Simple pattern matching to extract an .mp4 file link from the returned page HTML
    const mp4Match = htmlText.match(/https?:\/\/[^\s"'<>]+\.mp4/i);

    if (mp4Match && mp4Match[0]) {
      return {
        url: mp4Match[0],
        type: "mp4",
        provider: "NetNaija Direct Scraper",
      };
    }

    return null;
  } catch (err) {
    console.error("[streamResolver] Failed to resolve direct stream:", err);
    return null;
  }
}
