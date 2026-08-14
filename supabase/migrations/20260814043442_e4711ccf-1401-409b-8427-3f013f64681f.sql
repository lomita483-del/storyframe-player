ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS embed_url text,
  ADD COLUMN IF NOT EXISTS embed_provider text,
  ADD COLUMN IF NOT EXISTS where_to_watch jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.movies
  ADD CONSTRAINT movies_embed_provider_check
  CHECK (embed_provider IS NULL OR embed_provider IN ('youtube','vimeo','cloudflare'));