import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gift, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { watchHistoryQuery } from "@/lib/movies";
import { AccountPageShell } from "@/components/AccountPageShell";

export const Route = createFileRoute("/_authenticated/account/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards Centre — Lumen" },
      { name: "description", content: "Earn Lumen viewing perks by watching, saving and finishing titles." },
      { property: "og:title", content: "Rewards Centre — Lumen" },
      { property: "og:description", content: "Earn Lumen viewing perks as you watch." },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const { user } = useAuth();
  const { data: history } = useQuery(watchHistoryQuery(user?.id));
  const rows = (history ?? []).filter((row) => row.movies);
  const points = rows.reduce((total, row) => total + Math.floor(row.progress_seconds / 300), 0);

  const milestones = [
    { label: "First title watched", need: 1 },
    { label: "Five hours of viewing", need: 60 },
    { label: "Weekend marathoner", need: 150 },
    { label: "Lumen cinephile", need: 400 },
  ];

  return (
    <AccountPageShell title="Rewards centre" description="Every 5 minutes watched earns 1 point.">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-transparent p-6 text-center">
        <Gift className="mx-auto size-6 text-primary" />
        <p className="mt-3 font-display text-3xl font-bold">{points.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">Reward points</p>
      </div>

      <ul className="mt-6 space-y-3">
        {milestones.map((milestone) => {
          const percent = Math.min(100, Math.round((points / milestone.need) * 100));
          const done = points >= milestone.need;
          return (
            <li key={milestone.label} className="rounded-2xl border border-border bg-surface/60 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Trophy className={done ? "size-4 text-primary" : "size-4 text-muted-foreground"} />
                  {milestone.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {done ? "Unlocked" : `${points}/${milestone.need}`}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </AccountPageShell>
  );
}
