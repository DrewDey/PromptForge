\set ON_ERROR_STOP on

-- The community-project fixture intentionally carries only the model-variant
-- columns its own migrations need. Add the source-evidence columns exercised by
-- the grandfathering migration and mirror the pre-migration public column grant.
ALTER TABLE public.project_model_variants
  ADD COLUMN source_url TEXT,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
GRANT SELECT (id, project_id, source_run_id, source_url, status)
  ON public.project_model_variants TO anon, authenticated;

-- The production database already has the full prepared publisher. This small
-- fixture stub lets the migration replace and privilege its public wrapper
-- without duplicating the publisher's unrelated project-shaping logic.
CREATE OR REPLACE FUNCTION private.publish_prepared_showcase_source_run(
  target_source_run_id UUID,
  expected_intake JSONB,
  expected_fork JSONB,
  project_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (project_payload->>'id')::UUID;
END;
$$;

REVOKE ALL ON FUNCTION private.publish_prepared_showcase_source_run(
  UUID, JSONB, JSONB, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.publish_prepared_showcase_source_run(
  UUID, JSONB, JSONB, JSONB
) TO authenticated, service_role;
