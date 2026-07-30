\set ON_ERROR_STOP on

CREATE VIEW public.build_request_decoy_dependency AS
SELECT id, title, author_id
FROM public.build_requests;

UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
