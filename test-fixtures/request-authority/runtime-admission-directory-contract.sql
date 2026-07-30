\set ON_ERROR_STOP on

DO $test$
<<admission_directory>>
DECLARE
  administrator UUID := '8c000000-0000-4000-8000-000000000001';
  ordinary_user UUID := '8c000000-0000-4000-8000-000000000002';
  absent_candidate UUID := '8c000000-0000-4000-8000-000000000003';
  revoked_candidate UUID := '8c000000-0000-4000-8000-000000000004';
  active_candidate UUID := '8c000000-0000-4000-8000-000000000005';
  expired_candidate UUID := '8c000000-0000-4000-8000-000000000006';
  unconfirmed_candidate UUID := '8c000000-0000-4000-8000-000000000007';
  first_page JSONB;
  second_page JSONB;
  cursor_value TEXT;
BEGIN
  INSERT INTO auth.users (id, email_confirmed_at) VALUES
    (administrator, clock_timestamp()),
    (ordinary_user, clock_timestamp()),
    (absent_candidate, clock_timestamp()),
    (revoked_candidate, clock_timestamp()),
    (active_candidate, clock_timestamp()),
    (expired_candidate, clock_timestamp()),
    (unconfirmed_candidate, NULL);
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (administrator, 'admin', 'admission_directory_admin', 'Admission Directory Admin'),
    (ordinary_user, 'user', 'admission_directory_user', 'Admission Directory User'),
    (absent_candidate, 'user', 'admission_fixture_a', 'Admission Fixture A Absent'),
    (revoked_candidate, 'user', 'admission_fixture_b', 'Admission Fixture B Revoked'),
    (active_candidate, 'user', 'admission_fixture_c', 'Admission Fixture C Active'),
    (expired_candidate, 'user', 'admission_fixture_d', 'Admission Fixture D Expired'),
    (unconfirmed_candidate, 'user', 'admission_fixture_e', 'Admission Fixture E Unconfirmed');
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admission_version, admitted, expires_at, reason, changed_by
  ) VALUES
    (
      revoked_candidate, 2, FALSE, NULL, 'Private revoked reason',
      administrator
    ),
    (
      active_candidate, 3, TRUE, clock_timestamp() + INTERVAL '10 days',
      'Private active reason', administrator
    ),
    (
      expired_candidate, 4, TRUE, clock_timestamp() - INTERVAL '1 day',
      'Private expired reason', administrator
    ),
    (
      unconfirmed_candidate, 5, TRUE, NULL, 'Private unconfirmed reason',
      administrator
    );

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', administrator, 'role', 'authenticated')::TEXT,
    TRUE
  );
  first_page := public.list_build_request_pilot_admissions_v1(
    1, 'Admission Fixture', NULL, 2
  );
  cursor_value := first_page->>'nextCursor';
  IF jsonb_array_length(first_page->'items') <> 2
    OR cursor_value IS NULL
    OR cursor_value !~ '^rq1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(first_page->'items') AS item
      WHERE (
        SELECT array_agg(key ORDER BY key)
        FROM jsonb_object_keys(item) AS key
      ) IS DISTINCT FROM ARRAY[
        'accountId', 'admissionVersion', 'admitted', 'displayName', 'expiresAt'
      ]
    ) THEN
    RAISE EXCEPTION 'Admission directory first page leaked or lost authority.';
  END IF;
  second_page := public.list_build_request_pilot_admissions_v1(
    1, 'Admission Fixture', cursor_value, 2
  );
  IF jsonb_array_length(second_page->'items') <> 2
    OR second_page->>'nextCursor' IS NOT NULL
    OR (first_page || second_page)::TEXT LIKE '%Private %'
    OR (first_page || second_page)::TEXT LIKE '%email%'
    OR (first_page || second_page)::TEXT LIKE '%Unconfirmed%' THEN
    RAISE EXCEPTION 'Admission directory pagination exposed private roster data.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      (first_page->'items') || (second_page->'items')
    ) AS item
    WHERE item->>'accountId' = absent_candidate::TEXT
      AND (item->>'admissionVersion')::INTEGER = 0
      AND NOT (item->>'admitted')::BOOLEAN
      AND item->'expiresAt' = 'null'::JSONB
  ) OR NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      (first_page->'items') || (second_page->'items')
    ) AS item
    WHERE item->>'accountId' = revoked_candidate::TEXT
      AND (item->>'admissionVersion')::INTEGER = 2
      AND NOT (item->>'admitted')::BOOLEAN
      AND item->'expiresAt' = 'null'::JSONB
  ) OR NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      (first_page->'items') || (second_page->'items')
    ) AS item
    WHERE item->>'accountId' IN (
      active_candidate::TEXT, expired_candidate::TEXT
    )
      AND (item->>'admitted')::BOOLEAN
      AND item->>'expiresAt' IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Admission directory safe state projection drifted: %',
      (first_page->'items') || (second_page->'items');
  END IF;

  BEGIN
    PERFORM public.list_build_request_pilot_admissions_v1(
      1, 'different query', cursor_value, 2
    );
    RAISE EXCEPTION 'Admission cursor replayed under another query.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Admission cursor replayed under another query.' THEN RAISE; END IF;
  END;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', ordinary_user, 'role', 'authenticated')::TEXT,
    TRUE
  );
  BEGIN
    PERFORM public.list_build_request_pilot_admissions_v1(
      1, 'Admission Fixture', cursor_value, 2
    );
    RAISE EXCEPTION 'Admission cursor replayed for a non-admin actor.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Admission cursor replayed for a non-admin actor.' THEN RAISE; END IF;
  END;
END;
$test$;
