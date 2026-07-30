\set ON_ERROR_STOP on

CREATE TABLE public.test_request_subject_fence_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  lock_announced BOOLEAN NOT NULL DEFAULT FALSE,
  accept_request_id UUID NOT NULL,
  reassign_builder_request_id UUID NOT NULL,
  reassign_triager_request_id UUID NOT NULL
);

DO $test$
DECLARE
  operator_id UUID := '84000000-0000-4000-8000-000000000001';
  target_id UUID := '84000000-0000-4000-8000-000000000002';
  existing_builder_id UUID := '84000000-0000-4000-8000-000000000003';
  requester_id UUID;
  request_ids UUID[] := ARRAY[]::UUID[];
  receipt RECORD;
  ordinal INTEGER;
  brief JSONB := jsonb_build_object(
    'title', 'Subject fence fixture',
    'outcome', 'Prove account deidentification fences every subject-scoped mutation.',
    'intended_user', 'The disposable PostgreSQL authority harness',
    'must_work_scenario', 'No mutation crosses the account deidentification fence.',
    'constraints', 'Use only deterministic private fixture data.',
    'acceptance_checks', jsonb_build_array(
      'The deidentified subject cannot be admitted or assigned.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (operator_id, clock_timestamp()),
    (target_id, clock_timestamp()),
    (existing_builder_id, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (operator_id, 'admin', 'subject_fence_operator', 'Subject Fence Operator'),
    (target_id, 'admin', 'subject_fence_target', 'Subject Fence Target'),
    (
      existing_builder_id,
      'user',
      'subject_fence_builder',
      'Existing Subject Fence Builder'
    );
  UPDATE public.build_request_controls
  SET accepting_requests = TRUE,
      assigning_requests = TRUE,
      updated_at = clock_timestamp()
  WHERE singleton;
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES (
    target_id, TRUE, NULL, 'Subject fence target admission', operator_id
  );

  FOR ordinal IN 1..3 LOOP
    requester_id := (
      '84000000-0000-4000-8000-' || lpad((100 + ordinal)::TEXT, 12, '0')
    )::UUID;
    INSERT INTO auth.users (id, email_confirmed_at)
    VALUES (requester_id, clock_timestamp());
    INSERT INTO public.profiles (id, role, username, display_name)
    VALUES (
      requester_id,
      'user',
      'subject_fence_requester_' || ordinal,
      'Subject Fence Requester ' || ordinal
    );
    INSERT INTO public.build_request_pilot_admissions (
      account_id, admitted, expires_at, reason, changed_by
    ) VALUES (
      requester_id, TRUE, NULL, 'Subject fence requester admission', operator_id
    );
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', requester_id, 'role', 'authenticated'
      )::TEXT,
      TRUE
    );
    SELECT * INTO receipt
    FROM public.submit_build_request_v1(
      1,
      'subject-fence-submit-' || lpad(ordinal::TEXT, 4, '0'),
      jsonb_set(
        brief,
        '{title}',
        to_jsonb(('Subject fence fixture ' || ordinal)::TEXT)
      )
    );
    request_ids := array_append(request_ids, receipt.request_id);
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', operator_id, 'role', 'authenticated'
      )::TEXT,
      TRUE
    );
    PERFORM public.build_request_command_v1(
      1,
      receipt.request_id,
      0,
      'subject-fence-triage-' || lpad(ordinal::TEXT, 4, '0'),
      'begin_triage',
      '{}'::JSONB
    );
  END LOOP;

  PERFORM public.build_request_command_v1(
    1,
    request_ids[2],
    1,
    'subject-fence-existing-builder',
    'accept',
    jsonb_build_object(
      'builderId', existing_builder_id,
      'targetDate', '2026-08-31'
    )
  );
  INSERT INTO public.test_request_subject_fence_state (
    accept_request_id,
    reassign_builder_request_id,
    reassign_triager_request_id
  ) VALUES (request_ids[1], request_ids[2], request_ids[3]);
END;
$test$;
