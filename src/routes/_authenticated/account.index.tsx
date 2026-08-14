import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Bookmark,
  ChevronRight,
  Crown,
  Download,
  Gift,
  History,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Sparkles,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { profileQuery } from "@/lib/account";
import { watchHistoryQuery, watchlistQuery } from "@/lib/movies";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account/")({
  head: () => ({
    meta: [
      { title: "My Account — Lumen" },
      {
        name: "description",
        content:
          "Your Lumen account hub: watch history, my list, downloads, messages, settings and premium.",
      },
      { property: "og:title", content: "My Account — Lumen" },
      { property: "og:description", content: "Manage your Lumen profile, list, downloads and settings." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: history } = useQuery(watchHistoryQuery(user?.id));
  const { data: saved } = useQuery(watchlistQuery(user?.id));

  const name = profile?.display_name ?? user?.email?.split("@")[0] ?? "Viewer";
  const initial = name.slice(0, 1).toUpperCase();
  const watched = (history ?? []).filter((row) => row.movies);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-20 md:px-8 md:pt-28">
      <h1 className="sr-only">My account</h1>

      {/* Identity */}
      <section className="flex items-center gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="size-16 rounded-full object-cover ring-2 ring-primary/40"
          />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-xl font-bold ring-2 ring-primary/30">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold">{name}</p>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Free plan
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email}</p>
          <p className="text-[11px] text-muted-foreground">Member since {memberSince}</p>
        </div>
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link to="/account/profile" aria-label="Edit profile">
            <ChevronRight className="size-5" />
          </Link>
        </Button>
      </section>

      {/* Premium */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 font-display text-base font-bold">
            <Crown className="size-4 text-primary" /> Lumen Premium
          </p>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/account/premium">Unlock</Link>
          </Button>
        </div>
        <ul className="mt-4 grid grid-cols-4 gap-2 text-center text-[10px] text-muted-foreground">
          {["Premium titles", "4K quality", "No ads", "Offline list"].map((perk) => (
            <li key={perk} className="space-y-1.5">
              <span className="mx-auto grid size-9 place-items-center rounded-xl bg-background/50 text-primary">
                <Sparkles className="size-4" />
              </span>
              {perk}
            </li>
          ))}
        </ul>
      </section>

      <RowLink to="/account/rewards" icon={Gift} title="Rewards centre" subtitle="Earn viewing perks" />

      {/* Watch history strip */}
      <section className="mt-4 rounded-2xl border border-border bg-surface/60 p-4">
        <Link to="/account/history" className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <History className="size-4 text-primary" /> Watch history
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        {watched.length ? (
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {watched.slice(0, 8).map((row) => (
              <li key={row.id} className="w-20 shrink-0">
                <Link to="/watch/$slug" params={{ slug: row.movies!.slug }}>
                  {row.movies?.poster_url ? (
                    <img
                      src={row.movies.poster_url}
                      alt=""
                      loading="lazy"
                      className="aspect-2/3 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <span className="grid aspect-2/3 w-full place-items-center rounded-lg bg-surface-2 text-[10px] text-muted-foreground">
                      No art
                    </span>
                  )}
                  <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                    {row.movies?.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Nothing watched yet —{" "}
            <Link to="/search" className="text-primary">
              browse titles
            </Link>
            .
          </p>
        )}
      </section>

      {/* Library */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface/60">
        <RowItem to="/watchlist" icon={Bookmark} title="My list" value={String((saved ?? []).length)} />
        <RowItem to="/account/messages" icon={MessageCircle} title="Messages" value="0" />
        <RowItem to="/account/downloads" icon={Download} title="Saved for offline" />
        <RowItem to="/account/activity" icon={Bell} title="My activity" />
      </div>

      {/* Settings */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface/60">
        <RowItem to="/account/profile" icon={UserCog} title="Edit profile" />
        <RowItem to="/account/settings" icon={Settings} title="Playback & settings" />
        <RowItem to="/account/feedback" icon={MessageCircle} title="Feedback" />
        {isAdmin && <RowItem to="/admin" icon={LayoutDashboard} title="Admin dashboard" />}
      </div>

      <Button
        variant="secondary"
        className="mt-6 w-full rounded-full"
        onClick={() => void signOut()}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
    </main>
  );
}

type IconType = typeof Bell;

function RowItem({
  to,
  icon: Icon,
  title,
  value,
}: {
  to: string;
  icon: IconType;
  title: string;
  value?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-0 transition-colors hover:bg-accent/40"
    >
      <Icon className="size-4 text-primary" />
      <span className="flex-1 text-sm font-medium">{title}</span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function RowLink({
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  to: string;
  icon: IconType;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-4 transition-colors hover:bg-accent/40"
    >
      <Icon className="size-5 text-primary" />
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
