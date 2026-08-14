import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: unknown, userId: string) {
  const client = supabase as {
    rpc: (
      name: "has_role",
      args: { _user_id: string; _role: "admin" },
    ) => Promise<{ data: boolean | null }>;
  };
  const { data } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

/** Dry-run the configured licensed feed and preview the playback URLs it yields. */
export const testLicensedFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { testLicensedFeedConnection } = await import("./feed.server");
    return testLicensedFeedConnection();
  });

/** Import (or refresh) every title from the operator's licensed catalogue feed. */
export const importLicensedFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { importLicensedCatalogue } = await import("./feed.server");
    return importLicensedCatalogue(300);
  });
