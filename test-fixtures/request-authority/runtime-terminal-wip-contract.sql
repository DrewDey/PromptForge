\set ON_ERROR_STOP on

CREATE TABLE public.test_request_terminal_wip_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  artifact_id UUID NOT NULL,
  terminal_detail JSONB NOT NULL,
  retirement_events JSONB NOT NULL
);

DO $test$
<<terminal_wip>>
DECLARE
  requester UUID := '8d000000-0000-4000-8000-000000000001';
  triager UUID := '8d000000-0000-4000-8000-000000000002';
  builder UUID := '8d000000-0000-4000-8000-000000000003';
  replacement UUID := '8d000000-0000-4000-8000-000000000004';
  request_id UUID;
  revision_id UUID := '8d100000-0000-4000-8000-000000000001';
  brief_id UUID;
  builder_assignment_id UUID;
  artifact_id UUID;
  request_version INTEGER;
  staged_command_id UUID;
  result JSONB;
  replay JSONB;
  detail JSONB;
  events JSONB;
  receipt RECORD;
  error_detail TEXT;
  brief JSONB := jsonb_build_object(
    'title', 'Terminal WIP retirement fixture',
    'outcome', 'Preserve and retire an unsubmitted private builder workspace.',
    'intended_user', 'The disposable PostgreSQL authority harness',
    'must_work_scenario', 'A triager can truthfully decline after builder loss.',
    'constraints', 'Never rebind or delete the staged evidence.',
    'acceptance_checks', jsonb_build_array(
      'Terminal retirement preserves the staged artifact evidence.'
    ),
    'pathforge_reference', NULL
  );
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (requester, clock_timestamp()),
    (triager, clock_timestamp()),
    (builder, clock_timestamp()),
    (replacement, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (requester, 'user', 'terminal_wip_requester', 'Terminal WIP Requester'),
    (triager, 'admin', 'terminal_wip_triager', 'Terminal WIP Triager'),
    (builder, 'user', 'terminal_wip_builder', 'Terminal WIP Builder'),
    (
      replacement,
      'user',
      'terminal_wip_replacement',
      'Terminal WIP Replacement'
    );
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admitted, expires_at, reason, changed_by
  ) VALUES (
    requester, TRUE, NULL, 'Terminal WIP fixture admission', triager
  );
  UPDATE public.build_request_controls
  SET accepting_requests = TRUE,
      assigning_requests = TRUE,
      updated_at = clock_timestamp()
  WHERE singleton;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', requester, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt
  FROM public.submit_build_request_v1(
    1,
    'terminal-wip-submit-0001',
    brief
  );
  request_id := receipt.request_id;
  SELECT current_brief_revision_id INTO STRICT brief_id
  FROM public.build_requests
  WHERE id = terminal_wip.request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1, request_id, 0, 'terminal-wip-triage-0001',
    'begin_triage', '{}'::JSONB
  );
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1, request_id, receipt.request_version, 'terminal-wip-accept-0001',
    'accept',
    jsonb_build_object(
      'builderId', builder,
      'targetDate', '2026-08-31'
    )
  );
  request_version := receipt.request_version;
  builder_assignment_id :=
    (receipt.authority_result->>'assignmentId')::UUID;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', builder, 'role', 'authenticated')::TEXT,
    TRUE
  );
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1, request_id, request_version, 'terminal-wip-start-0001',
    'start_build', '{}'::JSONB
  );
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1,
    request_id,
    receipt.request_version,
    'terminal-wip-stage-0001',
    'stage_delivery_artifact',
    jsonb_build_object(
      'deliveryRevisionId', revision_id,
      'acceptedBriefRevisionId', brief_id,
      'activeBuilderAssignmentId', builder_assignment_id,
      'artifactOrdinal', 1,
      'clientFileId', 'terminal-wip-client-file',
      'normalizedName', 'terminal-wip.html',
      'byteLength', 128,
      'sha256', repeat('d', 64),
      'detectedMediaType', 'text/html',
      'scannerVersion', 'terminal-wip-scanner-v1'
    )
  );
  request_version := receipt.request_version;
  staged_command_id := receipt.command_id;
  artifact_id := (receipt.authority_result->>'artifactId')::UUID;

  IF has_function_privilege(
    'authenticated',
    'public.retire_build_request_delivery_revision_v1(integer,uuid,uuid,integer,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.retire_build_request_delivery_revision_v1(integer,uuid,uuid,integer,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Terminal WIP retirement grants are not service-only.';
  END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  BEGIN
    PERFORM public.retire_build_request_delivery_revision_v1(
      1,
      request_id,
      revision_id,
      request_version,
      'terminal-wip-active-denied'
    );
    RAISE EXCEPTION 'Active WIP retirement was allowed.';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_detail = PG_EXCEPTION_DETAIL;
    IF SQLERRM = 'Active WIP retirement was allowed.'
      OR error_detail <> 'request_authority:invalid_transition' THEN
      RAISE;
    END IF;
  END;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  detail := public.get_build_request_v1(1, request_id);
  IF detail->'actor'->'allowedCloseReasons'
      <> '["declined"]'::JSONB THEN
    RAISE EXCEPTION
      'Active triager detail did not expose the exact WIP declined close reason.';
  END IF;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      request_version,
      'terminal-wip-reassign-denied',
      'reassign_builder',
      jsonb_build_object(
        'builderId', replacement,
        'reason', 'Builder disappeared during staged work.'
      )
    );
    RAISE EXCEPTION 'WIP builder reassignment was allowed.';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_detail = PG_EXCEPTION_DETAIL;
    IF SQLERRM = 'WIP builder reassignment was allowed.'
      OR error_detail <> 'request_authority:invalid_transition' THEN
      RAISE;
    END IF;
  END;
  SELECT * INTO receipt
  FROM public.build_request_command_v1(
    1,
    request_id,
    request_version,
    'terminal-wip-declined-0001',
    'close',
    jsonb_build_object(
      'reason', 'declined',
      'note', 'Closed after the assigned builder became unavailable.'
    )
  );
  request_version := receipt.request_version;
  IF receipt.lifecycle_state <> 'closed'
    OR receipt.close_reason <> 'declined'
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_events AS close_event
      WHERE close_event.id = receipt.event_id
        AND close_event.actor_id = triager
        AND close_event.actor_role = 'triager'
        AND close_event.resulting_request_version = receipt.request_version
        AND close_event.new_lifecycle_state = 'closed'
        AND close_event.new_close_reason = 'declined'
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS assignment
      WHERE assignment.request_id = terminal_wip.request_id
        AND assignment.active
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_delivery_revisions AS revision
      WHERE revision.id = terminal_wip.revision_id
        AND revision.revision_state = 'staging'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_delivery_artifacts AS artifact
      WHERE artifact.id = terminal_wip.artifact_id
        AND artifact.stage_receipt_id = terminal_wip.staged_command_id
    ) THEN
    RAISE EXCEPTION
      'Declined WIP closure did not end assignments and preserve evidence.';
  END IF;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  BEGIN
    PERFORM public.retire_build_request_delivery_revision_v1(
      1,
      request_id,
      revision_id,
      request_version - 1,
      'terminal-wip-stale-denied'
    );
    RAISE EXCEPTION 'Stale WIP retirement was allowed.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Stale WIP retirement was allowed.'
      OR SQLSTATE <> '55000' THEN
      RAISE;
    END IF;
  END;
  result := public.retire_build_request_delivery_revision_v1(
    1,
    request_id,
    revision_id,
    request_version,
    'terminal-wip-retire-0001'
  );
  IF result <> jsonb_build_object(
    'requestId', request_id,
    'deliveryRevisionId', revision_id,
    'revisionState', 'abandoned',
    'retiredAt', result->'retiredAt',
    'replayed', FALSE
  ) OR result ?| ARRAY[
    'objectIdentity', 'manifestDigest', 'actorId', 'artifactId'
  ] THEN
    RAISE EXCEPTION 'Terminal WIP retirement returned a non-canonical receipt.';
  END IF;
  replay := public.retire_build_request_delivery_revision_v1(
    1,
    request_id,
    revision_id,
    request_version,
    'terminal-wip-retire-0001'
  );
  IF replay <> jsonb_set(result, '{replayed}', 'true'::JSONB)
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_delivery_artifacts AS artifact
      WHERE artifact.id = terminal_wip.artifact_id
        AND artifact.delivery_revision_id = terminal_wip.revision_id
    ) THEN
    RAISE EXCEPTION
      'Terminal WIP retirement replay drifted or deleted evidence.';
  END IF;

  SELECT version INTO request_version
  FROM public.build_requests
  WHERE id = terminal_wip.request_id;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', triager, 'role', 'authenticated')::TEXT,
    TRUE
  );
  detail := public.get_build_request_v1(1, request_id);
  events := public.list_build_request_events_v1(
    1, request_id, NULL, 50
  );
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(events->'items') AS item
    WHERE item->>'kind' = 'request_closed'
      AND item->>'actorRole' = 'triager'
      AND item->'actor'->>'displayName' = 'Terminal WIP Triager'
      AND item->'actor'->>'deidentified' = 'false'
      AND NOT (item->'actor') ? 'accountId'
      AND item->'newAxes'->>'lifecycleState' = 'closed'
      AND item->'newAxes'->>'closeReason' = 'declined'
  ) OR NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(events->'items') AS item
    WHERE item->>'kind' = 'delivery_revision_retired'
      AND item->>'actorRole' = 'system'
      AND item->'actor' = 'null'::JSONB
      AND item->>'reason' IS NULL
      AND item->>'reference' IS NULL
      AND item::TEXT NOT LIKE '%deliveryRevisionId%'
      AND item::TEXT NOT LIKE '%artifactId%'
      AND item::TEXT NOT LIKE '%objectIdentity%'
      AND item::TEXT NOT LIKE '%custody%'
  ) THEN
    RAISE EXCEPTION
      'Projected retirement event leaked authority IDs or lost system identity.';
  END IF;

  UPDATE public.build_requests
  SET terminal_at = clock_timestamp() - INTERVAL '91 days'
  WHERE id = terminal_wip.request_id;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  result := public.resolve_build_request_delivery_artifact_cleanup_v1(
    1, request_id, revision_id, artifact_id
  );
  IF result->>'retentionState' <> 'cleanup_eligible'
    OR result->>'custodyState' <> 'staged' THEN
    RAISE EXCEPTION
      'Retired staged artifact was not day-91 cleanup eligible.';
  END IF;

  INSERT INTO public.test_request_terminal_wip_state (
    request_id,
    delivery_revision_id,
    artifact_id,
    terminal_detail,
    retirement_events
  ) VALUES (
    request_id,
    revision_id,
    artifact_id,
    detail,
    events
  );
END;
$test$;
