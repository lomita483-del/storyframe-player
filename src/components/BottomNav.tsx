import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Bookmark, Download, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/search", label: "Browse", icon: Search },
  { to: "/watchlist", label: "My List", icon: Bookmark },
  { to: "/account/downloads", label: "Downloads", icon: Download },
  { to: "/account", label: "Me", icon: User },
];

/** Mobile app-style bottom navigation. Hidden on the immersive player route. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/watch/")) return null;

  return (
    <nav className="glass-strong fixed inset-x-0 bottom-0 z-50 border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : item.to === "/account"
              ? pathname === "/account"
              : pathname.startsWith(item.to);
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className={cn("size-5", active && "fill-current/10")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
