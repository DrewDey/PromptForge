\set ON_ERROR_STOP on
\set VERBOSITY verbose

SET statement_timeout = '15s';
SELECT pg_sleep(0.2);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000001","role":"authenticated"}',
  FALSE
);
SELECT *
FROM public.build_request_command_v1(
  1,
  (
    SELECT reassign_builder_request_id
    FROM public.test_request_subject_fence_state
    WHERE singleton
  ),
  2,
  'subject-fence-race-builder',
  'reassign_builder',
  jsonb_build_object(
    'builderId', '84000000-0000-4000-8000-000000000002',
    'reason', 'Subject fence race target.'
  )
);
