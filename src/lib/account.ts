import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export const profileQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["profile", userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,created_at")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

export async function saveProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" });
  if (error) throw error;
}

/* ---------------- local device preferences ---------------- */

export type Preferences = {
  autoplayNext: boolean;
  autoplayPreviews: boolean;
  dataSaver: boolean;
  subtitles: boolean;
  notifyNewEpisodes: boolean;
  quality: "auto" | "480p" | "720p" | "1080p";
};

export const DEFAULT_PREFERENCES: Preferences = {
  autoplayNext: true,
  autoplayPreviews: true,
  dataSaver: false,
  subtitles: true,
  notifyNewEpisodes: true,
  quality: "auto",
};

const PREFS_KEY = "lumen.preferences";
const DOWNLOADS_KEY = "lumen.downloads";

export function readPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(prefs: Preferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export type SavedForOffline = {
  slug: string;
  title: string;
  poster_url: string | null;
  savedAt: string;
};

export function readDownloads(): SavedForOffline[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DOWNLOADS_KEY);
    return raw ? (JSON.parse(raw) as SavedForOffline[]) : [];
  } catch {
    return [];
  }
}

export function writeDownloads(items: SavedForOffline[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(items));
}
