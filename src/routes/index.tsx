import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { publishedMoviesQuery, watchHistoryQuery, type Movie } from "@/lib/movies";
import { useAuth } from "@/hooks/useAuth";
import { Hero } from "@/components/Hero";
import { MovieRow } from "@/components/MovieRow";
import { MovieCard } from "@/components/MovieCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Stream Licensed Films in Cinematic Quality" },
      {
        name: "description",
        content:
          "Browse trending, latest and popular titles on Lumen, then watch instantly in a premium built-in player with resume, subtitles and quality control.",
      },
      { property: "og:title", content: "Lumen — Stream Licensed Films in Cinematic Quality" },
      {
        property: "og:description",
        content: "A premium cinematic streaming experience: browse, search and watch licensed films.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const { data: movies, isLoading } = useQuery(publishedMoviesQuery());
  const { data: history } = useQuery(watchHistoryQuery(user?.id));

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  const list = movies ?? [];
  if (!list.length) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-bold">No titles published yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Once an administrator publishes a movie it will appear here instantly.
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
        <MovieRow title="Trending now" subtitle="What people are watching" movies={trending} />
        <MovieRow title="Latest releases" movies={latest} />
        <MovieRow title="Popular on Lumen" subtitle="Highest rated titles" movies={popular} />

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
