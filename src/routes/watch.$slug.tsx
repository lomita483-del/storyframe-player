import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { movieBySlugQuery } from "@/lib/movies";
import { Loader2 } from "lucide-react";
import { embedSrc } from "@/lib/media";

export const Route = createFileRoute("/watch/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({
    s: Number(search.s) || undefined,
    e: Number(search.e) || undefined,
  }),
  component: WatchPage,
});

function WatchPage() {
  const { slug } = Route.useParams();
  const { s: season, e: episode } = Route.useSearch();
  const { data: movie, isLoading } = useQuery(movieBySlugQuery(slug));

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!movie) throw notFound();

  // Check if embed_url exists and is NOT a YouTube link
  const customEmbed = embedSrc(movie.embed_provider, movie.embed_url);

  // Construct standard 2Embed fallback URL using TMDB ID
  const isShow = movie.media_type === "tv";
  const defaultEmbed = isShow
    ? `https://www.2embed.cc/embedtv/${movie.tmdb_id}&s=${season ?? 1}&e=${episode ?? 1}`
    : `https://www.2embed.cc/embed/${movie.tmdb_id}`;

  const finalStreamUrl = customEmbed || defaultEmbed;

  return (
    <main className="h-screen w-screen bg-black">
      <iframe
        src={finalStreamUrl}
        className="h-full w-full border-0"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
      />
    </main>
  );
}
