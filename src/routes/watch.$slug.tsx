import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import Hls from 'hls.js';
import { fetchAutoStreamUrl, DirectStreamResult } from '@/lib/scrapers/streamResolver';

export const Route = createFileRoute('/watch/$slug')({
  component: WatchPage,
});

function WatchPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const [stream, setStream] = useState<DirectStreamResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Extract human-readable title and TMDB ID from slug (e.g., "leviticus-1564614")
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

      const result = await fetchAutoStreamUrl(tmdbId, title, 'movie');

      if (cancelled) return;

      if (result && result.url) {
        setStream(result);
      } else {
        setError('Direct media files could not be extracted across scrapers.');
      }
      setLoading(false);
    }

    resolveMedia();

    return () => {
      cancelled = true;
    };
  }, [slug, tmdbId, title]);

  // Video playback engine (HLS, MP4 & WebTorrent Magnet support)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    let hlsInstance: Hls | null = null;
    let torrentClient: any = null;

    if (stream.type === 'hls') {
      if (Hls.isSupported()) {
        hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsInstance.loadSource(stream.url);
        hlsInstance.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = stream.url;
      }
    } else if (stream.type === 'mp4') {
      video.src = stream.url;
    } else if (stream.type === 'torrent') {
      if (typeof window !== 'undefined' && (window as any).WebTorrent) {
        torrentClient = new (window as any).WebTorrent();
        torrentClient.add(stream.url, (torrent: any) => {
          const file = torrent.files.find(
            (f: any) => f.name.endsWith('.mp4') || f.name.endsWith('.mkv')
          );
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
          className="flex items-center gap-2 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-sm transition border border-neutral-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </button>

        {stream?.provider && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs rounded-full font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Source: {stream.provider}
          </span>
        )}
      </div>

      {/* Main Video Viewport */}
      <div className="relative aspect-video w-full bg-neutral-900/80 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            <h3 className="text-lg font-semibold">Extracting Ad-Free Stream...</h3>
            <p className="text-xs text-neutral-400 max-w-md">
              Probing NetNaija, FzMovies, 123Movies, 1337x, and EZTV direct gateways
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
            <h3 className="text-lg font-semibold">No Direct Stream Found</h3>
            <p className="text-xs text-neutral-400 max-w-md">{error}</p>
          </div>
        )}

        {!loading && stream && (
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Media Info */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-xs text-neutral-400 mt-1">
          {tmdbId ? `TMDB ID: ${tmdbId} • ` : ''}Ad-Free Native Stream
        </p>
      </div>
    </div>
  );
}

export default WatchPage;
