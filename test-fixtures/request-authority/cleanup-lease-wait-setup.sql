\set ON_ERROR_STOP on

DO $test$
DECLARE
  fixture public.test_request_cleanup_claim_race%ROWTYPE;
  request_version INTEGER;
  cleanup_claim JSONB;
BEGIN
  SELECT * INTO STRICT fixture
  FROM public.test_request_cleanup_claim_race
  WHERE singleton;
  SELECT version INTO STRICT request_version
  FROM public.build_requests
  WHERE id = fixture.request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', '82000000-0000-4000-8000-000000000007'::UUID,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1,
    fixture.request_id,
    request_version,
    'cleanup-lease-release-hold-0001',
    'release_moderation_hold',
    jsonb_build_object(
      'resolution', 'Continue the exact cleanup lease-wait fixture.'
    )
  );
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  cleanup_claim :=
    public.claim_build_request_delivery_artifact_cleanup_v1(
      1,
      fixture.request_id,
      fixture.delivery_revision_id,
      fixture.artifact_id,
      'cleanup-lease-wait-claim-0001'
    );
  UPDATE public.build_request_artifact_cleanup_claims
  SET owner_lease_until = clock_timestamp() + INTERVAL '3 seconds'
  WHERE id = (cleanup_claim->>'cleanupClaimId')::UUID;
  CREATE TABLE public.test_request_cleanup_lease_wait (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    cleanup_claim_id UUID NOT NULL,
    claim_version INTEGER NOT NULL
  );
  INSERT INTO public.test_request_cleanup_lease_wait (
    cleanup_claim_id, claim_version
  ) VALUES (
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER
  );
END;
$test$;
