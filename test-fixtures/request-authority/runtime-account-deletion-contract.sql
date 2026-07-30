\set ON_ERROR_STOP on

DO $test$
<<account_deletion>>
DECLARE
  requester UUID := '8b000000-0000-4000-8000-000000000001';
  administrator UUID := '8b000000-0000-4000-8000-000000000002';
  builder UUID := '8b000000-0000-4000-8000-000000000003';
  terminal_requester UUID := '8b000000-0000-4000-8000-000000000004';
  clarification_requester UUID := '8b000000-0000-4000-8000-000000000005';
  building_requester UUID := '8b000000-0000-4000-8000-000000000006';
  delivery_ready_requester UUID := '8b000000-0000-4000-8000-000000000007';
  submitted_request UUID;
  clarification_request UUID;
  building_request UUID;
  delivery_ready_request UUID;
  completed_request UUID;
  closed_request UUID;
  receipt RECORD;
  completed_terminal_at TIMESTAMPTZ;
  closed_terminal_at TIMESTAMPTZ;
  brief JSONB := jsonb_build_object(
    'title', 'Requester deletion lifecycle contract',
    'outcome', 'Preserve case truth while removing a deleted requester identity.',
    'intended_user', 'The private request authority fixture',
    'must_work_scenario', 'Every affected case receives a truthful terminal event.',
    'constraints', 'Do not erase retained lifecycle, assignment, or event authority.',
    'acceptance_checks', jsonb_build_array(
      'Active cases close and terminal cases preserve their terminal outcome.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (requester, clock_timestamp()),
    (administrator, clock_timestamp()),
    (builder, clock_timestamp()),
    (terminal_requester, clock_timestamp()),
    (clarification_requester, clock_timestamp()),
    (building_requester, clock_timestamp()),
    (delivery_ready_requester, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (requester, 'user', 'deletion_requester', 'Deletion Requester'),
    (administrator, 'admin', 'deletion_admin', 'Deletion Administrator'),
    (builder, 'user', 'deletion_builder', 'Deletion Builder'),
    (
      terminal_requester, 'user', 'deletion_terminal_requester',
      'Terminal Deletion Requester'
    ),
    (
      clarification_requester, 'user', 'deletion_clarification_requester',
      'Clarification Deletion Requester'
    ),
    (
      building_requester, 'user', 'deletion_building_requester',
      'Building Deletion Requester'
    ),
    (
      delivery_ready_requester, 'user', 'deletion_ready_requester',
      'Ready Deletion Requester'
    );
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, reason, changed_by
  ) VALUES
    (
      requester, TRUE, 'Requester deletion fixture admission', administrator
    ),
    (
      terminal_requester, TRUE, 'Terminal deletion fixture admission',
      administrator
    ),
    (
      clarification_requester, TRUE, 'Clarification deletion admission',
      administrator
    ),
    (
      building_requester, TRUE, 'Building deletion admission', administrator
    ),
    (
      delivery_ready_requester, TRUE, 'Ready deletion admission',
      administrator
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
  SELECT submitted.request_id INTO submitted_request
  FROM public.submit_build_request_v1(
    1, 'deletion-submit-submitted-0001',
    jsonb_set(brief, '{title}', to_jsonb('Deletion submitted case'::TEXT))
  ) AS submitted;
  UPDATE public.build_requests
  SET lifecycle_state = 'closed',
      close_reason = 'duplicate',
      terminal_at = clock_timestamp()
  WHERE id = submitted_request;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', clarification_requester, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO clarification_request
  FROM public.submit_build_request_v1(
    1, 'deletion-submit-clarify-0001',
    jsonb_set(brief, '{title}', to_jsonb('Deletion clarification case'::TEXT))
  ) AS submitted;
  UPDATE public.build_requests
  SET lifecycle_state = 'closed',
      close_reason = 'duplicate',
      terminal_at = clock_timestamp()
  WHERE id = clarification_request;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', building_requester, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO building_request
  FROM public.submit_build_request_v1(
    1, 'deletion-submit-building-0001',
    jsonb_set(brief, '{title}', to_jsonb('Deletion building case'::TEXT))
  ) AS submitted;
  UPDATE public.build_requests
  SET lifecycle_state = 'closed',
      close_reason = 'duplicate',
      terminal_at = clock_timestamp()
  WHERE id = building_request;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', delivery_ready_requester, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO delivery_ready_request
  FROM public.submit_build_request_v1(
    1, 'deletion-submit-ready-0001',
    jsonb_set(brief, '{title}', to_jsonb('Deletion delivery ready case'::TEXT))
  ) AS submitted;
  UPDATE public.build_requests
  SET lifecycle_state = 'closed',
      close_reason = 'duplicate',
      terminal_at = clock_timestamp()
  WHERE id = delivery_ready_request;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', terminal_requester, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO completed_request
  FROM public.submit_build_request_v1(
    1, 'deletion-submit-completed-0001',
    jsonb_set(brief, '{title}', to_jsonb('Deletion completed case'::TEXT))
  ) AS submitted;
  UPDATE public.build_requests
  SET lifecycle_state = 'closed',
      close_reason = 'duplicate',
      terminal_at = clock_timestamp()
  WHERE id = completed_request;
  SELECT submitted.request_id INTO closed_request
  FROM public.submit_build_request_v1(
    1, 'deletion-submit-closed-0001',
    jsonb_set(brief, '{title}', to_jsonb('Deletion closed case'::TEXT))
  ) AS submitted;

  completed_terminal_at := clock_timestamp() - INTERVAL '7 days';
  closed_terminal_at := clock_timestamp() - INTERVAL '6 days';
  UPDATE public.build_requests
  SET lifecycle_state = CASE id
        WHEN clarification_request THEN 'clarification_requested'
        WHEN building_request THEN 'building'
        WHEN delivery_ready_request THEN 'delivery_ready'
        WHEN completed_request THEN 'completed'
        WHEN closed_request THEN 'closed'
        ELSE 'submitted'
      END,
      publication_state = CASE
        WHEN id IN (
          submitted_request, clarification_request, building_request,
          delivery_ready_request
        ) THEN 'consent_pending'
        ELSE 'private'
      END,
      close_reason = CASE WHEN id = closed_request THEN 'duplicate' ELSE NULL END,
      terminal_at = CASE
        WHEN id = completed_request THEN completed_terminal_at
        WHEN id = closed_request THEN closed_terminal_at
        ELSE NULL
      END
  WHERE id IN (
    submitted_request, clarification_request, building_request,
    delivery_ready_request, completed_request, closed_request
  );

  INSERT INTO public.build_request_assignments (
    request_id, assignment_role, account_id, display_name, assigned_by
  ) VALUES
    (
      building_request, 'builder', builder, 'Deletion Builder',
      administrator
    ),
    (
      delivery_ready_request, 'builder', builder, 'Deletion Builder',
      administrator
    );
  INSERT INTO public.build_request_participants (
    request_id, actor_role, account_id, display_name
  ) VALUES
    (building_request, 'builder', builder, 'Deletion Builder'),
    (delivery_ready_request, 'builder', builder, 'Deletion Builder');

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.deidentify_build_request_account_v1(
    1, requester, 'deletion-requester-command-0001'
  );
  PERFORM public.deidentify_build_request_account_v1(
    1, clarification_requester,
    'deletion-clarification-requester-command-0001'
  );
  PERFORM public.deidentify_build_request_account_v1(
    1, building_requester, 'deletion-building-requester-command-0001'
  );
  PERFORM public.deidentify_build_request_account_v1(
    1, delivery_ready_requester, 'deletion-ready-requester-command-0001'
  );
  PERFORM public.deidentify_build_request_account_v1(
    1, terminal_requester,
    'deletion-terminal-requester-command-0001'
  );

  IF EXISTS (
    SELECT 1
    FROM public.build_requests AS affected_request
    WHERE affected_request.id IN (
      submitted_request, clarification_request, building_request,
      delivery_ready_request
    )
      AND (
        affected_request.lifecycle_state <> 'closed'
        OR affected_request.close_reason <> 'withdrawn'
        OR affected_request.publication_state <> 'withdrawn'
        OR affected_request.terminal_at IS NULL
        OR affected_request.requester_id IS NOT NULL
        OR NOT affected_request.requester_deidentified
        OR affected_request.requester_display_name <> 'Former participant'
      )
  ) THEN
    RAISE EXCEPTION
      'Requester deletion did not terminalize every active lifecycle state.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_requests AS completed_case
    WHERE completed_case.id = completed_request
      AND completed_case.lifecycle_state = 'completed'
      AND completed_case.close_reason IS NULL
      AND completed_case.terminal_at = completed_terminal_at
      AND completed_case.requester_id IS NULL
      AND completed_case.requester_deidentified
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.build_requests AS closed_case
    WHERE closed_case.id = closed_request
      AND closed_case.lifecycle_state = 'closed'
      AND closed_case.close_reason = 'duplicate'
      AND closed_case.terminal_at = closed_terminal_at
      AND closed_case.requester_id IS NULL
      AND closed_case.requester_deidentified
  ) THEN
    RAISE EXCEPTION
      'Requester deletion rewrote a completed or closed terminal outcome.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_requests AS affected_request
    WHERE affected_request.id IN (
      submitted_request, clarification_request, building_request,
      delivery_ready_request, completed_request, closed_request
    )
      AND affected_request.publication_state <> 'withdrawn'
  ) THEN
    RAISE EXCEPTION
      'Requester deletion did not withdraw publication for every affected case.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_assignments AS affected_assignment
    WHERE affected_assignment.request_id IN (
      building_request, delivery_ready_request
    )
      AND (
        affected_assignment.active
        OR affected_assignment.ended_at IS NULL
      )
  ) THEN
    RAISE EXCEPTION
      'Requester deletion left an assignment active on a terminalized case.';
  END IF;
  IF (
    SELECT count(DISTINCT deletion_event.request_id)
    FROM public.build_request_events AS deletion_event
    WHERE deletion_event.request_id IN (
      submitted_request, clarification_request, building_request,
      delivery_ready_request, completed_request, closed_request
    )
      AND deletion_event.event_kind = 'account_deidentified'
  ) <> 6 THEN
    RAISE EXCEPTION
      'Requester deletion did not append one retained event per affected case.';
  END IF;

  SET CONSTRAINTS ALL IMMEDIATE;
END;
$test$;
