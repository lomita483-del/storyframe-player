import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  PlayCircle,
} from "lucide-react";
import Hls from "hls.js";
import { movieBySlugQuery } from "@/lib/movies";

type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "torrent";
  provider?: string;
};


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
        : typeof search.tmdbId === "string" && search.tmdbId
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
        : typeof search.season === "string" && search.season
          ? Number(search.season)
          : 1,

    episode:
      typeof search.episode === "number"
        ? search.episode
        : typeof search.episode === "string" && search.episode
          ? Number(search.episode)
          : 1,
  }),

  component: WatchSlugPage,
});

function WatchSlugPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();

  const navigate = useNavigate();

  const [stream, setStream] =
    useState<DirectStreamResult | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  /*
   * Use the supplied movie information when available.
   *
   * There are intentionally NO fake defaults such as Game of Thrones.
   */
  const tmdbId = search.tmdbId;

  const title =
    search.title ||
    slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const type = search.type || "movie";

  const season = Math.max(
    1,
    search.season || 1,
  );

  const episode = Math.max(
    1,
    search.episode || 1,
  );

  /*
   * Resolve the stream.
   */
  useEffect(() => {
    let cancelled = false;

    async function resolveMedia() {
      setLoading(true);
      setError(null);
      setStream(null);
      setVideoReady(false);

      if (!tmdbId && !title) {
        if (!cancelled) {
          setError(
            "This movie does not contain enough information to locate a stream.",
          );
          setLoading(false);
        }

        return;
      }

      try {
        const result = await fetchAutoStreamUrl(
          tmdbId,
          title,
          type,
          season,
          episode,
        );

        if (cancelled) {
          return;
        }

        if (!result) {
          setError(
            "No playable stream was found for this title. Please try again later.",
          );
          setLoading(false);
          return;
        }

        setStream(result);
        setLoading(false);
      } catch (error) {
        console.error(
          "[WatchPage] Stream resolution failed:",
          error,
        );

        if (!cancelled) {
          setError(
            "Unable to load the video stream. Please try again.",
          );

          setLoading(false);
        }
      }
    }

    resolveMedia();

    return () => {
      cancelled = true;
    };
  }, [
    tmdbId,
    title,
    type,
    season,
    episode,
  ]);

  /*
   * Configure video playback.
   *
   * HLS is handled by hls.js where native HLS isn't available.
   * MP4 is handled directly by the browser.
   *
   * Torrent playback is intentionally not initialized here.
   * Browser-side WebTorrent can cause compatibility/build issues
   * and should not be used for unauthorized content.
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !stream) {
      return;
    }

    let hls: Hls | null = null;

    const handleLoadedMetadata = () => {
      setVideoReady(true);
    };

    const handleCanPlay = () => {
      setVideoReady(true);
    };

    const handleError = () => {
      console.error(
        "[WatchPage] Video element reported a playback error.",
      );

      setError(
        "The video could not be played. The stream may have expired or may not be compatible with your browser.",
      );
    };

    video.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata,
    );

    video.addEventListener(
      "canplay",
      handleCanPlay,
    );

    video.addEventListener(
      "error",
      handleError,
    );

    /*
     * HLS
     */
    if (stream.type === "hls") {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error(
            "[WatchPage] HLS error:",
            data,
          );

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn(
                  "[WatchPage] Fatal HLS network error. Attempting recovery.",
                );

                hls?.startLoad();
                break;

              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn(
                  "[WatchPage] Fatal HLS media error. Attempting recovery.",
                );

                hls?.recoverMediaError();
                break;

              default:
                setError(
                  "The HLS stream could not be played.",
                );

                hls?.destroy();
                hls = null;
            }
          }
        });

        hls.loadSource(stream.url);
        hls.attachMedia(video);
      } else if (
        video.canPlayType(
          "application/vnd.apple.mpegurl",
        )
      ) {
        /*
         * Safari / iOS native HLS.
         */
        video.src = stream.url;
      } else {
        setError(
          "This browser does not support HLS video playback.",
        );
      }
    }

    /*
     * MP4
     */
    else if (stream.type === "mp4") {
      video.src = stream.url;
      video.load();
    }

    /*
     * Torrent
     *
     * Don't attempt to feed magnet URLs directly into HTMLVideoElement.
     */
    else if (stream.type === "torrent") {
      setError(
        "This stream source requires torrent playback, which is not supported by this player.",
      );
    }

    return () => {
      video.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata,
      );

      video.removeEventListener(
        "canplay",
        handleCanPlay,
      );

      video.removeEventListener(
        "error",
        handleError,
      );

      if (hls) {
        hls.destroy();
        hls = null;
      }

      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [stream]);

  /*
   * Back button.
   */
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate({
        to: `/movie/${slug}`,
      });
    } else {
      navigate({
        to: "/",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-2 text-sm transition hover:bg-neutral-700"
          >
            <ArrowLeft className="h-4 w-4" />

            <span>Back</span>
          </button>

          {stream?.provider && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
              Source: {stream.provider}
            </span>
          )}
        </div>

        {/* Player */}
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />

              <h2 className="text-lg font-semibold">
                Loading stream...
              </h2>

              <p className="max-w-md text-xs text-neutral-400">
                Finding a playable authorized stream for{" "}
                <span className="text-neutral-200">
                  {title}
                </span>
                .
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
              <div className="rounded-full bg-red-500/10 p-4">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  Unable to Play Video
                </h2>

                <p className="mt-2 text-sm text-neutral-400">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Video */}
          {!loading &&
            !error &&
            stream && (
              <>
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  poster=""
                />

                {!videoReady && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                  </div>
                )}
              </>
            )}

          {/* Empty state */}
          {!loading &&
            !error &&
            !stream && (
              <div className="flex flex-col items-center gap-3 text-center">
                <PlayCircle className="h-12 w-12 text-neutral-600" />

                <p className="text-sm text-neutral-400">
                  No video source available.
                </p>
              </div>
            )}
        </div>

        {/* Movie information */}
        <div className="mt-6">
          <h1 className="text-2xl font-bold">
            {title}
          </h1>

          {type === "tv" && (
            <p className="mt-1 text-sm text-neutral-400">
              Season {season} — Episode {episode}
            </p>
          )}

          {tmdbId && (
            <p className="mt-1 text-xs text-neutral-600">
              TMDB ID: {tmdbId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default WatchSlugPage;
