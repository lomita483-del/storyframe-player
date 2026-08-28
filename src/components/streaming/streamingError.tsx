import {
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

interface StreamingErrorProps {
  message?: string;
  onBack: () => void;
}

export function StreamingError({
  message = "Playback source unavailable.",
  onBack,
}: StreamingErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>

        <h2 className="text-xl font-semibold text-white">
          Unable to play this title
        </h2>

        <p className="mt-3 text-sm leading-6 text-white/60">
          {message}
        </p>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
}
