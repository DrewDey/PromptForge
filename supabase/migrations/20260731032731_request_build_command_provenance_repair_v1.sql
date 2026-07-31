-- Forward-only repair for environments where the private Request authority
-- migration is already recorded. Controls remain unchanged and default off.
--
-- APPLY CONTRACT: use the Supabase CLI transactional migration runner or an
-- explicit caller-owned transaction. Direct SQL-editor autocommit is unsupported.

DO $request_command_provenance_preflight$
DECLARE
  v_function REGPROCEDURE :=
    to_regprocedure(
      'public.build_request_command_v1(integer,uuid,integer,text,text,jsonb)'
    );
  v_definition TEXT;
  v_owner TEXT;
  v_security_definer BOOLEAN;
  v_config TEXT[];
  v_brief_guard BOOLEAN;
  v_outcome_guard BOOLEAN;
  v_stage_distinct BOOLEAN;
  v_outcome_distinct BOOLEAN;
  v_acknowledgement_guard BOOLEAN;
  v_acknowledgement_distinct BOOLEAN;
BEGIN
  IF v_function IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request command authority is missing.';
  END IF;

  SELECT
    pg_catalog.pg_get_functiondef(procedure.oid),
    owner_role.rolname,
    procedure.prosecdef,
    procedure.proconfig
  INTO STRICT
    v_definition,
    v_owner,
    v_security_definer,
    v_config
  FROM pg_catalog.pg_proc AS procedure
  JOIN pg_catalog.pg_roles AS owner_role
    ON owner_role.oid = procedure.proowner
  WHERE procedure.oid = v_function;

  IF v_owner <> 'postgres'
    OR NOT v_security_definer
    OR v_config IS DISTINCT FROM ARRAY['search_path=""']::TEXT[]
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request command security envelope drifted.';
  END IF;

  v_definition := regexp_replace(v_definition, '\s+', ' ', 'g');
  v_brief_guard :=
    position(
      'request_command_provenance_v1: stage accepted brief validation'
        IN v_definition
    ) > 0;
  v_outcome_guard :=
    position(
      'request_command_provenance_v1: requester outcome revision validation'
        IN v_definition
    ) > 0;
  v_stage_distinct :=
    position(
      'request_command_provenance_v1: stage accepted brief binding'
        IN v_definition
    ) > 0;
  v_outcome_distinct :=
    position(
      'request_command_provenance_v1: requester outcome revision binding'
        IN v_definition
    ) > 0;
  v_acknowledgement_guard :=
    position(
      'request_command_provenance_v1: acknowledgement revision validation'
        IN v_definition
    ) > 0;
  v_acknowledgement_distinct :=
    position(
      'request_command_provenance_v1: acknowledgement revision binding'
        IN v_definition
    ) > 0;

  IF NOT (
    (
      NOT v_brief_guard
      AND NOT v_outcome_guard
      AND NOT v_stage_distinct
      AND NOT v_outcome_distinct
      AND NOT v_acknowledgement_guard
      AND NOT v_acknowledgement_distinct
    )
    OR (
      v_brief_guard
      AND v_outcome_guard
      AND v_stage_distinct
      AND v_outcome_distinct
      AND v_acknowledgement_guard
      AND v_acknowledgement_distinct
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request command provenance authority is partially drifted.';
  END IF;
END;
$request_command_provenance_preflight$;

CREATE OR REPLACE FUNCTION public.build_request_command_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_expected_version INTEGER,
  p_idempotency_key TEXT,
  p_command TEXT,
  p_payload JSONB
)
RETURNS TABLE (
  contract_version INTEGER,
  command_id UUID,
  request_id UUID,
  request_version INTEGER,
  event_id UUID,
  lifecycle_state TEXT,
  moderation_state TEXT,
  publication_state TEXT,
  close_reason TEXT,
  replayed BOOLEAN,
  occurred_at TIMESTAMPTZ,
  authority_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_event_actor_role TEXT;
  v_request public.build_requests%ROWTYPE;
  v_before public.build_requests%ROWTYPE;
  v_existing public.build_request_command_receipts%ROWTYPE;
  v_assignment public.build_request_assignments%ROWTYPE;
  v_revision public.build_request_delivery_revisions%ROWTYPE;
  v_artifact public.build_request_delivery_artifacts%ROWTYPE;
  v_review_id UUID;
  v_outcome_id UUID;
  v_event_id UUID := gen_random_uuid();
  v_command_id UUID := gen_random_uuid();
  v_occurred_at TIMESTAMPTZ := clock_timestamp();
  v_hash TEXT;
  v_authority JSONB := '{}'::JSONB;
  v_event_metadata JSONB := '{}'::JSONB;
  v_sequence INTEGER;
  v_display TEXT;
  v_reference JSONB;
  v_target_date DATE;
  v_item JSONB;
  v_count INTEGER;
  v_total BIGINT;
  v_min_ordinal INTEGER;
  v_max_ordinal INTEGER;
  v_assigning_requests BOOLEAN;
  v_subject_target UUID;
  v_accepted_clarifications JSONB;
  v_accepted_clarification_count INTEGER;
  v_accepted_clarification_digest TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Authentication is required.';
  END IF;
  IF p_request_id IS NULL
    OR p_expected_version IS NULL
    OR p_expected_version < 0
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_command IS NULL
    OR p_payload IS NULL
    OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid command envelope.';
  END IF;
  CASE p_command
    WHEN 'begin_triage', 'start_build', 'close_no_response' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, '{}'::TEXT[], 'Command payload'
      );
    WHEN 'request_clarification' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['question'], 'Command payload'
      );
    WHEN 'submit_clarification' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['clarificationId', 'answer'], 'Command payload'
      );
    WHEN 'accept' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['builderId', 'targetDate'], 'Command payload'
      );
    WHEN 'assign_reviewer' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['reviewerId'], 'Command payload'
      );
    WHEN 'reassign_triager' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['triagerId', 'reason'], 'Command payload'
      );
    WHEN 'reassign_builder' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['builderId', 'reason'], 'Command payload'
      );
    WHEN 'reassign_reviewer' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['reviewerId', 'reason'], 'Command payload'
      );
    WHEN 'prepare_delivery_revision' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY[
          'deliveryRevisionId', 'acceptedBriefRevisionId',
          'activeBuilderAssignmentId', 'revisionLabel', 'summary',
          'builderEvidence', 'approvedPathForgeReference'
        ], 'Command payload'
      );
    WHEN 'stage_delivery_artifact' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY[
          'deliveryRevisionId', 'acceptedBriefRevisionId',
          'activeBuilderAssignmentId', 'artifactOrdinal', 'clientFileId',
          'normalizedName', 'byteLength', 'sha256',
          'detectedMediaType', 'scannerVersion'
        ], 'Command payload'
      );
      -- request_command_provenance_v1: stage accepted brief validation
      IF jsonb_typeof(p_payload->'acceptedBriefRevisionId')
          IS DISTINCT FROM 'string'
        OR p_payload->>'acceptedBriefRevisionId'
          !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Accepted brief revision id is invalid.';
      END IF;
    WHEN 'abandon_delivery_artifact' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['deliveryRevisionId', 'artifactId'], 'Command payload'
      );
    WHEN 'submit_delivery', 'resubmit_delivery' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['deliveryRevisionId', 'sealReceiptId'], 'Command payload'
      );
    WHEN 'approve_delivery' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY[
          'deliveryRevisionId', 'manifestDigest', 'checklistVersion',
          'checks', 'safetyIntegrityResult', 'reviewNotes'
        ], 'Command payload'
      );
    WHEN 'request_repair' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY[
          'deliveryRevisionId', 'manifestDigest', 'checklistVersion',
          'checks', 'safetyIntegrityResult', 'reason', 'repairInstructions'
        ], 'Command payload'
      );
    WHEN 'requester_delivery_outcome' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload,
        CASE WHEN p_payload->>'outcome' = 'failed_acceptance_check'
          THEN ARRAY[
            'deliveryRevisionId', 'manifestDigest', 'outcome',
            'failedAcceptanceCheckId', 'reason'
          ]
          ELSE ARRAY['deliveryRevisionId', 'manifestDigest', 'outcome']
        END,
        'Command payload'
      );
      -- request_command_provenance_v1: requester outcome revision validation
      IF jsonb_typeof(p_payload->'deliveryRevisionId')
          IS DISTINCT FROM 'string'
        OR p_payload->>'deliveryRevisionId'
          !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Delivery revision id is invalid.';
      END IF;
    WHEN 'acknowledge_delivery' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['deliveryRevisionId'], 'Command payload'
      );
      -- request_command_provenance_v1: acknowledgement revision validation
      IF jsonb_typeof(p_payload->'deliveryRevisionId')
          IS DISTINCT FROM 'string'
        OR p_payload->>'deliveryRevisionId'
          !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Delivery revision id is invalid.';
      END IF;
    WHEN 'close' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload,
        CASE WHEN p_payload->>'reason' = 'existing_resolution'
          THEN ARRAY['reason', 'note', 'resolutionReference']
          WHEN p_payload->>'reason' = 'duplicate'
          THEN ARRAY['reason']
          ELSE ARRAY['reason', 'note']
        END,
        'Command payload'
      );
    WHEN 'withdraw', 'place_moderation_hold', 'remove_for_moderation' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['reason'], 'Command payload'
      );
    WHEN 'release_moderation_hold' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['resolution'], 'Command payload'
      );
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Unsupported request command.';
  END CASE;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'contract', p_contract_version, 'request_id', p_request_id,
    'expected_version', p_expected_version, 'command', p_command,
    'payload', COALESCE(p_payload, '{}'::JSONB)
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor_id::TEXT || ':' || p_idempotency_key, 0));

  SELECT * INTO v_existing
  FROM public.build_request_command_receipts AS prior_receipt
  WHERE prior_receipt.actor_id = v_actor_id
    AND prior_receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN QUERY SELECT * FROM private.request_receipt_v1(
      v_existing.id, v_existing.request_id, v_existing.event_id, TRUE,
      v_existing.created_at, COALESCE(v_existing.receipt->'authority_result', '{}'::JSONB)
    );
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-subject:' ||
      private.request_account_pseudonym_v1(v_actor_id),
    0
  ));
  IF EXISTS (
    SELECT 1
    FROM public.build_request_deidentified_accounts AS tombstone
    WHERE tombstone.subject_digest =
      private.request_account_pseudonym_v1(v_actor_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request actor is no longer available.',
      DETAIL = 'request_authority:unauthorized';
  END IF;

  BEGIN
    v_subject_target := CASE p_command
      WHEN 'accept' THEN (p_payload->>'builderId')::UUID
      WHEN 'assign_reviewer' THEN (p_payload->>'reviewerId')::UUID
      WHEN 'reassign_triager' THEN (p_payload->>'triagerId')::UUID
      WHEN 'reassign_builder' THEN (p_payload->>'builderId')::UUID
      WHEN 'reassign_reviewer' THEN (p_payload->>'reviewerId')::UUID
      ELSE NULL
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Assignment target is invalid.';
  END;
  IF v_subject_target IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'request-subject:' ||
        private.request_account_pseudonym_v1(v_subject_target),
      0
    ));
    IF EXISTS (
      SELECT 1
      FROM public.build_request_deidentified_accounts AS tombstone
      WHERE tombstone.subject_digest =
        private.request_account_pseudonym_v1(v_subject_target)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Assignment target is not available.';
    END IF;
  END IF;

  SELECT * INTO v_request
  FROM public.build_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Request was not found.';
  END IF;
  IF NOT private.request_has_scope_v1(p_request_id, v_actor_id)
    AND NOT (
      private.request_actor_role_v1(v_actor_id) = 'admin'
      AND p_command IN (
        'place_moderation_hold', 'release_moderation_hold',
        'remove_for_moderation'
      )
    ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Request was not found.',
      DETAIL = 'request_authority:not_found';
  END IF;
  v_before := v_request;
  v_actor_role := private.request_actor_role_v1(v_actor_id);
  v_display := private.request_display_name_v1(v_actor_id);
  v_event_actor_role := CASE
    WHEN p_command IN (
      'submit_clarification', 'acknowledge_delivery',
      'requester_delivery_outcome', 'withdraw'
    ) THEN 'requester'
    WHEN p_command IN (
      'start_build', 'prepare_delivery_revision',
      'stage_delivery_artifact', 'abandon_delivery_artifact',
      'submit_delivery', 'resubmit_delivery'
    ) THEN 'builder'
    WHEN p_command IN (
      'approve_delivery', 'request_repair'
    ) THEN 'reviewer'
    WHEN p_command IN (
      'begin_triage', 'request_clarification', 'accept',
      'assign_reviewer', 'reassign_builder', 'reassign_reviewer',
      'close', 'close_no_response'
    ) THEN 'triager'
    WHEN p_command IN (
      'reassign_triager', 'place_moderation_hold',
      'release_moderation_hold', 'remove_for_moderation'
    ) THEN 'operator'
    ELSE NULL
  END;
  IF v_event_actor_role IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request command event authority is not available.';
  END IF;
  IF v_request.version <> p_expected_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  IF v_request.moderation_state <> 'clear'
    AND p_command NOT IN (
      'release_moderation_hold', 'remove_for_moderation'
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Request is held by moderation.';
  END IF;
  IF v_request.lifecycle_state IN ('completed', 'closed')
    AND p_command NOT IN (
      'place_moderation_hold', 'release_moderation_hold',
      'remove_for_moderation'
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Terminal request state cannot be changed.';
  END IF;
  IF p_command IN (
    'begin_triage', 'accept', 'assign_reviewer', 'reassign_triager',
    'reassign_builder', 'reassign_reviewer'
  ) THEN
    SELECT controls.assigning_requests
    INTO STRICT v_assigning_requests
    FROM public.build_request_controls AS controls
    WHERE controls.singleton
    FOR UPDATE;
    IF NOT v_assigning_requests THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:controls_off';
    END IF;
  END IF;

  IF p_command = 'begin_triage' THEN
    IF v_actor_role NOT IN ('admin', 'triager')
      OR v_request.lifecycle_state <> 'submitted'
      OR EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'begin_triage is not allowed.';
    END IF;
    UPDATE public.build_requests SET lifecycle_state = 'triage' WHERE id = p_request_id;
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (p_request_id, 'triager', v_actor_id, v_display)
    ;

  ELSIF p_command = 'request_clarification' THEN
    IF v_request.lifecycle_state <> 'triage'
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'request_clarification is not allowed.';
    END IF;
    IF (
      SELECT count(*) FROM public.build_request_clarifications AS prior_clarification
      WHERE prior_clarification.request_id = p_request_id
    ) >= 3 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Clarification limit has been reached.';
    END IF;
    v_authority := jsonb_build_object('clarificationId', gen_random_uuid());
    INSERT INTO public.build_request_clarifications (
      id, request_id, sequence, question, requested_by, requested_at
    ) VALUES (
      (v_authority->>'clarificationId')::UUID, p_request_id,
      COALESCE((SELECT max(c.sequence) + 1 FROM public.build_request_clarifications AS c
        WHERE c.request_id = p_request_id), 1),
      private.request_assert_safe_text_v1(p_payload->>'question', 'question', 1, 2000, TRUE),
      v_actor_id, v_occurred_at
    );
    UPDATE public.build_requests SET lifecycle_state = 'clarification_requested' WHERE id = p_request_id;

  ELSIF p_command = 'submit_clarification' THEN
    IF v_request.requester_id <> v_actor_id OR v_request.lifecycle_state <> 'clarification_requested' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'submit_clarification is not allowed.';
    END IF;
    UPDATE public.build_request_clarifications AS clarification
    SET answer = private.request_assert_safe_text_v1(p_payload->>'answer', 'answer', 1, 4000, TRUE),
        answered_at = v_occurred_at
    WHERE clarification.request_id = p_request_id
      AND clarification.id = (p_payload->>'clarificationId')::UUID
      AND clarification.answer IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Clarification is invalid or already answered.';
    END IF;
    UPDATE public.build_requests SET lifecycle_state = 'triage' WHERE id = p_request_id;

  ELSIF p_command = 'accept' THEN
    IF v_request.lifecycle_state <> 'triage'
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'accept is not allowed.';
    END IF;
    IF COALESCE(p_payload->>'targetDate', '')
      !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Target date is invalid.';
    END IF;
    BEGIN
      v_target_date := (p_payload->>'targetDate')::DATE;
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Target date is invalid.';
    END;
    IF v_target_date < current_date THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Target date is in the past.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    PERFORM 1
    FROM public.build_request_clarifications AS accepted_clarification
    WHERE accepted_clarification.request_id = p_request_id
    ORDER BY accepted_clarification.sequence
    FOR UPDATE;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_clarifications AS unanswered_clarification
      WHERE unanswered_clarification.request_id = p_request_id
        AND (
          unanswered_clarification.answer IS NULL
          OR unanswered_clarification.answered_at IS NULL
        )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Every clarification must be answered before acceptance.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    SELECT
      COALESCE(jsonb_agg(jsonb_build_object(
        'clarificationId', clarification.id,
        'sequence', clarification.sequence,
        'question', clarification.question,
        'answer', clarification.answer
      ) ORDER BY clarification.sequence, clarification.id), '[]'::JSONB),
      count(*)::INTEGER
    INTO v_accepted_clarifications, v_accepted_clarification_count
    FROM public.build_request_clarifications AS clarification
    WHERE clarification.request_id = p_request_id;
    IF v_accepted_clarification_count > 3
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_accepted_clarifications)
          WITH ORDINALITY AS accepted(value, position)
        WHERE (accepted.value->>'sequence')::INTEGER <> accepted.position
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Accepted clarification set is invalid.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    v_accepted_clarification_digest := encode(extensions.digest(convert_to(
      private.request_canonical_json_v1(v_accepted_clarifications),
      'UTF8'
    ), 'sha256'), 'hex');
    PERFORM 1 FROM public.build_request_controls WHERE singleton FOR UPDATE;
    IF NOT (SELECT assigning_requests FROM public.build_request_controls WHERE singleton) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:controls_off';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_requests AS active_request
      WHERE active_request.id <> p_request_id
        AND active_request.moderation_state <> 'removed'
        AND active_request.lifecycle_state NOT IN ('completed', 'closed')
    ) >= (
      SELECT active_case_capacity
      FROM public.build_request_controls
      WHERE singleton
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:capacity_full';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles AS builder_profile
      JOIN auth.users AS builder_user ON builder_user.id = builder_profile.id
      WHERE builder_profile.id = (p_payload->>'builderId')::UUID
        AND builder_user.email_confirmed_at IS NOT NULL
    ) OR (p_payload->>'builderId')::UUID = v_request.requester_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Builder assignment is invalid.';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Assignment history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    v_authority := jsonb_build_object('assignmentId', gen_random_uuid());
    INSERT INTO public.build_request_assignments (
      id, request_id, assignment_role, account_id, display_name, assigned_by, assigned_at
    ) VALUES (
      (v_authority->>'assignmentId')::UUID, p_request_id, 'builder',
      (p_payload->>'builderId')::UUID,
      private.request_display_name_v1((p_payload->>'builderId')::UUID),
      v_actor_id, v_occurred_at
    );
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'builder', (p_payload->>'builderId')::UUID,
      private.request_display_name_v1((p_payload->>'builderId')::UUID)
    );
    INSERT INTO public.build_request_accepted_clarification_sets (
      request_id, brief_revision_id, accepted_clarifications,
      accepted_clarification_count, accepted_clarification_digest,
      clarification_acceptance_cutoff
    ) VALUES (
      p_request_id, v_request.current_brief_revision_id,
      v_accepted_clarifications, v_accepted_clarification_count,
      v_accepted_clarification_digest, v_occurred_at
    );
    v_authority := v_authority || jsonb_build_object(
      'acceptedClarificationCount', v_accepted_clarification_count,
      'acceptedClarificationDigest', v_accepted_clarification_digest,
      'clarificationAcceptanceCutoff', v_occurred_at
    );
    UPDATE public.build_requests
    SET lifecycle_state = 'accepted', target_date = v_target_date
    WHERE id = p_request_id;

  ELSIF p_command = 'assign_reviewer' THEN
    IF v_request.lifecycle_state NOT IN (
        'accepted', 'building', 'repair_required', 'review_pending'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_reviewer
        WHERE active_reviewer.request_id = p_request_id
          AND active_reviewer.assignment_role = 'reviewer'
          AND active_reviewer.active
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'assign_reviewer is not allowed.';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles AS reviewer_profile
      JOIN auth.users AS reviewer_user ON reviewer_user.id = reviewer_profile.id
      WHERE reviewer_profile.id = (p_payload->>'reviewerId')::UUID
        AND reviewer_user.email_confirmed_at IS NOT NULL
    ) OR EXISTS (
      SELECT 1 FROM public.build_request_assignments AS existing_builder
      WHERE existing_builder.request_id = p_request_id AND existing_builder.active
        AND existing_builder.assignment_role = 'builder'
        AND existing_builder.account_id = (p_payload->>'reviewerId')::UUID
    ) OR (p_payload->>'reviewerId')::UUID = v_request.requester_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Reviewer assignment is invalid.';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Assignment history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    v_authority := jsonb_build_object('assignmentId', gen_random_uuid());
    INSERT INTO public.build_request_assignments (
      id, request_id, assignment_role, account_id, display_name, assigned_by, assigned_at
    ) VALUES (
      (v_authority->>'assignmentId')::UUID, p_request_id, 'reviewer',
      (p_payload->>'reviewerId')::UUID,
      private.request_display_name_v1((p_payload->>'reviewerId')::UUID),
      v_actor_id, v_occurred_at
    );
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'reviewer', (p_payload->>'reviewerId')::UUID,
      private.request_display_name_v1((p_payload->>'reviewerId')::UUID)
    );

  ELSIF p_command = 'reassign_triager' THEN
    IF v_actor_role IS DISTINCT FROM 'admin'
      OR v_request.lifecycle_state IN ('submitted', 'completed', 'closed')
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS prior_triager
        WHERE prior_triager.request_id = p_request_id
          AND prior_triager.actor_role = 'triager'
          AND (
            prior_triager.active
            OR (
              NOT prior_triager.active
              AND prior_triager.deidentified
              AND prior_triager.account_id IS NULL
            )
          )
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.profiles AS triager_profile
        JOIN auth.users AS triager_user
          ON triager_user.id = triager_profile.id
        WHERE triager_profile.id = (p_payload->>'triagerId')::UUID
          AND triager_profile.role = 'admin'
          AND triager_user.email_confirmed_at IS NOT NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.build_request_participants AS current_triager
        WHERE current_triager.request_id = p_request_id
          AND current_triager.actor_role = 'triager'
          AND current_triager.active
          AND current_triager.account_id = (p_payload->>'triagerId')::UUID
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'reassign_triager is not allowed.';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_participants AS triager_history
      WHERE triager_history.request_id = p_request_id
        AND triager_history.actor_role = 'triager'
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Participant history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    PERFORM private.request_assert_safe_text_v1(
      p_payload->>'reason', 'reason', 1, 500, TRUE
    );
    v_event_metadata := jsonb_build_object(
      'reason', btrim(p_payload->>'reason', E' \t\n\f\v')
    );
    UPDATE public.build_request_participants AS prior_triager
    SET active = FALSE
    WHERE prior_triager.request_id = p_request_id
      AND prior_triager.actor_role = 'triager'
      AND prior_triager.active;
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'triager', (p_payload->>'triagerId')::UUID,
      private.request_display_name_v1((p_payload->>'triagerId')::UUID)
    );
    v_authority := '{}'::JSONB;

  ELSIF p_command = 'reassign_builder' THEN
    IF v_request.lifecycle_state NOT IN (
        'accepted', 'building', 'repair_required'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS prior_builder
        WHERE prior_builder.request_id = p_request_id
          AND prior_builder.assignment_role = 'builder'
          AND (
            prior_builder.active
            OR (
              prior_builder.deidentified
              AND prior_builder.account_id IS NULL
              AND prior_builder.ended_at IS NOT NULL
            )
          )
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.profiles AS builder_profile
        JOIN auth.users AS builder_user
          ON builder_user.id = builder_profile.id
        WHERE builder_profile.id = (p_payload->>'builderId')::UUID
          AND builder_user.email_confirmed_at IS NOT NULL
      )
      OR (p_payload->>'builderId')::UUID = v_request.requester_id
      OR EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_reviewer
        WHERE active_reviewer.request_id = p_request_id
          AND active_reviewer.assignment_role = 'reviewer'
          AND active_reviewer.active
          AND active_reviewer.account_id = (p_payload->>'builderId')::UUID
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'reassign_builder is not allowed.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS current_builder
      WHERE current_builder.request_id = p_request_id
        AND current_builder.assignment_role = 'builder'
        AND current_builder.active
        AND current_builder.account_id = (p_payload->>'builderId')::UUID
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Builder reassignment target is already active.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_delivery_revisions AS active_wip_revision
      WHERE active_wip_revision.request_id = p_request_id
        AND active_wip_revision.revision_state IN (
          'staging', 'prepared', 'sealed'
        )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Builder reassignment is blocked by active delivery work.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Assignment history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    PERFORM private.request_assert_safe_text_v1(
      p_payload->>'reason', 'reason', 1, 500, TRUE
    );
    v_event_metadata := jsonb_build_object(
      'reason', btrim(p_payload->>'reason', E' \t\n\f\v')
    );
    UPDATE public.build_request_assignments AS prior_builder
    SET active = FALSE, ended_at = v_occurred_at
    WHERE prior_builder.request_id = p_request_id
      AND prior_builder.assignment_role = 'builder'
      AND prior_builder.active;
    UPDATE public.build_request_participants AS prior_builder_participant
    SET active = FALSE
    WHERE prior_builder_participant.request_id = p_request_id
      AND prior_builder_participant.actor_role = 'builder'
      AND prior_builder_participant.active;
    v_authority := jsonb_build_object('assignmentId', gen_random_uuid());
    INSERT INTO public.build_request_assignments (
      id, request_id, assignment_role, account_id, display_name,
      assigned_by, assigned_at
    ) VALUES (
      (v_authority->>'assignmentId')::UUID, p_request_id, 'builder',
      (p_payload->>'builderId')::UUID,
      private.request_display_name_v1((p_payload->>'builderId')::UUID),
      v_actor_id, v_occurred_at
    );
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'builder', (p_payload->>'builderId')::UUID,
      private.request_display_name_v1((p_payload->>'builderId')::UUID)
    );

  ELSIF p_command = 'reassign_reviewer' THEN
    IF v_request.lifecycle_state NOT IN (
        'accepted', 'building', 'repair_required', 'review_pending'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS prior_reviewer
        WHERE prior_reviewer.request_id = p_request_id
          AND prior_reviewer.assignment_role = 'reviewer'
          AND prior_reviewer.active
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.profiles AS reviewer_profile
        JOIN auth.users AS reviewer_user
          ON reviewer_user.id = reviewer_profile.id
        WHERE reviewer_profile.id = (p_payload->>'reviewerId')::UUID
          AND reviewer_user.email_confirmed_at IS NOT NULL
      )
      OR (p_payload->>'reviewerId')::UUID = v_request.requester_id
      OR EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_builder
        WHERE active_builder.request_id = p_request_id
          AND active_builder.assignment_role = 'builder'
          AND active_builder.active
          AND active_builder.account_id = (p_payload->>'reviewerId')::UUID
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'reassign_reviewer is not allowed.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS current_reviewer
      WHERE current_reviewer.request_id = p_request_id
        AND current_reviewer.assignment_role = 'reviewer'
        AND current_reviewer.active
        AND current_reviewer.account_id = (p_payload->>'reviewerId')::UUID
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Reviewer reassignment target is already active.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    PERFORM private.request_assert_safe_text_v1(
      p_payload->>'reason', 'reason', 1, 500, TRUE
    );
    IF (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Assignment history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    v_event_metadata := jsonb_build_object(
      'reason', btrim(p_payload->>'reason', E' \t\n\f\v')
    );
    UPDATE public.build_request_assignments AS prior_reviewer
    SET active = FALSE, ended_at = v_occurred_at
    WHERE prior_reviewer.request_id = p_request_id
      AND prior_reviewer.assignment_role = 'reviewer'
      AND prior_reviewer.active;
    UPDATE public.build_request_participants AS prior_reviewer_participant
    SET active = FALSE
    WHERE prior_reviewer_participant.request_id = p_request_id
      AND prior_reviewer_participant.actor_role = 'reviewer'
      AND prior_reviewer_participant.active;
    v_authority := jsonb_build_object('assignmentId', gen_random_uuid());
    INSERT INTO public.build_request_assignments (
      id, request_id, assignment_role, account_id, display_name,
      assigned_by, assigned_at
    ) VALUES (
      (v_authority->>'assignmentId')::UUID, p_request_id, 'reviewer',
      (p_payload->>'reviewerId')::UUID,
      private.request_display_name_v1((p_payload->>'reviewerId')::UUID),
      v_actor_id, v_occurred_at
    );
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'reviewer', (p_payload->>'reviewerId')::UUID,
      private.request_display_name_v1((p_payload->>'reviewerId')::UUID)
    );

  ELSIF p_command = 'start_build' THEN
    IF v_request.lifecycle_state <> 'accepted' OR NOT EXISTS (
      SELECT 1 FROM public.build_request_assignments AS active_builder
      WHERE active_builder.request_id = p_request_id
        AND active_builder.assignment_role = 'builder'
        AND active_builder.active AND active_builder.account_id = v_actor_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'start_build is not allowed.';
    END IF;
    UPDATE public.build_requests SET lifecycle_state = 'building' WHERE id = p_request_id;

  ELSIF p_command = 'stage_delivery_artifact' THEN
    IF (
      SELECT count(*) FROM public.build_request_delivery_revisions AS prior_delivery
      WHERE prior_delivery.request_id = p_request_id
        AND prior_delivery.revision_state = 'submitted'
    ) >= 2 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Delivery revision limit has been reached.',
        DETAIL = 'request_authority:delivery_revision_limit';
    END IF;
    SELECT * INTO v_assignment
    FROM public.build_request_assignments AS staged_builder
    WHERE staged_builder.id = (p_payload->>'activeBuilderAssignmentId')::UUID
      AND staged_builder.request_id = p_request_id
      AND staged_builder.assignment_role = 'builder'
      AND staged_builder.active AND staged_builder.account_id = v_actor_id;
    -- request_command_provenance_v1: stage accepted brief binding
    IF NOT FOUND OR v_request.lifecycle_state NOT IN ('building', 'repair_required')
      OR (p_payload->>'acceptedBriefRevisionId')::UUID
        IS DISTINCT FROM v_request.current_brief_revision_id THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Artifact staging is not allowed.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_delivery_revisions AS conflicting_revision
      WHERE conflicting_revision.request_id = p_request_id
        AND (
          (
            conflicting_revision.revision_state IN (
              'staging', 'prepared', 'sealed'
            )
            AND conflicting_revision.id <>
              (p_payload->>'deliveryRevisionId')::UUID
          )
          OR (
            conflicting_revision.id =
              (p_payload->>'deliveryRevisionId')::UUID
            AND conflicting_revision.revision_state <> 'staging'
          )
        )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Another delivery revision already owns the case workspace.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    INSERT INTO public.build_request_delivery_revisions (
      id, request_id, accepted_brief_revision_id, builder_assignment_id,
      authored_by, authored_by_display_name
    ) VALUES (
      (p_payload->>'deliveryRevisionId')::UUID, p_request_id,
      v_request.current_brief_revision_id, v_assignment.id, v_actor_id, v_display
    )
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_revision
    FROM public.build_request_delivery_revisions AS staged_revision
    WHERE staged_revision.id = (p_payload->>'deliveryRevisionId')::UUID
      AND staged_revision.request_id = p_request_id
      AND staged_revision.revision_state = 'staging'
      AND staged_revision.authored_by = v_actor_id
      AND staged_revision.accepted_brief_revision_id = v_request.current_brief_revision_id
      AND staged_revision.builder_assignment_id = v_assignment.id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery revision staging is invalid.';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_delivery_artifacts AS attempted_artifact
      WHERE attempted_artifact.delivery_revision_id = v_revision.id
    ) >= 8 OR COALESCE((
      SELECT sum(attempted_artifact.byte_length)
      FROM public.build_request_delivery_artifacts AS attempted_artifact
      WHERE attempted_artifact.delivery_revision_id = v_revision.id
    ), 0) + (p_payload->>'byteLength')::BIGINT > 24000000 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Delivery revision staging lifetime limit was reached.',
        DETAIL = 'request_authority:artifact_staging_limit';
    END IF;
    IF (
      SELECT count(*) FROM public.build_request_delivery_artifacts AS staged_artifact
      WHERE staged_artifact.delivery_revision_id = v_revision.id
        AND staged_artifact.abandoned_at IS NULL
    ) >= 5 OR COALESCE((
      SELECT sum(staged_artifact.byte_length)
      FROM public.build_request_delivery_artifacts AS staged_artifact
      WHERE staged_artifact.delivery_revision_id = v_revision.id
        AND staged_artifact.abandoned_at IS NULL
    ), 0) + (p_payload->>'byteLength')::BIGINT > 12000000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery revision staging is invalid or full.';
    END IF;
    v_authority := jsonb_build_object(
      'deliveryRevisionId', v_revision.id,
      'artifactId', gen_random_uuid()
    );
    INSERT INTO public.build_request_delivery_artifacts (
      id, request_id, delivery_revision_id, accepted_brief_revision_id,
      builder_assignment_id, client_file_id, artifact_ordinal, normalized_name, byte_length,
      sha256, detected_media_type, scanner_version, staging_identity
    ) VALUES (
      (v_authority->>'artifactId')::UUID, p_request_id, v_revision.id,
      v_revision.accepted_brief_revision_id, v_revision.builder_assignment_id,
      private.request_assert_opaque_v1(p_payload->>'clientFileId', 'clientFileId'),
      (p_payload->>'artifactOrdinal')::INTEGER,
      private.request_assert_safe_text_v1(p_payload->>'normalizedName', 'normalizedName', 1, 120),
      (p_payload->>'byteLength')::BIGINT, lower(p_payload->>'sha256'),
      p_payload->>'detectedMediaType',
      private.request_assert_safe_text_v1(p_payload->>'scannerVersion', 'scannerVersion', 1, 80),
      concat(
        'requests/', p_request_id, '/deliveries/', v_revision.id,
        '/artifacts/', (v_authority->>'artifactId'), '/', gen_random_uuid()
      )
    );

  ELSIF p_command = 'finalize_delivery_artifact' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact custody attestation is server-only.';

  ELSIF p_command = 'abandon_delivery_artifact' THEN
    UPDATE public.build_request_delivery_artifacts AS a
    SET abandoned_at = v_occurred_at, integrity_status = 'failed'
    FROM public.build_request_delivery_revisions AS d,
      public.build_request_assignments AS ba
    WHERE a.id = (p_payload->>'artifactId')::UUID
      AND a.delivery_revision_id = (p_payload->>'deliveryRevisionId')::UUID
      AND a.request_id = p_request_id
      AND d.id = a.delivery_revision_id AND d.revision_state = 'staging'
      AND ba.id = d.builder_assignment_id AND ba.active AND ba.account_id = v_actor_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Artifact abandonment is not allowed.';
    END IF;

  ELSIF p_command = 'prepare_delivery_revision' THEN
    SELECT * INTO v_revision
    FROM public.build_request_delivery_revisions AS draft_revision
    WHERE draft_revision.id = (p_payload->>'deliveryRevisionId')::UUID
      AND draft_revision.request_id = p_request_id
      AND draft_revision.revision_state = 'staging'
      AND draft_revision.accepted_brief_revision_id =
        (p_payload->>'acceptedBriefRevisionId')::UUID
      AND draft_revision.builder_assignment_id =
        (p_payload->>'activeBuilderAssignmentId')::UUID
      AND draft_revision.authored_by = v_actor_id
    FOR UPDATE;
    IF NOT FOUND OR v_request.lifecycle_state NOT IN ('building', 'repair_required') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Delivery preparation is not allowed.';
    END IF;
    PERFORM 1
    FROM public.build_request_delivery_artifacts AS locked_artifact
    WHERE locked_artifact.request_id = p_request_id
      AND locked_artifact.delivery_revision_id = v_revision.id
      AND locked_artifact.abandoned_at IS NULL
    FOR UPDATE;
    SELECT count(*), COALESCE(sum(artifact.byte_length), 0),
      min(artifact.artifact_ordinal), max(artifact.artifact_ordinal)
    INTO v_count, v_total, v_min_ordinal, v_max_ordinal
    FROM public.build_request_delivery_artifacts AS artifact
    WHERE artifact.request_id = p_request_id
      AND artifact.delivery_revision_id = v_revision.id
      AND artifact.abandoned_at IS NULL;
    IF v_count NOT BETWEEN 1 AND 5
      OR v_total NOT BETWEEN 1 AND 12000000
      OR v_min_ordinal <> 1
      OR v_max_ordinal <> v_count
      OR (
        SELECT count(DISTINCT artifact.artifact_ordinal)
        FROM public.build_request_delivery_artifacts AS artifact
        WHERE artifact.request_id = p_request_id
          AND artifact.delivery_revision_id = v_revision.id
          AND artifact.abandoned_at IS NULL
      ) <> v_count
      OR EXISTS (
        SELECT 1
        FROM public.build_request_delivery_artifacts AS artifact
        WHERE artifact.request_id = p_request_id
          AND artifact.delivery_revision_id = v_revision.id
          AND artifact.abandoned_at IS NULL
          AND (
            artifact.accepted_brief_revision_id IS DISTINCT FROM
              v_revision.accepted_brief_revision_id
            OR artifact.builder_assignment_id IS DISTINCT FROM
              v_revision.builder_assignment_id
            OR artifact.integrity_status <> 'verified'
            OR artifact.scan_state <> 'complete'
            OR artifact.scan_verdict <> 'clean'
            OR artifact.object_identity IS NULL
            OR NOT EXISTS (
              SELECT 1
              FROM public.build_request_artifact_attestations AS attestation
              WHERE attestation.request_id = artifact.request_id
                AND attestation.delivery_revision_id =
                  artifact.delivery_revision_id
                AND attestation.artifact_id = artifact.id
                AND attestation.stage_receipt_id =
                  artifact.stage_receipt_id
                AND attestation.object_identity =
                  artifact.object_identity
                AND attestation.scan_verdict = 'clean'
            )
          )
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery revision artifacts are not ready for preparation.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    IF jsonb_typeof(p_payload->'builderEvidence') <> 'array'
      OR jsonb_array_length(p_payload->'builderEvidence') NOT BETWEEN 1 AND 3 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'builderEvidence must contain 1-3 results.';
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'builderEvidence')
    LOOP
      PERFORM private.request_assert_json_keys_v1(
        v_item,
        ARRAY['acceptanceCheckId', 'result', 'evidenceText', 'evidenceRef'],
        'Builder evidence'
      );
      IF v_item->>'result' NOT IN ('pass', 'fail', 'not_run') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Builder evidence result is invalid.';
      END IF;
      INSERT INTO public.build_request_builder_evidence (
        request_id, delivery_revision_id, brief_revision_id, acceptance_check_id,
        result, evidence_text, evidence_ref
      ) VALUES (
        p_request_id, v_revision.id, v_revision.accepted_brief_revision_id,
        (v_item->>'acceptanceCheckId')::UUID, v_item->>'result',
        CASE WHEN v_item->'evidenceText' = 'null'::JSONB
          THEN NULL ELSE private.request_assert_safe_text_v1(
            v_item->>'evidenceText',
            'evidenceText', 1, 2000, TRUE
          ) END,
        CASE WHEN v_item->'evidenceRef' = 'null'::JSONB
          THEN NULL ELSE private.request_assert_opaque_v1(
            v_item->>'evidenceRef', 'evidenceRef'
          ) END
      );
    END LOOP;
    IF (
      SELECT count(*) FROM public.build_request_builder_evidence AS prepared_evidence
      WHERE prepared_evidence.delivery_revision_id = v_revision.id
    ) <> (
      SELECT count(*) FROM public.build_request_acceptance_checks AS accepted_check
      WHERE accepted_check.brief_revision_id = v_revision.accepted_brief_revision_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Builder evidence must cover every accepted check exactly once.';
    END IF;
    IF p_payload->'approvedPathForgeReference' <> 'null'::JSONB THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload->'approvedPathForgeReference',
        CASE
          WHEN p_payload->'approvedPathForgeReference'->>'kind' = 'project'
            THEN ARRAY['kind', 'projectId']
          ELSE ARRAY[
            'kind', 'projectId', 'modelVariantId', 'responseStepNumber'
          ]
        END,
        'Approved PathForge reference'
      );
    END IF;
    UPDATE public.build_request_delivery_revisions
    SET revision_state = 'prepared',
        evidence_checklist_version = 1,
        rights_snapshot_version = 1,
        revision_label = private.request_assert_safe_text_v1(
          p_payload->>'revisionLabel',
          'revisionLabel', 1, 80, TRUE
        ),
        summary = private.request_assert_safe_text_v1(
          p_payload->>'summary', 'summary', 1, 2000, TRUE
        ),
        approved_pathforge_reference =
          private.request_validate_pathforge_reference_v1(
            CASE
              WHEN p_payload->'approvedPathForgeReference' = 'null'::JSONB THEN NULL
              WHEN p_payload->'approvedPathForgeReference'->>'kind' = 'project' THEN
                jsonb_build_object(
                  'kind', 'project',
                  'project_id',
                    p_payload->'approvedPathForgeReference'->>'projectId'
                )
              ELSE jsonb_build_object(
                'kind', 'response',
                'project_id',
                  p_payload->'approvedPathForgeReference'->>'projectId',
                'model_variant_id',
                  p_payload->'approvedPathForgeReference'->>'modelVariantId',
                'response_step_number',
                  p_payload->'approvedPathForgeReference'->>'responseStepNumber'
              )
            END
          )
    WHERE id = v_revision.id;
    v_authority := jsonb_build_object('deliveryRevisionId', v_revision.id);

  ELSIF p_command IN ('submit_delivery', 'resubmit_delivery') THEN
    IF (
      SELECT count(*)
      FROM public.build_request_delivery_revisions AS prior_delivery
      WHERE prior_delivery.request_id = p_request_id
        AND prior_delivery.revision_state = 'submitted'
    ) >= 2 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Delivery revision limit has been reached.',
        DETAIL = 'request_authority:delivery_revision_limit';
    END IF;
    SELECT sealed_revision.* INTO v_revision
    FROM public.build_request_delivery_revisions AS sealed_revision
    JOIN public.build_request_assignments AS builder_assignment
      ON builder_assignment.id = sealed_revision.builder_assignment_id
    WHERE sealed_revision.id = (p_payload->>'deliveryRevisionId')::UUID
      AND sealed_revision.request_id = p_request_id
      AND sealed_revision.revision_state = 'sealed'
      AND sealed_revision.seal_receipt_id = (p_payload->>'sealReceiptId')::UUID
      AND builder_assignment.active
      AND builder_assignment.account_id = v_actor_id
      AND EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_reviewer
        WHERE active_reviewer.request_id = p_request_id
          AND active_reviewer.assignment_role = 'reviewer'
          AND active_reviewer.active
          AND active_reviewer.account_id IS NOT NULL
          AND active_reviewer.account_id IS DISTINCT FROM
            builder_assignment.account_id
      )
    FOR UPDATE OF sealed_revision;
    IF NOT FOUND OR (
      p_command = 'submit_delivery' AND v_request.lifecycle_state <> 'building'
    ) OR (
      p_command = 'resubmit_delivery' AND v_request.lifecycle_state <> 'repair_required'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sealed delivery submission is not allowed.';
    END IF;
    UPDATE public.build_request_delivery_revisions
    SET revision_number = COALESCE((
          SELECT max(previous_revision.revision_number) + 1
          FROM public.build_request_delivery_revisions AS previous_revision
          WHERE previous_revision.request_id = p_request_id
            AND previous_revision.revision_state = 'submitted'
        ), 1),
        revision_state = 'submitted',
        submitted_at = v_occurred_at
    WHERE id = v_revision.id;
    UPDATE public.build_requests
    SET current_delivery_revision_id = v_revision.id,
        lifecycle_state = 'review_pending'
    WHERE id = p_request_id;
    v_authority := jsonb_build_object('deliveryRevisionId', v_revision.id);

  ELSIF p_command IN ('approve_delivery', 'request_repair') THEN
    IF COALESCE(p_payload->>'manifestDigest', '') !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery manifest digest is invalid.';
    END IF;
    SELECT d.* INTO v_revision
    FROM public.build_request_delivery_revisions AS d
    JOIN public.build_request_assignments AS ra
      ON ra.request_id = d.request_id AND ra.assignment_role = 'reviewer'
      AND ra.active AND ra.account_id = v_actor_id
    WHERE d.id = (p_payload->>'deliveryRevisionId')::UUID
      AND d.request_id = p_request_id AND d.revision_state = 'submitted'
      AND d.id = v_request.current_delivery_revision_id
      AND d.artifact_manifest_digest = lower(p_payload->>'manifestDigest');
    IF NOT FOUND OR v_request.lifecycle_state <> 'review_pending' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Delivery review is not allowed.';
    END IF;
    BEGIN
      v_count := (p_payload->>'checklistVersion')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery review checklist version is invalid.';
    END;
    IF v_count IS DISTINCT FROM v_revision.evidence_checklist_version THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery review checklist version is invalid.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    SELECT reviewer_assignment.* INTO STRICT v_assignment
    FROM public.build_request_assignments AS reviewer_assignment
    WHERE reviewer_assignment.request_id = p_request_id
      AND reviewer_assignment.assignment_role = 'reviewer'
      AND reviewer_assignment.active
      AND reviewer_assignment.account_id = v_actor_id;
    IF jsonb_typeof(p_payload->'checks') <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Review checks are required.';
    END IF;
    v_review_id := gen_random_uuid();
    INSERT INTO public.build_request_delivery_reviews (
      id, request_id, delivery_revision_id, brief_revision_id,
      manifest_digest, checklist_version,
      safety_integrity_result, verdict, reason, review_notes, repair_instructions,
      reviewer_id, reviewer_assignment_id, reviewer_display_name, reviewed_at
    ) VALUES (
      v_review_id, p_request_id, v_revision.id,
      v_revision.accepted_brief_revision_id, v_revision.artifact_manifest_digest,
      v_count, p_payload->>'safetyIntegrityResult',
      CASE WHEN p_command = 'approve_delivery' THEN 'approve' ELSE 'repair' END,
      CASE WHEN p_command = 'request_repair' THEN
        private.request_assert_safe_text_v1(
          p_payload->>'reason', 'reason', 1, 2000, TRUE
        ) END,
      CASE WHEN p_command = 'approve_delivery' THEN
        private.request_assert_safe_text_v1(
          p_payload->>'reviewNotes', 'reviewNotes', 0, 2000, TRUE
        ) END,
      CASE WHEN p_command = 'request_repair' THEN
        private.request_assert_safe_text_v1(
          p_payload->>'repairInstructions', 'repairInstructions', 1, 2000, TRUE
        ) END,
      v_actor_id, v_assignment.id, v_display, v_occurred_at
    );
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'checks')
    LOOP
      PERFORM private.request_assert_json_keys_v1(
        v_item,
        ARRAY['acceptanceCheckId', 'result', 'evidenceRef'],
        'Review check'
      );
      INSERT INTO public.build_request_delivery_review_checks (
        request_id, review_id, brief_revision_id, acceptance_check_id, result, evidence_ref
      ) VALUES (
        p_request_id, v_review_id, v_revision.accepted_brief_revision_id,
        (v_item->>'acceptanceCheckId')::UUID, v_item->>'result',
        CASE WHEN v_item->'evidenceRef' = 'null'::JSONB THEN NULL ELSE
          private.request_assert_opaque_v1(v_item->>'evidenceRef', 'evidenceRef') END
      );
    END LOOP;
    IF (
      SELECT count(*) FROM public.build_request_delivery_review_checks AS completed_review_check
      WHERE completed_review_check.review_id = v_review_id
    ) <> (
      SELECT count(*) FROM public.build_request_acceptance_checks AS review_acceptance_check
      WHERE review_acceptance_check.brief_revision_id = v_revision.accepted_brief_revision_id
    ) OR (
      p_command = 'approve_delivery' AND (
        p_payload->>'safetyIntegrityResult' <> 'pass'
        OR EXISTS (
          SELECT 1 FROM public.build_request_delivery_review_checks AS failed_check
          WHERE failed_check.review_id = v_review_id AND failed_check.result <> 'pass'
        )
      )
    ) OR (
      p_command = 'request_repair'
      AND p_payload->>'safetyIntegrityResult' <> 'fail'
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_review_checks AS failed_check
        WHERE failed_check.review_id = v_review_id
          AND failed_check.result = 'fail'
      )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Review must cover and satisfy accepted checks.';
    END IF;
    UPDATE public.build_requests
    SET lifecycle_state = CASE
      WHEN p_command = 'approve_delivery' THEN 'delivery_ready'
      WHEN (
        SELECT count(*)
        FROM public.build_request_delivery_revisions AS exhausted_revision
        WHERE exhausted_revision.request_id = p_request_id
          AND exhausted_revision.revision_state = 'submitted'
      ) >= 2 THEN 'closed'
      ELSE 'repair_required'
    END,
    close_reason = CASE
      WHEN p_command = 'request_repair' AND (
        SELECT count(*)
        FROM public.build_request_delivery_revisions AS exhausted_revision
        WHERE exhausted_revision.request_id = p_request_id
          AND exhausted_revision.revision_state = 'submitted'
      ) >= 2 THEN 'failed_review'
      ELSE NULL
    END,
    close_explanation = CASE
      WHEN p_command = 'request_repair' AND (
        SELECT count(*)
        FROM public.build_request_delivery_revisions AS exhausted_revision
        WHERE exhausted_revision.request_id = p_request_id
          AND exhausted_revision.revision_state = 'submitted'
      ) >= 2 THEN 'The delivery did not pass final review.'
      ELSE close_explanation
    END,
    terminal_at = CASE
      WHEN p_command = 'request_repair' AND (
        SELECT count(*)
        FROM public.build_request_delivery_revisions AS exhausted_revision
        WHERE exhausted_revision.request_id = p_request_id
          AND exhausted_revision.revision_state = 'submitted'
      ) >= 2 THEN COALESCE(terminal_at, v_occurred_at)
      ELSE terminal_at
    END,
    delivery_response_started_at = CASE
      WHEN p_command = 'approve_delivery' THEN v_occurred_at
      ELSE NULL
    END
    WHERE id = p_request_id;

  ELSIF p_command = 'acknowledge_delivery' THEN
    -- request_command_provenance_v1: acknowledgement revision binding
    IF v_request.requester_id <> v_actor_id
      OR v_request.lifecycle_state <> 'delivery_ready'
      OR (p_payload->>'deliveryRevisionId')::UUID
        IS DISTINCT FROM v_request.current_delivery_revision_id THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Delivery acknowledgement is not allowed.';
    END IF;
    UPDATE public.build_requests
    SET lifecycle_state = 'delivered',
        delivery_response_started_at =
          COALESCE(delivery_response_started_at, v_occurred_at)
    WHERE id = p_request_id;

  ELSIF p_command = 'requester_delivery_outcome' THEN
    IF COALESCE(p_payload->>'manifestDigest', '') !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery manifest digest is invalid.';
    END IF;
    -- request_command_provenance_v1: requester outcome revision binding
    IF v_request.requester_id <> v_actor_id
      OR v_request.lifecycle_state NOT IN ('delivery_ready', 'delivered')
      OR (p_payload->>'deliveryRevisionId')::UUID
        IS DISTINCT FROM v_request.current_delivery_revision_id
      OR NOT EXISTS (
        SELECT 1 FROM public.build_request_delivery_revisions AS outcome_revision
        WHERE outcome_revision.id = v_request.current_delivery_revision_id
          AND outcome_revision.artifact_manifest_digest = lower(p_payload->>'manifestDigest')
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Requester outcome is not allowed.';
    END IF;
    SELECT * INTO STRICT v_revision
    FROM public.build_request_delivery_revisions AS outcome_revision
    WHERE outcome_revision.id = v_request.current_delivery_revision_id
      AND outcome_revision.request_id = p_request_id
      AND outcome_revision.artifact_manifest_digest =
        lower(p_payload->>'manifestDigest');
    v_outcome_id := gen_random_uuid();
    IF p_payload->>'outcome' = 'useful' THEN
      INSERT INTO public.build_request_requester_outcomes (
        id, request_id, delivery_revision_id, manifest_digest,
        brief_revision_id, requester_id, outcome, occurred_at
      ) VALUES (
        v_outcome_id, p_request_id, v_revision.id,
        v_revision.artifact_manifest_digest,
        v_revision.accepted_brief_revision_id, v_actor_id,
        'useful', v_occurred_at
      );
      v_event_metadata := jsonb_build_object('outcome', 'useful');
      UPDATE public.build_requests
      SET lifecycle_state = 'completed',
          terminal_at = COALESCE(terminal_at, v_occurred_at)
      WHERE id = p_request_id;
    ELSIF p_payload->>'outcome' = 'failed_acceptance_check' AND EXISTS (
      SELECT 1 FROM public.build_request_acceptance_checks AS failed_acceptance
      WHERE failed_acceptance.brief_revision_id = v_request.current_brief_revision_id
        AND failed_acceptance.id = (p_payload->>'failedAcceptanceCheckId')::UUID
    ) THEN
      INSERT INTO public.build_request_requester_outcomes (
        id, request_id, delivery_revision_id, manifest_digest,
        brief_revision_id, requester_id, outcome, acceptance_check_id,
        reason, reason_digest, occurred_at
      ) VALUES (
        v_outcome_id, p_request_id, v_revision.id,
        v_revision.artifact_manifest_digest,
        v_revision.accepted_brief_revision_id, v_actor_id,
        'failed_acceptance_check',
        (p_payload->>'failedAcceptanceCheckId')::UUID,
        private.request_assert_safe_text_v1(
          p_payload->>'reason', 'reason', 1, 2000, TRUE
        ),
        private.request_pseudonym_text_v1(
          btrim(p_payload->>'reason', E' \t\n\f\v')
        ),
        v_occurred_at
      );
      v_event_metadata := jsonb_build_object(
        'outcome', 'failed_acceptance_check',
        'acceptanceCheckId', p_payload->>'failedAcceptanceCheckId',
        'reason', btrim(p_payload->>'reason', E' \t\n\f\v')
      );
      UPDATE public.build_requests
      SET lifecycle_state = CASE
            WHEN (
              SELECT count(*)
              FROM public.build_request_delivery_revisions AS exhausted_revision
              WHERE exhausted_revision.request_id = p_request_id
                AND exhausted_revision.revision_state = 'submitted'
            ) >= 2 THEN 'closed'
            ELSE 'repair_required'
          END,
          close_reason = CASE
            WHEN (
              SELECT count(*)
              FROM public.build_request_delivery_revisions AS exhausted_revision
              WHERE exhausted_revision.request_id = p_request_id
                AND exhausted_revision.revision_state = 'submitted'
            ) >= 2 THEN 'failed_review'
            ELSE NULL
          END,
          close_explanation = CASE
            WHEN (
              SELECT count(*)
              FROM public.build_request_delivery_revisions AS exhausted_revision
              WHERE exhausted_revision.request_id = p_request_id
                AND exhausted_revision.revision_state = 'submitted'
            ) >= 2 THEN 'The delivery did not pass final acceptance.'
            ELSE close_explanation
          END,
          terminal_at = CASE
            WHEN (
              SELECT count(*)
              FROM public.build_request_delivery_revisions AS exhausted_revision
              WHERE exhausted_revision.request_id = p_request_id
                AND exhausted_revision.revision_state = 'submitted'
            ) >= 2 THEN COALESCE(terminal_at, v_occurred_at)
            ELSE terminal_at
          END
      WHERE id = p_request_id;
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Requester outcome is invalid.';
    END IF;

  ELSIF p_command IN ('close', 'close_no_response', 'withdraw') THEN
    IF p_command = 'withdraw' THEN
      IF v_request.requester_id <> v_actor_id
        OR v_request.lifecycle_state NOT IN (
          'submitted', 'triage', 'clarification_requested', 'accepted',
          'building', 'review_pending', 'repair_required'
        ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'withdraw is not allowed.';
      END IF;
      UPDATE public.build_requests
      SET lifecycle_state = 'closed', close_reason = 'withdrawn',
          close_explanation = private.request_assert_safe_text_v1(
            p_payload->>'reason', 'reason', 1, 2000, TRUE
          ),
          publication_state = 'withdrawn',
          terminal_at = COALESCE(terminal_at, v_occurred_at)
      WHERE id = p_request_id;
    ELSE
      IF NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'close is not allowed.';
      END IF;
      IF p_command = 'close_no_response' THEN
        IF v_request.lifecycle_state NOT IN ('delivery_ready', 'delivered')
          OR v_request.delivery_response_started_at IS NULL
          OR v_request.delivery_response_started_at >
            v_occurred_at - INTERVAL '14 days'
          OR NOT EXISTS (
            SELECT 1
            FROM public.build_request_delivery_revisions AS no_response_revision
            JOIN public.build_request_delivery_reviews AS no_response_review
              ON no_response_review.delivery_revision_id = no_response_revision.id
            WHERE no_response_revision.id = v_request.current_delivery_revision_id
              AND no_response_review.verdict = 'approve'
          ) THEN
          RAISE EXCEPTION USING ERRCODE = '55000',
            MESSAGE = 'No-response close is not yet eligible.';
        END IF;
        UPDATE public.build_requests
        SET lifecycle_state = 'closed', close_reason = 'no_response',
            terminal_at = COALESCE(terminal_at, v_occurred_at)
        WHERE id = p_request_id;
      ELSE
        IF p_payload->>'reason' NOT IN (
          'existing_resolution', 'duplicate', 'out_of_scope',
          'capacity_unavailable', 'declined', 'expired'
        ) THEN
          RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'Close reason is invalid.';
        END IF;
        IF NOT (
          private.request_allowed_close_reasons_v1(p_request_id, v_actor_id)
            ? (p_payload->>'reason')
        ) THEN
          RAISE EXCEPTION USING ERRCODE = '55000',
            MESSAGE = 'Close reason is not eligible for the current request state.',
            DETAIL = 'request_authority:invalid_transition';
        END IF;
        IF p_payload->>'reason' = 'existing_resolution' THEN
          IF p_payload->'resolutionReference' IS NULL
            OR p_payload->'resolutionReference' = 'null'::JSONB THEN
            RAISE EXCEPTION USING ERRCODE = '22023',
              MESSAGE = 'Existing resolution requires an approved PathForge reference.';
          END IF;
          PERFORM private.request_assert_json_keys_v1(
            p_payload->'resolutionReference',
            CASE
              WHEN p_payload->'resolutionReference'->>'kind' = 'project'
                THEN ARRAY['kind', 'projectId']
              ELSE ARRAY[
                'kind', 'projectId', 'modelVariantId', 'responseStepNumber'
              ]
            END,
            'Resolution reference'
          );
          v_reference := private.request_validate_pathforge_reference_v1(
            CASE
              WHEN p_payload->'resolutionReference'->>'kind' = 'project' THEN
                jsonb_build_object(
                  'kind', 'project',
                  'project_id', p_payload->'resolutionReference'->>'projectId'
                )
              ELSE jsonb_build_object(
                'kind', 'response',
                'project_id', p_payload->'resolutionReference'->>'projectId',
                'model_variant_id',
                  p_payload->'resolutionReference'->>'modelVariantId',
                'response_step_number',
                  p_payload->'resolutionReference'->>'responseStepNumber'
              )
            END
          );
        ELSIF p_payload->'resolutionReference' IS NOT NULL
          AND p_payload->'resolutionReference' <> 'null'::JSONB THEN
          RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'Only an existing-resolution close may include a resolution reference.';
        END IF;
        IF p_payload->>'reason' <> 'duplicate' THEN
          PERFORM private.request_assert_safe_text_v1(
            p_payload->>'note', 'note', 1, 2000, TRUE
          );
        END IF;
        UPDATE public.build_requests
        SET lifecycle_state = 'closed', close_reason = p_payload->>'reason',
            close_explanation = CASE
              WHEN p_payload->>'reason' = 'duplicate'
                THEN 'Closed because this request duplicates an existing request.'
              ELSE btrim(p_payload->>'note', E' \t\n\f\v')
            END,
            resolution_reference = v_reference,
            terminal_at = COALESCE(terminal_at, v_occurred_at)
        WHERE id = p_request_id;
        v_event_metadata := jsonb_strip_nulls(jsonb_build_object(
          'reason', p_payload->>'reason',
          'resolutionReference', CASE
            WHEN v_reference IS NULL THEN NULL
            WHEN v_reference->>'kind' = 'project' THEN
              jsonb_build_object(
                'kind', 'project',
                'projectId', v_reference->>'project_id'
              )
            ELSE jsonb_build_object(
              'kind', 'response',
              'projectId', v_reference->>'project_id',
              'modelVariantId', v_reference->>'model_variant_id',
              'responseStepNumber',
                (v_reference->>'response_step_number')::INTEGER
            )
          END
        ));
      END IF;
    END IF;

  ELSIF p_command = 'place_moderation_hold' THEN
    IF v_actor_role <> 'admin' OR v_request.moderation_state <> 'clear'
      OR EXISTS (
        SELECT 1 FROM public.build_request_retention_holds AS existing_hold
        WHERE existing_hold.request_id = p_request_id
          AND existing_hold.hold_kind = 'moderation'
          AND existing_hold.released_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
        WHERE cleanup_claim.request_id = p_request_id
          AND cleanup_claim.resolved_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_receipts AS cleaned_artifact
        WHERE cleaned_artifact.request_id = p_request_id
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Moderation hold is not allowed.';
    END IF;
    INSERT INTO public.build_request_retention_holds (
      request_id, hold_kind, reason, placed_by, placed_at
    ) VALUES (
      p_request_id, 'moderation',
      private.request_assert_safe_text_v1(
        p_payload->>'reason', 'reason', 1, 2000, TRUE
      ),
      v_actor_id, v_occurred_at
    );
    UPDATE public.build_requests SET moderation_state = 'held' WHERE id = p_request_id;

  ELSIF p_command = 'release_moderation_hold' THEN
    IF v_actor_role <> 'admin' OR v_request.moderation_state <> 'held'
      OR (
        SELECT count(*) FROM public.build_request_retention_holds AS active_hold_count
        WHERE active_hold_count.request_id = p_request_id
          AND active_hold_count.hold_kind = 'moderation'
          AND active_hold_count.released_at IS NULL
      ) <> 1 THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Moderation release is not allowed.';
    END IF;
    UPDATE public.build_request_retention_holds AS active_hold
    SET released_by = v_actor_id, released_at = v_occurred_at,
        release_resolution = private.request_assert_safe_text_v1(
          p_payload->>'resolution', 'resolution', 1, 2000, TRUE
        )
    WHERE active_hold.request_id = p_request_id
      AND active_hold.hold_kind = 'moderation'
      AND active_hold.released_at IS NULL;
    UPDATE public.build_requests SET moderation_state = 'clear' WHERE id = p_request_id;

  ELSIF p_command = 'remove_for_moderation' THEN
    IF v_actor_role <> 'admin'
      OR v_request.moderation_state = 'removed' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Moderation removal is not allowed.';
    END IF;
    v_event_metadata := jsonb_build_object(
      'reason',
      private.request_assert_safe_text_v1(
        p_payload->>'reason', 'reason', 1, 2000, TRUE
      )
    );
    UPDATE public.build_request_retention_holds AS moderation_hold
    SET released_by = v_actor_id,
        released_at = v_occurred_at,
        release_resolution = 'Closed by irreversible moderation removal.'
    WHERE moderation_hold.request_id = p_request_id
      AND moderation_hold.hold_kind = 'moderation'
      AND moderation_hold.released_at IS NULL;
    UPDATE public.build_requests AS request_case
    SET moderation_state = 'removed',
        lifecycle_state = CASE
          WHEN request_case.lifecycle_state IN ('completed', 'closed')
            THEN request_case.lifecycle_state
          ELSE 'closed'
        END,
        close_reason = CASE
          WHEN request_case.lifecycle_state IN ('completed', 'closed')
            THEN request_case.close_reason
          ELSE 'safety_removed'
        END,
        terminal_at = CASE
          WHEN request_case.lifecycle_state IN ('completed', 'closed')
            THEN request_case.terminal_at
          ELSE COALESCE(request_case.terminal_at, v_occurred_at)
        END,
        publication_state = 'withdrawn'
    WHERE request_case.id = p_request_id;

  ELSE
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported request command.';
  END IF;

  UPDATE public.build_requests
  SET version = version + 1, updated_at = v_occurred_at
  WHERE id = p_request_id
  RETURNING * INTO v_request;
  IF v_request.lifecycle_state IN ('completed', 'closed') THEN
    UPDATE public.build_request_assignments AS terminal_assignment
    SET active = FALSE, ended_at = COALESCE(terminal_assignment.ended_at, v_occurred_at)
    WHERE terminal_assignment.request_id = p_request_id
      AND terminal_assignment.active;
    UPDATE public.build_request_participants AS terminal_participant
    SET active = FALSE
    WHERE terminal_participant.request_id = p_request_id
      AND terminal_participant.active;
  END IF;
  SELECT COALESCE(max(next_event.sequence) + 1, 1) INTO v_sequence
  FROM public.build_request_events AS next_event
  WHERE next_event.request_id = p_request_id;
  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_id, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, command_receipt_id, outbox_id,
    participant_visible, safe_metadata, redactable_reason, occurred_at
  ) VALUES (
    v_event_id, p_request_id, v_sequence, p_command, v_actor_id,
    v_event_actor_role,
    v_before.lifecycle_state, v_before.moderation_state,
    v_before.publication_state, v_before.close_reason,
    v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason, v_request.version,
    p_idempotency_key, v_command_id, v_command_id, v_command_id, TRUE,
    v_event_metadata - 'reason',
    v_event_metadata->>'reason',
    v_occurred_at
  );
  INSERT INTO public.build_request_command_receipts (
    id, actor_id, idempotency_key, request_id, command_kind, request_hash,
    request_version, lifecycle_state, moderation_state, publication_state,
    close_reason, event_id, receipt, created_at
  ) VALUES (
    v_command_id, v_actor_id, p_idempotency_key, p_request_id, p_command, v_hash,
    v_request.version, v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason, v_event_id,
    jsonb_build_object('authority_result', v_authority), v_occurred_at
  );
  IF p_command = 'stage_delivery_artifact' THEN
    UPDATE public.build_request_delivery_artifacts AS staged_receipt_artifact
    SET stage_receipt_id = v_command_id
    WHERE staged_receipt_artifact.id = (v_authority->>'artifactId')::UUID
      AND staged_receipt_artifact.request_id = p_request_id;
  END IF;
  INSERT INTO public.build_request_outbox (
    id, request_id, event_id, topic, payload, available_at
  ) VALUES (
    v_command_id, p_request_id, v_event_id, 'request_event_v1',
    jsonb_build_object('request_id', p_request_id, 'event_id', v_event_id, 'kind', p_command),
    v_occurred_at
  );
  RETURN QUERY SELECT * FROM private.request_receipt_v1(
    v_command_id, p_request_id, v_event_id, FALSE, v_occurred_at, v_authority
  );
END;
$$;

REVOKE ALL ON FUNCTION public.build_request_command_v1(
  INTEGER, UUID, INTEGER, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.build_request_command_v1(
  INTEGER, UUID, INTEGER, TEXT, TEXT, JSONB
) TO authenticated;

DO $request_command_provenance_postflight$
DECLARE
  v_function REGPROCEDURE :=
    to_regprocedure(
      'public.build_request_command_v1(integer,uuid,integer,text,text,jsonb)'
    );
  v_definition TEXT;
BEGIN
  SELECT regexp_replace(
    pg_catalog.pg_get_functiondef(v_function), '\s+', ' ', 'g'
  )
  INTO STRICT v_definition;

  IF position(
      'request_command_provenance_v1: stage accepted brief validation'
        IN v_definition
    ) = 0
    OR position(
      'request_command_provenance_v1: requester outcome revision validation'
        IN v_definition
    ) = 0
    OR position(
      'request_command_provenance_v1: stage accepted brief binding'
        IN v_definition
    ) = 0
    OR position(
      'request_command_provenance_v1: requester outcome revision binding'
        IN v_definition
    ) = 0
    OR position(
      'request_command_provenance_v1: acknowledgement revision validation'
        IN v_definition
    ) = 0
    OR position(
      'request_command_provenance_v1: acknowledgement revision binding'
        IN v_definition
    ) = 0
    OR NOT has_function_privilege(
      'authenticated',
      'public.build_request_command_v1(integer,uuid,integer,text,text,jsonb)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'anon',
      'public.build_request_command_v1(integer,uuid,integer,text,text,jsonb)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'service_role',
      'public.build_request_command_v1(integer,uuid,integer,text,text,jsonb)',
      'EXECUTE'
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request command provenance repair did not converge.';
  END IF;
END;
$request_command_provenance_postflight$;


DO $request_upgrade_surfaces_preflight$
DECLARE
  v_helper REGPROCEDURE :=
    to_regprocedure(
      'private.request_publication_preservation_active_v1(uuid)'
    );
  v_maintenance REGPROCEDURE :=
    to_regprocedure(
      'public.list_build_request_maintenance_work_v1(integer,text,integer)'
    );
  v_expiry REGPROCEDURE :=
    to_regprocedure(
      'public.expire_build_request_audit_tombstone_v1(integer,uuid,text)'
    );
  v_admission REGPROCEDURE :=
    to_regprocedure(
      'public.set_build_request_pilot_admission_v1(integer,uuid,integer,text,boolean,text,timestamp with time zone)'
    );
  v_helper_definition TEXT;
  v_maintenance_definition TEXT;
  v_expiry_definition TEXT;
  v_admission_definition TEXT;
  v_maintenance_repaired BOOLEAN;
  v_expiry_repaired BOOLEAN;
  v_admission_repaired BOOLEAN;
  v_secure_count INTEGER;
BEGIN
  IF to_regclass('public.build_request_publication_proposals') IS NULL
    OR v_helper IS NULL
    OR v_maintenance IS NULL
    OR v_expiry IS NULL
    OR v_admission IS NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request upgrade authority is incomplete.';
  END IF;

  SELECT count(*)::INTEGER
  INTO v_secure_count
  FROM pg_catalog.pg_proc AS procedure
  JOIN pg_catalog.pg_roles AS owner_role
    ON owner_role.oid = procedure.proowner
  WHERE procedure.oid IN (
      v_helper::OID,
      v_maintenance::OID,
      v_expiry::OID,
      v_admission::OID
    )
    AND owner_role.rolname = 'postgres'
    AND procedure.prosecdef
    AND procedure.proconfig = ARRAY['search_path=""']::TEXT[];

  IF v_secure_count <> 4 THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request upgrade security envelope drifted.';
  END IF;

  SELECT
    pg_catalog.pg_get_functiondef(v_helper),
    pg_catalog.pg_get_functiondef(v_maintenance),
    pg_catalog.pg_get_functiondef(v_expiry),
    pg_catalog.pg_get_functiondef(v_admission)
  INTO STRICT
    v_helper_definition,
    v_maintenance_definition,
    v_expiry_definition,
    v_admission_definition;

  IF position(
      'build_request_publication_proposals' IN v_helper_definition
    ) = 0
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request publication preservation authority is not active.';
  END IF;

  v_maintenance_repaired := position(
    'request_publication_preservation_v1: maintenance enumeration fence'
      IN v_maintenance_definition
  ) > 0;
  v_expiry_repaired := position(
    'request_publication_preservation_v1: audit expiry fence'
      IN v_expiry_definition
  ) > 0;
  v_admission_repaired := position(
    'request_pilot_admission_replay_v1: replay precedes mutable subject validation'
      IN v_admission_definition
  ) > 0;

  IF NOT (
    (
      NOT v_maintenance_repaired
      AND NOT v_expiry_repaired
      AND NOT v_admission_repaired
    )
    OR (
      v_maintenance_repaired
      AND v_expiry_repaired
      AND v_admission_repaired
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request upgrade surfaces are partially drifted.';
  END IF;
END;
$request_upgrade_surfaces_preflight$;

CREATE OR REPLACE FUNCTION public.list_build_request_maintenance_work_v1(
  p_contract_version INTEGER,
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cursor JSONB;
  v_cursor_work_key TEXT;
  v_items JSONB;
  v_next TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request maintenance enumeration is not allowed.';
  END IF;
  IF p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 100
    OR char_length(COALESCE(p_cursor, '')) > 600 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request maintenance query is invalid.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rqm1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY['version', 'kind', 'workKey'],
        'Request maintenance cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'maintenance'
        OR v_cursor->>'workKey' IS NULL
        OR char_length(v_cursor->>'workKey') NOT BETWEEN 38 AND 112
        OR v_cursor->>'workKey' !~
          '^((1|3|4):[0-9a-f-]{36}|(2):[0-9a-f-]{36}:[0-9a-f-]{36}:[0-9a-f-]{36}|5:[0-9a-f-]{36}:[0-9a-f-]{36})$' THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Request maintenance cursor is invalid.';
      END IF;
      v_cursor_work_key := v_cursor->>'workKey';
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Request maintenance cursor is invalid.';
    END;
  END IF;
  WITH eligible_work AS (
    SELECT
      '1:' || request_case.id::TEXT AS work_key,
      jsonb_build_object(
        'category', 'raw_text_purge',
        'requestId', request_case.id
      ) AS item
    FROM public.build_requests AS request_case
    WHERE request_case.terminal_at IS NOT NULL
      AND request_case.raw_text_purged_at IS NULL
      AND request_case.moderation_state <> 'held'
      AND request_case.terminal_at + INTERVAL '90 days' <= clock_timestamp()
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_retention_holds AS active_hold
        WHERE active_hold.request_id = request_case.id
          AND active_hold.released_at IS NULL
      )
    UNION ALL
    SELECT
      '2:' || artifact.request_id::TEXT || ':' ||
        artifact.delivery_revision_id::TEXT || ':' || artifact.id::TEXT,
      jsonb_build_object(
        'category', 'artifact_cleanup',
        'requestId', artifact.request_id,
        'deliveryRevisionId', artifact.delivery_revision_id,
        'artifactId', artifact.id
      )
    FROM public.build_request_delivery_artifacts AS artifact
    JOIN public.build_requests AS request_case
      ON request_case.id = artifact.request_id
    WHERE request_case.terminal_at IS NOT NULL
      AND request_case.terminal_at + INTERVAL '90 days' <= clock_timestamp()
      AND (
        (
          request_case.moderation_state <> 'held'
          AND NOT EXISTS (
            SELECT 1
            FROM public.build_request_retention_holds AS active_hold
            WHERE active_hold.request_id = request_case.id
              AND active_hold.released_at IS NULL
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
          WHERE cleanup_claim.request_id = artifact.request_id
            AND cleanup_claim.delivery_revision_id =
              artifact.delivery_revision_id
            AND cleanup_claim.artifact_id = artifact.id
            AND cleanup_claim.resolved_at IS NULL
            AND cleanup_claim.delete_started_at IS NOT NULL
        )
      )
      AND (
        NOT EXISTS (
          SELECT 1
          FROM public.build_request_artifact_cleanup_receipts AS cleanup_receipt
          WHERE cleanup_receipt.request_id = artifact.request_id
            AND cleanup_receipt.delivery_revision_id =
              artifact.delivery_revision_id
            AND cleanup_receipt.artifact_id = artifact.id
        )
        OR EXISTS (
          SELECT 1
          FROM storage.objects AS stored_object
          WHERE stored_object.bucket_id = 'request-build-deliveries'
            AND stored_object.name IN (
              artifact.staging_identity, artifact.object_identity
            )
        )
      )
    UNION ALL
    SELECT
      '3:' || request_case.id::TEXT,
      jsonb_build_object(
        'category', 'audit_tombstone_expiry',
        'requestId', request_case.id
      )
    FROM public.build_requests AS request_case
    WHERE request_case.terminal_at IS NOT NULL
      AND request_case.raw_text_purged_at IS NOT NULL
      AND request_case.audit_tombstone_until IS NOT NULL
      AND request_case.audit_tombstone_until <= clock_timestamp()
      AND request_case.moderation_state <> 'held'
      -- request_publication_preservation_v1: maintenance enumeration fence
      AND NOT private.request_publication_preservation_active_v1(
        request_case.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_retention_holds AS active_hold
        WHERE active_hold.request_id = request_case.id
          AND active_hold.released_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_artifacts AS artifact
        JOIN storage.objects AS stored_object
          ON stored_object.bucket_id = 'request-build-deliveries'
          AND stored_object.name IN (
            artifact.staging_identity, artifact.object_identity
        )
        WHERE artifact.request_id = request_case.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_artifacts AS artifact
        WHERE artifact.request_id = request_case.id
          AND NOT EXISTS (
            SELECT 1
            FROM public.build_request_artifact_cleanup_receipts
              AS cleanup_receipt
            WHERE cleanup_receipt.request_id = artifact.request_id
              AND cleanup_receipt.delivery_revision_id =
                artifact.delivery_revision_id
              AND cleanup_receipt.artifact_id = artifact.id
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
        WHERE cleanup_claim.request_id = request_case.id
          AND cleanup_claim.resolved_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_revisions AS active_workspace
        WHERE active_workspace.request_id = request_case.id
          AND active_workspace.revision_state IN (
            'staging', 'prepared', 'sealed'
          )
      )
    UNION ALL
    SELECT
      '4:' || receipt.id::TEXT,
      jsonb_build_object(
        'category', 'account_deidentification_receipt_expiry',
        'receiptId', receipt.id
      )
    FROM public.build_request_account_deidentification_receipts AS receipt
    WHERE receipt.expires_at <= clock_timestamp()
    UNION ALL
    SELECT
      '5:' || revision.request_id::TEXT || ':' || revision.id::TEXT,
      jsonb_build_object(
        'category', 'delivery_revision_retirement',
        'requestId', revision.request_id,
        'deliveryRevisionId', revision.id,
        'expectedVersion', request_case.version
      )
    FROM public.build_request_delivery_revisions AS revision
    JOIN public.build_requests AS request_case
      ON request_case.id = revision.request_id
    WHERE request_case.lifecycle_state IN ('completed', 'closed')
      AND revision.revision_state IN ('staging', 'prepared', 'sealed')
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_assignment
        WHERE active_assignment.request_id = request_case.id
          AND active_assignment.active
      )
  ),
  page AS (
    SELECT eligible_work.work_key, eligible_work.item,
      row_number() OVER (ORDER BY eligible_work.work_key) AS row_number
    FROM eligible_work
    WHERE p_cursor IS NULL
      OR eligible_work.work_key > v_cursor_work_key
    ORDER BY eligible_work.work_key
    LIMIT p_limit + 1
  )
  SELECT COALESCE(jsonb_agg(
      page.item ORDER BY page.work_key
    ) FILTER (WHERE page.row_number <= p_limit), '[]'::JSONB),
    CASE WHEN max(page.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1('rqm1', jsonb_build_object(
        'version', 1,
        'kind', 'maintenance',
        'workKey', boundary.work_key
      ))
      FROM page AS boundary
      WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM page;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_build_request_audit_tombstone_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_request public.build_requests%ROWTYPE;
  v_prior public.build_request_audit_cleanup_receipts%ROWTYPE;
  v_request_digest TEXT;
  v_request_hash TEXT;
  v_event_count INTEGER;
  v_event_aggregate_digest TEXT;
  v_manifest_digests JSONB;
  v_aggregate_digest TEXT;
  v_aggregate_payload JSONB;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request audit tombstone expiry is not allowed.';
  END IF;
  IF p_request_id IS NULL
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request audit tombstone expiry is invalid.';
  END IF;
  v_request_digest := private.request_pseudonym_text_v1(p_request_id::TEXT);
  v_request_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'contract', p_contract_version,
    'requestDigest', v_request_digest
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-audit-expiry:' || p_idempotency_key, 0
  ));
  SELECT * INTO v_prior
  FROM public.build_request_audit_cleanup_receipts AS prior
  WHERE prior.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_request_hash
      OR v_prior.request_digest <> v_request_digest THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'contractVersion', 1,
      'requestId', p_request_id,
      'cleaned', v_prior.cleaned,
      'replayed', TRUE,
      'aggregateDigest', v_prior.aggregate_digest,
      'occurredAt', v_prior.occurred_at
    );
  END IF;
  SELECT * INTO v_request
  FROM public.build_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    SELECT tombstone.aggregate_digest
    INTO v_aggregate_digest
    FROM public.build_request_audit_tombstones AS tombstone
    WHERE tombstone.request_digest = v_request_digest;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002',
        MESSAGE = 'Request audit tombstone was not found.';
    END IF;
    INSERT INTO public.build_request_audit_cleanup_receipts (
      idempotency_key, request_digest, request_hash, cleaned,
      aggregate_digest, occurred_at
    ) VALUES (
      p_idempotency_key, v_request_digest, v_request_hash, FALSE,
      v_aggregate_digest, v_now
    );
    RETURN jsonb_build_object(
      'contractVersion', 1,
      'requestId', p_request_id,
      'cleaned', FALSE,
      'replayed', FALSE,
      'aggregateDigest', v_aggregate_digest,
      'occurredAt', v_now
    );
  END IF;
  SELECT count(*)::INTEGER,
    encode(extensions.digest(convert_to(COALESCE(string_agg(
      event_value.event_digest, '' ORDER BY event_value.sequence
    ), ''), 'UTF8'), 'sha256'), 'hex')
  INTO v_event_count, v_event_aggregate_digest
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = p_request_id;
  SELECT COALESCE(jsonb_agg(
    revision.artifact_manifest_digest ORDER BY revision.revision_number
  ) FILTER (
    WHERE revision.artifact_manifest_digest IS NOT NULL
  ), '[]'::JSONB)
  INTO v_manifest_digests
  FROM public.build_request_delivery_revisions AS revision
  WHERE revision.request_id = p_request_id;
  v_aggregate_payload := jsonb_build_object(
    'requestDigest', v_request_digest,
    'lifecycleState', v_request.lifecycle_state,
    'moderationState', v_request.moderation_state,
    'publicationState', v_request.publication_state,
    'closeReason', v_request.close_reason,
    'terminalAt', v_request.terminal_at,
    'eventCount', v_event_count,
    'eventAggregateDigest', v_event_aggregate_digest,
    'manifestDigests', v_manifest_digests
  );
  v_aggregate_digest := encode(extensions.digest(
    convert_to(v_aggregate_payload::TEXT, 'UTF8'), 'sha256'
  ), 'hex');
  IF v_request.terminal_at IS NULL
    OR v_request.raw_text_purged_at IS NULL
    OR v_request.audit_tombstone_until IS NULL
    OR v_request.audit_tombstone_until > v_now
    OR v_request.moderation_state = 'held'
    -- request_publication_preservation_v1: audit expiry fence
    OR private.request_publication_preservation_active_v1(p_request_id)
    OR EXISTS (
      SELECT 1
      FROM public.build_request_retention_holds AS active_hold
      WHERE active_hold.request_id = p_request_id
        AND active_hold.released_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_delivery_artifacts AS artifact
      JOIN storage.objects AS stored_object
        ON stored_object.bucket_id = 'request-build-deliveries'
        AND stored_object.name IN (
          artifact.staging_identity, artifact.object_identity
      )
      WHERE artifact.request_id = p_request_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
      WHERE cleanup_claim.request_id = p_request_id
        AND cleanup_claim.resolved_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_delivery_revisions AS active_workspace
      WHERE active_workspace.request_id = p_request_id
        AND active_workspace.revision_state IN (
          'staging', 'prepared', 'sealed'
        )
    ) THEN
    RETURN jsonb_build_object(
      'contractVersion', 1,
      'requestId', p_request_id,
      'cleaned', FALSE,
      'replayed', FALSE,
      'aggregateDigest', v_aggregate_digest,
      'occurredAt', v_now
    );
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_delivery_artifacts AS artifact
    WHERE artifact.request_id = p_request_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_receipts AS cleanup_receipt
        WHERE cleanup_receipt.request_id = artifact.request_id
          AND cleanup_receipt.delivery_revision_id =
            artifact.delivery_revision_id
          AND cleanup_receipt.artifact_id = artifact.id
      )
  ) THEN
    RETURN jsonb_build_object(
      'contractVersion', 1,
      'requestId', p_request_id,
      'cleaned', FALSE,
      'replayed', FALSE,
      'aggregateDigest', v_aggregate_digest,
      'occurredAt', v_now
    );
  END IF;
  INSERT INTO public.build_request_audit_tombstones (
    request_digest, lifecycle_state, moderation_state, publication_state,
    close_reason, terminal_at, event_count, event_aggregate_digest,
    manifest_digests, aggregate_digest, occurred_at
  ) VALUES (
    v_request_digest, v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason,
    v_request.terminal_at, v_event_count, v_event_aggregate_digest,
    v_manifest_digests, v_aggregate_digest, v_now
  )
  ON CONFLICT (request_digest) DO NOTHING;
  INSERT INTO public.build_request_audit_cleanup_receipts (
    idempotency_key, request_digest, request_hash, cleaned,
    aggregate_digest, occurred_at
  ) VALUES (
    p_idempotency_key, v_request_digest, v_request_hash, TRUE,
    v_aggregate_digest, v_now
  );
  PERFORM set_config(
    'request_authority.audit_cleanup_request_id',
    p_request_id::TEXT,
    TRUE
  );
  PERFORM set_config(
    'request_authority.audit_cleanup_request_digest',
    v_request_digest,
    TRUE
  );
  PERFORM set_config('request_authority.audit_cleanup', 'on', TRUE);
  DELETE FROM public.build_requests
  WHERE id = p_request_id;
  RETURN jsonb_build_object(
    'contractVersion', 1,
    'requestId', p_request_id,
    'cleaned', TRUE,
    'replayed', FALSE,
    'aggregateDigest', v_aggregate_digest,
    'occurredAt', v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_build_request_pilot_admission_v1(
  p_contract_version INTEGER,
  p_account_id UUID,
  p_expected_admission_version INTEGER,
  p_idempotency_key TEXT,
  p_admitted BOOLEAN,
  p_reason TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_hash TEXT;
  v_prior public.build_request_pilot_admission_receipts%ROWTYPE;
  v_admission public.build_request_pilot_admissions%ROWTYPE;
  v_found BOOLEAN;
  v_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF private.request_actor_role_v1(v_actor_id) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request pilot admission change is not allowed.';
  END IF;
  IF p_account_id IS NULL
    OR p_expected_admission_version IS NULL
    OR p_expected_admission_version < 0
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_admitted IS NULL
    OR p_reason IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request pilot admission change is invalid.';
  END IF;
  PERFORM private.request_assert_safe_text_v1(
    p_reason, 'reason', 1, 500, TRUE
  );
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'accountId', p_account_id, 'expectedVersion', p_expected_admission_version,
    'admitted', p_admitted,
    'reason', btrim(p_reason, E' \t\n\f\v'),
    'expiresAt', CASE WHEN p_admitted THEN p_expires_at ELSE NULL END
  )::TEXT);
  -- request_pilot_admission_replay_v1: replay precedes mutable subject validation
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-admission:' || p_account_id::TEXT, 0
  ));
  SELECT prior.* INTO v_prior
  FROM public.build_request_pilot_admission_receipts AS prior
  WHERE prior.actor_id = v_actor_id
    AND prior.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'contractVersion', 1, 'accountId', v_prior.account_id,
      'admissionVersion', v_prior.admission_version,
      'admitted', v_prior.admitted, 'expiresAt', v_prior.expires_at,
      'replayed', TRUE,
      'occurredAt', v_prior.occurred_at
    );
  END IF;
  IF (p_admitted AND p_expires_at IS NOT NULL AND p_expires_at <= v_at)
    OR (NOT p_admitted AND p_expires_at IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request pilot admission expiry is invalid.';
  END IF;
  IF p_admitted AND NOT EXISTS (
    SELECT 1
    FROM public.profiles AS target_profile
    JOIN auth.users AS target_user ON target_user.id = target_profile.id
    WHERE target_profile.id = p_account_id
      AND target_user.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request pilot participant is invalid.';
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-subject:' || private.request_account_pseudonym_v1(p_account_id),
    0
  ));
  IF EXISTS (
    SELECT 1
    FROM public.build_request_deidentified_accounts AS tombstone
    WHERE tombstone.subject_digest =
      private.request_account_pseudonym_v1(p_account_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request pilot participant is invalid.';
  END IF;
  SELECT admission.* INTO v_admission
  FROM public.build_request_pilot_admissions AS admission
  WHERE admission.account_id = p_account_id
  FOR UPDATE;
  v_found := FOUND;
  IF (v_found AND v_admission.admission_version <> p_expected_admission_version)
    OR (NOT v_found AND p_expected_admission_version <> 0) THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admission_version, admitted, expires_at,
    reason, changed_by, changed_at
  ) VALUES (
    p_account_id, 1, p_admitted,
    CASE WHEN p_admitted THEN p_expires_at ELSE NULL END,
    btrim(p_reason, E' \t\n\f\v'), v_actor_id, v_at
  )
  ON CONFLICT (account_id) DO UPDATE
  SET admission_version =
        public.build_request_pilot_admissions.admission_version + 1,
      admitted = EXCLUDED.admitted,
      expires_at = EXCLUDED.expires_at,
      reason = EXCLUDED.reason,
      changed_by = EXCLUDED.changed_by,
      changed_at = EXCLUDED.changed_at
  RETURNING * INTO v_admission;
  INSERT INTO public.build_request_pilot_admission_receipts (
    actor_id, account_id, idempotency_key, request_hash,
    admission_version, admitted, expires_at, occurred_at
  ) VALUES (
    v_actor_id, p_account_id, p_idempotency_key, v_hash,
    v_admission.admission_version, v_admission.admitted,
    v_admission.expires_at, v_at
  );
  RETURN jsonb_build_object(
    'contractVersion', 1, 'accountId', p_account_id,
    'admissionVersion', v_admission.admission_version,
    'admitted', v_admission.admitted, 'expiresAt', v_admission.expires_at,
    'replayed', FALSE,
    'occurredAt', v_at
  );
END;
$$;

REVOKE ALL ON FUNCTION
  public.list_build_request_maintenance_work_v1(INTEGER, TEXT, INTEGER),
  public.expire_build_request_audit_tombstone_v1(INTEGER, UUID, TEXT)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION
  public.list_build_request_maintenance_work_v1(INTEGER, TEXT, INTEGER),
  public.expire_build_request_audit_tombstone_v1(INTEGER, UUID, TEXT)
TO service_role;

REVOKE ALL ON FUNCTION public.set_build_request_pilot_admission_v1(
  INTEGER, UUID, INTEGER, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_build_request_pilot_admission_v1(
  INTEGER, UUID, INTEGER, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ
) TO authenticated;


DO $request_upgrade_surfaces_postflight$
DECLARE
  v_maintenance_definition TEXT :=
    pg_catalog.pg_get_functiondef(
      'public.list_build_request_maintenance_work_v1(integer,text,integer)'::REGPROCEDURE
    );
  v_expiry_definition TEXT :=
    pg_catalog.pg_get_functiondef(
      'public.expire_build_request_audit_tombstone_v1(integer,uuid,text)'::REGPROCEDURE
    );
  v_admission_definition TEXT :=
    pg_catalog.pg_get_functiondef(
      'public.set_build_request_pilot_admission_v1(integer,uuid,integer,text,boolean,text,timestamp with time zone)'::REGPROCEDURE
    );
BEGIN
  IF position(
      'request_publication_preservation_v1: maintenance enumeration fence'
        IN v_maintenance_definition
    ) = 0
    OR position(
      'request_publication_preservation_v1: audit expiry fence'
        IN v_expiry_definition
    ) = 0
    OR position(
      'request_pilot_admission_replay_v1: replay precedes mutable subject validation'
        IN v_admission_definition
    ) = 0
    OR NOT has_function_privilege(
      'service_role',
      'public.list_build_request_maintenance_work_v1(integer,text,integer)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.list_build_request_maintenance_work_v1(integer,text,integer)',
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'service_role',
      'public.expire_build_request_audit_tombstone_v1(integer,uuid,text)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.expire_build_request_audit_tombstone_v1(integer,uuid,text)',
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'authenticated',
      'public.set_build_request_pilot_admission_v1(integer,uuid,integer,text,boolean,text,timestamp with time zone)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'service_role',
      'public.set_build_request_pilot_admission_v1(integer,uuid,integer,text,boolean,text,timestamp with time zone)',
      'EXECUTE'
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request upgrade surface repair did not converge.';
  END IF;
END;
$request_upgrade_surfaces_postflight$;
