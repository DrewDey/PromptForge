\set ON_ERROR_STOP on

CREATE TABLE public.test_request_capacity_race_state (
  worker TEXT PRIMARY KEY CHECK (worker IN ('a', 'b')),
  requester_id UUID NOT NULL UNIQUE
);

DO $test$
DECLARE
  administrator UUID := '83000000-0000-4000-8000-000000000099';
  requester UUID;
  ordinal INTEGER;
  brief JSONB := jsonb_build_object(
    'title', 'Capacity race fixture',
    'outcome', 'Create a deterministic capacity race case for the private pilot.',
    'intended_user', 'The capacity fixture requester',
    'must_work_scenario', 'Only the fourth concurrent active case may be admitted.',
    'constraints', 'Keep this disposable database fixture private.',
    'acceptance_checks', jsonb_build_array(
      'The active case count never exceeds four.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at)
  VALUES (administrator, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name)
  VALUES (
    administrator,
    'admin',
    'capacity_administrator',
    'Capacity Administrator'
  );
  UPDATE public.build_request_controls
  SET accepting_requests = TRUE,
      assigning_requests = TRUE,
      updated_at = clock_timestamp()
  WHERE singleton;

  FOR ordinal IN 1..5 LOOP
    requester := (
      '83000000-0000-4000-8000-' || lpad(ordinal::TEXT, 12, '0')
    )::UUID;
    INSERT INTO auth.users (id, email_confirmed_at)
    VALUES (requester, clock_timestamp());
    INSERT INTO public.profiles (id, role, username, display_name)
    VALUES (
      requester,
      'user',
      'capacity_requester_' || ordinal,
      'Capacity Requester ' || ordinal
    );
    INSERT INTO public.build_request_pilot_admissions (
      account_id, admitted, expires_at, reason, changed_by
    ) VALUES (
      requester, TRUE, NULL, 'Fixture pilot admission', administrator
    );
    IF ordinal <= 3 THEN
      PERFORM set_config(
        'request.jwt.claims',
        jsonb_build_object(
          'sub', requester, 'role', 'authenticated'
        )::TEXT,
        TRUE
      );
      PERFORM public.submit_build_request_v1(
        1,
        'capacity-submit-' || lpad(ordinal::TEXT, 4, '0'),
        jsonb_set(
          brief,
          '{title}',
          to_jsonb(('Capacity race fixture ' || ordinal)::TEXT)
        )
      );
    ELSE
      INSERT INTO public.test_request_capacity_race_state (
        worker, requester_id
      ) VALUES (
        CASE ordinal WHEN 4 THEN 'a' ELSE 'b' END,
        requester
      );
    END IF;
  END LOOP;
END;
$test$;

CREATE FUNCTION public.test_request_capacity_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_sleep(1.5);
  RETURN NEW;
END;
$$;

CREATE TRIGGER test_request_capacity_overlap
  BEFORE INSERT ON public.build_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.test_request_capacity_overlap();
