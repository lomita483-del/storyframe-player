@@
 export async function saveProgress(args: {
   userId: string;
   movieId: string;
   progressSeconds: number;
   durationSeconds?: number | null;
 }) {
@@
   // Persist a play record for trending/metrics
   try {
-    await supabase.from("plays").insert({ user_id: args.userId, movie_id: args.movieId, seconds_played: Math.floor(args.progressSeconds) });
+    // Only insert plays if user is present; don't insert anonymous plays to avoid noise
+    if (args.userId) {
+      await supabase.from("plays").insert({ user_id: args.userId, movie_id: args.movieId, seconds_played: Math.floor(args.progressSeconds) });
+    }
   } catch (e) {
     // non-fatal
     console.warn("Failed to insert plays record", e);
   }
 }
