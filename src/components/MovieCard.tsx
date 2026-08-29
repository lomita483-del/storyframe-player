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

  // Fallback to internal ID if tmdb_id isn't defined
  const tmdbId = movie.tmdb_id ? String(movie.tmdb_id) : (movie.id || "");

  // Build the precise 2Embed stream iframe URL from the API spec
  const isTv = movie.media_type === "tv";
  const streamUrl = isTv
    ? `https://www.2embed.cc/embedtv/${tmdbId}?s=1&e=1`
    : `https://www.2embed.cc/embed/${tmdbId}`;

  const handleCardPlayback = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!tmdbId) return;
    setIsPlaying(true);
  };

  return (
    <>
      <Link
        to="/movie/$slug"
        params={{ slug: movie.slug }}
        onClick={handleCardPlayback}
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
          <p className="truncate text-xs text-muted-foreground">{movie.genre ?? "Movie"}</p>
        </div>
      </Link>

      {/* In-App Stream Player Modal */}
      {isPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl">
            <button
              onClick={() => setIsPlaying(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black"
            >
              <X className="size-6" />
            </button>
            <div className="relative aspect-video w-full">
              <iframe
                src={streamUrl}
                title={movie.title}
                className="h-full w-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
