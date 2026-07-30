\set ON_ERROR_STOP on
\set VERBOSITY verbose

SET statement_timeout = '15s';
SELECT pg_sleep(0.2);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000002","role":"authenticated"}',
  FALSE
);
SELECT public.acknowledge_build_request_updates_v1(
  1,
  state.stage_request_id,
  COALESCE((
    SELECT max(event_value.sequence)
    FROM public.build_request_events AS event_value
    WHERE event_value.request_id = state.stage_request_id
      AND event_value.participant_visible
  ), 0),
  'subject-fence-ack-actor-0001'
)
FROM public.test_request_subject_fence_state AS state
WHERE state.singleton;
