\set ON_ERROR_STOP on

DO $test$
<<deep_deidentify>>
DECLARE
  administrator UUID := '82000000-0000-4000-8000-000000000007';
  builder UUID := '82000000-0000-4000-8000-000000000004';
  reviewer UUID := '82000000-0000-4000-8000-000000000005';
  request_id UUID;
  request_version INTEGER;
  receipt RECORD;
  historical_event_digests JSONB;
  delivery_manifest_digests JSONB;
  review_manifest_digests JSONB;
BEGIN
  SELECT completed_request.id, completed_request.version
  INTO request_id, request_version
  FROM public.build_requests AS completed_request
  WHERE completed_request.current_delivery_revision_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.build_request_delivery_reviews AS retained_review
      WHERE retained_review.request_id = completed_request.id
    )
  ORDER BY completed_request.submitted_at
  LIMIT 1;
  IF request_id IS NULL THEN
    RAISE EXCEPTION 'Deep deidentification prerequisites were not created.';
  END IF;

  SELECT jsonb_object_agg(event_value.id::TEXT, event_value.event_digest)
  INTO historical_event_digests
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = deep_deidentify.request_id;
  SELECT jsonb_object_agg(
    revision_value.id::TEXT,
    revision_value.artifact_manifest_digest
  )
  INTO delivery_manifest_digests
  FROM public.build_request_delivery_revisions AS revision_value
  WHERE revision_value.request_id = deep_deidentify.request_id
    AND revision_value.artifact_manifest_digest IS NOT NULL;
  SELECT jsonb_object_agg(review_value.id::TEXT, review_value.manifest_digest)
  INTO review_manifest_digests
  FROM public.build_request_delivery_reviews AS review_value
  WHERE review_value.request_id = deep_deidentify.request_id;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  PERFORM public.deidentify_build_request_account_v1(
    1, builder, 'deep-deidentify-builder-0001'
  );
  PERFORM public.deidentify_build_request_account_v1(
    1, reviewer, 'deep-deidentify-reviewer-0001'
  );
  SET CONSTRAINTS ALL IMMEDIATE;

  IF EXISTS (
    SELECT 1
    FROM public.build_request_assignments AS assignment_value
    WHERE assignment_value.request_id = deep_deidentify.request_id
      AND assignment_value.assignment_role IN ('builder', 'reviewer')
      AND (
        assignment_value.account_id IS NOT NULL
        OR NOT assignment_value.deidentified
        OR assignment_value.display_name <> 'Former participant'
        OR assignment_value.active
        OR assignment_value.ended_at IS NULL
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_delivery_revisions AS revision_value
    WHERE revision_value.request_id = deep_deidentify.request_id
      AND (
        revision_value.authored_by IS NOT NULL
        OR NOT revision_value.authored_by_deidentified
        OR revision_value.authored_by_display_name <> 'Former participant'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_delivery_reviews AS review_value
    WHERE review_value.request_id = deep_deidentify.request_id
      AND (
        review_value.reviewer_id IS NOT NULL
        OR NOT review_value.reviewer_deidentified
        OR review_value.reviewer_display_name <> 'Former participant'
      )
  ) THEN
    RAISE EXCEPTION
      'Builder/reviewer deidentification left live composite attribution.';
  END IF;
  IF historical_event_digests <> (
    SELECT jsonb_object_agg(event_value.id::TEXT, event_value.event_digest)
    FROM public.build_request_events AS event_value
    WHERE event_value.id IN (
      SELECT prior_event.key::UUID
      FROM jsonb_each_text(historical_event_digests) AS prior_event
    )
  ) OR delivery_manifest_digests <> (
    SELECT jsonb_object_agg(
      revision_value.id::TEXT,
      revision_value.artifact_manifest_digest
    )
    FROM public.build_request_delivery_revisions AS revision_value
    WHERE revision_value.request_id = deep_deidentify.request_id
      AND revision_value.artifact_manifest_digest IS NOT NULL
  ) OR review_manifest_digests <> (
    SELECT jsonb_object_agg(review_value.id::TEXT, review_value.manifest_digest)
    FROM public.build_request_delivery_reviews AS review_value
    WHERE review_value.request_id = deep_deidentify.request_id
  ) THEN
    RAISE EXCEPTION
      'Account deidentification rewrote an immutable event or manifest digest.';
  END IF;

  DELETE FROM public.profiles WHERE id IN (builder, reviewer);
  DELETE FROM auth.users WHERE id IN (builder, reviewer);
END;
$test$;
