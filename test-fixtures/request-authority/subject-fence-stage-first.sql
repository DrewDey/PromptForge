\set ON_ERROR_STOP on

DO $test$
DECLARE
  state public.test_request_subject_fence_state%ROWTYPE;
  request_version INTEGER;
  brief_revision_id UUID;
  builder_assignment_id UUID;
BEGIN
  SELECT * INTO STRICT state
  FROM public.test_request_subject_fence_state
  WHERE singleton;
  SELECT request_case.version, request_case.current_brief_revision_id
  INTO request_version, brief_revision_id
  FROM public.build_requests AS request_case
  WHERE request_case.id = state.stage_request_id;
  SELECT assignment.id INTO STRICT builder_assignment_id
  FROM public.build_request_assignments AS assignment
  WHERE assignment.request_id = state.stage_request_id
    AND assignment.assignment_role = 'builder'
    AND assignment.account_id =
      '84000000-0000-4000-8000-000000000002'::UUID
    AND assignment.active;
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"84000000-0000-4000-8000-000000000002","role":"authenticated"}',
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1, state.stage_request_id, request_version,
    'subject-fence-stage-first-0001', 'stage_delivery_artifact',
    jsonb_build_object(
      'deliveryRevisionId',
        '84000000-0000-4000-8000-000000000091'::UUID,
      'acceptedBriefRevisionId', brief_revision_id,
      'activeBuilderAssignmentId', builder_assignment_id,
      'artifactOrdinal', 1,
      'clientFileId', 'subject-fence-stage-first-file',
      'normalizedName', 'subject-fence-first.html',
      'byteLength', 100,
      'sha256', repeat('b', 64),
      'detectedMediaType', 'text/html',
      'scannerVersion', 'subject-fence-scanner-v1'
    )
  );
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"84000000-0000-4000-8000-000000000001","role":"authenticated"}',
    TRUE
  );
  BEGIN
    PERFORM public.deidentify_build_request_account_v1(
      1,
      '84000000-0000-4000-8000-000000000002',
      'subject-fence-stage-first-deidentify'
    );
    RAISE EXCEPTION 'Deidentification ignored active staged custody.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Deidentification ignored active staged custody.' THEN
      RAISE;
    END IF;
  END;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_delivery_revisions AS revision
    WHERE revision.request_id = state.stage_request_id
      AND revision.revision_state = 'staging'
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_deidentified_accounts AS tombstone
    WHERE tombstone.subject_digest =
      private.request_account_pseudonym_v1(
        '84000000-0000-4000-8000-000000000002'::UUID
      )
  ) THEN
    RAISE EXCEPTION 'Stage-first deidentification failure left partial state.';
  END IF;
END;
$test$;
