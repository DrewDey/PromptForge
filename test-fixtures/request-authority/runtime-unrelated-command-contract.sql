\set ON_ERROR_STOP on

DO $test$
<<unrelated_command>>
DECLARE
  stranger UUID := '82000000-0000-4000-8000-000000000006';
  target RECORD;
  attempted_version INTEGER;
  attempt_number INTEGER := 0;
  error_state TEXT;
  error_message TEXT;
BEGIN
  CREATE TEMP TABLE unrelated_targets (
    label TEXT PRIMARY KEY,
    request_id UUID NOT NULL,
    original_version INTEGER NOT NULL,
    original_events BIGINT NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO unrelated_targets
  SELECT 'clear', request_case.id, request_case.version, count(event_value.id)
  FROM public.build_requests AS request_case
  LEFT JOIN public.build_request_events AS event_value
    ON event_value.request_id = request_case.id
  WHERE request_case.moderation_state = 'clear'
    AND request_case.lifecycle_state NOT IN ('completed', 'closed')
  GROUP BY request_case.id
  ORDER BY request_case.submitted_at
  LIMIT 1;
  INSERT INTO unrelated_targets
  SELECT 'held', request_case.id, request_case.version, count(event_value.id)
  FROM public.build_requests AS request_case
  LEFT JOIN public.build_request_events AS event_value
    ON event_value.request_id = request_case.id
  WHERE request_case.moderation_state = 'held'
  GROUP BY request_case.id
  ORDER BY request_case.submitted_at
  LIMIT 1;
  INSERT INTO unrelated_targets
  SELECT 'removed', request_case.id, request_case.version, count(event_value.id)
  FROM public.build_requests AS request_case
  LEFT JOIN public.build_request_events AS event_value
    ON event_value.request_id = request_case.id
  WHERE request_case.moderation_state = 'removed'
  GROUP BY request_case.id
  ORDER BY request_case.submitted_at
  LIMIT 1;
  INSERT INTO unrelated_targets
  SELECT 'completed', request_case.id, request_case.version, count(event_value.id)
  FROM public.build_requests AS request_case
  LEFT JOIN public.build_request_events AS event_value
    ON event_value.request_id = request_case.id
  WHERE request_case.lifecycle_state = 'completed'
  GROUP BY request_case.id
  ORDER BY request_case.submitted_at
  LIMIT 1;
  INSERT INTO unrelated_targets
  SELECT 'closed', request_case.id, request_case.version, count(event_value.id)
  FROM public.build_requests AS request_case
  LEFT JOIN public.build_request_events AS event_value
    ON event_value.request_id = request_case.id
  WHERE request_case.lifecycle_state = 'closed'
  GROUP BY request_case.id
  ORDER BY request_case.submitted_at
  LIMIT 1;

  IF (SELECT count(*) FROM unrelated_targets) <> 5 THEN
    RAISE EXCEPTION 'Unrelated command fixture did not find all lifecycle axes.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', stranger, 'role', 'authenticated')::TEXT,
    TRUE
  );
  FOR target IN
    SELECT label, request_id, original_version
    FROM unrelated_targets
    UNION ALL
    SELECT
      'nonexistent',
      '89999999-9999-4999-8999-999999999999'::UUID,
      0
  LOOP
    FOREACH attempted_version IN ARRAY ARRAY[0, target.original_version]
    LOOP
      attempt_number := attempt_number + 1;
      BEGIN
        PERFORM public.build_request_command_v1(
          1,
          target.request_id,
          attempted_version,
          'unrelated-command-' || lpad(attempt_number::TEXT, 4, '0'),
          'withdraw',
          jsonb_build_object('reason', 'Unrelated command probe')
        );
        RAISE EXCEPTION 'An unrelated actor command succeeded.';
      EXCEPTION
        WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS
            error_state = RETURNED_SQLSTATE,
            error_message = MESSAGE_TEXT;
          IF error_message = 'An unrelated actor command succeeded.'
            OR error_state <> 'P0002'
            OR error_message <> 'Request was not found.' THEN
            RAISE EXCEPTION
              'Unrelated % probe disclosed state/version: [%] %.',
              target.label, error_state, error_message;
          END IF;
      END;
    END LOOP;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM unrelated_targets AS original
    JOIN public.build_requests AS current_request
      ON current_request.id = original.request_id
    WHERE current_request.version <> original.original_version
      OR (
        SELECT count(*)
        FROM public.build_request_events AS current_event
        WHERE current_event.request_id = original.request_id
      ) <> original.original_events
  ) THEN
    RAISE EXCEPTION 'Unrelated probes changed request version or event history.';
  END IF;
END;
$test$;
