\set ON_ERROR_STOP on

BEGIN;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  TRUE
);
SELECT public.claim_build_request_delivery_artifact_cleanup_v1(
  1,
  fixture.request_id,
  fixture.delivery_revision_id,
  fixture.artifact_id,
  'cleanup-claim-concurrency-0001'
)
FROM public.test_request_cleanup_claim_race AS fixture
WHERE fixture.singleton;
SELECT pg_sleep(2);
COMMIT;
