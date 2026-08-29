export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || searchParams.get("title");

  if (!query) {
    return new Response(JSON.stringify({ error: "Missing search query" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const searchUrl = `https://www.thenetnaija.net/search?t=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!searchRes.ok) {
      return new Response(JSON.stringify({ downloadUrl: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const searchHtml = await searchRes.text();

    // 1. Match first article URL using RegEx
    const linkMatch = searchHtml.match(/class="post-title"[^>]*>\s*<a href="([^"]+)"/i) ||
                      searchHtml.match(/<article[^>]*>[\s\S]*?<a href="([^"]+)"/i);

    const firstResultUrl = linkMatch?.[1];

    if (!firstResultUrl) {
      return new Response(JSON.stringify({ downloadUrl: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Resolve target media page
    const pageRes = await fetch(firstResultUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const pageHtml = await pageRes.text();

    // 3. Extract direct video URL (.mp4 or .m3u8)
    const mediaMatch = pageHtml.match(/href="([^"]+\.(?:mp4|m3u8)[^"]*)"/i) ||
                       pageHtml.match(/href="([^"]+download[^"]+)"/i);

    const downloadUrl = mediaMatch?.[1] || null;

    return new Response(
      JSON.stringify({ downloadUrl }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ downloadUrl: null }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
