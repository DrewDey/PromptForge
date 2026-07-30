\set ON_ERROR_STOP on

DO $test$
<<close_reference>>
DECLARE
  requester UUID := '84000000-0000-4000-8000-000000000001';
  response_requester UUID := '84000000-0000-4000-8000-000000000002';
  duplicate_requester UUID := '84000000-0000-4000-8000-000000000003';
  rejection_requester UUID := '84000000-0000-4000-8000-000000000004';
  administrator UUID := '84000000-0000-4000-8000-000000000005';
  approved_project UUID := '81200000-0000-4000-8000-000000000001';
  published_variant UUID := '81300000-0000-4000-8000-000000000001';
  request_id UUID;
  response_request_id UUID;
  duplicate_request_id UUID;
  rejection_request_id UUID;
  receipt RECORD;
  brief JSONB := jsonb_build_object(
    'title', 'Administrative close reference contract',
    'outcome', 'Prove exact PathForge references at the application-service RPC boundary.',
    'intended_user', 'The Request authority fixture',
    'must_work_scenario', 'Canonical camel-case close payloads survive RPC validation.',
    'constraints', 'Keep references exact and reject aliases.',
    'acceptance_checks', jsonb_build_array(
      'The stored close reference names the approved PathForge result.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (requester, clock_timestamp()), (response_requester, clock_timestamp()),
    (duplicate_requester, clock_timestamp()), (rejection_requester, clock_timestamp()),
    (administrator, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (requester, 'user', 'close_reference_requester', 'Close Reference Requester'),
    (response_requester, 'user', 'close_response_requester', 'Close Response Requester'),
    (duplicate_requester, 'user', 'close_duplicate_requester', 'Close Duplicate Requester'),
    (rejection_requester, 'user', 'close_rejection_requester', 'Close Rejection Requester'),
    (administrator, 'admin', 'close_reference_admin', 'Close Reference Administrator');
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES
    (requester, TRUE, NULL, 'Fixture pilot admission', administrator),
    (response_requester, TRUE, NULL, 'Fixture pilot admission', administrator),
    (duplicate_requester, TRUE, NULL, 'Fixture pilot admission', administrator),
    (rejection_requester, TRUE, NULL, 'Fixture pilot admission', administrator);

  UPDATE public.build_request_controls
  SET accepting_requests = TRUE,
      assigning_requests = TRUE,
      controls_version = controls_version + 1,
      updated_at = clock_timestamp()
  WHERE singleton;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO request_id
  FROM public.submit_build_request_v1(1, 'close-ref-submit-0001', brief) AS submitted;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', response_requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO response_request_id
  FROM public.submit_build_request_v1(1, 'close-ref-submit-0002', brief) AS submitted;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', duplicate_requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO duplicate_request_id
  FROM public.submit_build_request_v1(1, 'close-ref-submit-0003', brief) AS submitted;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1, request_id, 0, 'close-project-claim-0001', 'begin_triage', '{}'::JSONB
  );
  PERFORM public.build_request_command_v1(
    1, response_request_id, 0, 'close-response-claim-0001', 'begin_triage', '{}'::JSONB
  );
  PERFORM public.build_request_command_v1(
    1, duplicate_request_id, 0, 'close-duplicate-claim-0001', 'begin_triage', '{}'::JSONB
  );

  -- This is the exact payload emitted by RequestApplicationService. The RPC
  -- owns normalization into the snake-case JSON stored by PostgreSQL.
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1,
    request_id,
    1,
    'close-project-0001',
    'close',
    jsonb_build_object(
      'reason', 'existing_resolution',
      'note', 'The approved project already resolves the request.',
      'resolutionReference', jsonb_build_object(
        'kind', 'project',
        'projectId', approved_project
      )
    )
  );
  IF receipt.lifecycle_state <> 'closed'
    OR receipt.close_reason <> 'existing_resolution'
    OR (
      SELECT resolution_reference
      FROM public.build_requests
      WHERE id = close_reference.request_id
    ) IS DISTINCT FROM jsonb_build_object(
      'kind', 'project',
      'project_id', approved_project
    ) THEN
    RAISE EXCEPTION 'Canonical camel-case project close did not persist its exact reference.';
  END IF;

  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1,
    response_request_id,
    1,
    'close-response-0001',
    'close',
    jsonb_build_object(
      'reason', 'existing_resolution',
      'note', 'The exact published response already resolves the request.',
      'resolutionReference', jsonb_build_object(
        'kind', 'response',
        'projectId', approved_project,
        'modelVariantId', published_variant,
        'responseStepNumber', 1
      )
    )
  );
  IF receipt.lifecycle_state <> 'closed'
    OR (
      SELECT resolution_reference
      FROM public.build_requests
      WHERE id = close_reference.response_request_id
    ) IS DISTINCT FROM jsonb_build_object(
      'kind', 'response',
      'project_id', approved_project,
      'model_variant_id', published_variant,
      'response_step_number', 1
    ) THEN
    RAISE EXCEPTION 'Exact published response close did not persist its reference.';
  END IF;

  -- Duplicate is intentionally reference-free.
  PERFORM public.build_request_command_v1(
    1,
    duplicate_request_id,
    1,
    'close-duplicate-0001',
    'close',
    jsonb_build_object('reason', 'duplicate')
  );

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', rejection_requester, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO rejection_request_id
  FROM public.submit_build_request_v1(
    1, 'close-ref-submit-0004', brief
  ) AS submitted;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', administrator, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1,
    rejection_request_id,
    0,
    'close-rejection-claim-0001',
    'begin_triage',
    '{}'::JSONB
  );

  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      rejection_request_id,
      1,
      'close-snake-alias-0001',
      'close',
      jsonb_build_object(
        'reason', 'existing_resolution',
        'note', 'Snake-case command aliases are not part of the application wire.',
        'resolution_reference', jsonb_build_object(
          'kind', 'project',
          'project_id', approved_project
        )
      )
    );
    RAISE EXCEPTION 'Direct snake-case close alias was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Direct snake-case close alias was accepted.' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      rejection_request_id,
      1,
      'close-duplicate-ref-0001',
      'close',
      jsonb_build_object(
        'reason', 'duplicate',
        'note', 'Duplicate closes cannot smuggle a PathForge reference.',
        'resolutionReference', jsonb_build_object(
          'kind', 'project',
          'projectId', approved_project
        )
      )
    );
    RAISE EXCEPTION 'Duplicate close accepted an extra reference.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Duplicate close accepted an extra reference.' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      rejection_request_id,
      1,
      'close-missing-step-0001',
      'close',
      jsonb_build_object(
        'reason', 'existing_resolution',
        'note', 'A missing response artifact must not resolve a request.',
        'resolutionReference', jsonb_build_object(
          'kind', 'response',
          'projectId', approved_project,
          'modelVariantId', published_variant,
          'responseStepNumber', 2
        )
      )
    );
    RAISE EXCEPTION 'Missing response artifact was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Missing response artifact was accepted.' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      rejection_request_id,
      1,
      'close-mismatch-0001',
      'close',
      jsonb_build_object(
        'reason', 'existing_resolution',
        'note', 'A model variant from another project must not resolve this reference.',
        'resolutionReference', jsonb_build_object(
          'kind', 'response',
          'projectId', '81200000-0000-4000-8000-000000000099',
          'modelVariantId', published_variant,
          'responseStepNumber', 1
        )
      )
    );
    RAISE EXCEPTION 'Mismatched response reference was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Mismatched response reference was accepted.' THEN RAISE; END IF;
  END;
END;
$test$;
