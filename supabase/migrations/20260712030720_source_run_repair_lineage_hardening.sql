-- A repair is a new source session for the same immutable build/fork lineage.
-- It cannot be used to retarget another project, response, model run, or branch.

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_run_submissions_one_active_repair
  ON public.source_run_submissions(resubmission_of_id)
  WHERE resubmission_of_id IS NOT NULL
    AND status NOT IN ('failed', 'declined');

CREATE OR REPLACE FUNCTION private.validate_source_run_resubmission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  prior_submission public.source_run_submissions%ROWTYPE;
BEGIN
  IF NEW.resubmission_of_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO prior_submission
  FROM public.source_run_submissions
  WHERE id = NEW.resubmission_of_id;

  IF NOT FOUND OR prior_submission.author_id IS DISTINCT FROM NEW.author_id THEN
    RAISE EXCEPTION 'A repair submission must belong to the same profile as its prior submission.';
  END IF;

  IF prior_submission.status NOT IN ('needs_repair', 'failed') THEN
    RAISE EXCEPTION 'A repair submission requires a prior source run that needs repair or genuinely failed processing.';
  END IF;

  IF ROW(
    NEW.fork_source_project_id,
    NEW.fork_source_project_title,
    NEW.fork_source_model_variant_id,
    NEW.fork_source_run_id,
    NEW.fork_source_step_id,
    NEW.fork_source_step_number,
    NEW.fork_source_artifact_path,
    NEW.fork_source_artifact_sha256,
    NEW.fork_parent_submission_id,
    NEW.prompt_family_id,
    NEW.fork_depth,
    NEW.fork_branch_index
  ) IS DISTINCT FROM ROW(
    prior_submission.fork_source_project_id,
    prior_submission.fork_source_project_title,
    prior_submission.fork_source_model_variant_id,
    prior_submission.fork_source_run_id,
    prior_submission.fork_source_step_id,
    prior_submission.fork_source_step_number,
    prior_submission.fork_source_artifact_path,
    prior_submission.fork_source_artifact_sha256,
    prior_submission.fork_parent_submission_id,
    prior_submission.prompt_family_id,
    prior_submission.fork_depth,
    prior_submission.fork_branch_index
  ) THEN
    RAISE EXCEPTION 'A repair submission must preserve the exact fork lineage of its prior submission.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_source_run_resubmission()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
