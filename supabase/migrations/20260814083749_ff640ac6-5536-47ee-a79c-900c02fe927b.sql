-- movies: TMDB + media type
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS tmdb_id integer,
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'movie',
  ADD COLUMN IF NOT EXISTS popularity numeric,
  ADD COLUMN IF NOT EXISTS first_air_date date,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_imported boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS movies_tmdb_unique ON public.movies (media_type, tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS movies_media_type_idx ON public.movies (media_type);

-- seasons
CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  tmdb_id integer,
  season_number integer NOT NULL,
  name text,
  overview text,
  poster_url text,
  episode_count integer,
  air_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movie_id, season_number)
);

GRANT SELECT ON public.seasons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons of published titles are public" ON public.seasons
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.movies m WHERE m.id = seasons.movie_id AND m.is_published));

CREATE POLICY "Admins read all seasons" ON public.seasons
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert seasons" ON public.seasons
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update seasons" ON public.seasons
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete seasons" ON public.seasons
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER seasons_updated_at BEFORE UPDATE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- episodes
CREATE TABLE IF NOT EXISTS public.episodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  tmdb_id integer,
  season_number integer NOT NULL,
  episode_number integer NOT NULL,
  name text,
  overview text,
  still_url text,
  air_date date,
  runtime integer,
  rating numeric,
  video_url text,
  video_type text NOT NULL DEFAULT 'mp4',
  embed_url text,
  embed_provider text,
  subtitle_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, episode_number)
);

GRANT SELECT ON public.episodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episodes TO authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Episodes of published titles are public" ON public.episodes
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.movies m WHERE m.id = episodes.movie_id AND m.is_published));

CREATE POLICY "Admins read all episodes" ON public.episodes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert episodes" ON public.episodes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update episodes" ON public.episodes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete episodes" ON public.episodes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER episodes_updated_at BEFORE UPDATE ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS episodes_movie_idx ON public.episodes (movie_id, season_number, episode_number);

-- sync log
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL DEFAULT 'tmdb',
  status text NOT NULL DEFAULT 'running',
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sync_runs TO authenticated;
GRANT ALL ON public.sync_runs TO service_role;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sync runs" ON public.sync_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sync_runs_updated_at BEFORE UPDATE ON public.sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
