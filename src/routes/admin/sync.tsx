import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { syncCatalogueNow } from "@/lib/tmdb.functions";
import { computeTrending } from "@/lib/trending.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/sync")({ component: SyncPage });

function SyncPage() {
  const sync = useServerFn(syncCatalogueNow);
  const trending = useServerFn(computeTrending);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Sync & Jobs</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manual sync and background jobs</p>

      <div className="mt-6 flex gap-3">
        <Button onClick={() => sync.mutate({})} disabled={sync.isLoading}>Run Catalogue Sync</Button>
        <Button onClick={() => trending.mutate({})} disabled={trending.isLoading}>Compute Trending</Button>
      </div>

      {sync.data && <pre className="mt-4">{JSON.stringify(sync.data, null, 2)}</pre>}
      {trending.data && <pre className="mt-4">{JSON.stringify(trending.data, null, 2)}</pre>}
    </main>
  );
}
