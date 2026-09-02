@@
 export const Route = createFileRoute("/admin/movies")({ component: AdminMovies });
 
 function AdminMovies() {
-  const { data: movies, isLoading } = useQuery(adminMoviesQuery());
+  const [term, setTerm] = useState("");
+  const { data: movies, isLoading } = useQuery(term ? searchMoviesQuery(term) : adminMoviesQuery());
 
   return (
     <main className="mx-auto max-w-5xl p-6">
-      <div className="flex items-center justify-between">
-        <h1 className="text-2xl font-bold">Movies</h1>
-        <Button asChild>
-          <Link to="/admin/media">Media Library</Link>
-        </Button>
-      </div>
+      <div className="flex items-center justify-between">
+        <h1 className="text-2xl font-bold">Movies</h1>
+        <div className="flex items-center gap-2">
+          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search movies" className="rounded border px-3 py-2" />
+          <Button asChild>
+            <Link to="/admin/media">Media Library</Link>
+          </Button>
+        </div>
+      </div>
@@
-        <ul className="mt-3 space-y-2">
-          {movies?.map((m: any) => (
+        <ul className="mt-3 space-y-2">
+          {movies?.map((m: any) => (
             <li key={m.id} className="flex items-center justify-between rounded-md border p-3">
               <div>
                 <div className="font-semibold">{m.title}</div>
                 <div className="text-sm text-muted-foreground">{m.genre} · {m.release_year}</div>
               </div>
               <div className="flex gap-2">
                 <Button asChild><Link to={`/movie/${m.slug}`}>Open</Link></Button>
                 <Button asChild><Link to={`/admin/media?movieId=${m.id}`}>Edit media</Link></Button>
               </div>
             </li>
           ))}
         </ul>
       </div>
     </main>
   );
 }
