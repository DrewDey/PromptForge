\set ON_ERROR_STOP on

DO $test$
<<triager_accountability>>
DECLARE
  requester UUID := '89000000-0000-4000-8000-000000000001';
  admin_a UUID := '89000000-0000-4000-8000-000000000002';
  admin_b UUID := '89000000-0000-4000-8000-000000000003';
  builder UUID := '89000000-0000-4000-8000-000000000004';
  request_id UUID;
  clarification_id UUID;
  request_version INTEGER;
  receipt RECORD;
  queue_result JSONB;
  detail JSONB;
  error_detail TEXT;
  brief JSONB := jsonb_build_object(
    'title', 'Triager accountability contract',
    'outcome', 'Require explicit accountable triager ownership and visible reassignment.',
    'intended_user', 'The managed-service operations fixture',
    'must_work_scenario', 'Only the currently accountable triager may make substantive decisions.',
    'constraints', 'Every handoff remains explicit and auditable.',
    'acceptance_checks', jsonb_build_array(
      'Triager handoff history names both accountable administrators.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (requester, clock_timestamp()),
    (admin_a, clock_timestamp()),
    (admin_b, clock_timestamp()),
    (builder, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (requester, 'user', 'triager_account_requester', 'Triager Account Requester'),
    (admin_a, 'admin', 'triager_account_admin_a', 'Triager Administrator A'),
    (admin_b, 'admin', 'triager_account_admin_b', 'Triager Administrator B'),
    (builder, 'user', 'triager_account_builder', 'Triager Account Builder');
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES (
    requester, TRUE, NULL, 'Fixture pilot admission', admin_a
  );
  UPDATE public.build_request_controls
  SET accepting_requests = TRUE,
      assigning_requests = TRUE,
      updated_at = clock_timestamp()
  WHERE singleton;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO request_id
  FROM public.submit_build_request_v1(
    1, 'triager-account-submit-0001', brief
  ) AS submitted;

  -- An administrator must claim triage before accepting or clarifying.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', admin_a, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      0,
      'triager-account-direct-accept-0001',
      'accept',
      jsonb_build_object(
        'builderId', builder,
        'targetDate', (current_date + 10)::TEXT
      )
    );
    RAISE EXCEPTION 'Administrator accepted an unclaimed submitted request.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Administrator accepted an unclaimed submitted request.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      0,
      'triager-account-direct-clarify-0001',
      'request_clarification',
      jsonb_build_object('question', 'This must require an accountable claim.')
    );
    RAISE EXCEPTION 'Administrator clarified an unclaimed submitted request.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Administrator clarified an unclaimed submitted request.' THEN RAISE; END IF;
  END;

  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1, request_id, 0, 'triager-account-claim-0001', 'begin_triage', '{}'::JSONB
  );
  IF receipt.request_version <> 1 THEN
    RAISE EXCEPTION 'Initial triager claim did not advance exactly one version.';
  END IF;

  -- Another global admin cannot silently act as the case triager.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', admin_b, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      1,
      'triager-account-admin-b-denied-0001',
      'request_clarification',
      jsonb_build_object('question', 'A silent global-admin takeover must fail.')
    );
    RAISE EXCEPTION 'A nonaccountable administrator acted as triager.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A nonaccountable administrator acted as triager.' THEN RAISE; END IF;
  END;

  queue_result := public.list_build_request_queue_v1(
    1, 'admin', NULL, 50
  );
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(queue_result->'items') AS queue_item
    WHERE queue_item->>'requestId' = request_id::TEXT
  ) THEN
    RAISE EXCEPTION 'Global admin scope hid the case before triager transfer.';
  END IF;
  queue_result := public.list_build_request_queue_v1(
    1, 'triager', NULL, 50
  );
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(queue_result->'items') AS queue_item
    WHERE queue_item->>'requestId' = request_id::TEXT
  ) THEN
    RAISE EXCEPTION 'Nonaccountable admin appeared in triager scope before transfer.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', admin_a, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1,
    request_id,
    1,
    'triager-account-reassign-0001',
    'reassign_triager',
    jsonb_build_object(
      'triagerId', admin_b,
      'reason', 'Explicit operations handoff'
    )
  );
  IF receipt.request_version <> 2
    OR receipt.authority_result <> '{}'::JSONB
    OR NOT EXISTS (
    SELECT 1
    FROM public.build_request_events AS handoff_event
    WHERE handoff_event.request_id = triager_accountability.request_id
      AND handoff_event.event_kind = 'reassign_triager'
      AND handoff_event.actor_role = 'operator'
      AND handoff_event.actor_id = admin_a
  ) THEN
    RAISE EXCEPTION 'Triager reassignment lacked an exact history event.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', admin_b, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1,
    request_id,
    2,
    'triager-account-admin-b-success-0001',
    'request_clarification',
    jsonb_build_object('question', 'The explicit handoff now authorizes this triager.')
  );
  queue_result := public.list_build_request_queue_v1(
    1, 'triager', NULL, 50
  );
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(queue_result->'items') AS queue_item
    WHERE queue_item->>'requestId' = request_id::TEXT
      AND queue_item->>'actorRole' = 'triager'
  ) THEN
    RAISE EXCEPTION 'New accountable admin lacked the triager queue row.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', admin_a, 'role', 'authenticated')::TEXT,
    TRUE
  );
  queue_result := public.list_build_request_queue_v1(
    1, 'triager', NULL, 50
  );
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(queue_result->'items') AS queue_item
    WHERE queue_item->>'requestId' = request_id::TEXT
  ) THEN
    RAISE EXCEPTION 'Former triager retained the triager queue row.';
  END IF;
  queue_result := public.list_build_request_queue_v1(
    1, 'admin', NULL, 50
  );
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(queue_result->'items') AS queue_item
    WHERE queue_item->>'requestId' = request_id::TEXT
  ) THEN
    RAISE EXCEPTION 'Former triager lost global admin scope after transfer.';
  END IF;

  -- Deidentifying the accountable triager must leave a bounded, explicit
  -- recovery path for another global admin without granting ordinary users or
  -- bypassing assignment controls.
  PERFORM public.deidentify_build_request_account_v1(
    1,
    admin_b,
    'triager-account-deidentify-0001'
  );
  SELECT version INTO request_version
  FROM public.build_requests
  WHERE id = request_id;
  detail := public.get_build_request_v1(1, request_id);
  IF NOT (
    detail->'actor'->'capabilities'
      ? 'reassign_triager'
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_participants AS participant
    WHERE participant.request_id = triager_accountability.request_id
      AND participant.actor_role = 'triager'
      AND participant.active
  ) THEN
    RAISE EXCEPTION
      'Global admin did not receive exact no-active-triager recovery authority.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'triager-recovery-user-denied',
      'reassign_triager',
      jsonb_build_object(
        'triagerId', admin_a,
        'reason', 'Ordinary users cannot recover triager authority.'
      )
    );
    RAISE EXCEPTION 'Ordinary user recovered triager authority.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Ordinary user recovered triager authority.'
      OR SQLSTATE <> '42501' THEN
      RAISE;
    END IF;
  END;

  UPDATE public.build_request_controls
  SET assigning_requests = FALSE,
      updated_at = clock_timestamp()
  WHERE singleton;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', admin_a, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'triager-recovery-controls-denied',
      'reassign_triager',
      jsonb_build_object(
        'triagerId', admin_a,
        'reason', 'Controls-off recovery must fail.'
      )
    );
    RAISE EXCEPTION 'Controls-off triager recovery succeeded.';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_detail = PG_EXCEPTION_DETAIL;
    IF SQLERRM = 'Controls-off triager recovery succeeded.'
      OR error_detail <> 'request_authority:controls_off' THEN
      RAISE;
    END IF;
  END;
  UPDATE public.build_request_controls
  SET assigning_requests = TRUE,
      updated_at = clock_timestamp()
  WHERE singleton;
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'triager-recovery-success-0001',
    'reassign_triager',
    jsonb_build_object(
      'triagerId', admin_a,
      'reason', 'Recovered after accountable triager account removal.'
    )
  );
  request_version := receipt.request_version;
  IF receipt.authority_result <> '{}'::JSONB
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_events AS recovery_event
      WHERE recovery_event.id = receipt.event_id
        AND recovery_event.actor_role = 'operator'
        AND recovery_event.redactable_reason =
          'Recovered after accountable triager account removal.'
        AND NOT (recovery_event.safe_metadata ? 'reason')
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_participants AS former_triager
      WHERE former_triager.request_id =
        triager_accountability.request_id
        AND former_triager.actor_role = 'triager'
        AND former_triager.deidentified
        AND NOT former_triager.active
        AND former_triager.account_id IS NULL
    ) THEN
    RAISE EXCEPTION
      'Triager recovery lost history, privacy, or exact event authority.';
  END IF;

  SELECT clarification.id INTO STRICT clarification_id
  FROM public.build_request_clarifications AS clarification
  WHERE clarification.request_id = triager_accountability.request_id
    AND clarification.answer IS NULL;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'triager-recovery-answer-0001',
    'submit_clarification',
    jsonb_build_object(
      'clarificationId', clarification_id,
      'answer', 'The explicit recovery triager may proceed.'
    )
  );
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', admin_a, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1,
    request_id,
    receipt.request_version,
    'triager-recovery-accept-0001',
    'accept',
    jsonb_build_object(
      'builderId', builder,
      'targetDate', (current_date + 10)::TEXT
    )
  );
  IF receipt.lifecycle_state <> 'accepted' THEN
    RAISE EXCEPTION
      'Recovered accountable triager could not own a substantive decision.';
  END IF;
END;
$test$;
