\set ON_ERROR_STOP on

GRANT EXECUTE ON FUNCTION public.touch_build_request_on_response()
  TO authenticated;

UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
