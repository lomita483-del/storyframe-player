import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Flame,
  Loader2,
  Film,
  RefreshCw,
  Tv,
  Download,
  Youtube,
  PlayCircle,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { syncCatalogueNow } from "@/lib/tmdb.functions";
import { importPublicDomain, fillTrailers } from "@/lib/library.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminMoviesQuery, type Movie } from "@/lib/movies";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminMovies,
});

function AdminMovies() {
  const queryClient = useQueryClient();
  const runSync = useServerFn(syncCatalogueNow);

  const sync = useMutation({
    mutationFn: () => runSync(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      toast.success(
        result.skipped
          ? "Catalogue is already up to date"
          : `Synced — ${result.inserted} added, ${result.updated} refreshed`,
      );
    },
    onError: (error: { message?: string }) =>
      toast.error(error?.message ?? "Catalogue sync failed"),
  });

  const runImport = useServerFn(importPublicDomain);
  const publicDomain = useMutation({
    mutationFn: () => runImport(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      toast.success(
        result.inserted
          ? `${result.inserted} public-domain films added — these play in the app`
          : "No new public-domain films found",
      );
    },
    onError: (error: { message?: string }) => toast.error(error?.message ?? "Import failed"),
  });

  const runTrailers = useServerFn(fillTrailers);
  const trailers = useMutation({
    mutationFn: () => runTrailers(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      toast.success(
        result.updated
          ? `${result.updated} titles now play their official trailer`
          : "No new trailers found",
      );
    },
    onError: (error: { message?: string }) => toast.error(error?.message ?? "Trailer fill failed"),
  });

  const { data: movies, isLoading } = useQuery(adminMoviesQuery());

  const flags = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Movie> }) => {
      const { error } = await supabase.from("movies").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      toast.success("Catalogue updated");
    },
    onError: (error: { message?: string }) => toast.error(error?.message ?? "Update failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      toast.success("Movie deleted");
    },
    onError: () => toast.error("Could not delete the movie"),
  });

  const list = movies ?? [];
  const published = list.filter((m) => m.is_published).length;

  return (
    <main className="pb-24">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Titles" value={list.length} icon={<Film className="size-4" />} />
        <Stat label="Published" value={published} icon={<Eye className="size-4" />} />
        <Stat label="Drafts" value={list.length - published} icon={<EyeOff className="size-4" />} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold md:text-2xl">Catalogue</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            {sync.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sync now
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/admin/new">
              <Plus className="size-4" /> Add title
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid min-h-[30svh] place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {list.map((movie) => (
            <li
              key={movie.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface/60 p-3 md:p-4"
            >
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt=""
                  loading="lazy"
                  className="h-20 w-14 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="grid h-20 w-14 shrink-0 place-items-center rounded-lg bg-surface-2 text-[10px] text-muted-foreground">
                  No art
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{movie.title}</p>
                  <Badge tone="accent">
                    {movie.media_type === "tv" ? (
                      <span className="inline-flex items-center gap-1">
                        <Tv className="size-3" /> TV
                      </span>
                    ) : (
                      "Movie"
                    )}
                  </Badge>
                  <Badge tone={movie.is_published ? "live" : "draft"}>
                    {movie.is_published ? "Published" : "Draft"}
                  </Badge>
                  {movie.is_featured && <Badge tone="accent">Featured</Badge>}
                  {movie.is_trending && <Badge tone="accent">Trending</Badge>}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[movie.genre, movie.release_year, movie.quality, movie.video_type?.toUpperCase()]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <IconAction
                  label={movie.is_published ? "Unpublish" : "Publish"}
                  onClick={() =>
                    flags.mutate({ id: movie.id, patch: { is_published: !movie.is_published } })
                  }
                  active={movie.is_published}
                >
                  {movie.is_published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </IconAction>
                <IconAction
                  label="Feature"
                  onClick={() =>
                    flags.mutate({ id: movie.id, patch: { is_featured: !movie.is_featured } })
                  }
                  active={movie.is_featured}
                >
                  <Star className={cn("size-4", movie.is_featured && "fill-current")} />
                </IconAction>
                <IconAction
                  label="Trending"
                  onClick={() =>
                    flags.mutate({ id: movie.id, patch: { is_trending: !movie.is_trending } })
                  }
                  active={movie.is_trending}
                >
                  <Flame className={cn("size-4", movie.is_trending && "fill-current")} />
                </IconAction>

                <Button asChild variant="secondary" size="sm" className="rounded-full">
                  <Link to="/admin/$id" params={{ id: movie.id }}>
                    <Pencil className="size-3.5" /> Edit
                  </Link>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${movie.title}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete “{movie.title}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the movie record, along with saved watchlist entries and watch
                        history for it. The video file on your host is not affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove.mutate(movie.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
          {!list.length && (
            <li className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-sm text-muted-foreground">
              No movies yet — add your first title.
            </li>
          )}
        </ul>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "live" | "draft" | "accent";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "live" && "bg-primary/15 text-primary",
        tone === "draft" && "bg-surface-2 text-muted-foreground",
        tone === "accent" && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </span>
  );
}

function IconAction({
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
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-full transition-colors hover:bg-accent",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
