import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Trash2 } from "lucide-react";
import { readDownloads, writeDownloads, type SavedForOffline } from "@/lib/account";
import { AccountPageShell } from "@/components/AccountPageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account/downloads")({
  head: () => ({
    meta: [
      { title: "Saved for Offline — Lumen" },
      { name: "description", content: "Titles you've saved on this device for quick access on Lumen." },
      { property: "og:title", content: "Saved for Offline — Lumen" },
      { property: "og:description", content: "Titles saved on this device for quick access." },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const [items, setItems] = useState<SavedForOffline[]>([]);

  useEffect(() => setItems(readDownloads()), []);

  function remove(slug: string) {
    const next = items.filter((item) => item.slug !== slug);
    setItems(next);
    writeDownloads(next);
  }

  return (
    <AccountPageShell
      title="Saved for offline"
      description="Titles you've pinned on this device for one-tap playback."
    >
      {items.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
          {items.map((item) => (
            <li key={item.slug} className="flex items-center gap-4 p-4">
              {item.poster_url && (
                <img
                  src={item.poster_url}
                  alt=""
                  loading="lazy"
                  className="h-16 w-11 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  Saved {new Date(item.savedAt).toLocaleDateString()}
                </p>
              </div>
              <Button asChild size="sm" variant="secondary" className="rounded-full">
                <Link to="/watch/$slug" params={{ slug: item.slug }}>
                  Play
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${item.title}`}
                onClick={() => remove(item.slug)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-border bg-surface/60 p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-2 text-primary">
            <Download className="size-5" />
          </span>
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing saved on this device yet. Open a title and tap “Save on device”.
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/search">Browse titles</Link>
          </Button>
        </div>
      )}
    </AccountPageShell>
  );
}
