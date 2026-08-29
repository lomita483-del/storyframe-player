import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import Hls from 'hls.js';
import { fetchAutoStreamUrl, DirectStreamResult } from '@/lib/scrapers/streamResolver';

interface WatchSearchParams {
  type?: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

export const Route = createFileRoute('/watch/$slug')({
  validateSearch: (search: Record<string, unknown>): WatchSearchParams => {
    return {
      type: (search.type as 'movie' | 'tv') || 'movie',
      season: Number(search.season) || 1,
      episode: Number(search.episode) || 1,
    };
  },
  component: WatchSlugPage,
});

export function WatchSlugPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const type = search.type || 'movie';
  const season = search.season || 1;
  const episode = search.episode || 1;

  const [stream, setStream] = useState<DirectStreamResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Extract human-readable title and TMDB ID from slug
  const parseSlug = (slugStr: string) => {
    const parts = slugStr.split('-');
    const possibleId = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(possibleId)) {
      const rawTitle = parts.slice(0, -1).join(' ');
      return {
        title: rawTitle.replace(/\b\w/g, (c) => c.toUpperCase()) || slugStr,
        tmdbId: possibleId,
      };
    }
    return {
      title: slugStr.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      tmdbId: undefined,
    };
  };

  const { title, tmdbId } = parseSlug(slug);

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

  // Video Element Handler (HLS, MP4 & Safe WebTorrent Magnet Playback)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    let hlsInstance: Hls | null = null;
    let torrentClient: any = null;

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
      // Browser-safe WebTorrent instantiation without top-level import
      if (typeof window !== 'undefined' && (window as any).WebTorrent) {
        const WebTorrentClient = (window as any).WebTorrent;
        torrentClient = new WebTorrentClient();
        torrentClient.add(stream.url, (torrent: any) => {
          const file = torrent.files.find((f: any) => f.name.endsWith(".mp4") || f.name.endsWith(".mkv"));
          if (file) {
            file.renderTo(video);
          }
        });
      }
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
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {stream?.provider && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Source: {stream.provider}
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
}

export default WatchSlugPage;
