import * as cheerio from "cheerio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");

  if (!title) {
    return new Response(JSON.stringify({ error: "Missing title query" }), { status: 400 });
  }

  try {
    // 1. Search site index (e.g., NetNaija search page)
    const searchUrl = `https://www.thenetnaija.net/search?t=${encodeURIComponent(title)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    
    const searchHtml = await searchRes.text();
    const $search = cheerio.load(searchHtml);
    
    // Grab first download post link
    const firstResultUrl = $search(".post-title a").first().attr("href");
    if (!firstResultUrl) {
      return new Response(JSON.stringify({ downloadUrl: null }), { status: 200 });
    }

    // 2. Fetch media landing page & locate direct CDN/download link
    const pageRes = await fetch(firstResultUrl);
    const pageHtml = await pageRes.text();
    const $page = cheerio.load(pageHtml);

    // Extract direct file link (.mp4 or direct storage server URL)
    const downloadUrl = $page("a[href*='.mp4']").attr("href") || $page("a.read-more").attr("href");

    return new Response(
      JSON.stringify({ downloadUrl: downloadUrl || null }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ downloadUrl: null }), { status: 500 });
  }
}
