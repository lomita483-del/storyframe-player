import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { publishedMoviesQuery, searchMoviesQuery, type Movie } from "@/lib/movies";
import { MovieCard } from "@/components/MovieCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Browse & Search Films — Lumen" },
      {
        name: "description",
        content:
          "Search the Lumen catalogue by title, genre, release year, director or cast, and filter by category.",
      },
      { property: "og:title", content: "Browse & Search Films — Lumen" },
      {
        property: "og:description",
        content: "Search by title, genre, year or cast across the Lumen catalogue.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [genre, setGenre] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setTerm(input), 220);
    return () => clearTimeout(id);
  }, [input]);

  const { data: all, isLoading: loadingAll } = useQuery(publishedMoviesQuery());
  const { data: results, isFetching } = useQuery({
    ...searchMoviesQuery(term),
    enabled: term.trim().length > 0,
  });

  const genres = useMemo(
    () => [...new Set((all ?? []).map((m) => m.genre).filter(Boolean))] as string[],
    [all],
  );

  let list: Movie[] = term.trim() ? (results ?? []) : (all ?? []);
  if (genre) list = list.filter((m) => m.genre === genre);

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-24 md:px-8 md:pt-32">
      <h1 className="text-2xl font-bold md:text-4xl">Browse the catalogue</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Search by title, genre, year, director or cast.
      </p>

      <div className="glass sticky top-16 z-30 mt-6 flex items-center gap-2 rounded-2xl px-3 py-2 md:top-20">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
        <Input
          autoFocus
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Try “thriller”, “2024”, “Elena Duarte”…"
          className="border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
        />
        {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {input && (
          <button
            aria-label="Clear search"
            onClick={() => setInput("")}
            className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {genres.length > 0 && (
        <div className="row-scroll mt-4">
          <Chip active={!genre} onClick={() => setGenre(null)}>
            All
          </Chip>
          {genres.map((g) => (
            <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>
              {g}
            </Chip>
          ))}
        </div>
      )}

      {loadingAll ? (
        <div className="grid min-h-[40svh] place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : list.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {list.map((movie) => (
            <MovieCard key={movie.id} movie={movie} className="w-full max-w-none" />
          ))}
        </div>
      ) : (
        <p className="mt-16 text-center text-sm text-muted-foreground">
          No titles matched your search.
        </p>
      )}
    </main>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-surface-2 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
