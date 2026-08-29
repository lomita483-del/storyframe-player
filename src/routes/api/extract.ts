// src/routes/api/extract.ts
import { json } from "@tanstack/start";

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const tmdbId = url.searchParams.get("tmdbId");
  const type = url.searchParams.get("type") ?? "movie";
  const season = url.searchParams.get("s") ?? "1";
  const episode = url.searchParams.get("e") ?? "1";

  if (!tmdbId) {
    return json({ streamUrl: null }, { status: 400 });
  }

  try {
    // Calling an open extraction proxy for TMDB streams
    const targetUrl = `https://movie-api-v2.vercel.app/api/${type}?id=${tmdbId}${
      type === "tv" ? `&s=${season}&e=${episode}` : ""
    }`;

    const res = await fetch(targetUrl);
    if (!res.ok) return json({ streamUrl: null });

    const data = await res.json();
    // Ensure we capture a raw m3u8 playlist file
    const streamUrl = data.streamUrl || data.url || data.sources?.[0]?.url;

    return json({ streamUrl: streamUrl && streamUrl.includes(".m3u8") ? streamUrl : null });
  } catch (err) {
    console.error("Extraction failed:", err);
    return json({ streamUrl: null });
  }
}
