import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Shared layout for the account sub-pages, with a back link to the account hub. */
export function AccountPageShell({ title, description, children }: Props) {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-20 md:px-8 md:pt-28">
      <Link
        to="/account"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Account
      </Link>
      <h1 className="mt-3 text-2xl font-bold md:text-3xl">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-8">{children}</div>
    </main>
  );
}
