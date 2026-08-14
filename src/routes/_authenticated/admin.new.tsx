import { createFileRoute } from "@tanstack/react-router";
import { MovieForm } from "@/components/MovieForm";

export const Route = createFileRoute("/_authenticated/admin/new")({
  component: AddMovie,
});

function AddMovie() {
  return (
    <main className="pb-24">
      <h1 className="text-xl font-semibold md:text-2xl">Add movie</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Movie metadata is stored here; the video itself stays on your authorized video host.
      </p>
      <div className="mt-6">
        <MovieForm />
      </div>
    </main>
  );
}
