import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck, Film, Tv } from 'lucide-react';
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
  component: WatchPage,
});

function WatchPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const mediaType = search.type || 'movie';
  const season = search.season || 1;
  const episode = search.episode || 1;

  const [stream, setStream] = useState<DirectStreamResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Extract human-readable title and TMDB ID from slug (e.g., "game-of-thrones-1399")
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

      const result = await fetchAutoStreamUrl(
        tmdbId,
        title,
        mediaType,
        season,
        episode
      );

      if (cancelled) return;

      if (result && result.url) {
        setStream(result);
      } else {
        setError('Direct media files could not be extracted across configured providers.');
      }
      setLoading(false);
    }

    resolveMedia();

    return () => {
      cancelled = true;
    };
  }, [slug, tmdbId, title, mediaType, season, episode]);

  // Player Lifecycle & Engine Handler
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

  const updateTvParams = (newSeason: number, newEpisode: number) => {
    navigate({
      to: '/watch/$slug',
      params: { slug },
      search: { type: 'tv', season: newSeason, episode: newEpisode },
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-4 max-w-7xl mx-auto">
      {/* Top Navigation */}
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

      {/* Main Viewport */}
      <div className="relative aspect-video w-full bg-neutral-900/80 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            <h3 className="text-lg font-semibold">Extracting Stream...</h3>
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

      {/* Metadata & TV Controls */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{title}</h1>
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-neutral-800 rounded text-neutral-400 border border-neutral-700">
              {mediaType === 'tv' ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
              {mediaType.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {tmdbId ? `TMDB ID: ${tmdbId} • ` : ''}
            {mediaType === 'tv' ? `Season ${season}, Episode ${episode}` : 'Feature Film'}
          </p>
        </div>

        {/* TV Season / Episode Selector */}
        {mediaType === 'tv' && (
          <div className="flex items-center gap-3 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-400 font-medium">Season</label>
              <select
                value={season}
                onChange={(e) => updateTvParams(Number(e.target.value), episode)}
                className="bg-neutral-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-amber-500"
              >
                {Array.from({ length: 15 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>
                    Season {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-400 font-medium">Episode</label>
              <select
                value={episode}
                onChange={(e) => updateTvParams(season, Number(e.target.value))}
                className="bg-neutral-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-amber-500"
              >
                {Array.from({ length: 25 }, (_, i) => i + 1).map((e) => (
                  <option key={e} value={e}>
                    Episode {e}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WatchPage;
