import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { AccountPageShell } from "@/components/AccountPageShell";

export const Route = createFileRoute("/_authenticated/account/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Lumen" },
      { name: "description", content: "Announcements and account notices from Lumen." },
      { property: "og:title", content: "Messages — Lumen" },
      { property: "og:description", content: "Announcements and account notices from Lumen." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <AccountPageShell title="Messages" description="Announcements and notices about your account.">
      <div className="rounded-2xl border border-border bg-surface/60 p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-2 text-primary">
          <Bell className="size-5" />
        </span>
        <p className="mt-4 text-sm text-muted-foreground">You're all caught up — no messages.</p>
      </div>
    </AccountPageShell>
  );
}
