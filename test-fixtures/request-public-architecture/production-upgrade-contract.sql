\set ON_ERROR_STOP on

-- This fixture begins from the production-shaped sequence:
-- immutable private authority -> public architecture -> forward-only repair.
-- It proves the repair changes the already-installed functions rather than
-- relying on edits to an historical migration.
DO $request_production_upgrade_contract$
DECLARE
  v_admin CONSTANT UUID :=
    '9c100000-0000-4000-8000-000000000001';
  v_requester CONSTANT UUID :=
    '9c100000-0000-4000-8000-000000000002';
  v_builder CONSTANT UUID :=
    '9c100000-0000-4000-8000-000000000003';
  v_expired_target CONSTANT UUID :=
    '9c100000-0000-4000-8000-000000000004';
  v_request CONSTANT UUID :=
    '9c200000-0000-4000-8000-000000000001';
  v_brief CONSTANT UUID :=
    '9c300000-0000-4000-8000-000000000001';
  v_check CONSTANT UUID :=
    '9c300000-0000-4000-8000-000000000002';
  v_assignment CONSTANT UUID :=
    '9c300000-0000-4000-8000-000000000003';
  v_delivery CONSTANT UUID :=
    '9c300000-0000-4000-8000-000000000004';
  v_manifest CONSTANT TEXT := repeat('b', 64);
  v_version CONSTANT INTEGER := 17;
  v_events_before INTEGER;
  v_receipts_before INTEGER;
  v_artifacts_before INTEGER;
  v_revisions_before INTEGER;
  v_outcomes_before INTEGER;
  v_historical_expiry TIMESTAMPTZ;
  v_admission_payload JSONB;
  v_replay JSONB;
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at, email) VALUES
    (
      v_admin,
      clock_timestamp(),
      'request-upgrade-admin@example.test'
    ),
    (
      v_requester,
      clock_timestamp(),
      'request-upgrade-requester@example.test'
    ),
    (
      v_builder,
      clock_timestamp(),
      'request-upgrade-builder@example.test'
    ),
    (
      v_expired_target,
      clock_timestamp(),
      'request-upgrade-expired@example.test'
    );
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (
      v_admin,
      'admin',
      'request_upgrade_admin',
      'Request Upgrade Admin'
    ),
    (
      v_requester,
      'user',
      'request_upgrade_requester',
      'Request Upgrade Requester'
    ),
    (
      v_builder,
      'user',
      'request_upgrade_builder',
      'Request Upgrade Builder'
    ),
    (
      v_expired_target,
      'user',
      'request_upgrade_expired',
      'Request Upgrade Expired Participant'
    );
  INSERT INTO public.build_request_operator_memberships (
    account_id,
    operator_role,
    membership_state,
    max_active_cases,
    changed_by,
    reason
  ) VALUES (
    v_builder,
    'builder',
    'active',
    2,
    v_admin,
    'Production upgrade fixture builder capacity.'
  );
  INSERT INTO public.build_requests (
    id,
    requester_id,
    requester_display_name,
    version,
    lifecycle_state,
    target_date
  ) VALUES (
    v_request,
    v_requester,
    'Request Upgrade Requester',
    v_version,
    'building',
    current_date + 7
  );
  INSERT INTO public.build_request_brief_revisions (
    id,
    request_id,
    revision_number,
    title,
    outcome,
    intended_user,
    must_work_scenario,
    constraints,
    authored_by
  ) VALUES (
    v_brief,
    v_request,
    1,
    'Production upgrade fixture',
    'Produce an exact private artifact for the production upgrade fixture.',
    'The production upgrade requester',
    'The artifact opens from a clean offline browser session.',
    'Keep the fixture private and deterministic.',
    v_requester
  );
  INSERT INTO public.build_request_acceptance_checks (
    id,
    request_id,
    brief_revision_id,
    ordinal,
    check_text
  ) VALUES (
    v_check,
    v_request,
    v_brief,
    1,
    'The exact fixture artifact opens offline.'
  );
  UPDATE public.build_requests
  SET current_brief_revision_id = v_brief
  WHERE id = v_request;
  INSERT INTO public.build_request_assignments (
    id,
    request_id,
    assignment_role,
    account_id,
    display_name,
    assigned_by
  ) VALUES (
    v_assignment,
    v_request,
    'builder',
    v_builder,
    'Request Upgrade Builder',
    v_admin
  );

  SELECT count(*) INTO v_events_before
  FROM public.build_request_events
  WHERE request_id = v_request;
  SELECT count(*) INTO v_receipts_before
  FROM public.build_request_command_receipts
  WHERE request_id = v_request;
  SELECT count(*) INTO v_artifacts_before
  FROM public.build_request_delivery_artifacts
  WHERE request_id = v_request;
  SELECT count(*) INTO v_revisions_before
  FROM public.build_request_delivery_revisions
  WHERE request_id = v_request;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_builder,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  BEGIN
    PERFORM *
    FROM public.build_request_command_v1(
      1,
      v_request,
      v_version,
      'upgrade-stage-null-brief',
      'stage_delivery_artifact',
      jsonb_build_object(
        'deliveryRevisionId', v_delivery,
        'acceptedBriefRevisionId', 'null'::JSONB,
        'activeBuilderAssignmentId', v_assignment,
        'artifactOrdinal', 1,
        'clientFileId', 'upgrade-null-brief',
        'normalizedName', 'fixture.html',
        'byteLength', 100,
        'sha256', repeat('a', 64),
        'detectedMediaType', 'text/html',
        'scannerVersion', 'fixture-scanner-v1'
      )
    );
    RAISE EXCEPTION
      'Production upgrade accepted a JSON-null brief revision.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_command_v1(
      1,
      v_request,
      v_version,
      'upgrade-stage-malformed-brief',
      'stage_delivery_artifact',
      jsonb_build_object(
        'deliveryRevisionId', v_delivery,
        'acceptedBriefRevisionId', 'not-a-uuid',
        'activeBuilderAssignmentId', v_assignment,
        'artifactOrdinal', 1,
        'clientFileId', 'upgrade-malformed-brief',
        'normalizedName', 'fixture.html',
        'byteLength', 100,
        'sha256', repeat('a', 64),
        'detectedMediaType', 'text/html',
        'scannerVersion', 'fixture-scanner-v1'
      )
    );
    RAISE EXCEPTION
      'Production upgrade accepted a malformed brief revision.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_command_v1(
      1,
      v_request,
      v_version,
      'upgrade-stage-wrong-brief',
      'stage_delivery_artifact',
      jsonb_build_object(
        'deliveryRevisionId', v_delivery,
        'acceptedBriefRevisionId',
          '9c300000-0000-4000-8000-000000000099',
        'activeBuilderAssignmentId', v_assignment,
        'artifactOrdinal', 1,
        'clientFileId', 'upgrade-wrong-brief',
        'normalizedName', 'fixture.html',
        'byteLength', 100,
        'sha256', repeat('a', 64),
        'detectedMediaType', 'text/html',
        'scannerVersion', 'fixture-scanner-v1'
      )
    );
    RAISE EXCEPTION
      'Production upgrade accepted the wrong brief revision.';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;
  IF v_events_before <> (
      SELECT count(*)
      FROM public.build_request_events
      WHERE request_id = v_request
    )
    OR v_receipts_before <> (
      SELECT count(*)
      FROM public.build_request_command_receipts
      WHERE request_id = v_request
    )
    OR v_artifacts_before <> (
      SELECT count(*)
      FROM public.build_request_delivery_artifacts
      WHERE request_id = v_request
    )
    OR v_revisions_before <> (
      SELECT count(*)
      FROM public.build_request_delivery_revisions
      WHERE request_id = v_request
    )
    OR (
      SELECT version
      FROM public.build_requests
      WHERE id = v_request
    ) <> v_version
  THEN
    RAISE EXCEPTION
      'Hostile upgraded staging mutated Request authority.';
  END IF;

  INSERT INTO public.build_request_delivery_revisions (
    id,
    request_id,
    revision_number,
    revision_state,
    accepted_brief_revision_id,
    builder_assignment_id,
    artifact_manifest_digest,
    artifact_count,
    total_bytes,
    evidence_checklist_version,
    rights_snapshot_version,
    revision_label,
    summary,
    authored_by,
    authored_by_display_name,
    submitted_at
  ) VALUES (
    v_delivery,
    v_request,
    1,
    'submitted',
    v_brief,
    v_assignment,
    v_manifest,
    1,
    100,
    1,
    1,
    'Production upgrade delivery',
    'An immutable production-upgrade fixture delivery.',
    v_builder,
    'Request Upgrade Builder',
    clock_timestamp()
  );
  UPDATE public.build_requests
  SET lifecycle_state = 'delivery_ready',
      current_delivery_revision_id = v_delivery
  WHERE id = v_request;

  SELECT count(*) INTO v_outcomes_before
  FROM public.build_request_requester_outcomes
  WHERE request_id = v_request;
  SELECT count(*) INTO v_events_before
  FROM public.build_request_events
  WHERE request_id = v_request;
  SELECT count(*) INTO v_receipts_before
  FROM public.build_request_command_receipts
  WHERE request_id = v_request;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );

  BEGIN
    PERFORM *
    FROM public.build_request_command_v1(
      1,
      v_request,
      v_version,
      'upgrade-ack-null-revision',
      'acknowledge_delivery',
      jsonb_build_object('deliveryRevisionId', 'null'::JSONB)
    );
    RAISE EXCEPTION
      'Production upgrade accepted a JSON-null acknowledgement revision.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_command_v1(
      1,
      v_request,
      v_version,
      'upgrade-ack-malformed-revision',
      'acknowledge_delivery',
      jsonb_build_object('deliveryRevisionId', 'not-a-uuid')
    );
    RAISE EXCEPTION
      'Production upgrade accepted a malformed acknowledgement revision.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_command_v1(
      1,
      v_request,
      v_version,
      'upgrade-ack-wrong-revision',
      'acknowledge_delivery',
      jsonb_build_object(
        'deliveryRevisionId',
        '9c300000-0000-4000-8000-000000000099'
      )
    );
    RAISE EXCEPTION
      'Production upgrade accepted the wrong acknowledgement revision.';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;

  BEGIN
    PERFORM *
    FROM public.build_request_command_v1(
      1,
      v_request,
      v_version,
      'upgrade-outcome-null-revision',
      'requester_delivery_outcome',
      jsonb_build_object(
        'deliveryRevisionId', 'null'::JSONB,
        'manifestDigest', v_manifest,
        'outcome', 'useful'
      )
    );
    RAISE EXCEPTION
      'Production upgrade accepted a JSON-null outcome revision.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_command_v1(
      1,
      v_request,
      v_version,
      'upgrade-outcome-malformed-revision',
      'requester_delivery_outcome',
      jsonb_build_object(
        'deliveryRevisionId', 'not-a-uuid',
        'manifestDigest', v_manifest,
        'outcome', 'useful'
      )
    );
    RAISE EXCEPTION
      'Production upgrade accepted a malformed outcome revision.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_command_v1(
      1,
      v_request,
      v_version,
      'upgrade-outcome-wrong-revision',
      'requester_delivery_outcome',
      jsonb_build_object(
        'deliveryRevisionId',
          '9c300000-0000-4000-8000-000000000099',
        'manifestDigest', v_manifest,
        'outcome', 'useful'
      )
    );
    RAISE EXCEPTION
      'Production upgrade accepted the wrong outcome revision.';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;
  IF v_outcomes_before <> (
      SELECT count(*)
      FROM public.build_request_requester_outcomes
      WHERE request_id = v_request
    )
    OR v_events_before <> (
      SELECT count(*)
      FROM public.build_request_events
      WHERE request_id = v_request
    )
    OR v_receipts_before <> (
      SELECT count(*)
      FROM public.build_request_command_receipts
      WHERE request_id = v_request
    )
    OR (
      SELECT version
      FROM public.build_requests
      WHERE id = v_request
    ) <> v_version
    OR (
      SELECT lifecycle_state
      FROM public.build_requests
      WHERE id = v_request
    ) <> 'delivery_ready'
  THEN
    RAISE EXCEPTION
      'Hostile upgraded acknowledgement or outcome mutated Request authority.';
  END IF;

  v_historical_expiry := clock_timestamp() - INTERVAL '1 day';
  v_admission_payload := jsonb_build_object(
    'accountId', v_expired_target,
    'expectedVersion', 0,
    'admitted', TRUE,
    'reason', 'Production upgrade durable replay fixture.',
    'expiresAt', v_historical_expiry
  );
  INSERT INTO public.build_request_pilot_admissions (
    account_id,
    admission_version,
    admitted,
    expires_at,
    reason,
    changed_by,
    changed_at
  ) VALUES (
    v_expired_target,
    1,
    TRUE,
    v_historical_expiry,
    'Production upgrade durable replay fixture.',
    v_admin,
    v_historical_expiry - INTERVAL '1 hour'
  );
  INSERT INTO public.build_request_pilot_admission_receipts (
    actor_id,
    account_id,
    idempotency_key,
    request_hash,
    admission_version,
    admitted,
    expires_at,
    occurred_at
  ) VALUES (
    v_admin,
    v_expired_target,
    'upgrade-expired-admission-replay',
    private.request_pseudonym_text_v1(v_admission_payload::TEXT),
    1,
    TRUE,
    v_historical_expiry,
    v_historical_expiry - INTERVAL '1 hour'
  );
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_replay := public.set_build_request_pilot_admission_v1(
    1,
    v_expired_target,
    0,
    'upgrade-expired-admission-replay',
    TRUE,
    'Production upgrade durable replay fixture.',
    v_historical_expiry
  );
  IF NOT (v_replay->>'replayed')::BOOLEAN
    OR (v_replay->>'expiresAt')::TIMESTAMPTZ
      IS DISTINCT FROM v_historical_expiry
  THEN
    RAISE EXCEPTION
      'Production upgrade did not preserve the durable admission replay: %',
      v_replay;
  END IF;
END;
$request_production_upgrade_contract$;
