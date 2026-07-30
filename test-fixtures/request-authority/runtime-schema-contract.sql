\set ON_ERROR_STOP on

DO $test$
DECLARE
  table_name TEXT;
  forbidden_reason TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_controls
    WHERE singleton
      AND mode = 'private_v1'
      AND NOT accepting_requests
      AND NOT assigning_requests
      AND active_case_capacity = 4
  ) THEN
    RAISE EXCEPTION 'Private request controls did not default exactly off/4.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'request-build-deliveries'
      AND name = 'request-build-deliveries'
      AND NOT public
      AND file_size_limit = 4000000
      AND allowed_mime_types = ARRAY[
        'text/html',
        'text/markdown',
        'text/plain',
        'application/json',
        'text/csv',
        'image/png',
        'image/jpeg'
      ]::TEXT[]
  ) THEN
    RAISE EXCEPTION 'Delivery bucket contract drifted.';
  END IF;

  IF has_table_privilege('anon', 'storage.objects', 'SELECT')
    OR has_table_privilege('anon', 'storage.objects', 'INSERT')
    OR has_table_privilege('authenticated', 'storage.objects', 'SELECT')
    OR has_table_privilege('authenticated', 'storage.objects', 'INSERT')
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
    ) THEN
    RAISE EXCEPTION 'Participant roles retained direct delivery-object authority.';
  END IF;

  FOR table_name IN
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'build_request%'
  LOOP
    IF has_table_privilege('anon', 'public.' || table_name, 'SELECT')
      OR has_table_privilege('authenticated', 'public.' || table_name, 'SELECT')
      OR has_table_privilege('anon', 'public.' || table_name, 'INSERT')
      OR has_table_privilege('authenticated', 'public.' || table_name, 'INSERT')
      OR has_table_privilege('anon', 'public.' || table_name, 'UPDATE')
      OR has_table_privilege('authenticated', 'public.' || table_name, 'UPDATE')
      OR has_table_privilege('anon', 'public.' || table_name, 'DELETE')
      OR has_table_privilege('authenticated', 'public.' || table_name, 'DELETE')
      OR has_table_privilege('service_role', 'public.' || table_name, 'SELECT')
      OR has_table_privilege('service_role', 'public.' || table_name, 'INSERT')
      OR has_table_privilege('service_role', 'public.' || table_name, 'UPDATE')
      OR has_table_privilege('service_role', 'public.' || table_name, 'DELETE') THEN
      RAISE EXCEPTION 'Direct participant table authority remained on %.', table_name;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND relation.relname LIKE 'build_request%'
      AND NOT relation.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'A Request authority table is missing RLS.';
  END IF;

  -- `close_reason` is absent unless and until the lifecycle is closed.
  BEGIN
    INSERT INTO public.build_requests (
      requester_display_name, lifecycle_state, close_reason
    ) VALUES ('Fixture Requester', 'submitted', 'declined');
    RAISE EXCEPTION 'A nonclosed request accepted close_reason.';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.build_requests (
      requester_display_name, lifecycle_state
    ) VALUES ('Fixture Requester', 'closed');
    RAISE EXCEPTION 'A closed request accepted a null close_reason.';
  EXCEPTION
    WHEN not_null_violation OR check_violation THEN NULL;
  END;

  FOREACH forbidden_reason IN ARRAY ARRAY[
    'completed',
    'declined_at_triage',
    'moderation_removed'
  ]
  LOOP
    BEGIN
      INSERT INTO public.build_requests (
        requester_display_name, lifecycle_state, close_reason
      ) VALUES ('Fixture Requester', 'closed', forbidden_reason);
      RAISE EXCEPTION 'Forbidden close reason % was accepted.', forbidden_reason;
    EXCEPTION
      WHEN check_violation THEN NULL;
    END;
  END LOOP;
END;
$test$;

DO $test$
DECLARE
  expected_authenticated TEXT[] := ARRAY[
    'acknowledge_build_request_updates_v1',
    'build_request_command_v1',
    'get_build_request_availability_v1',
    'get_build_request_v1',
    'list_build_request_queue_v1',
    'list_build_request_events_v1',
    'list_my_build_requests_v1',
    'resolve_build_request_delivery_artifact_v1',
    'set_build_request_controls_v1',
    'submit_build_request_v1'
  ];
  procedure_value RECORD;
  expected_service TEXT[] := ARRAY[
    'abort_build_request_delivery_artifact_cleanup_v1',
    'attest_build_request_delivery_artifact_object_v1',
    'begin_build_request_delivery_artifact_cleanup_delete_v1',
    'claim_build_request_delivery_artifact_cleanup_v1',
    'confirm_build_request_delivery_artifact_cleanup_v1',
    'list_build_request_maintenance_work_v1',
    'prepare_build_request_delivery_artifact_object_v1',
    'purge_build_request_raw_text_v1',
    'resolve_build_request_delivery_artifact_custody_v1',
    'resolve_build_request_delivery_artifact_cleanup_v1',
    'resolve_build_request_delivery_preparation_replay_v1',
    'resolve_build_request_delivery_artifact_object_v1',
    'expire_build_request_audit_tombstone_v1',
    'seal_build_request_delivery_revision_v1'
  ];
BEGIN
  FOR procedure_value IN
    SELECT
      procedure.oid,
      procedure.proname,
      pg_catalog.pg_get_function_identity_arguments(procedure.oid) AS arguments
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND (
        procedure.proname = ANY(expected_authenticated)
        OR procedure.proname = ANY(expected_service)
      )
  LOOP
    IF (
      procedure_value.proname = 'get_build_request_availability_v1'
      AND NOT has_function_privilege('anon', procedure_value.oid, 'EXECUTE')
    ) OR (
      procedure_value.proname <> 'get_build_request_availability_v1'
      AND has_function_privilege('anon', procedure_value.oid, 'EXECUTE')
    ) THEN
      RAISE EXCEPTION 'Public/anon can execute %.', procedure_value.proname;
    END IF;

    IF procedure_value.proname = ANY(expected_service) THEN
      IF has_function_privilege('authenticated', procedure_value.oid, 'EXECUTE')
        OR NOT has_function_privilege('service_role', procedure_value.oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'Object resolver grant contract drifted.';
      END IF;
    ELSIF NOT has_function_privilege(
      'authenticated',
      procedure_value.oid,
      'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'Authenticated role cannot execute %.', procedure_value.proname;
    END IF;
  END LOOP;

  IF (
    SELECT COUNT(DISTINCT procedure.proname)
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = ANY(expected_authenticated)
  ) <> cardinality(expected_authenticated) THEN
    RAISE EXCEPTION 'One or more participant Request RPCs are missing.';
  END IF;

  IF (
    SELECT COUNT(DISTINCT procedure.proname)
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = ANY(expected_service)
  ) <> cardinality(expected_service) THEN
    RAISE EXCEPTION 'One or more service-only Request custody RPCs are missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'private'
      AND procedure.proname LIKE 'request_%'
      AND (
        has_function_privilege('anon', procedure.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      )
  ) THEN
    RAISE EXCEPTION 'A private Request helper is participant executable.';
  END IF;
END;
$test$;
