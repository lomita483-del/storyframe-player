import * as cheerio from "cheerio";

export async function scrapeNetNaija(queryTitle: string): Promise<string | null> {
  try {
    // 1. Search NetNaija for the title
    const searchUrl = `https://www.netnaija.com/search?t=${encodeURIComponent(queryTitle)}`;
    const searchRes = await fetch(searchUrl);
    const searchHtml = await searchRes.text();
    const $search = cheerio.load(searchHtml);

    const firstResultUrl = $search(".post-entry h2 a").first().attr("href");
    if (!firstResultUrl) return null;

    // 2. Load movie page to extract video URL
    const pageRes = await fetch(firstResultUrl);
    const pageHtml = await pageRes.text();
    const $page = cheerio.load(pageHtml);

    // Extract direct media link from download/stream button
    const directUrl = $page("a.btn.download-btn").attr("href") || null;
    return directUrl;
  } catch {
    return null;
  }
}
