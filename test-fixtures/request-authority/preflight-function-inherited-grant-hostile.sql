\set ON_ERROR_STOP on

CREATE ROLE request_authority_execute_parent NOLOGIN;
GRANT request_authority_execute_parent TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_build_request_on_response()
  TO request_authority_execute_parent;

UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
