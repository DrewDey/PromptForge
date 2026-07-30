\set ON_ERROR_STOP on
CREATE ROLE request_storage_rogue NOLOGIN;
GRANT SELECT ON TABLE storage.objects TO request_storage_rogue;
UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
