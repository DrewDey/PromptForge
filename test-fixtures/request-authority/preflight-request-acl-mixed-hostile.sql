\set ON_ERROR_STOP on
GRANT ALL PRIVILEGES ON TABLE public.build_requests TO service_role;
UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
