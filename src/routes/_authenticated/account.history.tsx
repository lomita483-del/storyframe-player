import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { watchHistoryQuery } from "@/lib/movies";
import { AccountPageShell } from "@/components/AccountPageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account/history")({
  head: () => ({
    meta: [
      { title: "Watch History — Lumen" },
      { name: "description", content: "Everything you've watched on Lumen, ready to resume." },
      { property: "og:title", content: "Watch History — Lumen" },
      { property: "og:description", content: "Everything you've watched on Lumen, ready to resume." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery(watchHistoryQuery(user?.id));
  const rows = (data ?? []).filter((row) => row.movies);

  return (
    <AccountPageShell title="Watch history" description="Pick up any title exactly where you stopped.">
      {isLoading ? (
        <div className="grid min-h-[30svh] place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : rows.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
          {rows.map((row) => {
            const percent = row.duration_seconds
              ? Math.min(100, Math.round((row.progress_seconds / row.duration_seconds) * 100))
              : 0;
            return (
              <li key={row.id} className="flex items-center gap-4 p-4">
                {row.movies?.poster_url && (
                  <img
                    src={row.movies.poster_url}
                    alt=""
                    loading="lazy"
                    className="h-16 w-11 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{row.movies?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.completed ? "Finished" : `${percent}% watched`}
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10">
                    <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <Button asChild size="sm" variant="secondary" className="rounded-full">
                  <Link to="/watch/$slug" params={{ slug: row.movies!.slug }}>
                    {row.completed ? "Again" : "Resume"}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-border bg-surface/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">You haven't watched anything yet.</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/search">Browse titles</Link>
          </Button>
        </div>
      )}
    </AccountPageShell>
  );
}
