import type { Movie } from "@/lib/movies";
import { MovieCard } from "./MovieCard";

type Props = {
  title: string;
  subtitle?: string;
  movies: Movie[];
  progressById?: Record<string, number>;
};

export function MovieRow({ title, subtitle, movies, progressById }: Props) {
  if (!movies.length) return null;
  return (
    <section className="animate-rise">
      <div className="mb-3 flex items-end justify-between gap-4 px-4 md:px-8">
        <div>
          <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground md:text-sm">{subtitle}</p>}
        </div>
      </div>
      <div className="row-scroll px-4 md:px-8">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            progressPercent={progressById?.[movie.id]}
          />
        ))}
      </div>
    </section>
  );
}
