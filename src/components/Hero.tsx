import { Link } from "@tanstack/react-router";
import { Play, Info, Star } from "lucide-react";
import type { Movie } from "@/lib/movies";
import { formatRuntime } from "@/lib/movies";
import { Button } from "@/components/ui/button";
import { WatchlistButton } from "./WatchlistButton";

export function Hero({ movie }: { movie: Movie }) {
  return (
    <section className="relative min-h-[78svh] w-full overflow-hidden md:min-h-[86svh]">
      {movie.backdrop_url && (
        <img
          src={movie.backdrop_url}
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />

      <div className="relative mx-auto flex min-h-[78svh] max-w-[1600px] flex-col justify-end gap-5 px-4 pb-12 pt-28 md:min-h-[86svh] md:px-8 md:pb-20">
        <div className="flex items-end gap-5">
          {movie.poster_url && (
            <img
              src={movie.poster_url}
              alt={`${movie.title} poster`}
              width={720}
              height={1080}
              className="hidden w-[168px] rounded-2xl shadow-poster ring-1 ring-border sm:block"
            />
          )}

          <div className="max-w-2xl animate-rise">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:text-sm">
              <span className="rounded-full bg-primary/15 px-2.5 py-1 font-semibold text-primary">
                Featured
              </span>
              {movie.genre && <span>{movie.genre}</span>}
              {movie.release_year && <span>· {movie.release_year}</span>}
              {formatRuntime(movie.runtime) && <span>· {formatRuntime(movie.runtime)}</span>}
              {movie.quality && (
                <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold">
                  {movie.quality}
                </span>
              )}
              {movie.rating != null && (
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <Star className="size-3.5 fill-current" />
                  {movie.rating}
                </span>
              )}
            </div>

            <h1 className="text-4xl font-bold leading-[1.05] md:text-6xl">{movie.title}</h1>

            {movie.description && (
              <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {movie.description}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to="/watch/$slug" params={{ slug: movie.slug }}>
                  <Play className="size-4 fill-current" /> Watch Now
                </Link>
              </Button>
              <WatchlistButton movieId={movie.id} />
              <Button asChild variant="ghost" size="lg" className="rounded-full">
                <Link to="/movie/$slug" params={{ slug: movie.slug }}>
                  <Info className="size-4" /> Details
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
