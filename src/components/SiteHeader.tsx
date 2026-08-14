import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Bookmark, LayoutDashboard, LogOut, User as UserIcon, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (pathname.startsWith("/watch/")) return null;

  const initial = (user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        scrolled ? "glass-strong" : "bg-gradient-to-b from-background/90 to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 md:h-18 md:gap-6 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Film className="size-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Lumen<span className="text-primary">.</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm md:flex">
          <HeaderLink to="/">Home</HeaderLink>
          <HeaderLink to="/search">Browse</HeaderLink>
          {user && <HeaderLink to="/watchlist">My List</HeaderLink>}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/search" aria-label="Search movies">
              <Search className="size-5" />
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="grid size-9 place-items-center rounded-full bg-surface-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-accent"
                  aria-label="Account menu"
                >
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/watchlist">
                    <Bookmark className="size-4" /> My list
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <LayoutDashboard className="size-4" /> Admin dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">
                <UserIcon className="size-4" /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      activeProps={{ className: "text-foreground" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
    </Link>
  );
}
