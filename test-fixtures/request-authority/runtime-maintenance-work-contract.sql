\set ON_ERROR_STOP on

CREATE TABLE public.test_request_maintenance_bridge (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  payload JSONB NOT NULL
);

DO $test$
<<maintenance>>
DECLARE
  day_89 UUID := '8b000000-0000-4000-8000-000000000001';
  day_91 UUID := '8b000000-0000-4000-8000-000000000002';
  held_91 UUID := '8b000000-0000-4000-8000-000000000003';
  removed_91 UUID := '8b000000-0000-4000-8000-000000000004';
  removed_held_91 UUID := '8b000000-0000-4000-8000-000000000005';
  day_401 UUID := '8b000000-0000-4000-8000-000000000006';
  held_401 UUID := '8b000000-0000-4000-8000-000000000007';
  deidentification_receipt_due UUID :=
    '8b000000-0000-4000-8000-000000000008';
  deidentification_receipt_future UUID :=
    '8b000000-0000-4000-8000-000000000009';
  artifact_request_id UUID;
  first_artifact_id UUID;
  first_revision_id UUID;
  second_artifact_id UUID;
  second_revision_id UUID;
  retirement_revision_id UUID := gen_random_uuid();
  first_object_identity TEXT;
  second_object_identity TEXT;
  first_page JSONB;
  first_page_replay JSONB;
  page_result JSONB;
  page_cursor TEXT;
  paged_items JSONB := '[]'::JSONB;
  page_count INTEGER := 0;
  all_work JSONB;
  confirmation JSONB;
  confirmation_replay JSONB;
  reappeared_confirmation JSONB;
  first_cleanup_receipt_id UUID;
  cleanup_claim JSONB;
  cleanup_claim_replay JSONB;
  stale_cleanup_claim JSONB;
  cleanup_abort JSONB;
  cleanup_abort_replay JSONB;
  command_receipt RECORD;
  request_version INTEGER;
  purge_result JSONB;
  purge_replay JSONB;
  expiry_result JSONB;
  expiry_replay JSONB;
  deidentification_due_at TIMESTAMPTZ :=
    clock_timestamp() - INTERVAL '401 days';
  deidentification_future_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);

  INSERT INTO public.build_requests (
    id, requester_display_name, lifecycle_state, moderation_state,
    publication_state, close_reason, close_explanation, terminal_at,
    raw_text_purged_at, audit_tombstone_until
  ) VALUES
    (
      day_89, 'Day 89 maintenance fixture', 'closed', 'clear',
      'withdrawn', 'declined', 'Maintenance fixture closed.',
      clock_timestamp() - INTERVAL '89 days', NULL, NULL
    ),
    (
      day_91, 'Day 91 maintenance fixture', 'closed', 'clear',
      'withdrawn', 'declined', 'Maintenance fixture closed.',
      clock_timestamp() - INTERVAL '91 days', NULL, NULL
    ),
    (
      held_91, 'Held day 91 maintenance fixture', 'closed', 'held',
      'withdrawn', 'declined', 'Maintenance fixture closed.',
      clock_timestamp() - INTERVAL '91 days', NULL, NULL
    ),
    (
      removed_91, 'Removed day 91 maintenance fixture', 'closed', 'removed',
      'withdrawn', 'safety_removed', NULL,
      clock_timestamp() - INTERVAL '91 days', NULL, NULL
    ),
    (
      removed_held_91, 'Removed held maintenance fixture', 'closed', 'removed',
      'withdrawn', 'safety_removed', NULL,
      clock_timestamp() - INTERVAL '91 days', NULL, NULL
    ),
    (
      day_401, 'Day 401 maintenance fixture', 'closed', 'clear',
      'withdrawn', 'declined', 'Maintenance fixture closed.',
      clock_timestamp() - INTERVAL '401 days',
      clock_timestamp() - INTERVAL '310 days',
      clock_timestamp() - INTERVAL '1 day'
    ),
    (
      held_401, 'Held day 401 maintenance fixture', 'closed', 'clear',
      'withdrawn', 'declined', 'Maintenance fixture closed.',
      clock_timestamp() - INTERVAL '401 days',
      clock_timestamp() - INTERVAL '310 days',
      clock_timestamp() - INTERVAL '1 day'
    );

  INSERT INTO public.build_request_retention_holds (
    request_id, hold_kind, reason
  ) VALUES
    (removed_held_91, 'legal', 'Active removed-case preservation fixture.'),
    (held_401, 'safety', 'Active audit preservation fixture.');
  INSERT INTO public.build_request_account_deidentification_receipts (
    id, actor_digest, idempotency_key, request_hash, subject_digest,
    affected_case_count, terminalized_case_count, admission_revoked,
    occurred_at, expires_at
  ) VALUES
    (
      deidentification_receipt_due, repeat('a', 64),
      'maintenance-deid-receipt-due', repeat('b', 64), repeat('c', 64),
      0, 0, FALSE,
      deidentification_due_at,
      deidentification_due_at + INTERVAL '400 days'
    ),
    (
      deidentification_receipt_future, repeat('d', 64),
      'maintenance-deid-receipt-future', repeat('e', 64), repeat('f', 64),
      0, 0, FALSE,
      deidentification_future_at,
      deidentification_future_at + INTERVAL '400 days'
    );

  SELECT request_case.id
  INTO artifact_request_id
  FROM public.build_requests AS request_case
  WHERE EXISTS (
    SELECT 1
    FROM public.build_request_delivery_artifacts AS artifact
    WHERE artifact.request_id = request_case.id
  )
  ORDER BY request_case.submitted_at
  LIMIT 1;
  IF artifact_request_id IS NULL THEN
    RAISE EXCEPTION 'Maintenance artifact prerequisite was not created.';
  END IF;
  UPDATE public.build_requests
  SET lifecycle_state = 'closed',
      close_reason = 'failed_review',
      close_explanation = 'Closed after review exhaustion.',
      moderation_state = 'clear',
      publication_state = 'withdrawn',
      terminal_at = clock_timestamp() - INTERVAL '91 days',
      raw_text_purged_at = clock_timestamp(),
      audit_tombstone_until = clock_timestamp() + INTERVAL '309 days'
  WHERE id = artifact_request_id;
  DELETE FROM public.build_request_retention_holds
  WHERE request_id = artifact_request_id;
  INSERT INTO public.build_request_delivery_revisions (
    id, request_id, revision_state, accepted_brief_revision_id,
    builder_assignment_id, builder_role, authored_by,
    authored_by_display_name, authored_by_deidentified
  )
  SELECT retirement_revision_id, existing_revision.request_id, 'staging',
    existing_revision.accepted_brief_revision_id,
    existing_revision.builder_assignment_id, existing_revision.builder_role,
    existing_revision.authored_by, existing_revision.authored_by_display_name,
    existing_revision.authored_by_deidentified
  FROM public.build_request_delivery_revisions AS existing_revision
  WHERE existing_revision.request_id = artifact_request_id
  ORDER BY existing_revision.revision_number NULLS LAST
  LIMIT 1;
  UPDATE public.build_requests
  SET audit_tombstone_until = clock_timestamp() - INTERVAL '1 day'
  WHERE id = artifact_request_id;

  SELECT artifact.id, artifact.delivery_revision_id,
    artifact.staging_identity
  INTO first_artifact_id, first_revision_id, first_object_identity
  FROM public.build_request_delivery_artifacts AS artifact
  WHERE artifact.request_id = artifact_request_id
  ORDER BY artifact.id
  LIMIT 1;
  SELECT artifact.id, artifact.delivery_revision_id,
    artifact.staging_identity
  INTO second_artifact_id, second_revision_id, second_object_identity
  FROM public.build_request_delivery_artifacts AS artifact
  WHERE artifact.request_id = artifact_request_id
    AND artifact.id <> first_artifact_id
  ORDER BY artifact.id
  LIMIT 1;
  IF first_artifact_id IS NULL OR second_artifact_id IS NULL THEN
    RAISE EXCEPTION 'Maintenance fixture requires two custody artifacts.';
  END IF;

  SELECT public.list_build_request_maintenance_work_v1(1, NULL, 1)
  INTO first_page;
  SELECT public.list_build_request_maintenance_work_v1(1, NULL, 1)
  INTO first_page_replay;
  IF first_page IS DISTINCT FROM first_page_replay
    OR first_page->>'nextCursor' IS NULL THEN
    RAISE EXCEPTION 'Maintenance enumeration replay/cursor is not stable.';
  END IF;
  PERFORM public.list_build_request_maintenance_work_v1(
    1, first_page->>'nextCursor', 1
  );
  BEGIN
    PERFORM public.list_build_request_maintenance_work_v1(
      1, (first_page->>'nextCursor') || 'tampered', 1
    );
    RAISE EXCEPTION 'Tampered maintenance cursor was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Tampered maintenance cursor was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.list_build_request_maintenance_work_v1(1, NULL, NULL);
    RAISE EXCEPTION 'Null maintenance limit was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Null maintenance limit was accepted.' THEN RAISE; END IF;
  END;

  SELECT public.list_build_request_maintenance_work_v1(1, NULL, 100)
  INTO all_work;
  page_cursor := NULL;
  LOOP
    page_result := public.list_build_request_maintenance_work_v1(
      1, page_cursor, 1
    );
    paged_items := COALESCE(paged_items, '[]'::JSONB) ||
      COALESCE(page_result->'items', '[]'::JSONB);
    page_count := page_count + 1;
    IF page_count > 1000 THEN
      RAISE EXCEPTION 'Maintenance cursor pagination did not terminate.';
    END IF;
    page_cursor := page_result->>'nextCursor';
    EXIT WHEN page_cursor IS NULL;
  END LOOP;
  IF paged_items IS DISTINCT FROM all_work->'items' THEN
    RAISE EXCEPTION
      'Maintenance cursor pages skipped, duplicated, or reordered work: paged=%, full=%',
      paged_items, all_work->'items';
  END IF;
  IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(all_work->'items') AS item
      WHERE item->>'category' = 'raw_text_purge'
        AND item->>'requestId' = day_91::TEXT
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(all_work->'items') AS item
      WHERE item->>'category' = 'raw_text_purge'
        AND item->>'requestId' = removed_91::TEXT
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(all_work->'items') AS item
      WHERE item->>'category' = 'audit_tombstone_expiry'
        AND item->>'requestId' = day_401::TEXT
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(all_work->'items') AS item
      WHERE item->>'category' = 'artifact_cleanup'
        AND item->>'requestId' = artifact_request_id::TEXT
        AND item->>'artifactId' = first_artifact_id::TEXT
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(all_work->'items') AS item
      WHERE item->>'category' =
          'account_deidentification_receipt_expiry'
        AND item->>'receiptId' =
          deidentification_receipt_due::TEXT
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(all_work->'items') AS item
      WHERE item->>'category' = 'delivery_revision_retirement'
        AND item->>'requestId' = artifact_request_id::TEXT
        AND item->>'deliveryRevisionId' = retirement_revision_id::TEXT
        AND (item->>'expectedVersion')::INTEGER = (
          SELECT version
          FROM public.build_requests
          WHERE id = artifact_request_id
        )
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(all_work->'items') AS item
      WHERE item->>'category' = 'audit_tombstone_expiry'
        AND item->>'requestId' = artifact_request_id::TEXT
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(all_work->'items') AS item
      WHERE item->>'requestId' IN (
        day_89::TEXT, held_91::TEXT, removed_held_91::TEXT, held_401::TEXT
      )
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(all_work->'items') AS item
      WHERE item->>'receiptId' =
        deidentification_receipt_future::TEXT
    ) THEN
    RAISE EXCEPTION 'Maintenance eligibility categories drifted.';
  END IF;
  INSERT INTO public.test_request_maintenance_bridge (payload)
  VALUES (all_work);

  SELECT version INTO request_version
  FROM public.build_requests
  WHERE id = artifact_request_id;
  PERFORM public.retire_build_request_delivery_revision_v1(
    1, artifact_request_id, retirement_revision_id, request_version,
    'maintenance-retire-revision-0001'
  );
  all_work := public.list_build_request_maintenance_work_v1(1, NULL, 100);
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(all_work->'items') AS item
    WHERE item->>'category' = 'delivery_revision_retirement'
      AND item->>'deliveryRevisionId' = retirement_revision_id::TEXT
  ) THEN
    RAISE EXCEPTION
      'Retired delivery revision remained discoverable.';
  END IF;
  UPDATE public.build_requests
  SET audit_tombstone_until = terminal_at + INTERVAL '400 days'
  WHERE id = artifact_request_id;

  BEGIN
    PERFORM public.purge_build_request_raw_text_v1(1, day_89);
    RAISE EXCEPTION 'Day-89 raw-text purge succeeded.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Day-89 raw-text purge succeeded.' THEN RAISE; END IF;
  END;
  expiry_result :=
    public.expire_build_request_account_deidentification_receipt_v1(
      1, deidentification_receipt_due
    );
  IF expiry_result->>'expired' <> 'true'
    OR EXISTS (
      SELECT 1
      FROM public.build_request_account_deidentification_receipts
      WHERE id = deidentification_receipt_due
    ) THEN
    RAISE EXCEPTION
      'Eligible account-deidentification receipt did not expire: %.',
      expiry_result;
  END IF;
  IF (SELECT raw_text_purged_at FROM public.build_requests WHERE id = day_89)
      IS NOT NULL THEN
    RAISE EXCEPTION 'Day-89 purge denial left durable residue.';
  END IF;
  purge_result := public.purge_build_request_raw_text_v1(1, removed_91);
  purge_replay := public.purge_build_request_raw_text_v1(1, removed_91);
  IF purge_result->>'replayed' <> 'false'
    OR purge_replay->>'replayed' <> 'true'
    OR purge_result->>'purgedAt' IS DISTINCT FROM purge_replay->>'purgedAt'
    OR purge_result->>'auditTombstoneUntil' IS DISTINCT FROM
      purge_replay->>'auditTombstoneUntil' THEN
    RAISE EXCEPTION 'Removed day-91 raw purge/replay drifted.';
  END IF;

  -- A claim is the preservation fence spanning external object deletion.
  cleanup_claim :=
    public.claim_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      'maintenance-claim-artifact-0001'
    );
  cleanup_claim_replay :=
    public.claim_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      'maintenance-claim-artifact-0001'
    );
  IF cleanup_claim->>'replayed' <> 'false'
    OR cleanup_claim_replay->>'replayed' <> 'true'
    OR cleanup_claim->>'cleanupClaimId' IS DISTINCT FROM
      cleanup_claim_replay->>'cleanupClaimId'
    OR cleanup_claim->>'claimVersion' IS DISTINCT FROM
      cleanup_claim_replay->>'claimVersion' THEN
    RAISE EXCEPTION 'Artifact cleanup claim replay drifted.';
  END IF;
  BEGIN
    PERFORM public.confirm_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      (cleanup_claim->>'cleanupClaimId')::UUID,
      (cleanup_claim->>'claimVersion')::INTEGER,
      'maintenance-confirm-object-present'
    );
    RAISE EXCEPTION 'Existing artifact object was confirmed as removed.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Existing artifact object was confirmed as removed.' THEN
        RAISE;
      END IF;
  END;

  -- An unresolved claim blocks a new moderation hold even after its worker
  -- lease expires. Aborting is allowed only while the exact object exists.
  SELECT version INTO request_version
  FROM public.build_requests
  WHERE id = artifact_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', '82000000-0000-4000-8000-000000000007'::UUID,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.build_request_command_v1(
      1, artifact_request_id, request_version,
      'maintenance-hold-during-claim-0001',
      'place_moderation_hold',
      jsonb_build_object('reason', 'Preserve the cleanup-race fixture.')
    );
    RAISE EXCEPTION 'Moderation hold coexisted with an unresolved cleanup claim.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM =
      'Moderation hold coexisted with an unresolved cleanup claim.' THEN
      RAISE;
    END IF;
  END;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  cleanup_abort :=
    public.abort_build_request_delivery_artifact_cleanup_v1(
      1,
      (cleanup_claim->>'cleanupClaimId')::UUID,
      (cleanup_claim->>'claimVersion')::INTEGER,
      'maintenance-abort-artifact-0001'
    );
  cleanup_abort_replay :=
    public.abort_build_request_delivery_artifact_cleanup_v1(
      1,
      (cleanup_claim->>'cleanupClaimId')::UUID,
      (cleanup_claim->>'claimVersion')::INTEGER,
      'maintenance-abort-artifact-0001'
    );
  IF cleanup_abort->>'replayed' <> 'false'
    OR cleanup_abort_replay->>'replayed' <> 'true'
    OR cleanup_abort->>'abortedAt' IS DISTINCT FROM
      cleanup_abort_replay->>'abortedAt' THEN
    RAISE EXCEPTION 'Artifact cleanup abort replay drifted.';
  END IF;

  UPDATE public.build_requests
  SET terminal_at = clock_timestamp() - INTERVAL '89 days'
  WHERE id = artifact_request_id;
  BEGIN
    PERFORM public.claim_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      'maintenance-claim-day89'
    );
    RAISE EXCEPTION 'Day-89 artifact cleanup was claimed.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Day-89 artifact cleanup was claimed.' THEN RAISE; END IF;
  END;
  UPDATE public.build_requests
  SET terminal_at = clock_timestamp() - INTERVAL '91 days'
  WHERE id = artifact_request_id;

  cleanup_claim :=
    public.claim_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      'maintenance-claim-artifact-0001'
    );
  stale_cleanup_claim := cleanup_claim;
  PERFORM public.begin_build_request_delivery_artifact_cleanup_delete_v1(
    1,
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER,
    'maintenance-begin-delete-artifact-0001'
  );
  INSERT INTO public.build_request_retention_holds (
    request_id, hold_kind, reason
  ) VALUES (
    artifact_request_id, 'legal',
    'Late preservation hold after irreversible deletion start.'
  );
  DELETE FROM storage.objects
  WHERE bucket_id = 'request-build-deliveries'
    AND name = first_object_identity;
  UPDATE public.build_requests
  SET audit_tombstone_until = clock_timestamp() - INTERVAL '1 day'
  WHERE id = artifact_request_id;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      public.list_build_request_maintenance_work_v1(1, NULL, 100)->'items'
    ) AS item
    WHERE item->>'category' = 'audit_tombstone_expiry'
      AND item->>'requestId' = artifact_request_id::TEXT
  ) OR (
    public.expire_build_request_audit_tombstone_v1(
      1, artifact_request_id, 'maintenance-expire-during-claim-0001'
    )->>'cleaned'
  )::BOOLEAN THEN
    RAISE EXCEPTION 'Audit expiry ignored an unresolved cleanup claim.';
  END IF;
  UPDATE public.build_requests
  SET audit_tombstone_until = terminal_at + INTERVAL '400 days'
  WHERE id = artifact_request_id;
  UPDATE public.build_request_artifact_cleanup_claims
  SET owner_lease_until = clock_timestamp() - INTERVAL '1 minute'
  WHERE id = (cleanup_claim->>'cleanupClaimId')::UUID;

  -- Crash after deletion: an expired owner lease still blocks a new hold.
  SELECT version INTO request_version
  FROM public.build_requests
  WHERE id = artifact_request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', '82000000-0000-4000-8000-000000000007'::UUID,
      'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.build_request_command_v1(
      1, artifact_request_id, request_version,
      'maintenance-hold-expired-claim-0001',
      'place_moderation_hold',
      jsonb_build_object('reason', 'Preserve after worker loss.')
    );
    RAISE EXCEPTION 'Moderation hold coexisted with an expired unresolved claim.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM =
      'Moderation hold coexisted with an expired unresolved claim.' THEN
      RAISE;
    END IF;
  END;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  BEGIN
    PERFORM public.confirm_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      (stale_cleanup_claim->>'cleanupClaimId')::UUID,
      (stale_cleanup_claim->>'claimVersion')::INTEGER,
      'maintenance-expired-confirm-0001'
    );
    RAISE EXCEPTION 'Expired cleanup owner confirmed without takeover.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Expired cleanup owner confirmed without takeover.' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    PERFORM public.abort_build_request_delivery_artifact_cleanup_v1(
      1,
      (stale_cleanup_claim->>'cleanupClaimId')::UUID,
      (stale_cleanup_claim->>'claimVersion')::INTEGER,
      'maintenance-expired-abort-0001'
    );
    RAISE EXCEPTION 'Expired cleanup owner aborted without takeover.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Expired cleanup owner aborted without takeover.' THEN
      RAISE;
    END IF;
  END;
  cleanup_claim :=
    public.claim_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      'maintenance-claim-artifact-0001'
    );
  IF (cleanup_claim->>'claimVersion')::INTEGER <> 2 THEN
    RAISE EXCEPTION
      'Same-key expired cleanup claim takeover did not advance ownership.';
  END IF;
  PERFORM public.begin_build_request_delivery_artifact_cleanup_delete_v1(
    1,
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER,
    'maintenance-continue-delete-artifact-0001'
  );
  BEGIN
    PERFORM public.confirm_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      (stale_cleanup_claim->>'cleanupClaimId')::UUID,
      (stale_cleanup_claim->>'claimVersion')::INTEGER,
      'maintenance-stale-confirm-0001'
    );
    RAISE EXCEPTION 'Stale cleanup owner confirmed after takeover.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Stale cleanup owner confirmed after takeover.'
      OR SQLERRM <> 'Artifact cleanup claim is stale.' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    PERFORM public.abort_build_request_delivery_artifact_cleanup_v1(
      1,
      (stale_cleanup_claim->>'cleanupClaimId')::UUID,
      (stale_cleanup_claim->>'claimVersion')::INTEGER,
      'maintenance-stale-abort-0001'
    );
    RAISE EXCEPTION 'Stale cleanup owner aborted after takeover.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Stale cleanup owner aborted after takeover.'
      OR SQLERRM <> 'Artifact cleanup claim is stale.' THEN
      RAISE;
    END IF;
  END;

  -- A delete-success/confirm-failure retry remains enumerable even though the
  -- physical object is already absent.
  SELECT public.list_build_request_maintenance_work_v1(1, NULL, 100)
  INTO all_work;
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(all_work->'items') AS item
    WHERE item->>'category' = 'artifact_cleanup'
      AND item->>'artifactId' = first_artifact_id::TEXT
  ) THEN
    RAISE EXCEPTION 'Missing unconfirmed object was not re-enumerated.';
  END IF;

  SELECT public.confirm_build_request_delivery_artifact_cleanup_v1(
    1, artifact_request_id, first_revision_id, first_artifact_id,
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER,
    'maintenance-confirm-artifact-0001'
  ) INTO confirmation;
  SELECT public.confirm_build_request_delivery_artifact_cleanup_v1(
    1, artifact_request_id, first_revision_id, first_artifact_id,
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER,
    'maintenance-confirm-artifact-0001'
  ) INTO confirmation_replay;
  IF confirmation->>'replayed' <> 'false'
    OR confirmation_replay->>'replayed' <> 'true'
    OR confirmation->>'cleanupReceiptId' IS DISTINCT FROM
      confirmation_replay->>'cleanupReceiptId'
    OR confirmation->>'cleanedAt' IS DISTINCT FROM
      confirmation_replay->>'cleanedAt' THEN
    RAISE EXCEPTION 'Artifact cleanup confirmation replay drifted.';
  END IF;
  IF confirmation->>'cleanupDisposition' <> 'worker_removed' THEN
    RAISE EXCEPTION 'Worker-removed cleanup disposition drifted.';
  END IF;
  first_cleanup_receipt_id := (confirmation->>'cleanupReceiptId')::UUID;
  UPDATE public.build_request_retention_holds
  SET released_at = clock_timestamp(),
      release_resolution =
        'Deletion had already started; cleanup evidence converged.'
  WHERE request_id = artifact_request_id
    AND hold_kind = 'legal'
    AND reason =
      'Late preservation hold after irreversible deletion start.'
    AND released_at IS NULL;
  BEGIN
    PERFORM public.confirm_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, second_revision_id, second_artifact_id,
      (cleanup_claim->>'cleanupClaimId')::UUID,
      (cleanup_claim->>'claimVersion')::INTEGER,
      'maintenance-confirm-artifact-0001'
    );
    RAISE EXCEPTION 'Cleanup idempotency key accepted a changed artifact.';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;
  INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES (
    'request-build-deliveries',
    first_object_identity,
    '{"fixture":"reappeared-after-confirmation"}'::JSONB
  );
  SELECT public.list_build_request_maintenance_work_v1(1, NULL, 100)
  INTO all_work;
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(all_work->'items') AS item
    WHERE item->>'category' = 'artifact_cleanup'
      AND item->>'artifactId' = first_artifact_id::TEXT
  ) THEN
    RAISE EXCEPTION 'Reappeared confirmed object was not re-enumerated.';
  END IF;
  BEGIN
    PERFORM public.confirm_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      (cleanup_claim->>'cleanupClaimId')::UUID,
      (cleanup_claim->>'claimVersion')::INTEGER,
      'maintenance-confirm-artifact-0001'
    );
    RAISE EXCEPTION 'Cleanup replay ignored a reappeared object.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Cleanup replay ignored a reappeared object.' THEN RAISE; END IF;
  END;
  cleanup_claim :=
    public.claim_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, first_revision_id, first_artifact_id,
      'maintenance-claim-reappeared-0001'
    );
  PERFORM public.begin_build_request_delivery_artifact_cleanup_delete_v1(
    1,
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER,
    'maintenance-begin-delete-reappeared-0001'
  );
  DELETE FROM storage.objects
  WHERE bucket_id = 'request-build-deliveries'
    AND name = first_object_identity;
  SELECT public.confirm_build_request_delivery_artifact_cleanup_v1(
    1, artifact_request_id, first_revision_id, first_artifact_id,
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER,
    'maintenance-confirm-reappeared-0001'
  ) INTO reappeared_confirmation;
  IF reappeared_confirmation->>'replayed' <> 'false'
    OR reappeared_confirmation->>'cleanupDisposition' <> 'worker_removed'
    OR (reappeared_confirmation->>'cleanupReceiptId')::UUID =
      first_cleanup_receipt_id THEN
    RAISE EXCEPTION
      'Reappeared-object cleanup did not create truthful attempt evidence.';
  END IF;
  SELECT public.confirm_build_request_delivery_artifact_cleanup_v1(
    1, artifact_request_id, first_revision_id, first_artifact_id,
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER,
    'maintenance-confirm-reappeared-0001'
  ) INTO confirmation_replay;
  IF confirmation_replay->>'replayed' <> 'true'
    OR confirmation_replay->>'cleanupReceiptId' IS DISTINCT FROM
      reappeared_confirmation->>'cleanupReceiptId'
    OR confirmation_replay->>'cleanupDisposition' <> 'worker_removed' THEN
    RAISE EXCEPTION 'Reappeared-object confirmation replay drifted.';
  END IF;
  INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES (
    'request-build-deliveries',
    first_object_identity,
    '{"fixture":"reappeared-after-worker-removed"}'::JSONB
  );
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      public.list_build_request_maintenance_work_v1(1, NULL, 100)->'items'
    ) AS item
    WHERE item->>'category' = 'artifact_cleanup'
      AND item->>'artifactId' = first_artifact_id::TEXT
  ) THEN
    RAISE EXCEPTION
      'Object reappearance after worker removal was not re-enumerated.';
  END IF;
  DELETE FROM storage.objects
  WHERE bucket_id = 'request-build-deliveries'
    AND name = first_object_identity;

  SELECT public.list_build_request_maintenance_work_v1(1, NULL, 100)
  INTO all_work;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(all_work->'items') AS item
    WHERE item->>'category' = 'artifact_cleanup'
      AND item->>'artifactId' = first_artifact_id::TEXT
  ) THEN
    RAISE EXCEPTION 'Confirmed artifact remained maintenance-eligible.';
  END IF;

  -- A preexisting missing object converges without pretending that this
  -- worker deleted or verified the bytes.
  DELETE FROM storage.objects
  WHERE bucket_id = 'request-build-deliveries'
    AND name = second_object_identity;
  cleanup_claim :=
    public.claim_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, second_revision_id, second_artifact_id,
      'maintenance-claim-preexisting-missing-0001'
    );
  confirmation := public.confirm_build_request_delivery_artifact_cleanup_v1(
    1, artifact_request_id, second_revision_id, second_artifact_id,
    (cleanup_claim->>'cleanupClaimId')::UUID,
    (cleanup_claim->>'claimVersion')::INTEGER,
    'maintenance-confirm-preexisting-missing-0001'
  );
  IF confirmation->>'cleanupDisposition' <> 'preexisting_missing' THEN
    RAISE EXCEPTION 'Preexisting-missing cleanup disposition drifted.';
  END IF;
  INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES (
    'request-build-deliveries', second_object_identity,
    '{"fixture":"held-reappeared-object"}'::JSONB
  );
  INSERT INTO public.build_request_retention_holds (
    request_id, hold_kind, reason
  ) VALUES (
    artifact_request_id, 'legal', 'Confirmation hold fixture.'
  );
  BEGIN
    PERFORM public.claim_build_request_delivery_artifact_cleanup_v1(
      1, artifact_request_id, second_revision_id, second_artifact_id,
      'maintenance-claim-artifact-0002'
    );
    RAISE EXCEPTION 'Noneligible held object cleanup was claimed.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Noneligible held object cleanup was claimed.' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_artifact_cleanup_receipts AS cleanup_receipt
    WHERE cleanup_receipt.artifact_id = second_artifact_id
      AND cleanup_receipt.cleanup_disposition = 'preexisting_missing'
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_artifact_cleanup_claims AS cleanup_claim_row
    WHERE cleanup_claim_row.artifact_id = second_artifact_id
      AND cleanup_claim_row.resolved_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1
    FROM storage.objects AS stored_object
    WHERE stored_object.bucket_id = 'request-build-deliveries'
      AND stored_object.name = second_object_identity
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      public.list_build_request_maintenance_work_v1(1, NULL, 100)->'items'
    ) AS item
    WHERE item->>'category' = 'artifact_cleanup'
      AND item->>'artifactId' = second_artifact_id::TEXT
  ) THEN
    RAISE EXCEPTION
      'Held reappeared object did not preserve its immutable cleanup history.';
  END IF;

  expiry_result := public.expire_build_request_audit_tombstone_v1(
    1, day_401, 'maintenance-expire-day401'
  );
  expiry_replay := public.expire_build_request_audit_tombstone_v1(
    1, day_401, 'maintenance-expire-day401'
  );
  IF expiry_result->>'cleaned' <> 'true'
    OR expiry_result->>'replayed' <> 'false'
    OR expiry_replay->>'cleaned' <> 'true'
    OR expiry_replay->>'replayed' <> 'true'
    OR expiry_result->>'aggregateDigest' IS DISTINCT FROM
      expiry_replay->>'aggregateDigest'
    OR expiry_result->>'occurredAt' IS DISTINCT FROM
      expiry_replay->>'occurredAt'
    OR EXISTS (
      SELECT 1 FROM public.build_requests WHERE id = day_401
    ) THEN
    RAISE EXCEPTION 'Day-401 audit expiry/replay drifted.';
  END IF;
  BEGIN
    PERFORM public.expire_build_request_audit_tombstone_v1(
      1, held_401, 'maintenance-expire-day401'
    );
    RAISE EXCEPTION 'Audit expiry key accepted a changed request.';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;
END;
$test$;

SELECT payload::TEXT
FROM public.test_request_maintenance_bridge
WHERE singleton;

-- Public and participant JWTs cannot enumerate or confirm maintenance work.
DO $test$
DECLARE
  participant UUID := '82000000-0000-4000-8000-000000000001';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
  BEGIN
    PERFORM public.list_build_request_maintenance_work_v1(1, NULL, 10);
    RAISE EXCEPTION 'Anon maintenance enumeration succeeded.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', participant, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.list_build_request_maintenance_work_v1(1, NULL, 10);
    RAISE EXCEPTION 'Authenticated maintenance enumeration succeeded.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
