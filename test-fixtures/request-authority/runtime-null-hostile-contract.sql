\set ON_ERROR_STOP on

DO $test$
<<null_hostile>>
DECLARE
  administrator UUID := '82000000-0000-4000-8000-000000000007';
  request_id UUID;
  request_version INTEGER;
  event_count BIGINT;
  hold_count BIGINT;
  controls_before JSONB;
  admission_count BIGINT;
  acknowledgement_count BIGINT;
  target UUID := '8f000000-0000-4000-8000-000000000001';
BEGIN
  SELECT request_case.id, request_case.version
  INTO STRICT request_id, request_version
  FROM public.build_requests AS request_case
  WHERE request_case.current_delivery_revision_id IS NOT NULL
  ORDER BY request_case.submitted_at
  LIMIT 1;
  SELECT count(*) INTO event_count
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = null_hostile.request_id;
  SELECT count(*) INTO hold_count
  FROM public.build_request_retention_holds AS hold_value
  WHERE hold_value.request_id = null_hostile.request_id;
  SELECT to_jsonb(controls) INTO STRICT controls_before
  FROM public.build_request_controls AS controls
  WHERE controls.singleton;
  SELECT count(*) INTO admission_count
  FROM public.build_request_pilot_admissions;
  SELECT count(*) INTO acknowledgement_count
  FROM public.build_request_update_acknowledgements;

  INSERT INTO auth.users (id, email_confirmed_at)
  VALUES (target, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name)
  VALUES (
    target,
    'user',
    'null_hostile_target',
    'NULL Hostile Target'
  );
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', administrator, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );

  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      request_id,
      NULL,
      'null-hostile-command-version',
      'place_moderation_hold',
      jsonb_build_object('reason', 'NULL version must not mutate.')
    );
    RAISE EXCEPTION 'NULL command expectedVersion was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL command expectedVersion was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.set_build_request_controls_v1(
      1,
      NULL,
      'null-hostile-controls-version',
      FALSE,
      FALSE,
      4
    );
    RAISE EXCEPTION 'NULL controls expectedControlsVersion was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL controls expectedControlsVersion was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.set_build_request_controls_v1(
      1,
      1,
      'null-hostile-controls-capacity',
      FALSE,
      FALSE,
      NULL
    );
    RAISE EXCEPTION 'NULL active case capacity was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL active case capacity was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.set_build_request_pilot_admission_v1(
      1,
      target,
      NULL,
      'null-hostile-admission-version',
      TRUE,
      'NULL expected admission version must fail.',
      NULL
    );
    RAISE EXCEPTION 'NULL admission expectedAdmissionVersion was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL admission expectedAdmissionVersion was accepted.' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.list_my_build_requests_v1(1, NULL, NULL);
    RAISE EXCEPTION 'NULL My Forge limit was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL My Forge limit was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.list_build_request_queue_v1(1, 'admin', NULL, NULL);
    RAISE EXCEPTION 'NULL queue limit was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL queue limit was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.list_build_request_events_v1(
      1, request_id, NULL, NULL
    );
    RAISE EXCEPTION 'NULL event limit was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL event limit was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.list_build_request_eligible_assignees_v1(
      1, request_id, 'builder', '', NULL, NULL
    );
    RAISE EXCEPTION 'NULL eligible-assignee limit was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL eligible-assignee limit was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.list_build_request_eligible_assignees_v1(
      1, request_id, NULL, '', NULL, 20
    );
    RAISE EXCEPTION 'NULL assignment role was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL assignment role was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.list_build_request_pilot_admissions_v1(
      1, '', NULL, NULL
    );
    RAISE EXCEPTION 'NULL admission-directory limit was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL admission-directory limit was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.acknowledge_build_request_updates_v1(
      1,
      request_id,
      NULL,
      'null-hostile-ack-sequence'
    );
    RAISE EXCEPTION 'NULL acknowledgement sequence was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL acknowledgement sequence was accepted.' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', TRUE);
  BEGIN
    PERFORM public.retire_build_request_delivery_revision_v1(
      1,
      request_id,
      NULL,
      NULL,
      'null-hostile-retirement'
    );
    RAISE EXCEPTION 'NULL retirement binding was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL retirement binding was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.prepare_build_request_delivery_artifact_object_v1(
      1, request_id, NULL, NULL, NULL
    );
    RAISE EXCEPTION 'NULL object preparation binding was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL object preparation binding was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.resolve_build_request_delivery_artifact_cleanup_v1(
      1, request_id, NULL, NULL
    );
    RAISE EXCEPTION 'NULL artifact cleanup binding was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL artifact cleanup binding was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.resolve_build_request_delivery_revision_action_v1(
      1, NULL, request_id, NULL, NULL
    );
    RAISE EXCEPTION 'NULL delivery action binding was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL delivery action binding was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.seal_build_request_delivery_revision_v1(
      1,
      'null-hostile-seal-artifacts',
      request_id,
      NULL,
      NULL,
      NULL
    );
    RAISE EXCEPTION 'NULL seal artifact set was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL seal artifact set was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.purge_build_request_raw_text_v1(1, NULL);
    RAISE EXCEPTION 'NULL purge request id was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL purge request id was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.expire_build_request_audit_tombstone_v1(
      1, NULL, 'null-hostile-audit-expiry'
    );
    RAISE EXCEPTION 'NULL audit expiry request id was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL audit expiry request id was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.expire_build_request_account_deidentification_receipt_v1(
      1, NULL
    );
    RAISE EXCEPTION 'NULL deidentification receipt id was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL deidentification receipt id was accepted.' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.deidentify_build_request_account_v1(
      1, NULL, 'null-hostile-deidentify'
    );
    RAISE EXCEPTION 'NULL deidentification account id was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'NULL deidentification account id was accepted.' THEN RAISE; END IF;
  END;

  IF request_version <> (
      SELECT request_case.version FROM public.build_requests AS request_case
      WHERE request_case.id = null_hostile.request_id
    )
    OR event_count <> (
      SELECT count(*) FROM public.build_request_events AS event_value
      WHERE event_value.request_id = null_hostile.request_id
    )
    OR hold_count <> (
      SELECT count(*) FROM public.build_request_retention_holds AS hold_value
      WHERE hold_value.request_id = null_hostile.request_id
    )
    OR controls_before <> (
      SELECT to_jsonb(controls)
      FROM public.build_request_controls AS controls
      WHERE controls.singleton
    )
    OR admission_count <> (
      SELECT count(*) FROM public.build_request_pilot_admissions
    )
    OR acknowledgement_count <> (
      SELECT count(*) FROM public.build_request_update_acknowledgements
    ) THEN
    RAISE EXCEPTION
      'A NULL-hostile authority call mutated durable state.';
  END IF;
END;
$test$;
