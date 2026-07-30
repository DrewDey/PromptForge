\set ON_ERROR_STOP on

DO $test$
BEGIN
  IF (
    SELECT fingerprint
    FROM public.test_request_authority_preflight_snapshot
    WHERE singleton
  ) IS DISTINCT FROM public.test_request_authority_legacy_fingerprint() THEN
    RAISE EXCEPTION
      'Failed migration execution changed legacy data or catalog authority.';
  END IF;
END;
$test$;
