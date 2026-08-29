import { json } from "@tanstack/start";

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const tmdbId = url.searchParams.get("tmdbId");
  const type = url.searchParams.get("type") ?? "movie";
  const season = url.searchParams.get("s") ?? "1";
  const episode = url.searchParams.get("e") ?? "1";

  if (!tmdbId) {
    return json({ error: "Missing tmdbId" }, { status: 400 });
  }

  try {
    // 1. Call your stream scraper source (e.g., consumption API or self-hosted extractor)
    // Example endpoint structure:
    const targetUrl = type === "tv"
      ? `https://api.consumet.org/movies/flixhq/watch?episodeId=${tmdbId}&mediaId=${tmdbId}&s=${season}&e=${episode}`
      : `https://api.consumet.org/movies/flixhq/watch?episodeId=${tmdbId}&mediaId=${tmdbId}`;

    const res = await fetch(targetUrl);
    if (!res.ok) return json({ streamUrl: null });

    const data = await res.json();
    
    // 2. Extract the master .m3u8 playlist URL from sources
    const m3u8Source = data.sources?.find((s: { quality: string; url: string }) => 
      s.quality === "auto" || s.url.includes(".m3u8")
    );

    return json({ streamUrl: m3u8Source?.url ?? null });
  } catch {
    return json({ streamUrl: null });
  }
}
