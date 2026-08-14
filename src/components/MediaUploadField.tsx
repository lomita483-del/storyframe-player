import { useRef, useState } from "react";
import { Loader2, Upload, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { uploadMedia, isStorageRef } from "@/lib/media";
import { validateMediaUrl } from "@/lib/media.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  accept: string;
  folder: "posters" | "backdrops" | "videos" | "subtitles";
  kind: "video" | "image" | "subtitle";
};

/**
 * URL input with two extras: upload a file you own to Cloud storage, or
 * validate that a pasted link is really a playable/viewable file.
 */
export function MediaUploadField({ value, onChange, placeholder, accept, folder, kind }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const check = useServerFn(validateMediaUrl);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; hint?: string } | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setResult(null);
    try {
      const { ref } = await uploadMedia(file, folder);
      onChange(ref);
      toast.success("Uploaded to your Cloud storage");
      setResult({ ok: true, message: "Stored in your own media library." });
    } catch (error) {
      toast.error((error as { message?: string })?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleCheck() {
    if (!value.trim() || isStorageRef(value)) return;
    setChecking(true);
    setResult(null);
    try {
      const data = await check({ data: { url: value.trim(), kind } });
      setResult(data);
    } catch {
      setResult({ ok: false, message: "That value is not a valid URL." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <Input
        value={isStorageRef(value) ? "Uploaded file (stored in your media library)" : value}
        readOnly={isStorageRef(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-full"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          Upload
        </Button>
        {!isStorageRef(value) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full"
            disabled={checking || !value.trim()}
            onClick={() => void handleCheck()}
          >
            {checking ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            Validate link
          </Button>
        )}
        {isStorageRef(value) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => onChange("")}
          >
            Remove
          </Button>
        )}
      </div>
      {result && (
        <p
          className={`mt-2 inline-flex items-start gap-1.5 text-[11px] ${
            result.ok ? "text-primary" : "text-destructive"
          }`}
        >
          {result.ok ? (
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          )}
          <span>
            {result.message}
            {result.hint && <span className="block text-muted-foreground">{result.hint}</span>}
          </span>
        </p>
      )}
    </div>
  );
}
