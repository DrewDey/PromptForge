\set ON_ERROR_STOP on
ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;
UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
