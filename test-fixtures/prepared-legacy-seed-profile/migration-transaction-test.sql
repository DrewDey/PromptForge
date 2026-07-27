\set ON_ERROR_STOP on

SET request.jwt.claims = '{"role":"service_role"}';

DO $test$
DECLARE
  rowan UUID := '22000000-0000-4000-8000-000000000001';
  nora UUID := '22000000-0000-4000-8000-000000000002';
  missing_operator UUID := '22000000-0000-4000-8000-000000000003';
  unconfirmed UUID := '22000000-0000-4000-8000-000000000004';
  administrator UUID := '22000000-0000-4000-8000-000000000005';
  house_profile UUID := '22000000-0000-4000-8000-000000000006';
  result_record RECORD;
BEGIN
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (rowan, 'user', 'RowanPierce', 'Rowan Pierce'),
    (nora, 'user', 'NoraBrooks', 'Nora Brooks'),
    (missing_operator, 'user', 'MissingOperator', 'Missing Operator'),
    (unconfirmed, 'user', 'UnconfirmedSeed', 'Unconfirmed Seed'),
    (administrator, 'admin', 'PreparedAdmin', 'Prepared Admin'),
    (house_profile, 'user', 'pathforge_projects', 'PathForge Projects');

  INSERT INTO auth.users (id, email_confirmed_at, raw_app_meta_data) VALUES
    (rowan, NOW(), '{"pathforge_seed":true}'),
    (nora, NOW(), '{}'),
    (missing_operator, NOW(), '{"pathforge_seed":true}'),
    (unconfirmed, NULL, '{"pathforge_seed":true}'),
    (administrator, NOW(), '{"pathforge_seed":true}'),
    (house_profile, NOW(), '{}');

  INSERT INTO public.profile_provenance (profile_id, kind) VALUES
    (rowan, 'pathforge_seed'),
    (nora, 'pathforge_seed'),
    (missing_operator, 'pathforge_seed'),
    (unconfirmed, 'pathforge_seed'),
    (administrator, 'pathforge_seed'),
    (house_profile, 'pathforge_team');

  INSERT INTO private.pathforge_profile_operators (profile_id, kind) VALUES
    (rowan, 'pathforge_seed'),
    (nora, 'pathforge_seed'),
    (unconfirmed, 'pathforge_seed'),
    (administrator, 'pathforge_seed'),
    (house_profile, 'pathforge_team');

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
    house_profile, 'pathforge_projects', 'PathForge Projects'
  );
  IF result_record.profile_id IS DISTINCT FROM house_profile
    OR result_record.role <> 'user'
    OR result_record.provenance_kind <> 'pathforge_team'
    OR result_record.operator_kind <> 'pathforge_team'
    OR NOT result_record.email_confirmed
    OR result_record.auth_seed_marker THEN
    RAISE EXCEPTION 'The exact operated house-profile binding was not returned.';
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

  SELECT * INTO result_record
  FROM public.import_legacy_prepared_source_run(
    'd9fa40e7-7725-4387-ad5b-14f25cf744ce',
    'f25f83df-29c5-4d07-97b8-e7f6d2a902b8',
    jsonb_build_object(
      'author_id', rowan,
      'title', 'Protected Rowan import',
      'source_url', 'https://claude.ai/chat/protected-rowan-source',
      'canonical_source_url', 'https://claude.ai/chat/protected-rowan-source',
      'file_name', NULL,
      'notes', 'Fixture',
      'source_package_file', 'seed-runs/protected-rowan.json',
      'source_package_sha256', repeat('d', 64),
      'intake_evidence', jsonb_build_object('schema_version', 1)
    ),
    NULL
  );
  IF result_record.source_run_id IS DISTINCT FROM
      'd9fa40e7-7725-4387-ad5b-14f25cf744ce'::UUID
    OR NOT result_record.inserted THEN
    RAISE EXCEPTION 'The exact protected Rowan import did not pass its seed-profile gate.';
  END IF;

  SELECT * INTO result_record
  FROM public.import_legacy_prepared_source_run(
    '6a122064-6094-832a-9228-e239ce31e79b',
    '8f5f4f1c-9f59-4f18-9a5e-61c4c3f4f901',
    jsonb_build_object(
      'author_id', house_profile,
      'title', 'Protected house-profile import',
      'source_url', 'https://chatgpt.com/c/protected-house-source',
      'canonical_source_url', 'https://chatgpt.com/c/protected-house-source',
      'file_name', NULL,
      'notes', 'Fixture',
      'source_package_file', 'seed-runs/protected-house.json',
      'source_package_sha256', repeat('f', 64),
      'intake_evidence', jsonb_build_object('schema_version', 1)
    ),
    NULL
  );
  IF result_record.source_run_id IS DISTINCT FROM
      '6a122064-6094-832a-9228-e239ce31e79b'::UUID
    OR NOT result_record.inserted THEN
    RAISE EXCEPTION 'The protected house-profile import did not pass its exact binding.';
  END IF;

  BEGIN
    PERFORM public.import_legacy_prepared_source_run(
      '6a1f9bc4-c390-832f-88a5-d978d2e42577',
      '3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40',
      jsonb_build_object(
        'author_id', missing_operator,
        'title', 'Protected wrong-author import',
        'source_url', 'https://chatgpt.com/c/protected-wrong-author',
        'canonical_source_url', 'https://chatgpt.com/c/protected-wrong-author',
        'file_name', NULL,
        'notes', 'Fixture',
        'source_package_file', 'seed-runs/protected-wrong-author.json',
        'source_package_sha256', repeat('e', 64),
        'intake_evidence', jsonb_build_object('schema_version', 1)
      ),
      NULL
    );
    RAISE EXCEPTION 'A protected legacy import accepted an arbitrary author UUID.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A protected legacy import accepted an arbitrary author UUID.'
        OR SQLERRM <> 'Protected legacy import author lacks its exact confirmed seed-profile binding.' THEN
        RAISE;
      END IF;
  END;
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
