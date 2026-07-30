\set ON_ERROR_STOP on
\set VERBOSITY verbose

SET statement_timeout = '15s';
SELECT pg_advisory_lock(hashtextextended(
  'request-subject:' ||
    private.request_account_pseudonym_v1(
      '84000000-0000-4000-8000-000000000002'::UUID
    ),
  0
));
UPDATE public.test_request_subject_fence_state
SET lock_announced = TRUE
WHERE singleton;
BEGIN;
SELECT pg_sleep(1);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000001","role":"authenticated"}',
  TRUE
);
SELECT public.deidentify_build_request_account_v1(
  1,
  '84000000-0000-4000-8000-000000000002',
  'subject-fence-deidentify-0001'
);
COMMIT;
SELECT pg_advisory_unlock(hashtextextended(
  'request-subject:' ||
    private.request_account_pseudonym_v1(
      '84000000-0000-4000-8000-000000000002'::UUID
    ),
  0
));
