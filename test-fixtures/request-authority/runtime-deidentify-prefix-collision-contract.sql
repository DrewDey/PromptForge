\set ON_ERROR_STOP on

DO $test$
<<deidentify_prefix>>
DECLARE
  operator_id UUID := '8f100000-0000-4000-8000-000000000001';
  requester_id UUID := '8f100000-0000-4000-8000-000000000002';
  triager_subject UUID := '8f100000-0000-4000-8000-000000000003';
  builder_subject UUID := '8f100000-0000-4000-8000-000000000004';
  request_id UUID;
  receipt RECORD;
  first_result JSONB;
  replay_result JSONB;
  second_result JSONB;
  shared_prefix TEXT := repeat('a', 70);
  first_key TEXT := repeat('a', 70) || 'suffix-one';
  second_key TEXT := repeat('a', 70) || 'suffix-two';
  version_after_first INTEGER;
  event_count_after_first INTEGER;
BEGIN
  IF left(first_key, 70) <> left(second_key, 70)
    OR first_key = second_key THEN
    RAISE EXCEPTION 'Collision fixture keys are not distinct after a shared prefix.';
  END IF;
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (operator_id, clock_timestamp()),
    (requester_id, clock_timestamp()),
    (triager_subject, clock_timestamp()),
    (builder_subject, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (operator_id, 'admin', 'prefix_operator', 'Prefix Collision Operator'),
    (requester_id, 'user', 'prefix_requester', 'Prefix Collision Requester'),
    (triager_subject, 'admin', 'prefix_triager', 'Prefix Collision Triager'),
    (builder_subject, 'user', 'prefix_builder', 'Prefix Collision Builder');
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES (
    requester_id, TRUE, NULL, 'Prefix collision fixture admission', operator_id
  );
  UPDATE public.build_request_controls
  SET accepting_requests = TRUE,
      assigning_requests = TRUE,
      updated_at = clock_timestamp()
  WHERE singleton;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester_id, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.submit_build_request_v1(
    1,
    'prefix-collision-submit',
    jsonb_build_object(
      'title', 'Deidentification prefix collision fixture',
      'outcome', 'Prove full idempotency keys remain distinct for one case.',
      'intended_user', 'The disposable PostgreSQL authority harness',
      'must_work_scenario', 'Two subjects touching one case deidentify independently.',
      'constraints', 'Preserve exact replay and reject changed-subject reuse.',
      'acceptance_checks', jsonb_build_array(
        'Both suffix-distinct operations persist independent case events.'
      ),
      'pathforge_reference', NULL
    )
  );
  request_id := receipt.request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager_subject, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, 0, 'prefix-collision-triage',
    'begin_triage', '{}'::JSONB
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'prefix-collision-accept',
    'accept',
    jsonb_build_object(
      'builderId', builder_subject,
      'targetDate', '2026-08-31'
    )
  );

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', operator_id, 'role', 'authenticated')::TEXT,
    TRUE
  );
  first_result := public.deidentify_build_request_account_v1(
    1, triager_subject, first_key
  );
  SELECT version INTO version_after_first
  FROM public.build_requests AS request_case
  WHERE request_case.id = deidentify_prefix.request_id;
  SELECT count(*) INTO event_count_after_first
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = deidentify_prefix.request_id;
  replay_result := public.deidentify_build_request_account_v1(
    1, triager_subject, first_key
  );
  IF first_result->>'replayed' <> 'false'
    OR replay_result <> jsonb_set(first_result, '{replayed}', 'true'::JSONB)
    OR version_after_first <> (
      SELECT request_case.version
      FROM public.build_requests AS request_case
      WHERE request_case.id = deidentify_prefix.request_id
    )
    OR event_count_after_first <> (
      SELECT count(*)
      FROM public.build_request_events AS event_value
      WHERE event_value.request_id = deidentify_prefix.request_id
    ) THEN
    RAISE EXCEPTION 'Exact deidentification replay mutated or drifted.';
  END IF;

  second_result := public.deidentify_build_request_account_v1(
    1, builder_subject, second_key
  );
  IF second_result->>'replayed' <> 'false'
    OR first_result->>'affectedCaseCount' <> '1'
    OR second_result->>'affectedCaseCount' <> '1'
    OR (
      SELECT count(*)
      FROM public.build_request_account_deidentification_receipts AS operation
      WHERE operation.idempotency_key IN (first_key, second_key)
    ) <> 2
    OR (
      SELECT count(*)
      FROM public.build_request_events AS event_value
      WHERE event_value.request_id = deidentify_prefix.request_id
        AND event_value.event_kind = 'account_deidentified'
    ) <> 2
    OR (
      SELECT count(DISTINCT command_receipt.idempotency_key)
      FROM public.build_request_command_receipts AS command_receipt
      WHERE command_receipt.request_id = deidentify_prefix.request_id
        AND command_receipt.command_kind = 'account_deidentified'
    ) <> 2 THEN
    RAISE EXCEPTION
      'Shared-prefix deidentification operations collided or lost case truth.';
  END IF;

  BEGIN
    PERFORM public.deidentify_build_request_account_v1(
      1, builder_subject, first_key
    );
    RAISE EXCEPTION 'Changed-subject reuse of a full key was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Changed-subject reuse of a full key was accepted.'
      OR SQLSTATE <> '23505' THEN
      RAISE;
    END IF;
  END;
END;
$test$;
