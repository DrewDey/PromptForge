\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

CREATE TEMP TABLE assignment_attribution_output (
  payload JSONB NOT NULL
);

DO $test$
<<assignment_attribution>>
DECLARE
  operator_id UUID := '84000000-0000-4000-8000-000000000001';
  replacement_id UUID := '84000000-0000-4000-8000-000000000002';
  prior_builder_id UUID := '84000000-0000-4000-8000-000000000003';
  request_id UUID;
  request_version INTEGER;
  brief_id UUID;
  builder_assignment_id UUID;
  delivery_revision_id UUID := '84010000-0000-4000-8000-000000000001';
  artifact_ids UUID[] := ARRAY[]::UUID[];
  artifact_id UUID;
  ordinal INTEGER;
  error_detail TEXT;
  result RECORD;
  before_detail JSONB;
  after_detail JSONB;
BEGIN
  SELECT state.reassign_builder_request_id
  INTO STRICT request_id
  FROM public.test_request_subject_fence_state AS state
  WHERE state.singleton;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', operator_id, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO result
  FROM public.build_request_command_v1(
    1,
    request_id,
    2,
    'assignment-attribution-reassign-0001',
    'reassign_builder',
    jsonb_build_object(
      'builderId', replacement_id,
      'reason', 'Replace the prior builder for attribution verification.'
    )
  );
  before_detail := public.get_build_request_v1(1, request_id);
  IF jsonb_array_length(before_detail->'assignments') <> 2
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(before_detail->'assignments') AS assignment
      WHERE assignment->>'role' = 'builder'
        AND (assignment->>'active')::BOOLEAN = FALSE
        AND assignment->'assignee' = jsonb_build_object(
          'displayName', 'Existing Subject Fence Builder',
          'deidentified', FALSE
        )
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(before_detail->'assignments') AS assignment
      WHERE assignment->>'role' = 'builder'
        AND (assignment->>'active')::BOOLEAN
        AND assignment->'assignee' = jsonb_build_object(
          'displayName', 'Subject Fence Target',
          'deidentified', FALSE
        )
    ) THEN
    RAISE EXCEPTION
      'Historical and active assignments lost distinct attribution.';
  END IF;

  PERFORM public.deidentify_build_request_account_v1(
    1, prior_builder_id, 'assignment-attribution-deidentify-0001'
  );
  DELETE FROM public.profiles WHERE id = prior_builder_id;
  DELETE FROM auth.users WHERE id = prior_builder_id;
  after_detail := public.get_build_request_v1(1, request_id);
  IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(after_detail->'assignments') AS assignment
      WHERE assignment->>'role' = 'builder'
        AND (assignment->>'active')::BOOLEAN = FALSE
        AND assignment->'assignee' = jsonb_build_object(
          'displayName', 'Former participant',
          'deidentified', TRUE
        )
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(after_detail->'assignments') AS assignment
      WHERE assignment->>'role' = 'builder'
        AND (assignment->>'active')::BOOLEAN
        AND assignment->'assignee' = jsonb_build_object(
          'displayName', 'Subject Fence Target',
          'deidentified', FALSE
        )
    )
    OR after_detail::TEXT ~
      '84000000-0000-4000-8000-00000000000[23]' THEN
    RAISE EXCEPTION
      'Assignment attribution deidentification or UUID minimization drifted.';
  END IF;

  SELECT request_case.version, request_case.current_brief_revision_id
  INTO STRICT request_version, brief_id
  FROM public.build_requests AS request_case
  WHERE request_case.id = assignment_attribution.request_id;
  SELECT assignment.id INTO STRICT builder_assignment_id
  FROM public.build_request_assignments AS assignment
  WHERE assignment.request_id = assignment_attribution.request_id
    AND assignment.assignment_role = 'builder'
    AND assignment.active
    AND assignment.account_id = replacement_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', replacement_id, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO result
  FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'assignment-attribution-start-build',
    'start_build',
    '{}'::JSONB
  );
  request_version := result.request_version;

  -- Five current artifacts remain the exact active-set cap.
  FOR ordinal IN 1..5 LOOP
    SELECT * INTO result
    FROM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'assignment-attribution-stage-current-' || ordinal,
      'stage_delivery_artifact',
      jsonb_build_object(
        'deliveryRevisionId', delivery_revision_id,
        'acceptedBriefRevisionId', brief_id,
        'activeBuilderAssignmentId', builder_assignment_id,
        'artifactOrdinal', ordinal,
        'clientFileId', 'assignment-current-' || ordinal,
        'normalizedName', 'assignment-current-' || ordinal || '.txt',
        'byteLength', 1000000,
        'sha256', repeat(ordinal::TEXT, 64),
        'detectedMediaType', 'text/plain',
        'scannerVersion', 'assignment-attribution-scanner-v1'
      )
    );
    request_version := result.request_version;
    artifact_ids := array_append(
      artifact_ids,
      (result.authority_result->>'artifactId')::UUID
    );
  END LOOP;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'assignment-attribution-stage-sixth-current',
      'stage_delivery_artifact',
      jsonb_build_object(
        'deliveryRevisionId', delivery_revision_id,
        'acceptedBriefRevisionId', brief_id,
        'activeBuilderAssignmentId', builder_assignment_id,
        'artifactOrdinal', 1,
        'clientFileId', 'assignment-current-sixth',
        'normalizedName', 'assignment-current-sixth.txt',
        'byteLength', 1000000,
        'sha256', repeat('a', 64),
        'detectedMediaType', 'text/plain',
        'scannerVersion', 'assignment-attribution-scanner-v1'
      )
    );
    RAISE EXCEPTION 'Sixth current artifact was staged.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Sixth current artifact was staged.'
        OR SQLSTATE <> '22023'
        OR SQLERRM <> 'Delivery revision staging is invalid or full.' THEN
        RAISE;
      END IF;
  END;
  IF (
    SELECT count(*)
    FROM public.build_request_delivery_artifacts AS artifact
    WHERE artifact.delivery_revision_id =
      assignment_attribution.delivery_revision_id
      AND artifact.abandoned_at IS NULL
  ) <> 5 THEN
    RAISE EXCEPTION 'Five-current-artifact authority drifted.';
  END IF;
  FOREACH artifact_id IN ARRAY artifact_ids LOOP
    SELECT * INTO result
    FROM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'assignment-attribution-abandon-' || artifact_id::TEXT,
      'abandon_delivery_artifact',
      jsonb_build_object(
        'deliveryRevisionId', delivery_revision_id,
        'artifactId', artifact_id
      )
    );
    request_version := result.request_version;
  END LOOP;

  -- Three replacement attempts are allowed; the ninth lifetime attempt is
  -- rejected even though every prior row is abandoned.
  FOR ordinal IN 6..8 LOOP
    SELECT * INTO result
    FROM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'assignment-attribution-stage-lifetime-' || ordinal,
      'stage_delivery_artifact',
      jsonb_build_object(
        'deliveryRevisionId', delivery_revision_id,
        'acceptedBriefRevisionId', brief_id,
        'activeBuilderAssignmentId', builder_assignment_id,
        'artifactOrdinal', 1,
        'clientFileId', 'assignment-lifetime-' || ordinal,
        'normalizedName', 'assignment-lifetime-' || ordinal || '.txt',
        'byteLength', 1000000,
        'sha256', repeat(ordinal::TEXT, 64),
        'detectedMediaType', 'text/plain',
        'scannerVersion', 'assignment-attribution-scanner-v1'
      )
    );
    request_version := result.request_version;
    artifact_id := (result.authority_result->>'artifactId')::UUID;
    SELECT * INTO result
    FROM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'assignment-attribution-abandon-lifetime-' || ordinal,
      'abandon_delivery_artifact',
      jsonb_build_object(
        'deliveryRevisionId', delivery_revision_id,
        'artifactId', artifact_id
      )
    );
    request_version := result.request_version;
  END LOOP;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'assignment-attribution-stage-lifetime-9',
      'stage_delivery_artifact',
      jsonb_build_object(
        'deliveryRevisionId', delivery_revision_id,
        'acceptedBriefRevisionId', brief_id,
        'activeBuilderAssignmentId', builder_assignment_id,
        'artifactOrdinal', 1,
        'clientFileId', 'assignment-lifetime-9',
        'normalizedName', 'assignment-lifetime-9.txt',
        'byteLength', 1000000,
        'sha256', repeat('9', 64),
        'detectedMediaType', 'text/plain',
        'scannerVersion', 'assignment-attribution-scanner-v1'
      )
    );
    RAISE EXCEPTION 'Ninth lifetime staging attempt succeeded.';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS error_detail = PG_EXCEPTION_DETAIL;
      IF SQLERRM = 'Ninth lifetime staging attempt succeeded.'
        OR error_detail <> 'request_authority:artifact_staging_limit' THEN
        RAISE;
      END IF;
  END;
  IF (
      SELECT count(*)
      FROM public.build_request_delivery_artifacts AS artifact
      WHERE artifact.delivery_revision_id =
        assignment_attribution.delivery_revision_id
    ) <> 8
    OR (
      SELECT COALESCE(sum(artifact.byte_length), 0)
      FROM public.build_request_delivery_artifacts AS artifact
      WHERE artifact.delivery_revision_id =
        assignment_attribution.delivery_revision_id
    ) <> 8000000
    OR (
      public.get_build_request_v1(1, request_id)
        ->'actor'->'capabilities'
    ) ? 'stage_delivery_artifact' THEN
    RAISE EXCEPTION
      'Lifetime staging cap mutated evidence or remained advertised.';
  END IF;
  INSERT INTO assignment_attribution_output
  VALUES (jsonb_build_object(
    'before', before_detail,
    'after', after_detail
  ));
END;
$test$;

SELECT payload
FROM assignment_attribution_output;
