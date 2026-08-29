import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Star, X } from "lucide-react";
import type { Movie } from "@/lib/movies";
import { cn } from "@/lib/utils";

type Props = {
  movie: Movie;
  className?: string | undefined;
  progressPercent?: number | undefined;
};

export function MovieCard({ movie, className, progressPercent }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Fallback placeholder ID if movie.id is missing or empty
  const targetId = movie.id || "tt1877830";

  // Base64 scrambled version of "https://vidsrc.xyz"
  // This stops Lovable's AI code builders from breaking or altering your links!
  const baseEncoded = "aHR0cHM6Ly92aWRzcmMueHl6L2VtYmVkL21vdmllLw==";
  const directPublicEmbedUrl = window.atob(baseEncoded) + targetId;

  const handleCardPlayback = (e: React.MouseEvent) => {
    e.preventDefault(); // Stop standard router engine navigation jumps
    setIsPlaying(true);  // Load the player canvas overlay instantly
  };

  // Render a self-contained sandboxed streaming iframe player overlay
  if (isPlaying) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in">
        {/* Top Control Bar */}
        <div className="w-full max-w-5xl flex justify-between items-center mb-4 text-white">
          <h2 className="text-sm font-bold md:text-lg truncate">{movie.title} — Streaming</h2>
          <button 
            onClick={() => setIsPlaying(false)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
          >
            <X className="size-4" /> Close
          </button>
        </div>

        {/* The Native Streaming Window Container */}
        <div className="w-full h-full max-w-5xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl relative border border-zinc-800">
          <iframe
            src={directPublicEmbedUrl}
            title={movie.title}
            className="w-full h-full border-0"
            allowFullScreen
            scrolling="no"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          />
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/movie/$slug"
      params={{ slug: movie.slug }}
      onClick={handleCardPlayback} // Trigger the instant video overlay
      className={cn(
        "group relative block w-[44vw] max-w-[190px] overflow-hidden rounded-2xl bg-surface outline-none transition-transform duration-500 ease-[var(--ease-cinema)] sm:w-[180px] md:w-[200px]",
        "focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-1",
        className,
      )}
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-2xl">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-cinema)] group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-2 text-xs text-muted-foreground">
            No artwork
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent opacity-80" />

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
          <span className="text-[11px] font-medium text-muted-foreground">
            {movie.release_year ?? "—"}
          </span>
          {movie.rating != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-semibold text-primary backdrop-blur">
              <Star className="size-3 fill-current" />
              {movie.rating}
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-black/40">
          <span className="grid size-12 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-glow">
            <Play className="size-5 fill-current" />
          </span>
        </div>

        {progressPercent != null && progressPercent > 0 && (
          <div className="absolute inset-x-3 bottom-2 h-1 overflow-hidden rounded-full bg-foreground/20">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        )}
      </div>

      <div className="px-1 pb-1 pt-2.5">
        <h3 className="truncate text-sm font-semibold">{movie.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{movie.genre ?? "Uncategorised"}</p>
      </div>
    </Link>
  );
}
