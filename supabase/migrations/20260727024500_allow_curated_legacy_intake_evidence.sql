-- Exact prepared legacy imports preserve a small curated-evidence extension
-- beyond the original source-run intake envelope. Admit only those four typed
-- fields while retaining the original closed-key and fork-equality checks.

CREATE OR REPLACE FUNCTION public.validate_source_run_intake_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actual_fork JSONB;
BEGIN
  IF NEW.intake_evidence IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.intake_evidence) IS DISTINCT FROM 'object'
    OR NOT (NEW.intake_evidence ?& ARRAY[
      'schema_version',
      'provider',
      'model_used',
      'model_settings',
      'prompt_count',
      'final_artifact_path',
      'final_artifact_sha256',
      'profile_registry_id',
      'verification_notes',
      'artifact_version_notes',
      'source_inspiration_notes',
      'fork'
    ])
    OR NEW.intake_evidence - ARRAY[
      'schema_version',
      'provider',
      'model_used',
      'model_settings',
      'prompt_count',
      'final_artifact_path',
      'final_artifact_sha256',
      'profile_registry_id',
      'verification_notes',
      'artifact_version_notes',
      'source_inspiration_notes',
      'evidence_scope',
      'source_access',
      'response_capture_normalization',
      'omitted_provider_turns',
      'fork'
    ] <> '{}'::JSONB
    OR jsonb_typeof(NEW.intake_evidence->'schema_version') IS DISTINCT FROM 'number'
    OR (NEW.intake_evidence->>'schema_version') IS DISTINCT FROM '1'
    OR NULLIF(BTRIM(NEW.intake_evidence->>'provider'), '') IS NULL
    OR NULLIF(BTRIM(NEW.intake_evidence->>'model_used'), '') IS NULL
    OR jsonb_typeof(NEW.intake_evidence->'prompt_count') IS DISTINCT FROM 'number'
    OR (NEW.intake_evidence->>'prompt_count') !~ '^[1-9][0-9]*$'
    OR NULLIF(BTRIM(NEW.intake_evidence->>'final_artifact_path'), '') IS NULL
    OR NEW.intake_evidence->>'final_artifact_path' NOT LIKE 'public/artifacts/%'
    OR NEW.intake_evidence->>'final_artifact_path' LIKE '%..%'
    OR STRPOS(NEW.intake_evidence->>'final_artifact_path', CHR(92)) > 0
    OR COALESCE(NEW.intake_evidence->>'final_artifact_sha256', '') !~ '^[0-9a-f]{64}$'
    OR NULLIF(BTRIM(NEW.intake_evidence->>'profile_registry_id'), '') IS NULL
    OR jsonb_typeof(NEW.intake_evidence->'verification_notes') IS DISTINCT FROM 'array'
    OR jsonb_typeof(NEW.intake_evidence->'artifact_version_notes') IS DISTINCT FROM 'array'
    OR jsonb_typeof(NEW.intake_evidence->'source_inspiration_notes') IS DISTINCT FROM 'array'
    OR (
      NEW.intake_evidence ? 'evidence_scope'
      AND NULLIF(BTRIM(NEW.intake_evidence->>'evidence_scope'), '') IS NULL
    )
    OR (
      NEW.intake_evidence ? 'source_access'
      AND (
        jsonb_typeof(NEW.intake_evidence->'source_access') IS DISTINCT FROM 'object'
        OR NOT (NEW.intake_evidence->'source_access' ? 'mode')
        OR (NEW.intake_evidence->'source_access') - ARRAY[
          'mode',
          'public_share_unavailable',
          'public_share_managed_separately',
          'note'
        ] <> '{}'::JSONB
        OR NEW.intake_evidence->'source_access'->>'mode'
          NOT IN ('public_share', 'authenticated_owner_session')
        OR NULLIF(BTRIM(NEW.intake_evidence->'source_access'->>'note'), '') IS NULL
        OR (
          NEW.intake_evidence->'source_access' ? 'public_share_unavailable'
          AND jsonb_typeof(
            NEW.intake_evidence->'source_access'->'public_share_unavailable'
          ) IS DISTINCT FROM 'boolean'
        )
        OR (
          NEW.intake_evidence->'source_access' ? 'public_share_managed_separately'
          AND jsonb_typeof(
            NEW.intake_evidence->'source_access'->'public_share_managed_separately'
          ) IS DISTINCT FROM 'boolean'
        )
      )
    )
    OR (
      NEW.intake_evidence ? 'response_capture_normalization'
      AND jsonb_typeof(
        NEW.intake_evidence->'response_capture_normalization'
      ) IS DISTINCT FROM 'object'
    )
    OR (
      NEW.intake_evidence ? 'omitted_provider_turns'
      AND jsonb_typeof(
        NEW.intake_evidence->'omitted_provider_turns'
      ) IS DISTINCT FROM 'array'
    ) THEN
    RAISE EXCEPTION 'Prepared source-run intake evidence is malformed or incomplete.';
  END IF;

  actual_fork := CASE
    WHEN NULLIF(BTRIM(COALESCE(NEW.fork_source_project_id, '')), '') IS NULL THEN
      'null'::JSONB
    ELSE jsonb_build_object(
      'source_project_id', NEW.fork_source_project_id,
      'source_project_title', NEW.fork_source_project_title,
      'source_model_variant_id', NEW.fork_source_model_variant_id,
      'source_run_id', NEW.fork_source_run_id,
      'source_step_id', NEW.fork_source_step_id,
      'source_step_number', NEW.fork_source_step_number,
      'source_artifact_path', NEW.fork_source_artifact_path,
      'source_artifact_sha256', NEW.fork_source_artifact_sha256,
      'parent_fork_id', NEW.fork_parent_submission_id,
      'prompt_family_id', NEW.prompt_family_id,
      'fork_depth', NEW.fork_depth,
      'fork_branch_index', NEW.fork_branch_index
    )
  END;

  IF COALESCE(NEW.intake_evidence->'fork', 'null'::JSONB)
      IS DISTINCT FROM actual_fork THEN
    RAISE EXCEPTION 'Prepared source-run fork evidence differs from its canonical intake columns.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_source_run_intake_evidence()
  FROM PUBLIC, anon, authenticated;
