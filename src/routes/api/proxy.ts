import { createAPIFileRoute } from "@tanstack/start/api";

export const Route = createAPIFileRoute("/api/proxy")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get("url");

    if (!videoUrl) {
      return new Response("Missing URL", { status: 400 });
    }

    try {
      const response = await fetch(videoUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch {
      return new Response("Error fetching video stream", { status: 500 });
    }
  },
});
