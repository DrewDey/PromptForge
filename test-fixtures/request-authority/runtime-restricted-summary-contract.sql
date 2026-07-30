\set ON_ERROR_STOP on

DO $test$
<<restricted_summary>>
DECLARE
  held_requester UUID := '87000000-0000-4000-8000-000000000001';
  removed_requester UUID := '87000000-0000-4000-8000-000000000002';
  builder UUID := '87000000-0000-4000-8000-000000000003';
  stranger UUID := '87000000-0000-4000-8000-000000000004';
  administrator UUID := '87000000-0000-4000-8000-000000000005';
  held_request UUID;
  removed_request UUID;
  held_marker TEXT := 'RAW-HELD-TITLE-MARKER-8701';
  removed_marker TEXT := 'RAW-REMOVED-TITLE-MARKER-8702';
  reference_marker TEXT := 'PRIVATE-REFERENCE-MARKER-8703';
  removed_version_before INTEGER;
  removed_event_count_before INTEGER;
  removed_hold_count_before INTEGER;
  result JSONB;
  receipt RECORD;
  replay RECORD;
  hostile_payload JSONB;
  hostile_ordinal INTEGER := 0;
  brief JSONB := jsonb_build_object(
    'title', held_marker,
    'outcome', 'Prove restricted summaries retain safe axes without returning raw request text.',
    'intended_user', 'The restricted summary fixture',
    'must_work_scenario', 'Held and removed cases serialize only a safe summary shell.',
    'constraints', reference_marker,
    'acceptance_checks', jsonb_build_array(
      'Raw markers are absent from every list projection.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (held_requester, clock_timestamp()),
    (removed_requester, clock_timestamp()),
    (builder, clock_timestamp()),
    (stranger, clock_timestamp()),
    (administrator, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (held_requester, 'user', 'restricted_held_requester', 'Restricted Held Requester'),
    (removed_requester, 'user', 'restricted_removed_requester', 'Restricted Removed Requester'),
    (builder, 'user', 'restricted_builder', 'Restricted Builder'),
    (stranger, 'user', 'restricted_stranger', 'Restricted Stranger'),
    (administrator, 'admin', 'restricted_admin', 'Restricted Administrator');
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES
    (held_requester, TRUE, NULL, 'Fixture pilot admission', administrator),
    (removed_requester, TRUE, NULL, 'Fixture pilot admission', administrator);

  UPDATE public.build_request_controls
  SET accepting_requests = TRUE,
      assigning_requests = TRUE,
      updated_at = clock_timestamp()
  WHERE singleton;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', held_requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO held_request
  FROM public.submit_build_request_v1(
    1, 'restricted-held-submit-0001', brief
  ) AS submitted;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', removed_requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO removed_request
  FROM public.submit_build_request_v1(
    1,
    'restricted-removed-submit-0001',
    jsonb_set(brief, '{title}', to_jsonb(removed_marker))
  ) AS submitted;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1, held_request, 0, 'restricted-held-claim-0001', 'begin_triage', '{}'::JSONB
  );
  PERFORM public.build_request_command_v1(
    1, removed_request, 0, 'restricted-removed-claim-0001', 'begin_triage', '{}'::JSONB
  );
  PERFORM public.build_request_command_v1(
    1,
    held_request,
    1,
    'restricted-held-accept-0001',
    'accept',
    jsonb_build_object(
      'builderId', builder,
      'targetDate', (current_date + 10)::TEXT
    )
  );
  PERFORM public.build_request_command_v1(
    1,
    removed_request,
    1,
    'restricted-removed-accept-0001',
    'accept',
    jsonb_build_object(
      'builderId', builder,
      'targetDate', (current_date + 10)::TEXT
    )
  );
  PERFORM public.build_request_command_v1(
    1,
    held_request,
    2,
    'restricted-held-command-0001',
    'place_moderation_hold',
    jsonb_build_object('reason', 'Fixture moderation hold')
  );
  FOREACH hostile_payload IN ARRAY ARRAY[
    '{}'::JSONB,
    '{"reason":null}'::JSONB,
    jsonb_build_object('reason', repeat('x', 2001)),
    jsonb_build_object(
      'reason',
      'Review the sensitive URL https://private.example.invalid/case'
    )
  ]
  LOOP
    hostile_ordinal := hostile_ordinal + 1;
    BEGIN
      PERFORM public.build_request_command_v1(
        1,
        removed_request,
        2,
        'restricted-remove-invalid-' ||
          lpad(hostile_ordinal::TEXT, 4, '0'),
        'remove_for_moderation',
        hostile_payload
      );
      RAISE EXCEPTION
        'Invalid moderation-removal reason was accepted.';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'Invalid moderation-removal reason was accepted.' THEN
        RAISE;
      END IF;
    END;
  END LOOP;
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1,
    removed_request,
    2,
    'restricted-removed-command-0001',
    'remove_for_moderation',
    jsonb_build_object('reason', 'Fixture moderation removal')
  );
  SELECT * INTO replay
  FROM public.build_request_command_v1(
    1,
    removed_request,
    2,
    'restricted-removed-command-0001',
    'remove_for_moderation',
    jsonb_build_object('reason', 'Fixture moderation removal')
  );
  IF receipt.command_id <> replay.command_id
    OR NOT replay.replayed
    OR receipt.occurred_at <> replay.occurred_at
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_events AS removal_event
      WHERE removal_event.id = receipt.event_id
        AND removal_event.actor_role = 'operator'
        AND NOT (removal_event.safe_metadata ? 'reason')
        AND removal_event.redactable_reason =
          'Fixture moderation removal'
    ) THEN
    RAISE EXCEPTION
      'Moderation removal did not preserve the bounded redactable replay contract.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_events AS triage_event
    WHERE triage_event.request_id = held_request
      AND triage_event.event_kind = 'begin_triage'
      AND triage_event.actor_role = 'triager'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.build_request_events AS accept_event
    WHERE accept_event.request_id = held_request
      AND accept_event.event_kind = 'accept'
      AND accept_event.actor_role = 'triager'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.build_request_events AS hold_event
    WHERE hold_event.request_id = held_request
      AND hold_event.event_kind = 'place_moderation_hold'
      AND hold_event.actor_role = 'operator'
  ) THEN
    RAISE EXCEPTION
      'Dual-role admin event projection confused triager and operator actions.';
  END IF;

  SELECT removed_case.version INTO removed_version_before
  FROM public.build_requests AS removed_case
  WHERE removed_case.id = removed_request;
  SELECT count(*) INTO removed_event_count_before
  FROM public.build_request_events AS removed_event
  WHERE removed_event.request_id = removed_request;
  SELECT count(*) INTO removed_hold_count_before
  FROM public.build_request_retention_holds AS removed_hold
  WHERE removed_hold.request_id = removed_request;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      removed_request,
      removed_version_before,
      'restricted-removed-rehold-0001',
      'place_moderation_hold',
      jsonb_build_object('reason', 'A removed case cannot be held again')
    );
    RAISE EXCEPTION 'A moderation hold was placed after irreversible removal.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A moderation hold was placed after irreversible removal.' THEN
        RAISE;
      END IF;
  END;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      removed_request,
      removed_version_before,
      'restricted-removed-release-0001',
      'release_moderation_hold',
      jsonb_build_object('resolution', 'A removed case cannot be released')
    );
    RAISE EXCEPTION 'A moderation hold was released after irreversible removal.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A moderation hold was released after irreversible removal.' THEN
        RAISE;
      END IF;
  END;
  IF (SELECT version FROM public.build_requests WHERE id = removed_request)
      <> removed_version_before
    OR (
      SELECT count(*) FROM public.build_request_events
      WHERE request_id = removed_request
    ) <> removed_event_count_before
    OR (
      SELECT count(*) FROM public.build_request_retention_holds
      WHERE request_id = removed_request
    ) <> removed_hold_count_before THEN
    RAISE EXCEPTION
      'A denied post-removal hold command mutated version, events, or holds.';
  END IF;

  -- My Forge retains safe status/unread but never raw request text.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', held_requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  result := public.list_my_build_requests_v1(1, NULL, 50);
  IF result::TEXT LIKE '%' || held_marker || '%'
    OR result::TEXT LIKE '%' || reference_marker || '%'
    OR result->'items'->0->>'moderationState' <> 'held'
    OR NOT (result->'items'->0) ? 'unread' THEN
    RAISE EXCEPTION 'Held My Forge summary leaked raw request truth or lost safe axes.';
  END IF;
  result := public.list_build_request_events_v1(
    1, held_request, NULL, 50
  );
  IF jsonb_array_length(result->'items') <> 1
    OR result->'items'->0->>'kind' <> 'moderation_hold_placed'
    OR result->'items'->0->>'label'
      <> 'Request temporarily unavailable during moderation review'
    OR result->'items'->0->>'actorRole' <> 'system'
    OR result->'items'->0->'actor' <> 'null'::JSONB
    OR result->'items'->0->'oldAxes' <> 'null'::JSONB
    OR result->'items'->0->'reason' <> 'null'::JSONB
    OR result->'items'->0->'reference' <> 'null'::JSONB
    OR result->>'nextCursor' IS NOT NULL
    OR result::TEXT LIKE '%' || held_marker || '%'
    OR result::TEXT LIKE '%' || reference_marker || '%' THEN
    RAISE EXCEPTION
      'Held participant timeline was not the single restricted safe event.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', removed_requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  result := public.list_my_build_requests_v1(1, NULL, 50);
  IF result::TEXT LIKE '%' || removed_marker || '%'
    OR result::TEXT LIKE '%' || reference_marker || '%'
    OR result->'items'->0->>'moderationState' <> 'removed'
    OR NOT (result->'items'->0) ? 'unread' THEN
    RAISE EXCEPTION 'Removed My Forge summary leaked raw request truth or lost safe axes.';
  END IF;

  -- Both admin/triager and assigned-builder queues use the same restricted shell.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  result := public.list_build_request_queue_v1(1, 'triager', NULL, 50);
  IF result::TEXT LIKE '%' || held_marker || '%'
    OR result::TEXT LIKE '%' || removed_marker || '%'
    OR result::TEXT LIKE '%' || reference_marker || '%' THEN
    RAISE EXCEPTION 'Admin queue leaked held or removed raw request truth.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', builder, 'role', 'authenticated')::TEXT,
    TRUE
  );
  result := public.list_build_request_queue_v1(1, 'builder', NULL, 50);
  IF result::TEXT LIKE '%' || held_marker || '%'
    OR result::TEXT LIKE '%' || removed_marker || '%'
    OR result::TEXT LIKE '%' || reference_marker || '%' THEN
    RAISE EXCEPTION 'Assigned queue leaked held or removed raw request truth.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', stranger, 'role', 'authenticated')::TEXT,
    TRUE
  );
  IF jsonb_array_length(
    public.list_my_build_requests_v1(1, NULL, 50)->'items'
  ) <> 0 THEN
    RAISE EXCEPTION 'Unrelated actor enumerated restricted requests.';
  END IF;
  IF jsonb_array_length(
      public.list_build_request_queue_v1(1, 'builder', NULL, 50)->'items'
    ) <> 0
    OR jsonb_array_length(
      public.list_build_request_queue_v1(1, 'reviewer', NULL, 50)->'items'
    ) <> 0 THEN
    RAISE EXCEPTION 'Unassigned self-scoped work queue was not truthfully empty.';
  END IF;
  BEGIN
    PERFORM public.list_build_request_queue_v1(1, 'admin', NULL, 50);
    RAISE EXCEPTION 'Unassigned actor opened the restricted admin queue.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
