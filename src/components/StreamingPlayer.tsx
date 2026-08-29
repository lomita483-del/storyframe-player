import { Maximize, Minimize } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type StreamingPlayerProps = {
  src: string;
  title: string;
  onBack?: () => void;
};

export function StreamingPlayer({
  src,
  title,
  onBack,
}: StreamingPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(
        document.fullscreenElement === containerRef.current,
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange,
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  async function toggleFullscreen() {
    const container = containerRef.current;

    if (!container) return;

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by some browsers/webviews.
    }
  }

  if (!src) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={[
        "relative w-full overflow-hidden bg-black",
        fullscreen
          ? "h-screen rounded-none"
          : "aspect-video rounded-2xl md:rounded-3xl",
      ].join(" ")}
    >
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
        {onBack ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="pointer-events-auto rounded-full bg-black/70 text-white backdrop-blur-md hover:bg-black/85"
          >
            Back
          </Button>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => void toggleFullscreen()}
          aria-label={
            fullscreen
              ? "Exit fullscreen"
              : "Enter fullscreen"
          }
          className="pointer-events-auto rounded-full bg-black/70 text-white backdrop-blur-md hover:bg-black/85"
        >
          {fullscreen ? (
            <Minimize className="size-4" />
          ) : (
            <Maximize className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
