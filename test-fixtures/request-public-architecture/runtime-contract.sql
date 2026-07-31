\set ON_ERROR_STOP on

DO $request_public_architecture_runtime$
DECLARE
  v_admin CONSTANT UUID :=
    '9a100000-0000-4000-8000-000000000001';
  v_requester CONSTANT UUID :=
    '9a100000-0000-4000-8000-000000000002';
  v_builder CONSTANT UUID :=
    '9a100000-0000-4000-8000-000000000003';
  v_reviewer CONSTANT UUID :=
    '9a100000-0000-4000-8000-000000000004';
  v_extra CONSTANT UUID :=
    '9a100000-0000-4000-8000-000000000005';
  v_project CONSTANT UUID :=
    '81200000-0000-4000-8000-000000000001';
  v_decoy_request CONSTANT UUID :=
    '9a200000-0000-4000-8000-000000000010';
  v_decoy_report CONSTANT UUID :=
    '9a400000-0000-4000-8000-000000000010';
  v_request_id UUID;
  v_replayed_request_id UUID;
  v_brief_id UUID;
  v_delivery_id UUID :=
    '9a200000-0000-4000-8000-000000000001';
  v_artifact_id UUID :=
    '9a200000-0000-4000-8000-000000000002';
  v_builder_assignment_id UUID :=
    '9a300000-0000-4000-8000-000000000001';
  v_reviewer_assignment_id UUID :=
    '9a300000-0000-4000-8000-000000000002';
  v_prior_builder_assignment_id UUID :=
    '9a300000-0000-4000-8000-000000000003';
  v_terminal_event_id UUID :=
    '9a400000-0000-4000-8000-000000000003';
  v_review_id UUID :=
    '9a400000-0000-4000-8000-000000000001';
  v_manifest CONSTANT TEXT := repeat('b', 64);
  v_grant_id UUID;
  v_expired_grant_id UUID :=
    '9a200000-0000-4000-8000-000000000020';
  v_capacity_grant_id UUID;
  v_report_id UUID;
  v_proposal_id UUID;
  v_public_slug TEXT;
  v_request_version INTEGER;
  v_controls JSONB;
  v_public_brief JSONB;
  v_public_attestation JSONB;
  v_result JSONB;
  v_replay JSONB;
  v_queue JSONB;
  v_public JSONB;
  v_claim JSONB;
  v_claim_item JSONB;
  v_blocked BOOLEAN;
  v_detail TEXT;
  v_count INTEGER;
  v_expired_at TIMESTAMPTZ;
