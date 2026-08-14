import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { adminMovieByIdQuery } from "@/lib/movies";
import { MovieForm } from "@/components/MovieForm";

export const Route = createFileRoute("/_authenticated/admin/$id")({
  component: EditMovie,
});

function EditMovie() {
  const { id } = Route.useParams();
  const { data: movie, isLoading } = useQuery(adminMovieByIdQuery(id));

  if (isLoading) {
    return (
      <div className="grid min-h-[50svh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!movie) {
    return (
      <main className="py-20 text-center text-sm text-muted-foreground">
        This movie no longer exists.
      </main>
    );
  }

  return (
    <main className="pb-24">
      <h1 className="text-xl font-semibold md:text-2xl">Edit “{movie.title}”</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update metadata, artwork, streaming source and publishing state.
      </p>
      <div className="mt-6">
        <MovieForm movie={movie} />
      </div>
    </main>
  );
}
