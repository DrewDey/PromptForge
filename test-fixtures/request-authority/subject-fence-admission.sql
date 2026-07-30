\set ON_ERROR_STOP on
\set VERBOSITY verbose

SET statement_timeout = '15s';
SELECT pg_sleep(0.2);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000001","role":"authenticated"}',
  FALSE
);
SELECT public.set_build_request_pilot_admission_v1(
  1,
  '84000000-0000-4000-8000-000000000002',
  1,
  'subject-fence-race-admission',
  FALSE,
  'Subject fence concurrent revocation.',
  NULL
);
