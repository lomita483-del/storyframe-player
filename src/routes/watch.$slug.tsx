// src/routes/watch.$slug.tsx

import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { movieBySlugQuery, saveProgress } from "@/lib/movies";
import { seasonsQuery, episodesQuery } from "@/lib/tv";
import { archiveEmbedSrc, embedSrc } from "@/lib/media";
import { VideoPlayer } from "@/components/VideoPlayer";
import { cn } from "@/lib/utils";

type WatchSearch = { s?: number | undefined; e?: number | undefined };

export const Route = createFileRoute("/watch/$slug")({
  validateSearch: (search: Record<string, unknown>): WatchSearch => ({
    s: Number(search['s']) || undefined,
    e: Number(search['e']) || undefined,
  }),
  component: WatchPage,
});

function WatchPage() {
  const { slug } = Route.useParams();
  const { s: season, e: episodeNumber } = Route.useSearch();
  const navigate = useNavigate();
  const { data: movie, isLoading } = useQuery(movieBySlugQuery(slug));

  const isShow = movie?.media_type === "tv";
  const { data: seasons } = useQuery({
    ...seasonsQuery(movie?.id),
    enabled: Boolean(isShow && movie?.id),
  });

  const activeSeason = season ?? seasons?.[0]?.season_number ?? 1;
  const { data: episodes } = useQuery({
    ...episodesQuery(movie?.id, activeSeason),
    enabled: Boolean(isShow && movie?.id),
  });

  const episode = useMemo(() => {
    if (!isShow || !episodes?.length) return null;
    return episodes.find((item) => item.episode_number === (episodeNumber ?? 1)) ?? episodes[0]!;
  }, [episodes, episodeNumber, isShow]);

  // Extract direct stream dynamic m3u8 URL if direct link isn't provided in DB
  const { data: extractedStream } = useQuery({
    queryKey: ["extracted-stream", movie?.tmdb_id, activeSeason, episodeNumber, isShow],
    enabled: Boolean(
      movie?.tmdb_id &&
        !episode?.direct_stream_url &&
        !episode?.video_url &&
        !movie?.direct_stream_url &&
        !movie?.video_url
    ),
    queryFn: async () => {
      try {
        const res = await fetch(
          `/api/extract?tmdbId=${movie!.tmdb_id}&type=${isShow ? "tv" : "movie"}&s=${activeSeason}&e=${episodeNumber ?? 1}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        return (data.streamUrl as string) ?? null;
      } catch {
        return null;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!movie) throw notFound();

  /* Native source hierarchy: DB File -> Scraped m3u8 -> Fallback to Iframe */
  const nativeSrc =
    episode?.direct_stream_url ??
    episode?.video_url ??
    movie.direct_stream_url ??
    movie.video_url ??
    extractedStream;

  const nativeType = episode ? episode.video_type : movie.video_type;
  const subtitleUrl = episode?.subtitle_url ?? movie.subtitle_url ?? undefined;

  const customEmbed =
    embedSrc(episode?.embed_provider ?? movie.embed_provider, episode?.embed_url ?? movie.embed_url) ??
    archiveEmbedSrc(episode?.video_url ?? movie.video_url);

  const defaultEmbed = isShow
    ? `https://www.2embed.cc/embedtv/${movie.tmdb_id}&s=${activeSeason}&e=${episodeNumber ?? 1}`
    : `https://www.2embed.cc/embed/${movie.tmdb_id}`;

  const title = episode
    ? `${movie.title} — S${activeSeason}:E${episode.episode_number}${episode.name ? ` ${episode.name}` : ""}`
    : movie.title;

  return (
    <main className="min-h-screen bg-black pb-24">
      <div className="mx-auto max-w-[1400px] px-3 pt-3 md:px-6 md:pt-5">
        <Link
          to="/movie/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/20"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="mt-3">
          {nativeSrc ? (
            <VideoPlayer
              src={nativeSrc}
              type={nativeType}
              title={title}
              poster={movie.backdrop_url ?? movie.poster_url ?? undefined}
              subtitleUrl={subtitleUrl}
              onProgress={(seconds, duration) => {
                void saveProgress({
                  movieId: movie.id,
                  progressSeconds: Math.floor(seconds),
                  durationSeconds: Math.floor(duration),
                });
              }}
            />
          ) : (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black md:rounded-3xl">
              <iframe
                src={customEmbed || defaultEmbed}
                title={title}
                className="h-full w-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>
          )}
        </div>

        <h1 className="mt-4 text-lg font-semibold text-white md:text-2xl">{title}</h1>

        {isShow && seasons && seasons.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-base font-semibold text-white">Episodes</h2>
              <SeasonPicker
                seasons={seasons.map((item) => item.season_number)}
                active={activeSeason}
                onSelect={(value) => void navigate({ to: "/watch/$slug", params: { slug }, search: { s: value, e: 1 } })}
              />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(episodes ?? []).map((item) => {
                const active = item.episode_number === (episode?.episode_number ?? 1);
                return (
                  <Link
                    key={item.id}
                    to="/watch/$slug"
                    params={{ slug }}
                    search={{ s: activeSeason, e: item.episode_number }}
                    className={cn(
                      "flex gap-3 rounded-2xl border p-2.5 transition-colors",
                      active
                        ? "border-primary/60 bg-primary/10"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]",
                    )}
                  >
                    {item.still_url ? (
                      <img
                        src={item.still_url}
                        alt=""
                        loading="lazy"
                        className="h-16 w-28 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-16 w-28 shrink-0 rounded-xl bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {item.episode_number}. {item.name ?? `Episode ${item.episode_number}`}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.overview ?? "No description available."}
                      </p>
                    </div>
                  </Link>
                );
              })}
              {!episodes?.length && (
                <p className="text-sm text-muted-foreground">No episodes imported for this season yet.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SeasonPicker({
  seasons,
  active,
  onSelect,
}: {
  seasons: number[];
  active: number;
  onSelect: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20"
      >
        Season {active}
        <ChevronDown className="size-4" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-40 overflow-auto rounded-xl border border-white/10 bg-surface p-1 shadow-xl">
          {seasons.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                onSelect(value);
                setOpen(false);
              }}
              className={cn(
                "block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-white/10",
                value === active ? "text-primary" : "text-white/85",
              )}
            >
              Season {value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
