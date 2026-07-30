\set ON_ERROR_STOP on

SELECT pg_sleep(0.25);
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '82000000-0000-4000-8000-000000000007'::UUID,
    'role', 'authenticated'
  )::TEXT,
  FALSE
);
SELECT public.build_request_command_v1(
  1,
  fixture.request_id,
  request_case.version,
  'cleanup-hold-concurrency-0001',
  'place_moderation_hold',
  jsonb_build_object(
    'reason', 'This hold must wait for and then reject the cleanup claim.'
  )
)
FROM public.test_request_cleanup_claim_race AS fixture
JOIN public.build_requests AS request_case
  ON request_case.id = fixture.request_id
WHERE fixture.singleton;
