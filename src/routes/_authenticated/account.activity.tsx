import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Clock, Film } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { watchHistoryQuery, watchlistQuery } from "@/lib/movies";
import { AccountPageShell } from "@/components/AccountPageShell";

export const Route = createFileRoute("/_authenticated/account/activity")({
  head: () => ({
    meta: [
      { title: "My Activity — Lumen" },
      { name: "description", content: "Your viewing stats and recent activity on Lumen." },
      { property: "og:title", content: "My Activity — Lumen" },
      { property: "og:description", content: "Your viewing stats and recent activity on Lumen." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { user } = useAuth();
  const { data: history } = useQuery(watchHistoryQuery(user?.id));
  const { data: saved } = useQuery(watchlistQuery(user?.id));

  const rows = (history ?? []).filter((row) => row.movies);
  const minutes = Math.round(
    rows.reduce((total, row) => total + row.progress_seconds, 0) / 60,
  );
  const finished = rows.filter((row) => row.completed).length;

  const stats = [
    { label: "Minutes watched", value: minutes.toLocaleString(), icon: Clock },
    { label: "Titles finished", value: String(finished), icon: Film },
    { label: "Saved to list", value: String((saved ?? []).length), icon: Bookmark },
  ];

  return (
    <AccountPageShell title="My activity" description="A quick look at how you've been watching.">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface/60 p-4 text-center">
            <stat.icon className="mx-auto size-4 text-primary" />
            <p className="mt-2 text-lg font-bold">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Recent activity</h2>
      {rows.length ? (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
          {rows.slice(0, 15).map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 p-4">
              <Link
                to="/movie/$slug"
                params={{ slug: row.movies!.slug }}
                className="min-w-0 flex-1 truncate text-sm font-medium"
              >
                {row.movies?.title}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(row.updated_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No activity recorded yet.</p>
      )}
    </AccountPageShell>
  );
}
