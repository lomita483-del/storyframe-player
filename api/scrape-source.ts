import * as cheerio from "cheerio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || searchParams.get("title");

  if (!query) {
    return new Response(JSON.stringify({ error: "Missing search query" }), { status: 400 });
  }

  try {
    // 1. Perform Search
    const searchUrl = `https://www.thenetnaija.net/search?t=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!searchRes.ok) {
      return new Response(JSON.stringify({ downloadUrl: null }), { status: 200 });
    }

    const searchHtml = await searchRes.text();
    const $search = cheerio.load(searchHtml);

    // 2. Extract First Relevant Article Link
    const firstResultUrl =
      $search(".post-title a").first().attr("href") ||
      $search("article a").first().attr("href");

    if (!firstResultUrl) {
      return new Response(JSON.stringify({ downloadUrl: null }), { status: 200 });
    }

    // 3. Resolve Media Landing Page
    const pageRes = await fetch(firstResultUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const pageHtml = await pageRes.text();
    const $page = cheerio.load(pageHtml);

    // 4. Find Direct Video Links (.mp4, .m3u8, or file CDN links)
    let downloadUrl =
      $page("a[href*='.mp4']").attr("href") ||
      $page("a[href*='.m3u8']").attr("href") ||
      $page("a.download-block").attr("href") ||
      $page("a.read-more").attr("href");

    return new Response(
      JSON.stringify({ downloadUrl: downloadUrl || null }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(JSON.stringify({ downloadUrl: null }), { status: 500 });
  }
}
