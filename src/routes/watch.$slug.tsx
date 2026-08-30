import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  PlayCircle,
} from "lucide-react";
import Hls from "hls.js";
import { useQuery } from "@tanstack/react-query";
import { movieBySlugQuery } from "@/lib/movies";

type DirectStreamResult = {
  url: string;
  type: "hls" | "mp4" | "torrent";
  provider?: string | undefined;
};


interface WatchSearchParams {
  tmdbId?: number | undefined;
  title?: string | undefined;
  type?: "movie" | "tv" | undefined;
  season?: number | undefined;
  episode?: number | undefined;
}


function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
}

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
   * Resolve the stream from our own catalogue (owned / licensed sources only).
   */
  const movieQuery = useQuery(movieBySlugQuery(slug));

  useEffect(() => {
    if (movieQuery.isLoading) {
      setLoading(true);
      setError(null);
      setStream(null);
      setVideoReady(false);
      return;
    }

    if (movieQuery.isError) {
      setError("Unable to load the video stream. Please try again.");
      setLoading(false);
      return;
    }

    const movie = movieQuery.data;
    const url = movie?.direct_stream_url || movie?.video_url || null;

    if (!url) {
      setStream(null);
      setError(null);
      setLoading(false);
      return;
    }

    setStream({
      url,
      type: url.includes(".m3u8") ? "hls" : "mp4",
      provider: movie?.title ?? undefined,
    });
    setError(null);
    setLoading(false);
  }, [movieQuery.isLoading, movieQuery.isError, movieQuery.data]);


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

          {/* Trailer fallback */}
          {!loading && !error && !stream && trailerEmbedUrl && (
            <iframe
              src={trailerEmbedUrl}
              title={`${title} trailer`}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* Empty state */}
          {!loading && !error && !stream && !trailerEmbedUrl && (
            <div className="flex max-w-md flex-col items-center gap-3 px-6 text-center">
              <PlayCircle className="h-12 w-12 text-neutral-600" />

              <p className="text-sm text-neutral-400">
                No authorized stream or trailer is available for this title yet.
              </p>
            </div>
          )}
        </div>

        {/* Movie information */}
        <div className="mt-6">
          <h1 className="text-2xl font-bold">
            {title}
          </h1>

          {!stream && trailerEmbedUrl && (
            <p className="mt-1 text-sm text-amber-400">
              Playing the official trailer — full stream not available yet.
            </p>
          )}

          {type === "tv" && (
            <p className="mt-1 text-sm text-neutral-400">
              Season {season} — Episode {episode}
            </p>
          )}

          {whereToWatch.length > 0 && (
            <div className="mt-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Where to watch
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {whereToWatch.map((link) => (
                  <li key={`${link.name}-${link.url}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                    >
                      {link.name}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tmdbId && (
            <p className="mt-3 text-xs text-neutral-600">
              TMDB ID: {tmdbId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default WatchSlugPage;
