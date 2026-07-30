\set ON_ERROR_STOP on

CREATE TEMP TABLE expected_request_rpc_grants (
  signature TEXT PRIMARY KEY,
  public_execute BOOLEAN NOT NULL,
  anon_execute BOOLEAN NOT NULL,
  authenticated_execute BOOLEAN NOT NULL,
  service_role_execute BOOLEAN NOT NULL
);

INSERT INTO expected_request_rpc_grants VALUES
  ('public.submit_build_request_v1(integer,text,jsonb)', FALSE, FALSE, TRUE, FALSE),
  ('public.build_request_command_v1(integer,uuid,integer,text,text,jsonb)', FALSE, FALSE, TRUE, FALSE),
  ('public.deidentify_build_request_account_v1(integer,uuid,text)', FALSE, FALSE, TRUE, TRUE),
  ('public.expire_build_request_account_deidentification_receipt_v1(integer,uuid)', FALSE, FALSE, FALSE, TRUE),
  ('public.retire_build_request_delivery_revision_v1(integer,uuid,uuid,integer,text)', FALSE, FALSE, FALSE, TRUE),
  ('public.acknowledge_build_request_updates_v1(integer,uuid,integer,text)', FALSE, FALSE, TRUE, FALSE),
  ('public.prepare_build_request_delivery_artifact_object_v1(integer,uuid,uuid,uuid,uuid)', FALSE, FALSE, FALSE, TRUE),
  ('public.attest_build_request_delivery_artifact_object_v1(integer,text,integer,uuid,uuid,uuid,uuid,uuid,integer,uuid,text,text,bigint,text,text,text)', FALSE, FALSE, FALSE, TRUE),
  ('public.resolve_build_request_delivery_artifact_custody_v1(integer,uuid,uuid,uuid)', FALSE, FALSE, FALSE, TRUE),
  ('public.resolve_build_request_delivery_artifact_cleanup_v1(integer,uuid,uuid,uuid)', FALSE, FALSE, FALSE, TRUE),
  ('public.purge_build_request_raw_text_v1(integer,uuid)', FALSE, FALSE, FALSE, TRUE),
  ('public.expire_build_request_audit_tombstone_v1(integer,uuid,text)', FALSE, FALSE, FALSE, TRUE),
  ('public.seal_build_request_delivery_revision_v1(integer,text,uuid,uuid,uuid,jsonb)', FALSE, FALSE, FALSE, TRUE),
  ('public.set_build_request_pilot_admission_v1(integer,uuid,integer,text,boolean,text,timestamp with time zone)', FALSE, FALSE, TRUE, FALSE),
  ('public.set_build_request_controls_v1(integer,integer,text,boolean,boolean,integer)', FALSE, FALSE, TRUE, FALSE),
  ('public.get_build_request_availability_v1(integer)', FALSE, TRUE, TRUE, FALSE),
  ('public.list_my_build_requests_v1(integer,text,integer)', FALSE, FALSE, TRUE, FALSE),
  ('public.list_build_request_queue_v1(integer,text,text,integer)', FALSE, FALSE, TRUE, FALSE),
  ('public.resolve_build_request_delivery_revision_action_v1(integer,uuid,uuid,uuid,text)', FALSE, FALSE, FALSE, TRUE),
  ('public.list_build_request_eligible_assignees_v1(integer,uuid,text,text,text,integer)', FALSE, FALSE, TRUE, FALSE),
  ('public.list_build_request_pilot_admissions_v1(integer,text,text,integer)', FALSE, FALSE, TRUE, FALSE),
  ('public.list_build_request_events_v1(integer,uuid,text,integer)', FALSE, FALSE, TRUE, FALSE),
  ('public.get_build_request_v1(integer,uuid)', FALSE, FALSE, TRUE, FALSE),
  ('public.resolve_build_request_delivery_artifact_v1(integer,uuid)', FALSE, FALSE, TRUE, FALSE),
  ('public.resolve_build_request_delivery_artifact_object_v1(integer,uuid,uuid)', FALSE, FALSE, FALSE, TRUE);

DO $test$
DECLARE
  mismatch_count INTEGER;
BEGIN
  WITH actual AS (
    SELECT
      format(
        '%I.%I(%s)',
        namespace_value.nspname,
        procedure_value.proname,
        replace(
          oidvectortypes(procedure_value.proargtypes),
          ', ',
          ','
        )
      ) AS signature,
      EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(
          procedure_value.proacl,
          acldefault('f', procedure_value.proowner)
        )) AS privilege
        WHERE privilege.grantee = 0
          AND privilege.privilege_type = 'EXECUTE'
      ) AS public_execute,
      has_function_privilege(
        'anon', procedure_value.oid, 'EXECUTE'
      ) AS anon_execute,
      has_function_privilege(
        'authenticated', procedure_value.oid, 'EXECUTE'
      ) AS authenticated_execute,
      has_function_privilege(
        'service_role', procedure_value.oid, 'EXECUTE'
      ) AS service_role_execute
    FROM pg_proc AS procedure_value
    JOIN pg_namespace AS namespace_value
      ON namespace_value.oid = procedure_value.pronamespace
    WHERE namespace_value.nspname = 'public'
      AND procedure_value.proname LIKE '%build_request%_v1'
  ),
  differences AS (
    SELECT
      COALESCE(expected.signature, actual.signature) AS signature
    FROM expected_request_rpc_grants AS expected
    FULL OUTER JOIN actual USING (signature)
    WHERE expected.signature IS NULL
      OR actual.signature IS NULL
      OR expected.public_execute IS DISTINCT FROM actual.public_execute
      OR expected.anon_execute IS DISTINCT FROM actual.anon_execute
      OR expected.authenticated_execute IS DISTINCT FROM
        actual.authenticated_execute
      OR expected.service_role_execute IS DISTINCT FROM
        actual.service_role_execute
  )
  SELECT count(*) INTO mismatch_count
  FROM differences;
  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'Exact public Request RPC grant matrix drifted for % signatures.',
      mismatch_count;
  END IF;
END;
$test$;
