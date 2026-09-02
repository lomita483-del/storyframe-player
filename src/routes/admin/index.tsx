import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminIndex,
});

function AdminIndex() {
  const list = useServerFn(listUsers);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Admin Console</h1>
      <p className="mt-2 text-sm text-muted-foreground">Quick links</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/admin/movies">Manage Movies</Link>
        </Button>
        <Button asChild>
          <Link to="/admin/media">Media Library</Link>
        </Button>
        <Button asChild>
          <Link to="/admin/users">Manage Users</Link>
        </Button>
        <Button asChild>
          <Link to="/admin/sync">Sync Catalogue</Link>
        </Button>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Recent users</h2>
        <div className="mt-4">
          {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No users yet</p>}
          <ul className="mt-3 space-y-2">
            {list.data?.slice(0, 10).map((u: any) => (
              <li key={u.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-semibold">{u.display_name ?? u.id}</div>
                  <div className="text-sm text-muted-foreground">Role: {u.role}</div>
                </div>
                <div className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
