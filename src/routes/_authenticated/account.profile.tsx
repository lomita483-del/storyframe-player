import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { profileQuery, saveProfile } from "@/lib/account";
import { AccountPageShell } from "@/components/AccountPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/account/profile")({
  head: () => ({
    meta: [
      { title: "Edit Profile — Lumen" },
      { name: "description", content: "Update your Lumen display name and avatar." },
      { property: "og:title", content: "Edit Profile — Lumen" },
      { property: "og:description", content: "Update your Lumen display name and avatar." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery(profileQuery(user?.id));
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
  }, [profile]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user.id, {
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountPageShell title="Edit profile" description="This is how you appear across Lumen.">
      {isLoading ? (
        <div className="grid min-h-[30svh] place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border bg-surface/60 p-5">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-16 rounded-full object-cover" />
            ) : (
              <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-xl font-bold">
                {(displayName || user?.email || "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 text-xs text-muted-foreground">
              <p className="truncate">{user?.email}</p>
              <p>Sign-in email can't be changed here.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Michael Victor"
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar-url">Avatar image URL</Label>
            <Input
              id="avatar-url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/me.jpg"
            />
          </div>

          <Button type="submit" disabled={saving} className="rounded-full">
            {saving && <Loader2 className="size-4 animate-spin" />} Save changes
          </Button>
        </form>
      )}
    </AccountPageShell>
  );
}
