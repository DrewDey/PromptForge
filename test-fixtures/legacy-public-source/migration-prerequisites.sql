\set ON_ERROR_STOP on

-- The community-project fixture intentionally carries only the model-variant
-- columns its own migrations need. Add the source-evidence columns exercised by
-- the grandfathering migration and mirror the pre-migration public column grant.
ALTER TABLE public.project_model_variants
  ADD COLUMN source_url TEXT,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
GRANT SELECT (id, project_id, source_run_id, source_url, status)
  ON public.project_model_variants TO anon, authenticated;

-- Production already has the source-run intake trigger from the variant-aware
-- fork migration. Install a small predecessor function here so the curated
-- evidence migration replaces the function behind a real trigger rather than
-- receiving a false-positive function-only test.
CREATE OR REPLACE FUNCTION public.validate_source_run_intake_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_source_run_intake_evidence_fields
  ON public.source_run_submissions;
CREATE TRIGGER validate_source_run_intake_evidence_fields
  BEFORE INSERT OR UPDATE OF
    source_package_file,
    source_package_sha256,
    intake_evidence,
    fork_source_project_id,
    fork_source_project_title,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_artifact_path,
    fork_source_artifact_sha256,
    fork_parent_submission_id,
    prompt_family_id,
    fork_depth,
    fork_branch_index
  ON public.source_run_submissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_source_run_intake_evidence();

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
