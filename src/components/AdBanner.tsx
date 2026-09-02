import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { userSettingsQuery } from "@/lib/userSettings";

export function AdBanner({ className }: { className?: string }) {
  const { user } = useAuth();
  const { data: settings } = useQuery(userSettingsQuery(user?.id));

  const isExempt = settings?.ads_exempt || (settings?.ads_exempt_until && new Date(settings.ads_exempt_until) > new Date());
  if (isExempt) return null;

  // Placeholder ad unit — replace with your ad component/slot
  return (
    <div className={className} aria-label="Advertisement">
      <div className="mx-auto my-4 max-w-4xl rounded-lg border border-dashed border-border bg-surface/80 p-6 text-center text-sm text-muted-foreground">
        This is an ad placeholder. Put your ad component here.
      </div>
    </div>
  );
}
