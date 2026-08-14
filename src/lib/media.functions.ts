import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  url: z.string().url(),
  kind: z.enum(["video", "image", "subtitle"]),
});

/**
 * Checks that a URL really points at a playable/viewable file (and not an
 * HTML page), so operators can't accidentally save a web page as a source.
 */
export const validateMediaUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { checkMediaUrl } = await import("./media-check.server");
    return checkMediaUrl(data.url, data.kind);
  });
