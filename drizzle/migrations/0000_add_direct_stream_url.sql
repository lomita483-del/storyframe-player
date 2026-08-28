ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS direct_stream_url text;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS direct_stream_url text;