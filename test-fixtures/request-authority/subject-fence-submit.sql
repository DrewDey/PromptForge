\set ON_ERROR_STOP on
\set VERBOSITY verbose

SET statement_timeout = '15s';
SELECT pg_sleep(0.2);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000002","role":"authenticated"}',
  FALSE
);
SELECT *
FROM public.submit_build_request_v1(
  1,
  'subject-fence-race-submit',
  jsonb_build_object(
    'title', 'Rejected post-deidentification submission',
    'outcome', 'This request must never be persisted.',
    'intended_user', 'The subject fence fixture',
    'must_work_scenario', 'The persistent tombstone rejects this request.',
    'constraints', 'No mutation is allowed.',
    'acceptance_checks', jsonb_build_array('No request row is created.'),
    'pathforge_reference', NULL
  )
);
