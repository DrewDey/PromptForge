\set ON_ERROR_STOP on

DO $test$
<<reader_retention>>
DECLARE
  administrator UUID := '82000000-0000-4000-8000-000000000007';
  request_id UUID;
  revision_id UUID;
  artifact_id UUID;
  result JSONB;
  terminal_at TIMESTAMPTZ;
BEGIN
  SELECT request_case.id, request_case.current_delivery_revision_id
  INTO request_id, revision_id
  FROM public.build_requests AS request_case
  WHERE request_case.current_delivery_revision_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.build_request_delivery_reviews AS review
      WHERE review.request_id = request_case.id
        AND review.delivery_revision_id =
          request_case.current_delivery_revision_id
        AND review.verdict = 'approve'
    )
  ORDER BY request_case.submitted_at
  LIMIT 1;
  SELECT artifact.id INTO artifact_id
  FROM public.build_request_delivery_artifacts AS artifact
  WHERE artifact.delivery_revision_id = revision_id
    AND artifact.abandoned_at IS NULL
    AND artifact.integrity_status = 'verified'
    AND artifact.scan_verdict = 'clean'
  ORDER BY artifact.artifact_ordinal
  LIMIT 1;
  IF request_id IS NULL OR revision_id IS NULL OR artifact_id IS NULL THEN
    RAISE EXCEPTION 'Reader retention fixture prerequisites were not created.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );

  -- Work-in-progress/repair artifacts never acquire participant reader links.
  UPDATE public.build_requests
  SET lifecycle_state = 'repair_required',
      close_reason = NULL,
      close_explanation = NULL,
      terminal_at = NULL,
      publication_state = 'private'
  WHERE id = request_id;
  result := public.resolve_build_request_delivery_artifact_v1(1, artifact_id);
  IF result IS DISTINCT FROM jsonb_build_object(
      'status', 'unavailable', 'reason', 'stale_revision'
    )
    OR result ? 'artifact'
    OR result ? 'manifestDigest'
    OR result ? 'objectIdentity' THEN
    RAISE EXCEPTION 'Repair-required reader exposed a delivery link or server authority.';
  END IF;

  terminal_at := clock_timestamp() - INTERVAL '89 days';
  UPDATE public.build_requests
  SET lifecycle_state = 'completed',
      terminal_at = reader_retention.terminal_at,
      moderation_state = 'clear'
  WHERE id = request_id;
  result := public.resolve_build_request_delivery_artifact_v1(1, artifact_id);
  IF result->>'status' <> 'ready'
    OR result->'artifact'->>'deliveryStatus' <> 'completed'
    OR (result->'artifact'->>'accessUntil')::TIMESTAMPTZ
      IS DISTINCT FROM terminal_at + INTERVAL '90 days'
    OR (result->'artifact') ? 'manifestDigest'
    OR (result->'artifact') ? 'objectIdentity' THEN
    RAISE EXCEPTION 'Completed day-89 participant reader contract drifted.';
  END IF;
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES (
    'retention_day89',
    public.get_build_request_v1(1, request_id)
  )
  ON CONFLICT (snapshot_kind) DO UPDATE SET payload = EXCLUDED.payload;

  terminal_at := clock_timestamp() - INTERVAL '91 days';
  UPDATE public.build_requests
  SET terminal_at = reader_retention.terminal_at
  WHERE id = request_id;
  result := public.resolve_build_request_delivery_artifact_v1(1, artifact_id);
  IF result IS DISTINCT FROM jsonb_build_object(
    'status', 'unavailable', 'reason', 'closed'
  ) THEN
    RAISE EXCEPTION 'Completed day-91 participant reader remained available.';
  END IF;
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES (
    'retention_day91',
    public.get_build_request_v1(1, request_id)
  )
  ON CONFLICT (snapshot_kind) DO UPDATE SET payload = EXCLUDED.payload;

  INSERT INTO public.build_request_retention_holds (
    request_id, hold_kind, reason, placed_by
  ) VALUES (
    request_id, 'legal', 'Fixture retention preservation', administrator
  );
  result := public.resolve_build_request_delivery_artifact_v1(1, artifact_id);
  IF result IS DISTINCT FROM jsonb_build_object(
    'status', 'unavailable', 'reason', 'closed'
  ) THEN
    RAISE EXCEPTION 'A retention hold incorrectly restored participant reader access.';
  END IF;
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES (
    'retention_day91_hold',
    public.get_build_request_v1(1, request_id)
  )
  ON CONFLICT (snapshot_kind) DO UPDATE SET payload = EXCLUDED.payload;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('role', 'service_role')::TEXT,
    TRUE
  );
  result := public.resolve_build_request_delivery_artifact_custody_v1(
    1, request_id, revision_id, artifact_id
  );
  IF result->>'retentionState' <> 'preserved_by_hold'
    OR (result->>'accessUntil')::TIMESTAMPTZ
      IS DISTINCT FROM terminal_at + INTERVAL '90 days'
    OR result->>'objectIdentity' IS NULL THEN
    RAISE EXCEPTION 'Service custody retention authority contradicted the active hold.';
  END IF;
  BEGIN
    PERFORM public.resolve_build_request_delivery_artifact_object_v1(
      1, artifact_id, revision_id
    );
    RAISE EXCEPTION 'Held service object resolver returned storage authority.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Held service object resolver returned storage authority.'
      OR SQLSTATE <> 'P0002' THEN
      RAISE;
    END IF;
  END;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  UPDATE public.build_requests
  SET moderation_state = 'held',
      terminal_at = clock_timestamp() - INTERVAL '1 day'
  WHERE id = request_id;
  result := public.resolve_build_request_delivery_artifact_v1(1, artifact_id);
  IF result IS DISTINCT FROM jsonb_build_object(
    'status', 'unavailable', 'reason', 'held'
  ) THEN
    RAISE EXCEPTION 'Moderation-held participant reader did not fail closed.';
  END IF;
  INSERT INTO public.test_request_lifecycle_detail_snapshots
  VALUES (
    'retention_moderation_hold',
    public.get_build_request_v1(1, request_id)
  )
  ON CONFLICT (snapshot_kind) DO UPDATE SET payload = EXCLUDED.payload;

  UPDATE public.build_requests
  SET moderation_state = 'removed'
  WHERE id = request_id;
  result := public.resolve_build_request_delivery_artifact_v1(1, artifact_id);
  IF result IS DISTINCT FROM jsonb_build_object(
    'status', 'unavailable', 'reason', 'removed'
  ) THEN
    RAISE EXCEPTION 'Moderation-removed participant reader did not fail closed.';
  END IF;

  UPDATE public.build_requests
  SET moderation_state = 'clear',
      publication_state = 'withdrawn'
  WHERE id = request_id;
  result := public.resolve_build_request_delivery_artifact_v1(1, artifact_id);
  IF result IS DISTINCT FROM jsonb_build_object(
    'status', 'unavailable', 'reason', 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'Withdrawn participant reader did not fail closed.';
  END IF;

  UPDATE public.build_requests
  SET publication_state = 'private',
      lifecycle_state = 'completed',
      terminal_at = clock_timestamp() - INTERVAL '91 days'
  WHERE id = request_id;
  result := public.resolve_build_request_delivery_artifact_v1(1, artifact_id);
  IF result IS DISTINCT FROM jsonb_build_object(
    'status', 'unavailable', 'reason', 'closed'
  ) THEN
    RAISE EXCEPTION 'Expired participant reader did not fail closed.';
  END IF;
END;
$test$;
