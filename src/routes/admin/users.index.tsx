import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, updateUserSettings, setUserRole, banUser } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/users")({
  component: UsersAdmin,
});

function UsersAdmin() {
  const auth = useAuth();
  const list = useServerFn(listUsers);
  const update = useServerFn(updateUserSettings);
  const setRole = useServerFn(setUserRole);
  const ban = useServerFn(banUser);
  const [query, setQuery] = useState("");

  const users = (list.data ?? []).filter((u: any) => {
    if (!query) return true;
    return (u.display_name ?? u.id).toLowerCase().includes(query.toLowerCase());
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      <div className="mt-4 flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" className="flex-1 rounded border px-3 py-2" />
        <Button onClick={() => list.refetch()}>Refresh</Button>
      </div>

      <ul className="mt-4 space-y-3">
        {users.map((u: any) => (
          <li key={u.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-semibold">{u.display_name ?? u.id}</div>
              <div className="text-sm text-muted-foreground">Role: {u.role}</div>
              <div className="text-sm text-muted-foreground">Ads free: {u.settings?.ads_exempt ? 'Yes' : 'No'}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void setRole.mutate({ userId: u.id, role: u.role === 'admin' ? 'user' : 'admin' }).then(() => list.refetch())}>
                {u.role === 'admin' ? 'Demote' : 'Promote'}
              </Button>
              <Button size="sm" onClick={() => void update.mutate({ userId: u.id, ads_exempt: !u.settings?.ads_exempt }).then(() => list.refetch())}>
                Toggle Ads-Free
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void ban.mutate({ userId: u.id, ban: true }).then(() => list.refetch())}>
                Ban
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
