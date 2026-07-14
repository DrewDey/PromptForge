-- Give the web runtime only the two analytics capabilities it needs. The
-- browser never receives this credential, and the database stores only its
-- SHA-256 digest. User identity and internal-traffic classification are
-- derived from the verified Supabase JWT inside Postgres.

CREATE OR REPLACE FUNCTION public.pathforge_record_product_event_from_app(
  p_ingest_secret TEXT,
  p_event_id UUID,
  p_session_id UUID,
  p_event_name TEXT,
  p_environment TEXT,
  p_path TEXT,
  p_surface TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL,
  p_project_title TEXT DEFAULT NULL,
  p_source_run_id TEXT DEFAULT NULL,
  p_metric_value INTEGER DEFAULT NULL,
  p_schema_version SMALLINT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  expected_digest CONSTANT TEXT := 'd550c48c2dd7e815cbaf3389790f2cacd1c7da6875779199dd8c673797114b11';
  current_user_id UUID := auth.uid();
  profile_role TEXT;
  provenance_kind TEXT;
  actor_type TEXT := 'anonymous';
  inserted BOOLEAN;
BEGIN
  IF p_ingest_secret IS NULL OR pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_ingest_secret, 'UTF8'), 'sha256'),
    'hex'
  ) <> expected_digest THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Invalid activation ingestion credential.';
  END IF;

  IF current_user_id IS NOT NULL THEN
    SELECT profile.role, provenance.kind
    INTO profile_role, provenance_kind
    FROM public.profiles AS profile
    LEFT JOIN public.profile_provenance AS provenance
      ON provenance.profile_id = profile.id
    WHERE profile.id = current_user_id;

    actor_type := CASE
      WHEN profile_role = 'admin' THEN 'admin'
      WHEN provenance_kind = 'pathforge_seed' THEN 'seed'
      WHEN provenance_kind = 'pathforge_team' THEN 'team'
      ELSE 'member'
    END;
  END IF;

  inserted := public.pathforge_record_product_event(
    p_event_id => p_event_id,
    p_session_id => p_session_id,
    p_user_id => current_user_id,
    p_actor_type => actor_type,
    p_event_name => p_event_name,
    p_environment => p_environment,
    p_path => p_path,
    p_surface => p_surface,
    p_action => p_action,
    p_project_id => p_project_id,
    p_project_title => p_project_title,
    p_source_run_id => p_source_run_id,
    p_metric_value => p_metric_value,
    p_schema_version => p_schema_version
  );

  RETURN pg_catalog.jsonb_build_object(
    'inserted', inserted,
    'actor_type', actor_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pathforge_record_product_event_from_app(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, SMALLINT
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pathforge_record_product_event_from_app(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, SMALLINT
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.pathforge_activation_dashboard_for_admin(
  p_days INTEGER DEFAULT 30,
  p_environment TEXT DEFAULT 'production'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'PathForge admin access required.';
  END IF;

  RETURN public.pathforge_activation_dashboard(p_days, p_environment);
END;
$$;

REVOKE ALL ON FUNCTION public.pathforge_activation_dashboard_for_admin(INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pathforge_activation_dashboard_for_admin(INTEGER, TEXT)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
