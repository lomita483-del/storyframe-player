import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Play, Film, Loader2, Star, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { movieBySlugQuery, publishedMoviesQuery, formatRuntime } from "@/lib/movies";
import { Button } from "@/components/ui/button";
import { WatchlistButton } from "@/components/WatchlistButton";
import { MovieRow } from "@/components/MovieRow";
import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/movie/$slug")({
  head: ({ params }) => {
    const pretty = params.slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${pretty} — Watch on Lumen` },
        {
          name: "description",
          content: `Cast, runtime, rating and streaming details for ${pretty}. Watch it now on Lumen.`,
        },
        { property: "og:title", content: `${pretty} — Watch on Lumen` },
        {
          property: "og:description",
          content: `Cast, runtime, rating and streaming details for ${pretty}.`,
        },
      ],
    };
  },
  component: MovieDetails,
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Title unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This movie is not published or no longer exists.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </main>
  ),
});

function MovieDetails() {
  const { slug } = Route.useParams();
  const { data: movie, isLoading } = useQuery(movieBySlugQuery(slug));
  const { data: all } = useQuery(publishedMoviesQuery());
  const [trailerOpen, setTrailerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!movie) throw notFound();

  const related = (all ?? [])
    .filter((m) => m.id !== movie.id && (m.genre === movie.genre || true))
    .slice(0, 12);

  return (
    <main className="pb-24">
      <section className="relative">
        <div className="relative h-[52svh] w-full overflow-hidden md:h-[62svh]">
          {movie.backdrop_url && (
            <img
              src={movie.backdrop_url}
              alt=""
              width={1920}
              height={1080}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        </div>

        <div className="mx-auto -mt-28 max-w-[1400px] px-4 md:-mt-40 md:px-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-4 rounded-full text-muted-foreground"
          >
            <Link to="/">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>

          <div className="flex flex-col gap-6 md:flex-row md:gap-9">
            {movie.poster_url && (
              <img
                src={movie.poster_url}
                alt={`${movie.title} poster`}
                width={720}
                height={1080}
                className="w-[150px] shrink-0 rounded-2xl shadow-poster ring-1 ring-border md:w-[240px]"
              />
            )}

            <div className="min-w-0 flex-1 animate-rise">
              <h1 className="text-3xl font-bold md:text-5xl">{movie.title}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground md:text-sm">
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
                    <Star className="size-3.5 fill-current" /> {movie.rating}
                  </span>
                )}
                {!movie.is_published && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase">
                    Draft
                  </span>
                )}
              </div>

              {movie.description && (
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
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
                {movie.trailer_url && (
                  <Button
                    variant="ghost"
                    size="lg"
                    className="rounded-full"
                    onClick={() => setTrailerOpen(true)}
                  >
                    <Film className="size-4" /> Trailer
                  </Button>
                )}
              </div>

              {movie.where_to_watch.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Where to watch
                  </h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {movie.where_to_watch.map((link) => (
                      <li key={link.url}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-surface-2"
                        >
                          {link.name}
                          <ExternalLink className="size-3.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="mt-9 grid gap-5 rounded-2xl border border-border bg-surface/60 p-5 sm:grid-cols-2">
                <Detail label="Director" value={movie.director ?? "—"} />
                <Detail
                  label="Cast"
                  value={movie.cast?.length ? movie.cast.join(", ") : "—"}
                />
                <Detail label="Genre" value={movie.genre ?? "—"} />
                <Detail
                  label="Runtime"
                  value={formatRuntime(movie.runtime) ?? "—"}
                />
              </dl>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-14">
        <MovieRow title="More like this" movies={related} />
      </div>

      <Dialog open={trailerOpen} onOpenChange={setTrailerOpen}>
        <DialogContent className="max-w-3xl border-border bg-background p-0">
          <DialogTitle className="px-5 pt-5 text-base">{movie.title} — trailer</DialogTitle>
          {movie.trailer_url && (
            <video
              src={movie.trailer_url}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full rounded-b-2xl bg-black"
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
