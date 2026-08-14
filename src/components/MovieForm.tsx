import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EMBED_PROVIDERS, embedSrc, type WhereToWatchLink } from "@/lib/media";
import {
  VIDEO_PROVIDERS,
  buildPlaybackUrl,
  providerSettingsQuery,
} from "@/lib/providers";
import { MediaUploadField } from "@/components/MediaUploadField";
import { WhereToWatchEditor } from "@/components/WhereToWatchEditor";
import {
  QUALITIES,
  VIDEO_TYPES,
  genresQuery,
  slugify,
  type Movie,
} from "@/lib/movies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  title: string;
  slug: string;
  description: string;
  genre: string;
  release_year: string;
  runtime: string;
  rating: string;
  cast: string;
  director: string;
  poster_url: string;
  backdrop_url: string;
  video_url: string;
  video_type: string;
  subtitle_url: string;
  trailer_url: string;
  quality: string;
  embed_url: string;
  embed_provider: string;
  provider: string;
  provider_asset_id: string;
  where_to_watch: WhereToWatchLink[];
  is_published: boolean;
  is_featured: boolean;
  is_trending: boolean;
};

function toForm(movie?: Movie | null): FormState {
  return {
    title: movie?.title ?? "",
    slug: movie?.slug ?? "",
    description: movie?.description ?? "",
    genre: movie?.genre ?? "",
    release_year: movie?.release_year ? String(movie.release_year) : "",
    runtime: movie?.runtime ? String(movie.runtime) : "",
    rating: movie?.rating != null ? String(movie.rating) : "",
    cast: movie?.cast?.join(", ") ?? "",
    director: movie?.director ?? "",
    poster_url: movie?.poster_url ?? "",
    backdrop_url: movie?.backdrop_url ?? "",
    video_url: movie?.video_url ?? "",
    video_type: movie?.video_type ?? "mp4",
    subtitle_url: movie?.subtitle_url ?? "",
    trailer_url: movie?.trailer_url ?? "",
    quality: movie?.quality ?? "1080p",
    embed_url: movie?.embed_url ?? "",
    embed_provider: movie?.embed_provider ?? "",
    provider: movie?.provider ?? "",
    provider_asset_id: movie?.provider_asset_id ?? "",
    where_to_watch: movie?.where_to_watch ?? [],
    is_published: movie?.is_published ?? false,
    is_featured: movie?.is_featured ?? false,
    is_trending: movie?.is_trending ?? false,
  };
}

/** Fields that must exist before a movie may be published. */
const PUBLISH_REQUIRED: { key: keyof FormState; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "genre", label: "Genre" },
  { key: "release_year", label: "Release year" },
  { key: "runtime", label: "Runtime" },
  { key: "poster_url", label: "Poster" },
  { key: "backdrop_url", label: "Backdrop" },
];

