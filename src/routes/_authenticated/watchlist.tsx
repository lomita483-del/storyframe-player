import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { watchlistQuery, watchHistoryQuery } from "@/lib/movies";
import { useAuth } from "@/hooks/useAuth";
import { MovieCard } from "@/components/MovieCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({
    meta: [
      { title: "My List — Lumen" },
      {
        name: "description",
        content: "Your saved titles and viewing history on Lumen, ready to resume any time.",
      },
      { property: "og:title", content: "My List — Lumen" },
      { property: "og:description", content: "Saved titles and viewing history on Lumen." },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { user } = useAuth();
  const { data: saved, isLoading } = useQuery(watchlistQuery(user?.id));
  const { data: history } = useQuery(watchHistoryQuery(user?.id));

  const savedMovies = (saved ?? []).map((row) => row.movies).filter(Boolean);
  const watched = (history ?? []).filter((row) => row.movies);

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-24 md:px-8 md:pt-32">
      <h1 className="text-2xl font-bold md:text-4xl">My list</h1>
      <p className="mt-2 text-sm text-muted-foreground">Saved titles and what you've been watching.</p>

      {isLoading ? (
        <div className="grid min-h-[30svh] place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : savedMovies.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {savedMovies.map((movie) => (
            <MovieCard key={movie!.id} movie={movie!} className="w-full max-w-none" />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-border bg-surface/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">Your list is empty.</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/search">Browse titles</Link>
          </Button>
        </div>
      )}

      {watched.length > 0 && (
        <section className="mt-16">
          <h2 className="text-lg font-semibold md:text-xl">Viewing history</h2>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
            {watched.map((row) => {
              const percent = row.duration_seconds
                ? Math.min(100, Math.round((row.progress_seconds / row.duration_seconds) * 100))
                : 0;
              return (
                <li key={row.id} className="flex items-center gap-4 p-4">
                  {row.movies?.poster_url && (
                    <img
                      src={row.movies.poster_url}
                      alt=""
                      loading="lazy"
                      className="h-16 w-11 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.movies?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.completed ? "Finished" : `${percent}% watched`}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10">
                      <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  {row.movies && (
                    <Button asChild size="sm" variant="secondary" className="rounded-full">
                      <Link to="/watch/$slug" params={{ slug: row.movies.slug }}>
                        {row.completed ? "Watch again" : "Resume"}
                      </Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
