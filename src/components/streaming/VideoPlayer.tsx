import {
  AlertTriangle,
  Maximize,
  RotateCcw,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  src: string;
  title?: string;
  onError?: () => void;
}

export function VideoPlayer({
  src,
  title = "Video Player",
  onError,
}: VideoPlayerProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const [loading, setLoading] =
    useState(true);

  const [hasError, setHasError] =
    useState(false);

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  useEffect(() => {
    setLoading(true);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement ===
          containerRef.current
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  const enterFullscreen = async () => {
    if (!containerRef.current) {
      return;
    }

    try {
      await containerRef.current.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by browser policy.
    }
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) {
      return;
    }

    try {
      await document.exitFullscreen();
    } catch {
      // Ignore browser fullscreen errors.
    }
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setHasError(true);

    onError?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl bg-black shadow-2xl"
    >
      <div className="aspect-video w-full">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

              <p className="text-sm text-white/60">
                Loading player...
              </p>
            </div>
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black px-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />

              <h3 className="mt-4 text-lg font-semibold text-white">
                Player unavailable
              </h3>

              <p className="mt-2 text-sm text-white/50">
                The authorized playback source could
                not be loaded.
              </p>

              <button
                type="button"
                onClick={() => {
                  setHasError(false);
                  setLoading(true);
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        ) : (
          <iframe
            key={src}
            src={src}
            title={title}
            className="h-full w-full border-0"
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            loading="eager"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
      </div>

      <div className="absolute bottom-3 right-3 z-20">
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={
            isFullscreen
              ? "Exit fullscreen"
              : "Enter fullscreen"
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-md transition hover:bg-black"
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