export function MovieForm({ movie }: { movie?: Movie | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: genres } = useQuery(genresQuery());
  const { data: providerSettings } = useQuery(providerSettingsQuery());
  const [form, setForm] = useState<FormState>(() => toForm(movie));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next['title'] = "A title is required.";
    if (form.rating && (Number(form.rating) < 0 || Number(form.rating) > 10))
      next['rating'] = "Rating must be between 0 and 10.";
    if (form.is_published) {
      for (const field of PUBLISH_REQUIRED) {
        if (!String(form[field.key]).trim()) {
          next[field.key] = `${field.label} is required before publishing.`;
        }
      }
      if (!form.video_url.trim() && !form.embed_url.trim()) {
        next['video_url'] = "Add an authorized video source or an embed URL before publishing.";
      }
      if (form.video_type === "hls" && form.video_url && !form.video_url.includes(".m3u8")) {
        next['video_url'] = "HLS sources should point to an .m3u8 playlist.";
      }
    }
    if (form.embed_url.trim() && !embedSrc(form.embed_provider, form.embed_url)) {
      next['embed_url'] =
        "Enter a YouTube, Vimeo or Cloudflare Stream URL and pick the matching provider.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        slug: (form.slug.trim() || slugify(form.title)).trim(),
        description: form.description.trim() || null,
        genre: form.genre || null,
        release_year: form.release_year ? Number(form.release_year) : null,
        runtime: form.runtime ? Number(form.runtime) : null,
        rating: form.rating ? Number(form.rating) : null,
        cast: form.cast
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean),
        director: form.director.trim() || null,
        poster_url: form.poster_url.trim() || null,
        backdrop_url: form.backdrop_url.trim() || null,
        video_url: form.video_url.trim() || null,
        video_type: form.video_type,
        subtitle_url: form.subtitle_url.trim() || null,
        trailer_url: form.trailer_url.trim() || null,
        quality: form.quality,
        embed_url: form.embed_url.trim() || null,
        embed_provider: form.embed_url.trim() ? form.embed_provider || null : null,
        where_to_watch: form.where_to_watch.filter((link) => link.name && link.url),
        is_published: form.is_published,
        is_featured: form.is_featured,
        is_trending: form.is_trending,
      };

      if (movie) {
        const { error } = await supabase.from("movies").update(payload).eq("id", movie.id);
        if (error) throw error;
        return movie.id;
      }
      const { data, error } = await supabase
        .from("movies")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      toast.success(movie ? "Movie updated" : "Movie created");
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      navigate({ to: "/admin" });
    },
    onError: (error: { message?: string }) =>
      toast.error(error?.message ?? "Could not save the movie"),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section
        title="Streaming"
        description="Metadata lives here; the video itself stays on your authorized video host or CDN."
      >
        <Field label="Authorized video URL" error={errors['video_url']} className="md:col-span-2">
          <MediaUploadField
            value={form.video_url}
            onChange={(value) => set("video_url", value)}
            placeholder="https://stream.example.com/title/master.m3u8"
            accept="video/*"
            folder="videos"
            kind="video"
          />
        </Field>

        <Field label="Streaming format">
          <Select value={form.video_type} onValueChange={(value) => set("video_type", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Quality label">
          <Select value={form.quality} onValueChange={(value) => set("quality", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITIES.map((quality) => (
                <SelectItem key={quality} value={quality}>
                  {quality}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Subtitle URL (.vtt)">
          <MediaUploadField
            value={form.subtitle_url}
            onChange={(value) => set("subtitle_url", value)}
            placeholder="https://cdn.example.com/subs/en.vtt"
            accept=".vtt,text/vtt"
            folder="subtitles"
            kind="subtitle"
          />
        </Field>

        <Field label="Trailer URL">
          <Input
            value={form.trailer_url}
            onChange={(event) => set("trailer_url", event.target.value)}
            placeholder="https://cdn.example.com/trailer.mp4"
          />
        </Field>
      </Section>

      <Section title="Movie information" description="The core metadata viewers will see.">

        <Field label="Title" error={errors['title']} className="md:col-span-2">
          <Input
            value={form.title}
            onChange={(event) => {
              set("title", event.target.value);
              if (!movie) set("slug", slugify(event.target.value));
            }}
            placeholder="Orbital Drift"
          />
        </Field>

        <Field label="URL slug" hint="Used in the movie link">
          <Input
            value={form.slug}
            onChange={(event) => set("slug", slugify(event.target.value))}
            placeholder="orbital-drift"
          />
        </Field>

        <Field label="Genre" error={errors['genre']}>
          <Select value={form.genre} onValueChange={(value) => set("genre", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {(genres ?? []).map((genre) => (
                <SelectItem key={genre.id} value={genre.name}>
                  {genre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Description" error={errors['description']} className="md:col-span-2">
          <Textarea
            rows={4}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="A short, spoiler-free synopsis."
          />
        </Field>

        <Field label="Release year" error={errors['release_year']}>
          <Input
            inputMode="numeric"
            value={form.release_year}
            onChange={(event) => set("release_year", event.target.value.replace(/\D/g, ""))}
            placeholder="2024"
          />
        </Field>

        <Field label="Runtime (minutes)" error={errors['runtime']}>
          <Input
            inputMode="numeric"
            value={form.runtime}
            onChange={(event) => set("runtime", event.target.value.replace(/\D/g, ""))}
            placeholder="118"
          />
        </Field>

        <Field label="Rating (0–10)" error={errors['rating']}>
          <Input
            inputMode="decimal"
            value={form.rating}
            onChange={(event) => set("rating", event.target.value)}
            placeholder="8.4"
          />
        </Field>

        <Field label="Director">
          <Input
            value={form.director}
            onChange={(event) => set("director", event.target.value)}
            placeholder="Elena Duarte"
          />
        </Field>

        <Field label="Cast" hint="Comma separated" className="md:col-span-2">
          <Input
            value={form.cast}
            onChange={(event) => set("cast", event.target.value)}
            placeholder="Amara Osei, Leon Vasquez"
          />
        </Field>
      </Section>

      <Section title="Artwork" description="Poster and backdrop image URLs from your CDN or storage.">
        <Field label="Poster URL" error={errors['poster_url']}>
          <MediaUploadField
            value={form.poster_url}
            onChange={(value) => set("poster_url", value)}
            placeholder="https://cdn.example.com/poster.jpg"
            accept="image/*"
            folder="posters"
            kind="image"
          />
          {form.poster_url.startsWith("http") && (
            <img
              src={form.poster_url}
              alt=""
              className="mt-3 h-40 w-28 rounded-lg object-cover ring-1 ring-border"
            />
          )}
        </Field>

        <Field label="Backdrop URL" error={errors['backdrop_url']}>
          <MediaUploadField
            value={form.backdrop_url}
            onChange={(value) => set("backdrop_url", value)}
            placeholder="https://cdn.example.com/backdrop.jpg"
            accept="image/*"
            folder="backdrops"
            kind="image"
          />
          {form.backdrop_url.startsWith("http") && (
            <img
              src={form.backdrop_url}
              alt=""
              className="mt-3 h-28 w-full rounded-lg object-cover ring-1 ring-border"
            />
          )}
        </Field>
      </Section>


      <Section
        title="Authorized embed"
        description="For platforms that officially allow embedding. Used when no direct file source exists."
      >
        <Field label="Embed provider">
          <Select
            value={form.embed_provider}
            onValueChange={(value) => set("embed_provider", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              {EMBED_PROVIDERS.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Embed URL"
          error={errors['embed_url']}
          hint="YouTube, Vimeo or Cloudflare Stream link"
        >
          <Input
            value={form.embed_url}
            onChange={(event) => set("embed_url", event.target.value)}
            placeholder="https://www.youtube.com/watch?v=aqz-KE-bpKQ"
          />
        </Field>
      </Section>

      <Section
        title="Where to watch"
        description="Official service links shown to viewers when you do not host the film yourself."
      >
        <div className="md:col-span-2">
          <WhereToWatchEditor
            links={form.where_to_watch}
            onChange={(links) => set("where_to_watch", links)}
          />
        </div>
      </Section>

      <Section title="Publishing" description="Drafts stay hidden from viewers until published.">
        <Toggle
          label="Published"
          hint="Visible on the homepage and in search"
          checked={form.is_published}
          onChange={(value) => set("is_published", value)}
        />
        <Toggle
          label="Featured"
          hint="Shown in the homepage hero"
          checked={form.is_featured}
          onChange={(value) => set("is_featured", value)}
        />
        <Toggle
          label="Trending"
          hint="Appears in the trending row"
          checked={form.is_trending}
          onChange={(value) => set("is_trending", value)}
        />
      </Section>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background/90 py-4 backdrop-blur">
        <Button type="submit" className="rounded-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {movie ? "Save changes" : "Create movie"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="rounded-full"
          onClick={() => navigate({ to: "/admin" })}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-5 md:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="mt-2">{children}</div>
      {hint && !error && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1.5 text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/40 p-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
