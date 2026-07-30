\set ON_ERROR_STOP on

DO $test$
DECLARE
  fixture public.test_request_cleanup_claim_race%ROWTYPE;
  cleanup_claim public.build_request_artifact_cleanup_claims%ROWTYPE;
  request_version INTEGER;
BEGIN
  SELECT * INTO STRICT fixture
  FROM public.test_request_cleanup_claim_race
  WHERE singleton;
  SELECT * INTO STRICT cleanup_claim
  FROM public.build_request_artifact_cleanup_claims AS claim
  WHERE claim.request_id = fixture.request_id
    AND claim.delivery_revision_id = fixture.delivery_revision_id
    AND claim.artifact_id = fixture.artifact_id
    AND claim.resolved_at IS NULL;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_retention_holds AS retention_hold
    WHERE retention_hold.request_id = fixture.request_id
      AND retention_hold.released_at IS NULL
  ) OR (
    SELECT moderation_state
    FROM public.build_requests
    WHERE id = fixture.request_id
  ) <> 'clear' THEN
    RAISE EXCEPTION
      'Concurrent hold left durable state beside an unresolved cleanup claim.';
  END IF;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  PERFORM public.abort_build_request_delivery_artifact_cleanup_v1(
    1,
    cleanup_claim.id,
    cleanup_claim.claim_version,
    'cleanup-claim-concurrency-abort-0001'
  );

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
    'cleanup-hold-after-abort-0001',
    'place_moderation_hold',
    jsonb_build_object(
      'reason', 'The object still exists after the cleanup claim abort.'
    )
  );
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_retention_holds AS retention_hold
    WHERE retention_hold.request_id = fixture.request_id
      AND retention_hold.hold_kind = 'moderation'
      AND retention_hold.released_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Resolved cleanup abort did not release hold placement.';
  END IF;
END;
$test$;
