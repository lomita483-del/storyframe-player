import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Keeps the catalogue fresh automatically. Public because the home page calls
 * it, but it is throttled server-side: it only does work when the last
 * successful sync is older than 12 hours and never runs concurrently.
 */
export const autoSyncCatalogue = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { runSync } = await import("./tmdb.server");
    return await runSync({ maxAgeHours: 12 });
  } catch (error) {
    return {
      inserted: 0,
      updated: 0,
      skipped: error instanceof Error ? error.message : "sync-failed",
    };
  }
});

/** Admin-triggered immediate refresh. */
export const syncCatalogueNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { runSync } = await import("./tmdb.server");
    return runSync({ force: true });
  });

/** Loads cast, crew, providers and (for shows) seasons + episodes on demand. */
export const enrichTitleBySlug = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const { enrichTitle } = await import("./tmdb.server");
      return await enrichTitle(data.slug);
    } catch {
      return { enriched: false };
    }
  });
