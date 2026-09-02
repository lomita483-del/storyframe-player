-- 2026-09-02_add_ratings_plays_user_settings.sql
BEGIN;

-- Ratings table (users from auth.schema)
CREATE TABLE IF NOT EXISTS public.ratings (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  movie_id text NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ratings_user_movie ON public.ratings(user_id, movie_id);

-- Plays table to track recent plays for trending
CREATE TABLE IF NOT EXISTS public.plays (
  id bigserial PRIMARY KEY,
  user_id uuid,
  movie_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  seconds_played integer DEFAULT 0
);

-- Add release_date to movies to support upcoming titles
ALTER TABLE IF EXISTS public.movies
  ADD COLUMN IF NOT EXISTS release_date date;

-- Optional denormalized aggregates on movies
ALTER TABLE IF EXISTS public.movies
  ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0;

-- Per-user settings table (ads exemption, etc.)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ads_exempt boolean DEFAULT false,
  ads_exempt_until timestamptz
);

-- Trigger function to maintain aggregated rating values on movies
CREATE OR REPLACE FUNCTION public.update_movie_rating_aggregates() RETURNS trigger AS $$
BEGIN
  PERFORM 1;
  -- Determine affected movie id based on INSERT/UPDATE/DELETE
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.movies
    SET
      rating_count = COALESCE((SELECT COUNT(1) FROM public.ratings WHERE movie_id = OLD.movie_id), 0),
      average_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM public.ratings WHERE movie_id = OLD.movie_id), 0)
    WHERE id = OLD.movie_id;
    RETURN OLD;
  ELSE
    UPDATE public.movies
    SET
      rating_count = COALESCE((SELECT COUNT(1) FROM public.ratings WHERE movie_id = NEW.movie_id), 0),
      average_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM public.ratings WHERE movie_id = NEW.movie_id), 0)
    WHERE id = NEW.movie_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ratings_after_change ON public.ratings;
CREATE TRIGGER ratings_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.update_movie_rating_aggregates();

COMMIT;
