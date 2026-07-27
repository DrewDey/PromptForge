\set ON_ERROR_STOP on

SET request.jwt.claims = '{"role":"service_role"}';

DO $test$
DECLARE
  rowan UUID := '22000000-0000-4000-8000-000000000001';
  nora UUID := '22000000-0000-4000-8000-000000000002';
  missing_operator UUID := '22000000-0000-4000-8000-000000000003';
  unconfirmed UUID := '22000000-0000-4000-8000-000000000004';
  administrator UUID := '22000000-0000-4000-8000-000000000005';
  result_record RECORD;
BEGIN
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (rowan, 'user', 'RowanPierce', 'Rowan Pierce'),
    (nora, 'user', 'NoraBrooks', 'Nora Brooks'),
    (missing_operator, 'user', 'MissingOperator', 'Missing Operator'),
    (unconfirmed, 'user', 'UnconfirmedSeed', 'Unconfirmed Seed'),
    (administrator, 'admin', 'PreparedAdmin', 'Prepared Admin');

  INSERT INTO auth.users (id, email_confirmed_at, raw_app_meta_data) VALUES
    (rowan, NOW(), '{"pathforge_seed":true}'),
    (nora, NOW(), '{}'),
    (missing_operator, NOW(), '{"pathforge_seed":true}'),
    (unconfirmed, NULL, '{"pathforge_seed":true}'),
    (administrator, NOW(), '{"pathforge_seed":true}');

  INSERT INTO public.profile_provenance (profile_id, kind) VALUES
    (rowan, 'pathforge_seed'),
    (nora, 'pathforge_seed'),
    (missing_operator, 'pathforge_seed'),
    (unconfirmed, 'pathforge_seed'),
    (administrator, 'pathforge_seed');

  INSERT INTO private.pathforge_profile_operators (profile_id, kind) VALUES
    (rowan, 'pathforge_seed'),
    (nora, 'pathforge_seed'),
    (unconfirmed, 'pathforge_seed'),
    (administrator, 'pathforge_seed');

  SELECT * INTO result_record
  FROM public.check_prepared_legacy_seed_profile_binding(
    rowan, 'RowanPierce', 'Rowan Pierce'
  );
  IF result_record.profile_id IS DISTINCT FROM rowan
    OR result_record.role <> 'user'
    OR result_record.provenance_kind <> 'pathforge_seed'
    OR result_record.operator_kind <> 'pathforge_seed'
    OR NOT result_record.email_confirmed
    OR NOT result_record.auth_seed_marker THEN
    RAISE EXCEPTION 'The exact protected seed binding did not return authoritative evidence.';
  END IF;

  SELECT * INTO result_record
  FROM public.check_prepared_legacy_seed_profile_binding(
    nora, 'NoraBrooks', 'Nora Brooks'
  );
  IF result_record.profile_id IS DISTINCT FROM nora
    OR NOT result_record.email_confirmed
    OR result_record.auth_seed_marker THEN
    RAISE EXCEPTION 'The historical seed binding did not expose its false Auth marker.';
  END IF;

  SELECT * INTO result_record
  FROM public.check_prepared_legacy_seed_profile_binding(
    rowan, 'WrongHandle', 'Rowan Pierce'
  );
  IF result_record.profile_id IS NOT NULL THEN
    RAISE EXCEPTION 'A mismatched prepared handle returned a seed binding.';
  END IF;

  SELECT * INTO result_record
  FROM public.check_prepared_legacy_seed_profile_binding(
    missing_operator, 'MissingOperator', 'Missing Operator'
  );
  IF result_record.profile_id IS NOT NULL THEN
    RAISE EXCEPTION 'A profile outside the private seed-operator allowlist was accepted.';
  END IF;

  SELECT * INTO result_record
  FROM public.check_prepared_legacy_seed_profile_binding(
    unconfirmed, 'UnconfirmedSeed', 'Unconfirmed Seed'
  );
  IF result_record.profile_id IS NOT NULL THEN
    RAISE EXCEPTION 'An unconfirmed Auth identity was accepted.';
  END IF;

  SELECT * INTO result_record
  FROM public.check_prepared_legacy_seed_profile_binding(
    administrator, 'PreparedAdmin', 'Prepared Admin'
  );
  IF result_record.profile_id IS NOT NULL THEN
    RAISE EXCEPTION 'An admin profile was accepted as a prepared seed byline.';
  END IF;
END;
$test$;

SET ROLE authenticated;
SET request.jwt.claims =
  '{"role":"authenticated","sub":"22000000-0000-4000-8000-000000000001"}';
DO $test$
BEGIN
  BEGIN
    PERFORM public.check_prepared_legacy_seed_profile_binding(
      '22000000-0000-4000-8000-000000000001',
      'RowanPierce',
      'Rowan Pierce'
    );
    RAISE EXCEPTION 'A non-admin authenticated user read the protected seed binding.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A non-admin authenticated user read the protected seed binding.'
        OR SQLERRM <> 'Admin or service access required.' THEN
        RAISE;
      END IF;
  END;
END;
$test$;

SET request.jwt.claims =
  '{"role":"authenticated","sub":"22000000-0000-4000-8000-000000000005"}';
DO $test$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.check_prepared_legacy_seed_profile_binding(
      '22000000-0000-4000-8000-000000000001',
      'RowanPierce',
      'Rowan Pierce'
    )
  ) <> 1 THEN
    RAISE EXCEPTION 'An authenticated administrator could not verify the exact seed binding.';
  END IF;
END;
$test$;
RESET ROLE;

SET ROLE anon;
SET request.jwt.claims = '{"role":"anon"}';
DO $test$
BEGIN
  BEGIN
    PERFORM public.check_prepared_legacy_seed_profile_binding(
      '22000000-0000-4000-8000-000000000001',
      'RowanPierce',
      'Rowan Pierce'
    );
    RAISE EXCEPTION 'Anonymous access reached the protected seed binding.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
RESET ROLE;
