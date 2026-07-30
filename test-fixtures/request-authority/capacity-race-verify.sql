\set ON_ERROR_STOP on

DO $test$
DECLARE
  availability JSONB;
BEGIN
  IF (
    SELECT count(*)
    FROM public.build_requests
    WHERE lifecycle_state IN (
      'submitted', 'triage', 'clarification_requested', 'accepted',
      'building', 'review_pending', 'repair_required',
      'delivery_ready', 'delivered'
    )
      AND moderation_state <> 'removed'
  ) <> 4 THEN
    RAISE EXCEPTION 'Capacity race did not finish at exactly four active cases.';
  END IF;
  IF (
    SELECT count(*)
    FROM public.build_request_command_receipts AS receipt
    WHERE receipt.idempotency_key IN (
      'capacity-race-worker-a', 'capacity-race-worker-b'
    )
  ) <> 1 THEN
    RAISE EXCEPTION
      'Concurrent final-slot submission did not persist exactly one receipt.';
  END IF;
  PERFORM set_config('request.jwt.claims', '{}', TRUE);
  availability := public.get_build_request_availability_v1(1);
  IF (availability->>'activeCaseCount')::INTEGER <> 4
    OR (availability->>'remainingCapacity')::INTEGER <> 0
    OR availability->>'unavailableReason' <> 'capacity_full' THEN
    RAISE EXCEPTION
      'Availability did not project the exact uniform active-case count.';
  END IF;
END;
$test$;
