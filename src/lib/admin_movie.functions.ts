import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const updateMovieMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        movieId: z.string().min(1),
        video_url: z.string().nullable().optional(),
        embed_url: z.string().nullable().optional(),
        subtitle_url: z.string().nullable().optional(),
        trailer_url: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { movieId, video_url, embed_url, subtitle_url, trailer_url } = data as any;
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const patch: any = {};
    if (video_url !== undefined) patch.video_url = video_url;
    if (embed_url !== undefined) patch.embed_url = embed_url;
    if (subtitle_url !== undefined) patch.subtitle_url = subtitle_url;
    if (trailer_url !== undefined) patch.trailer_url = trailer_url;

    const { error } = await supabaseAdmin.from("movies").update(patch as never).eq("id", movieId);
    if (error) throw error;
    return { success: true };
  });
