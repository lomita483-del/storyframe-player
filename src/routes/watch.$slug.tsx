import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, ExternalLink, Loader2, PlayCircle } from "lucide-react";
import { movieBySlugQuery, saveProgress, formatRuntime } from "@/lib/movies";
import { seasonsQuery, episodesQuery } from "@/lib/tv";
import { useAuth } from "@/hooks/useAuth";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AdBanner } from "@/components/AdBanner";
import { RatingWidget } from "@/components/RatingWidget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WatchSearch = { season?: number; episode?: number };

export const Route = createFileRoute("/watch/$slug")({
  validateSearch: (search: Record<string, unknown>): WatchSearch => {
    const season = Number(search['season']);
    const episode = Number(search['episode']);
    return {
      ...(Number.isFinite(season) && season > 0 ? { season } : {}),
      ...(Number.isFinite(episode) && episode > 0 ? { episode } : {}),
    };
  },
  head: ({ params }) => {
    const pretty = params.slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `Watch ${pretty} — Lumen` },
        {
          name: "description",
          content: `Stream ${pretty} on Lumen with quality switching, subtitles, playback speed and saved progress.`,
        },
        { property: "og:title", content: `Watch ${pretty} — Lumen` },
        {
          property: "og:description",
          content: `Stream ${pretty} on Lumen with saved progress and subtitles.`,
        },
        { property: "og:type", content: "video.other" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: WatchPage,
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center px-6 text-center" role="alert">
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Title unavailable</h1>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </main>
  ),
});

function youtubeEmbed(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function WatchPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: movie, isLoading } = useQuery(movieBySlugQuery(slug));

  const isShow = movie?.media_type === "tv";
  const { data: seasons } = useQuery(seasonsQuery(isShow ? movie?.id : undefined));
  const seasonNumber = search.season ?? seasons?.[0]?.season_number;
  const { data: episodes } = useQuery(
    episodesQuery(isShow ? movie?.id : undefined, seasonNumber),
  );
  const episode = useMemo(
    () =>
      (episodes ?? []).find((e) => e.episode_number === search.episode) ?? (episodes ?? [])[0],
    [episodes, search.episode],
  );

  const source = useMemo(() => {
    const direct = isShow
      ? (episode?.direct_stream_url ?? episode?.video_url ?? null)
      : (movie?.direct_stream_url ?? movie?.video_url ?? null);
    if (direct) {
      return {
        kind: "video" as const,
        src: direct,
        type: direct.includes(".m3u8") ? "hls" : (isShow ? episode?.video_type : movie?.video_type) ?? "mp4",
      };
    }
    const trailer =
      youtubeEmbed(movie?.trailer_url) ??
      (movie?.embed_provider === "youtube" ? youtubeEmbed(movie?.embed_url) : null);
    if (trailer) return { kind: "trailer" as const, src: trailer };
    return null;
  }, [isShow, episode, movie]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!movie) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Title unavailable</h1>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </main>
    );
  }

  const heading = isShow && episode
    ? `${movie.title} — S${episode.season_number}·E${episode.episode_number} ${episode.name ?? ""}`
    : movie.title;

  return (
    <main className="min-h-screen pb-24 pt-16 md:pt-20">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/movie/$slug" params={{ slug: movie.slug }}>
            <ArrowLeft className="size-4" /> Back to details
          </Link>
        </Button>

        <h1 className="mt-3 text-xl font-semibold md:text-2xl">{heading}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {[movie.genre, movie.release_year, formatRuntime(movie.runtime), movie.quality]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl bg-black">
          {source?.kind === "video" ? (
            <VideoPlayer
              src={source.src}
              type={source.type}
              title={heading}
              poster={movie.backdrop_url ?? movie.poster_url ?? undefined}
              subtitleUrl={(isShow ? episode?.subtitle_url : movie.subtitle_url) ?? undefined}
              onProgress={
                user
                  ? (seconds, duration) => {
                      void saveProgress({
                        userId: user.id,
                        movieId: movie.id,
                        progressSeconds: seconds,
                        durationSeconds: duration,
                      });
                    }
                  : undefined
              }
            />
          ) : source?.kind === "trailer" ? (
            <div className="aspect-video w-full">
              <iframe
                src={source.src}
                title={`${movie.title} trailer`}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="grid aspect-video w-full place-items-center px-6 text-center">
              <div>
                <PlayCircle className="mx-auto size-8 text-muted-foreground" />
                <h2 className="mt-3 text-lg font-semibold">Unable to play video</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  No authorized stream is configured for this title yet.
                </p>
              </div>
            </div>
          )}
        </div>

        <AdBanner className="mt-4" />

        {isShow && (seasons?.length ?? 0) > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap gap-2">
              {(seasons ?? []).map((season) => (
                <button
                  key={season.id}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/watch/$slug",
                      params: { slug: movie.slug },
                      search: { season: season.season_number },
                    })
                  }
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    season.season_number === seasonNumber
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 text-muted-foreground",
                  )}
                >
                  {season.name ?? `Season ${season.season_number}`}
                </button>
              ))}
            </div>

            <ul className="mt-4 space-y-2">
              {(episodes ?? []).map((ep) => (
                <li key={ep.id}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/watch/$slug",
                        params: { slug: movie.slug },
                        search: { season: ep.season_number, episode: ep.episode_number },
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left",
                      ep.id === episode?.id ? "bg-surface-2" : "bg-surface/60",
                    )}
                  >
                    {ep.still_url && (
                      <img
                        src={ep.still_url}
                        alt=""
                        loading="lazy"
                        className="h-14 w-24 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {ep.episode_number}. {ep.name ?? `Episode ${ep.episode_number}`}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[ep.air_date, formatRuntime(ep.runtime)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <RatingWidget movieId={movie.id} />

          {movie.where_to_watch.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold">Where to watch</h2>
              <ul className="mt-3 space-y-2">
                {movie.where_to_watch.map((link) => (
                  <li key={`${link.name}-${link.url}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold"
                    >
                      {link.name} <ExternalLink className="size-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
