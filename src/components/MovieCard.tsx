import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import type { Movie } from "@/types/movie";

interface MovieCardProps {
  movie: Movie;
  className?: string;
  index?: number;
}

export function MovieCard({ movie, className }: MovieCardProps) {
  return (
    <Link
      to="/watch/$slug"
      params={{ slug: movie.id.toString() }}
      search={{
        tmdbId: movie.id,
        title: movie.title || movie.name || "Unknown Title",
        type: "movie",
      }}
      className={`relative group overflow-hidden rounded-lg ${className || ""}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-neutral-900">
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title || movie.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-neutral-400">
            No poster
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </div>
      </div>

      <div className="mt-2">
        <h3 className="truncate text-sm font-semibold text-white">
          {movie.title || movie.name}
        </h3>
        <p className="text-xs text-neutral-400">
          {movie.release_date?.slice(0, 4) || movie.first_air_date?.slice(0, 4) || ""}
        </p>
      </div>
    </Link>
  );
}
