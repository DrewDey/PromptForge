\set ON_ERROR_STOP on

CREATE FUNCTION public.test_request_audit_cleanup_late_failure()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.idempotency_key LIKE 'raw-purge-late-failure-%' THEN
    RAISE EXCEPTION 'injected_request_audit_cleanup_late_failure';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER test_request_audit_cleanup_late_failure
  BEFORE INSERT ON public.build_request_audit_cleanup_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.test_request_audit_cleanup_late_failure();

DO $test$
<<raw_purge>>
DECLARE
  terminal_mode TEXT := '__TERMINAL_MODE__';
  administrator UUID := '82000000-0000-4000-8000-000000000007';
  request_id UUID;
  request_version INTEGER;
  result JSONB;
  authority_before JSONB;
  authority_after JSONB;
  cleanup_result JSONB;
  request_digest TEXT;
  accepted_digest_before TEXT;
  seal_digests_before JSONB;
  acceptance_cutoff_before TIMESTAMPTZ;
  artifact_row RECORD;
  cleanup_claim JSONB;
BEGIN
  IF terminal_mode NOT IN ('completed', 'no_response') THEN
    RAISE EXCEPTION 'Invalid raw-purge fixture terminal mode.';
  END IF;
  SELECT request_case.id INTO request_id
  FROM public.build_requests AS request_case
  WHERE request_case.current_delivery_revision_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.build_request_delivery_reviews AS submitted_review
      WHERE submitted_review.request_id = request_case.id
    )
  ORDER BY request_case.submitted_at
  LIMIT 1;
  IF request_id IS NULL THEN
    RAISE EXCEPTION 'Raw-purge delivery/review prerequisites were not created.';
  END IF;

  UPDATE public.build_requests
  SET lifecycle_state = CASE
        WHEN terminal_mode = 'completed' THEN 'completed'
        ELSE 'closed'
      END,
      close_reason = CASE
        WHEN terminal_mode = 'no_response' THEN 'no_response'
        ELSE NULL
      END,
      close_explanation = CASE
        WHEN terminal_mode = 'no_response'
          THEN 'Closed after the response window elapsed.'
        ELSE NULL
      END,
      moderation_state = 'clear',
      publication_state = 'withdrawn',
      terminal_at = clock_timestamp() - INTERVAL '91 days',
      raw_text_purged_at = NULL,
      audit_tombstone_until = NULL
  WHERE id = request_id;

  -- Even the table owner and service JWT cannot perform the special append-only
  -- rewrite without entering through the bounded purge RPC.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    UPDATE public.build_request_brief_revisions
    SET title = '[forbidden owner rewrite]'
    WHERE request_id = raw_purge.request_id;
    RAISE EXCEPTION 'Direct owner raw-text mutation succeeded.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Direct owner raw-text mutation succeeded.' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  BEGIN
    UPDATE public.build_request_delivery_reviews
    SET review_notes = '[forbidden service rewrite]'
    WHERE request_id = raw_purge.request_id;
    RAISE EXCEPTION 'Direct service raw-text mutation succeeded.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Direct service raw-text mutation succeeded.' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.build_request_clarifications
    SET question = '[forbidden clarification rewrite]'
    WHERE request_id = raw_purge.request_id;
    RAISE EXCEPTION 'Direct service clarification mutation succeeded.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Direct service clarification mutation succeeded.' THEN
        RAISE;
      END IF;
  END;

  -- An active hold blocks the purge, then an explicit operator release restores
  -- eligibility without changing the terminal lifecycle.
  SELECT version INTO request_version
  FROM public.build_requests WHERE id = request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1, request_id, request_version,
    'raw-purge-place-hold-' || terminal_mode,
    'place_moderation_hold',
    jsonb_build_object('reason', 'Raw purge hold fixture')
  );
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  BEGIN
    PERFORM public.purge_build_request_raw_text_v1(1, request_id);
    RAISE EXCEPTION 'Raw-text purge bypassed an active hold.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Raw-text purge bypassed an active hold.' THEN RAISE; END IF;
  END;
  IF (SELECT raw_text_purged_at FROM public.build_requests WHERE id = request_id)
      IS NOT NULL THEN
    RAISE EXCEPTION 'A hold-blocked purge partially mutated the case.';
  END IF;
  SELECT version INTO request_version
  FROM public.build_requests WHERE id = request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1, request_id, request_version,
    'raw-purge-release-hold-' || terminal_mode,
    'release_moderation_hold',
    jsonb_build_object('resolution', 'Retention eligibility fixture released')
  );

  SELECT
    accepted_scope.accepted_clarification_digest,
    accepted_scope.clarification_acceptance_cutoff
  INTO accepted_digest_before, acceptance_cutoff_before
  FROM public.build_request_accepted_clarification_sets AS accepted_scope
  WHERE accepted_scope.request_id = raw_purge.request_id;
  SELECT jsonb_agg(jsonb_build_object(
    'sealId', seal.id,
    'manifestDigest', seal.manifest_digest
  ) ORDER BY seal.id)
  INTO seal_digests_before
  FROM public.build_request_delivery_seals AS seal
  WHERE seal.request_id = raw_purge.request_id;
  IF accepted_digest_before IS NULL
    OR seal_digests_before IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_accepted_clarification_sets AS accepted_scope
      WHERE accepted_scope.request_id = raw_purge.request_id
        AND NOT accepted_scope.accepted_clarifications_redacted
        AND accepted_scope.accepted_clarifications_redacted_at IS NULL
        AND accepted_scope.accepted_clarification_count = 1
        AND accepted_scope.accepted_clarifications = (
          SELECT jsonb_agg(jsonb_build_object(
            'clarificationId', clarification.id,
            'sequence', clarification.sequence,
            'question', clarification.question,
            'answer', clarification.answer
          ) ORDER BY clarification.sequence, clarification.id)
          FROM public.build_request_clarifications AS clarification
          WHERE clarification.request_id = raw_purge.request_id
        )
        AND accepted_scope.accepted_clarification_digest = encode(
          public.digest(convert_to(
            private.request_canonical_json_v1(
              accepted_scope.accepted_clarifications
            ),
            'UTF8'
          ), 'sha256'),
          'hex'
        )
    ) THEN
    RAISE EXCEPTION
      'Pre-purge clarification source, snapshot, digest, or seal did not reconcile.';
  END IF;

  SELECT jsonb_build_object(
    'request', (
      SELECT to_jsonb(r) - ARRAY[
        'close_explanation', 'resolution_reference', 'raw_text_purged_at',
        'audit_tombstone_until'
      ] FROM public.build_requests AS r WHERE r.id = raw_purge.request_id
    ),
    'briefs', (
      SELECT jsonb_agg(
        to_jsonb(b) - ARRAY[
          'title', 'outcome', 'intended_user', 'must_work_scenario',
          'constraints', 'pathforge_reference'
        ] ORDER BY b.id
      ) FROM public.build_request_brief_revisions AS b
      WHERE b.request_id = raw_purge.request_id
    ),
    'checks', (
      SELECT jsonb_agg(to_jsonb(c) - 'check_text' ORDER BY c.id)
      FROM public.build_request_acceptance_checks AS c
      WHERE c.request_id = raw_purge.request_id
    ),
    'clarifications', (
      SELECT jsonb_agg(to_jsonb(c) - ARRAY['question', 'answer'] ORDER BY c.id)
      FROM public.build_request_clarifications AS c
      WHERE c.request_id = raw_purge.request_id
    ),
    'acceptedClarificationSets', (
      SELECT jsonb_agg(
        to_jsonb(c) - ARRAY[
          'accepted_clarifications',
          'accepted_clarifications_redacted',
          'accepted_clarifications_redacted_at'
        ]
        ORDER BY c.brief_revision_id
      )
      FROM public.build_request_accepted_clarification_sets AS c
      WHERE c.request_id = raw_purge.request_id
    ),
    'revisions', (
      SELECT jsonb_agg(
        to_jsonb(d) - ARRAY[
          'revision_label', 'summary', 'approved_pathforge_reference'
        ] ORDER BY d.id
      ) FROM public.build_request_delivery_revisions AS d
      WHERE d.request_id = raw_purge.request_id
    ),
    'builderEvidence', (
      SELECT jsonb_agg(
        to_jsonb(e) - ARRAY['evidence_text', 'evidence_ref'] ORDER BY e.id
      ) FROM public.build_request_builder_evidence AS e
      WHERE e.request_id = raw_purge.request_id
    ),
    'artifacts', (
      SELECT jsonb_agg(
        to_jsonb(a) - ARRAY['client_file_id', 'normalized_name'] ORDER BY a.id
      ) FROM public.build_request_delivery_artifacts AS a
      WHERE a.request_id = raw_purge.request_id
    ),
    'reviews', (
      SELECT jsonb_agg(
        to_jsonb(v) - ARRAY[
          'reason', 'review_notes', 'repair_instructions'
        ] ORDER BY v.id
      ) FROM public.build_request_delivery_reviews AS v
      WHERE v.request_id = raw_purge.request_id
    ),
    'reviewChecks', (
      SELECT jsonb_agg(to_jsonb(c) - 'evidence_ref' ORDER BY c.id)
      FROM public.build_request_delivery_review_checks AS c
      WHERE c.request_id = raw_purge.request_id
    ),
    'requesterOutcomes', (
      SELECT jsonb_agg(to_jsonb(o) - 'reason' ORDER BY o.id)
      FROM public.build_request_requester_outcomes AS o
      WHERE o.request_id = raw_purge.request_id
    ),
    'events', (
      SELECT jsonb_agg(
        to_jsonb(e) - ARRAY['safe_metadata', 'redactable_reason']
        ORDER BY e.id
      )
      FROM public.build_request_events AS e
      WHERE e.request_id = raw_purge.request_id
    ),
    'holds', (
      SELECT jsonb_agg(
        to_jsonb(h) - ARRAY['reason', 'release_resolution'] ORDER BY h.id
      ) FROM public.build_request_retention_holds AS h
      WHERE h.request_id = raw_purge.request_id
    ),
    'seals', (
      SELECT jsonb_agg(
        to_jsonb(s) - ARRAY[
          'canonical_manifest', 'canonical_manifest_redacted',
          'canonical_manifest_redacted_at'
        ] ORDER BY s.id
      ) FROM public.build_request_delivery_seals AS s
      WHERE s.request_id = raw_purge.request_id
    )
  ) INTO authority_before;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  result := public.purge_build_request_raw_text_v1(1, request_id);
  IF result->>'requestId' <> request_id::TEXT
    OR (result->>'replayed')::BOOLEAN
    OR result->>'purgedAt' IS NULL
    OR result->>'auditTombstoneUntil' IS NULL THEN
    RAISE EXCEPTION 'Eligible day-91 raw-text purge returned an invalid receipt.';
  END IF;
  result := public.purge_build_request_raw_text_v1(1, request_id);
  IF NOT (result->>'replayed')::BOOLEAN THEN
    RAISE EXCEPTION 'Repeated raw-text purge did not replay its original result.';
  END IF;

  SELECT jsonb_build_object(
    'request', (
      SELECT to_jsonb(r) - ARRAY[
        'close_explanation', 'resolution_reference', 'raw_text_purged_at',
        'audit_tombstone_until'
      ] FROM public.build_requests AS r WHERE r.id = raw_purge.request_id
    ),
    'briefs', (
      SELECT jsonb_agg(
        to_jsonb(b) - ARRAY[
          'title', 'outcome', 'intended_user', 'must_work_scenario',
          'constraints', 'pathforge_reference'
        ] ORDER BY b.id
      ) FROM public.build_request_brief_revisions AS b
      WHERE b.request_id = raw_purge.request_id
    ),
    'checks', (
      SELECT jsonb_agg(to_jsonb(c) - 'check_text' ORDER BY c.id)
      FROM public.build_request_acceptance_checks AS c
      WHERE c.request_id = raw_purge.request_id
    ),
    'clarifications', (
      SELECT jsonb_agg(to_jsonb(c) - ARRAY['question', 'answer'] ORDER BY c.id)
      FROM public.build_request_clarifications AS c
      WHERE c.request_id = raw_purge.request_id
    ),
    'acceptedClarificationSets', (
      SELECT jsonb_agg(
        to_jsonb(c) - ARRAY[
          'accepted_clarifications',
          'accepted_clarifications_redacted',
          'accepted_clarifications_redacted_at'
        ]
        ORDER BY c.brief_revision_id
      )
      FROM public.build_request_accepted_clarification_sets AS c
      WHERE c.request_id = raw_purge.request_id
    ),
    'revisions', (
      SELECT jsonb_agg(
        to_jsonb(d) - ARRAY[
          'revision_label', 'summary', 'approved_pathforge_reference'
        ] ORDER BY d.id
      ) FROM public.build_request_delivery_revisions AS d
      WHERE d.request_id = raw_purge.request_id
    ),
    'builderEvidence', (
      SELECT jsonb_agg(
        to_jsonb(e) - ARRAY['evidence_text', 'evidence_ref'] ORDER BY e.id
      ) FROM public.build_request_builder_evidence AS e
      WHERE e.request_id = raw_purge.request_id
    ),
    'artifacts', (
      SELECT jsonb_agg(
        to_jsonb(a) - ARRAY['client_file_id', 'normalized_name'] ORDER BY a.id
      ) FROM public.build_request_delivery_artifacts AS a
      WHERE a.request_id = raw_purge.request_id
    ),
    'reviews', (
      SELECT jsonb_agg(
        to_jsonb(v) - ARRAY[
          'reason', 'review_notes', 'repair_instructions'
        ] ORDER BY v.id
      ) FROM public.build_request_delivery_reviews AS v
      WHERE v.request_id = raw_purge.request_id
    ),
    'reviewChecks', (
      SELECT jsonb_agg(to_jsonb(c) - 'evidence_ref' ORDER BY c.id)
      FROM public.build_request_delivery_review_checks AS c
      WHERE c.request_id = raw_purge.request_id
    ),
    'requesterOutcomes', (
      SELECT jsonb_agg(to_jsonb(o) - 'reason' ORDER BY o.id)
      FROM public.build_request_requester_outcomes AS o
      WHERE o.request_id = raw_purge.request_id
    ),
    'events', (
      SELECT jsonb_agg(
        to_jsonb(e) - ARRAY['safe_metadata', 'redactable_reason']
        ORDER BY e.id
      )
      FROM public.build_request_events AS e
      WHERE e.request_id = raw_purge.request_id
    ),
    'holds', (
      SELECT jsonb_agg(
        to_jsonb(h) - ARRAY['reason', 'release_resolution'] ORDER BY h.id
      ) FROM public.build_request_retention_holds AS h
      WHERE h.request_id = raw_purge.request_id
    ),
    'seals', (
      SELECT jsonb_agg(
        to_jsonb(s) - ARRAY[
          'canonical_manifest', 'canonical_manifest_redacted',
          'canonical_manifest_redacted_at'
        ] ORDER BY s.id
      ) FROM public.build_request_delivery_seals AS s
      WHERE s.request_id = raw_purge.request_id
    )
  ) INTO authority_after;
  IF authority_after IS DISTINCT FROM authority_before THEN
    RAISE EXCEPTION
      'Raw-text purge changed IDs, digests, state, bindings, counts, or reviews.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.build_request_delivery_seals AS seal
    WHERE seal.request_id = raw_purge.request_id
      AND seal.canonical_manifest IS NULL
      AND seal.canonical_manifest_redacted
      AND seal.canonical_manifest_redacted_at IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM public.build_request_brief_revisions AS brief
    WHERE brief.request_id = raw_purge.request_id
      AND (
        brief.title <> '[purged request title]'
        OR brief.outcome <> '[purged request outcome text]'
        OR brief.pathforge_reference IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'Raw-text purge did not redact only its whitelisted fields.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_accepted_clarification_sets AS accepted_scope
    WHERE accepted_scope.request_id = raw_purge.request_id
      AND accepted_scope.accepted_clarification_count = 1
      AND accepted_scope.accepted_clarification_digest =
        accepted_digest_before
      AND accepted_scope.clarification_acceptance_cutoff =
        acceptance_cutoff_before
      AND accepted_scope.accepted_clarifications_redacted
      AND accepted_scope.accepted_clarifications_redacted_at =
        (result->>'purgedAt')::TIMESTAMPTZ
      AND accepted_scope.accepted_clarifications =
        jsonb_build_array(jsonb_build_object(
          'clarificationId',
            accepted_scope.accepted_clarifications->0->>'clarificationId',
          'sequence', 1,
          'question', '[purged clarification]',
          'answer', '[purged answer]'
        ))
  ) THEN
    RAISE EXCEPTION
      'Raw-text purge lost the clarification count, digest, cutoff, or shell.';
  END IF;
  IF (
    SELECT jsonb_agg(jsonb_build_object(
      'sealId', seal.id,
      'manifestDigest', seal.manifest_digest
    ) ORDER BY seal.id)
    FROM public.build_request_delivery_seals AS seal
    WHERE seal.request_id = raw_purge.request_id
  ) IS DISTINCT FROM seal_digests_before
    OR EXISTS (
      SELECT 1
      FROM public.build_request_delivery_seals AS seal
      WHERE seal.request_id = raw_purge.request_id
        AND (
          NOT seal.canonical_manifest_redacted
          OR seal.canonical_manifest_redacted_at <>
            (result->>'purgedAt')::TIMESTAMPTZ
        )
    ) THEN
    RAISE EXCEPTION
      'Raw-text purge changed the seal digest or lost its redaction marker.';
  END IF;
  IF (
    SELECT count(*)
    FROM public.build_request_requester_outcomes AS outcome
    WHERE outcome.request_id = raw_purge.request_id
      AND outcome.outcome = 'failed_acceptance_check'
      AND outcome.reason IS NULL
      AND outcome.reason_digest ~ '^[0-9a-f]{64}$'
      AND outcome.acceptance_check_id IS NOT NULL
      AND outcome.brief_revision_id IS NOT NULL
      AND outcome.delivery_revision_id IS NOT NULL
  ) <> 2 THEN
    RAISE EXCEPTION
      'Post-purge requester failures lost categorical bindings or keyed digests.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_events AS event_value
    WHERE event_value.request_id = raw_purge.request_id
      AND event_value.event_kind = 'requester_delivery_outcome'
      AND (
        event_value.redactable_reason IS NOT NULL
        OR event_value.safe_metadata ? 'reason'
        OR event_value.safe_metadata - ARRAY[
          'outcome', 'acceptanceCheckId'
        ] <> '{}'::JSONB
      )
  ) THEN
    RAISE EXCEPTION
      'Post-purge requester outcome event retained free text or unsafe metadata.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_events AS event_value
    WHERE event_value.request_id = raw_purge.request_id
      AND to_jsonb(event_value)::TEXT LIKE
        '%The repaired fixture still failed the accepted check.%'
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_requester_outcomes AS outcome
    WHERE outcome.request_id = raw_purge.request_id
      AND to_jsonb(outcome)::TEXT LIKE
        '%The offline fixture did not preserve the required state.%'
  ) THEN
    RAISE EXCEPTION
      'Raw requester failure marker survived the day-91 purge.';
  END IF;

  -- No caller, including the table owner, may bypass the aggregate cleanup
  -- authority by deleting the root or one append-only child directly.
  BEGIN
    DELETE FROM public.build_request_events
    WHERE request_id = raw_purge.request_id;
    RAISE EXCEPTION 'Direct event graph deletion succeeded.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Direct event graph deletion succeeded.' THEN RAISE; END IF;
  END;
  BEGIN
    DELETE FROM public.build_requests
    WHERE id = raw_purge.request_id;
    RAISE EXCEPTION 'Direct request-root deletion succeeded.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Direct request-root deletion succeeded.' THEN RAISE; END IF;
  END;

  request_digest :=
    private.request_pseudonym_text_v1(raw_purge.request_id::TEXT);
  PERFORM set_config('request_authority.audit_cleanup', 'on', TRUE);
  PERFORM set_config(
    'request_authority.audit_cleanup_request_id',
    raw_purge.request_id::TEXT,
    TRUE
  );
  PERFORM set_config(
    'request_authority.audit_cleanup_request_digest',
    request_digest,
    TRUE
  );
  BEGIN
    DELETE FROM public.build_request_events
    WHERE request_id = raw_purge.request_id;
    RAISE EXCEPTION
      'Spoofed cleanup GUCs bypassed tombstone/receipt authority.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM =
      'Spoofed cleanup GUCs bypassed tombstone/receipt authority.' THEN
      RAISE;
    END IF;
  END;
  PERFORM set_config('request_authority.audit_cleanup', 'off', TRUE);
  PERFORM set_config(
    'request_authority.audit_cleanup_request_id', '', TRUE
  );
  PERFORM set_config(
    'request_authority.audit_cleanup_request_digest', '', TRUE
  );
  UPDATE public.build_requests
  SET terminal_at = clock_timestamp() - INTERVAL '399 days',
      audit_tombstone_until = clock_timestamp() + INTERVAL '1 day'
  WHERE id = raw_purge.request_id;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  cleanup_result := public.expire_build_request_audit_tombstone_v1(
    1,
    raw_purge.request_id,
    'raw-purge-day399-' || terminal_mode
  );
  IF (cleanup_result->>'cleaned')::BOOLEAN
    OR NOT EXISTS (
      SELECT 1 FROM public.build_requests
      WHERE id = raw_purge.request_id
    ) THEN
    RAISE EXCEPTION 'Day-399 aggregate cleanup was not denied.';
  END IF;

  SELECT version INTO request_version
  FROM public.build_requests
  WHERE id = raw_purge.request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1,
    raw_purge.request_id,
    request_version,
    'raw-purge-cleanup-hold-' || terminal_mode,
    'place_moderation_hold',
    jsonb_build_object('reason', 'Aggregate cleanup hold fixture')
  );
  UPDATE public.build_requests
  SET terminal_at = clock_timestamp() - INTERVAL '401 days',
      audit_tombstone_until = clock_timestamp() - INTERVAL '1 day'
  WHERE id = raw_purge.request_id;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  cleanup_result := public.expire_build_request_audit_tombstone_v1(
    1,
    raw_purge.request_id,
    'raw-purge-held-cleanup-' || terminal_mode
  );
  IF (cleanup_result->>'cleaned')::BOOLEAN THEN
    RAISE EXCEPTION 'Aggregate cleanup bypassed an active hold.';
  END IF;
  SELECT version INTO request_version
  FROM public.build_requests
  WHERE id = raw_purge.request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.build_request_command_v1(
    1,
    raw_purge.request_id,
    request_version,
    'raw-purge-cleanup-release-' || terminal_mode,
    'release_moderation_hold',
    jsonb_build_object('resolution', 'Aggregate cleanup hold released')
  );

  CREATE TEMP TABLE test_raw_purge_cleanup_claims (
    artifact_id UUID PRIMARY KEY,
    delivery_revision_id UUID NOT NULL,
    cleanup_claim_id UUID NOT NULL,
    claim_version INTEGER NOT NULL
  ) ON COMMIT DROP;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  FOR artifact_row IN
    SELECT artifact.id, artifact.delivery_revision_id
    FROM public.build_request_delivery_artifacts AS artifact
    WHERE artifact.request_id = raw_purge.request_id
  LOOP
    cleanup_claim :=
      public.claim_build_request_delivery_artifact_cleanup_v1(
        1,
        raw_purge.request_id,
        artifact_row.delivery_revision_id,
        artifact_row.id,
        'raw-purge-artifact-claim-' || terminal_mode || '-' ||
          artifact_row.id::TEXT
      );
    PERFORM public.begin_build_request_delivery_artifact_cleanup_delete_v1(
      1,
      (cleanup_claim->>'cleanupClaimId')::UUID,
      (cleanup_claim->>'claimVersion')::INTEGER,
      'raw-purge-artifact-delete-start-' || terminal_mode || '-' ||
        artifact_row.id::TEXT
    );
    INSERT INTO test_raw_purge_cleanup_claims (
      artifact_id, delivery_revision_id, cleanup_claim_id, claim_version
    ) VALUES (
      artifact_row.id,
      artifact_row.delivery_revision_id,
      (cleanup_claim->>'cleanupClaimId')::UUID,
      (cleanup_claim->>'claimVersion')::INTEGER
    );
  END LOOP;
  DELETE FROM storage.objects AS stored_object
  USING public.build_request_delivery_artifacts AS artifact
  WHERE artifact.request_id = raw_purge.request_id
    AND stored_object.bucket_id = 'request-build-deliveries'
    AND stored_object.name IN (
      artifact.staging_identity, artifact.object_identity
    );
  IF EXISTS (
    SELECT 1
    FROM storage.objects AS stored_object
    JOIN public.build_request_delivery_artifacts AS artifact
      ON stored_object.name IN (
        artifact.staging_identity, artifact.object_identity
      )
    WHERE artifact.request_id = raw_purge.request_id
      AND stored_object.bucket_id = 'request-build-deliveries'
  ) THEN
    RAISE EXCEPTION 'Artifact object cleanup fixture left retained objects.';
  END IF;
  PERFORM public.confirm_build_request_delivery_artifact_cleanup_v1(
    1,
    raw_purge.request_id,
    artifact_claim.delivery_revision_id,
    artifact_claim.artifact_id,
    artifact_claim.cleanup_claim_id,
    artifact_claim.claim_version,
    'raw-purge-artifact-cleanup-' || terminal_mode || '-' ||
      artifact_claim.artifact_id::TEXT
  )
  FROM test_raw_purge_cleanup_claims AS artifact_claim;

  BEGIN
    PERFORM public.expire_build_request_audit_tombstone_v1(
      1,
      raw_purge.request_id,
      'raw-purge-late-failure-' || terminal_mode
    );
    RAISE EXCEPTION 'Injected aggregate cleanup late failure did not fire.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Injected aggregate cleanup late failure did not fire.'
      OR SQLERRM <> 'injected_request_audit_cleanup_late_failure' THEN
      RAISE;
    END IF;
  END;
  IF NOT EXISTS (
    SELECT 1 FROM public.build_requests
    WHERE id = raw_purge.request_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_audit_tombstones AS tombstone
    WHERE tombstone.request_digest = raw_purge.request_digest
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_audit_cleanup_receipts AS receipt
    WHERE receipt.idempotency_key =
      'raw-purge-late-failure-' || terminal_mode
  ) THEN
    RAISE EXCEPTION
      'Late aggregate-cleanup failure did not roll back atomically.';
  END IF;

  cleanup_result := public.expire_build_request_audit_tombstone_v1(
    1,
    raw_purge.request_id,
    'raw-purge-final-cleanup-' || terminal_mode
  );
  IF cleanup_result <> jsonb_build_object(
      'contractVersion', 1,
      'requestId', raw_purge.request_id,
      'cleaned', TRUE,
      'replayed', FALSE,
      'aggregateDigest', cleanup_result->'aggregateDigest',
      'occurredAt', cleanup_result->'occurredAt'
    )
    OR cleanup_result->>'aggregateDigest' !~ '^[0-9a-f]{64}$'
    OR EXISTS (
      SELECT 1 FROM public.build_requests
      WHERE id = raw_purge.request_id
    )
    OR (
      SELECT count(*)
      FROM public.build_request_audit_tombstones AS tombstone
      WHERE tombstone.request_digest = raw_purge.request_digest
        AND tombstone.aggregate_digest =
          cleanup_result->>'aggregateDigest'
    ) <> 1 THEN
    RAISE EXCEPTION
      'Day-401 cleanup did not leave the exact aggregate tombstone.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_events AS event_value
    WHERE event_value.request_id = raw_purge.request_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_delivery_reviews AS review
    WHERE review.request_id = raw_purge.request_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_delivery_review_checks AS review_check
    WHERE review_check.request_id = raw_purge.request_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_builder_evidence AS evidence
    WHERE evidence.request_id = raw_purge.request_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_requester_outcomes AS outcome
    WHERE outcome.request_id = raw_purge.request_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_delivery_seals AS seal
    WHERE seal.request_id = raw_purge.request_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_artifact_attestations AS attestation
    WHERE attestation.request_id = raw_purge.request_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_command_receipts AS receipt
    WHERE receipt.request_id = raw_purge.request_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_outbox AS outbox
    WHERE outbox.request_id = raw_purge.request_id
  ) THEN
    RAISE EXCEPTION
      'Day-401 root cleanup left relational case-graph rows.';
  END IF;
  SET CONSTRAINTS ALL IMMEDIATE;
END;
$test$;
