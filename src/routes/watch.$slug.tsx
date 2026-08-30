import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  PlayCircle,
  ExternalLink,
  Download,
  ShieldCheck,
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

  const [stream, setStream] = useState<DirectStreamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const title =
    search.title ||
    slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const type = search.type || "movie";
  const season = Math.max(1, search.season || 1);
  const episode = Math.max(1, search.episode || 1);

  const movieQuery = useQuery(movieBySlugQuery(slug));
  const movie = movieQuery.data ?? null;
  const whereToWatch = movie?.where_to_watch ?? [];

  // Scraper integration effect
  useEffect(() => {
    let isMounted = true;

    async function resolveScraperStream() {
      setLoading(true);
      setError(null);

      // 1. Check local DB/configured direct file first
      const localUrl = movie?.direct_stream_url || movie?.video_url;
      if (localUrl) {
        if (!isMounted) return;
        setStream({
          url: localUrl,
          type: localUrl.includes(".m3u8") ? "hls" : "mp4",
          provider: "Local Catalog",
        });
        setLoading(false);
        return;
      }

      try {
        // 2. Call your backend scraper route that searches NetNaija, FzMovies, or 1377x
        // Example endpoint: /api/scrape?title=...&type=...&season=...&episode=...
        const scraperRes = await fetch(
          `/api/scrape?title=${encodeURIComponent(title)}&type=${type}&season=${season}&episode=${episode}`
        );
        
        if (!scraperRes.ok) throw new Error("Scraper service failed to respond.");
        
        const data = await scraperRes.json();

        if (!isMounted) return;

        if (data?.url) {
          setStream({
            url: data.url,
            type: data.type || (data.url.includes(".m3u8") ? "hls" : "mp4"),
            provider: data.provider || "Direct Scraper Source",
          });
        } else {
          setError("No direct downloadable stream could be found from your configured scraper sources (NetNaija/FzMovies/Torrents).");
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Scraping resolution error:", err);
        setError("Failed to fetch media links from scrapers. Check your backend scrapers.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    resolveScraperStream();

    return () => {
      isMounted = false;
    };
  }, [slug, title, type, season, episode, movie]);

  // Video playback configuration (HLS.js / MP4)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    let hls: Hls | null = null;

    const handleLoadedMetadata = () => setVideoReady(true);
    const handleCanPlay = () => setVideoReady(true);
    const handleError = () => {
      setError("The video stream encountered a playback error or format incompatibility.");
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    if (stream.type === "hls") {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
            else {
              setError("Fatal HLS playback error.");
              hls?.destroy();
              hls = null;
            }
          }
        });
        hls.loadSource(stream.url);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = stream.url;
      } else {
        setError("Browser does not support HLS playback.");
      }
    } else if (stream.type === "mp4") {
      video.src = stream.url;
      video.load();
    } else if (stream.type === "torrent") {
      setError("Torrent direct stream requires a WebTorrent client extension.");
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      if (hls) {
        hls.destroy();
        hls = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [stream]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate({ to: `/movie/${slug}` });
    } else {
      navigate({ to: "/" });
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
            <span className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Scraper Source: {stream.provider}
            </span>
          )}
        </div>

        {/* Player Container */}
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
          {loading && (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
              <h2 className="text-lg font-semibold">Scraping media links...</h2>
              <p className="max-w-md text-xs text-neutral-400">
                Searching download indexes for <span className="text-neutral-200">{title}</span>
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
              <div className="rounded-full bg-red-500/10 p-4">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Stream Extraction Failed</h2>
                <p className="mt-2 text-sm text-neutral-400">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
              >
                Retry Scrapers
              </button>
            </div>
          )}

          {!loading && !error && stream && (
            <>
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
              />
              {!videoReady && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
              )}
            </>
          )}

          {!loading && !error && !stream && (
            <div className="flex max-w-md flex-col items-center gap-3 px-6 text-center">
              <PlayCircle className="h-12 w-12 text-neutral-600" />
              <p className="text-sm text-neutral-400">
                No direct stream could be resolved from external indexers.
              </p>
            </div>
          )}
        </div>

        {/* Details & Direct Download Option */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {type === "tv" && (
              <p className="mt-1 text-sm text-neutral-400">
                Season {season} — Episode {episode}
              </p>
            )}
          </div>

          {stream?.url && (
            <a
              href={stream.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-800"
            >
              <Download className="h-4 w-4 text-amber-500" /> Download Raw File (.mp4)
            </a>
          )}
        </div>

        {whereToWatch.length > 0 && (
          <div className="mt-6 border-t border-neutral-800 pt-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Where to watch officially
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
      </div>
    </div>
  );
}

export default WatchSlugPage;
