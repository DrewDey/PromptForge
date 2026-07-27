-- Bind protected legacy packages to their exact disclosed operated identities
-- at import time. This keeps offline connector handoffs useful without letting
-- an arbitrary author UUID become immutable package evidence.

CREATE TABLE private.prepared_legacy_seed_profile_bindings (
  source_run_id UUID PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  provenance_kind TEXT NOT NULL
    CHECK (provenance_kind IN ('pathforge_seed', 'pathforge_team')),
  operator_kind TEXT NOT NULL
    CHECK (operator_kind IN ('pathforge_seed', 'pathforge_team')),
  auth_seed_marker_required BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON TABLE private.prepared_legacy_seed_profile_bindings
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE private.prepared_legacy_seed_profile_bindings
  TO service_role;

INSERT INTO private.prepared_legacy_seed_profile_bindings (
  source_run_id,
  project_id,
  username,
  display_name,
  provenance_kind,
  operator_kind,
  auth_seed_marker_required
) VALUES
  (
    'd9fa40e7-7725-4387-ad5b-14f25cf744ce',
    'f25f83df-29c5-4d07-97b8-e7f6d2a902b8',
    'RowanPierce',
    'Rowan Pierce',
    'pathforge_seed',
    'pathforge_seed',
    TRUE
  ),
  (
    '6a1f9bc4-c390-832f-88a5-d978d2e42577',
    '3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40',
    'JordanWells',
    'Jordan Wells',
    'pathforge_seed',
    'pathforge_seed',
    TRUE
  ),
  (
    '80b083bb-4f94-4411-b071-a5da731d3e2d',
    'e3f1d1a7-1d18-4a7b-ba54-045526cd2661',
    'NoraBrooks',
    'Nora Brooks',
    'pathforge_seed',
    'pathforge_seed',
    FALSE
  ),
  (
    '6a122064-6094-832a-9228-e239ce31e79b',
    '8f5f4f1c-9f59-4f18-9a5e-61c4c3f4f901',
    'pathforge_projects',
    'PathForge Projects',
    'pathforge_team',
    'pathforge_team',
    FALSE
  );

-- The earlier binding readback accepted only personal seed profiles. The
-- grandfathered Snake project is truthfully owned by the existing disclosed
-- PathForge Projects house profile, so return either approved operated kind
-- and let the immutable package binding require the exact one.
CREATE OR REPLACE FUNCTION public.check_prepared_legacy_seed_profile_binding(
  target_profile_id UUID,
  expected_username TEXT,
  expected_display_name TEXT
)
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  display_name TEXT,
  role TEXT,
  provenance_kind TEXT,
  operator_kind TEXT,
  email_confirmed BOOLEAN,
  auth_seed_marker BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles AS administrator
      WHERE administrator.id = (SELECT auth.uid())
        AND administrator.role = 'admin'
    ) THEN
    RAISE EXCEPTION 'Admin or service access required.';
  END IF;

  IF target_profile_id IS NULL
    OR NULLIF(BTRIM(COALESCE(expected_username, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(expected_display_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Exact prepared profile identity is required.';
  END IF;

  RETURN QUERY
  SELECT
    profile.id,
    profile.username,
    profile.display_name,
    profile.role,
    provenance.kind,
    operator.kind,
    auth_user.email_confirmed_at IS NOT NULL,
    COALESCE(auth_user.raw_app_meta_data->>'pathforge_seed', 'false') = 'true'
  FROM public.profiles AS profile
  INNER JOIN auth.users AS auth_user
    ON auth_user.id = profile.id
  INNER JOIN private.pathforge_profile_operators AS operator
    ON operator.profile_id = profile.id
    AND operator.kind IN ('pathforge_seed', 'pathforge_team')
  INNER JOIN public.profile_provenance AS provenance
    ON provenance.profile_id = profile.id
    AND provenance.kind = operator.kind
  WHERE profile.id = target_profile_id
    AND profile.username = BTRIM(expected_username)
    AND profile.display_name = BTRIM(expected_display_name)
    AND profile.role = 'user'
    AND auth_user.email_confirmed_at IS NOT NULL
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.check_prepared_legacy_seed_profile_binding(
  UUID, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_prepared_legacy_seed_profile_binding(
  UUID, TEXT, TEXT
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enforce_prepared_legacy_import_profile_binding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  binding private.prepared_legacy_seed_profile_bindings%ROWTYPE;
BEGIN
  SELECT *
  INTO binding
  FROM private.prepared_legacy_seed_profile_bindings AS candidate
  WHERE candidate.source_run_id = NEW.source_run_id;

  -- The PM1 importer remains available for other service-reviewed legacy
  -- packages. The protected catalog entries above receive the stronger exact
  -- profile gate and future entries can opt in through another migration.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.expected_project_id IS DISTINCT FROM binding.project_id THEN
    RAISE EXCEPTION 'Protected legacy source run belongs to a different prepared project.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions AS source_run
    INNER JOIN public.profiles AS profile
      ON profile.id = source_run.author_id
    INNER JOIN auth.users AS auth_user
      ON auth_user.id = profile.id
    INNER JOIN public.profile_provenance AS provenance
      ON provenance.profile_id = profile.id
      AND provenance.kind = binding.provenance_kind
    INNER JOIN private.pathforge_profile_operators AS operator
      ON operator.profile_id = profile.id
      AND operator.kind = binding.operator_kind
    WHERE source_run.id = NEW.source_run_id
      AND profile.username = binding.username
      AND profile.display_name = binding.display_name
      AND profile.role = 'user'
      AND auth_user.email_confirmed_at IS NOT NULL
      AND (
        NOT binding.auth_seed_marker_required
        OR COALESCE(
          auth_user.raw_app_meta_data->>'pathforge_seed',
          'false'
        ) = 'true'
      )
  ) THEN
    RAISE EXCEPTION 'Protected legacy import author lacks its exact confirmed seed-profile binding.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_prepared_legacy_import_profile_binding()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_prepared_legacy_import_profile_binding
  ON private.legacy_prepared_source_run_imports;
CREATE TRIGGER enforce_prepared_legacy_import_profile_binding
  BEFORE INSERT OR UPDATE
  ON private.legacy_prepared_source_run_imports
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_prepared_legacy_import_profile_binding();

NOTIFY pgrst, 'reload schema';
