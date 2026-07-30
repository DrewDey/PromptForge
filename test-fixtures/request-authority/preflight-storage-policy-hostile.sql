\set ON_ERROR_STOP on
CREATE POLICY "Unexpected storage object policy"
  ON storage.objects FOR SELECT TO authenticated USING (TRUE);
UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
