@@
 export function useIsAdmin(userId?: string) {
   return useQuery({
     queryKey: ["is-admin", userId ?? "anon"],
     enabled: Boolean(userId),
     queryFn: async () => {
-      const { data, error } = await supabase
-        .from("user_roles")
-        .select("role")
-        .eq("role", "admin")
-        .limit(1);
-      if (error) throw error;
-      return (data?.length ?? 0) > 0;
+      const { data, error } = await supabase
+        .from("user_roles")
+        .select("role")
+        .eq("user_id", userId)
+        .eq("role", "admin")
+        .limit(1);
+      if (error) throw error;
+      return (data?.length ?? 0) > 0;
     },
   });
 }
