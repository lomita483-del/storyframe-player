import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { publishedMoviesQuery, watchHistoryQuery, type Movie } from "@/lib/movies";
import { autoSyncCatalogue } from "@/lib/tmdb.functions";
import { useAuth } from "@/hooks/useAuth";
import { Hero } from "@/components/Hero";
import { MovieRow } from "@/components/MovieRow";
import { MovieCard } from "@/components/MovieCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Stream Movies & TV Shows in Cinematic Quality" },
      {
        name: "description",
        content:
          "Browse an automatically updated catalogue of movies, TV shows and series on Lumen — trending, latest and top rated, with seasons, episodes and where to watch.",
      },
      { property: "og:title", content: "Lumen — Stream Movies & TV Shows in Cinematic Quality" },
      {
        property: "og:description",
        content:
          "An always-fresh catalogue of movies and TV series: browse, search, track episodes and watch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

/** Keeps the catalogue up to date automatically on first visit of the day. */
function useAutoSync(hasTitles: boolean, ready: boolean) {
  const sync = useServerFn(autoSyncCatalogue);
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    if (!hasTitles) setSyncing(true);
    void sync()
      .then((result) => {
        if (result && (result.inserted > 0 || result.updated > 0)) {
          void queryClient.invalidateQueries({ queryKey: ["movies"] });
        }
      })
      .finally(() => setSyncing(false));
  }, [ready, hasTitles, sync, queryClient]);

  return syncing;
}

function Home() {
  const { user } = useAuth();
  const { data: movies, isLoading } = useQuery(publishedMoviesQuery());
  const { data: history } = useQuery(watchHistoryQuery(user?.id));
  const list = movies ?? [];
  const syncing = useAutoSync(list.length > 0, !isLoading);

  if (isLoading || (syncing && !list.length)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />
          {syncing && (
            <p className="mt-4 text-sm text-muted-foreground">
              Loading movies and TV shows…
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!list.length) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-bold">Catalogue is empty</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The automatic import could not reach the metadata provider. Check that the catalogue key is
          valid, or add a title manually.
        </p>
        <Link
          to="/admin"
          className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Open admin dashboard
        </Link>
      </main>
    );
  }

  const featured = list.find((m) => m.is_featured) ?? list[0]!;
  const films = list.filter((m) => m.media_type !== "tv");
  const shows = list.filter((m) => m.media_type === "tv");
  const trending = list.filter((m) => m.is_trending);
  const latest = [...list].sort(
    (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0),
  );
  const popular = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const continueWatching = (history ?? [])
    .filter((row) => row.movies && !row.completed && row.progress_seconds > 20)
    .map((row) => row.movies!)
    .filter((m) => m.is_published);

  const progressById: Record<string, number> = {};
  for (const row of history ?? []) {
    if (row.duration_seconds) {
      progressById[row.movie_id] = (row.progress_seconds / row.duration_seconds) * 100;
    }
  }

  const genres = [...new Set(list.map((m) => m.genre).filter(Boolean))] as string[];
  const byGenre = (genre: string) => list.filter((m) => m.genre === genre);

  return (
    <main className="pb-24">
      <Hero movie={featured} />

      <div className="mt-2 space-y-10 md:mt-6 md:space-y-14">
        {continueWatching.length > 0 && (
          <MovieRow
            title="Continue watching"
            subtitle="Pick up where you left off"
            movies={continueWatching}
            progressById={progressById}
          />
        )}
        {list.filter((m) => m.video_url || m.embed_url).length > 0 && (
          <MovieRow
            title="Playable now"
            subtitle="Titles with a licensed stream or authorized embed"
            movies={list.filter((m) => m.video_url || m.embed_url)}
          />
        )}
        <MovieRow title="Trending now" subtitle="What people are watching" movies={trending} />
        <MovieRow title="TV shows & series" subtitle="Binge by season" movies={shows} />
        <MovieRow title="Movies" subtitle="Feature films" movies={films} />
        <MovieRow title="Latest releases" movies={latest} />
        <MovieRow title="Top rated on Lumen" subtitle="Highest rated titles" movies={popular} />

        {genres.map((genre) => (
          <MovieRow key={genre} title={genre} movies={byGenre(genre)} />
        ))}

        <AllTitles movies={list} />
      </div>
    </main>
  );
}

function AllTitles({ movies }: { movies: Movie[] }) {
  return (
    <section className="px-4 md:px-8">
      <h2 className="mb-4 text-lg font-semibold md:text-xl">All titles</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} className="w-full max-w-none" />
        ))}
      </div>
    </section>
  );
}
