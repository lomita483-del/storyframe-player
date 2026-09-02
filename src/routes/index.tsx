@@
 import { Loader2 } from "lucide-react";
 import { useServerFn } from "@tanstack/react-start";
 import { publishedMoviesQuery, watchHistoryQuery, type Movie } from "@/lib/movies";
+import { AdBanner } from "@/components/AdBanner";
@@
   return (
     <main className="pb-24">
       <Hero movie={featured} />
-
+      <AdBanner />
+      
       <div className="mt-2 space-y-10 md:mt-6 md:space-y-14">
         {continueWatching.length > 0 && (
@@
-        <MovieRow title="Trending now" subtitle="What people are watching" movies={trending} />
-        <MovieRow title="TV shows & series" subtitle="Binge by season" movies={shows} />
-        <MovieRow title="Movies" subtitle="Feature films" movies={films} />
-        <MovieRow title="Latest releases" movies={latest} />
-        <MovieRow title="Top rated on Lumen" subtitle="Highest rated titles" movies={popular} />
+        <MovieRow title="Trending now" subtitle="What people are watching" movies={trending} />
+        <MovieRow title="Upcoming releases" subtitle="Release dates and previews" movies={upcoming} />
+        <MovieRow title="Most rated" subtitle="Top by user rating" movies={mostRated} />
+        <MovieRow title="TV shows & series" subtitle="Binge by season" movies={shows} />
+        <MovieRow title="Movies" subtitle="Feature films" movies={films} />
+        <MovieRow title="Latest releases" movies={latest} />
+        <MovieRow title="Top rated on Lumen" subtitle="Highest rated titles" movies={popular} />
+
+        <MovieRow title="Anime" subtitle="Japanese animation" movies={anime} />
+        <MovieRow title="Cartoons & animation" subtitle="Family friendly" movies={cartoons} />
@@
   const genres = [...new Set(list.map((m) => m.genre).filter(Boolean))] as string[];
   const byGenre = (genre: string) => list.filter((m) => m.genre === genre);
+  const today = new Date();
+  const upcoming = list.filter((m) => m.release_date && new Date(m.release_date) > today).sort((a, b) => (new Date(a.release_date!).getTime() - new Date(b.release_date!).getTime()));
+  const mostRated = [...list].filter((m) => (m.rating_count ?? 0) >= 3).sort((a, b) => (b.average_rating ?? b.rating ?? 0) - (a.average_rating ?? a.rating ?? 0));
+  const anime = list.filter((m) => (m as any).content_kind === 'anime' || (m.genre && String(m.genre).toLowerCase().includes('anime')));
+  const cartoons = list.filter((m) => (m as any).content_kind === 'cartoon' || (m.genre && String(m.genre).toLowerCase().includes('animation')));
@@
 }
