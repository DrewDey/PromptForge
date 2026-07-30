\set ON_ERROR_STOP on
\set VERBOSITY verbose

SET statement_timeout = '15s';
SELECT pg_sleep(0.2);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000002","role":"authenticated"}',
  FALSE
);
SELECT public.set_build_request_controls_v1(
  1, controls.controls_version, 'subject-fence-controls-actor-0001',
  controls.accepting_requests, controls.assigning_requests,
  controls.active_case_capacity
)
FROM public.build_request_controls AS controls
WHERE controls.singleton;
