import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { movieBySlugQuery, saveProgress, formatRuntime } from "@/lib/movies";
import { useAuth } from "@/hooks/useAuth";
import { VideoPlayer } from "@/components/VideoPlayer";
import { WatchlistButton } from "@/components/WatchlistButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/watch/$slug")({
  head: ({ params }) => {
    const pretty = params.slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `Watching ${pretty} — Lumen` },
        {
          name: "description",
          content: `Stream ${pretty} on Lumen with resume, subtitles, quality selection and picture-in-picture.`,
        },
        { property: "og:title", content: `Watching ${pretty} — Lumen` },
        { property: "og:description", content: `Stream ${pretty} on Lumen.` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: WatchPage,
});

function WatchPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { data: movie, isLoading } = useQuery(movieBySlugQuery(slug));

  const { data: resume } = useQuery({
    queryKey: ["resume", user?.id ?? "anon", movie?.id ?? "none"],
    enabled: Boolean(user?.id && movie?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_history")
        .select("progress_seconds")
        .eq("movie_id", movie!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.progress_seconds ?? 0;
    },
  });

  const movieId = movie?.id;
  const userId = user?.id;

  const onProgress = useCallback(
    (seconds: number, duration: number) => {
      if (!userId || !movieId) return;
      void saveProgress({
        userId,
        movieId,
        progressSeconds: seconds,
        durationSeconds: duration || null,
      }).catch(() => undefined);
    },
    [userId, movieId],
  );

  const meta = useMemo(() => {
    if (!movie) return "";
    return [movie.genre, movie.release_year, formatRuntime(movie.runtime), movie.quality]
      .filter(Boolean)
      .join(" · ");
  }, [movie]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!movie) throw notFound();

  return (
    <main className="min-h-screen bg-black pb-16">
      <div className="mx-auto max-w-[1400px] px-3 pt-4 md:px-6 md:pt-6">
        <Button asChild variant="ghost" size="sm" className="mb-3 rounded-full">
          <Link to="/movie/$slug" params={{ slug: movie.slug }}>
            <ArrowLeft className="size-4" /> Back to details
          </Link>
        </Button>

        {movie.video_url ? (
          <VideoPlayer
            src={movie.video_url}
            type={movie.video_type}
            title={movie.title}
            poster={movie.backdrop_url ?? undefined}
            subtitleUrl={movie.subtitle_url ?? undefined}
            startAt={resume ?? 0}
            onProgress={user ? onProgress : undefined}
          />
        ) : (
          <div className="grid aspect-video w-full place-items-center rounded-2xl border border-border bg-surface text-center">
            <div className="px-6">
              <p className="text-sm font-semibold">No authorized video source</p>
              <p className="mt-1 text-xs text-muted-foreground">
                An administrator has not added a licensed streaming URL for this title yet.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{movie.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">{meta}</p>
            {movie.description && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {movie.description}
              </p>
            )}
            {!user && (
              <p className="mt-4 text-xs text-muted-foreground">
                <Link to="/auth" className="font-semibold text-primary">
                  Sign in
                </Link>{" "}
                to save your playback position and resume later.
              </p>
            )}
          </div>
          <WatchlistButton movieId={movie.id} />
        </div>
      </div>
    </main>
  );
}
