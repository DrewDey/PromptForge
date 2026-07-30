\set ON_ERROR_STOP on
ALTER ROLE authenticated BYPASSRLS;
UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
