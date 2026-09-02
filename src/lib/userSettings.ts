import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const userSettingsQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["user-settings", userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("user_settings").select("ads_exempt,ads_exempt_until,is_banned").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ?? { ads_exempt: false, ads_exempt_until: null, is_banned: false };
    },
  });
