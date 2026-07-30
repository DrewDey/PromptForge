\set ON_ERROR_STOP on

CREATE TABLE public.test_request_lifecycle_detail_snapshots (
  snapshot_kind TEXT PRIMARY KEY,
  payload JSONB NOT NULL
);

DO $test$
<<runtime>>
DECLARE
  requester UUID := '82000000-0000-4000-8000-000000000001';
  requester_two UUID := '82000000-0000-4000-8000-000000000002';
  triager UUID := '82000000-0000-4000-8000-000000000003';
  builder UUID := '82000000-0000-4000-8000-000000000004';
  reviewer UUID := '82000000-0000-4000-8000-000000000005';
  stranger UUID := '82000000-0000-4000-8000-000000000006';
  administrator UUID := '82000000-0000-4000-8000-000000000007';
  receipt RECORD;
  replay RECORD;
  request_id UUID;
  request_two_id UUID;
  clarification_id UUID;
  brief_revision_id UUID;
  acceptance_check_id UUID;
  builder_assignment_id UUID;
  delivery_revision_id UUID := '82100000-0000-4000-8000-000000000001';
  second_delivery_revision_id UUID := '82100000-0000-4000-8000-000000000002';
  artifact_id UUID;
  stage_receipt_id UUID;
  preparation_receipt_id UUID;
  seal_receipt_id UUID;
  staging_identity TEXT;
  manifest_digest TEXT;
  first_manifest_digest TEXT;
  service_result JSONB;
  error_detail TEXT;
  request_version INTEGER;
  event_count_before_delete INTEGER;
  review_count_before INTEGER;
  review_event_count_before INTEGER;
  brief JSONB := jsonb_build_object(
    'title', 'Deterministic private request',
    'outcome', 'Create a deterministic artifact that proves the accepted lifecycle.',
    'intended_user', 'The fixture requester',
    'must_work_scenario', 'The artifact works from a clean offline browser session.',
    'constraints', 'Keep the result private and deterministic.',
    'acceptance_checks', jsonb_build_array(
      'The artifact renders the expected fixture state.'
    ),
    'pathforge_reference', jsonb_build_object(
      'kind', 'project',
      'project_id', '81200000-0000-4000-8000-000000000001'
    )
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (requester, clock_timestamp()), (requester_two, clock_timestamp()),
    (triager, clock_timestamp()), (builder, clock_timestamp()),
    (reviewer, clock_timestamp()), (stranger, clock_timestamp()),
    (administrator, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (requester, 'admin', 'requester_fixture', 'Fixture Requester'),
    (requester_two, 'user', 'requester_two_fixture', 'Second Requester'),
    (triager, 'admin', 'triager_fixture', 'Fixture Triager'),
    (builder, 'user', 'builder_fixture', 'Fixture Builder'),
    (reviewer, 'user', 'reviewer_fixture', 'Fixture Reviewer'),
    (stranger, 'user', 'stranger_fixture', 'Unrelated User'),
    (administrator, 'admin', 'admin_fixture', 'Fixture Administrator');
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES
    (requester, TRUE, NULL, 'Fixture pilot admission', administrator),
    (requester_two, TRUE, NULL, 'Fixture pilot admission', administrator);

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.submit_build_request_v1(
      1, 'controls-off-submit', brief
    );
    RAISE EXCEPTION 'Submission succeeded while controls were off.';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS error_detail = PG_EXCEPTION_DETAIL;
      IF SQLERRM = 'Submission succeeded while controls were off.'
        OR error_detail <> 'request_authority:controls_off' THEN
        RAISE;
      END IF;
  END;

  UPDATE public.build_request_controls
  SET accepting_requests = TRUE,
      assigning_requests = TRUE,
      controls_version = controls_version + 1,
      updated_at = clock_timestamp()
  WHERE singleton;

  -- Exact cardinality, normalized distinctness, scenario separation, and safe
  -- text are enforced beneath every application caller.
  BEGIN
    PERFORM public.submit_build_request_v1(
      1,
      'invalid-zero-checks',
      jsonb_set(brief, '{acceptance_checks}', '[]'::JSONB)
    );
    RAISE EXCEPTION 'A zero-check brief was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A zero-check brief was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_build_request_v1(
      1,
      'invalid-duplicate-checks',
      jsonb_set(
        brief,
        '{acceptance_checks}',
        '["The fixture is deterministic.","  the fixture is deterministic.  "]'::JSONB
      )
    );
    RAISE EXCEPTION 'A normalized duplicate acceptance check was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A normalized duplicate acceptance check was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_build_request_v1(
      1,
      'invalid-scenario-check',
      jsonb_set(
        brief,
        '{acceptance_checks}',
        jsonb_build_array(brief->>'must_work_scenario')
      )
    );
    RAISE EXCEPTION 'A scenario-equal acceptance check was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A scenario-equal acceptance check was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_build_request_v1(
      1,
      'invalid-url-brief',
      jsonb_set(
        brief,
        '{constraints}',
        to_jsonb('Fetch https://private.example.test/customer'::TEXT)
      )
    );
    RAISE EXCEPTION 'A brief containing an arbitrary URL was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A brief containing an arbitrary URL was accepted.' THEN RAISE; END IF;
  END;

  SELECT * INTO receipt
  FROM public.submit_build_request_v1(1, 'valid-submit-0001', brief);
  request_id := receipt.request_id;
  IF receipt.lifecycle_state <> 'submitted'
    OR receipt.request_version <> 0
    OR receipt.replayed THEN
    RAISE EXCEPTION 'Initial durable submission receipt was invalid.';
  END IF;

  SELECT * INTO replay
  FROM public.submit_build_request_v1(1, 'valid-submit-0001', brief);
  IF replay.request_id <> receipt.request_id
    OR replay.command_id <> receipt.command_id
    OR replay.event_id <> receipt.event_id
    OR NOT replay.replayed
    OR (SELECT COUNT(*) FROM public.build_requests WHERE requester_id = requester) <> 1 THEN
    RAISE EXCEPTION 'Repeated submission did not replay the original receipt.';
  END IF;

  BEGIN
    PERFORM public.submit_build_request_v1(
      1,
      'valid-submit-0001',
      jsonb_set(brief, '{title}', to_jsonb('Changed request title'::TEXT))
    );
    RAISE EXCEPTION 'A reused idempotency key accepted a different request.';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  SELECT current_brief_revision_id, version
  INTO brief_revision_id, request_version
  FROM public.build_requests AS request_value
  WHERE request_value.id = request_id;
  SELECT id INTO acceptance_check_id
  FROM public.build_request_acceptance_checks AS acceptance
  WHERE acceptance.request_id = runtime.request_id
  ORDER BY ordinal
  LIMIT 1;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.build_request_command_v1(
      1, request_id, 99, 'stale-version-0001', 'begin_triage', '{}'::JSONB
    );
    RAISE EXCEPTION 'A stale expected version was accepted.';
  EXCEPTION
    WHEN serialization_failure THEN NULL;
  END;
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, request_version, 'begin-triage-0001', 'begin_triage', '{}'::JSONB
  );
  request_version := receipt.request_version;
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'clarification-0001',
    'request_clarification',
    '{"question":"Which offline browser behavior is essential?"}'::JSONB
  );
  request_version := receipt.request_version;
  clarification_id := (receipt.authority_result->>'clarificationId')::UUID;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'accept-unanswered-clarification',
      'accept',
      jsonb_build_object('builderId', builder, 'targetDate', '2026-08-15')
    );
    RAISE EXCEPTION 'Acceptance succeeded with an unanswered clarification.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Acceptance succeeded with an unanswered clarification.'
      OR SQLSTATE <> '42501' THEN
      RAISE;
    END IF;
  END;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'clarification-answer-0001',
    'submit_clarification',
    jsonb_build_object(
      'clarificationId', clarification_id,
      'answer', 'It must render without network access.'
    )
  );
  request_version := receipt.request_version;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'hold-0001',
    'place_moderation_hold',
    '{"reason":"Independent safety review in progress."}'::JSONB
  );
  request_version := receipt.request_version;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'held-transition-0001',
      'accept',
      jsonb_build_object('builderId', builder, 'targetDate', '2026-08-15')
    );
    RAISE EXCEPTION 'A held request advanced its build lifecycle.';
  EXCEPTION
    WHEN object_not_in_prerequisite_state THEN NULL;
  END;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'release-hold-0001',
    'release_moderation_hold',
    '{"resolution":"Independent safety review cleared the request."}'::JSONB
  );
  request_version := receipt.request_version;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'accept-0001',
    'accept',
    jsonb_build_object('builderId', builder, 'targetDate', '2026-08-15')
  );
  request_version := receipt.request_version;
  builder_assignment_id := (receipt.authority_result->>'assignmentId')::UUID;
  IF receipt.authority_result->>'acceptedClarificationCount' <> '1'
    OR receipt.authority_result->>'acceptedClarificationDigest' !~
      '^[0-9a-f]{64}$'
    OR receipt.authority_result->>'clarificationAcceptanceCutoff' IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_accepted_clarification_sets AS accepted_scope
      WHERE accepted_scope.request_id = runtime.request_id
        AND accepted_scope.brief_revision_id = runtime.brief_revision_id
        AND accepted_scope.accepted_clarification_count = 1
        AND accepted_scope.accepted_clarifications =
          jsonb_build_array(jsonb_build_object(
            'clarificationId', clarification_id,
            'sequence', 1,
            'question', 'Which offline browser behavior is essential?',
            'answer', 'It must render without network access.'
          ))
        AND accepted_scope.accepted_clarification_digest =
          receipt.authority_result->>'acceptedClarificationDigest'
        AND accepted_scope.clarification_acceptance_cutoff =
          (receipt.authority_result->>'clarificationAcceptanceCutoff')::TIMESTAMPTZ
    ) THEN
    RAISE EXCEPTION
      'Acceptance did not freeze the exact answered clarification provenance.';
  END IF;

  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'same-reviewer-0001',
      'assign_reviewer',
      jsonb_build_object('reviewerId', builder)
    );
    RAISE EXCEPTION 'Builder was also assigned as reviewer.';
  EXCEPTION
    WHEN invalid_parameter_value OR check_violation THEN NULL;
  END;

  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'assign-reviewer-0001',
    'assign_reviewer',
    jsonb_build_object('reviewerId', reviewer)
  );
  request_version := receipt.request_version;
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('triager_accepted', public.get_build_request_v1(1, request_id));

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', builder, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1, request_id, request_version, 'start-build-0001', 'start_build', '{}'::JSONB
  );
  request_version := receipt.request_version;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('triager_building', public.get_build_request_v1(1, request_id));
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', builder, 'role', 'authenticated')::TEXT,
    TRUE
  );

  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'stage-artifact-0001',
    'stage_delivery_artifact',
    jsonb_build_object(
      'deliveryRevisionId', delivery_revision_id,
      'acceptedBriefRevisionId', brief_revision_id,
      'activeBuilderAssignmentId', builder_assignment_id,
      'artifactOrdinal', 1,
      'clientFileId', 'fixture-file-1',
      'normalizedName', 'fixture.html',
      'byteLength', 100,
      'sha256', repeat('a', 64),
      'detectedMediaType', 'text/html',
      'scannerVersion', 'fixture-scanner-v1'
    )
  );
  request_version := receipt.request_version;
  artifact_id := (receipt.authority_result->>'artifactId')::UUID;
  stage_receipt_id := receipt.command_id;
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('builder_staging', public.get_build_request_v1(1, request_id));

  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  SELECT public.prepare_build_request_delivery_artifact_object_v1(
    1, request_id, delivery_revision_id, artifact_id, stage_receipt_id
  ) INTO service_result;
  staging_identity := service_result->>'objectIdentity';
  INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES (
    'request-build-deliveries',
    staging_identity,
    '{"fixture":"trusted-custody"}'::JSONB
  );
  SELECT public.attest_build_request_delivery_artifact_object_v1(
    1,
    'attest-artifact-0001',
    request_version,
    request_id,
    delivery_revision_id,
    artifact_id,
    brief_revision_id,
    builder_assignment_id,
    1,
    stage_receipt_id,
    staging_identity,
    repeat('a', 64),
    100,
    'text/html',
    'fixture-scanner-v1',
    'clean'
  ) INTO service_result;
  request_version := (service_result->>'attestationVersion')::INTEGER;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', builder, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'prepare-delivery-0001',
    'prepare_delivery_revision',
    jsonb_build_object(
      'deliveryRevisionId', delivery_revision_id,
      'acceptedBriefRevisionId', brief_revision_id,
      'activeBuilderAssignmentId', builder_assignment_id,
      'revisionLabel', 'First reviewed delivery',
      'summary', 'A deterministic private fixture delivery.',
      'builderEvidence', jsonb_build_array(jsonb_build_object(
        'acceptanceCheckId', acceptance_check_id,
        'result', 'pass',
        'evidenceText', 'The fixture state rendered as required.',
        'evidenceRef', 'fixture-evidence-1'
      )),
      'approvedPathForgeReference', NULL
    )
  );
  request_version := receipt.request_version;
  preparation_receipt_id := receipt.command_id;
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('builder_prepared', public.get_build_request_v1(1, request_id));

  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  BEGIN
    UPDATE public.build_request_clarifications
    SET answer = 'A changed answer must invalidate provenance.'
    WHERE id = clarification_id;
    RAISE EXCEPTION 'An accepted clarification answer was mutable.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'An accepted clarification answer was mutable.'
      OR SQLSTATE <> '55000' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    INSERT INTO public.build_request_clarifications (
      request_id, sequence, question, answer, requested_by,
      requested_at, answered_at
    ) VALUES (
      request_id, 2, 'Late clarification?', 'Late answer.',
      triager, clock_timestamp(), clock_timestamp()
    );
    RAISE EXCEPTION 'A post-acceptance clarification was inserted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'A post-acceptance clarification was inserted.'
      OR SQLSTATE <> '55000' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    DELETE FROM public.build_request_clarifications
    WHERE id = clarification_id;
    RAISE EXCEPTION 'An accepted clarification was deleted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'An accepted clarification was deleted.'
      OR SQLSTATE <> '55000' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    UPDATE public.build_request_accepted_clarification_sets
    SET accepted_clarifications = jsonb_set(
      accepted_clarifications,
      '{0,clarificationId}',
      to_jsonb('8f300000-0000-4000-8000-000000000099'::TEXT)
    )
    WHERE request_id = runtime.request_id;
    RAISE EXCEPTION 'An unrelated clarification id bound to the accepted set.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'An unrelated clarification id bound to the accepted set.' THEN
      RAISE;
    END IF;
  END;
  SELECT public.seal_build_request_delivery_revision_v1(
    1,
    'seal-delivery-0001',
    request_id,
    delivery_revision_id,
    preparation_receipt_id,
    jsonb_build_array(jsonb_build_object(
      'artifact_ordinal', 1,
      'artifact_id', artifact_id
    ))
  ) INTO service_result;
  seal_receipt_id := (service_result->>'sealReceiptId')::UUID;
  manifest_digest := service_result->>'manifestDigest';
  first_manifest_digest := manifest_digest;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_delivery_seals AS seal
    WHERE seal.id = runtime.seal_receipt_id
      AND seal.manifest_digest = runtime.manifest_digest
      AND seal.canonical_manifest->'acceptedClarifications' =
        jsonb_build_array(jsonb_build_object(
          'clarificationId', clarification_id,
          'sequence', 1,
          'question', 'Which offline browser behavior is essential?',
          'answer', 'It must render without network access.'
        ))
      AND seal.canonical_manifest->>'acceptedClarificationCount' = '1'
      AND seal.canonical_manifest->>'acceptedClarificationDigest' =
        (
          SELECT accepted_scope.accepted_clarification_digest
          FROM public.build_request_accepted_clarification_sets AS accepted_scope
          WHERE accepted_scope.request_id = runtime.request_id
        )
      AND (
        seal.canonical_manifest->>'clarificationAcceptanceCutoff'
      )::TIMESTAMPTZ =
        (
          SELECT accepted_scope.clarification_acceptance_cutoff
          FROM public.build_request_accepted_clarification_sets AS accepted_scope
          WHERE accepted_scope.request_id = runtime.request_id
        )
      AND seal.canonical_manifest->'acceptedBrief'->'pathforgeReference' =
        jsonb_build_object(
          'kind', 'project',
          'projectId', '81200000-0000-4000-8000-000000000001'
        )
      AND seal.canonical_manifest->'approvedPathForgeReference' = 'null'::JSONB
  ) THEN
    RAISE EXCEPTION
      'Canonical manifest lost deterministic clarification or brief provenance: %',
      (
        SELECT seal.canonical_manifest
        FROM public.build_request_delivery_seals AS seal
        WHERE seal.id = runtime.seal_receipt_id
      );
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', builder, 'role', 'authenticated')::TEXT,
    TRUE
  );
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('builder_sealed', public.get_build_request_v1(1, request_id));
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'submit-delivery-0001',
    'submit_delivery',
    jsonb_build_object(
      'deliveryRevisionId', delivery_revision_id,
      'sealReceiptId', seal_receipt_id
    )
  );
  request_version := receipt.request_version;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('triager_review_pending', public.get_build_request_v1(1, request_id));
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', reviewer, 'role', 'authenticated')::TEXT,
    TRUE
  );
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('reviewer_submitted', public.get_build_request_v1(1, request_id));
  SELECT count(*) INTO review_count_before
  FROM public.build_request_delivery_reviews AS review
  WHERE review.request_id = runtime.request_id;
  SELECT count(*) INTO review_event_count_before
  FROM public.build_request_events AS review_event
  WHERE review_event.request_id = runtime.request_id;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'approve-delivery-checklist-mismatch',
      'approve_delivery',
      jsonb_build_object(
        'deliveryRevisionId', delivery_revision_id,
        'manifestDigest', manifest_digest,
        'checklistVersion', 2,
        'checks', jsonb_build_array(jsonb_build_object(
          'acceptanceCheckId', acceptance_check_id,
          'result', 'pass',
          'evidenceRef', 'fixture-review-mismatch-approve'
        )),
        'safetyIntegrityResult', 'pass',
        'reviewNotes', 'Otherwise valid mismatched approval.'
      )
    );
    RAISE EXCEPTION 'Mismatched approval checklist version was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Mismatched approval checklist version was accepted.' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'repair-delivery-checklist-mismatch',
      'request_repair',
      jsonb_build_object(
        'deliveryRevisionId', delivery_revision_id,
        'manifestDigest', manifest_digest,
        'checklistVersion', 2,
        'checks', jsonb_build_array(jsonb_build_object(
          'acceptanceCheckId', acceptance_check_id,
          'result', 'fail',
          'evidenceRef', 'fixture-review-mismatch-repair'
        )),
        'safetyIntegrityResult', 'fail',
        'reason', 'Otherwise valid mismatched repair.',
        'repairInstructions', 'Repair the fixture acceptance check.'
      )
    );
    RAISE EXCEPTION 'Mismatched repair checklist version was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Mismatched repair checklist version was accepted.' THEN
      RAISE;
    END IF;
  END;
  IF request_version <> (
      SELECT request_case.version
      FROM public.build_requests AS request_case
      WHERE request_case.id = runtime.request_id
    )
    OR review_count_before <> (
      SELECT count(*)
      FROM public.build_request_delivery_reviews AS review
      WHERE review.request_id = runtime.request_id
    )
    OR review_event_count_before <> (
      SELECT count(*)
      FROM public.build_request_events AS review_event
      WHERE review_event.request_id = runtime.request_id
    ) THEN
    RAISE EXCEPTION
      'Checklist-version mismatch mutated request, review, or event authority.';
  END IF;
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'approve-delivery-0001',
    'approve_delivery',
    jsonb_build_object(
      'deliveryRevisionId', delivery_revision_id,
      'manifestDigest', manifest_digest,
      'checklistVersion', 1,
      'checks', jsonb_build_array(jsonb_build_object(
        'acceptanceCheckId', acceptance_check_id,
        'result', 'pass',
        'evidenceRef', 'fixture-review-1'
      )),
      'safetyIntegrityResult', 'pass',
      'reviewNotes', 'Independent first review passed.'
    )
  );
  request_version := receipt.request_version;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'acknowledge-delivery-0001',
    'acknowledge_delivery',
    jsonb_build_object('deliveryRevisionId', delivery_revision_id)
  );
  request_version := receipt.request_version;
  UPDATE public.build_request_participants AS prior_triager
  SET active = FALSE
  WHERE prior_triager.request_id = runtime.request_id
    AND prior_triager.actor_role = 'triager'
    AND prior_triager.account_id = triager
    AND prior_triager.active;
  INSERT INTO public.build_request_participants (
    request_id, actor_role, account_id, display_name
  ) VALUES (
    request_id, 'triager', requester, 'Fixture Requester'
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'delivery-outcome-failed-0001',
    'requester_delivery_outcome',
    jsonb_build_object(
      'deliveryRevisionId', delivery_revision_id,
      'manifestDigest', manifest_digest,
      'outcome', 'failed_acceptance_check',
      'failedAcceptanceCheckId', acceptance_check_id,
      'reason', 'The offline fixture did not preserve the required state.'
    )
  );
  request_version := receipt.request_version;
  IF receipt.lifecycle_state <> 'repair_required'
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_events AS outcome_event
      WHERE outcome_event.id = receipt.event_id
        AND outcome_event.actor_id = requester
        AND outcome_event.actor_role = 'requester'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_participants AS dual_role
      WHERE dual_role.request_id = runtime.request_id
        AND dual_role.actor_role = 'triager'
        AND dual_role.account_id = requester
        AND dual_role.active
    ) THEN
    RAISE EXCEPTION
      'Dual-role requester outcome did not retain requester attribution.';
  END IF;
  UPDATE public.build_request_participants AS requester_triager
  SET active = FALSE
  WHERE requester_triager.request_id = runtime.request_id
    AND requester_triager.actor_role = 'triager'
    AND requester_triager.account_id = requester
    AND requester_triager.active;
  UPDATE public.build_request_participants AS prior_triager
  SET active = TRUE
  WHERE prior_triager.request_id = runtime.request_id
    AND prior_triager.actor_role = 'triager'
    AND prior_triager.account_id = triager
    AND NOT prior_triager.active;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('triager_repair_required', public.get_build_request_v1(1, request_id));

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', builder, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'stage-artifact-0002',
    'stage_delivery_artifact',
    jsonb_build_object(
      'deliveryRevisionId', second_delivery_revision_id,
      'acceptedBriefRevisionId', brief_revision_id,
      'activeBuilderAssignmentId', builder_assignment_id,
      'artifactOrdinal', 1,
      'clientFileId', 'fixture-file-2',
      'normalizedName', 'fixture-repaired.html',
      'byteLength', 120,
      'sha256', repeat('c', 64),
      'detectedMediaType', 'text/html',
      'scannerVersion', 'fixture-scanner-v1'
    )
  );
  request_version := receipt.request_version;
  artifact_id := (receipt.authority_result->>'artifactId')::UUID;
  stage_receipt_id := receipt.command_id;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  SELECT public.prepare_build_request_delivery_artifact_object_v1(
    1, request_id, second_delivery_revision_id, artifact_id, stage_receipt_id
  ) INTO service_result;
  staging_identity := service_result->>'objectIdentity';
  INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES (
    'request-build-deliveries',
    staging_identity,
    '{"fixture":"trusted-custody"}'::JSONB
  );
  SELECT public.attest_build_request_delivery_artifact_object_v1(
    1,
    'attest-artifact-0002',
    request_version,
    request_id,
    second_delivery_revision_id,
    artifact_id,
    brief_revision_id,
    builder_assignment_id,
    1,
    stage_receipt_id,
    staging_identity,
    repeat('c', 64),
    120,
    'text/html',
    'fixture-scanner-v1',
    'clean'
  ) INTO service_result;
  request_version := (service_result->>'attestationVersion')::INTEGER;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', builder, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'prepare-delivery-0002',
    'prepare_delivery_revision',
    jsonb_build_object(
      'deliveryRevisionId', second_delivery_revision_id,
      'acceptedBriefRevisionId', brief_revision_id,
      'activeBuilderAssignmentId', builder_assignment_id,
      'revisionLabel', 'Repaired reviewed delivery',
      'summary', 'The deterministic fixture repair.',
      'builderEvidence', jsonb_build_array(jsonb_build_object(
        'acceptanceCheckId', acceptance_check_id,
        'result', 'pass',
        'evidenceText', 'The repaired fixture state rendered as required.',
        'evidenceRef', 'fixture-evidence-2'
      )),
      'approvedPathForgeReference', jsonb_build_object(
        'kind', 'response',
        'projectId', '81200000-0000-4000-8000-000000000001',
        'modelVariantId', '81300000-0000-4000-8000-000000000001',
        'responseStepNumber', 1
      )
    )
  );
  request_version := receipt.request_version;
  preparation_receipt_id := receipt.command_id;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  SELECT public.seal_build_request_delivery_revision_v1(
    1,
    'seal-delivery-0002',
    request_id,
    second_delivery_revision_id,
    preparation_receipt_id,
    jsonb_build_array(jsonb_build_object(
      'artifact_ordinal', 1,
      'artifact_id', artifact_id
    ))
  ) INTO service_result;
  seal_receipt_id := (service_result->>'sealReceiptId')::UUID;
  manifest_digest := service_result->>'manifestDigest';
  IF manifest_digest = first_manifest_digest
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_delivery_seals AS seal
      WHERE seal.id = runtime.seal_receipt_id
        AND seal.manifest_digest = runtime.manifest_digest
        AND seal.canonical_manifest->'acceptedBrief'->'pathforgeReference' =
          jsonb_build_object(
            'kind', 'project',
            'projectId', '81200000-0000-4000-8000-000000000001'
          )
        AND seal.canonical_manifest->'approvedPathForgeReference' =
          jsonb_build_object(
            'kind', 'response',
            'projectId', '81200000-0000-4000-8000-000000000001',
            'modelVariantId', '81300000-0000-4000-8000-000000000001',
            'responseStepNumber', 1
          )
    ) THEN
    RAISE EXCEPTION
      'Accepted brief and approved response provenance were conflated or unhashed.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', builder, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'resubmit-delivery-0001',
    'resubmit_delivery',
    jsonb_build_object(
      'deliveryRevisionId', second_delivery_revision_id,
      'sealReceiptId', seal_receipt_id
    )
  );
  request_version := receipt.request_version;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', reviewer, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    SELECT * INTO receipt FROM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'repair-delivery-final-attribution',
      'request_repair',
      jsonb_build_object(
        'deliveryRevisionId', second_delivery_revision_id,
        'manifestDigest', manifest_digest,
        'checklistVersion', 1,
        'checks', jsonb_build_array(jsonb_build_object(
          'acceptanceCheckId', acceptance_check_id,
          'result', 'fail',
          'evidenceRef', 'fixture-final-review-repair'
        )),
        'safetyIntegrityResult', 'fail',
        'reason', 'The final independent review failed the accepted check.',
        'repairInstructions', 'No further repair revision remains.'
      )
    );
    IF receipt.request_version <> request_version + 1
      OR receipt.lifecycle_state <> 'closed'
      OR receipt.moderation_state <> 'clear'
      OR receipt.publication_state <> 'private'
      OR receipt.close_reason <> 'failed_review'
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_events AS repair_event
        WHERE repair_event.id = receipt.event_id
          AND repair_event.request_id = runtime.request_id
          AND repair_event.event_kind = 'request_repair'
          AND repair_event.actor_id = reviewer
          AND repair_event.actor_role = 'reviewer'
          AND repair_event.resulting_request_version =
            receipt.request_version
          AND repair_event.new_lifecycle_state = 'closed'
          AND repair_event.new_close_reason = 'failed_review'
      ) THEN
      RAISE EXCEPTION
        'Final reviewer repair receipt or raw terminal attribution drifted.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS terminal_assignment
      WHERE terminal_assignment.request_id = runtime.request_id
        AND terminal_assignment.active
    ) OR EXISTS (
      SELECT 1
      FROM public.build_request_participants AS terminal_participant
      WHERE terminal_participant.request_id = runtime.request_id
        AND terminal_participant.active
    ) THEN
      RAISE EXCEPTION
        'Final reviewer repair retained an active assignment or participant.';
    END IF;
    BEGIN
      PERFORM public.list_build_request_events_v1(
        1, request_id, NULL, 50
      );
      RAISE EXCEPTION 'Former reviewer retained terminal event access.';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'Former reviewer retained terminal event access.'
        OR SQLSTATE <> 'P0002' THEN
        RAISE;
      END IF;
    END;
    BEGIN
      PERFORM public.get_build_request_v1(1, request_id);
      RAISE EXCEPTION 'Former reviewer retained terminal detail access.';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'Former reviewer retained terminal detail access.'
        OR SQLSTATE <> 'P0002' THEN
        RAISE;
      END IF;
    END;
    service_result := public.resolve_build_request_delivery_artifact_v1(
      1, artifact_id
    );
    IF service_result IS DISTINCT FROM jsonb_build_object(
      'status', 'unavailable', 'reason', 'not_found'
    ) THEN
      RAISE EXCEPTION 'Former reviewer retained terminal artifact reader access.';
    END IF;
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
      TRUE
    );
    service_result := public.list_build_request_events_v1(
      1, request_id, NULL, 50
    );
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(service_result->'items') AS event_item
      WHERE event_item->>'eventId' = receipt.event_id::TEXT
        AND event_item->>'kind' = 'delivery_repair_requested'
        AND event_item->>'actorRole' = 'reviewer'
        AND event_item->'actor'->>'displayName' = 'Fixture Reviewer'
        AND event_item->'actor'->>'deidentified' = 'false'
        AND NOT (event_item->'actor') ? 'accountId'
        AND event_item->'newAxes'->>'lifecycleState' = 'closed'
        AND event_item->'newAxes'->>'closeReason' = 'failed_review'
    ) THEN
      RAISE EXCEPTION
        'Final reviewer repair participant event attribution drifted.';
    END IF;
    RAISE EXCEPTION 'rollback-final-reviewer-repair-fixture';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'rollback-final-reviewer-repair-fixture' THEN
      RAISE;
    END IF;
  END;
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'approve-delivery-0002',
    'approve_delivery',
    jsonb_build_object(
      'deliveryRevisionId', second_delivery_revision_id,
      'manifestDigest', manifest_digest,
      'checklistVersion', 1,
      'checks', jsonb_build_array(jsonb_build_object(
        'acceptanceCheckId', acceptance_check_id,
        'result', 'pass',
        'evidenceRef', 'fixture-review-2'
      )),
      'safetyIntegrityResult', 'pass',
      'reviewNotes', 'Independent review passed.'
    )
  );
  request_version := receipt.request_version;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('triager_delivery_ready', public.get_build_request_v1(1, request_id));
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  UPDATE public.build_request_participants AS prior_triager
  SET active = FALSE
  WHERE prior_triager.request_id = runtime.request_id
    AND prior_triager.actor_role = 'triager'
    AND prior_triager.account_id = triager
    AND prior_triager.active;
  INSERT INTO public.build_request_participants (
    request_id, actor_role, account_id, display_name
  ) VALUES (
    request_id, 'triager', requester, 'Fixture Requester'
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'acknowledge-delivery-0002',
    'acknowledge_delivery',
    jsonb_build_object('deliveryRevisionId', second_delivery_revision_id)
  );
  request_version := receipt.request_version;
  IF receipt.lifecycle_state <> 'delivered' THEN
    RAISE EXCEPTION 'Delivery acknowledgement did not transition to delivered.';
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES ('triager_delivered', public.get_build_request_v1(1, request_id));
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'delivery-outcome-failed-0002',
    'requester_delivery_outcome',
    jsonb_build_object(
      'deliveryRevisionId', second_delivery_revision_id,
      'manifestDigest', manifest_digest,
      'outcome', 'failed_acceptance_check',
      'failedAcceptanceCheckId', acceptance_check_id,
      'reason', 'The repaired fixture still failed the accepted check.'
    )
  );
  request_version := receipt.request_version;
  IF receipt.lifecycle_state <> 'closed'
    OR receipt.close_reason <> 'failed_review'
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_events AS outcome_event
      WHERE outcome_event.id = receipt.event_id
        AND outcome_event.actor_id = requester
        AND outcome_event.actor_role = 'requester'
    ) THEN
    RAISE EXCEPTION
      'Final requester acceptance failure did not close with failed_review.';
  END IF;

  -- A second request proves requester withdrawal independently.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester_two, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt FROM public.submit_build_request_v1(
    1,
    'withdraw-submit-0001',
    jsonb_set(brief, '{title}', to_jsonb('Withdrawn fixture request'::TEXT))
  );
  request_two_id := receipt.request_id;
  SELECT * INTO receipt FROM public.build_request_command_v1(
    1,
    request_two_id,
    0,
    'withdraw-command-0001',
    'withdraw',
    '{"reason":"The requester no longer needs this build."}'::JSONB
  );
  IF receipt.lifecycle_state <> 'closed'
    OR receipt.close_reason <> 'withdrawn'
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_events AS withdrawal_event
      WHERE withdrawal_event.id = receipt.event_id
        AND withdrawal_event.actor_id = requester_two
        AND withdrawal_event.actor_role = 'requester'
        AND withdrawal_event.resulting_request_version =
          receipt.request_version
        AND withdrawal_event.new_lifecycle_state = 'closed'
        AND withdrawal_event.new_close_reason = 'withdrawn'
    ) THEN
    RAISE EXCEPTION 'Requester withdrawal did not close truthfully.';
  END IF;
  service_result := public.list_build_request_events_v1(
    1, request_two_id, NULL, 50
  );
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(service_result->'items') AS event_item
    WHERE event_item->>'eventId' = receipt.event_id::TEXT
      AND event_item->>'kind' = 'request_withdrawn'
      AND event_item->>'actorRole' = 'requester'
      AND event_item->'actor'->>'displayName' = 'Second Requester'
      AND event_item->'actor'->>'deidentified' = 'false'
      AND NOT (event_item->'actor') ? 'accountId'
      AND event_item->'newAxes'->>'lifecycleState' = 'closed'
      AND event_item->'newAxes'->>'closeReason' = 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'Requester withdrawal participant attribution drifted.';
  END IF;

  -- Account deletion preserves case truth while removing live identity.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  service_result := public.deidentify_build_request_account_v1(
    1,
    requester,
    'deidentify-requester-0001'
  );
  SELECT version INTO request_version
  FROM public.build_requests WHERE id = request_id;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_requests AS request_value
    WHERE request_value.id = request_id
      AND requester_id IS NULL
      AND requester_deidentified
      AND requester_display_name = 'Former participant'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.build_request_events AS event_value
    WHERE event_value.request_id = runtime.request_id
  ) THEN
    RAISE EXCEPTION 'Account deletion did not tombstone identity and preserve truth.';
  END IF;

  SELECT COUNT(*) INTO event_count_before_delete
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = runtime.request_id;
  DELETE FROM public.profiles WHERE id = requester;
  DELETE FROM auth.users WHERE id = requester;
  IF NOT EXISTS (
    SELECT 1 FROM public.build_requests AS request_value
    WHERE request_value.id = runtime.request_id
  ) OR (
    SELECT COUNT(*)
    FROM public.build_request_events AS event_value
    WHERE event_value.request_id = runtime.request_id
  ) <> event_count_before_delete THEN
    RAISE EXCEPTION 'Profile/account deletion erased retained case truth.';
  END IF;

  BEGIN
    DELETE FROM public.build_request_events AS request_event
    WHERE request_event.request_id = runtime.request_id;
    RAISE EXCEPTION 'Historical request events were deletable.';
  EXCEPTION
    WHEN object_not_in_prerequisite_state THEN NULL;
  END;
END;
$test$;
