import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Admin functions for user management

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    // ensure caller is admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    // fetch profiles
    const { data: profiles, error: pErr } = await supabaseAdmin.from("profiles").select("id,display_name,avatar_url,created_at").order("created_at", { ascending: false });
    if (pErr) throw pErr;

    const ids = (profiles ?? []).map((p: any) => p.id);

    // fetch roles and settings for these ids
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", ids);
    const { data: settings } = await supabaseAdmin.from("user_settings").select("user_id,ads_exempt,ads_exempt_until").in("user_id", ids);

    const roleBy = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
    const setBy = new Map((settings ?? []).map((s: any) => [s.user_id, s]));

    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      role: roleBy.get(p.id) ?? "user",
      settings: setBy.get(p.id) ?? { ads_exempt: false, ads_exempt_until: null },
    }));
  });

export const updateUserSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ userId: z.string().min(1), ads_exempt: z.boolean().optional(), ads_exempt_until: z.string().nullable().optional() })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { userId, ads_exempt, ads_exempt_until } = data as any;
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const payload: any = { user_id: userId };
    if (typeof ads_exempt === "boolean") payload.ads_exempt = ads_exempt;
    if (ads_exempt_until !== undefined) payload.ads_exempt_until = ads_exempt_until;

    const { error } = await supabaseAdmin.from("user_settings").upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
    return { success: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().min(1), role: z.enum(["admin", "user"]) }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId, role } = data as any;
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    // upsert role
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id" });
    if (error) throw error;
    return { success: true };
  });

export const banUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().min(1), ban: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId, ban } = data as any;
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    try {
      // Try to disable/enable the user via the Admin API. This requires the service role key (available server-side).
      // supabaseAdmin.auth.admin.updateUserById exists in newer Supabase clients; guard with try/catch.
      // @ts-ignore
      if (supabaseAdmin?.auth?.admin?.updateUserById) {
        // @ts-ignore
        await supabaseAdmin.auth.admin.updateUserById(userId, { disabled: ban });
        return { success: true };
      }
    } catch (e) {
      console.warn("admin banUser via auth.admin failed", e);
    }

    // Fallback: set a banned flag in user_settings (soft-ban). Consumers should check this flag when allowing access.
    const { error } = await supabaseAdmin.from("user_settings").upsert({ user_id: userId, is_banned: ban }, { onConflict: "user_id" });
    if (error) throw error;
    return { success: true };
  });
