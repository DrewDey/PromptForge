\set ON_ERROR_STOP on
\set VERBOSITY verbose

SET statement_timeout = '15s';
SELECT pg_sleep(0.2);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"84000000-0000-4000-8000-000000000002","role":"authenticated"}',
  FALSE
);
SELECT public.build_request_command_v1(
  1,
  state.stage_request_id,
  request_case.version,
  'subject-fence-stage-artifact-0001',
  'stage_delivery_artifact',
  jsonb_build_object(
    'deliveryRevisionId', '84000000-0000-4000-8000-000000000090'::UUID,
    'acceptedBriefRevisionId', request_case.current_brief_revision_id,
    'activeBuilderAssignmentId', assignment.id,
    'artifactOrdinal', 1,
    'clientFileId', 'subject-fence-file-1',
    'normalizedName', 'subject-fence.html',
    'byteLength', 100,
    'sha256', repeat('a', 64),
    'detectedMediaType', 'text/html',
    'scannerVersion', 'subject-fence-scanner-v1'
  )
)
FROM public.test_request_subject_fence_state AS state
JOIN public.build_requests AS request_case
  ON request_case.id = state.stage_request_id
JOIN public.build_request_assignments AS assignment
  ON assignment.request_id = request_case.id
  AND assignment.assignment_role = 'builder'
  AND assignment.account_id =
    '84000000-0000-4000-8000-000000000002'::UUID
  AND assignment.active
WHERE state.singleton;
