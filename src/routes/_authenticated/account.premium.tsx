import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { AccountPageShell } from "@/components/AccountPageShell";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Free",
    price: "₦0",
    period: "forever",
    current: true,
    perks: ["Full catalogue browsing", "Standard quality", "Ad-supported playback", "Watchlist & history"],
  },
  {
    name: "Premium",
    price: "₦2,500",
    period: "per month",
    current: false,
    perks: ["Premium titles", "Up to 4K quality", "No ads", "Saved-for-offline list", "2 screens at once"],
  },
  {
    name: "Premium Yearly",
    price: "₦24,000",
    period: "per year — 2 months free",
    current: false,
    perks: ["Everything in Premium", "Priority new releases", "4 screens at once"],
  },
];

export const Route = createFileRoute("/_authenticated/account/premium")({
  head: () => ({
    meta: [
      { title: "Lumen Premium — Plans" },
      {
        name: "description",
        content: "Compare Lumen plans: premium titles, 4K playback, ad-free viewing and offline saving.",
      },
      { property: "og:title", content: "Lumen Premium — Plans" },
      { property: "og:description", content: "Compare Lumen plans and unlock premium streaming." },
    ],
  }),
  component: PremiumPage,
});

function PremiumPage() {
  return (
    <AccountPageShell
      title="Lumen Premium"
      description="Unlock the full cinematic experience across all your devices."
    >
      <div className="space-y-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className="rounded-2xl border border-border bg-surface/60 p-5 data-[featured=true]:border-primary/40"
            data-featured={plan.name === "Premium"}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 font-display text-lg font-bold">
                  {plan.name !== "Free" && <Crown className="size-4 text-primary" />}
                  {plan.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="text-xl font-bold text-foreground">{plan.price}</span> {plan.period}
                </p>
              </div>
              {plan.current ? (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                  Current
                </span>
              ) : (
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    toast.info("Payments aren't connected yet — ask to enable checkout to go live.")
                  }
                >
                  Choose
                </Button>
              )}
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {plan.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="size-4 text-primary" /> {perk}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Plans are presentational until a payment provider is connected to this app.
      </p>
    </AccountPageShell>
  );
}
