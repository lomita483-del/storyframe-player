import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Hls from "hls.js";

import {
  fetchAutoStreamUrl,
  type DirectStreamResult,
} from "@/lib/scrapers/streamResolver";

interface WatchSearchParams {
  tmdbId: number | undefined;
  title: string | undefined;
  type: "movie" | "tv";
  season: number;
  episode: number;
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export const Route = createFileRoute("/watch/$slug")({
  validateSearch: (search: Record<string, unknown>): WatchSearchParams => ({
    tmdbId: toNumber(search["tmdbId"]),
    title: typeof search["title"] === "string" ? search["title"] : undefined,
    type: search["type"] === "tv" ? "tv" : "movie",
    season: toNumber(search["season"]) ?? 1,
    episode: toNumber(search["episode"]) ?? 1,
  }),

  component: WatchSlugPage,
});

function WatchSlugPage() {
  const navigate = useNavigate();
  const params = Route.useParams();
  const search = Route.useSearch();

  const displayTitle =
    search.title?.trim() ||
    decodeURIComponent(params.slug || "")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim() ||
    "Unknown Title";

  const tmdbId = search.tmdbId;
  const type = search.type || "movie";
  const season = search.season || 1;
  const episode = search.episode || 1;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [stream, setStream] =
    useState<DirectStreamResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const resolveStream = async () => {
    setLoading(true);
    setError(null);
    setVideoError(null);
    setStream(null);

    try {
      console.log("[Watch] Resolving stream:", {
        tmdbId,
        title: displayTitle,
        type,
        season,
        episode,
      });

      const result = await fetchAutoStreamUrl(
        tmdbId,
        displayTitle,
        type,
        season,
        episode,
      );

      console.log("[Watch] Resolver result:", result);

      if (!result?.url) {
        setError(
          "The stream resolver did not return a playable video URL.",
        );
        return;
      }

      setStream(result);
    } catch (err) {
      console.error("[Watch] Resolver error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch the video stream.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resolveStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [tmdbId, displayTitle, type, season, episode]);

  /*
   * Configure the actual video player.
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !stream?.url) {
      return;
    }

    setVideoError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    /*
     * MP4
     */
    if (stream.type === "mp4") {
      console.log("[Player] Setting MP4 source:", stream.url);

      video.pause();

      video.removeAttribute("src");

      while (video.firstChild) {
        video.removeChild(video.firstChild);
      }

      const source = document.createElement("source");
      source.src = stream.url;
      source.type = "video/mp4";

      video.appendChild(source);

      video.load();

      return;
    }

    /*
     * HLS
     */
    if (stream.type === "hls") {
      console.log("[Player] Setting HLS source:", stream.url);

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });

        hlsRef.current = hls;

        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log("[Player] HLS media attached");

          hls.loadSource(stream.url);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("[Player] HLS manifest parsed");
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error("[Player] HLS error:", data);

          if (data.fatal) {
            setVideoError(
              "The HLS stream could not be loaded.",
            );
          }
        });
      } else if (
        video.canPlayType(
          "application/vnd.apple.mpegurl",
        )
      ) {
        video.src = stream.url;
        video.load();
      } else {
        setVideoError(
          "This browser does not support HLS playback.",
        );
      }

      return;
    }

    /*
     * Torrent
     *
     * Do not send torrent URLs to the HTML5 player.
     */
    if (stream.type === "torrent") {
      setVideoError(
        "Torrent playback is not supported by this video player.",
      );
    }
  }, [stream]);

  /*
   * Native video error handler.
   */
  const handleVideoError = () => {
    const video = videoRef.current;
    const mediaError = video?.error;

    console.error(
      "[Player] Native video error:",
      mediaError,
    );

    if (!mediaError) {
      setVideoError("The video could not be played.");
      return;
    }

    switch (mediaError.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        setVideoError("Video loading was aborted.");
        break;

      case MediaError.MEDIA_ERR_NETWORK:
        setVideoError(
          "A network error occurred while loading the video.",
        );
        break;

      case MediaError.MEDIA_ERR_DECODE:
        setVideoError(
          "The browser could not decode this video.",
        );
        break;

      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        setVideoError(
          "The video source is unavailable or uses an unsupported format.",
        );
        break;

      default:
        setVideoError("The video could not be played.");
    }
  };

  const retryPlayback = async () => {
    setVideoError(null);

    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      video.load();

      await video.play();
    } catch (err) {
      console.log(
        "[Player] Playback requires manual Play:",
        err,
      );
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate({ to: ".." });
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-4">

        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">

          <button
            onClick={handleBack}
            className="flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm transition hover:bg-neutral-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {stream?.provider && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
              Source: {stream.provider}
            </span>
          )}

        </div>

        {/* Player */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">

          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="px-6 text-center">

                <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-amber-500" />

                <h2 className="text-lg font-semibold">
                  Preparing stream...
                </h2>

                <p className="mt-2 text-sm text-neutral-400">
                  Finding a playable source.
                </p>

              </div>
            </div>
          )}

          {/* Resolver error */}
          {!loading && error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="max-w-md px-6 text-center">

                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />

                <h2 className="text-lg font-semibold">
                  Stream Extraction Failed
                </h2>

                <p className="mt-2 text-sm text-neutral-400">
                  {error}
                </p>

                <button
                  onClick={resolveStream}
                  className="mx-auto mt-5 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Scrapers
                </button>

              </div>
            </div>
          )}

          {/* Actual video */}
          {!loading && stream && !error && (
            <>
              <video
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full bg-black object-contain"
                onLoadStart={() =>
                  console.log("[Player] loadstart")
                }
                onLoadedMetadata={() =>
                  console.log("[Player] loadedmetadata")
                }
                onLoadedData={() =>
                  console.log("[Player] loadeddata")
                }
                onCanPlay={() =>
                  console.log("[Player] canplay")
                }
                onPlaying={() =>
                  console.log("[Player] playing")
                }
                onWaiting={() =>
                  console.log("[Player] waiting")
                }
                onStalled={() =>
                  console.log("[Player] stalled")
                }
                onError={handleVideoError}
              />

              {videoError && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85">

                  <div className="max-w-md px-6 text-center">

                    <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-red-500" />

                    <h3 className="text-lg font-semibold">
                      Video Playback Error
                    </h3>

                    <p className="mt-2 text-sm text-neutral-400">
                      {videoError}
                    </p>

                    <button
                      onClick={retryPlayback}
                      className="mt-5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
                    >
                      Retry Playback
                    </button>

                  </div>

                </div>
              )}
            </>
          )}

        </div>

        {/* Information */}
        <div className="mt-5">

          <h1 className="text-2xl font-bold">
            {displayTitle}
          </h1>

          {type === "tv" && (
            <p className="mt-1 text-sm text-neutral-400">
              Season {season} — Episode {episode}
            </p>
          )}

          {stream && (
            <div className="mt-3 flex flex-wrap gap-2">

              <span className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
                {stream.type.toUpperCase()}
              </span>

              {stream.provider && (
                <span className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
                  {stream.provider}
                </span>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default WatchSlugPage;
