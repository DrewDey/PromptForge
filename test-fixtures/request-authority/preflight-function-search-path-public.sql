\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION public.update_build_request_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE build_requests
    SET vote_count = vote_count + 1,
        updated_at = NOW()
    WHERE id = NEW.request_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE build_requests
    SET vote_count = GREATEST(vote_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_build_request_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  UPDATE build_requests
  SET updated_at = NOW(),
      status = CASE WHEN status = 'open' THEN 'answered' ELSE status END
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_build_request_vote_count(),
  public.touch_build_request_on_response()
  FROM PUBLIC, anon, authenticated, service_role;

UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
