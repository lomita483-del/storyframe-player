import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();
  const { data: isAdmin, isLoading } = useIsAdmin(user?.id);
  const queryClient = useQueryClient();

  const claim = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_first_admin");
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (granted) => {
      if (granted) {
        toast.success("You are now an administrator");
        queryClient.invalidateQueries({ queryKey: ["is-admin"] });
      } else {
        toast.error("An administrator already exists for this platform");
      }
    },
    onError: () => toast.error("Could not grant administrator access"),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="glass w-full max-w-md rounded-3xl p-8 text-center">
          <ShieldCheck className="mx-auto size-8 text-primary" />
          <h1 className="mt-4 text-xl font-semibold">Administrator access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area manages the movie catalogue. If you're setting up the platform, claim the
            first administrator account below.
          </p>
          <Button
            className="mt-6 rounded-full"
            disabled={claim.isPending}
            onClick={() => claim.mutate()}
          >
            {claim.isPending && <Loader2 className="size-4 animate-spin" />}
            Claim administrator access
          </Button>
          <div className="mt-4">
            <Link to="/" className="text-xs text-muted-foreground underline">
              Back to the platform
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen pt-20 md:pt-24">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <LayoutDashboard className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Admin dashboard</p>
              <p className="text-xs text-muted-foreground">Catalogue management</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/">View platform</Link>
          </Button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
