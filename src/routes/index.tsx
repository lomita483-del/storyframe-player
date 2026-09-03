import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Loader2, CalendarDays } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { publishedMoviesQuery, watchHistoryQuery, type Movie } from "@/lib/movies";
import { autoSyncCatalogue } from "@/lib/tmdb.functions";
import { topRatedByViewersQuery } from "@/lib/ratings";
import { useAuth } from "@/hooks/useAuth";
import { AdBanner } from "@/components/AdBanner";
import { Hero } from "@/components/Hero";
import { MovieRow } from "@/components/MovieRow";
import { MovieCard } from "@/components/MovieCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Stream Movies, TV Shows, Anime & Cartoons" },
      {
        name: "description",
        content:
          "Browse an automatically updated catalogue of movies, TV shows, series, anime and cartoons on Lumen — trending today, upcoming release dates, top rated by viewers and more.",
      },
      { property: "og:title", content: "Lumen — Stream Movies, TV Shows, Anime & Cartoons" },
      {
        property: "og:description",
        content:
          "An always-fresh catalogue: trending today, upcoming release dates, viewer ratings, seasons and episodes.",
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
  const { data: viewerRated } = useQuery(topRatedByViewersQuery());
  const list = movies ?? [];
  const syncing = useAutoSync(list.length > 0, !isLoading);

  if (isLoading || (syncing && !list.length)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />
          {syncing && (
            <p className="mt-4 text-sm text-muted-foreground">
              Loading movies, TV shows, anime and cartoons…
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

  const today = new Date().toISOString().slice(0, 10);
  const dateOf = (m: Movie) => m.release_date ?? m.first_air_date ?? null;

  const released = list.filter((m) => !dateOf(m) || dateOf(m)! <= today);
  const upcoming = list
    .filter((m) => dateOf(m) && dateOf(m)! > today)
    .sort((a, b) => (dateOf(a)! < dateOf(b)! ? -1 : 1));

  const featured = released.find((m) => m.is_featured) ?? released[0] ?? list[0]!;
  const kind = (m: Movie, value: string) => (m.content_kind ?? "") === value;

  const films = released.filter((m) => m.media_type !== "tv" && !kind(m, "anime") && !kind(m, "cartoon"));
  const shows = released.filter((m) => m.media_type === "tv" && !kind(m, "anime") && !kind(m, "cartoon"));
  const anime = released.filter((m) => kind(m, "anime"));
  const cartoons = released.filter((m) => kind(m, "cartoon"));
  const trending = list.filter((m) => m.is_trending);
  const latest = [...released].sort((a, b) => (dateOf(b) ?? "").localeCompare(dateOf(a) ?? ""));
  const popular = [...released].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const ratedIds = new Set((viewerRated ?? []).map((row) => row.movie_id));
  const mostRated = (viewerRated ?? [])
    .map((row) => list.find((m) => m.id === row.movie_id))
    .filter((m): m is Movie => Boolean(m));

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

  const genres = [...new Set(released.map((m) => m.genre).filter(Boolean))] as string[];
  const byGenre = (genre: string) => released.filter((m) => m.genre === genre);

  return (
    <main className="pb-24">
      <Hero movie={featured} />
      <AdBanner className="px-4 md:px-8" />

      <div className="mt-2 space-y-10 md:mt-6 md:space-y-14">
        {continueWatching.length > 0 && (
          <MovieRow
            title="Continue watching"
            subtitle="Pick up where you left off"
            movies={continueWatching}
            progressById={progressById}
          />
        )}
        <MovieRow
          title="Trending now"
          subtitle="Refreshed daily from what people are watching today"
          movies={trending}
        />
        {mostRated.length > 0 && (
          <MovieRow
            title="Most rated by viewers"
            subtitle="Highest community scores on Lumen"
            movies={mostRated}
          />
        )}
        <UpcomingRow movies={upcoming} />
        {released.filter((m) => m.video_url || m.embed_url || m.direct_stream_url).length > 0 && (
          <MovieRow
            title="Playable now"
            subtitle="Titles with a licensed stream or authorized embed"
            movies={released.filter((m) => m.video_url || m.embed_url || m.direct_stream_url)}
          />
        )}
        <MovieRow title="TV shows & series" subtitle="Binge by season" movies={shows} />
        <MovieRow title="Movies" subtitle="Feature films" movies={films} />
        <MovieRow title="Anime" subtitle="Japanese animation, subbed classics and new seasons" movies={anime} />
        <MovieRow title="Cartoons & animation" subtitle="For all ages" movies={cartoons} />
        <MovieRow title="Latest releases" subtitle="Newest on the platform" movies={latest} />
        <MovieRow
          title="Top rated"
          subtitle="Highest critic scores"
          movies={popular.filter((m) => !ratedIds.has(m.id) || true)}
        />

        {genres.map((genre) => (
          <MovieRow key={genre} title={genre} movies={byGenre(genre)} />
        ))}

        <AllTitles movies={list} />
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function UpcomingRow({ movies }: { movies: Movie[] }) {
  if (!movies.length) return null;
  return (
    <section className="animate-rise">
      <div className="mb-3 px-4 md:px-8">
        <h2 className="text-lg font-semibold md:text-xl">Coming soon</h2>
        <p className="text-xs text-muted-foreground md:text-sm">
          Upcoming movies, series, TV shows, cartoons and anime with their release dates
        </p>
      </div>
      <div className="row-scroll px-4 md:px-8">
        {movies.slice(0, 30).map((movie) => {
          const date = movie.release_date ?? movie.first_air_date;
          return (
            <div key={movie.id} className="w-[150px] shrink-0 md:w-[176px]">
              <MovieCard movie={movie} className="w-full max-w-none" />
              {date && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                  <CalendarDays className="size-3" /> {formatDate(date)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
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
