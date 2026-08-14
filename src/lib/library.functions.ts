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

/** Imports public-domain feature films that come with a real playable video file. */
export const importPublicDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { importPublicDomainFilms } = await import("./archive.server");
    return importPublicDomainFilms(24);
  });

/** Attaches official YouTube trailers as authorized embeds to titles with no source. */
export const fillTrailers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { backfillTrailers } = await import("./tmdb.server");
    return backfillTrailers(60);
  });
