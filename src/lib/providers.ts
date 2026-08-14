import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Licensed video hosts (CDNs) we can build authorized playback URLs for.
 * Only playback identifiers live in the app — private API keys never do.
 */
export const VIDEO_PROVIDERS = [
  {
    value: "cloudflare_stream",
    label: "Cloudflare Stream",
    assetLabel: "Video UID",
    fields: [
      {
        key: "customer_code",
        label: "Customer subdomain code",
        placeholder: "abcd1234efgh5678",
        hint: "Found in your Stream embed URL: customer-<code>.cloudflarestream.com",
      },
    ],
  },
  {
    value: "mux",
    label: "Mux",
    assetLabel: "Playback ID",
    fields: [
      {
        key: "env",
        label: "Environment label (optional)",
        placeholder: "production",
        hint: "Only used for your own reference.",
      },
    ],
  },
  {
    value: "bunny_stream",
    label: "Bunny Stream",
    assetLabel: "Video ID (GUID)",
    fields: [
      { key: "library_id", label: "Video library ID", placeholder: "123456", hint: "" },
      {
        key: "pull_zone",
        label: "Pull zone hostname",
        placeholder: "vz-abc123.b-cdn.net",
        hint: "The CDN hostname Bunny gives your video library.",
      },
    ],
  },
] as const;

export type VideoProvider = (typeof VIDEO_PROVIDERS)[number]["value"];

export type ProviderConfig = Record<string, string>;

export type ProviderSettingsRow = {
  id: string;
  provider: string;
  config: ProviderConfig;
  is_enabled: boolean;
  updated_at: string;
};

export const FEED_PROVIDER_KEY = "licensed_feed";

/** Build the authorized HLS playback URL for a provider asset. */
export function buildPlaybackUrl(
  provider: string | null | undefined,
  assetId: string | null | undefined,
  config: ProviderConfig = {},
): { url: string; type: "hls" } | null {
  const id = assetId?.trim();
  if (!provider || !id) return null;

  if (provider === "cloudflare_stream") {
    const code = config["customer_code"]?.trim();
    if (!code) return null;
    return {
      url: `https://customer-${code}.cloudflarestream.com/${id}/manifest/video.m3u8`,
      type: "hls",
    };
  }
  if (provider === "mux") {
    return { url: `https://stream.mux.com/${id}.m3u8`, type: "hls" };
  }
  if (provider === "bunny_stream") {
    const zone = config["pull_zone"]?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!zone) return null;
    return { url: `https://${zone}/${id}/playlist.m3u8`, type: "hls" };
  }
  return null;
}

/** Optional official iframe player, used as a fallback when direct HLS is blocked. */
export function providerEmbedUrl(
  provider: string | null | undefined,
  assetId: string | null | undefined,
  config: ProviderConfig = {},
) {
  const id = assetId?.trim();
  if (!provider || !id) return null;
  if (provider === "cloudflare_stream") {
    const code = config["customer_code"]?.trim();
    return code ? `https://customer-${code}.cloudflarestream.com/${id}/iframe` : null;
  }
  if (provider === "bunny_stream") {
    const library = config["library_id"]?.trim();
    return library ? `https://iframe.mediadelivery.net/embed/${library}/${id}` : null;
  }
  return null;
}

function normalizeRow(row: Record<string, unknown>): ProviderSettingsRow {
  const config = (row["config"] ?? {}) as Record<string, unknown>;
  const clean: ProviderConfig = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") clean[key] = value;
  }
  return {
    id: String(row["id"]),
    provider: String(row["provider"]),
    config: clean,
    is_enabled: Boolean(row["is_enabled"]),
    updated_at: String(row["updated_at"] ?? ""),
  };
}

/** Admin-only: every configured provider keyed by provider name. */
export function providerSettingsQuery() {
  return queryOptions({
    queryKey: ["provider-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_settings")
        .select("id,provider,config,is_enabled,updated_at");
      if (error) throw error;
      const map: Record<string, ProviderSettingsRow> = {};
      for (const row of data ?? []) {
        const normalized = normalizeRow(row as Record<string, unknown>);
        map[normalized.provider] = normalized;
      }
      return map;
    },
  });
}

export async function saveProviderSettings(
  provider: string,
  config: ProviderConfig,
  isEnabled = true,
) {
  const { error } = await supabase
    .from("provider_settings")
    .upsert({ provider, config, is_enabled: isEnabled }, { onConflict: "provider" });
  if (error) throw error;
}
