import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  DEFAULT_PREFERENCES,
  readPreferences,
  writePreferences,
  type Preferences,
} from "@/lib/account";
import { AccountPageShell } from "@/components/AccountPageShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/account/settings")({
  head: () => ({
    meta: [
      { title: "Playback & Settings — Lumen" },
      { name: "description", content: "Control autoplay, streaming quality, subtitles and notifications." },
      { property: "og:title", content: "Playback & Settings — Lumen" },
      { property: "og:description", content: "Control autoplay, quality, subtitles and notifications." },
    ],
  }),
  component: SettingsPage,
});

const TOGGLES: { key: keyof Preferences; label: string; hint: string }[] = [
  { key: "autoplayNext", label: "Autoplay next episode", hint: "Continue series automatically." },
  { key: "autoplayPreviews", label: "Autoplay previews", hint: "Play trailers while browsing." },
  { key: "subtitles", label: "Subtitles by default", hint: "Enable captions when available." },
  { key: "dataSaver", label: "Data saver", hint: "Lower bitrate on mobile networks." },
  { key: "notifyNewEpisodes", label: "New episode alerts", hint: "Notify me about titles on my list." },
];

function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => setPrefs(readPreferences()), []);

  function update(patch: Partial<Preferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    writePreferences(next);
  }

  return (
    <AccountPageShell title="Playback & settings" description="Saved on this device.">
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
        {TOGGLES.map((toggle) => (
          <div key={toggle.key} className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <Label htmlFor={toggle.key} className="text-sm font-medium">
                {toggle.label}
              </Label>
              <p className="text-xs text-muted-foreground">{toggle.hint}</p>
            </div>
            <Switch
              id={toggle.key}
              checked={Boolean(prefs[toggle.key])}
              onCheckedChange={(checked) => update({ [toggle.key]: checked } as Partial<Preferences>)}
            />
          </div>
        ))}

        <div className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <Label className="text-sm font-medium">Streaming quality</Label>
            <p className="text-xs text-muted-foreground">Higher quality uses more data.</p>
          </div>
          <Select
            value={prefs.quality}
            onValueChange={(value) => update({ quality: value as Preferences["quality"] })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["auto", "480p", "720p", "1080p"] as const).map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "auto" ? "Auto" : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        variant="secondary"
        className="mt-6 rounded-full"
        onClick={() => {
          setPrefs(DEFAULT_PREFERENCES);
          writePreferences(DEFAULT_PREFERENCES);
          toast.success("Settings reset to defaults");
        }}
      >
        Reset to defaults
      </Button>
    </AccountPageShell>
  );
}