BEGIN
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (v_admin, 'admin', 'public-arch-admin', 'Public Architecture Admin'),
    (v_requester, 'user', 'public-arch-requester', 'Public Architecture Requester'),
    (v_builder, 'user', 'public-arch-builder', 'Public Architecture Builder'),
    (v_reviewer, 'user', 'public-arch-reviewer', 'Public Architecture Reviewer'),
    (v_extra, 'user', 'public-arch-extra', 'Public Architecture Extra');

  INSERT INTO auth.users (id, email_confirmed_at, email) VALUES
    (v_admin, clock_timestamp(), 'admin@example.test'),
    (v_requester, clock_timestamp(), 'requester@example.test'),
    (v_builder, clock_timestamp(), 'builder@example.test'),
    (v_reviewer, clock_timestamp(), 'reviewer@example.test'),
    (v_extra, clock_timestamp(), 'extra@example.test');

  SELECT private.request_public_controls_json_v1() INTO v_result;
  IF v_result->>'controlsVersion' <> '1'
    OR (v_result->>'acceptingRequests')::BOOLEAN
    OR (v_result->>'assigningRequests')::BOOLEAN
    OR v_result->>'intakeAudience' <> 'invited'
    OR (v_result->>'activeCaseCapacity')::INTEGER <> 4
    OR (v_result->>'fulfillmentCaseCapacity')::INTEGER <> 4
    OR (v_result->>'transactionalNotificationsEnabled')::BOOLEAN
    OR (v_result->>'publicationConsentEnabled')::BOOLEAN
    OR (v_result->>'publicationAirlockEnabled')::BOOLEAN
    OR (v_result->>'publicOutcomesEnabled')::BOOLEAN
  THEN
    RAISE EXCEPTION
      'Public architecture did not install with every expansion gate off: %',
      v_result;
  END IF;

  IF has_table_privilege(
      'authenticated', 'public.build_request_reports', 'SELECT'
    )
    OR has_table_privilege(
      'authenticated',
      'public.build_request_publication_proposals',
      'INSERT'
    )
    OR has_table_privilege(
      'service_role',
      'public.build_request_notification_deliveries',
      'UPDATE'
    )
  THEN
    RAISE EXCEPTION
      'A public-architecture relation is directly reachable.';
  END IF;
  IF NOT has_function_privilege(
      'authenticated',
      'public.submit_build_request_public_v1(integer,text,uuid,jsonb,jsonb)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.submit_build_request_v1(integer,text,jsonb)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.set_build_request_controls_v1(integer,integer,text,boolean,boolean,integer)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'anon',
      'public.submit_build_request_public_v1(integer,text,uuid,jsonb,jsonb)',
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'service_role',
      'public.issue_build_request_intake_risk_grant_v1(integer,uuid,text,text,text)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.issue_build_request_intake_risk_grant_v1(integer,uuid,text,text,text)',
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'service_role',
      'public.resolve_build_request_notification_send_v1(integer,uuid,uuid)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.resolve_build_request_notification_send_v1(integer,uuid,uuid)',
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'authenticated',
      'public.get_build_request_publication_withdrawal_receipt_v1(integer,uuid,uuid)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'anon',
      'public.get_build_request_publication_withdrawal_receipt_v1(integer,uuid,uuid)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'service_role',
      'public.get_build_request_publication_withdrawal_receipt_v1(integer,uuid,uuid)',
      'EXECUTE'
    )
  THEN
    RAISE EXCEPTION
      'Public-architecture RPC least privilege drifted.';
  END IF;
  SELECT count(*) INTO v_count
  FROM pg_catalog.pg_class AS relation
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'build_request_operator_memberships',
      'build_request_operator_membership_receipts',
      'build_request_intake_risk_grants',
      'build_request_intake_attestations',
      'build_request_readiness_evidence',
      'build_request_readiness_receipts',
      'build_request_public_control_receipts',
      'build_request_reports',
      'build_request_report_receipts',
      'build_request_notification_preferences',
      'build_request_notification_preference_receipts',
      'build_request_notification_deliveries',
      'build_request_publication_proposals',
      'build_request_publication_consent_receipts',
      'build_request_publication_reviews',
      'build_request_publication_bridge_receipts',
      'build_request_public_outcomes'
    )
    AND relation.relrowsecurity;
  IF v_count <> 17 THEN
    RAISE EXCEPTION
      'Expected RLS on all 17 public-architecture relations; found %.',
      v_count;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );

  v_controls := jsonb_build_object(
    'accepting_requests', TRUE,
    'assigning_requests', TRUE,
    'intake_audience', 'authenticated',
    'active_case_capacity', 1,
    'fulfillment_case_capacity', 1,
    'operator_roster_required', TRUE,
    'public_intake_risk_screening', TRUE,
    'transactional_notifications_enabled', FALSE,
    'publication_consent_enabled', FALSE,
    'publication_airlock_enabled', FALSE,
    'public_outcomes_enabled', FALSE,
    'actor_hourly_intake_limit', 2,
    'network_hourly_intake_limit', 3,
    'global_daily_intake_limit', 10,
    'terms_version', 'request-terms-v1',
    'privacy_version', 'request-privacy-v1',
    'acceptable_use_version', 'request-aup-v1',
    'requester_rights_version', 'request-rights-v1',
    'publication_terms_version', 'request-publication-v1'
  );

  v_blocked := FALSE;
  BEGIN
    PERFORM public.set_build_request_public_controls_v1(
      1,
      1,
      'pilot-controls-before-readiness',
      jsonb_set(
        jsonb_set(
          v_controls,
          '{intake_audience}',
          '"invited"'::JSONB
        ),
        '{assigning_requests}',
        'false'::JSONB
      )
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:readiness_incomplete' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'Invited intake opened without roster/legal/incident/responsive proof.';
  END IF;

  v_blocked := FALSE;
  BEGIN
    PERFORM public.set_build_request_public_controls_v1(
      1,
      1,
      'public-controls-before-readiness',
      v_controls
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:readiness_incomplete' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'Authenticated intake opened without roster/readiness proof.';
  END IF;

  PERFORM public.set_build_request_operator_membership_v1(
    1, v_admin, 'triager', 0, 'active', 4,
    NULL, NULL, 'Primary accountable triager.',
    'operator-triager-create'
  );
  PERFORM public.set_build_request_operator_membership_v1(
    1, v_builder, 'builder', 0, 'active', 2,
    NULL, NULL, 'Primary available builder.',
    'operator-builder-create'
  );
  PERFORM public.set_build_request_operator_membership_v1(
    1, v_reviewer, 'reviewer', 0, 'active', 2,
    NULL, NULL, 'Independent available reviewer.',
    'operator-reviewer-create'
  );

  PERFORM public.record_build_request_readiness_v1(
    1, 'legal', 0, 'confirmed', 'fixture://legal-v1',
    clock_timestamp() + INTERVAL '30 days',
    'Counsel-reviewed Request terms and rights language.',
    'readiness-legal-v1'
  );
  -- Reconstruct the exact legal receipt as historical evidence whose validity
  -- elapsed while the active policy rotated. Receipt replay must be resolved
  -- against its immutable policy snapshot before fresh-operation clock/policy
  -- validation. The subtransaction leaves the active fixture unchanged.
  v_expired_at := clock_timestamp() - INTERVAL '1 day';
  BEGIN
    SELECT jsonb_build_object(
      'acceptableUse', control.acceptable_use_version,
      'privacy', control.privacy_version,
      'publicationTerms', control.publication_terms_version,
      'requesterRights', control.requester_rights_version,
      'terms', control.terms_version
    )
    INTO STRICT v_result
    FROM public.build_request_controls AS control
    WHERE control.singleton;
    INSERT INTO public.build_request_readiness_receipts (
      actor_id, gate_kind, evidence_version, evidence_state, valid_until,
      policy_snapshot, idempotency_key, request_hash, occurred_at
    ) VALUES (
      v_admin,
      'legal',
      92,
      'confirmed',
      v_expired_at,
      v_result,
      'readiness-legal-expired-replay',
      private.request_pseudonym_text_v1(
        jsonb_build_object(
          'gate', 'legal',
          'expectedVersion', 91,
          'state', 'confirmed',
          'reference', 'fixture://legal-historical',
          'validUntil', v_expired_at,
          'note', 'Historical legal readiness replay fixture.',
          'policySnapshot', v_result
        )::TEXT
      ),
      v_expired_at - INTERVAL '1 day'
    );
    UPDATE public.build_request_controls
    SET terms_version = 'request-terms-v2'
    WHERE singleton;
    v_replay := public.record_build_request_readiness_v1(
      1, 'legal', 91, 'confirmed', 'fixture://legal-historical',
      v_expired_at,
      'Historical legal readiness replay fixture.',
      'readiness-legal-expired-replay'
    );
    IF NOT (v_replay->>'replayed')::BOOLEAN
      OR v_replay->>'evidenceVersion' <> '92'
      OR (v_replay->>'validUntil')::TIMESTAMPTZ
        IS DISTINCT FROM v_expired_at
    THEN
      RAISE EXCEPTION
        'Expired, policy-rotated readiness receipt did not replay: %',
        v_replay;
    END IF;
    RAISE EXCEPTION 'rollback-readiness-replay-fixture';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'rollback-readiness-replay-fixture' THEN
      RAISE;
    END IF;
  END;
  PERFORM public.record_build_request_readiness_v1(
    1, 'incident_owner', 0, 'confirmed',
    'fixture://incident-owner-v1',
    clock_timestamp() + INTERVAL '30 days',
    'Named operator owns incident response during intake.',
    'readiness-incident-v1'
  );
  PERFORM public.record_build_request_readiness_v1(
    1, 'waf', 0, 'confirmed', 'fixture://waf-v1',
    clock_timestamp() + INTERVAL '30 days',
    'Origin-trusted network controls were independently checked.',
    'readiness-waf-v1'
  );
  PERFORM public.record_build_request_readiness_v1(
    1, 'responsive_qa', 0, 'confirmed',
    'fixture://responsive-qa-v1',
    clock_timestamp() + INTERVAL '30 days',
    'Desktop and exact 390 pixel operating flows passed.',
    'readiness-responsive-v1'
  );
  PERFORM public.record_build_request_readiness_v1(
    1, 'attended_lifecycle', 0, 'confirmed',
    'fixture://attended-lifecycle-v1',
    clock_timestamp() + INTERVAL '30 days',
    'The complete lifecycle was exercised with distinct actors.',
    'readiness-lifecycle-v1'
  );
  PERFORM public.record_build_request_readiness_v1(
    1, 'responsive_qa', 1, 'revoked',
    'fixture://responsive-qa-v1-revoked',
    NULL,
    'Responsive proof was deliberately revoked for rotation.',
    'readiness-responsive-revoke-v2'
  );
  PERFORM public.record_build_request_readiness_v1(
    1, 'responsive_qa', 2, 'confirmed',
    'fixture://responsive-qa-v3',
    clock_timestamp() + INTERVAL '30 days',
    'Responsive proof was independently renewed after revocation.',
    'readiness-responsive-renew-v3'
  );

  v_result := public.set_build_request_public_controls_v1(
    1,
    1,
    'public-controls-authenticated-open',
    v_controls
  );
  IF v_result->>'controlsVersion' <> '2'
    OR NOT (v_result->>'acceptingRequests')::BOOLEAN
    OR NOT (v_result->>'assigningRequests')::BOOLEAN
    OR v_result->>'intakeAudience' <> 'authenticated'
    OR NOT (v_result->>'operatorRosterReady')::BOOLEAN
    OR (v_result->>'replayed')::BOOLEAN
  THEN
    RAISE EXCEPTION
      'Authenticated intake controls did not activate safely: %',
      v_result;
  END IF;
  v_replay := public.set_build_request_public_controls_v1(
    1,
    1,
    'public-controls-authenticated-open',
    v_controls
  );
  IF NOT (v_replay->>'replayed')::BOOLEAN
    OR v_replay->>'controlsVersion' <> '2'
  THEN
    RAISE EXCEPTION
      'Public controls did not replay their original receipt: %',
      v_replay;
  END IF;
  BEGIN
    PERFORM public.set_build_request_public_controls_v1(
      1,
      2,
      'public-controls-string-boolean',
      jsonb_set(
        v_controls,
        '{accepting_requests}',
        '"true"'::JSONB
      )
    );
    RAISE EXCEPTION 'String-valued Request control was accepted.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM public.set_build_request_public_controls_v1(
      1,
      2,
      'public-controls-null-boolean',
      jsonb_set(
        v_controls,
        '{publication_consent_enabled}',
        'null'::JSONB
      )
    );
    RAISE EXCEPTION 'JSON-null Request control was accepted.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  IF (
      SELECT controls_version
      FROM public.build_request_controls
      WHERE singleton
    ) <> 2
    OR EXISTS (
      SELECT 1
      FROM public.build_request_public_control_receipts AS receipt
      WHERE receipt.idempotency_key IN (
        'public-controls-string-boolean',
        'public-controls-null-boolean'
      )
    )
  THEN
    RAISE EXCEPTION
      'Hostile Request controls mutated version or durable receipts.';
  END IF;
  v_blocked := FALSE;
  BEGIN
    UPDATE public.build_request_controls
    SET terms_version = 'request-terms-v2'
    WHERE singleton;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:readiness_incomplete' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'An active public gate allowed policy text to rotate under old legal proof.';
  END IF;
  v_blocked := FALSE;
  BEGIN
    PERFORM public.set_build_request_public_controls_v1(
      1,
      2,
      'public-controls-policy-tamper',
      jsonb_set(
        v_controls,
        '{terms_version}',
        '"request-terms-v2"'::JSONB
      )
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:stale_version' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'The generic control RPC changed a versioned policy without a release.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.issue_build_request_intake_risk_grant_v1(
    1,
    v_requester,
    'public-intake-requester-0001',
    repeat('1', 64),
    'fixture-risk-v1'
  );
  IF v_result->>'status' <> 'clear'
    OR (v_result->>'replayed')::BOOLEAN
    OR v_result->>'grantId' IS NULL
  THEN
    RAISE EXCEPTION 'Initial risk grant failed: %', v_result;
  END IF;
  v_grant_id := (v_result->>'grantId')::UUID;
  v_public_brief := jsonb_build_object(
    'title', 'Public architecture operating fixture',
    'outcome',
      'Deliver a reviewed result that resolves the bounded fixture need.',
    'intended_user', 'A confirmed PathForge requester',
    'must_work_scenario',
      'The requester can open and use the independently reviewed result.',
    'acceptance_checks', jsonb_build_array(
      'The exact approved result opens without an integrity error.',
      'The independent reviewer records a passing verdict.'
    ),
    'constraints',
      'Private case data must never become a public board entry.',
    'pathforge_reference', jsonb_build_object(
      'kind', 'project',
      'project_id', v_project
    )
  );
  v_public_attestation := jsonb_build_object(
    'terms_accepted', TRUE,
    'terms_version', 'request-terms-v1',
    'privacy_acknowledged', TRUE,
    'privacy_version', 'request-privacy-v1',
    'acceptable_use_accepted', TRUE,
    'acceptable_use_version', 'request-aup-v1',
    'requester_rights_accepted', TRUE,
    'requester_rights_version', 'request-rights-v1'
  );
  v_replay := public.issue_build_request_intake_risk_grant_v1(
    1,
    v_requester,
    'public-intake-requester-0001',
    repeat('1', 64),
    'fixture-risk-v1'
  );
  IF NOT (v_replay->>'replayed')::BOOLEAN
    OR (v_replay->>'grantId')::UUID <> v_grant_id
  THEN
    RAISE EXCEPTION 'Risk grant replay drifted: %', v_replay;
  END IF;
  -- Expire the stored grant and turn off both control/readiness authority in a
  -- rollback-only historical reconstruction. The same screened operation must
  -- still replay its original decision before mutable launch gates are read.
  BEGIN
    v_expired_at := clock_timestamp() - INTERVAL '1 day';
    INSERT INTO public.build_request_intake_risk_grants (
      id, actor_id, intake_idempotency_key, network_digest,
      risk_engine_version, decision, issued_at, expires_at
    ) VALUES (
      v_expired_grant_id,
      v_requester,
      'public-intake-expired-replay',
      repeat('9', 64),
      'fixture-risk-v1',
      'clear',
      v_expired_at - INTERVAL '10 minutes',
      v_expired_at
    );
    UPDATE public.build_request_controls
    SET accepting_requests = FALSE,
        assigning_requests = FALSE,
        intake_audience = 'invited',
        public_intake_risk_screening = FALSE
    WHERE singleton;
    UPDATE public.build_request_readiness_evidence
    SET evidence_state = 'revoked'
    WHERE gate_kind IN ('waf', 'attended_lifecycle')
      AND evidence_state = 'confirmed';
    v_replay := public.issue_build_request_intake_risk_grant_v1(
      1,
      v_requester,
      'public-intake-expired-replay',
      repeat('9', 64),
      'fixture-risk-v1'
    );
    IF NOT (v_replay->>'replayed')::BOOLEAN
      OR (v_replay->>'grantId')::UUID <> v_expired_grant_id
      OR (v_replay->>'expiresAt')::TIMESTAMPTZ >= clock_timestamp()
    THEN
      RAISE EXCEPTION
        'Expired risk grant did not replay through closed gates: %',
        v_replay;
    END IF;
    RAISE EXCEPTION 'rollback-risk-replay-fixture';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'rollback-risk-replay-fixture' THEN
      RAISE;
    END IF;
  END;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  -- The authenticated RPC is a public security boundary. JSON null, strings,
  -- false values, non-string policy versions, and stale policy versions must
  -- all fail before a case is created or the one-time risk grant is consumed.
  FOR v_result IN
    SELECT hostile.value
    FROM jsonb_array_elements(jsonb_build_array(
      jsonb_build_object(
        'expectedState', '22023',
        'attestation', jsonb_set(
          v_public_attestation, '{terms_accepted}', 'null'::JSONB
        )
      ),
      jsonb_build_object(
        'expectedState', '22023',
        'attestation', jsonb_set(
          v_public_attestation, '{terms_accepted}', '"true"'::JSONB
        )
      ),
      jsonb_build_object(
        'expectedState', '22023',
        'attestation', jsonb_set(
          v_public_attestation, '{terms_accepted}', 'false'::JSONB
        )
      ),
      jsonb_build_object(
        'expectedState', '22023',
        'attestation', jsonb_set(
          v_public_attestation, '{privacy_version}', 'null'::JSONB
        )
      ),
      jsonb_build_object(
        'expectedState', '22023',
        'attestation', jsonb_set(
          v_public_attestation, '{privacy_version}', '7'::JSONB
        )
      ),
      jsonb_build_object(
        'expectedState', '40001',
        'attestation', jsonb_set(
          v_public_attestation,
          '{privacy_version}',
          '"request-privacy-stale"'::JSONB
        )
      )
    )) AS hostile(value)
  LOOP
    v_blocked := FALSE;
    BEGIN
      PERFORM *
      FROM public.submit_build_request_public_v1(
        1,
        'public-intake-requester-0001',
        v_grant_id,
        v_public_brief,
        v_result->'attestation'
      );
    EXCEPTION WHEN OTHERS THEN
      IF SQLSTATE <> v_result->>'expectedState' THEN
        RAISE;
      END IF;
      v_blocked := TRUE;
    END;
    IF NOT v_blocked
      OR EXISTS (
        SELECT 1
        FROM public.build_requests AS request_case
        WHERE request_case.requester_id = v_requester
      )
      OR EXISTS (
        SELECT 1
        FROM public.build_request_intake_risk_grants AS grant_row
        WHERE grant_row.id = v_grant_id
          AND grant_row.consumed_at IS NOT NULL
      )
    THEN
      RAISE EXCEPTION
        'Hostile policy attestation created a request or consumed its risk grant: %',
        v_result;
    END IF;
  END LOOP;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  SELECT receipt.request_id, receipt.replayed
  INTO v_request_id, v_blocked
  FROM public.submit_build_request_public_v1(
    1,
    'public-intake-requester-0001',
    v_grant_id,
    v_public_brief,
    v_public_attestation
  ) AS receipt;
  IF v_request_id IS NULL OR v_blocked THEN
    RAISE EXCEPTION 'Attested public-ready intake did not create a case.';
  END IF;
  SELECT receipt.replayed INTO v_blocked
  FROM public.submit_build_request_public_v1(
    1,
    'public-intake-requester-0001',
    v_grant_id,
    v_public_brief,
    v_public_attestation
  ) AS receipt;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'Attested intake did not replay durably.';
  END IF;
  -- Catalog publication state is mutable. Once the original submission has a
  -- durable receipt, withdrawing its referenced project cannot make an exact
  -- retry fail before that receipt is returned.
  BEGIN
    UPDATE public.prompts
    SET status = 'pending'
    WHERE id = v_project;
    SELECT receipt.replayed, receipt.request_id
    INTO v_blocked, v_replayed_request_id
    FROM public.submit_build_request_public_v1(
      1,
      'public-intake-requester-0001',
      v_grant_id,
      v_public_brief,
      v_public_attestation
    ) AS receipt;
    IF NOT v_blocked OR v_replayed_request_id <> v_request_id THEN
      RAISE EXCEPTION
        'Public intake replay was invalidated by catalog withdrawal.';
    END IF;
    RAISE EXCEPTION 'rollback-public-intake-replay-fixture';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'rollback-public-intake-replay-fixture' THEN
      RAISE;
    END IF;
  END;
  IF NOT EXISTS (
      SELECT 1
      FROM public.build_request_intake_attestations AS attestation
      WHERE attestation.request_id = v_request_id
        AND attestation.risk_grant_id = v_grant_id
        AND attestation.intake_audience = 'authenticated'
        AND attestation.risk_screening_verified_at IS NOT NULL
        AND attestation.risk_engine_version = 'fixture-risk-v1'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_intake_risk_grants AS grant_row
      WHERE grant_row.id = v_grant_id
        AND grant_row.consumed_request_id = v_request_id
        AND grant_row.consumed_at IS NOT NULL
    )
  THEN
    RAISE EXCEPTION
      'Risk grant and policy attestation were not atomically bound.';
  END IF;

  SELECT public.get_build_request_public_availability_v1(1)
  INTO v_result;
  IF v_result->>'intakeEligibility' <> 'already_active'
    OR (v_result->>'remainingQueueCapacity')::INTEGER <> 0
  THEN
    RAISE EXCEPTION
      'Self availability did not expose active-case/capacity truth: %',
      v_result;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.issue_build_request_intake_risk_grant_v1(
    1,
    v_builder,
    'public-intake-capacity-0001',
    repeat('2', 64),
    'fixture-risk-v1'
  );
  v_capacity_grant_id := (v_result->>'grantId')::UUID;
  IF v_result->>'status' <> 'clear' OR v_capacity_grant_id IS NULL THEN
    RAISE EXCEPTION 'Capacity fixture grant failed: %', v_result;
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_builder,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_blocked := FALSE;
  BEGIN
    PERFORM *
    FROM public.submit_build_request_public_v1(
      1,
      'public-intake-capacity-0001',
      v_capacity_grant_id,
      jsonb_build_object(
        'title', 'Capacity rejection fixture',
        'outcome',
          'Prove a second private demand case cannot exceed queue capacity.',
        'intended_user', 'A second confirmed requester',
        'must_work_scenario',
          'The full queue rejects a new request without consuming its grant.',
        'acceptance_checks', jsonb_build_array(
          'The operation returns the bounded capacity state.'
        ),
        'constraints', '',
        'pathforge_reference', NULL
      ),
      jsonb_build_object(
        'terms_accepted', TRUE,
        'terms_version', 'request-terms-v1',
        'privacy_acknowledged', TRUE,
        'privacy_version', 'request-privacy-v1',
        'acceptable_use_accepted', TRUE,
        'acceptable_use_version', 'request-aup-v1',
        'requester_rights_accepted', TRUE,
        'requester_rights_version', 'request-rights-v1'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:capacity_full' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked
    OR EXISTS (
      SELECT 1
      FROM public.build_request_intake_risk_grants AS grant_row
      WHERE grant_row.id = v_capacity_grant_id
        AND grant_row.consumed_at IS NOT NULL
    )
  THEN
    RAISE EXCEPTION
      'Queue capacity did not fail closed before consuming intake authority.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.set_build_request_notification_preference_v1(
    1, 0, TRUE, 'notification-preference-admin'
  );
  IF v_result->>'preferenceVersion' <> '1'
    OR NOT (v_result->>'transactionalEmailEnabled')::BOOLEAN
  THEN
    RAISE EXCEPTION 'Admin notification preference failed: %', v_result;
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_builder,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.set_build_request_notification_preference_v1(
    1, 0, TRUE, 'notification-preference-builder'
  );
  IF v_result->>'preferenceVersion' <> '1'
    OR NOT (v_result->>'transactionalEmailEnabled')::BOOLEAN
  THEN
    RAISE EXCEPTION 'Builder notification preference failed: %', v_result;
  END IF;

  SELECT request_case.version INTO STRICT v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM *
  FROM public.build_request_command_v1(
    1,
    v_request_id,
    v_request_version,
    'notification-timing-begin-triage',
    'begin_triage',
    '{}'::JSONB
  );

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.report_build_request_v1(
    1,
    v_request_id,
    'privacy',
    'The runtime fixture exercises the private report escalation contract.',
    'request-report-create-0001'
  );
  v_report_id := (v_result->>'reportId')::UUID;
  IF v_report_id IS NULL
    OR v_result->>'status' <> 'open'
    OR (v_result->>'replayed')::BOOLEAN
  THEN
    RAISE EXCEPTION 'Private report intake failed: %', v_result;
  END IF;
  v_replay := public.report_build_request_v1(
    1,
    v_request_id,
    'privacy',
    'The runtime fixture exercises the private report escalation contract.',
    'request-report-create-0001'
  );
  IF NOT (v_replay->>'replayed')::BOOLEAN
    OR (v_replay->>'reportId')::UUID <> v_report_id
  THEN
    RAISE EXCEPTION 'Private report receipt replay drifted: %', v_replay;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_queue := public.list_build_request_reports_v1(
    1, 'admin', NULL, NULL, NULL, 25, NULL
  );
  IF jsonb_array_length(v_queue->'items') <> 1
    OR v_queue->'items'->0->>'reportId' <> v_report_id::TEXT
    OR v_queue->'items'->0->>'priority' <> '1'
  THEN
    RAISE EXCEPTION 'Private report operator queue drifted: %', v_queue;
  END IF;
  PERFORM public.record_build_request_readiness_v1(
    1, 'notification_transport', 0, 'confirmed',
    'fixture://notification-transport-v1',
    clock_timestamp() + INTERVAL '30 days',
    'Transactional transport and alert delivery were verified.',
    'readiness-notification-v1'
  );

  UPDATE public.community_project_pilot_controls
  SET allow_publication = TRUE
  WHERE singleton;
  INSERT INTO public.community_project_operations (
    operation, last_status, last_success_at, last_metrics
  ) VALUES
    (
      'reconciliation', 'succeeded', clock_timestamp(),
      '{}'::JSONB
    ),
    (
      'report_intake', 'succeeded', clock_timestamp(),
      '{"operator_alert_delivery":"verified"}'::JSONB
    ),
    (
      'report_alerts', 'succeeded', clock_timestamp(),
      '{"independentAlertChannels":"2"}'::JSONB
    );

  v_controls := jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          v_controls,
          '{transactional_notifications_enabled}',
          'true'::JSONB
        ),
        '{publication_consent_enabled}',
        'true'::JSONB
      ),
      '{publication_airlock_enabled}',
      'true'::JSONB
    ),
    '{public_outcomes_enabled}',
    'true'::JSONB
  );
  v_result := public.set_build_request_public_controls_v1(
    1,
    2,
    'public-controls-all-gates',
    v_controls
  );
  IF v_result->>'controlsVersion' <> '3'
    OR NOT (v_result->>'transactionalNotificationsEnabled')::BOOLEAN
    OR NOT (v_result->>'publicationConsentEnabled')::BOOLEAN
    OR NOT (v_result->>'publicationAirlockEnabled')::BOOLEAN
    OR NOT (v_result->>'publicOutcomesEnabled')::BOOLEAN
    OR NOT (v_result->'readiness'->>'communityAirlock')::BOOLEAN
  THEN
    RAISE EXCEPTION 'Full gated controls did not activate: %', v_result;
  END IF;

  INSERT INTO public.build_request_assignments (
    id, request_id, assignment_role, account_id, display_name,
    active, assigned_by, assigned_at, ended_at
  ) VALUES
    (
      v_builder_assignment_id, v_request_id, 'builder', v_builder,
      'Public Architecture Builder', TRUE, v_admin, clock_timestamp(), NULL
    ),
    (
      v_reviewer_assignment_id, v_request_id, 'reviewer', v_reviewer,
      'Public Architecture Reviewer', TRUE, v_admin, clock_timestamp(), NULL
    ),
    (
      v_prior_builder_assignment_id, v_request_id, 'builder', v_extra,
      'Public Architecture Prior Builder', FALSE, v_admin,
      clock_timestamp() - INTERVAL '2 days',
      clock_timestamp() - INTERVAL '1 day'
    );
  INSERT INTO public.build_request_participants (
    request_id, actor_role, account_id, display_name
  ) VALUES
    (
      v_request_id, 'builder', v_builder,
      'Public Architecture Builder'
    ),
    (
      v_request_id, 'reviewer', v_reviewer,
      'Public Architecture Reviewer'
    );

  PERFORM public.set_build_request_operator_membership_v1(
    1, v_builder, 'builder', 1, 'active', 1,
    NULL, NULL,
    'The exact builder slot is full while demand-queue staffing remains valid.',
    'operator-builder-full-workload'
  );
  PERFORM public.set_build_request_operator_membership_v1(
    1, v_reviewer, 'reviewer', 1, 'active', 1,
    NULL, NULL,
    'The exact reviewer slot is full while demand-queue staffing remains valid.',
    'operator-reviewer-full-workload'
  );
  SELECT private.request_public_controls_json_v1() INTO v_result;
  IF NOT (v_result->>'operatorRosterReady')::BOOLEAN
    OR private.request_public_operator_is_available_v1(
      v_builder, 'builder', NULL
    )
    OR private.request_public_operator_is_available_v1(
      v_reviewer, 'reviewer', NULL
    )
  THEN
    RAISE EXCEPTION
      'Staffed roster readiness was incorrectly coupled to free assignment slots: %',
      v_result;
  END IF;

  SELECT request_case.version INTO STRICT v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM *
  FROM public.build_request_command_v1(
    1,
    v_request_id,
    v_request_version,
    'notification-current-scope-event',
    'request_clarification',
    jsonb_build_object(
      'question',
      'Confirm the bounded notification reauthorization behavior.'
    )
  );

  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.project_build_request_notifications_v1(1, 1);
  IF (v_result->>'controlEnabled')::BOOLEAN IS NOT TRUE
    OR (v_result->>'eventsProjected')::INTEGER <> 1
    OR (v_result->>'reportsProjected')::INTEGER <> 1
  THEN
    RAISE EXCEPTION 'Notification projection failed: %', v_result;
  END IF;
  SELECT request_case.version INTO STRICT v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM *
  FROM public.build_request_command_v1(
    1,
    v_request_id,
    v_request_version,
    'notification-pagination-hold',
    'place_moderation_hold',
    jsonb_build_object(
      'reason',
      'Exercise bounded notification projection without queue starvation.'
    )
  );
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.project_build_request_notifications_v1(1, 1);
  IF (v_result->>'eventsProjected')::INTEGER <> 1
    OR (v_result->>'reportsProjected')::INTEGER <> 0
  THEN
    RAISE EXCEPTION
      'A previously projected event starved the next notification page: %',
      v_result;
  END IF;
  SELECT request_case.version INTO STRICT v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM *
  FROM public.build_request_command_v1(
    1,
    v_request_id,
    v_request_version,
    'notification-pagination-release',
    'release_moderation_hold',
    jsonb_build_object(
      'resolution',
      'The bounded notification projection fixture is complete.'
    )
  );
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  UPDATE public.build_request_assignments
  SET active = FALSE, ended_at = clock_timestamp()
  WHERE id = v_builder_assignment_id;
  UPDATE public.build_request_participants
  SET active = FALSE
  WHERE request_id = v_request_id
    AND actor_role = 'builder'
    AND account_id = v_builder;
  v_claim := public.claim_build_request_notifications_v1(1, 25);
  IF jsonb_array_length(v_claim->'items') <> 1 THEN
    RAISE EXCEPTION 'Notification claim did not return one report alert: %',
      v_claim;
  END IF;
  v_claim_item := v_claim->'items'->0;
  IF v_claim_item ? 'recipient'
    OR v_claim_item->>'templateKey' <> 'request_report_received'
    OR v_claim_item->>'requestPath'
      <> '/requests/' || v_request_id::TEXT
    OR v_claim_item ? 'details'
    OR v_claim_item ? 'brief'
    OR v_claim_item ? 'manifestDigest'
  THEN
    RAISE EXCEPTION
      'Notification claim exposed private content or wrong routing: %',
      v_claim_item;
  END IF;
  -- Every mutable authority is rechecked after claim and immediately before
  -- transport. Each hostile interleaving suppresses without returning an
  -- address; the subtransaction rollback then restores the original claim for
  -- the positive send-binding proof.
  BEGIN
    UPDATE public.build_request_controls
    SET transactional_notifications_enabled = FALSE
    WHERE singleton;
    v_result := public.resolve_build_request_notification_send_v1(
      1,
      (v_claim_item->>'deliveryId')::UUID,
      (v_claim_item->>'claimToken')::UUID
    );
    IF v_result <> jsonb_build_object(
      'status', 'suppressed', 'reason', 'control_off'
    ) THEN
      RAISE EXCEPTION 'Control shutdown did not suppress a claimed send: %',
        v_result;
    END IF;
    RAISE EXCEPTION 'rollback-notification-control-fixture';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'rollback-notification-control-fixture' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    UPDATE public.build_request_notification_preferences
    SET transactional_email_enabled = FALSE
    WHERE account_id = v_admin;
    v_result := public.resolve_build_request_notification_send_v1(
      1,
      (v_claim_item->>'deliveryId')::UUID,
      (v_claim_item->>'claimToken')::UUID
    );
    IF v_result <> jsonb_build_object(
      'status', 'suppressed', 'reason', 'preference_off'
    ) THEN
      RAISE EXCEPTION 'Opt-out did not suppress a claimed send: %', v_result;
    END IF;
    RAISE EXCEPTION 'rollback-notification-preference-fixture';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'rollback-notification-preference-fixture' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    UPDATE public.build_request_notification_deliveries
    SET recipient_id = NULL, recipient_deidentified = TRUE
    WHERE id = (v_claim_item->>'deliveryId')::UUID;
    v_result := public.resolve_build_request_notification_send_v1(
      1,
      (v_claim_item->>'deliveryId')::UUID,
      (v_claim_item->>'claimToken')::UUID
    );
    IF v_result <> jsonb_build_object(
      'status', 'suppressed', 'reason', 'identity_unavailable'
    ) THEN
      RAISE EXCEPTION
        'Deidentification did not suppress a claimed send: %', v_result;
    END IF;
    RAISE EXCEPTION 'rollback-notification-identity-fixture';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'rollback-notification-identity-fixture' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    UPDATE public.build_request_reports
    SET status = 'resolved',
        resolution_note =
          'The claimed-send authorization fixture resolved this report.',
        resolution_note_digest = repeat('e', 64),
        resolved_at = clock_timestamp()
    WHERE id = v_report_id;
    v_result := public.resolve_build_request_notification_send_v1(
      1,
      (v_claim_item->>'deliveryId')::UUID,
      (v_claim_item->>'claimToken')::UUID
    );
    IF v_result <> jsonb_build_object(
      'status', 'suppressed', 'reason', 'authorization_ended'
    ) THEN
      RAISE EXCEPTION
        'Resolved report authority did not suppress a claimed send: %',
        v_result;
    END IF;
    RAISE EXCEPTION 'rollback-notification-authorization-fixture';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'rollback-notification-authorization-fixture' THEN
      RAISE;
    END IF;
  END;
  v_result := public.resolve_build_request_notification_send_v1(
    1,
    (v_claim_item->>'deliveryId')::UUID,
    (v_claim_item->>'claimToken')::UUID
  );
  IF v_result->>'status' <> 'authorized'
    OR v_result->>'recipient' <> 'admin@example.test'
    OR v_result->>'deliveryId' <> v_claim_item->>'deliveryId'
    OR v_result->>'claimToken' <> v_claim_item->>'claimToken'
    OR v_result->>'templateKey' <> 'request_report_received'
    OR v_result->>'requestPath'
      <> '/requests/' || v_request_id::TEXT
  THEN
    RAISE EXCEPTION
      'Immediate notification send authorization drifted: %', v_result;
  END IF;
  v_result := public.finish_build_request_notification_v1(
    1,
    (v_claim_item->>'deliveryId')::UUID,
    (v_claim_item->>'claimToken')::UUID,
    TRUE,
    NULL
  );
  IF v_result->>'deliveryState' <> 'delivered' THEN
    RAISE EXCEPTION 'Notification completion failed: %', v_result;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_reports AS report
    WHERE report.id = v_report_id
      AND report.alert_status = 'delivered'
  ) THEN
    RAISE EXCEPTION
      'Successful alert delivery did not reconcile the report.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_notification_deliveries AS delivery
    WHERE delivery.request_id = v_request_id
      AND delivery.recipient_id = v_builder
      AND delivery.event_id IS NOT NULL
      AND delivery.delivery_state = 'suppressed'
      AND delivery.suppression_reason = 'authorization_ended'
  ) THEN
    RAISE EXCEPTION
      'Notification claim did not reauthorize a former assignment.';
  END IF;
  UPDATE public.build_request_assignments
  SET active = TRUE, ended_at = NULL
  WHERE id = v_builder_assignment_id;
  UPDATE public.build_request_participants
  SET active = TRUE
  WHERE request_id = v_request_id
    AND actor_role = 'builder'
    AND account_id = v_builder;

  UPDATE public.build_request_readiness_evidence
  SET confirmed_at = clock_timestamp() - INTERVAL '2 days',
      valid_until = clock_timestamp() - INTERVAL '1 day'
  WHERE gate_kind = 'notification_transport'
    AND evidence_state = 'confirmed';
  UPDATE public.build_request_notification_deliveries
  SET delivery_state = 'retry',
      delivered_at = NULL,
      next_attempt_at = clock_timestamp(),
      updated_at = clock_timestamp()
  WHERE report_id = v_report_id
    AND recipient_id = v_admin
    AND delivery_state = 'delivered';
  v_result := public.project_build_request_notifications_v1(1, 100);
  IF (v_result->>'controlEnabled')::BOOLEAN
    OR (v_result->>'eventsProjected')::INTEGER <> 0
    OR (v_result->>'reportsProjected')::INTEGER <> 0
  THEN
    RAISE EXCEPTION
      'Expired notification readiness did not close runtime projection: %',
      v_result;
  END IF;
  v_claim := public.claim_build_request_notifications_v1(1, 25);
  IF jsonb_array_length(v_claim->'items') <> 0
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_notification_deliveries AS delivery
      WHERE delivery.report_id = v_report_id
        AND delivery.recipient_id = v_admin
        AND delivery.delivery_state = 'suppressed'
        AND delivery.suppression_reason = 'control_off'
    )
  THEN
    RAISE EXCEPTION
      'Notification shutdown retained replayable pending work: %',
      v_claim;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM public.record_build_request_readiness_v1(
    1, 'notification_transport', 1, 'confirmed',
    'fixture://notification-transport-v2',
    clock_timestamp() + INTERVAL '30 days',
    'Transactional transport readiness was renewed after expiry.',
    'readiness-notification-v2'
  );
  PERFORM public.set_build_request_report_status_v1(
    1,
    v_report_id,
    'open',
    'reviewing',
    NULL,
    'request-report-review-0001'
  );
  PERFORM public.set_build_request_report_status_v1(
    1,
    v_report_id,
    'reviewing',
    'resolved',
    'The reported privacy concern was reviewed and the fixture data path was verified.',
    'request-report-resolve-0001'
  );
  v_queue := public.list_build_request_reports_v1(
    1, 'admin', NULL, NULL, NULL, 25, v_request_id
  );
  IF jsonb_array_length(v_queue->'items') <> 1
    OR v_queue->'items'->0->>'reportId' <> v_report_id::TEXT
    OR v_queue->'items'->0->>'status' <> 'resolved'
    OR v_queue->'items'->0->>'resolutionNote'
      <> 'The reported privacy concern was reviewed and the fixture data path was verified.'
  THEN
    RAISE EXCEPTION
      'Case-scoped admin report history lost its disposition: %',
      v_queue;
  END IF;
  INSERT INTO public.build_requests (
    id, requester_id, requester_display_name, lifecycle_state,
    close_reason, terminal_at
  ) VALUES (
    v_decoy_request, v_requester, 'Public Architecture Requester',
    'closed', 'declined', clock_timestamp()
  );
  INSERT INTO public.build_request_reports (
    id, request_id, reporter_id, category, details, details_digest
  ) VALUES (
    v_decoy_report, v_decoy_request, v_requester, 'service',
    'This decoy report proves participant case reads stay request scoped.',
    repeat('d', 64)
  );
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_queue := public.list_build_request_reports_v1(
    1, 'mine', NULL, NULL, NULL, 25, v_request_id
  );
  IF jsonb_array_length(v_queue->'items') <> 1
    OR v_queue->'items'->0->>'reportId' <> v_report_id::TEXT
    OR v_queue->'items'->0->>'resolutionNote'
      <> 'The reported privacy concern was reviewed and the fixture data path was verified.'
  THEN
    RAISE EXCEPTION
      'Participant report detail leaked or omitted a cross-case row: %',
      v_queue;
  END IF;

  SELECT request_case.current_brief_revision_id
  INTO STRICT v_brief_id
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;

  INSERT INTO public.build_request_accepted_clarification_sets (
    request_id, brief_revision_id, accepted_clarifications,
    accepted_clarification_count, accepted_clarification_digest,
    clarification_acceptance_cutoff
  ) VALUES (
    v_request_id, v_brief_id, '[]'::JSONB, 0, repeat('c', 64),
    clock_timestamp()
  );
  INSERT INTO public.build_request_delivery_revisions (
    id, request_id, revision_number, revision_state,
    accepted_brief_revision_id, builder_assignment_id,
    artifact_manifest_digest, artifact_count, total_bytes,
    evidence_checklist_version, rights_snapshot_version,
    revision_label, summary, approved_pathforge_reference,
    authored_by, authored_by_display_name, submitted_at
  ) VALUES (
    v_delivery_id, v_request_id, 1, 'submitted',
    v_brief_id, v_builder_assignment_id,
    v_manifest, 1, 1024, 1, 1,
    'Reviewed operating fixture',
    'A bounded reviewed result for the public architecture fixture.',
    jsonb_build_object(
      'kind', 'project',
      'project_id', v_project
    ),
    v_builder, 'Public Architecture Builder', clock_timestamp()
  );
  INSERT INTO public.build_request_delivery_artifacts (
    id, request_id, delivery_revision_id, accepted_brief_revision_id,
    builder_assignment_id, client_file_id, artifact_ordinal,
    normalized_name, byte_length, sha256, detected_media_type,
    scanner_version, staging_identity, object_identity,
    integrity_status, scan_state, scan_verdict, finalized_at
  ) VALUES (
    v_artifact_id, v_request_id, v_delivery_id, v_brief_id,
    v_builder_assignment_id, 'public-architecture-fixture', 1,
    'reviewed-outcome.txt', 1024, repeat('a', 64), 'text/plain',
    'fixture-scanner-v1',
    'requests/' || v_request_id::TEXT || '/deliveries/' ||
      v_delivery_id::TEXT || '/artifacts/' || v_artifact_id::TEXT ||
      '/9a200000-0000-4000-8000-000000000003',
    'requests/' || v_request_id::TEXT || '/deliveries/' ||
      v_delivery_id::TEXT || '/artifacts/' || v_artifact_id::TEXT ||
      '/9a200000-0000-4000-8000-000000000003',
    'verified', 'complete', 'clean', clock_timestamp()
  );
  INSERT INTO public.build_request_delivery_reviews (
    id, request_id, delivery_revision_id, brief_revision_id,
    manifest_digest, checklist_version, safety_integrity_result,
    verdict, reviewer_id, reviewer_assignment_id,
    reviewer_display_name, reviewed_at
  ) VALUES (
    v_review_id, v_request_id, v_delivery_id, v_brief_id,
    v_manifest, 1, 'pass', 'approve',
    v_reviewer, v_reviewer_assignment_id,
    'Public Architecture Reviewer', clock_timestamp()
  );
  INSERT INTO public.build_request_requester_outcomes (
    request_id, delivery_revision_id, manifest_digest,
    brief_revision_id, requester_id, outcome, occurred_at
  ) VALUES (
    v_request_id, v_delivery_id, v_manifest,
    v_brief_id, v_requester, 'useful', clock_timestamp()
  );
  UPDATE public.build_requests
  SET lifecycle_state = 'completed',
      current_delivery_revision_id = v_delivery_id,
      target_date = current_date + 7,
      terminal_at = clock_timestamp(),
      version = version + 1,
      updated_at = clock_timestamp()
  WHERE id = v_request_id;
  UPDATE public.build_request_assignments
  SET active = FALSE, ended_at = clock_timestamp()
  WHERE request_id = v_request_id
    AND active;
  UPDATE public.build_request_participants
  SET active = FALSE
  WHERE request_id = v_request_id
    AND active;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM public.set_build_request_notification_preference_v1(
    1, 0, TRUE, 'notification-preference-requester'
  );
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_reviewer,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM public.set_build_request_notification_preference_v1(
    1, 0, TRUE, 'notification-preference-reviewer'
  );
  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_id, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, command_receipt_id, outbox_id,
    participant_visible, safe_metadata, occurred_at
  )
  SELECT
    v_terminal_event_id, request_case.id,
    COALESCE((
      SELECT max(existing_event.sequence) + 1
      FROM public.build_request_events AS existing_event
      WHERE existing_event.request_id = request_case.id
    ), 1),
    'completed', v_admin, 'operator',
    'delivered', request_case.moderation_state,
    request_case.publication_state, request_case.close_reason,
    request_case.lifecycle_state, request_case.moderation_state,
    request_case.publication_state, request_case.close_reason,
    request_case.version, 'terminal-notification-fixture',
    v_terminal_event_id, v_terminal_event_id, v_terminal_event_id,
    TRUE, '{}'::JSONB, clock_timestamp()
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  INSERT INTO public.build_request_command_receipts (
    id, actor_id, idempotency_key, request_id, command_kind,
    request_hash, request_version, lifecycle_state, moderation_state,
    publication_state, close_reason, event_id, receipt, created_at
  )
  SELECT
    v_terminal_event_id, v_admin, 'terminal-notification-fixture',
    request_case.id, 'terminal_notification_fixture', repeat('e', 64),
    request_case.version, request_case.lifecycle_state,
    request_case.moderation_state, request_case.publication_state,
    request_case.close_reason, v_terminal_event_id,
    '{"authority_result":{}}'::JSONB, clock_timestamp()
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  INSERT INTO public.build_request_outbox (
    id, request_id, event_id, topic, payload, available_at
  ) VALUES (
    v_terminal_event_id, v_request_id, v_terminal_event_id,
    'request_event_v1',
    jsonb_build_object(
      'request_id', v_request_id,
      'event_id', v_terminal_event_id,
      'kind', 'completed'
    ),
    clock_timestamp()
  );
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.project_build_request_notifications_v1(1, 100);
  IF (v_result->>'eventsProjected')::INTEGER < 3
    OR EXISTS (
      SELECT 1
      FROM public.build_request_notification_deliveries AS delivery
      WHERE delivery.event_id = v_terminal_event_id
        AND delivery.recipient_id = v_extra
    )
  THEN
    RAISE EXCEPTION
      'Terminal notification projection lost an exact contributor or included a superseded one: %',
      v_result;
  END IF;
  v_claim := public.claim_build_request_notifications_v1(1, 100);
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_claim->'items') AS claimed(item)
    WHERE claimed.item ? 'recipient'
  ) THEN
    RAISE EXCEPTION
      'A notification claim exposed a recipient before send authorization: %',
      v_claim;
  END IF;
  v_public := '[]'::JSONB;
  FOR v_claim_item IN
    SELECT claimed.item
    FROM jsonb_array_elements(v_claim->'items') AS claimed(item)
  LOOP
    v_result := public.resolve_build_request_notification_send_v1(
      1,
      (v_claim_item->>'deliveryId')::UUID,
      (v_claim_item->>'claimToken')::UUID
    );
    v_public := v_public || jsonb_build_array(v_result);
  END LOOP;
  IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_public) AS resolved(item)
      WHERE resolved.item->>'status' = 'authorized'
        AND resolved.item->>'recipient' = 'requester@example.test'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_public) AS resolved(item)
      WHERE resolved.item->>'status' = 'authorized'
        AND resolved.item->>'recipient' = 'builder@example.test'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_public) AS resolved(item)
      WHERE resolved.item->>'status' = 'authorized'
        AND resolved.item->>'recipient' = 'reviewer@example.test'
    )
  THEN
    RAISE EXCEPTION
      'Terminal notification send authorization lost an exact participant: %',
      v_public;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_builder,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_queue := public.list_build_request_queue_v1(
    1, 'builder', NULL, 20
  );
  IF jsonb_array_length(v_queue->'items') <> 1
    OR v_queue->'items'->0->>'requestId' <> v_request_id::TEXT
    OR public.get_build_request_v1(1, v_request_id)->>'visibility' <> 'full'
  THEN
    RAISE EXCEPTION
      'The exact final builder lost the durable terminal continuation: %',
      v_queue;
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_reviewer,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_queue := public.list_build_request_queue_v1(
    1, 'reviewer', NULL, 20
  );
  IF jsonb_array_length(v_queue->'items') <> 1
    OR v_queue->'items'->0->>'requestId' <> v_request_id::TEXT
    OR public.get_build_request_v1(1, v_request_id)->>'visibility' <> 'full'
  THEN
    RAISE EXCEPTION
      'The exact approving reviewer lost the durable terminal continuation: %',
      v_queue;
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_extra,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_queue := public.list_build_request_queue_v1(
    1, 'builder', NULL, 20
  );
  IF jsonb_array_length(v_queue->'items') <> 0 THEN
    RAISE EXCEPTION
      'A superseded builder regained terminal queue access: %',
      v_queue;
  END IF;
  v_blocked := FALSE;
  BEGIN
    PERFORM public.get_build_request_v1(1, v_request_id);
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'A superseded builder regained terminal case detail access.';
  END IF;

  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  UPDATE public.build_request_readiness_evidence
  SET confirmed_at = clock_timestamp() - INTERVAL '2 days',
      valid_until = clock_timestamp() - INTERVAL '1 day'
  WHERE gate_kind = 'legal'
    AND evidence_state = 'confirmed';
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.get_build_request_publication_v1(
    1, v_request_id
  );
  IF (v_result->>'consentEnabled')::BOOLEAN
    OR v_result->'capabilities' ? 'propose'
  THEN
    RAISE EXCEPTION
      'Expired legal readiness left publication consent available: %',
      v_result;
  END IF;
  v_blocked := FALSE;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1,
      v_request_id,
      v_request_version,
      NULL,
      'publication-expired-legal-0001',
      'propose',
      jsonb_build_object(
        'safe_title', 'A reviewed Request outcome',
        'safe_summary',
          'A requester and an independent builder completed a bounded, reviewed PathForge outcome without publishing the private brief.'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:publication_blocked' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'Expired legal readiness did not block a publication proposal.';
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM public.record_build_request_readiness_v1(
    1, 'legal', 1, 'confirmed', 'fixture://legal-v2',
    clock_timestamp() + INTERVAL '30 days',
    'Counsel-reviewed Request terms were renewed after expiry.',
    'readiness-legal-v2'
  );
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1,
    v_request_id,
    v_request_version,
    NULL,
    'publication-propose-0001',
    'propose',
    jsonb_build_object(
      'safe_title', 'A reviewed Request outcome',
      'safe_summary',
        'A requester and an independent builder completed a bounded, reviewed PathForge outcome without publishing the private brief.'
    )
  );
  SELECT proposal.id INTO STRICT v_proposal_id
  FROM public.build_request_publication_proposals AS proposal
  WHERE proposal.request_id = v_request_id
    AND proposal.proposal_status = 'consent_pending';
  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  SELECT count(*) INTO v_count
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = v_request_id;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1, v_request_id, v_request_version, 1,
      'publication-requester-consent-null-attribution',
      'requester_consent',
      jsonb_build_object(
        'requester_attribution', 'null'::JSONB,
        'publication_terms_version', 'request-publication-v1'
      )
    );
    RAISE EXCEPTION 'JSON-null requester attribution was accepted.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1, v_request_id, v_request_version, 1,
      'publication-requester-consent-null-terms',
      'requester_consent',
      jsonb_build_object(
        'requester_attribution', 'anonymous',
        'publication_terms_version', 'null'::JSONB
      )
    );
    RAISE EXCEPTION 'JSON-null publication terms were accepted.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1, v_request_id, v_request_version, 1,
      'publication-requester-consent-bad-attribution',
      'requester_consent',
      jsonb_build_object(
        'requester_attribution', 'private-case-link',
        'publication_terms_version', 'request-publication-v1'
      )
    );
    RAISE EXCEPTION 'Unsupported requester attribution was accepted.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1, v_request_id, v_request_version, 1,
      'publication-requester-consent-stale-terms',
      'requester_consent',
      jsonb_build_object(
        'requester_attribution', 'anonymous',
        'publication_terms_version', 'request-publication-stale'
      )
    );
    RAISE EXCEPTION 'Stale publication terms were accepted.';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;
  IF EXISTS (
      SELECT 1
      FROM public.build_request_publication_consent_receipts AS consent
      WHERE consent.proposal_id = v_proposal_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_command_receipts AS receipt
      WHERE receipt.idempotency_key IN (
        'publication-requester-consent-null-attribution',
        'publication-requester-consent-null-terms',
        'publication-requester-consent-bad-attribution',
        'publication-requester-consent-stale-terms'
      )
    )
    OR (
      SELECT request_case.version
      FROM public.build_requests AS request_case
      WHERE request_case.id = v_request_id
    ) <> v_request_version
    OR (
      SELECT count(*)
      FROM public.build_request_events AS event_value
      WHERE event_value.request_id = v_request_id
    ) <> v_count
  THEN
    RAISE EXCEPTION
      'Hostile requester publication consent mutated receipt, version, or event authority.';
  END IF;
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1,
    v_request_id,
    v_request_version,
    1,
    'publication-requester-consent-0001',
    'requester_consent',
    jsonb_build_object(
      'requester_attribution', 'anonymous',
      'publication_terms_version', 'request-publication-v1'
    )
  );

  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1,
    v_request_id,
    v_request_version,
    1,
    'publication-replace-0001',
    'replace_proposal',
    jsonb_build_object(
      'safe_title', 'A renewed reviewed Request outcome',
      'safe_summary',
        'A renewed public-safe summary remains bound to the same exact reviewed delivery while requiring both participants to consent again.'
    )
  );
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_publication_consent_receipts AS consent
    WHERE consent.proposal_id = v_proposal_id
      AND consent.proposal_version = 1
      AND consent.actor_role = 'requester'
      AND consent.decision = 'consent'
      AND consent.safe_title_snapshot = 'A reviewed Request outcome'
      AND consent.safe_summary_snapshot =
        'A requester and an independent builder completed a bounded, reviewed PathForge outcome without publishing the private brief.'
  ) THEN
    RAISE EXCEPTION
      'Replaced publication content lost the exact prior consent snapshot.';
  END IF;
  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1,
    v_request_id,
    v_request_version,
    2,
    'publication-requester-consent-0002',
    'requester_consent',
    jsonb_build_object(
      'requester_attribution', 'anonymous',
      'publication_terms_version', 'request-publication-v1'
    )
  );

  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_builder,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.get_build_request_publication_v1(
    1, v_request_id
  );
  IF NOT (v_result->'capabilities' ? 'builder_consent') THEN
    RAISE EXCEPTION
      'The exact final builder could not reopen the consent task: %',
      v_result;
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.project_build_request_notifications_v1(1, 100);
  IF (v_result->>'eventsProjected')::INTEGER < 1 THEN
    RAISE EXCEPTION
      'Terminal publication events did not project a continuation: %',
      v_result;
  END IF;
  v_claim := public.claim_build_request_notifications_v1(1, 100);
  v_public := '[]'::JSONB;
  FOR v_claim_item IN
    SELECT claimed.item
    FROM jsonb_array_elements(v_claim->'items') AS claimed(item)
  LOOP
    IF v_claim_item ? 'recipient' THEN
      RAISE EXCEPTION
        'A publication notification claim exposed recipient identity: %',
        v_claim_item;
    END IF;
    v_result := public.resolve_build_request_notification_send_v1(
      1,
      (v_claim_item->>'deliveryId')::UUID,
      (v_claim_item->>'claimToken')::UUID
    );
    v_public := v_public || jsonb_build_array(v_result);
  END LOOP;
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_public) AS resolved(item)
    WHERE resolved.item->>'status' = 'authorized'
      AND resolved.item->>'recipient' = 'builder@example.test'
      AND resolved.item->>'templateKey' = 'request_status_changed'
  ) THEN
    RAISE EXCEPTION
      'The final builder publication send failed immediate reauthorization: %',
      v_public;
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_builder,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  SELECT count(*) INTO v_count
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = v_request_id;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1, v_request_id, v_request_version, 2,
      'publication-builder-consent-null-reuse',
      'builder_consent',
      jsonb_build_object(
        'reuse_permission', 'null'::JSONB,
        'publication_terms_version', 'request-publication-v1'
      )
    );
    RAISE EXCEPTION 'JSON-null reuse permission was accepted.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1, v_request_id, v_request_version, 2,
      'publication-builder-consent-bad-reuse',
      'builder_consent',
      jsonb_build_object(
        'reuse_permission', 'exclusive_ownership',
        'publication_terms_version', 'request-publication-v1'
      )
    );
    RAISE EXCEPTION 'Unsupported reuse permission was accepted.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1, v_request_id, v_request_version, 2,
      'publication-builder-consent-stale-terms',
      'builder_consent',
      jsonb_build_object(
        'reuse_permission', 'adapt_with_credit',
        'publication_terms_version', 'request-publication-stale'
      )
    );
    RAISE EXCEPTION 'Stale builder publication terms were accepted.';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;
  IF EXISTS (
      SELECT 1
      FROM public.build_request_publication_consent_receipts AS consent
      WHERE consent.proposal_id = v_proposal_id
        AND consent.proposal_version = 2
        AND consent.actor_role = 'builder'
    )
    OR (
      SELECT request_case.version
      FROM public.build_requests AS request_case
      WHERE request_case.id = v_request_id
    ) <> v_request_version
    OR (
      SELECT count(*)
      FROM public.build_request_events AS event_value
      WHERE event_value.request_id = v_request_id
    ) <> v_count
  THEN
    RAISE EXCEPTION
      'Hostile builder publication consent mutated receipt, version, or event authority.';
  END IF;
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1,
    v_request_id,
    v_request_version,
    2,
    'publication-builder-consent-0001',
    'builder_consent',
    jsonb_build_object(
      'reuse_permission', 'adapt_with_credit',
      'publication_terms_version', 'request-publication-v1'
    )
  );

  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.get_build_request_publication_v1(
    1, v_request_id
  );
  IF NOT (v_result->'capabilities' ? 'submit_airlock')
    OR v_result->'capabilities' ? 'publish_outcome'
  THEN
    RAISE EXCEPTION
      'Publication capability did not stop at the consent airlock: %',
      v_result;
  END IF;
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1,
    v_request_id,
    v_request_version,
    2,
    'publication-airlock-0001',
    'submit_airlock',
    '{}'::JSONB
  );
  v_result := public.get_build_request_publication_v1(
    1, v_request_id
  );
  IF NOT (v_result->'capabilities' ? 'review_airlock')
    OR v_result->'capabilities' ? 'publish_outcome'
    OR v_result->'proposal'->>'airlockReviewVerdict' IS NOT NULL
  THEN
    RAISE EXCEPTION
      'Airlock submission bypassed independent exact-summary review: %',
      v_result;
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_blocked := FALSE;
  BEGIN
    PERFORM public.publish_build_request_outcome_v1(
      1,
      v_proposal_id,
      v_project,
      'publication-bridge-before-review-0001'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:publication_blocked' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'Global airlock health allowed publication without an exact review.';
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  SELECT request_case.version, count(event_value.id)
  INTO v_request_version, v_count
  FROM public.build_requests AS request_case
  LEFT JOIN public.build_request_events AS event_value
    ON event_value.request_id = request_case.id
  WHERE request_case.id = v_request_id
  GROUP BY request_case.version;
  BEGIN
    PERFORM public.review_build_request_publication_v1(
      1,
      v_proposal_id,
      2,
      'approve',
      jsonb_build_object(
        'private_content_excluded', TRUE,
        'claims_supported_by_delivery', TRUE,
        'attribution_matches_consent', FALSE,
        'reuse_permission_matches_consent', TRUE,
        'public_truth_ready', TRUE
      ),
      'An approval with a failed exact check must never be accepted.',
      'publication-review-inconsistent-approval'
    );
    RAISE EXCEPTION 'Inconsistent publication approval was accepted.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    PERFORM public.review_build_request_publication_v1(
      1,
      v_proposal_id,
      2,
      'changes_required',
      jsonb_build_object(
        'private_content_excluded', TRUE,
        'claims_supported_by_delivery', TRUE,
        'attribution_matches_consent', TRUE,
        'reuse_permission_matches_consent', TRUE,
        'public_truth_ready', TRUE
      ),
      'A repair verdict requires at least one exact failed review check.',
      'publication-review-inconsistent-repair'
    );
    RAISE EXCEPTION 'All-passing publication repair verdict was accepted.';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
  BEGIN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = v_requester;
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_requester,
        'role', 'authenticated'
      )::TEXT,
      TRUE
    );
    PERFORM public.review_build_request_publication_v1(
      1,
      v_proposal_id,
      2,
      'approve',
      jsonb_build_object(
        'private_content_excluded', TRUE,
        'claims_supported_by_delivery', TRUE,
        'attribution_matches_consent', TRUE,
        'reuse_permission_matches_consent', TRUE,
        'public_truth_ready', TRUE
      ),
      'A requester may never serve as the independent airlock reviewer.',
      'publication-review-requester-conflict'
    );
    RAISE EXCEPTION 'Requester reviewed their own publication proposal.';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    NULL;
  END;
  IF EXISTS (
      SELECT 1
      FROM public.build_request_publication_reviews AS review
      WHERE review.proposal_id = v_proposal_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_command_receipts AS receipt
      WHERE receipt.idempotency_key IN (
        'publication-review-inconsistent-approval',
        'publication-review-inconsistent-repair',
        'publication-review-requester-conflict'
      )
    )
    OR (
      SELECT request_case.version
      FROM public.build_requests AS request_case
      WHERE request_case.id = v_request_id
    ) <> v_request_version
    OR (
      SELECT count(*)
      FROM public.build_request_events AS event_value
      WHERE event_value.request_id = v_request_id
    ) <> v_count
  THEN
    RAISE EXCEPTION
      'Hostile publication review mutated review, receipt, version, or event authority.';
  END IF;
  v_result := public.review_build_request_publication_v1(
    1,
    v_proposal_id,
    2,
    'changes_required',
    jsonb_build_object(
      'private_content_excluded', TRUE,
      'claims_supported_by_delivery', FALSE,
      'attribution_matches_consent', TRUE,
      'reuse_permission_matches_consent', TRUE,
      'public_truth_ready', TRUE
    ),
    'Replace the summary because one public claim is broader than the reviewed delivery evidence.',
    'publication-airlock-review-changes-0001'
  );
  IF v_result->>'verdict' <> 'changes_required'
    OR (v_result->>'replayed')::BOOLEAN
  THEN
    RAISE EXCEPTION
      'Independent changes-required review did not produce a receipt: %',
      v_result;
  END IF;
  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.get_build_request_publication_v1(1, v_request_id);
  IF v_result->'proposal'->>'airlockReviewVerdict'
      <> 'changes_required'
    OR v_result->'proposal'->>'airlockReviewNote'
      <> 'Replace the summary because one public claim is broader than the reviewed delivery evidence.'
    OR NOT (v_result->'capabilities' ? 'replace_proposal')
    OR v_result->'capabilities' ? 'requester_consent'
    OR v_result->'capabilities' ? 'builder_consent'
    OR v_result->'capabilities' ? 'decline'
  THEN
    RAISE EXCEPTION
      'Changes-required review did not expose a safe repair-only continuation: %',
      v_result;
  END IF;
  v_blocked := FALSE;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1, v_request_id, v_request_version, 2,
      'publication-requester-reconsent-blocked',
      'requester_consent',
      jsonb_build_object(
        'requester_attribution', 'anonymous',
        'publication_terms_version', 'request-publication-v1'
      )
    );
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'A requester re-consented to unchanged review-rejected bytes.';
  END IF;
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1, v_request_id, v_request_version, 2,
    'publication-replace-after-review-0001',
    'replace_proposal',
    jsonb_build_object(
      'safe_title', 'A corrected reviewed Request outcome',
      'safe_summary',
        'A corrected public-safe summary now describes only the exact independently reviewed delivery evidence and excludes every private case detail.'
    )
  );
  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1, v_request_id, v_request_version, 3,
    'publication-requester-consent-0003',
    'requester_consent',
    jsonb_build_object(
      'requester_attribution', 'anonymous',
      'publication_terms_version', 'request-publication-v1'
    )
  );
  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_builder,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1, v_request_id, v_request_version, 3,
    'publication-builder-consent-0003',
    'builder_consent',
    jsonb_build_object(
      'reuse_permission', 'adapt_with_credit',
      'publication_terms_version', 'request-publication-v1'
    )
  );
  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1, v_request_id, v_request_version, 3,
    'publication-airlock-0003',
    'submit_airlock',
    '{}'::JSONB
  );
  UPDATE public.profiles SET role = 'admin' WHERE id = v_reviewer;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_reviewer,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.review_build_request_publication_v1(
    1,
    v_proposal_id,
    3,
    'approve',
    jsonb_build_object(
      'private_content_excluded', TRUE,
      'claims_supported_by_delivery', TRUE,
      'attribution_matches_consent', TRUE,
      'reuse_permission_matches_consent', TRUE,
      'public_truth_ready', TRUE
    ),
    'The corrected exact summary passed every independent public-truth check.',
    'publication-airlock-review-0003'
  );
  IF v_result->>'verdict' <> 'approved'
    OR (v_result->>'replayed')::BOOLEAN
  THEN
    RAISE EXCEPTION
      'The replacement proposal did not receive a fresh independent review: %',
      v_result;
  END IF;
  v_replay := public.review_build_request_publication_v1(
    1,
    v_proposal_id,
    3,
    'approve',
    jsonb_build_object(
      'private_content_excluded', TRUE,
      'claims_supported_by_delivery', TRUE,
      'attribution_matches_consent', TRUE,
      'reuse_permission_matches_consent', TRUE,
      'public_truth_ready', TRUE
    ),
    'The corrected exact summary passed every independent public-truth check.',
    'publication-airlock-review-0003'
  );
  IF NOT (v_replay->>'replayed')::BOOLEAN
    OR v_replay->>'verdict' <> 'approved'
  THEN
    RAISE EXCEPTION
      'Replacement publication review replay drifted: %',
      v_replay;
  END IF;
  v_result := public.get_build_request_publication_v1(
    1, v_request_id
  );
  IF NOT (v_result->'capabilities' ? 'publish_outcome')
    OR v_result->'capabilities' ? 'review_airlock'
    OR v_result->'proposal'->>'airlockReviewVerdict' <> 'approved'
  THEN
    RAISE EXCEPTION
      'Reviewed airlock proposal did not expose the exact bridge: %',
      v_result;
  END IF;

  UPDATE public.build_request_readiness_evidence
  SET confirmed_at = clock_timestamp() - INTERVAL '2 days',
      valid_until = clock_timestamp() - INTERVAL '1 day'
  WHERE gate_kind = 'legal'
    AND evidence_state = 'confirmed';
  v_result := public.get_build_request_publication_v1(
    1, v_request_id
  );
  IF (v_result->>'consentEnabled')::BOOLEAN
    OR v_result->'capabilities' ? 'publish_outcome'
  THEN
    RAISE EXCEPTION
      'Expired legal readiness left the publication bridge available: %',
      v_result;
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_blocked := FALSE;
  BEGIN
    PERFORM public.publish_build_request_outcome_v1(
      1,
      v_proposal_id,
      v_project,
      'publication-bridge-expired-0001'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:publication_blocked' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'Expired legal readiness did not block service publication.';
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM public.record_build_request_readiness_v1(
    1, 'legal', 2, 'confirmed', 'fixture://legal-v3',
    clock_timestamp() + INTERVAL '30 days',
    'Counsel-reviewed Request terms were revalidated before publish.',
    'readiness-legal-v3'
  );
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.publish_build_request_outcome_v1(
    1,
    v_proposal_id,
    v_project,
    'publication-bridge-0001'
  );
  v_public_slug := v_result->>'publicSlug';
  IF v_public_slug IS NULL
    OR (v_result->>'replayed')::BOOLEAN
  THEN
    RAISE EXCEPTION 'Public outcome bridge failed: %', v_result;
  END IF;
  v_replay := public.publish_build_request_outcome_v1(
    1,
    v_proposal_id,
    v_project,
    'publication-bridge-0001'
  );
  IF NOT (v_replay->>'replayed')::BOOLEAN
    OR v_replay->>'publicSlug' <> v_public_slug
  THEN
    RAISE EXCEPTION 'Public outcome bridge replay drifted: %', v_replay;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"anon"}',
    TRUE
  );
  v_public := public.list_public_build_request_outcomes_v1(1, 24);
  IF NOT (v_public->>'available')::BOOLEAN
    OR jsonb_array_length(v_public->'items') <> 1
    OR v_public->'items'->0->>'slug' <> v_public_slug
    OR v_public->'items'->0->>'projectHref'
      <> '/prompt/' || v_project::TEXT
    OR v_public->'items'->0 ? 'requestId'
    OR v_public->'items'->0 ? 'proposalId'
    OR v_public->'items'->0 ? 'manifestDigest'
    OR v_public->'items'->0 ? 'brief'
    OR v_public->'items'->0 ? 'email'
    OR v_public->'items'->0 ? 'objectIdentity'
  THEN
    RAISE EXCEPTION
      'Anonymous outcome projection is not the exact safe shape: %',
      v_public;
  END IF;
  IF v_public->'nextCursor' IS DISTINCT FROM 'null'::JSONB THEN
    RAISE EXCEPTION
      'A one-item outcome page invented a continuation cursor: %',
      v_public;
  END IF;
  v_replay := public.list_public_build_request_outcomes_v1(
    1,
    24,
    (v_public->'items'->0->>'publishedAt')::TIMESTAMPTZ,
    v_public_slug
  );
  IF jsonb_array_length(v_replay->'items') <> 0 THEN
    RAISE EXCEPTION
      'The public outcome keyset cursor repeated its boundary item: %',
      v_replay;
  END IF;
  v_blocked := FALSE;
  BEGIN
    PERFORM public.list_public_build_request_outcomes_v1(
      1, 24, clock_timestamp(), NULL
    );
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'A partial public outcome cursor did not fail closed.';
  END IF;
  v_result := public.get_public_build_request_outcome_v1(
    1, v_public_slug
  );
  IF v_result->>'projectId' <> v_project::TEXT
    OR v_result->>'reusePermission' <> 'adapt_with_credit'
    OR jsonb_typeof(v_result->'requester') <> 'null'
  THEN
    RAISE EXCEPTION
      'Anonymous outcome detail changed consent or attribution: %',
      v_result;
  END IF;

  UPDATE public.build_requests
  SET moderation_state = 'held'
  WHERE id = v_request_id;
  BEGIN
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_requester,
        'role', 'authenticated'
      )::TEXT,
      TRUE
    );
    v_result := public.get_build_request_publication_v1(
      1, v_request_id
    );
    IF v_result->>'visibility' <> 'withdrawal_only'
      OR v_result->>'status' <> 'held'
      OR v_result->>'requestVersion' IS NULL
      OR v_result->'capabilities' <> '["withdraw"]'::JSONB
      OR v_result ? 'consentEnabled'
      OR v_result->'proposal' ? 'requesterAttribution'
      OR v_result->'proposal' ? 'reusePermission'
      OR v_result->'proposal' ? 'airlockReviewNote'
    THEN
      RAISE EXCEPTION
        'A held publication exposed more than safe withdrawal authority: %',
        v_result;
    END IF;
    SELECT to_jsonb(receipt) INTO v_result
    FROM public.build_request_publication_command_v1(
      1,
      v_request_id,
      (v_result->>'requestVersion')::INTEGER,
      (v_result->'proposal'->>'proposalVersion')::INTEGER,
      'publication-held-withdraw-0001',
      'withdraw',
      '{}'::JSONB
    ) AS receipt;
    v_replay :=
      public.get_build_request_publication_withdrawal_receipt_v1(
        1,
        v_request_id,
        (v_result->>'command_id')::UUID
      );
    IF v_replay->>'requestId' <> v_request_id::TEXT
      OR v_replay->>'commandId' <> v_result->>'command_id'
      OR v_replay->>'occurredAt' IS NULL
    THEN
      RAISE EXCEPTION
        'Held withdrawal did not produce an actor-verifiable receipt: %',
        v_replay;
    END IF;
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_extra,
        'role', 'authenticated'
      )::TEXT,
      TRUE
    );
    v_blocked := FALSE;
    BEGIN
      PERFORM
        public.get_build_request_publication_withdrawal_receipt_v1(
          1,
          v_request_id,
          (v_result->>'command_id')::UUID
        );
    EXCEPTION WHEN SQLSTATE 'P0002' THEN
      v_blocked := TRUE;
    END;
    IF NOT v_blocked THEN
      RAISE EXCEPTION
        'An unrelated actor enumerated a publication withdrawal receipt.';
    END IF;
    UPDATE public.build_requests
    SET moderation_state = 'clear'
    WHERE id = v_request_id;
    PERFORM set_config(
      'request.jwt.claims',
      '{"role":"anon"}',
      TRUE
    );
    v_public := public.list_public_build_request_outcomes_v1(1, 24);
    IF jsonb_array_length(v_public->'items') <> 0 THEN
      RAISE EXCEPTION
        'A withdrawn held outcome reappeared after hold release: %',
        v_public;
    END IF;
    RAISE EXCEPTION 'rollback-held-withdraw-fixture';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'rollback-held-withdraw-fixture' THEN
      RAISE;
    END IF;
  END;
  v_public := public.list_public_build_request_outcomes_v1(1, 24);
  IF jsonb_array_length(v_public->'items') <> 0 THEN
    RAISE EXCEPTION
      'A moderation-held outcome remained publicly discoverable: %',
      v_public;
  END IF;
  v_blocked := FALSE;
  BEGIN
    PERFORM public.get_public_build_request_outcome_v1(
      1, v_public_slug
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:not_found' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'A moderation-held outcome remained publicly addressable.';
  END IF;
  UPDATE public.build_requests
  SET moderation_state = 'clear'
  WHERE id = v_request_id;
  v_public := public.list_public_build_request_outcomes_v1(1, 24);
  IF jsonb_array_length(v_public->'items') <> 1 THEN
    RAISE EXCEPTION
      'A released moderation hold did not restore the safe projection: %',
      v_public;
  END IF;
  UPDATE public.prompts
  SET status = 'pending'
  WHERE id = v_project;
  v_public := public.list_public_build_request_outcomes_v1(1, 24);
  IF jsonb_array_length(v_public->'items') <> 0 THEN
    RAISE EXCEPTION
      'An outcome survived withdrawal of its approved-project authority: %',
      v_public;
  END IF;
  v_blocked := FALSE;
  BEGIN
    PERFORM public.get_public_build_request_outcome_v1(
      1, v_public_slug
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
    IF v_detail <> 'request_authority:not_found' THEN
      RAISE;
    END IF;
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'An outcome remained addressable without approved-project authority.';
  END IF;
  UPDATE public.prompts
  SET status = 'approved'
  WHERE id = v_project;
  v_public := public.list_public_build_request_outcomes_v1(1, 24);
  IF jsonb_array_length(v_public->'items') <> 1 THEN
    RAISE EXCEPTION
      'Restored approved-project authority did not restore the safe outcome: %',
      v_public;
  END IF;

  -- Routine publication preservation is audit-only. At day 91 the private
  -- brief and exact delivery bytes remain eligible for their ordinary purge;
  -- consent, review, and bridge receipts remain intact without a generic
  -- request-wide retention hold.
  UPDATE public.build_requests
  SET terminal_at = clock_timestamp() - INTERVAL '91 days',
      audit_tombstone_until = NULL,
      raw_text_purged_at = NULL
  WHERE id = v_request_id;
  IF NOT private.request_publication_preservation_active_v1(v_request_id)
    OR EXISTS (
      SELECT 1
      FROM public.build_request_retention_holds AS hold
      WHERE hold.request_id = v_request_id
        AND hold.released_at IS NULL
    )
  THEN
    RAISE EXCEPTION
      'Publication preservation became a generic private-data hold.';
  END IF;
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.list_build_request_maintenance_work_v1(
    1, NULL, 100
  );
  IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_result->'items') AS work(item)
      WHERE work.item->>'category' = 'raw_text_purge'
        AND work.item->>'requestId' = v_request_id::TEXT
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_result->'items') AS work(item)
      WHERE work.item->>'category' = 'artifact_cleanup'
        AND work.item->>'requestId' = v_request_id::TEXT
        AND work.item->>'artifactId' = v_artifact_id::TEXT
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_publication_consent_receipts AS consent
      WHERE consent.proposal_id = v_proposal_id
        AND consent.decision = 'consent'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_publication_reviews AS review
      WHERE review.proposal_id = v_proposal_id
        AND review.verdict = 'approved'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_publication_bridge_receipts AS bridge
      WHERE bridge.proposal_id = v_proposal_id
    )
  THEN
    RAISE EXCEPTION
      'Day-91 publication preservation blocked private cleanup or lost exact public audit receipts: %',
      v_result;
  END IF;

  -- Once the ordinary 400-day participant scope expires, the exact requester
  -- and builder retain only the narrow ability to inspect and withdraw their
  -- still-active publication. Full private case access remains unavailable.
  UPDATE public.build_requests
  SET terminal_at = clock_timestamp() - INTERVAL '401 days',
      audit_tombstone_until = NULL
  WHERE id = v_request_id;
  IF private.request_has_scope_v1(v_request_id, v_requester)
    OR private.request_has_scope_v1(v_request_id, v_builder)
  THEN
    RAISE EXCEPTION
      'Expired private case scope survived the 400-day audit boundary.';
  END IF;
  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_requester,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.get_build_request_publication_v1(1, v_request_id);
  IF v_result->>'visibility' <> 'withdrawal_only'
    OR v_result->>'status' <> 'private_scope_expired'
    OR (v_result->>'requestVersion')::INTEGER <> v_request_version
    OR v_result->'capabilities' <> '["withdraw"]'::JSONB
    OR v_result ? 'consentEnabled'
    OR v_result->'proposal' ? 'airlockReviewNote'
  THEN
    RAISE EXCEPTION
      'The requester lost narrow publication withdrawal after private scope expiry: %',
      v_result;
  END IF;
  v_blocked := FALSE;
  BEGIN
    PERFORM public.get_build_request_v1(1, v_request_id);
  EXCEPTION WHEN SQLSTATE 'P0002' THEN
    v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'Narrow publication continuation restored full private case access.';
  END IF;
  BEGIN
    PERFORM *
    FROM public.build_request_publication_command_v1(
      1,
      v_request_id,
      v_request_version,
      3,
      'publication-requester-withdraw-expired-scope',
      'withdraw',
      '{}'::JSONB
    );
    RAISE EXCEPTION 'rollback-requester-withdraw-fixture';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'rollback-requester-withdraw-fixture' THEN
      RAISE;
    END IF;
  END;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_builder,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM *
  FROM public.build_request_publication_command_v1(
    1,
    v_request_id,
    v_request_version,
    3,
    'publication-builder-withdraw-expired-scope',
    'withdraw',
    '{}'::JSONB
  );
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"anon"}',
    TRUE
  );
  v_public := public.list_public_build_request_outcomes_v1(1, 24);
  IF jsonb_array_length(v_public->'items') <> 0 THEN
    RAISE EXCEPTION
      'Withdrawn consent remained publicly discoverable: %',
      v_public;
  END IF;
  IF private.request_publication_preservation_active_v1(v_request_id)
    OR EXISTS (
      SELECT 1
      FROM public.build_request_retention_holds AS hold
      WHERE hold.request_id = v_request_id
        AND hold.released_at IS NULL
    )
  THEN
    RAISE EXCEPTION
      'Publication withdrawal did not end scoped audit preservation.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.issue_build_request_intake_risk_grant_v1(
    1,
    v_requester,
    'public-risk-actor-clear-0002',
    repeat('1', 64),
    'fixture-risk-v1'
  );
  IF v_result->>'status' <> 'clear' THEN
    RAISE EXCEPTION 'Second actor risk grant should be clear: %', v_result;
  END IF;
  v_result := public.issue_build_request_intake_risk_grant_v1(
    1,
    v_requester,
    'public-risk-actor-denied-0003',
    repeat('1', 64),
    'fixture-risk-v1'
  );
  IF v_result->>'status' <> 'denied'
    OR v_result->>'reason' <> 'actor_limit'
    OR v_result->>'grantId' IS NOT NULL
  THEN
    RAISE EXCEPTION 'Actor risk limit failed closed: %', v_result;
  END IF;
  v_result := public.issue_build_request_intake_risk_grant_v1(
    1,
    v_builder,
    'public-risk-network-clear-0001',
    repeat('1', 64),
    'fixture-risk-v1'
  );
  IF v_result->>'status' <> 'clear' THEN
    RAISE EXCEPTION 'Third network grant should be clear: %', v_result;
  END IF;
  v_result := public.issue_build_request_intake_risk_grant_v1(
    1,
    v_reviewer,
    'public-risk-network-denied-0001',
    repeat('1', 64),
    'fixture-risk-v1'
  );
  IF v_result->>'status' <> 'denied'
    OR v_result->>'reason' <> 'network_limit'
  THEN
    RAISE EXCEPTION 'Network risk limit failed closed: %', v_result;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_controls := jsonb_set(
    v_controls,
    '{global_daily_intake_limit}',
    '1'::JSONB
  );
  PERFORM public.set_build_request_public_controls_v1(
    1,
    3,
    'public-controls-global-limit',
    v_controls
  );
  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.issue_build_request_intake_risk_grant_v1(
    1,
    v_extra,
    'public-risk-global-denied-0001',
    repeat('3', 64),
    'fixture-risk-v1'
  );
  IF v_result->>'status' <> 'denied'
    OR v_result->>'reason' <> 'global_limit'
  THEN
    RAISE EXCEPTION 'Global risk limit failed closed: %', v_result;
  END IF;
  SELECT count(*) INTO v_count
  FROM public.build_request_intake_risk_grants AS grant_row
  WHERE grant_row.decision = 'denied';
  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'Over-limit intake attempts created unbounded denial rows: %',
      v_count;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM public.record_build_request_readiness_v1(
    1, 'responsive_qa', 3, 'revoked',
    'fixture://responsive-qa-v4-revoked',
    NULL,
    'Responsive proof was revoked before retention cleanup.',
    'readiness-responsive-revoke-v4'
  );
  UPDATE public.build_request_readiness_evidence
  SET confirmed_at = clock_timestamp() - INTERVAL '401 days',
      valid_until = CASE
        WHEN valid_until IS NULL THEN NULL
        ELSE clock_timestamp() - INTERVAL '400 days'
      END
  WHERE gate_kind = 'responsive_qa';

  UPDATE public.build_requests
  SET raw_text_purged_at = clock_timestamp()
  WHERE id = v_request_id;
  UPDATE public.build_request_intake_risk_grants
  SET issued_at = clock_timestamp() - INTERVAL '31 days',
      expires_at =
        clock_timestamp() - INTERVAL '31 days' + INTERVAL '10 minutes'
  WHERE actor_id IS NOT NULL;
  UPDATE public.build_request_notification_deliveries
  SET updated_at = clock_timestamp() - INTERVAL '91 days'
  WHERE report_id = v_report_id
    AND recipient_id = v_admin
    AND delivery_state = 'suppressed'
    AND suppression_reason = 'control_off';

  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  v_result := public.maintain_build_request_public_architecture_v1(
    1, 100
  );
  IF (v_result->>'reportsPurged')::INTEGER <> 1
    OR (v_result->>'proposalsPurged')::INTEGER <> 1
    OR (v_result->>'riskGrantsDeleted')::INTEGER < 1
    OR (v_result->>'notificationDeliveriesDeleted')::INTEGER <> 1
    OR (v_result->>'readinessEvidenceDeleted')::INTEGER < 4
  THEN
    RAISE EXCEPTION
      'Public architecture maintenance did not reconcile retention: %',
      v_result;
  END IF;
  IF EXISTS (
      SELECT 1
      FROM public.build_request_reports AS report
      WHERE report.id = v_report_id
        AND (
          report.details_purged_at IS NULL
          OR report.details
            <> '[Private report text removed after retention.]'
          OR report.resolution_note
            <> '[Private report resolution removed after retention.]'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_publication_proposals AS proposal
      WHERE proposal.id = v_proposal_id
        AND (
          proposal.content_purged_at IS NULL
          OR proposal.safe_title <> '[Publication proposal removed]'
        )
    )
  THEN
    RAISE EXCEPTION
      'Private report/proposal retention did not leave a safe tombstone.';
  END IF;
  IF EXISTS (
      SELECT 1
      FROM public.build_request_intake_risk_grants AS grant_row
      WHERE grant_row.id = v_grant_id
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_intake_attestations AS attestation
      WHERE attestation.request_id = v_request_id
        AND attestation.risk_grant_id = v_grant_id
        AND attestation.risk_screening_verified_at IS NOT NULL
        AND attestation.risk_engine_version = 'fixture-risk-v1'
    )
  THEN
    RAISE EXCEPTION
      'Network risk digest retention did not preserve only the immutable safe verification snapshot.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  v_result := public.record_build_request_readiness_v1(
    1, 'responsive_qa', 4, 'confirmed',
    'fixture://responsive-qa-v5',
    clock_timestamp() + INTERVAL '30 days',
    'Responsive proof retained monotonic authority after cleanup.',
    'readiness-responsive-renew-v5'
  );
  IF v_result->>'evidenceVersion' <> '5' THEN
    RAISE EXCEPTION
      'Readiness cleanup reset monotonic evidence authority: %',
      v_result;
  END IF;

  UPDATE public.build_request_publication_proposals
  SET proposal_status = 'published',
      ended_at = NULL,
      updated_at = clock_timestamp()
  WHERE id = v_proposal_id;
  UPDATE public.build_request_public_outcomes
  SET withdrawn_at = NULL
  WHERE proposal_id = v_proposal_id;
  UPDATE public.build_requests
  SET publication_state = 'published'
  WHERE id = v_request_id;
  IF NOT private.request_publication_preservation_active_v1(v_request_id)
    OR EXISTS (
      SELECT 1
      FROM public.build_request_retention_holds AS hold
      WHERE hold.request_id = v_request_id
        AND hold.released_at IS NULL
    )
  THEN
    RAISE EXCEPTION
      'Reactivated publication did not use scoped audit-only preservation.';
  END IF;
  INSERT INTO public.build_request_deidentified_accounts (
    subject_digest
  ) VALUES (
    private.request_account_pseudonym_v1(v_builder)
  );
  IF EXISTS (
      SELECT 1
      FROM public.build_request_public_outcomes AS outcome
      WHERE outcome.proposal_id = v_proposal_id
        AND outcome.withdrawn_at IS NULL
    )
    OR private.request_publication_preservation_active_v1(v_request_id)
  THEN
    RAISE EXCEPTION
      'Account deidentification did not withdraw publication and end scoped audit preservation.';
  END IF;
  IF (
    SELECT request_case.publication_state
    FROM public.build_requests AS request_case
    WHERE request_case.id = v_request_id
  ) <> 'withdrawn' THEN
    RAISE EXCEPTION
      'Builder deidentification left the private case marked published.';
  END IF;

  -- One event can have several participant recipients. Deidentifying those
  -- accounts sequentially must retain a distinct safe delivery tombstone for
  -- each recipient instead of colliding after recipient_id becomes NULL.
  INSERT INTO public.build_request_deidentified_accounts (
    subject_digest
  ) VALUES (
    private.request_account_pseudonym_v1(v_reviewer)
  );
  SELECT count(*) INTO v_count
  FROM public.build_request_notification_deliveries AS delivery
  WHERE delivery.event_id = v_terminal_event_id
    AND delivery.recipient_id IS NULL
    AND delivery.recipient_deidentified;
  IF v_count <> 2 THEN
    RAISE EXCEPTION
      'Sequential notification-recipient deidentification did not preserve distinct tombstones: %',
      v_count;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_admin,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  PERFORM public.set_build_request_operator_membership_v1(
    1, v_extra, 'builder', 0, 'paused', 1,
    NULL, NULL, 'Second historical builder tombstone fixture.',
    'operator-second-builder-create'
  );
  INSERT INTO public.build_request_deidentified_accounts (
    subject_digest
  ) VALUES (
    private.request_account_pseudonym_v1(v_extra)
  );
  SELECT count(*) INTO v_count
  FROM public.build_request_operator_memberships AS membership
  WHERE membership.account_id IS NULL
    AND membership.account_deidentified
    AND membership.operator_role = 'builder';
  IF v_count <> 2 THEN
    RAISE EXCEPTION
      'Distinct historical operator tombstones collapsed after deidentification: %',
      v_count;
  END IF;
  v_replay := public.set_build_request_operator_membership_v1(
    1, v_extra, 'builder', 0, 'paused', 1,
    NULL, NULL, 'Second historical builder tombstone fixture.',
    'operator-second-builder-create'
  );
  IF NOT (v_replay->>'replayed')::BOOLEAN
    OR jsonb_typeof(v_replay->'accountId') <> 'null'
    OR NOT (v_replay->>'accountDeidentified')::BOOLEAN
  THEN
    RAISE EXCEPTION
      'A deidentified operator replay did not return its safe durable tombstone: %',
      v_replay;
  END IF;

  RAISE NOTICE
    'Request public architecture runtime contract passed for request %.',
    v_request_id;
END;
$request_public_architecture_runtime$;
