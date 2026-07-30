\set ON_ERROR_STOP on

DO $test$
DECLARE
  fixture public.test_request_cleanup_claim_wait%ROWTYPE;
BEGIN
  SELECT * INTO STRICT fixture
  FROM public.test_request_cleanup_claim_wait
  WHERE singleton;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
    WHERE cleanup_claim.id = fixture.cleanup_claim_id
      AND cleanup_claim.claim_version = fixture.claim_version + 1
      AND cleanup_claim.owner_lease_until > clock_timestamp()
      AND cleanup_claim.resolved_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'Post-wait cleanup claim did not refresh its version and lease.';
  END IF;
END;
$test$;
