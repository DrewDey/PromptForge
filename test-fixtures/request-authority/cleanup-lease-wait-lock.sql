\set ON_ERROR_STOP on

BEGIN;
SELECT cleanup_claim.id
FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
JOIN public.test_request_cleanup_lease_wait AS fixture
  ON fixture.cleanup_claim_id = cleanup_claim.id
WHERE fixture.singleton
FOR UPDATE;
DO $wait$
DECLARE
  deadline TIMESTAMPTZ := clock_timestamp() + INTERVAL '5 seconds';
BEGIN
  LOOP
    EXIT WHEN EXISTS (
      SELECT 1
      FROM pg_catalog.pg_stat_activity AS activity
      WHERE activity.application_name = 'cleanup-lease-wait-abort'
        AND activity.wait_event_type = 'Lock'
    );
    IF clock_timestamp() >= deadline THEN
      RAISE EXCEPTION 'Abort worker did not reach the claim lock before expiry.';
    END IF;
    PERFORM pg_sleep(0.05);
  END LOOP;
END;
$wait$;
SELECT pg_sleep(4);
COMMIT;
