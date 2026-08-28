import {
  ArrowLeft,
  Film,
  Tv,
} from "lucide-react";

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { VideoPlayer } from "@/components/streaming/VideoPlayer";
import { StreamingError } from "@/components/streaming/StreamingError";

import { resolveStreamUrl } from "@/lib/streaming/url-builder";

import type {
  MediaType,
  WatchParams,
} from "@/types/streaming";

export default function Watch() {
  const navigate = useNavigate();

  const params = useParams();

  const mediaType: MediaType =
    params.type === "tv"
      ? "tv"
      : "movie";

  const mediaId =
    params.id?.trim() ?? "";

  const season = params.season
    ? Number(params.season)
    : undefined;

  const episode = params.episode
    ? Number(params.episode)
    : undefined;

  const watchParams: WatchParams =
    useMemo(
      () => ({
        mediaType,
        mediaId,
        season,
        episode,
      }),
      [
        mediaType,
        mediaId,
        season,
        episode,
      ]
    );

  const streamUrl = useMemo(
    () =>
      resolveStreamUrl(
        watchParams
      ),
    [watchParams]
  );

  const handleBack = () => {
    navigate(-1);
  };

  if (!mediaId) {
    return (
      <main className="min-h-screen bg-black text-white">
        <StreamingError
          message="No media ID was provided."
          onBack={handleBack}
        />
      </main>
    );
  }

  if (
    mediaType === "tv" &&
    (!Number.isInteger(season) ||
      !Number.isInteger(episode) ||
      season! < 1 ||
      episode! < 1)
  ) {
    return (
      <main className="min-h-screen bg-black text-white">
        <StreamingError
          message="A valid season and episode are required for TV playback."
          onBack={handleBack}
        />
      </main>
    );
  }

  if (!streamUrl) {
    return (
      <main className="min-h-screen bg-black text-white">
        <StreamingError
          message="No authorized playback source is configured for this title."
          onBack={handleBack}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 text-xs text-white/40">
            {mediaType === "tv" ? (
              <Tv className="h-4 w-4" />
            ) : (
              <Film className="h-4 w-4" />
            )}

            {mediaType === "tv"
              ? `S${season} · E${episode}`
              : "Movie"}
          </div>
        </div>

        <VideoPlayer
          src={streamUrl}
          title={
            mediaType === "tv"
              ? `TV Episode S${season} E${episode}`
              : "Movie Player"
          }
        />
      </div>
    </main>
  );
}
