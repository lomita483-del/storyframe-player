import { createFileRoute } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminMovieByIdQuery } from "@/lib/movies";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { updateMovieMedia } from "@/lib/admin_movie.functions";

export const Route = createFileRoute("/admin/media")({ component: MediaAdmin });

function MediaAdmin() {
  const search = useSearch();
  const movieId = (search as any).movieId as string | undefined;
  const { data: movie } = useQuery(movieId ? adminMovieByIdQuery(movieId) : adminMovieByIdQuery("") );
  const [videoUrl, setVideoUrl] = useState(movie?.video_url ?? "");
  const [embedUrl, setEmbedUrl] = useState(movie?.embed_url ?? "");
  const [subtitleUrl, setSubtitleUrl] = useState(movie?.subtitle_url ?? "");
  const [trailerUrl, setTrailerUrl] = useState(movie?.trailer_url ?? "");
  const save = useServerFn(updateMovieMedia);

  useEffect(() => {
    setVideoUrl(movie?.video_url ?? "");
    setEmbedUrl(movie?.embed_url ?? "");
    setSubtitleUrl(movie?.subtitle_url ?? "");
    setTrailerUrl(movie?.trailer_url ?? "");
  }, [movie]);

  async function handleSave() {
    if (!movieId) return;
    await save.mutate({ movieId, video_url: videoUrl || null, embed_url: embedUrl || null, subtitle_url: subtitleUrl || null, trailer_url: trailerUrl || null });
    // Optionally refetch movie - adminMovieByIdQuery is cached by id key; we will rely on automatic invalidation by server fn, but refetch client-side
    window.location.reload();
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Media Library</h1>
      {!movieId && <p className="mt-2 text-sm text-muted-foreground">Select a movie from the admin movies list and click "Edit media"</p>}
      {movieId && (
        <div className="mt-6">
          <div className="mb-3 font-semibold">{movie?.title}</div>
          <label className="block text-sm font-medium">Video URL</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />

          <label className="block text-sm font-medium mt-4">Embed URL</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} />

          <label className="block text-sm font-medium mt-4">Subtitle URL</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={subtitleUrl} onChange={(e) => setSubtitleUrl(e.target.value)} />

          <label className="block text-sm font-medium mt-4">Trailer URL</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} />

          <div className="mt-4 flex gap-2">
            <Button onClick={handleSave} disabled={save.isLoading}>Save</Button>
          </div>
        </div>
      )}
    </main>
  );
}
