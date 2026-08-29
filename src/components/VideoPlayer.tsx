import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  Subtitles,
  RotateCcw,
  RotateCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Level = { index: number; label: string };

type Props = {
  src: string;
  type: string;
  title: string;
  poster?: string | undefined;
  subtitleUrl?: string | undefined;
  startAt?: number | undefined;
  onProgress?: ((seconds: number, duration: number) => void) | undefined;
};

function fmt(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export function VideoPlayer({
  src,
  type,
  title,
  poster,
  subtitleUrl,
  startAt = 0,
  onProgress,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<{ destroy: () => void; levels: unknown[]; currentLevel: number } | null>(
    null,
  );
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekedToStart = useRef(false);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [levels, setLevels] = useState<Level[]>([]);
  const [level, setLevel] = useState("-1");
  const [subtitlesOn, setSubtitlesOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---- source wiring (HLS via hls.js, otherwise native) ---- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    let cancelled = false;
    setReady(false);
    setError(null);

    const isHls = type === "hls" || src.includes(".m3u8");

    async function attach() {
      if (!video) return;
      if (isHls && !video.canPlayType("application/vnd.apple.mpegurl")) {
        const mod = await import("hls.js");
        const Hls = mod.default;
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setError("This browser cannot play the stream format.");
          return;
        }
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLevels(
            hls.levels.map((l, index) => ({
              index,
              label: l.height ? `${l.height}p` : `${Math.round((l.bitrate ?? 0) / 1000)}k`,
            })),
          );
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError("Playback error — the stream could not be loaded.");
        });
        hlsRef.current = hls as unknown as typeof hlsRef.current;
      } else {
        video.src = src;
      }
    }

    void attach();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, type]);

  /* ---- fullscreen state ---- */
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* ---- progress reporting ---- */
  useEffect(() => {
    if (!onProgress) return;
    const id = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && video.currentTime > 0) {
        onProgress(video.currentTime, video.duration || 0);
      }
    }, 10000);
    return () => {
      clearInterval(id);
      const video = videoRef.current;
      if (video && video.currentTime > 0) onProgress(video.currentTime, video.duration || 0);
    };
  }, [onProgress]);

  const scheduleHide = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 3200);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.code === "Space" || event.key === "k") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowRight") video.currentTime += 10;
      else if (event.key === "ArrowLeft") video.currentTime -= 10;
      else if (event.key === "m") video.muted = !video.muted;
      else if (event.key === "f") void toggleFullscreen();
      scheduleHide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scheduleHide, togglePlay]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shellRef.current?.requestFullscreen?.();
  }

  async function togglePip() {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      /* unsupported */
    }
  }

  function applyLevel(value: string) {
    setLevel(value);
    if (hlsRef.current) hlsRef.current.currentLevel = Number(value);
  }

  function toggleSubtitles() {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    const next = !subtitlesOn;
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      if (track) track.mode = next ? "showing" : "hidden";
    }
    setSubtitlesOn(next);
  }

  const pipSupported =
    typeof document !== "undefined" && "pictureInPictureEnabled" in document
      ? document.pictureInPictureEnabled
      : false;

  return (
    <div
      ref={shellRef}
      onMouseMove={scheduleHide}
      onTouchStart={scheduleHide}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-black md:rounded-3xl"
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        controls={false}
        className="h-full w-full bg-black"
        onClick={togglePlay}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          setDuration(video.duration || 0);
          setReady(true);
          if (!seekedToStart.current && startAt > 5 && startAt < (video.duration || 0) - 10) {
            video.currentTime = startAt;
          }
          seekedToStart.current = true;
        }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onPlay={() => {
          setPlaying(true);
          scheduleHide();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onVolumeChange={(event) => {
          setVolume(event.currentTarget.volume);
          setMuted(event.currentTarget.muted);
        }}
        onError={(event) => {
          const code = event.currentTarget.error?.code;
          setError(
            code === MediaError.MEDIA_ERR_NETWORK
              ? "The video host interrupted the connection. Try again."
              : "This video source could not be played.",
          );
        }}
      >
        {subtitleUrl && (
          <track kind="subtitles" src={subtitleUrl} srcLang="en" label="English" default={false} />
        )}
      </video>

      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 px-6 text-center">
          <div>
            <p className="text-sm font-semibold">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check the authorized source URL for this title.
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 md:px-5 md:pb-5",
          controlsVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="mb-2 flex items-center gap-3">
          <span className="w-12 shrink-0 text-[11px] tabular-nums text-white/80">
            {fmt(current)}
          </span>
          <Slider
            value={[duration ? (current / duration) * 100 : 0]}
            max={100}
            step={0.1}
            aria-label="Seek"
            onValueChange={([value]) => {
              const video = videoRef.current;
              if (video && duration) video.currentTime = ((value ?? 0) / 100) * duration;
            }}
            className="flex-1"
          />
          <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-white/80">
            {fmt(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ControlButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </ControlButton>

          <ControlButton
            label="Back 10 seconds"
            onClick={() => {
              const video = videoRef.current;
              if (video) video.currentTime -= 10;
            }}
          >
            <RotateCcw className="size-4.5" />
          </ControlButton>

          <ControlButton
            label="Forward 10 seconds"
            onClick={() => {
              const video = videoRef.current;
              if (video) video.currentTime += 10;
            }}
          >
            <RotateCw className="size-4.5" />
          </ControlButton>


          <div className="ml-1 flex items-center gap-2">
            <ControlButton
              label={muted ? "Unmute" : "Mute"}
              onClick={() => {
                const video = videoRef.current;
                if (video) video.muted = !video.muted;
              }}
            >
              {muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </ControlButton>
            <Slider
              value={[muted ? 0 : volume * 100]}
              max={100}
              step={1}
              aria-label="Volume"
              onValueChange={([value]) => {
                const video = videoRef.current;
                if (!video) return;
                video.volume = (value ?? 0) / 100;
                video.muted = (value ?? 0) === 0;
              }}
              className="hidden w-24 sm:block"
            />
          </div>

          <span className="ml-2 hidden max-w-[36ch] truncate text-xs text-white/70 md:block">
            {title}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {subtitleUrl && (
              <ControlButton
                label="Subtitles"
                onClick={toggleSubtitles}
                active={subtitlesOn}
              >
                <Subtitles className="size-5" />
              </ControlButton>
            )}

            {levels.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Playback quality"
                    className="grid size-9 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/15"
                  >
                    <Settings className="size-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Quality</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={level} onValueChange={applyLevel}>
                    <DropdownMenuRadioItem value="-1">Auto</DropdownMenuRadioItem>
                    {levels.map((l) => (
                      <DropdownMenuRadioItem key={l.index} value={String(l.index)}>
                        {l.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {pipSupported && (
              <ControlButton label="Picture in picture" onClick={() => void togglePip()}>
                <PictureInPicture2 className="size-5" />
              </ControlButton>
            )}

            <ControlButton label="Fullscreen" onClick={() => void toggleFullscreen()}>
              {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-full transition-colors hover:bg-white/15",
        active ? "text-primary" : "text-white/85",
      )}
    >
      {children}
    </button>
  );
}
