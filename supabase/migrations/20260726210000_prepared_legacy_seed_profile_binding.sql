-- Prepared legacy packages may only use their exact, non-admin seed operator.
-- Public profile provenance remains presentation metadata; this narrow readback
-- also checks the confirmed Auth identity and private operator allowlist.

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
    RAISE EXCEPTION 'Exact prepared seed profile identity is required.';
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
    AND operator.kind = 'pathforge_seed'
  INNER JOIN public.profile_provenance AS provenance
    ON provenance.profile_id = profile.id
    AND provenance.kind = 'pathforge_seed'
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

NOTIFY pgrst, 'reload schema';
