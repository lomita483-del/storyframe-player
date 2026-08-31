import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw,
  PlayCircle,
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
        : typeof search.tmdbId === "string"
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
  const search = Route.useSearch();

  const {
    tmdbId,
    title = "Unknown Title",
    type = "movie",
    season = 1,
    episode = 1,
  } = search;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [stream, setStream] =
    useState<DirectStreamResult | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [playing, setPlaying] =
    useState(false);

  /**
   * Resolve the stream through:
   *
   * Watch Page
   *      ↓
   * fetchAutoStreamUrl()
   *      ↓
   * Supabase scrape-source
   *      ↓
   * Stream URL
   */
  const resolveStream = async () => {
    setLoading(true);
    setError(null);
    setStream(null);
    setPlaying(false);

    try {
      console.log("[Watch] Resolving stream:", {
        tmdbId,
        title,
        type,
        season,
        episode,
      });

      const result =
        await fetchAutoStreamUrl(
          tmdbId,
          title,
          type,
          season,
          episode,
        );

      console.log(
        "[Watch] Resolver result:",
        result,
      );

      if (!result) {
        throw new Error(
          "No playable stream was returned by the stream resolver.",
        );
      }

      if (!result.url) {
        throw new Error(
          "The stream resolver returned an empty URL.",
        );
      }

      setStream(result);
    } catch (err) {
      console.error(
        "[Watch] Stream resolution failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to resolve the video stream.",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resolve stream whenever the movie/episode changes.
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
    title,
    type,
    season,
    episode,
  ]);

  /**
   * Configure the actual video player.
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !stream) {
      return;
    }

    // Clean up previous HLS instance.
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    /**
     * HLS
     */
    if (stream.type === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });

        hlsRef.current = hls;

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
              "[Player] HLS manifest loaded",
            );

            video
              .play()
              .then(() => {
                setPlaying(true);
              })
              .catch(() => {
                // Browser autoplay may be blocked.
                setPlaying(false);
              });
          },
        );

        hls.on(
          Hls.Events.ERROR,
          (_event, data) => {
            console.error(
              "[Player] HLS error:",
              data,
            );

            if (
              data.fatal
            ) {
              setError(
                "The HLS stream could not be played.",
              );
            }
          },
        );

        hls.attachMedia(video);
      } else if (
        video.canPlayType(
          "application/vnd.apple.mpegurl",
        )
      ) {
        // Safari / native HLS support.
        video.src = stream.url;

        video
          .play()
          .then(() => {
            setPlaying(true);
          })
          .catch(() => {
            setPlaying(false);
          });
      } else {
        setError(
          "This browser does not support HLS playback.",
        );
      }
    }

    /**
     * MP4
     */
    else if (stream.type === "mp4") {
      video.src = stream.url;
      video.load();

      video
        .play()
        .then(() => {
          setPlaying(true);
        })
        .catch(() => {
          // Autoplay can be blocked.
          setPlaying(false);
        });
    }

    /**
     * Torrent
     *
     * Browser torrent playback is intentionally
     * not handled here.
     */
    else if (stream.type === "torrent") {
      setError(
        "Torrent playback is not supported by this player.",
      );
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [stream]);

  const handleBack = () => {
    navigate({
      to: "/",
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium transition hover:bg-neutral-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {stream?.provider && (
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
              Source: {stream.provider}
            </div>
          )}
        </div>

        {/* Player */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 px-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500" />

                <div>
                  <h2 className="text-lg font-semibold">
                    Resolving stream...
                  </h2>

                  <p className="mt-1 text-sm text-neutral-400">
                    Finding a playable source for this title.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500" />

                <div>
                  <h2 className="text-lg font-semibold">
                    Stream Unavailable
                  </h2>

                  <p className="mt-2 text-sm text-neutral-400">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resolveStream}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Video */}
          {stream && !error && (
            <>
              <video
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
                onPlay={() =>
                  setPlaying(true)
                }
                onPause={() =>
                  setPlaying(false)
                }
                onError={() => {
                  console.error(
                    "[Player] Video element error:",
                    videoRef.current?.error,
                  );
                }}
              />

              {!playing && !loading && (
                <button
                  type="button"
                  onClick={() => {
                    videoRef.current
                      ?.play()
                      .catch((err) => {
                        console.error(
                          "[Player] Manual play failed:",
                          err,
                        );
                      });
                  }}
                  className="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/70 px-5 py-3 text-sm font-semibold backdrop-blur transition hover:bg-black/90"
                >
                  <PlayCircle className="h-6 w-6" />
                  Play
                </button>
              )}
            </>
          )}
        </div>

        {/* Movie information */}
        <div className="mt-6">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {title}
          </h1>

          {type === "tv" && (
            <p className="mt-2 text-sm text-neutral-400">
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
