@@
 import {
   fetchAutoStreamUrl,
   type DirectStreamResult,
 } from "@/lib/scrapers/streamResolver";
+import { saveProgress } from "@/lib/movies";
+import { movieBySlugQuery } from "@/lib/movies";
+import { useAuth } from "@/hooks/useAuth";
@@
 export const Route = createFileRoute("/watch/$slug")({
@@
 function WatchSlugPage() {
@@
   const params = Route.useParams();
   const search = Route.useSearch();
+  const { user } = useAuth();
@@
-  const videoRef = useRef<HTMLVideoElement | null>(null);
+  const videoRef = useRef<HTMLVideoElement | null>(null);
   const hlsRef = useRef<Hls | null>(null);
+  const { data: movie } = useQuery(movieBySlugQuery(params.slug));
@@
   useEffect(() => {
     resolveStream();
@@
   }, [tmdbId, displayTitle, type, season, episode]);
+
+  /* Persist progress periodically */
+  useEffect(() => {
+    const video = videoRef.current;
+    if (!video) return;
+
+    let timer: number | undefined;
+    const onTime = () => {
+      // throttle writes: every 30s
+      if (timer) return;
+      timer = window.setTimeout(async () => {
+        timer = undefined;
+        try {
+          if (user?.id && movie?.id && video.currentTime) {
+            await saveProgress({ userId: user.id, movieId: movie.id, progressSeconds: Math.floor(video.currentTime), durationSeconds: isFinite(video.duration) ? Math.floor(video.duration) : null });
+          }
+        } catch (e) {
+          console.warn("saveProgress failed", e);
+        }
+      }, 30_000);
+    };
+
+    video.addEventListener("timeupdate", onTime);
+
+    const onUnload = async () => {
+      try {
+        if (user?.id && movie?.id && video.currentTime) {
+          await saveProgress({ userId: user.id, movieId: movie.id, progressSeconds: Math.floor(video.currentTime), durationSeconds: isFinite(video.duration) ? Math.floor(video.duration) : null });
+        }
+      } catch (e) {
+        console.warn("saveProgress unload failed", e);
+      }
+    };
+
+    window.addEventListener("beforeunload", onUnload);
+
+    return () => {
+      video.removeEventListener("timeupdate", onTime);
+      window.removeEventListener("beforeunload", onUnload as any);
+      if (timer) window.clearTimeout(timer);
+    };
+  }, [user, movie]);
@@
   return (
