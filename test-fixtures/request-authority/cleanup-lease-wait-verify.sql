\set ON_ERROR_STOP on

DO $test$
DECLARE
  fixture public.test_request_cleanup_claim_race%ROWTYPE;
  prior_claim public.test_request_cleanup_lease_wait%ROWTYPE;
  takeover JSONB;
BEGIN
  SELECT * INTO STRICT fixture
  FROM public.test_request_cleanup_claim_race
  WHERE singleton;
  SELECT * INTO STRICT prior_claim
  FROM public.test_request_cleanup_lease_wait
  WHERE singleton;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
    WHERE cleanup_claim.id = prior_claim.cleanup_claim_id
      AND cleanup_claim.claim_version = prior_claim.claim_version
      AND cleanup_claim.resolved_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Blocked stale-time abort mutated the cleanup claim.';
  END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  takeover := public.claim_build_request_delivery_artifact_cleanup_v1(
    1,
    fixture.request_id,
    fixture.delivery_revision_id,
    fixture.artifact_id,
    'cleanup-lease-wait-claim-0001'
  );
  IF (takeover->>'claimVersion')::INTEGER <>
      prior_claim.claim_version + 1 THEN
    RAISE EXCEPTION 'Expired same-key cleanup takeover did not advance fencing.';
  END IF;
  PERFORM public.abort_build_request_delivery_artifact_cleanup_v1(
    1,
    (takeover->>'cleanupClaimId')::UUID,
    (takeover->>'claimVersion')::INTEGER,
    'cleanup-lease-wait-abort-takeover-0001'
  );
END;
$test$;
