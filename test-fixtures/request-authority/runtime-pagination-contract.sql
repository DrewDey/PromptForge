\set ON_ERROR_STOP on

DO $test$
<<pagination>>
DECLARE
  requester UUID := '86000000-0000-4000-8000-000000000001';
  stranger UUID := '86000000-0000-4000-8000-000000000002';
  administrator UUID := '86000000-0000-4000-8000-000000000003';
  first_request UUID;
  second_request UUID;
  first_page JSONB;
  replay_page JSONB;
  second_page JSONB;
  queue_page JSONB;
  eligible_page JSONB;
  event_page JSONB;
  event_second_page JSONB;
  cursor_value TEXT;
  queue_cursor TEXT;
  eligible_cursor TEXT;
  event_cursor TEXT;
  brief JSONB := jsonb_build_object(
    'title', 'Signed pagination contract',
    'outcome', 'Prove request cursors are signed, scoped, replayable, and tamper evident.',
    'intended_user', 'The Request pagination fixture',
    'must_work_scenario', 'A second page can be fetched only with the exact first-page cursor.',
    'constraints', 'Do not expose unsigned pagination state.',
    'acceptance_checks', jsonb_build_array(
      'Cross-actor and tampered cursors are rejected.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (requester, clock_timestamp()),
    (stranger, clock_timestamp()),
    (administrator, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (requester, 'user', 'pagination_requester', 'Pagination Requester'),
    (stranger, 'user', 'pagination_stranger', 'Pagination Stranger'),
    (administrator, 'admin', 'pagination_admin', 'Pagination Administrator');
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES (
    requester, TRUE, NULL, 'Fixture pilot admission', administrator
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
  SELECT submitted.request_id INTO first_request
  FROM public.submit_build_request_v1(1, 'pagination-submit-0001', brief) AS submitted;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1, first_request, 0, 'pagination-claim-0001', 'begin_triage', '{}'::JSONB
  );
  PERFORM public.build_request_command_v1(
    1,
    first_request,
    1,
    'pagination-close-0001',
    'close',
    jsonb_build_object('reason', 'duplicate')
  );

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT submitted.request_id INTO second_request
  FROM public.submit_build_request_v1(1, 'pagination-submit-0002', brief) AS submitted;

  first_page := public.list_my_build_requests_v1(1, NULL, 1);
  cursor_value := first_page->>'nextCursor';
  IF jsonb_array_length(first_page->'items') <> 1
    OR cursor_value IS NULL
    OR char_length(cursor_value) NOT BETWEEN 30 AND 500
    OR cursor_value !~ '^rq1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'My-request first page did not return a signed rq1 cursor: %.',
      COALESCE(cursor_value, '<null>');
  END IF;

  replay_page := public.list_my_build_requests_v1(1, NULL, 1);
  IF replay_page IS DISTINCT FROM first_page THEN
    RAISE EXCEPTION 'Replaying the same first-page query changed its result.';
  END IF;

  second_page := public.list_my_build_requests_v1(1, cursor_value, 1);
  IF jsonb_array_length(second_page->'items') <> 1
    OR second_page->'items'->0->>'requestId' =
      first_page->'items'->0->>'requestId' THEN
    RAISE EXCEPTION 'My-request second page repeated or omitted the boundary row.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', stranger, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.list_my_build_requests_v1(1, cursor_value, 1);
    RAISE EXCEPTION 'A signed cursor replayed for another actor.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A signed cursor replayed for another actor.' THEN RAISE; END IF;
  END;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.list_my_build_requests_v1(
      1,
      overlay(cursor_value placing
        CASE WHEN substr(cursor_value, 10, 1) = 'A' THEN 'B' ELSE 'A' END
        from 10 for 1
      ),
      1
    );
    RAISE EXCEPTION 'A tampered signed cursor was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A tampered signed cursor was accepted.' THEN RAISE; END IF;
  END;

  -- Queue cursors bind the querying actor and requested scope.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  RAISE NOTICE 'pagination checkpoint: queue first page';
  queue_page := public.list_build_request_queue_v1(
    p_contract_version => 1,
    p_scope => 'admin',
    p_cursor => NULL,
    p_limit => 1
  );
  RAISE NOTICE 'pagination checkpoint: queue first page returned';
  queue_cursor := queue_page->>'nextCursor';
  IF jsonb_array_length(queue_page->'items') <> 1
    OR queue_cursor IS NULL
    OR char_length(queue_cursor) NOT BETWEEN 30 AND 500
    OR queue_cursor !~ '^rq1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    OR queue_page->'items'->0->>'actorRole' <> 'admin' THEN
    RAISE EXCEPTION 'Admin queue first page did not return a signed scoped cursor.';
  END IF;
  IF public.list_build_request_queue_v1(
    p_contract_version => 1,
    p_scope => 'admin',
    p_cursor => NULL,
    p_limit => 1
  )
    IS DISTINCT FROM queue_page THEN
    RAISE EXCEPTION 'Admin queue first-page replay changed.';
  END IF;
  BEGIN
    PERFORM public.list_build_request_queue_v1(
      p_contract_version => 1,
      p_scope => 'builder',
      p_cursor => queue_cursor,
      p_limit => 1
    );
    RAISE EXCEPTION 'An admin queue cursor replayed under builder scope.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'An admin queue cursor replayed under builder scope.' THEN RAISE; END IF;
  END;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', stranger, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.list_build_request_queue_v1(
      p_contract_version => 1,
      p_scope => 'admin',
      p_cursor => queue_cursor,
      p_limit => 1
    );
    RAISE EXCEPTION 'A queue cursor replayed for another actor.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A queue cursor replayed for another actor.' THEN RAISE; END IF;
  END;

  -- Eligible-assignee cursors bind request, role, normalized query, and actor.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  eligible_page := public.list_build_request_eligible_assignees_v1(
    1, second_request, 'builder', '', NULL, 1
  );
  eligible_cursor := eligible_page->>'nextCursor';
  IF jsonb_array_length(eligible_page->'items') <> 1
    OR eligible_cursor IS NULL
    OR char_length(eligible_cursor) NOT BETWEEN 30 AND 500
    OR eligible_cursor !~ '^rq1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    OR (eligible_page->'items'->0) ?| ARRAY[
      'email', 'role', 'username', 'requestId'
    ] THEN
    RAISE EXCEPTION 'Eligible-assignee first page was unsigned or leaked fields.';
  END IF;
  BEGIN
    PERFORM public.list_build_request_eligible_assignees_v1(
      1, second_request, 'reviewer', '', eligible_cursor, 1
    );
    RAISE EXCEPTION 'Eligible-assignee cursor replayed under another role.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Eligible-assignee cursor replayed under another role.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.list_build_request_eligible_assignees_v1(
      1, first_request, 'builder', '', eligible_cursor, 1
    );
    RAISE EXCEPTION 'Eligible-assignee cursor replayed for another request.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Eligible-assignee cursor replayed for another request.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.list_build_request_eligible_assignees_v1(
      1, second_request, 'builder', 'different', eligible_cursor, 1
    );
    RAISE EXCEPTION 'Eligible-assignee cursor replayed under another query.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Eligible-assignee cursor replayed under another query.' THEN RAISE; END IF;
  END;

  -- Create enough immutable history for a nonempty second event page.
  PERFORM public.build_request_command_v1(
    1, second_request, 0, 'pagination-triage-0001', 'begin_triage', '{}'::JSONB
  );
  PERFORM public.build_request_command_v1(
    1,
    second_request,
    1,
    'pagination-clarify-0001',
    'request_clarification',
    jsonb_build_object('question', 'Which exact offline browser behavior is required?')
  );
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  event_page := public.list_build_request_events_v1(
    1, second_request, NULL, 2
  );
  event_cursor := event_page->>'nextCursor';
  IF jsonb_array_length(event_page->'items') <> 2
    OR (event_page->'items'->0->>'sequence')::INTEGER
      <= (event_page->'items'->1->>'sequence')::INTEGER
    OR event_cursor IS NULL
    OR char_length(event_cursor) NOT BETWEEN 30 AND 500
    OR event_cursor !~ '^rqe1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'Event first page was not newest-first with a signed rqe1 cursor.';
  END IF;
  IF public.list_build_request_events_v1(1, second_request, NULL, 2)
    IS DISTINCT FROM event_page THEN
    RAISE EXCEPTION 'Event first-page replay changed.';
  END IF;
  event_second_page := public.list_build_request_events_v1(
    1, second_request, event_cursor, 2
  );
  IF jsonb_array_length(event_second_page->'items') <> 1
    OR (event_second_page->'items'->0->>'sequence')::INTEGER
      >= (event_page->'items'->1->>'sequence')::INTEGER THEN
    RAISE EXCEPTION 'Event second page was empty, repeated, or out of order.';
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', stranger, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.list_build_request_events_v1(
      1, second_request, event_cursor, 2
    );
    RAISE EXCEPTION 'An event cursor replayed for another actor.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'An event cursor replayed for another actor.' THEN RAISE; END IF;
  END;
END;
$test$;
