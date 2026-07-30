\set ON_ERROR_STOP on

ALTER FUNCTION public.touch_build_request_on_response()
  SET search_path TO pg_catalog, public;

UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
