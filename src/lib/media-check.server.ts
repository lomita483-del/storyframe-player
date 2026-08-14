type Kind = "video" | "image" | "subtitle";

export type MediaCheck = {
  ok: boolean;
  message: string;
  contentType?: string | null;
  hint?: string;
};

const VIDEO_TYPES = [
  "video/",
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "audio/mpegurl",
  "application/dash+xml",
  "application/octet-stream",
];

function looksLikePlaylist(url: string) {
  return url.includes(".m3u8") || url.includes(".mpd");
}

export async function checkMediaUrl(url: string, kind: Kind): Promise<MediaCheck> {
  let response: Response;
  try {
    response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1024" }, redirect: "follow" });
  } catch {
    return { ok: false, message: "The URL could not be reached from the server." };
  }

  if (!response.ok && response.status !== 206) {
    return { ok: false, message: `The host responded with ${response.status}.` };
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? null;
  const cors = response.headers.get("access-control-allow-origin");

  if (contentType?.includes("text/html")) {
    return {
      ok: false,
      contentType,
      message: "This is a web page, not a media file.",
      hint: "Paste a direct file link (.mp4, .m3u8, .jpg) that you own or are licensed to stream.",
    };
  }

  const matches =
    kind === "image"
      ? Boolean(contentType?.startsWith("image/"))
      : kind === "subtitle"
        ? Boolean(contentType?.includes("text/vtt") || url.includes(".vtt"))
        : Boolean(
            VIDEO_TYPES.some((type) => contentType?.includes(type)) ||
              looksLikePlaylist(url) ||
              contentType?.includes("text/plain"),
          );

  if (!matches) {
    return {
      ok: false,
      contentType,
      message: `Unexpected content type${contentType ? ` (${contentType})` : ""} for a ${kind} source.`,
    };
  }

  if (kind === "video" && !cors) {
    return {
      ok: true,
      contentType,
      message: "Reachable, but the host sends no CORS header — playback may be blocked in browsers.",
    };
  }

  return { ok: true, contentType, message: "Looks like a valid, playable source." };
}
