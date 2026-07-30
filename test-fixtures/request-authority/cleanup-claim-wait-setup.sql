\set ON_ERROR_STOP on

DO $test$
DECLARE
  fixture public.test_request_cleanup_claim_race%ROWTYPE;
  cleanup_claim JSONB;
BEGIN
  SELECT * INTO STRICT fixture
  FROM public.test_request_cleanup_claim_race
  WHERE singleton;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  cleanup_claim := public.claim_build_request_delivery_artifact_cleanup_v1(
    1, fixture.request_id, fixture.delivery_revision_id, fixture.artifact_id,
    'cleanup-claim-wait-owner-0001'
  );
  UPDATE public.build_request_artifact_cleanup_claims
  SET owner_lease_until = clock_timestamp() + INTERVAL '3 seconds'
  WHERE id = (cleanup_claim->>'cleanupClaimId')::UUID;
  CREATE TABLE public.test_request_cleanup_claim_wait (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    cleanup_claim_id UUID NOT NULL,
    claim_version INTEGER NOT NULL
  );
  INSERT INTO public.test_request_cleanup_claim_wait (
    cleanup_claim_id, claim_version
  ) VALUES (
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER
  );
END;
$test$;
