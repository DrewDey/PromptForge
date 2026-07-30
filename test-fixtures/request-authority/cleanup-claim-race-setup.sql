\set ON_ERROR_STOP on

CREATE TABLE public.test_request_cleanup_claim_race (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  artifact_id UUID NOT NULL,
  request_version INTEGER NOT NULL
);

INSERT INTO public.test_request_cleanup_claim_race (
  request_id, delivery_revision_id, artifact_id, request_version
)
SELECT request_case.id, artifact.delivery_revision_id, artifact.id,
  request_case.version
FROM public.build_requests AS request_case
JOIN public.build_request_delivery_artifacts AS artifact
  ON artifact.request_id = request_case.id
JOIN storage.objects AS stored_object
  ON stored_object.bucket_id = 'request-build-deliveries'
  AND stored_object.name IN (
    artifact.staging_identity, artifact.object_identity
  )
ORDER BY request_case.submitted_at, artifact.artifact_ordinal
LIMIT 1;

UPDATE public.build_requests AS request_case
SET lifecycle_state = 'closed',
    moderation_state = 'clear',
    publication_state = 'withdrawn',
    close_reason = 'failed_review',
    close_explanation = 'Cleanup claim concurrency fixture.',
    terminal_at = clock_timestamp() - INTERVAL '91 days'
FROM public.test_request_cleanup_claim_race AS fixture
WHERE request_case.id = fixture.request_id;

UPDATE public.test_request_cleanup_claim_race AS fixture
SET request_version = request_case.version
FROM public.build_requests AS request_case
WHERE request_case.id = fixture.request_id;

DELETE FROM public.build_request_retention_holds AS retention_hold
USING public.test_request_cleanup_claim_race AS fixture
WHERE retention_hold.request_id = fixture.request_id;
