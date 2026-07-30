\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION public.touch_build_request_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE build_requests
  SET updated_at = NOW(),
      status = CASE WHEN status = 'open' THEN 'answered' ELSE status END
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.touch_build_request_on_response()
  FROM PUBLIC, anon, authenticated, service_role;

UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
