export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || searchParams.get("title");
  const tmdbId = searchParams.get("tmdbId");
  const type = searchParams.get("type") || "movie";
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  if (!query && !tmdbId) {
    return new Response(JSON.stringify({ error: "Missing query or tmdbId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const endpoints: string[] = [];

    if (tmdbId) {
      if (type === "tv") {
        endpoints.push(
          `https://vidsrc.stream/api/source/tv/${tmdbId}/${season}/${episode}`,
          `https://autoembed.cc/api/get/tv?id=${tmdbId}&s=${season}&e=${episode}`
        );
      } else {
        endpoints.push(
          `https://vidsrc.stream/api/source/movie/${tmdbId}`,
          `https://autoembed.cc/api/get/movie?id=${tmdbId}`
        );
      }
    }

    // Try API Endpoints directly server-side
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (!res.ok) continue;

        const text = await res.text();
        let data: any = null;

        try {
          data = JSON.parse(text);
        } catch {
          // Response is HTML/Text
        }

        const downloadUrl =
          data?.file ||
          data?.url ||
          data?.sources?.[0]?.file ||
          data?.data?.stream;

        if (downloadUrl) {
          return new Response(JSON.stringify({ downloadUrl }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // RegEx fallback for stream URLs in text
        const match = text.match(/(https?:\/\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)/i);
        if (match?.[1]) {
          return new Response(JSON.stringify({ downloadUrl: match[1] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch {
        continue;
      }
    }

    return new Response(JSON.stringify({ downloadUrl: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ downloadUrl: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
