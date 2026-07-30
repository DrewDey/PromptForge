\set ON_ERROR_STOP on

DO $test$
<<text_contract>>
DECLARE
  requester UUID := '8e900000-0000-4000-8000-000000000001';
  triager UUID := '8e900000-0000-4000-8000-000000000002';
  administrator UUID := '82000000-0000-4000-8000-000000000007';
  request_id UUID;
  request_version INTEGER;
  event_count INTEGER;
  receipt RECORD;
  brief JSONB := jsonb_build_object(
    'title', 'Text normalization fixture',
    'outcome', 'Prove direct SQL text handling is fail closed and deterministic.',
    'intended_user', 'The disposable PostgreSQL authority harness',
    'must_work_scenario', 'Outer whitespace trims while an interior line feed remains.',
    'constraints', 'Reject empty and prohibited control-character input.',
    'acceptance_checks', jsonb_build_array(
      'The stored clarification preserves its legitimate interior line feed.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (requester, clock_timestamp()),
    (triager, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (requester, 'user', 'text_contract_requester', 'Text Contract Requester'),
    (triager, 'admin', 'text_contract_triager', 'Text Contract Triager');
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES (
    requester, TRUE, NULL, 'Text contract fixture admission', administrator
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
  SELECT * INTO receipt FROM public.submit_build_request_v1(
    1, 'text-contract-submit-0001', brief
  );
  request_id := receipt.request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, 0, 'text-contract-triage-0001',
    'begin_triage', '{}'::JSONB
  );
  request_version := receipt.request_version;
  SELECT count(*) INTO event_count
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = text_contract.request_id;

  BEGIN
    PERFORM public.build_request_command_v1(
      1, request_id, request_version, 'text-contract-tab-only',
      'request_clarification', jsonb_build_object('question', E'\t\t')
    );
    RAISE EXCEPTION 'Tab-only required text was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Tab-only required text was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.build_request_command_v1(
      1, request_id, request_version, 'text-contract-lf-only',
      'request_clarification', jsonb_build_object('question', E'\n\n')
    );
    RAISE EXCEPTION 'LF-only required text was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'LF-only required text was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.build_request_command_v1(
      1, request_id, request_version, 'text-contract-cr',
      'request_clarification',
      jsonb_build_object('question', E'first line\rsecond line')
    );
    RAISE EXCEPTION 'Carriage-return text was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Carriage-return text was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    EXECUTE format(
      $sql$
      SELECT public.build_request_command_v1(
        1, %L::UUID, %s, 'text-contract-nul',
        'request_clarification',
        '{"question":"safe\u0000unsafe"}'::JSONB
      )
      $sql$,
      request_id,
      request_version
    );
    RAISE EXCEPTION 'NUL text was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NUL text was accepted.' THEN RAISE; END IF;
  END;

  IF request_version <> (
      SELECT request_case.version
      FROM public.build_requests AS request_case
      WHERE request_case.id = text_contract.request_id
    )
    OR event_count <> (
      SELECT count(*)
      FROM public.build_request_events AS event_value
      WHERE event_value.request_id = text_contract.request_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_clarifications AS clarification
      WHERE clarification.request_id = text_contract.request_id
    ) THEN
    RAISE EXCEPTION 'Rejected control-character text mutated request authority.';
  END IF;

  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'text-contract-multiline',
    'request_clarification',
    jsonb_build_object(
      'question',
      E' \tFirst safe line.\nSecond safe line.\n '
    )
  );
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_clarifications AS clarification
    WHERE clarification.request_id = text_contract.request_id
      AND clarification.question =
        E'First safe line.\nSecond safe line.'
  ) THEN
    RAISE EXCEPTION
      'Direct SQL did not normalize outer whitespace and preserve interior LF.';
  END IF;
END;
$test$;
