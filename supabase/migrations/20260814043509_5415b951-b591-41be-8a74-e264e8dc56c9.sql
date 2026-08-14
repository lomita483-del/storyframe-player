CREATE POLICY "Anyone can read media objects"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'media');

CREATE POLICY "Admins upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role));