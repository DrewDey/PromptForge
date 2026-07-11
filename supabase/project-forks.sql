-- PathForge Project Fork Lineage
-- Adds public project-level fork metadata so approved fork projects keep their
-- source path after the source-run intake has been published.

ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS fork_source_project_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_project_title TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_step_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_step_number INT,
  ADD COLUMN IF NOT EXISTS fork_source_model_variant_id UUID,
  ADD COLUMN IF NOT EXISTS fork_source_run_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_artifact_path TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_artifact_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS fork_parent_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS prompt_family_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_depth INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fork_branch_index INT NOT NULL DEFAULT 0;

ALTER TABLE prompts
  DROP CONSTRAINT IF EXISTS prompts_fork_step_number_check,
  ADD CONSTRAINT prompts_fork_step_number_check
    CHECK (fork_source_step_number IS NULL OR fork_source_step_number > 0),
  DROP CONSTRAINT IF EXISTS prompts_fork_depth_check,
  ADD CONSTRAINT prompts_fork_depth_check
    CHECK (fork_depth >= 0 AND fork_depth < 10),
  DROP CONSTRAINT IF EXISTS prompts_fork_branch_index_check,
  ADD CONSTRAINT prompts_fork_branch_index_check
    CHECK (fork_branch_index >= 0 AND fork_branch_index < 10),
  DROP CONSTRAINT IF EXISTS prompts_fork_source_run_check,
  ADD CONSTRAINT prompts_fork_source_run_check
    CHECK (
      fork_source_run_id IS NULL
      OR (
        BTRIM(fork_source_run_id) <> ''
        AND fork_source_run_id = BTRIM(fork_source_run_id)
      )
    ),
  DROP CONSTRAINT IF EXISTS prompts_fork_source_artifact_path_check,
  ADD CONSTRAINT prompts_fork_source_artifact_path_check
    CHECK (
      fork_source_artifact_path IS NULL
      OR (
        fork_source_artifact_path LIKE 'public/artifacts/%'
        AND LENGTH(fork_source_artifact_path) > LENGTH('public/artifacts/')
        AND fork_source_artifact_path NOT LIKE '%..%'
        AND STRPOS(fork_source_artifact_path, CHR(92)) = 0
        AND fork_source_artifact_path = BTRIM(fork_source_artifact_path)
      )
    ),
  DROP CONSTRAINT IF EXISTS prompts_fork_source_artifact_sha256_check,
  ADD CONSTRAINT prompts_fork_source_artifact_sha256_check
    CHECK (
      fork_source_artifact_sha256 IS NULL
      OR fork_source_artifact_sha256 ~ '^[0-9a-f]{64}$'
    ),
  DROP CONSTRAINT IF EXISTS prompts_variant_aware_fork_fields_check,
  ADD CONSTRAINT prompts_variant_aware_fork_fields_check
    CHECK (
      (
        fork_source_model_variant_id IS NULL
        AND fork_source_run_id IS NULL
        AND fork_source_artifact_path IS NULL
        AND fork_source_artifact_sha256 IS NULL
      )
      OR (
        NULLIF(BTRIM(COALESCE(fork_source_project_id, '')), '') IS NOT NULL
        AND NULLIF(BTRIM(COALESCE(fork_source_run_id, '')), '') IS NOT NULL
        AND NULLIF(BTRIM(COALESCE(fork_source_step_id, '')), '') IS NOT NULL
        AND fork_source_step_number > 0
        AND NULLIF(BTRIM(COALESCE(fork_source_artifact_path, '')), '') IS NOT NULL
        AND fork_source_artifact_sha256 ~ '^[0-9a-f]{64}$'
      )
    );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_fork_source_model_variant_fkey'
  ) THEN
    ALTER TABLE public.prompts
      ADD CONSTRAINT prompts_fork_source_model_variant_fkey
      FOREIGN KEY (fork_source_model_variant_id)
      REFERENCES public.project_model_variants(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_prompts_fork_source_project ON prompts(fork_source_project_id);
CREATE INDEX IF NOT EXISTS idx_prompts_fork_source_model_variant
  ON prompts(fork_source_model_variant_id)
  WHERE fork_source_model_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_fork_source_run
  ON prompts(fork_source_run_id)
  WHERE fork_source_run_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_unique_approved_fork_branch_slot
  ON prompts(
    BTRIM(fork_source_project_id),
    COALESCE(
      'run:' || NULLIF(BTRIM(fork_source_run_id), ''),
      'variant:' || fork_source_model_variant_id::TEXT,
      'legacy'
    ),
    (CASE
      WHEN NULLIF(BTRIM(fork_source_step_id), '') IS NOT NULL
        THEN 'id:' || BTRIM(fork_source_step_id)
      WHEN fork_source_step_number IS NOT NULL
        THEN 'number:' || fork_source_step_number::TEXT
      ELSE 'project'
    END),
    fork_branch_index
  )
  WHERE status = 'approved'
    AND NULLIF(BTRIM(fork_source_project_id), '') IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_prompt_family ON prompts(prompt_family_id);
CREATE INDEX IF NOT EXISTS idx_prompts_parent_fork ON prompts(fork_parent_submission_id);

-- Variant-aware forks must name an exact response/artifact/SHA tuple that was
-- published through the evidence RPC. Legacy project-only forks remain valid.
ALTER TABLE public.prompts
  DROP CONSTRAINT IF EXISTS prompts_variant_aware_fork_fields_check,
  ADD CONSTRAINT prompts_variant_aware_fork_fields_check CHECK (
    (
      fork_source_model_variant_id IS NULL
      AND fork_source_run_id IS NULL
      AND fork_source_artifact_path IS NULL
      AND fork_source_artifact_sha256 IS NULL
    )
    OR (
      NULLIF(BTRIM(COALESCE(fork_source_project_id, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(fork_source_run_id, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(fork_source_step_id, '')), '') IS NOT NULL
      AND fork_source_step_number > 0
      AND NULLIF(BTRIM(COALESCE(fork_source_artifact_path, '')), '') IS NOT NULL
      AND fork_source_artifact_sha256 ~ '^[0-9a-f]{64}$'
    )
  );

ALTER TABLE public.prompts
  DROP CONSTRAINT IF EXISTS prompts_exact_variant_artifact_fkey,
  ADD CONSTRAINT prompts_exact_variant_artifact_fkey
    FOREIGN KEY (
      fork_source_model_variant_id,
      fork_source_step_id,
      fork_source_step_number,
      fork_source_artifact_path,
      fork_source_artifact_sha256
    ) REFERENCES public.project_model_variant_artifacts (
      model_variant_id,
      source_step_id,
      source_step_number,
      artifact_path,
      artifact_sha256
    ) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.validate_variant_aware_project_fork()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  source_variant public.project_model_variants%ROWTYPE;
BEGIN
  IF NEW.fork_source_model_variant_id IS NULL
    AND NEW.fork_source_run_id IS NULL
    AND NEW.fork_source_artifact_path IS NULL
    AND NEW.fork_source_artifact_sha256 IS NULL THEN
    RETURN NEW;
  END IF;

  IF NULLIF(BTRIM(COALESCE(NEW.fork_source_project_id, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(NEW.fork_source_run_id, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(NEW.fork_source_step_id, '')), '') IS NULL
    OR NEW.fork_source_step_number IS NULL
    OR NEW.fork_source_step_number < 1
    OR NULLIF(BTRIM(COALESCE(NEW.fork_source_artifact_path, '')), '') IS NULL
    OR COALESCE(NEW.fork_source_artifact_sha256, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Exact-run forks require a public project, run, response, artifact, and SHA-256 tuple.';
  END IF;

  IF NEW.fork_source_model_variant_id IS NOT NULL THEN
    SELECT variant.*
    INTO source_variant
    FROM public.project_model_variants AS variant
    WHERE variant.id = NEW.fork_source_model_variant_id
      AND variant.project_id::TEXT = BTRIM(NEW.fork_source_project_id)
      AND variant.source_run_id = BTRIM(NEW.fork_source_run_id)
      AND variant.status IN ('published', 'historical')
      AND EXISTS (
        SELECT 1
        FROM public.prompts AS canonical_project
        WHERE canonical_project.id = variant.project_id
          AND canonical_project.status = 'approved'
      )
    FOR KEY SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant-aware fork source is not a public run of the approved canonical project.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.project_model_variant_artifacts AS evidence
      WHERE evidence.model_variant_id = source_variant.id
        AND evidence.source_step_id = BTRIM(NEW.fork_source_step_id)
        AND evidence.source_step_number = NEW.fork_source_step_number
        AND evidence.artifact_path = BTRIM(NEW.fork_source_artifact_path)
        AND evidence.artifact_sha256 = NEW.fork_source_artifact_sha256
    ) THEN
      RAISE EXCEPTION 'Variant-aware fork response/artifact evidence does not match the selected model run.';
    END IF;

    NEW.fork_source_project_id = source_variant.project_id::TEXT;
    NEW.fork_source_run_id = source_variant.source_run_id;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions AS source_intake
    JOIN public.prompts AS source_project
      ON source_project.id = source_intake.extracted_prompt_id
    WHERE source_project.id::TEXT = BTRIM(NEW.fork_source_project_id)
      AND source_project.status = 'approved'
      AND source_intake.id::TEXT = BTRIM(NEW.fork_source_run_id)
      AND source_intake.status = 'draft_created'
      AND source_intake.intake_evidence IS NOT NULL
      AND source_intake.intake_evidence->>'prompt_count' = NEW.fork_source_step_number::TEXT
      AND BTRIM(NEW.fork_source_step_id) = (
        source_project.id::TEXT
        || ':' || source_intake.id::TEXT
        || ':step:' || NEW.fork_source_step_number::TEXT
      )
      AND source_intake.intake_evidence->>'final_artifact_path' =
        BTRIM(NEW.fork_source_artifact_path)
      AND source_intake.intake_evidence->>'final_artifact_sha256' =
        NEW.fork_source_artifact_sha256
  ) THEN
    RAISE EXCEPTION 'Prepared fork response/artifact evidence does not match the approved source-run project final.';
  END IF;

  NEW.fork_source_project_id = BTRIM(NEW.fork_source_project_id);
  NEW.fork_source_run_id = BTRIM(NEW.fork_source_run_id);
  NEW.fork_source_step_id = BTRIM(NEW.fork_source_step_id);
  NEW.fork_source_artifact_path = BTRIM(NEW.fork_source_artifact_path);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_variant_aware_project_fork()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_variant_aware_project_fork_fields ON public.prompts;
CREATE TRIGGER validate_variant_aware_project_fork_fields
  BEFORE INSERT OR UPDATE OF
    fork_source_project_id,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_artifact_path,
    fork_source_artifact_sha256
  ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.validate_variant_aware_project_fork();
CREATE OR REPLACE FUNCTION public.prevent_referenced_model_variant_retirement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IN ('published', 'historical')
    AND NEW.status NOT IN ('published', 'historical')
    AND EXISTS (
      SELECT 1
      FROM public.prompts
      WHERE prompts.status = 'approved'
        AND prompts.fork_source_model_variant_id = OLD.id
    ) THEN
    RAISE EXCEPTION 'A model variant referenced by a public fork cannot be retired.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_referenced_model_variant_retirement()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_referenced_model_variant_retirement_fields
  ON public.project_model_variants;
CREATE TRIGGER prevent_referenced_model_variant_retirement_fields
  BEFORE UPDATE OF status ON public.project_model_variants
  FOR EACH ROW EXECUTE FUNCTION public.prevent_referenced_model_variant_retirement();

-- ---------------------------------------------------------------------------
-- Server-owned public fork branch slots
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.allocate_project_fork_branch_index()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  source_run_scope TEXT;
  source_step_scope TEXT;
  current_prompt_id UUID;
  available_branch_index INT;
  unchanged_approved_scope BOOLEAN;
BEGIN
  IF NEW.status IS DISTINCT FROM 'approved'
    OR NULLIF(BTRIM(COALESCE(NEW.fork_source_project_id, '')), '') IS NULL THEN
    RETURN NEW;
  END IF;

  unchanged_approved_scope := TG_OP = 'UPDATE'
    AND OLD.status = 'approved'
    AND OLD.fork_source_project_id IS NOT DISTINCT FROM NEW.fork_source_project_id
    AND OLD.fork_source_model_variant_id IS NOT DISTINCT FROM NEW.fork_source_model_variant_id
    AND OLD.fork_source_run_id IS NOT DISTINCT FROM NEW.fork_source_run_id
    AND OLD.fork_source_step_id IS NOT DISTINCT FROM NEW.fork_source_step_id
    AND OLD.fork_source_step_number IS NOT DISTINCT FROM NEW.fork_source_step_number;

  IF unchanged_approved_scope THEN
    NEW.fork_branch_index = OLD.fork_branch_index;
    RETURN NEW;
  END IF;

  source_run_scope := CASE
    WHEN NEW.fork_source_model_variant_id IS NOT NULL THEN
      'variant:' || NEW.fork_source_model_variant_id::TEXT
      || '|run:' || BTRIM(NEW.fork_source_run_id)
    ELSE
      'legacy:' || COALESCE('run:' || NULLIF(BTRIM(NEW.fork_source_run_id), ''), 'project')
  END;
  source_step_scope := CASE
    WHEN NEW.fork_source_model_variant_id IS NOT NULL THEN
      'id:' || BTRIM(NEW.fork_source_step_id)
      || '|number:' || NEW.fork_source_step_number::TEXT
    WHEN NULLIF(BTRIM(NEW.fork_source_step_id), '') IS NOT NULL THEN
      'id:' || BTRIM(NEW.fork_source_step_id)
    WHEN NEW.fork_source_step_number IS NOT NULL THEN
      'number:' || NEW.fork_source_step_number::TEXT
    ELSE 'project'
  END;
  current_prompt_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      BTRIM(NEW.fork_source_project_id) || '|' || source_run_scope || '|' || source_step_scope,
      0
    )
  );

  SELECT slots.branch_index
  INTO available_branch_index
  FROM pg_catalog.generate_series(0, 9) AS slots(branch_index)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.prompts AS existing_fork
    WHERE existing_fork.status = 'approved'
      AND BTRIM(existing_fork.fork_source_project_id) = BTRIM(NEW.fork_source_project_id)
      AND (
        CASE
          WHEN existing_fork.fork_source_model_variant_id IS NOT NULL THEN
            'variant:' || existing_fork.fork_source_model_variant_id::TEXT
            || '|run:' || BTRIM(existing_fork.fork_source_run_id)
          ELSE
            'legacy:' || COALESCE(
              'run:' || NULLIF(BTRIM(existing_fork.fork_source_run_id), ''),
              'project'
            )
        END
      ) = source_run_scope
      AND (
        CASE
          WHEN existing_fork.fork_source_model_variant_id IS NOT NULL THEN
            'id:' || BTRIM(existing_fork.fork_source_step_id)
            || '|number:' || existing_fork.fork_source_step_number::TEXT
          WHEN NULLIF(BTRIM(existing_fork.fork_source_step_id), '') IS NOT NULL THEN
            'id:' || BTRIM(existing_fork.fork_source_step_id)
          WHEN existing_fork.fork_source_step_number IS NOT NULL THEN
            'number:' || existing_fork.fork_source_step_number::TEXT
          ELSE 'project'
        END
      ) = source_step_scope
      AND existing_fork.fork_branch_index = slots.branch_index
      AND (current_prompt_id IS NULL OR existing_fork.id <> current_prompt_id)
  )
  ORDER BY slots.branch_index
  LIMIT 1;

  IF available_branch_index IS NULL THEN
    RAISE EXCEPTION 'The selected response already has the maximum of ten public fork branches.';
  END IF;

  NEW.fork_branch_index = available_branch_index;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_project_fork_branch_index()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS allocate_project_fork_branch_index_fields ON public.prompts;
CREATE TRIGGER allocate_project_fork_branch_index_fields
  BEFORE INSERT OR UPDATE OF
    status,
    fork_source_project_id,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_branch_index
  ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.allocate_project_fork_branch_index();

DROP INDEX IF EXISTS public.idx_prompts_unique_approved_fork_branch_slot;
CREATE UNIQUE INDEX idx_prompts_unique_approved_fork_branch_slot
  ON public.prompts(
    BTRIM(fork_source_project_id),
    (CASE
      WHEN fork_source_model_variant_id IS NOT NULL THEN
        'variant:' || fork_source_model_variant_id::TEXT
        || '|run:' || BTRIM(fork_source_run_id)
      ELSE
        'legacy:' || COALESCE(
          'run:' || NULLIF(BTRIM(fork_source_run_id), ''),
          'project'
        )
    END),
    (CASE
      WHEN fork_source_model_variant_id IS NOT NULL THEN
        'id:' || BTRIM(fork_source_step_id)
        || '|number:' || fork_source_step_number::TEXT
      WHEN NULLIF(BTRIM(fork_source_step_id), '') IS NOT NULL THEN
        'id:' || BTRIM(fork_source_step_id)
      WHEN fork_source_step_number IS NOT NULL THEN
        'number:' || fork_source_step_number::TEXT
      ELSE 'project'
    END),
    fork_branch_index
  )
  WHERE status = 'approved'
    AND NULLIF(BTRIM(fork_source_project_id), '') IS NOT NULL;

-- ---------------------------------------------------------------------------
