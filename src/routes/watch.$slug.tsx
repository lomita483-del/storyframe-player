import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, Loader2, PlayCircle, AlertTriangle } from "lucide-react";
import Hls from "hls.js";
import WebTorrent from "webtorrent";
import { fetchAutoStreamUrl, DirectStreamResult } from "@/lib/scrapers/streamResolver";

interface WatchPageProps {
  tmdbId?: number;
  title?: string;
  type?: "movie" | "tv";
  season?: number;
  episode?: number;
  onBack?: () => void;
}

export const WatchSlugPage: React.FC<WatchPageProps> = ({
  tmdbId = 1399, // Game of Thrones Default Example
  title = "Game of Thrones",
  type = "tv",
  season = 1,
  episode = 10,
  onBack,
}) => {
  const [stream, setStream] = useState<DirectStreamResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveMedia() {
      setLoading(true);
      setError(null);
      setStream(null);

      const result = await fetchAutoStreamUrl(tmdbId, title, type, season, episode);

      if (cancelled) return;

      if (result) {
        setStream(result);
      } else {
        setError("Direct media files could not be extracted across scrapers.");
      }
      setLoading(false);
    }

    resolveMedia();

    return () => {
      cancelled = true;
    };
  }, [tmdbId, title, type, season, episode]);

  // Video Element Handler (HLS, MP4 & WebTorrent Magnet Playback)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    let hlsInstance: Hls | null = null;
    let torrentClient: WebTorrent.Instance | null = null;

    if (stream.type === "hls") {
      if (Hls.isSupported()) {
        hlsInstance = new Hls({ enableWorker: true });
        hlsInstance.loadSource(stream.url);
        hlsInstance.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = stream.url;
      }
    } else if (stream.type === "mp4") {
      video.src = stream.url;
    } else if (stream.type === "torrent") {
      // Torrent Magnet Streamer
      torrentClient = new WebTorrent();
      torrentClient.add(stream.url, (torrent) => {
        const file = torrent.files.find((f) => f.name.endsWith(".mp4") || f.name.endsWith(".mkv"));
        if (file) {
          file.renderTo(video);
        }
      });
    }

    return () => {
      if (hlsInstance) hlsInstance.destroy();
      if (torrentClient) torrentClient.destroy();
    };
  }, [stream]);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-4 max-w-7xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {stream?.provider && (
          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs rounded-full">
            Source: {stream.provider}
          </span>
        )}
      </div>

      {/* Main Player Display Frame */}
      <div className="relative aspect-video w-full bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            <h3 className="text-lg font-semibold">Analyzing stream sources...</h3>
            <p className="text-xs text-neutral-400">
              Probing NetNaija, FzMovies, 123Movies, 1337x, and EZTV direct gateways
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
            <h3 className="text-lg font-semibold">No Direct Stream Found</h3>
            <p className="text-xs text-neutral-400">{error}</p>
          </div>
        )}

        {!loading && stream && (
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Metadata Info */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {type === "tv" && (
          <p className="text-sm text-neutral-400 mt-1">
            Season {season} — Episode {episode}
          </p>
        )}
      </div>
    </div>
  );
};

export default WatchSlugPage;
