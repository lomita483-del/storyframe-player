import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { watchHistoryQuery, watchlistQuery } from "@/lib/movies";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/users/dashboard")({ component: UserDashboard });

function UserDashboard() {
  const { user } = useAuth();
  const { data: history } = useQuery(watchHistoryQuery(user?.id));
  const { data: watchlist } = useQuery(watchlistQuery(user?.id));

  if (!user) return <div className="p-6">Sign in to view your dashboard.</div>;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Your Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage your account, watch history and ratings.</p>

      <section className="mt-6">
        <h2 className="font-semibold">Watch history</h2>
        <ul className="mt-2 space-y-2">
          {history?.map((h: any) => (
            <li key={h.id} className="rounded-md border p-3">{h.movies?.title ?? h.movie_id} — progress {Math.floor((h.progress_seconds/ (h.duration_seconds ?? 1)) * 100)}%</li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">Watchlist</h2>
        <ul className="mt-2 space-y-2">
          {watchlist?.map((w: any) => (
            <li key={w.id} className="rounded-md border p-3">{w.movies?.title ?? w.movie_id}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
