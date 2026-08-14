import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { movieBySlugQuery, saveProgress, formatRuntime } from "@/lib/movies";
import { useAuth } from "@/hooks/useAuth";
import { archiveEmbedSrc, embedSrc } from "@/lib/media";
import { episodesQuery, seasonsQuery } from "@/lib/tv";
import { z } from "zod";
import { VideoPlayer } from "@/components/VideoPlayer";
import { WatchlistButton } from "@/components/WatchlistButton";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  s: z.coerce.number().int().positive().optional(),
  e: z.coerce.number().int().positive().optional(),
});

export const Route = createFileRoute("/watch/$slug")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
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
  const { s: seasonParam, e: episodeParam } = Route.useSearch();
  const { user } = useAuth();
  const { data: movie, isLoading } = useQuery(movieBySlugQuery(slug));
  const isShow = movie?.media_type === "tv";
  const { data: seasons } = useQuery(seasonsQuery(isShow ? movie?.id : undefined));
  const seasonNumber = seasonParam ?? seasons?.[0]?.season_number;
  const { data: episodes } = useQuery(
    episodesQuery(isShow ? movie?.id : undefined, seasonNumber),
  );
  const episode =
    (episodes ?? []).find((row) => row.episode_number === (episodeParam ?? 1)) ?? null;

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

  const providerEmbed = episode
    ? embedSrc(episode.embed_provider, episode.embed_url) ??
      embedSrc(movie.embed_provider, movie.embed_url)
    : embedSrc(movie.embed_provider, movie.embed_url);
  const videoSrc = episode?.video_url ?? movie.video_url;
  const embed = providerEmbed ?? archiveEmbedSrc(videoSrc);
  const videoType = episode?.video_url ? episode.video_type : movie.video_type;
  const subtitleUrl = episode?.subtitle_url ?? movie.subtitle_url;
  const heading = episode
    ? `${movie.title} — S${episode.season_number}E${episode.episode_number}`
    : movie.title;

  return (
    <main className="min-h-screen bg-black pb-16">
      <div className="mx-auto max-w-[1400px] px-3 pt-4 md:px-6 md:pt-6">
        <Button asChild variant="ghost" size="sm" className="mb-3 rounded-full">
          <Link to="/movie/$slug" params={{ slug: movie.slug }}>
            <ArrowLeft className="size-4" /> Back to details
          </Link>
        </Button>

        {embed ? (
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black md:rounded-3xl">
            <iframe
              src={embed}
              title={`${movie.title} player`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full border-0"
            />
          </div>
        ) : videoSrc ? (
          <VideoPlayer
            src={videoSrc}
            type={videoType}
            title={heading}
            poster={episode?.still_url ?? movie.backdrop_url ?? undefined}
            subtitleUrl={subtitleUrl ?? undefined}
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
              {movie.where_to_watch.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {movie.where_to_watch.map((link) => (
                    <a
                      key={`${link.name}-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-2"
                    >
                      Watch on {link.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{heading}</h1>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              {episode?.name ? `${episode.name} · ${meta}` : meta}
            </p>
            {(episode?.overview || movie.description) && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {episode?.overview || movie.description}
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

        {isShow && (episodes ?? []).length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Season {seasonNumber} episodes
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(episodes ?? []).map((row) => (
                <li key={row.id}>
                  <Link
                    to="/watch/$slug"
                    params={{ slug: movie.slug }}
                    search={{ s: row.season_number, e: row.episode_number }}
                    className={
                      "block rounded-xl border p-3 text-sm transition-colors " +
                      (row.id === episode?.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface/60 hover:bg-surface-2")
                    }
                  >
                    <span className="font-semibold">
                      E{row.episode_number}. {row.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
