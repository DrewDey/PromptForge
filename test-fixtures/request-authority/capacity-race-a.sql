\set ON_ERROR_STOP on
\set VERBOSITY verbose

SET statement_timeout = '15s';
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (
      SELECT requester_id
      FROM public.test_request_capacity_race_state
      WHERE worker = 'a'
    ),
    'role',
    'authenticated'
  )::TEXT,
  FALSE
);
SELECT *
FROM public.submit_build_request_v1(
  1,
  'capacity-race-worker-a',
  jsonb_build_object(
    'title', 'Capacity race fixture 4',
    'outcome', 'Prove only one concurrent submission can consume the last slot.',
    'intended_user', 'Capacity requester four',
    'must_work_scenario', 'The active count finishes at exactly four.',
    'constraints', 'No fifth active case may be created.',
    'acceptance_checks', jsonb_build_array(
      'Exactly one concurrent submission succeeds.'
    ),
    'pathforge_reference', NULL
  )
);
