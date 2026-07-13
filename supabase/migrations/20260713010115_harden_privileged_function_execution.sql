-- Keep privileged maintenance routines out of the public RPC surface.
-- Trigger functions continue to run as their postgres owner when their
-- triggers fire; direct API execution is neither required nor intended.

ALTER FUNCTION public.handle_new_user()
  SET search_path = '';

REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user()
  TO supabase_auth_admin;

REVOKE ALL ON FUNCTION public.pathforge_is_admin_request()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pathforge_is_admin_request()
  TO service_role;

REVOKE ALL ON FUNCTION public.publish_prepared_source_run_project(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT[], TEXT[], TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT,
  INTEGER, INTEGER, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_prepared_source_run_project(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT[], TEXT[], TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT,
  INTEGER, INTEGER, JSONB
) TO service_role;

REVOKE ALL ON FUNCTION public.replace_prepared_source_run_prompt_steps(UUID[], JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_prepared_source_run_prompt_steps(UUID[], JSONB)
  TO service_role;

REVOKE ALL ON FUNCTION public.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)
  SET SCHEMA private;
REVOKE ALL ON FUNCTION private.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)
  TO authenticated, service_role;

-- Keep the Data API contract stable with a non-privileged public wrapper.
-- The private function repeats the administrator check before any mutation.
CREATE OR REPLACE FUNCTION public.publish_prepared_showcase_source_run(
  target_source_run_id UUID,
  expected_intake JSONB,
  expected_fork JSONB,
  project_payload JSONB
)
RETURNS UUID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.publish_prepared_showcase_source_run($1, $2, $3, $4);
$$;

REVOKE ALL ON FUNCTION public.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_project_model_variant_default(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_project_model_variant_default(UUID, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.touch_build_request_on_response()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_build_request_vote_count()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_prompt_bookmark_count()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_prompt_vote_count()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_suggestion_vote_count()
  FROM PUBLIC, anon, authenticated, service_role;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Preserve
-- service-role access while making future public-schema functions opt-in for
-- anonymous and signed-in API callers.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
