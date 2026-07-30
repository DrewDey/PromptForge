\set ON_ERROR_STOP on

SET application_name = 'cleanup-claim-wait-takeover';
SELECT pg_sleep(0.1);
SELECT set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  FALSE
);
SELECT public.claim_build_request_delivery_artifact_cleanup_v1(
  1, race.request_id, race.delivery_revision_id, race.artifact_id,
  'cleanup-claim-wait-owner-0001'
)
FROM public.test_request_cleanup_claim_race AS race
WHERE race.singleton;
