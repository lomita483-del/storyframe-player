import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toggleWatchlist } from "@/lib/movies";
import { Button } from "@/components/ui/button";

export function WatchlistButton({
  movieId,
  variant = "secondary",
}: {
  movieId: string;
  variant?: "secondary" | "ghost";
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: saved } = useQuery({
    queryKey: ["watchlist-entry", user?.id ?? "anon", movieId],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watchlists")
        .select("id")
        .eq("movie_id", movieId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("not signed in");
      return toggleWatchlist(user.id, movieId, Boolean(saved));
    },
    onSuccess: (nowSaved) => {
      toast.success(nowSaved ? "Added to your list" : "Removed from your list");
      queryClient.invalidateQueries({ queryKey: ["watchlist-entry"] });
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
    onError: () => toast.error("Could not update your list"),
  });

  if (!user) {
    return (
      <Button asChild variant={variant} size="lg" className="rounded-full">
        <Link to="/auth">
          <Bookmark className="size-4" /> Add to Watchlist
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size="lg"
      className="rounded-full"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {saved ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
      {saved ? "In your list" : "Add to Watchlist"}
    </Button>
  );
}
