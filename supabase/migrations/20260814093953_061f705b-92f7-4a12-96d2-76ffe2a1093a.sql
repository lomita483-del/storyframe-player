ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_asset_id text,
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS movies_external_id_key ON public.movies (external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.provider_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL UNIQUE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_settings TO authenticated;
GRANT ALL ON public.provider_settings TO service_role;

ALTER TABLE public.provider_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage provider settings" ON public.provider_settings;
CREATE POLICY "Admins manage provider settings"
  ON public.provider_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_provider_settings_updated_at ON public.provider_settings;
CREATE TRIGGER update_provider_settings_updated_at
  BEFORE UPDATE ON public.provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();