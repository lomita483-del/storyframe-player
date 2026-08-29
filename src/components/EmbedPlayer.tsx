import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** Authorized embed URL (YouTube, Vimeo, Archive.org, licensed provider). */
  src: string;
  title: string;
  className?: string | undefined;
  onBack?: (() => void) | undefined;
};

export function EmbedPlayer({ src, title, className, onBack }: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      {onBack ? (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      ) : null}
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <iframe
          src={src}
          title={title}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}
