-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Allows the very first account to become admin so the dashboard can be tested.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Timestamps helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Genres
CREATE TABLE public.genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.genres TO anon, authenticated;
GRANT ALL ON public.genres TO service_role;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Genres are public" ON public.genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage genres" ON public.genres FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Movies
CREATE TABLE public.movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  poster_url text,
  backdrop_url text,
  video_url text,
  video_type text NOT NULL DEFAULT 'mp4',
  subtitle_url text,
  trailer_url text,
  genre text,
  release_year integer,
  runtime integer,
  rating numeric(3,1),
  quality text DEFAULT '1080p',
  "cast" text[] NOT NULL DEFAULT '{}',
  director text,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_trending boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX movies_published_idx ON public.movies (is_published, created_at DESC);
CREATE INDEX movies_genre_idx ON public.movies (genre);
CREATE INDEX movies_year_idx ON public.movies (release_year);
CREATE INDEX movies_trending_idx ON public.movies (is_trending) WHERE is_trending;
GRANT SELECT ON public.movies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movies TO authenticated;
GRANT ALL ON public.movies TO service_role;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published movies are public" ON public.movies FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "Admins read all movies" ON public.movies FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert movies" ON public.movies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update movies" ON public.movies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete movies" ON public.movies FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER movies_updated_at BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Watch history
CREATE TABLE public.watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  progress_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, movie_id)
);
CREATE INDEX watch_history_user_idx ON public.watch_history (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_history TO authenticated;
GRANT ALL ON public.watch_history TO service_role;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watch history" ON public.watch_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER watch_history_updated_at BEFORE UPDATE ON public.watch_history FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Watchlists
CREATE TABLE public.watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, movie_id)
);
CREATE INDEX watchlists_user_idx ON public.watchlists (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlists TO authenticated;
GRANT ALL ON public.watchlists TO service_role;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlist" ON public.watchlists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed genres
INSERT INTO public.genres (name, slug) VALUES
  ('Science Fiction','science-fiction'),
  ('Drama','drama'),
  ('Thriller','thriller'),
  ('Animation','animation'),
  ('Action','action'),
  ('Documentary','documentary'),
  ('Comedy','comedy'),
  ('Adventure','adventure');

-- Seed demo movies (freely licensed open-source demo streams)
INSERT INTO public.movies (title, slug, description, poster_url, backdrop_url, video_url, video_type, trailer_url, genre, release_year, runtime, rating, quality, "cast", director, is_published, is_featured, is_trending) VALUES
('Orbital Drift','orbital-drift','A stranded engineer aboard a decaying research station must repair her only route home before the orbit decays for good.','/images/poster-orbital-drift.jpg','/images/backdrop-orbital-drift.jpg','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','hls','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4','Science Fiction',2024,128,8.7,'1080p','{"Amara Osei","Leon Vasquez","Rin Takahashi"}','Dana Whitfield',true,true,true),
('The Quiet Coast','the-quiet-coast','Two estranged siblings return to their family''s shuttered seaside inn and confront the summer that split them apart.','/images/poster-quiet-coast.jpg','/images/backdrop-quiet-coast.jpg','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4','mp4','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4','Drama',2023,112,7.9,'1080p','{"Marta Lindqvist","Owen Brady"}','Sofia Marchetti',true,false,true),
('Neon Hollow','neon-hollow','A night-shift dispatcher picks up a call that should not exist, pulling her into a conspiracy beneath the city.','/images/poster-neon-hollow.jpg','/images/backdrop-neon-hollow.jpg','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4','mp4','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4','Thriller',2025,101,8.2,'4K','{"Iris Cole","Danny Mbeki","Petra Novak"}','Julian Reyes',true,false,true),
('Paper Lanterns','paper-lanterns','A young inventor builds a machine that carries wishes on light, and learns what it costs to let them go.','/images/poster-paper-lanterns.jpg','/images/backdrop-paper-lanterns.jpg','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4','mp4','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4','Animation',2022,96,8.4,'1080p','{"Yuki Mori","Ana Ferreira"}','Hiro Tanabe',true,false,false),
('Last Signal','last-signal','After a blackout silences an entire valley, a radio technician races to find the source before dawn.','/images/poster-last-signal.jpg','/images/backdrop-last-signal.jpg','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4','mp4','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4','Action',2024,118,7.6,'1080p','{"Grace Okonkwo","Tomas Berg","Nadia Rahal"}','Elena Duarte',true,false,false),
('Salt & Static','salt-and-static','An unfinished draft: a documentary crew follows the last shortwave operators on a windswept island.','/images/poster-salt-static.jpg','/images/backdrop-salt-static.jpg','https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4','mp4',NULL,'Documentary',2026,88,7.1,'720p','{"Field Crew"}','Unknown',false,false,false);