import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const extractSchema = z.object({
  tmdbId: z.string(),
  type: z.enum(["movie", "tv"]),
  season: z.number().optional(),
  episode: z.number().optional(),
});

export const getDirectStreamUrl = createServerFn({ method: "GET" })
  .validator((data: unknown) => extractSchema.parse(data))
  .handler(async ({ data }) => {
    const { tmdbId, type, season = 1, episode = 1 } = data;

    // You can swap this endpoint for your own scraper service or a stream provider API (like Consumet or custom backend)
    const providerApiUrl = type === "tv"
      ? `https://api.stream-extractor.com/tv/${tmdbId}/${season}/${episode}`
      : `https://api.stream-extractor.com/movie/${tmdbId}`;

    try {
      const response = await fetch(providerApiUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!response.ok) return null;

      const result = await response.json();
      
      // Expecting a response containing { streamUrl: "https://.../master.m3u8" }
      return result.streamUrl ?? null;
    } catch (error) {
      console.error("Failed to extract stream URL:", error);
      return null;
    }
  });
