import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CloudCog, Download, Loader2, PlugZap, Save } from "lucide-react";
import { toast } from "sonner";
import {
  FEED_PROVIDER_KEY,
  VIDEO_PROVIDERS,
  buildPlaybackUrl,
  providerSettingsQuery,
  saveProviderSettings,
  type ProviderConfig,
} from "@/lib/providers";
import { importLicensedFeed, testLicensedFeed } from "@/lib/feed.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  component: ProvidersPage,
  head: () => ({
    meta: [
      { title: "Streaming providers · Lumen admin" },
      {
        name: "description",
        content:
          "Connect licensed video CDNs — Cloudflare Stream, Mux and Bunny Stream — and import your licensed catalogue feed.",
      },
    ],
  }),
});

function ProvidersPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery(providerSettingsQuery());

  return (
    <main className="pb-24">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to catalogue
      </Link>

      <header className="mt-4">
        <h1 className="text-xl font-semibold md:text-2xl">Streaming providers</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Connect the licensed video hosts you stream from. Only public playback identifiers are
          stored here — private API keys stay out of the app. Once a provider is connected, every
          title just needs its asset ID and the player builds the authorized HLS URL.
        </p>
      </header>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {VIDEO_PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider.value}
              provider={provider}
              initial={settings?.[provider.value]?.config ?? {}}
              enabled={settings?.[provider.value]?.is_enabled ?? true}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["provider-settings"] })}
            />
          ))}
          <FeedCard
            initial={settings?.[FEED_PROVIDER_KEY]?.config ?? {}}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["provider-settings"] })}
          />
        </div>
      )}
    </main>
  );
}

function Card({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">{icon}</span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ProviderCard({
  provider,
  initial,
  enabled,
  onSaved,
}: {
  provider: (typeof VIDEO_PROVIDERS)[number];
  initial: ProviderConfig;
  enabled: boolean;
  onSaved: () => void;
}) {
  const [config, setConfig] = useState<ProviderConfig>(initial);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [testAsset, setTestAsset] = useState("");

  useEffect(() => setConfig(initial), [initial]);

  const save = useMutation({
    mutationFn: () => saveProviderSettings(provider.value, config, isEnabled),
    onSuccess: () => {
      toast.success(`${provider.label} connected`);
      onSaved();
    },
    onError: (error: { message?: string }) =>
      toast.error(error?.message ?? "Could not save provider"),
  });

  const preview = buildPlaybackUrl(provider.value, testAsset || "EXAMPLE_ASSET_ID", config);

  return (
    <Card
      title={provider.label}
      description={`Playback URLs are generated from each title's ${provider.assetLabel.toLowerCase()}.`}
      icon={<CloudCog className="size-4" />}
    >
      {provider.fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label>{field.label}</Label>
          <Input
            value={config[field.key] ?? ""}
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, [field.key]: event.target.value }))
            }
            placeholder={field.placeholder}
          />
          {field.hint ? (
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          ) : null}
        </div>
      ))}

      <div className="space-y-1.5">
        <Label>Test asset ID (optional)</Label>
        <Input
          value={testAsset}
          onChange={(event) => setTestAsset(event.target.value)}
          placeholder={provider.assetLabel}
        />
        <p className="break-all text-xs text-muted-foreground">
          {preview ? preview.url : "Fill in the fields above to preview a playback URL."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          Enabled
        </label>
        <Button
          className="rounded-full"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save
        </Button>
      </div>
    </Card>
  );
}

function FeedCard({ initial, onSaved }: { initial: ProviderConfig; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ProviderConfig>(initial);
  useEffect(() => setConfig(initial), [initial]);

  const save = useMutation({
    mutationFn: () => saveProviderSettings(FEED_PROVIDER_KEY, config, true),
    onSuccess: () => {
      toast.success("Licensed feed saved");
      onSaved();
    },
    onError: (error: { message?: string }) => toast.error(error?.message ?? "Could not save feed"),
  });

  const runTest = useServerFn(testLicensedFeed);
  const test = useMutation({
    mutationFn: () => runTest(),
    onSuccess: (result) =>
      toast.success(
        `Feed reachable — ${result.total} entries, ${result.playable}/5 sampled titles playable`,
      ),
    onError: (error: { message?: string }) => toast.error(error?.message ?? "Feed test failed"),
  });

  const runImport = useServerFn(importLicensedFeed);
  const importFeed = useMutation({
    mutationFn: () => runImport(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      toast.success(
        result.imported
          ? `${result.imported} licensed titles imported and playable`
          : `No playable entries found in ${result.total} feed items`,
      );
    },
    onError: (error: { message?: string }) => toast.error(error?.message ?? "Feed import failed"),
  });

  const fields: { key: string; label: string; placeholder: string; hint?: string }[] = [
    {
      key: "url",
      label: "Catalogue feed URL",
      placeholder: "https://api.your-licensor.com/v1/catalogue",
      hint: "Must return JSON. Requested server-side, so no CORS setup needed.",
    },
    {
      key: "token",
      label: "Access token (optional)",
      placeholder: "Bearer token or API key",
      hint: "Stored admin-only and only ever used from the server.",
    },
    {
      key: "token_header",
      label: "Token header name",
      placeholder: "Authorization",
    },
    {
      key: "items_path",
      label: "Items path (optional)",
      placeholder: "data.items",
      hint: "Where the array lives in the JSON response, if it isn't at the top level.",
    },
    {
      key: "default_provider",
      label: "Default provider for asset IDs",
      placeholder: "mux | cloudflare_stream | bunny_stream",
      hint: "Used when feed entries carry an asset ID instead of a full playback URL.",
    },
  ];

  return (
    <Card
      title="Licensed catalogue feed"
      description="Import every title you're licensed for, with playback URLs, in one run."
      icon={<PlugZap className="size-4" />}
    >
      {fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label>{field.label}</Label>
          <Input
            value={config[field.key] ?? ""}
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, [field.key]: event.target.value }))
            }
            placeholder={field.placeholder}
            {...(field.key === "token" ? { type: "password" as const } : {})}
          />
          {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <Button className="rounded-full" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save feed
        </Button>
        <Button
          variant="secondary"
          className="rounded-full"
          onClick={() => test.mutate()}
          disabled={test.isPending}
        >
          {test.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PlugZap className="size-4" />
          )}
          Test connection
        </Button>
        <Button
          variant="secondary"
          className="rounded-full"
          onClick={() => importFeed.mutate()}
          disabled={importFeed.isPending}
        >
          {importFeed.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Import catalogue
        </Button>
      </div>
    </Card>
  );
}
