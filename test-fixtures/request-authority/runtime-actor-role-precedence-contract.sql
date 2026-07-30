\set ON_ERROR_STOP on

DO $test$
<<role_precedence>>
DECLARE
  dual_actor UUID := '8f200000-0000-4000-8000-000000000001';
  builder UUID := '8f200000-0000-4000-8000-000000000002';
  reviewer UUID := '8f200000-0000-4000-8000-000000000003';
  request_id UUID;
  withdrawal_request_id UUID;
  clarification_id UUID;
  receipt RECORD;
  brief JSONB := jsonb_build_object(
    'title', 'Actor role precedence fixture',
    'outcome', 'Pin command-specific attribution for a dual-role requester.',
    'intended_user', 'The disposable PostgreSQL authority harness',
    'must_work_scenario', 'Triager work and requester work retain distinct roles.',
    'constraints', 'The actor is also a global admin and active triager.',
    'acceptance_checks', jsonb_build_array(
      'Every event records the command-specific role.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (dual_actor, clock_timestamp()),
    (builder, clock_timestamp()),
    (reviewer, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (dual_actor, 'admin', 'dual_role_actor', 'Dual Role Actor'),
    (builder, 'user', 'dual_role_builder', 'Dual Role Builder'),
    (reviewer, 'user', 'dual_role_reviewer', 'Dual Role Reviewer');
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES (
    dual_actor, TRUE, NULL, 'Dual-role fixture admission', dual_actor
  );
  UPDATE public.build_request_controls
  SET accepting_requests = TRUE,
      assigning_requests = TRUE,
      updated_at = clock_timestamp()
  WHERE singleton;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', dual_actor, 'role', 'authenticated')::TEXT,
    TRUE
  );

  SELECT * INTO receipt FROM public.submit_build_request_v1(
    1, 'dual-role-submit-primary', brief
  );
  request_id := receipt.request_id;
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, 0, 'dual-role-begin-triage',
    'begin_triage', '{}'::JSONB
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'dual-role-request-clarification',
    'request_clarification',
    jsonb_build_object('question', 'Which fixture behavior is most important?')
  );
  clarification_id := (receipt.authority_result->>'clarificationId')::UUID;
  IF NOT EXISTS (
    SELECT 1 FROM public.build_request_events AS event_value
    WHERE event_value.id = receipt.event_id
      AND event_value.actor_id = dual_actor
      AND event_value.actor_role = 'triager'
  ) THEN
    RAISE EXCEPTION 'Dual-role request_clarification was not triager-attributed.';
  END IF;

  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'dual-role-submit-clarification',
    'submit_clarification',
    jsonb_build_object(
      'clarificationId', clarification_id,
      'answer', 'The exact command-specific event attribution.'
    )
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.build_request_events AS event_value
    WHERE event_value.id = receipt.event_id
      AND event_value.actor_id = dual_actor
      AND event_value.actor_role = 'requester'
  ) THEN
    RAISE EXCEPTION 'Dual-role submit_clarification was not requester-attributed.';
  END IF;

  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'dual-role-request-clarification-2',
    'request_clarification',
    jsonb_build_object('question', 'Which second behavior is required?')
  );
  clarification_id := (receipt.authority_result->>'clarificationId')::UUID;
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'dual-role-submit-clarification-2',
    'submit_clarification',
    jsonb_build_object(
      'clarificationId', clarification_id,
      'answer', 'The second accepted clarification answer.'
    )
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'dual-role-request-clarification-3',
    'request_clarification',
    jsonb_build_object('question', 'Which third behavior is required?')
  );
  clarification_id := (receipt.authority_result->>'clarificationId')::UUID;
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'dual-role-submit-clarification-3',
    'submit_clarification',
    jsonb_build_object(
      'clarificationId', clarification_id,
      'answer', 'The third accepted clarification answer.'
    )
  );

  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'dual-role-accept',
    'accept',
    jsonb_build_object('builderId', builder, 'targetDate', '2026-08-31')
  );
  IF receipt.authority_result->>'acceptedClarificationCount' <> '3'
    OR receipt.authority_result->>'acceptedClarificationDigest'
      !~ '^[0-9a-f]{64}$'
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_accepted_clarification_sets AS accepted_scope
      WHERE accepted_scope.request_id = role_precedence.request_id
        AND accepted_scope.accepted_clarification_count = 3
        AND (
          SELECT jsonb_agg(
            (item->>'sequence')::INTEGER ORDER BY item->>'sequence'
          )
          FROM jsonb_array_elements(
            accepted_scope.accepted_clarifications
          ) AS item
        ) = '[1,2,3]'::JSONB
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            accepted_scope.accepted_clarifications
          ) AS item
          WHERE item->>'answer' IS NULL
        )
    )
    OR NOT EXISTS (
    SELECT 1 FROM public.build_request_events AS event_value
    WHERE event_value.id = receipt.event_id
      AND event_value.actor_role = 'triager'
    ) THEN
    RAISE EXCEPTION 'Dual-role accept was not triager-attributed.';
  END IF;

  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'dual-role-assign-reviewer',
    'assign_reviewer', jsonb_build_object('reviewerId', reviewer)
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.build_request_events AS event_value
    WHERE event_value.id = receipt.event_id
      AND event_value.actor_role = 'triager'
  ) THEN
    RAISE EXCEPTION 'Dual-role assignment was not triager-attributed.';
  END IF;

  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'dual-role-close',
    'close',
    jsonb_build_object(
      'reason', 'declined',
      'note', 'The managed service declined this fixture case.'
    )
  );
  IF receipt.lifecycle_state <> 'closed'
    OR NOT EXISTS (
      SELECT 1 FROM public.build_request_events AS event_value
      WHERE event_value.id = receipt.event_id
        AND event_value.actor_role = 'triager'
        AND event_value.new_close_reason = 'declined'
    ) THEN
    RAISE EXCEPTION 'Dual-role triager close attribution drifted.';
  END IF;

  SELECT * INTO receipt FROM public.submit_build_request_v1(
    1,
    'dual-role-submit-withdraw',
    jsonb_set(brief, '{title}', to_jsonb('Dual-role withdrawal fixture'::TEXT))
  );
  withdrawal_request_id := receipt.request_id;
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, withdrawal_request_id, 0, 'dual-role-withdraw-triage',
    'begin_triage', '{}'::JSONB
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, withdrawal_request_id, receipt.request_version, 'dual-role-withdraw',
    'withdraw',
    jsonb_build_object('reason', 'The requester no longer needs this fixture.')
  );
  IF receipt.lifecycle_state <> 'closed'
    OR NOT EXISTS (
      SELECT 1 FROM public.build_request_events AS event_value
      WHERE event_value.id = receipt.event_id
        AND event_value.actor_id = dual_actor
        AND event_value.actor_role = 'requester'
        AND event_value.new_close_reason = 'withdrawn'
    ) THEN
    RAISE EXCEPTION 'Dual-role withdrawal was not requester-attributed.';
  END IF;
END;
$test$;
