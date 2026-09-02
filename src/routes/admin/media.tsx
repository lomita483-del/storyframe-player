import { createFileRoute } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminMovieByIdQuery } from "@/lib/movies";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/admin/media")({ component: MediaAdmin });

function MediaAdmin() {
  const search = useSearch();
  const movieId = (search as any).movieId as string | undefined;
  const { data: movie } = useQuery(movieId ? adminMovieByIdQuery(movieId) : adminMovieByIdQuery("") );
  const [videoUrl, setVideoUrl] = useState(movie?.video_url ?? "");

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Media Library</h1>
      {!movieId && <p className="mt-2 text-sm text-muted-foreground">Select a movie from the admin movies list and click "Edit media"</p>}
      {movieId && (
        <div className="mt-6">
          <div className="mb-3 font-semibold">{movie?.title}</div>
          <label className="block text-sm font-medium">Video URL</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          <div className="mt-4 flex gap-2">
            <Button>Save</Button>
          </div>
        </div>
      )}
    </main>
  );
}
