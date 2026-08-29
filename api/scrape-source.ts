import * as cheerio from "cheerio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");

  if (!title) {
    return new Response(JSON.stringify({ error: "Missing title query" }), { status: 400 });
  }

  try {
    // 1. Search target site index
    const searchUrl = `https://www.thenetnaija.net/search?t=${encodeURIComponent(title)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
      },
    });
    
    if (!searchRes.ok) {
      return new Response(JSON.stringify({ downloadUrl: null }), { status: 200 });
    }

    const searchHtml = await searchRes.text();
    const $search = cheerio.load(searchHtml);
    
    // Extract first result link
    const firstResultUrl = $search(".post-title a").first().attr("href");
    if (!firstResultUrl) {
      return new Response(JSON.stringify({ downloadUrl: null }), { status: 200 });
    }

    // 2. Resolve media landing page
    const pageRes = await fetch(firstResultUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const pageHtml = await pageRes.text();
    const $page = cheerio.load(pageHtml);

    // Grab direct media file link (.mp4)
    const downloadUrl = $page("a[href*='.mp4']").attr("href") || $page("a.read-more").attr("href");

    return new Response(
      JSON.stringify({ downloadUrl: downloadUrl || null }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch {
    return new Response(JSON.stringify({ downloadUrl: null }), { status: 500 });
  }
}
