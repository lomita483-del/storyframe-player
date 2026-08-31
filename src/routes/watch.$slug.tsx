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
  tmdbId?: number;
  title?: string;
  type?: "movie" | "tv";
  season?: number;
  episode?: number;
}

export const Route = createFileRoute("/watch/$slug")({
  validateSearch: (search: Record<string, unknown>): WatchSearchParams => ({
    tmdbId:
      typeof search.tmdbId === "number"
        ? search.tmdbId
        : typeof search.tmdbId === "string" && search.tmdbId.trim()
          ? Number(search.tmdbId)
          : undefined,

    title:
      typeof search.title === "string"
        ? search.title
        : undefined,

    type:
      search.type === "tv" || search.type === "movie"
        ? search.type
        : "movie",

    season:
      typeof search.season === "number"
        ? search.season
        : typeof search.season === "string"
          ? Number(search.season)
          : 1,

    episode:
      typeof search.episode === "number"
        ? search.episode
        : typeof search.episode === "string"
          ? Number(search.episode)
          : 1,
  }),

  component: WatchSlugPage,
});

function WatchSlugPage() {
  const navigate = useNavigate();
  const params = Route.useParams();
  const search = Route.useSearch();

  /*
   * Use the title passed from the previous page.
   * If title is missing, use the URL slug as a fallback.
   */
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

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [videoError, setVideoError] =
    useState<string | null>(null);

  /*
   * Resolve the stream.
   */
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

      const result =
        await fetchAutoStreamUrl(
          tmdbId,
          displayTitle,
          type,
          season,
          episode,
        );

      console.log(
        "[Watch] Stream resolver result:",
        result,
      );

      if (!result?.url) {
        setError(
          "No playable stream was returned by the stream provider.",
        );
        return;
      }

      setStream(result);
    } catch (err) {
      console.error(
        "[Watch] Stream resolver failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch media from the stream provider.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Resolve whenever the movie/episode changes.
   */
  useEffect(() => {
    resolveStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [
    tmdbId,
    displayTitle,
    type,
    season,
    episode,
  ]);

  /*
   * HLS setup.
   *
   * MP4 does NOT need HLS.js.
   * MP4 is supplied directly through the video src.
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !stream) {
      return;
    }

    setVideoError(null);

    /*
     * Destroy previous HLS instance.
     */
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    /*
     * MP4:
     *
     * The <video> element already receives
     * stream.url through its src property.
     */
    if (stream.type === "mp4") {
      console.log(
        "[Player] Loading MP4:",
        stream.url,
      );

      return;
    }

    /*
     * HLS:
     */
    if (stream.type === "hls") {
      console.log(
        "[Player] Loading HLS:",
        stream.url,
      );

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
        });

        hlsRef.current = hls;

        hls.attachMedia(video);

        hls.on(
          Hls.Events.MEDIA_ATTACHED,
          () => {
            console.log(
              "[Player] HLS media attached",
            );

            hls.loadSource(stream.url);
          },
        );

        hls.on(
          Hls.Events.MANIFEST_PARSED,
          () => {
            console.log(
              "[Player] HLS manifest parsed",
            );
          },
        );

        hls.on(
          Hls.Events.ERROR,
          (_event, data) => {
            console.error(
              "[Player] HLS error:",
              data,
            );

            if (data.fatal) {
              setVideoError(
                "The HLS stream could not be loaded.",
              );
            }
          },
        );
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
    }

    /*
     * Torrent playback is deliberately not
     * initialized here.
     */
    if (stream.type === "torrent") {
      setVideoError(
        "Torrent playback is not supported by this player.",
      );
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream]);

  /*
   * Native HTML5 video error handler.
   */
  const handleVideoError = () => {
    const video = videoRef.current;

    console.error(
      "[Player] Native video error:",
      video?.error,
    );

    if (!video?.error) {
      setVideoError(
        "The video could not be played.",
      );
      return;
    }

    switch (video.error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        setVideoError(
          "Video loading was aborted.",
        );
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
          "This video format or source is not supported.",
        );
        break;

      default:
        setVideoError(
          "The video could not be played.",
        );
    }
  };

  /*
   * Retry the current video.
   */
  const retryPlayback = () => {
    setVideoError(null);

    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.load();

    video.play().catch((err) => {
      /*
       * Autoplay restrictions are normal on mobile.
       * The user can press Play manually.
       */
      console.log(
        "[Player] Manual playback required:",
        err,
      );
    });
  };

  /*
   * Back button.
   */
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate({
        to: "..",
      });
    } else {
      navigate({
        to: "/",
      });
    }
  };

  /*
   * For MP4, directly provide the URL
   * to the native video element.
   */
  const videoSrc =
    stream?.type === "mp4"
      ? stream.url
      : undefined;

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

        {/* Video Player */}
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

          {/* Resolver Error */}
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

          {/* Video */}
          {!loading &&
            stream &&
            !error && (
              <>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  onLoadStart={() =>
                    console.log(
                      "[Player] loadstart",
                    )
                  }
                  onLoadedMetadata={() =>
                    console.log(
                      "[Player] loadedmetadata",
                    )
                  }
                  onLoadedData={() =>
                    console.log(
                      "[Player] loadeddata",
                    )
                  }
                  onCanPlay={() =>
                    console.log(
                      "[Player] canplay",
                    )
                  }
                  onPlaying={() =>
                    console.log(
                      "[Player] playing",
                    )
                  }
                  onWaiting={() =>
                    console.log(
                      "[Player] waiting",
                    )
                  }
                  onStalled={() =>
                    console.log(
                      "[Player] stalled",
                    )
                  }
                  onError={handleVideoError}
                />

                {/* Video Error Overlay */}
                {videoError && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
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

        {/* Movie Information */}
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
