import * as cheerio from "cheerio";

export async function scrapeNetNaija(queryTitle: string): Promise<string | null> {
  try {
    // 1. Search NetNaija for the title
    const searchUrl = `https://www.netnaija.com/search?t=${encodeURIComponent(queryTitle)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();
    const $search = cheerio.load(searchHtml);

    // Get the first matching search result link
    const firstResultUrl = $search(".post-entry h2 a").first().attr("href");
    if (!firstResultUrl) return null;

    // 2. Load the movie/episode landing page
    const pageRes = await fetch(firstResultUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!pageRes.ok) return null;
    const pageHtml = await pageRes.text();
    const $page = cheerio.load(pageHtml);

    // 3. Extract direct video download link
    const directUrl =
      $page("a.btn.download-btn").attr("href") ??
      $page("a[href*='.mp4']").attr("href") ??
      null;

    return directUrl;
  } catch {
    return null;
  }
}
