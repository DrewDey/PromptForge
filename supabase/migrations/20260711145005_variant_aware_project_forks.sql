-- Make every fork anchor exact to its canonical project, model run, and
-- immutable artifact version while preserving legacy project-level forks.

ALTER TABLE public.prompts
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

ALTER TABLE public.source_run_submissions
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_fork_step_number_check'
  ) THEN
    ALTER TABLE public.prompts
      ADD CONSTRAINT prompts_fork_step_number_check
      CHECK (fork_source_step_number IS NULL OR fork_source_step_number > 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_fork_depth_check'
  ) THEN
    ALTER TABLE public.prompts
      ADD CONSTRAINT prompts_fork_depth_check
      CHECK (fork_depth >= 0 AND fork_depth < 10)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_fork_branch_index_check'
  ) THEN
    ALTER TABLE public.prompts
      ADD CONSTRAINT prompts_fork_branch_index_check
      CHECK (fork_branch_index >= 0 AND fork_branch_index < 10)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_fork_source_run_check'
  ) THEN
    ALTER TABLE public.prompts
      ADD CONSTRAINT prompts_fork_source_run_check
      CHECK (
        fork_source_run_id IS NULL
        OR (
          BTRIM(fork_source_run_id) <> ''
          AND fork_source_run_id = BTRIM(fork_source_run_id)
        )
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_fork_source_artifact_path_check'
  ) THEN
    ALTER TABLE public.prompts
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
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_fork_source_artifact_sha256_check'
  ) THEN
    ALTER TABLE public.prompts
      ADD CONSTRAINT prompts_fork_source_artifact_sha256_check
      CHECK (
        fork_source_artifact_sha256 IS NULL
        OR fork_source_artifact_sha256 ~ '^[0-9a-f]{64}$'
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_variant_aware_fork_fields_check'
  ) THEN
    ALTER TABLE public.prompts
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
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_fork_source_model_variant_fkey'
  ) THEN
    ALTER TABLE public.prompts
      ADD CONSTRAINT prompts_fork_source_model_variant_fkey
      FOREIGN KEY (fork_source_model_variant_id)
      REFERENCES public.project_model_variants(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.source_run_submissions'::REGCLASS
      AND conname = 'source_run_submissions_fork_step_number_check'
  ) THEN
    ALTER TABLE public.source_run_submissions
      ADD CONSTRAINT source_run_submissions_fork_step_number_check
      CHECK (fork_source_step_number IS NULL OR fork_source_step_number > 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.source_run_submissions'::REGCLASS
      AND conname = 'source_run_submissions_fork_depth_check'
  ) THEN
    ALTER TABLE public.source_run_submissions
      ADD CONSTRAINT source_run_submissions_fork_depth_check
      CHECK (fork_depth >= 0 AND fork_depth < 10)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.source_run_submissions'::REGCLASS
      AND conname = 'source_run_submissions_fork_branch_index_check'
  ) THEN
    ALTER TABLE public.source_run_submissions
      ADD CONSTRAINT source_run_submissions_fork_branch_index_check
      CHECK (fork_branch_index >= 0 AND fork_branch_index < 10)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.source_run_submissions'::REGCLASS
      AND conname = 'source_run_submissions_fork_source_run_check'
  ) THEN
    ALTER TABLE public.source_run_submissions
      ADD CONSTRAINT source_run_submissions_fork_source_run_check
      CHECK (
        fork_source_run_id IS NULL
        OR (
          BTRIM(fork_source_run_id) <> ''
          AND fork_source_run_id = BTRIM(fork_source_run_id)
        )
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.source_run_submissions'::REGCLASS
      AND conname = 'source_run_submissions_fork_source_artifact_path_check'
  ) THEN
    ALTER TABLE public.source_run_submissions
      ADD CONSTRAINT source_run_submissions_fork_source_artifact_path_check
      CHECK (
        fork_source_artifact_path IS NULL
        OR (
          fork_source_artifact_path LIKE 'public/artifacts/%'
          AND LENGTH(fork_source_artifact_path) > LENGTH('public/artifacts/')
          AND fork_source_artifact_path NOT LIKE '%..%'
          AND STRPOS(fork_source_artifact_path, CHR(92)) = 0
          AND fork_source_artifact_path = BTRIM(fork_source_artifact_path)
        )
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.source_run_submissions'::REGCLASS
      AND conname = 'source_run_submissions_fork_source_artifact_sha256_check'
  ) THEN
    ALTER TABLE public.source_run_submissions
      ADD CONSTRAINT source_run_submissions_fork_source_artifact_sha256_check
      CHECK (
        fork_source_artifact_sha256 IS NULL
        OR fork_source_artifact_sha256 ~ '^[0-9a-f]{64}$'
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.source_run_submissions'::REGCLASS
      AND conname = 'source_run_submissions_variant_aware_fork_fields_check'
  ) THEN
    ALTER TABLE public.source_run_submissions
      ADD CONSTRAINT source_run_submissions_variant_aware_fork_fields_check
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
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.source_run_submissions'::REGCLASS
      AND conname = 'source_run_submissions_fork_source_model_variant_fkey'
  ) THEN
    ALTER TABLE public.source_run_submissions
      ADD CONSTRAINT source_run_submissions_fork_source_model_variant_fkey
      FOREIGN KEY (fork_source_model_variant_id)
      REFERENCES public.project_model_variants(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.prompts
  VALIDATE CONSTRAINT prompts_fork_step_number_check,
  VALIDATE CONSTRAINT prompts_fork_depth_check,
  VALIDATE CONSTRAINT prompts_fork_branch_index_check,
  VALIDATE CONSTRAINT prompts_fork_source_run_check,
  VALIDATE CONSTRAINT prompts_fork_source_artifact_path_check,
  VALIDATE CONSTRAINT prompts_fork_source_artifact_sha256_check,
  VALIDATE CONSTRAINT prompts_variant_aware_fork_fields_check,
  VALIDATE CONSTRAINT prompts_fork_source_model_variant_fkey;

ALTER TABLE public.source_run_submissions
  VALIDATE CONSTRAINT source_run_submissions_fork_step_number_check,
  VALIDATE CONSTRAINT source_run_submissions_fork_depth_check,
  VALIDATE CONSTRAINT source_run_submissions_fork_branch_index_check,
  VALIDATE CONSTRAINT source_run_submissions_fork_source_run_check,
  VALIDATE CONSTRAINT source_run_submissions_fork_source_artifact_path_check,
  VALIDATE CONSTRAINT source_run_submissions_fork_source_artifact_sha256_check,
  VALIDATE CONSTRAINT source_run_submissions_variant_aware_fork_fields_check,
  VALIDATE CONSTRAINT source_run_submissions_fork_source_model_variant_fkey;

CREATE INDEX IF NOT EXISTS idx_prompts_fork_source_project
  ON public.prompts(fork_source_project_id);
CREATE INDEX IF NOT EXISTS idx_prompts_fork_source_model_variant
  ON public.prompts(fork_source_model_variant_id)
  WHERE fork_source_model_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_fork_source_run
  ON public.prompts(fork_source_run_id)
  WHERE fork_source_run_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_unique_approved_fork_branch_slot
  ON public.prompts(
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
CREATE INDEX IF NOT EXISTS idx_prompts_prompt_family
  ON public.prompts(prompt_family_id);
CREATE INDEX IF NOT EXISTS idx_prompts_parent_fork
  ON public.prompts(fork_parent_submission_id);

CREATE INDEX IF NOT EXISTS idx_source_run_submissions_fork_source_project
  ON public.source_run_submissions(fork_source_project_id);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_fork_source_model_variant
  ON public.source_run_submissions(fork_source_model_variant_id)
  WHERE fork_source_model_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_fork_source_run
  ON public.source_run_submissions(fork_source_run_id)
  WHERE fork_source_run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_prompt_family
  ON public.source_run_submissions(prompt_family_id);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_parent_fork
  ON public.source_run_submissions(fork_parent_submission_id);

-- ---------------------------------------------------------------------------
-- Immutable model-run artifact evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_model_variant_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_variant_id UUID NOT NULL
    REFERENCES public.project_model_variants(id) ON DELETE RESTRICT,
  source_step_id TEXT NOT NULL CHECK (
    BTRIM(source_step_id) <> ''
    AND source_step_id = BTRIM(source_step_id)
  ),
  source_step_number INT NOT NULL CHECK (source_step_number > 0),
  artifact_path TEXT NOT NULL CHECK (
    artifact_path LIKE 'public/artifacts/%'
    AND LENGTH(artifact_path) > LENGTH('public/artifacts/')
    AND artifact_path = BTRIM(artifact_path)
    AND artifact_path NOT LIKE '%..%'
    AND STRPOS(artifact_path, CHR(92)) = 0
  ),
  artifact_sha256 TEXT NOT NULL CHECK (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (model_variant_id, artifact_path),
  UNIQUE (
    model_variant_id,
    source_step_id,
    source_step_number,
    artifact_path,
    artifact_sha256
  )
);

CREATE INDEX IF NOT EXISTS idx_project_model_variant_artifacts_step
  ON public.project_model_variant_artifacts(
    model_variant_id,
    source_step_number,
    source_step_id
  );

CREATE OR REPLACE FUNCTION public.validate_project_model_variant_artifact_step_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.project_model_variant_artifacts AS existing
    WHERE existing.model_variant_id = NEW.model_variant_id
      AND (
        (
          existing.source_step_id = NEW.source_step_id
          AND existing.source_step_number <> NEW.source_step_number
        )
        OR (
          existing.source_step_number = NEW.source_step_number
          AND existing.source_step_id <> NEW.source_step_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'A model-run response ID and response number must map one-to-one.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_project_model_variant_artifact_step_identity()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_project_model_variant_artifact_step_identity_fields
  ON public.project_model_variant_artifacts;
CREATE TRIGGER validate_project_model_variant_artifact_step_identity_fields
  BEFORE INSERT ON public.project_model_variant_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.validate_project_model_variant_artifact_step_identity();

CREATE OR REPLACE FUNCTION public.prevent_project_model_variant_artifact_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Published model-variant artifact evidence is immutable.';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_project_model_variant_artifact_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_project_model_variant_artifact_mutation() FROM anon, authenticated;

DROP TRIGGER IF EXISTS prevent_project_model_variant_artifact_mutation_fields
  ON public.project_model_variant_artifacts;
CREATE TRIGGER prevent_project_model_variant_artifact_mutation_fields
  BEFORE UPDATE OR DELETE ON public.project_model_variant_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_project_model_variant_artifact_mutation();

ALTER TABLE public.project_model_variant_artifacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.project_model_variant_artifacts
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.project_model_variant_artifacts TO service_role;

CREATE OR REPLACE FUNCTION public.publish_project_model_variant_artifact_evidence(
  target_project_id UUID,
  evidence_rows JSONB
)
RETURNS SETOF public.project_model_variant_artifacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  evidence_row JSONB;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    ) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF jsonb_typeof(evidence_rows) IS DISTINCT FROM 'array'
    OR jsonb_array_length(evidence_rows) < 1 THEN
    RAISE EXCEPTION 'Artifact-evidence payload must be a nonempty JSON array.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_project_id::TEXT || '|artifact-evidence', 0)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.prompts
    WHERE prompts.id = target_project_id
      AND prompts.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Artifact evidence requires an approved canonical project.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.project_model_variants
    WHERE project_model_variants.project_id = target_project_id
      AND project_model_variants.status IN ('published', 'historical')
  ) THEN
    RAISE EXCEPTION 'Artifact evidence requires at least one public model variant.';
  END IF;

  FOR evidence_row IN SELECT value FROM jsonb_array_elements(evidence_rows)
  LOOP
    IF jsonb_typeof(evidence_row) IS DISTINCT FROM 'object'
      OR NOT (evidence_row ?& ARRAY[
        'model_variant_id',
        'source_run_id',
        'source_step_id',
        'source_step_number',
        'artifact_path',
        'artifact_sha256'
      ])
      OR evidence_row - ARRAY[
        'model_variant_id',
        'source_run_id',
        'source_step_id',
        'source_step_number',
        'artifact_path',
        'artifact_sha256'
      ] <> '{}'::JSONB
      OR NULLIF(BTRIM(evidence_row->>'model_variant_id'), '') IS NULL
      OR NULLIF(BTRIM(evidence_row->>'source_run_id'), '') IS NULL
      OR NULLIF(BTRIM(evidence_row->>'source_step_id'), '') IS NULL
      OR jsonb_typeof(evidence_row->'source_step_number') IS DISTINCT FROM 'number'
      OR (evidence_row->>'source_step_number') !~ '^[1-9][0-9]*$'
      OR NULLIF(BTRIM(evidence_row->>'artifact_path'), '') IS NULL
      OR evidence_row->>'artifact_path' NOT LIKE 'public/artifacts/%'
      OR LENGTH(evidence_row->>'artifact_path') <= LENGTH('public/artifacts/')
      OR evidence_row->>'artifact_path' IS DISTINCT FROM BTRIM(evidence_row->>'artifact_path')
      OR evidence_row->>'artifact_path' LIKE '%..%'
      OR STRPOS(evidence_row->>'artifact_path', CHR(92)) > 0
      OR COALESCE(evidence_row->>'artifact_sha256', '') !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'Artifact-evidence row is malformed or contains unsupported fields.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.project_model_variants AS variant
      WHERE variant.id = (evidence_row->>'model_variant_id')::UUID
        AND variant.project_id = target_project_id
        AND variant.source_run_id = evidence_row->>'source_run_id'
        AND variant.status IN ('published', 'historical')
        AND evidence_row->>'artifact_path' = ANY (variant.artifact_version_paths)
    ) THEN
      RAISE EXCEPTION 'Artifact evidence does not belong to a public run of the canonical project.';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(evidence_rows) AS rows(row_value)
    GROUP BY row_value->>'model_variant_id', row_value->>'artifact_path'
    HAVING COUNT(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Artifact-evidence payload repeats a model-run artifact path.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(evidence_rows) AS rows(row_value)
    GROUP BY row_value->>'model_variant_id', row_value->>'source_step_id'
    HAVING COUNT(DISTINCT (row_value->>'source_step_number')::INT) <> 1
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(evidence_rows) AS rows(row_value)
    GROUP BY row_value->>'model_variant_id', (row_value->>'source_step_number')::INT
    HAVING COUNT(DISTINCT row_value->>'source_step_id') <> 1
  ) THEN
    RAISE EXCEPTION 'A model-run response ID and response number must map one-to-one.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.project_model_variants AS variant
    CROSS JOIN LATERAL UNNEST(variant.artifact_version_paths) AS paths(artifact_path)
    WHERE variant.project_id = target_project_id
      AND variant.status IN ('published', 'historical')
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(evidence_rows) AS rows(row_value)
        WHERE (rows.row_value->>'model_variant_id')::UUID = variant.id
          AND rows.row_value->>'source_run_id' = variant.source_run_id
          AND rows.row_value->>'artifact_path' = paths.artifact_path
      )
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(evidence_rows) AS rows(row_value)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.project_model_variants AS variant
      WHERE variant.id = (rows.row_value->>'model_variant_id')::UUID
        AND variant.project_id = target_project_id
        AND variant.status IN ('published', 'historical')
        AND rows.row_value->>'artifact_path' = ANY (variant.artifact_version_paths)
    )
  ) THEN
    RAISE EXCEPTION 'Artifact evidence must cover every public model-run artifact exactly once.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(evidence_rows) AS rows(row_value)
    JOIN public.project_model_variant_artifacts AS stored
      ON stored.model_variant_id = (rows.row_value->>'model_variant_id')::UUID
      AND stored.artifact_path = rows.row_value->>'artifact_path'
    WHERE stored.source_step_id IS DISTINCT FROM rows.row_value->>'source_step_id'
      OR stored.source_step_number IS DISTINCT FROM (rows.row_value->>'source_step_number')::INT
      OR stored.artifact_sha256 IS DISTINCT FROM rows.row_value->>'artifact_sha256'
  ) THEN
    RAISE EXCEPTION 'Immutable artifact evidence differs from the previously published tuple.';
  END IF;

  INSERT INTO public.project_model_variant_artifacts (
    model_variant_id,
    source_step_id,
    source_step_number,
    artifact_path,
    artifact_sha256
  )
  SELECT
    (rows.row_value->>'model_variant_id')::UUID,
    rows.row_value->>'source_step_id',
    (rows.row_value->>'source_step_number')::INT,
    rows.row_value->>'artifact_path',
    rows.row_value->>'artifact_sha256'
  FROM jsonb_array_elements(evidence_rows) AS rows(row_value)
  ON CONFLICT (model_variant_id, artifact_path) DO NOTHING;

  RETURN QUERY
  SELECT evidence.*
  FROM public.project_model_variant_artifacts AS evidence
  JOIN public.project_model_variants AS variant
    ON variant.id = evidence.model_variant_id
  WHERE variant.project_id = target_project_id
    AND variant.status IN ('published', 'historical')
  ORDER BY variant.source_run_id, evidence.source_step_number, evidence.artifact_path;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_project_model_variant_artifact_evidence(UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_project_model_variant_artifact_evidence(UUID, JSONB)
  TO service_role;

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

ALTER TABLE public.source_run_submissions
  DROP CONSTRAINT IF EXISTS source_run_submissions_variant_aware_fork_fields_check,
  ADD CONSTRAINT source_run_submissions_variant_aware_fork_fields_check CHECK (
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

ALTER TABLE public.source_run_submissions
  DROP CONSTRAINT IF EXISTS source_run_submissions_exact_variant_artifact_fkey,
  ADD CONSTRAINT source_run_submissions_exact_variant_artifact_fkey
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

DROP TRIGGER IF EXISTS validate_variant_aware_project_fork_fields ON public.source_run_submissions;
CREATE TRIGGER validate_variant_aware_project_fork_fields
  BEFORE INSERT OR UPDATE OF
    fork_source_project_id,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_artifact_path,
    fork_source_artifact_sha256
  ON public.source_run_submissions
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
-- Immutable source-package evidence and atomic prepared publication
-- ---------------------------------------------------------------------------

ALTER TABLE public.source_run_submissions
  ADD COLUMN IF NOT EXISTS canonical_source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_package_file TEXT,
  ADD COLUMN IF NOT EXISTS source_package_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS intake_evidence JSONB;

ALTER TABLE public.source_run_submissions
  DROP CONSTRAINT IF EXISTS source_run_submissions_canonical_source_url_check,
  ADD CONSTRAINT source_run_submissions_canonical_source_url_check CHECK (
    canonical_source_url IS NULL
    OR (
      canonical_source_url ~ '^https?://[^[:space:]]+$'
      AND canonical_source_url = BTRIM(canonical_source_url)
    )
  ),
  DROP CONSTRAINT IF EXISTS source_run_submissions_source_package_file_check,
  ADD CONSTRAINT source_run_submissions_source_package_file_check CHECK (
    source_package_file IS NULL
    OR (
      source_package_file LIKE 'seed-runs/%'
      AND LENGTH(source_package_file) > LENGTH('seed-runs/')
      AND source_package_file = BTRIM(source_package_file)
      AND source_package_file NOT LIKE '%..%'
      AND STRPOS(source_package_file, CHR(92)) = 0
    )
  ),
  DROP CONSTRAINT IF EXISTS source_run_submissions_source_package_sha256_check,
  ADD CONSTRAINT source_run_submissions_source_package_sha256_check CHECK (
    source_package_sha256 IS NULL
    OR source_package_sha256 ~ '^[0-9a-f]{64}$'
  ),
  DROP CONSTRAINT IF EXISTS source_run_submissions_package_evidence_group_check,
  ADD CONSTRAINT source_run_submissions_package_evidence_group_check CHECK (
    (
      source_package_file IS NULL
      AND source_package_sha256 IS NULL
      AND intake_evidence IS NULL
    )
    OR (
      source_package_file IS NOT NULL
      AND source_package_sha256 IS NOT NULL
      AND jsonb_typeof(intake_evidence) = 'object'
    )
  );

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
    OR jsonb_typeof(NEW.intake_evidence->'source_inspiration_notes') IS DISTINCT FROM 'array' THEN
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

CREATE OR REPLACE FUNCTION public.prevent_source_run_intake_evidence_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.author_id IS DISTINCT FROM OLD.author_id
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.source_url IS DISTINCT FROM OLD.source_url
    OR NEW.canonical_source_url IS DISTINCT FROM OLD.canonical_source_url
    OR NEW.file_name IS DISTINCT FROM OLD.file_name
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.source_package_file IS DISTINCT FROM OLD.source_package_file
    OR NEW.source_package_sha256 IS DISTINCT FROM OLD.source_package_sha256
    OR NEW.intake_evidence IS DISTINCT FROM OLD.intake_evidence
    OR NEW.fork_source_project_id IS DISTINCT FROM OLD.fork_source_project_id
    OR NEW.fork_source_project_title IS DISTINCT FROM OLD.fork_source_project_title
    OR NEW.fork_source_model_variant_id IS DISTINCT FROM OLD.fork_source_model_variant_id
    OR NEW.fork_source_run_id IS DISTINCT FROM OLD.fork_source_run_id
    OR NEW.fork_source_step_id IS DISTINCT FROM OLD.fork_source_step_id
    OR NEW.fork_source_step_number IS DISTINCT FROM OLD.fork_source_step_number
    OR NEW.fork_source_artifact_path IS DISTINCT FROM OLD.fork_source_artifact_path
    OR NEW.fork_source_artifact_sha256 IS DISTINCT FROM OLD.fork_source_artifact_sha256
    OR NEW.fork_parent_submission_id IS DISTINCT FROM OLD.fork_parent_submission_id
    OR NEW.prompt_family_id IS DISTINCT FROM OLD.prompt_family_id
    OR NEW.fork_depth IS DISTINCT FROM OLD.fork_depth
    OR NEW.fork_branch_index IS DISTINCT FROM OLD.fork_branch_index THEN
    RAISE EXCEPTION 'Imported source-run intake and lineage evidence is immutable.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_source_run_intake_evidence_mutation()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_source_run_intake_evidence_mutation_fields
  ON public.source_run_submissions;
CREATE TRIGGER prevent_source_run_intake_evidence_mutation_fields
  BEFORE UPDATE ON public.source_run_submissions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_source_run_intake_evidence_mutation();

CREATE OR REPLACE FUNCTION public.publish_prepared_showcase_source_run(
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
DECLARE
  source_run public.source_run_submissions%ROWTYPE;
  existing_project public.prompts%ROWTYPE;
  category_id UUID;
  project_id UUID;
  created_at_value TIMESTAMPTZ;
  tools_used_value TEXT[];
  tags_value TEXT[];
  actual_intake JSONB;
  actual_fork JSONB;
  inserted_project public.prompts%ROWTYPE;
  updated_count INT;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    ) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  IF jsonb_typeof(expected_intake) IS DISTINCT FROM 'object'
    OR NOT (expected_intake ?& ARRAY[
      'author_id',
      'title',
      'source_url',
      'canonical_source_url',
      'file_name',
      'notes',
      'source_package_file',
      'source_package_sha256',
      'intake_evidence'
    ])
    OR expected_intake - ARRAY[
      'author_id',
      'title',
      'source_url',
      'canonical_source_url',
      'file_name',
      'notes',
      'source_package_file',
      'source_package_sha256',
      'intake_evidence'
    ] <> '{}'::JSONB THEN
    RAISE EXCEPTION 'Expected intake must contain exactly the immutable review fields.';
  END IF;

  IF jsonb_typeof(project_payload) IS DISTINCT FROM 'object'
    OR NOT (project_payload ?& ARRAY[
      'id',
      'title',
      'description',
      'content',
      'result_content',
      'category_slug',
      'difficulty',
      'model_used',
      'model_recommendation',
      'tools_used',
      'tags',
      'created_at',
      'public_href'
    ])
    OR project_payload - ARRAY[
      'id',
      'title',
      'description',
      'content',
      'result_content',
      'category_slug',
      'difficulty',
      'model_used',
      'model_recommendation',
      'tools_used',
      'tags',
      'created_at',
      'public_href'
    ] <> '{}'::JSONB
    OR NULLIF(BTRIM(project_payload->>'id'), '') IS NULL
    OR NULLIF(BTRIM(project_payload->>'title'), '') IS NULL
    OR NULLIF(BTRIM(project_payload->>'description'), '') IS NULL
    OR NULLIF(BTRIM(project_payload->>'content'), '') IS NULL
    OR NULLIF(BTRIM(project_payload->>'category_slug'), '') IS NULL
    OR project_payload->>'difficulty' NOT IN ('beginner', 'intermediate', 'advanced')
    OR jsonb_typeof(project_payload->'tools_used') IS DISTINCT FROM 'array'
    OR jsonb_typeof(project_payload->'tags') IS DISTINCT FROM 'array'
    OR NULLIF(BTRIM(project_payload->>'created_at'), '') IS NULL
    OR COALESCE(project_payload->>'public_href', '') !~ '^/[a-z0-9][a-z0-9/-]*$'
    OR project_payload->>'public_href' LIKE '%//%'
    OR project_payload->>'public_href' LIKE '%..%' THEN
    RAISE EXCEPTION 'Prepared project payload is malformed or contains unsupported fields.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(project_payload->'tools_used') AS values(value)
    WHERE jsonb_typeof(value) IS DISTINCT FROM 'string'
      OR NULLIF(BTRIM(value #>> '{}'), '') IS NULL
  ) OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(project_payload->'tags') AS values(value)
    WHERE jsonb_typeof(value) IS DISTINCT FROM 'string'
      OR NULLIF(BTRIM(value #>> '{}'), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Prepared project tools and tags must be nonblank strings.';
  END IF;

  project_id := (project_payload->>'id')::UUID;
  created_at_value := (project_payload->>'created_at')::TIMESTAMPTZ;
  tools_used_value := ARRAY(SELECT jsonb_array_elements_text(project_payload->'tools_used'));
  tags_value := ARRAY(SELECT jsonb_array_elements_text(project_payload->'tags'));

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_source_run_id::TEXT || '|prepared-publication', 0)
  );

  SELECT *
  INTO source_run
  FROM public.source_run_submissions
  WHERE source_run_submissions.id = target_source_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source-run intake does not exist.';
  END IF;

  actual_intake := jsonb_build_object(
    'author_id', source_run.author_id,
    'title', source_run.title,
    'source_url', source_run.source_url,
    'canonical_source_url', source_run.canonical_source_url,
    'file_name', source_run.file_name,
    'notes', source_run.notes,
    'source_package_file', source_run.source_package_file,
    'source_package_sha256', source_run.source_package_sha256,
    'intake_evidence', source_run.intake_evidence
  );

  IF actual_intake IS DISTINCT FROM expected_intake THEN
    RAISE EXCEPTION 'Source-run intake differs from the reviewed immutable evidence.';
  END IF;

  IF source_run.source_url IS NULL
    OR source_run.canonical_source_url IS NULL
    OR source_run.source_package_file IS NULL
    OR source_run.source_package_sha256 !~ '^[0-9a-f]{64}$'
    OR source_run.intake_evidence IS NULL THEN
    RAISE EXCEPTION 'Prepared publication requires complete source-package evidence.';
  END IF;

  actual_fork := CASE
    WHEN NULLIF(BTRIM(COALESCE(source_run.fork_source_project_id, '')), '') IS NULL THEN
      'null'::JSONB
    ELSE jsonb_build_object(
      'source_project_id', source_run.fork_source_project_id,
      'source_project_title', source_run.fork_source_project_title,
      'source_model_variant_id', source_run.fork_source_model_variant_id,
      'source_run_id', source_run.fork_source_run_id,
      'source_step_id', source_run.fork_source_step_id,
      'source_step_number', source_run.fork_source_step_number,
      'source_artifact_path', source_run.fork_source_artifact_path,
      'source_artifact_sha256', source_run.fork_source_artifact_sha256,
      'parent_fork_id', source_run.fork_parent_submission_id,
      'prompt_family_id', source_run.prompt_family_id,
      'fork_depth', source_run.fork_depth,
      'fork_branch_index', source_run.fork_branch_index
    )
  END;

  IF COALESCE(expected_fork, 'null'::JSONB) IS DISTINCT FROM actual_fork
    OR COALESCE(source_run.intake_evidence->'fork', 'null'::JSONB)
      IS DISTINCT FROM actual_fork THEN
    RAISE EXCEPTION 'Prepared publication fork lineage differs from reviewed evidence.';
  END IF;

  IF source_run.fork_source_model_variant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.project_model_variants AS variant
    JOIN public.project_model_variant_artifacts AS evidence
      ON evidence.model_variant_id = variant.id
    WHERE variant.id = source_run.fork_source_model_variant_id
      AND variant.project_id::TEXT = source_run.fork_source_project_id
      AND variant.source_run_id = source_run.fork_source_run_id
      AND variant.status IN ('published', 'historical')
      AND evidence.source_step_id = source_run.fork_source_step_id
      AND evidence.source_step_number = source_run.fork_source_step_number
      AND evidence.artifact_path = source_run.fork_source_artifact_path
      AND evidence.artifact_sha256 = source_run.fork_source_artifact_sha256
  ) THEN
    RAISE EXCEPTION 'Prepared publication no longer has exact public source-artifact evidence.';
  END IF;

  SELECT categories.id
  INTO category_id
  FROM public.categories
  WHERE categories.slug = project_payload->>'category_slug';

  IF category_id IS NULL THEN
    RAISE EXCEPTION 'Prepared project category does not exist.';
  END IF;

  SELECT *
  INTO existing_project
  FROM public.prompts
  WHERE prompts.id = project_id
  FOR UPDATE;

  IF source_run.status = 'draft_created' THEN
    IF source_run.extracted_prompt_id IS DISTINCT FROM project_id
      OR NOT FOUND
      OR existing_project.title IS DISTINCT FROM project_payload->>'title'
      OR existing_project.description IS DISTINCT FROM project_payload->>'description'
      OR existing_project.content IS DISTINCT FROM project_payload->>'content'
      OR existing_project.result_content IS DISTINCT FROM NULLIF(project_payload->>'result_content', '')
      OR existing_project.category_id IS DISTINCT FROM category_id
      OR existing_project.difficulty IS DISTINCT FROM project_payload->>'difficulty'
      OR existing_project.model_used IS DISTINCT FROM NULLIF(project_payload->>'model_used', '')
      OR existing_project.model_recommendation IS DISTINCT FROM NULLIF(project_payload->>'model_recommendation', '')
      OR existing_project.tools_used IS DISTINCT FROM tools_used_value
      OR existing_project.tags IS DISTINCT FROM tags_value
      OR existing_project.status IS DISTINCT FROM 'approved'
      OR existing_project.author_id IS DISTINCT FROM source_run.author_id
      OR existing_project.created_at IS DISTINCT FROM created_at_value
      OR existing_project.fork_source_project_id IS DISTINCT FROM source_run.fork_source_project_id
      OR existing_project.fork_source_project_title IS DISTINCT FROM source_run.fork_source_project_title
      OR existing_project.fork_source_model_variant_id IS DISTINCT FROM source_run.fork_source_model_variant_id
      OR existing_project.fork_source_run_id IS DISTINCT FROM source_run.fork_source_run_id
      OR existing_project.fork_source_step_id IS DISTINCT FROM source_run.fork_source_step_id
      OR existing_project.fork_source_step_number IS DISTINCT FROM source_run.fork_source_step_number
      OR existing_project.fork_source_artifact_path IS DISTINCT FROM source_run.fork_source_artifact_path
      OR existing_project.fork_source_artifact_sha256 IS DISTINCT FROM source_run.fork_source_artifact_sha256
      OR existing_project.fork_parent_submission_id IS DISTINCT FROM source_run.fork_parent_submission_id
      OR existing_project.prompt_family_id IS DISTINCT FROM source_run.prompt_family_id
      OR existing_project.fork_depth IS DISTINCT FROM source_run.fork_depth THEN
      RAISE EXCEPTION 'Prepared publication replay differs from the existing linked project.';
    END IF;
    RETURN project_id;
  END IF;

  IF source_run.status IS DISTINCT FROM 'queued'
    OR source_run.extracted_prompt_id IS NOT NULL
    OR source_run.admin_notes IS NOT NULL THEN
    RAISE EXCEPTION 'Prepared publication requires an untouched queued intake.';
  END IF;

  IF FOUND THEN
    RAISE EXCEPTION 'Prepared project ID is already in use.';
  END IF;

  INSERT INTO public.prompts (
    id,
    title,
    description,
    content,
    result_content,
    category_id,
    difficulty,
    model_used,
    model_recommendation,
    tools_used,
    tags,
    status,
    author_id,
    vote_count,
    bookmark_count,
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
    fork_branch_index,
    created_at,
    updated_at
  ) VALUES (
    project_id,
    project_payload->>'title',
    project_payload->>'description',
    project_payload->>'content',
    NULLIF(project_payload->>'result_content', ''),
    category_id,
    project_payload->>'difficulty',
    NULLIF(project_payload->>'model_used', ''),
    NULLIF(project_payload->>'model_recommendation', ''),
    tools_used_value,
    tags_value,
    'approved',
    source_run.author_id,
    0,
    0,
    source_run.fork_source_project_id,
    source_run.fork_source_project_title,
    source_run.fork_source_model_variant_id,
    source_run.fork_source_run_id,
    source_run.fork_source_step_id,
    source_run.fork_source_step_number,
    source_run.fork_source_artifact_path,
    source_run.fork_source_artifact_sha256,
    source_run.fork_parent_submission_id,
    source_run.prompt_family_id,
    source_run.fork_depth,
    source_run.fork_branch_index,
    created_at_value,
    NOW()
  )
  RETURNING * INTO inserted_project;

  UPDATE public.source_run_submissions
  SET status = 'draft_created',
      extracted_prompt_id = project_id,
      admin_notes = 'Published to ' || (project_payload->>'public_href') || '.',
      updated_at = NOW()
  WHERE source_run_submissions.id = target_source_run_id
    AND source_run_submissions.status = 'queued'
    AND source_run_submissions.extracted_prompt_id IS NULL
    AND source_run_submissions.admin_notes IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'Source-run intake changed during prepared publication.';
  END IF;

  RETURN inserted_project.id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Direct-write least privilege. Public publication stays RPC-only.
-- ---------------------------------------------------------------------------

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_run_submissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.prompts FROM anon, authenticated;
GRANT SELECT ON TABLE public.prompts TO anon, authenticated;
GRANT INSERT (
  title,
  description,
  content,
  result_content,
  category_id,
  difficulty,
  model_used,
  model_recommendation,
  tools_used,
  tags,
  status,
  author_id,
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
) ON TABLE public.prompts TO authenticated;
GRANT UPDATE (
  title,
  description,
  content,
  result_content,
  category_id,
  difficulty,
  model_used,
  model_recommendation,
  tools_used,
  tags,
  status,
  updated_at
) ON TABLE public.prompts TO authenticated;

DROP POLICY IF EXISTS "Approved prompts are viewable by everyone" ON public.prompts;
DROP POLICY IF EXISTS "Authenticated users can create prompts" ON public.prompts;
DROP POLICY IF EXISTS "Authors and admins can update prompts" ON public.prompts;
DROP POLICY IF EXISTS "Public prompts, owners, and admins can read" ON public.prompts;
DROP POLICY IF EXISTS "Authenticated users create pending zero-engagement prompts" ON public.prompts;
DROP POLICY IF EXISTS "Owners edit pending prompts and admins review" ON public.prompts;

CREATE POLICY "Public prompts, owners, and admins can read"
  ON public.prompts FOR SELECT
  USING (
    status = 'approved'
    OR author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users create pending zero-engagement prompts"
  ON public.prompts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND status = 'pending'
    AND vote_count = 0
    AND bookmark_count = 0
  );

CREATE POLICY "Owners edit pending prompts and admins review"
  ON public.prompts FOR UPDATE TO authenticated
  USING (
    (author_id = (SELECT auth.uid()) AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    (author_id = (SELECT auth.uid()) AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

REVOKE ALL ON TABLE public.prompt_steps FROM anon, authenticated;
GRANT SELECT ON TABLE public.prompt_steps TO anon, authenticated;
GRANT INSERT (
  prompt_id,
  step_number,
  title,
  content,
  result_content,
  description
) ON TABLE public.prompt_steps TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can create prompt steps" ON public.prompt_steps;
DROP POLICY IF EXISTS "Owners can add steps to pending prompts" ON public.prompt_steps;
CREATE POLICY "Owners can add steps to pending prompts"
  ON public.prompt_steps FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.prompts
      WHERE prompts.id = prompt_steps.prompt_id
        AND prompts.author_id = (SELECT auth.uid())
        AND prompts.status = 'pending'
    )
  );

REVOKE ALL ON TABLE public.source_run_submissions FROM anon, authenticated;
GRANT SELECT ON TABLE public.source_run_submissions TO authenticated;
GRANT INSERT (
  title,
  source_url,
  file_name,
  notes,
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
  fork_branch_index,
  author_id,
  status
) ON TABLE public.source_run_submissions TO authenticated;
GRANT UPDATE (status, extracted_prompt_id, admin_notes, updated_at)
  ON TABLE public.source_run_submissions TO authenticated;

DROP POLICY IF EXISTS "Users can submit own source runs" ON public.source_run_submissions;
DROP POLICY IF EXISTS "Users submit untouched queued source runs" ON public.source_run_submissions;
CREATE POLICY "Users submit untouched queued source runs"
  ON public.source_run_submissions FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND status = 'queued'
    AND extracted_prompt_id IS NULL
    AND admin_notes IS NULL
    AND canonical_source_url IS NULL
    AND source_package_file IS NULL
    AND source_package_sha256 IS NULL
    AND intake_evidence IS NULL
  );

DROP POLICY IF EXISTS "Admins can update source runs" ON public.source_run_submissions;
CREATE POLICY "Admins can update source runs"
  ON public.source_run_submissions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
