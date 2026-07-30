\set ON_ERROR_STOP on

SET application_name = 'cleanup-lease-wait-abort';
SELECT pg_sleep(0.1);
SELECT set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  FALSE
);
SELECT public.abort_build_request_delivery_artifact_cleanup_v1(
  1,
  fixture.cleanup_claim_id,
  fixture.claim_version,
  'cleanup-lease-wait-abort-0001'
)
FROM public.test_request_cleanup_lease_wait AS fixture
WHERE fixture.singleton;
