-- PromptForge Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  prompt_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompts
CREATE TABLE prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  result_content TEXT,
  category_id UUID REFERENCES categories(id),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  model_used TEXT,
  model_recommendation TEXT,
  tools_used TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  author_id UUID REFERENCES profiles(id),
  vote_count INT DEFAULT 0,
  bookmark_count INT DEFAULT 0,
  fork_source_project_id TEXT,
  fork_source_project_title TEXT,
  fork_source_step_id TEXT,
  fork_source_step_number INT CHECK (fork_source_step_number IS NULL OR fork_source_step_number > 0),
  fork_source_model_variant_id UUID,
  fork_source_run_id TEXT,
  fork_source_artifact_path TEXT,
  fork_source_artifact_sha256 TEXT,
  fork_parent_submission_id TEXT,
  prompt_family_id TEXT,
  fork_depth INT NOT NULL DEFAULT 0 CHECK (fork_depth >= 0 AND fork_depth < 10),
  fork_branch_index INT NOT NULL DEFAULT 0 CHECK (fork_branch_index >= 0 AND fork_branch_index < 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Steps (for multi-step chains)
CREATE TABLE prompt_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  result_content TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)
);

-- Bookmarks
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)
);

-- Canonical-project model variants
-- A model variant is an append-only provider rerun of one approved project.
-- It is not a prompt, an artifact version, or a community fork.
CREATE TABLE project_model_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES prompts(id) ON DELETE RESTRICT,
  source_run_id TEXT NOT NULL UNIQUE CHECK (BTRIM(source_run_id) <> ''),

  provider_key TEXT NOT NULL CHECK (provider_key IN ('openai', 'anthropic', 'google')),
  service_label TEXT NOT NULL CHECK (BTRIM(service_label) <> ''),
  model_release_key TEXT NOT NULL CHECK (BTRIM(model_release_key) <> ''),
  model_label TEXT NOT NULL CHECK (BTRIM(model_label) <> ''),
  model_settings JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(model_settings) = 'object'),

  source_url TEXT NOT NULL CHECK (source_url ~ '^https://'),
  source_package_file TEXT NOT NULL UNIQUE CHECK (
    source_package_file LIKE 'seed-runs/%'
    AND source_package_file NOT LIKE '%..%'
  ),
  source_package_sha256 TEXT NOT NULL CHECK (source_package_sha256 ~ '^[0-9a-f]{64}$'),
  opening_prompt_sha256 TEXT NOT NULL CHECK (opening_prompt_sha256 ~ '^[0-9a-f]{64}$'),
  comparison_contract_version TEXT NOT NULL CHECK (BTRIM(comparison_contract_version) <> ''),
  comparison_contract_sha256 TEXT NOT NULL CHECK (comparison_contract_sha256 ~ '^[0-9a-f]{64}$'),

  operator_kind TEXT NOT NULL CHECK (
    operator_kind IN ('original_author', 'pathforge_labs_manual', 'pathforge_labs_automation')
  ),
  operator_label TEXT NOT NULL CHECK (BTRIM(operator_label) <> ''),
  automation_run_id TEXT CHECK (automation_run_id IS NULL OR BTRIM(automation_run_id) <> ''),
  run_role TEXT NOT NULL CHECK (run_role IN ('historical_baseline', 'comparison_run')),
  quality_status TEXT NOT NULL CHECK (quality_status IN ('verified', 'known_issue')),

  run_started_at TIMESTAMPTZ,
  run_finished_at TIMESTAMPTZ,
  prompt_count SMALLINT NOT NULL CHECK (prompt_count > 0),
  repair_prompt_count SMALLINT NOT NULL DEFAULT 0 CHECK (
    repair_prompt_count >= 0 AND repair_prompt_count < prompt_count
  ),

  first_artifact_path TEXT NOT NULL CHECK (first_artifact_path LIKE 'public/artifacts/%'),
  final_artifact_path TEXT NOT NULL CHECK (final_artifact_path LIKE 'public/artifacts/%'),
  artifact_version_paths TEXT[] NOT NULL DEFAULT '{}',
  first_pass_metrics JSONB NOT NULL CHECK (jsonb_typeof(first_pass_metrics) = 'object'),
  final_metrics JSONB NOT NULL CHECK (jsonb_typeof(final_metrics) = 'object'),

  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'historical', 'retired', 'failed')
  ),
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  supersedes_variant_id UUID REFERENCES project_model_variants(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (run_finished_at IS NULL OR run_started_at IS NULL OR run_finished_at >= run_started_at),
  CHECK (CARDINALITY(artifact_version_paths) > 0),
  CHECK (ARRAY_POSITION(artifact_version_paths, NULL) IS NULL),
  CHECK (final_artifact_path = ANY (artifact_version_paths)),
  CHECK (first_artifact_path = ANY (artifact_version_paths)),
  CHECK (supersedes_variant_id IS NULL OR supersedes_variant_id <> id),
  CHECK (quality_status = 'verified' OR run_role = 'historical_baseline'),
  CHECK (
    NOT is_default OR (
      is_current
      AND status = 'published'
      AND quality_status = 'verified'
    )
  )
);

ALTER TABLE public.prompts
  ADD CONSTRAINT prompts_fork_source_model_variant_fkey
    FOREIGN KEY (fork_source_model_variant_id)
    REFERENCES public.project_model_variants(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT prompts_fork_source_run_check
    CHECK (
      fork_source_run_id IS NULL
      OR (
        BTRIM(fork_source_run_id) <> ''
        AND fork_source_run_id = BTRIM(fork_source_run_id)
      )
    ),
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
  ADD CONSTRAINT prompts_fork_source_artifact_sha256_check
    CHECK (
      fork_source_artifact_sha256 IS NULL
      OR fork_source_artifact_sha256 ~ '^[0-9a-f]{64}$'
    ),
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

CREATE UNIQUE INDEX idx_project_model_variants_current_provider
  ON project_model_variants(project_id, provider_key)
  WHERE is_current AND status = 'published';

CREATE UNIQUE INDEX idx_project_model_variants_default
  ON project_model_variants(project_id)
  WHERE is_default AND is_current AND status = 'published';

CREATE UNIQUE INDEX idx_project_model_variants_automation_run
  ON project_model_variants(automation_run_id)
  WHERE automation_run_id IS NOT NULL;

CREATE INDEX idx_project_model_variants_project_history
  ON project_model_variants(project_id, run_finished_at DESC, created_at DESC);

CREATE UNIQUE INDEX idx_project_model_variants_one_successor
  ON project_model_variants(supersedes_variant_id)
  WHERE supersedes_variant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION valid_project_model_variant_artifact_paths(paths TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
STRICT
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    CARDINALITY(paths) > 0
    AND CARDINALITY(paths) = (
      SELECT COUNT(DISTINCT artifact_path)
      FROM UNNEST(paths) AS artifact_paths(artifact_path)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM UNNEST(paths) AS artifact_paths(artifact_path)
      WHERE artifact_path IS NULL
        OR artifact_path NOT LIKE 'public/artifacts/%'
        OR LENGTH(artifact_path) <= LENGTH('public/artifacts/')
        OR artifact_path LIKE '%..%'
        OR artifact_path LIKE E'%\\\\%'
        OR BTRIM(artifact_path) = ''
    );
$$;

REVOKE ALL ON FUNCTION valid_project_model_variant_artifact_paths(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION valid_project_model_variant_artifact_paths(TEXT[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION valid_project_model_variant_artifact_paths(TEXT[]) TO service_role;

CREATE OR REPLACE FUNCTION valid_project_model_variant_metrics(metrics JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
STRICT
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  checks JSONB;
BEGIN
  IF jsonb_typeof(metrics) IS DISTINCT FROM 'object'
    OR jsonb_typeof(metrics->'qualityScore') IS DISTINCT FROM 'number'
    OR jsonb_typeof(metrics->'artifactReady') IS DISTINCT FROM 'boolean'
    OR jsonb_typeof(metrics->'hardGatesPassed') IS DISTINCT FROM 'boolean'
    OR jsonb_typeof(metrics->'consoleErrorCount') IS DISTINCT FROM 'number'
    OR jsonb_typeof(metrics->'horizontalOverflowPx') IS DISTINCT FROM 'number'
    OR jsonb_typeof(metrics->'functionalChecks') IS DISTINCT FROM 'object'
    OR jsonb_typeof(metrics->'notes') IS DISTINCT FROM 'array' THEN
    RETURN FALSE;
  END IF;

  checks := metrics->'functionalChecks';
  IF jsonb_typeof(checks->'passed') IS DISTINCT FROM 'number'
    OR jsonb_typeof(checks->'total') IS DISTINCT FROM 'number'
    OR (checks->>'passed') !~ '^[0-9]+$'
    OR (checks->>'total') !~ '^[0-9]+$'
    OR (metrics->>'consoleErrorCount') !~ '^[0-9]+$'
    OR (metrics->>'horizontalOverflowPx') !~ '^[0-9]+$'
    OR (metrics->>'qualityScore') !~ '^[0-9]+(?:[.][0-9]+)?$' THEN
    RETURN FALSE;
  END IF;

  IF (metrics->>'qualityScore')::NUMERIC NOT BETWEEN 0 AND 100
    OR (checks->>'total')::INTEGER < 8
    OR (checks->>'passed')::INTEGER > (checks->>'total')::INTEGER
    OR jsonb_array_length(metrics->'notes') < 1
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(metrics->'notes') AS notes(note_value)
      WHERE jsonb_typeof(note_value) IS DISTINCT FROM 'string'
        OR BTRIM(note_value #>> '{}') = ''
    ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION valid_project_model_variant_metrics(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION valid_project_model_variant_metrics(JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION valid_project_model_variant_metrics(JSONB) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.project_model_variants'::REGCLASS
      AND conname = 'project_model_variants_artifact_paths_valid'
  ) THEN
    ALTER TABLE public.project_model_variants
      ADD CONSTRAINT project_model_variants_artifact_paths_valid
      CHECK (public.valid_project_model_variant_artifact_paths(artifact_version_paths))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.project_model_variants'::REGCLASS
      AND conname = 'project_model_variants_metrics_valid'
  ) THEN
    ALTER TABLE public.project_model_variants
      ADD CONSTRAINT project_model_variants_metrics_valid
      CHECK (
        public.valid_project_model_variant_metrics(first_pass_metrics)
        AND public.valid_project_model_variant_metrics(final_metrics)
      )
      NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.project_model_variants
  VALIDATE CONSTRAINT project_model_variants_artifact_paths_valid;
ALTER TABLE public.project_model_variants
  VALIDATE CONSTRAINT project_model_variants_metrics_valid;

CREATE OR REPLACE FUNCTION validate_project_model_variant_lineage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  immediate_prior public.project_model_variants%ROWTYPE;
BEGIN
  IF public.valid_project_model_variant_artifact_paths(NEW.artifact_version_paths) IS NOT TRUE THEN
    RAISE EXCEPTION 'Model-variant artifact paths must be unique production-servable public artifacts.';
  END IF;

  IF public.valid_project_model_variant_metrics(NEW.first_pass_metrics) IS NOT TRUE
    OR public.valid_project_model_variant_metrics(NEW.final_metrics) IS NOT TRUE THEN
    RAISE EXCEPTION 'Model-variant verification metrics are malformed.';
  END IF;

  IF (NEW.first_pass_metrics->'functionalChecks'->>'total')::INTEGER < 8
    OR (NEW.first_pass_metrics->'functionalChecks'->>'total')::INTEGER <>
      (NEW.final_metrics->'functionalChecks'->>'total')::INTEGER THEN
    RAISE EXCEPTION 'Model-variant metrics must use one acceptance contract with at least eight checks.';
  END IF;

  IF NEW.quality_status = 'verified' AND (
    (NEW.final_metrics->>'qualityScore')::NUMERIC < 90
    OR (NEW.final_metrics->>'artifactReady')::BOOLEAN IS NOT TRUE
    OR (NEW.final_metrics->>'hardGatesPassed')::BOOLEAN IS NOT TRUE
    OR (NEW.final_metrics->'functionalChecks'->>'passed')::INTEGER <>
      (NEW.final_metrics->'functionalChecks'->>'total')::INTEGER
    OR (NEW.final_metrics->>'consoleErrorCount')::INTEGER <> 0
    OR (NEW.final_metrics->>'horizontalOverflowPx')::INTEGER <> 0
  ) THEN
    RAISE EXCEPTION 'Verified model variants must meet the A+ final-metrics bar.';
  END IF;

  IF NEW.status IN ('published', 'historical')
    AND NOT EXISTS (
      SELECT 1
      FROM public.prompts
      WHERE prompts.id = NEW.project_id
      AND prompts.status = 'approved'
    ) THEN
    RAISE EXCEPTION 'Published model variants require an approved canonical project.';
  END IF;

  IF NEW.supersedes_variant_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.project_model_variants AS prior_variant
      WHERE prior_variant.id = NEW.supersedes_variant_id
      AND prior_variant.project_id = NEW.project_id
      AND prior_variant.provider_key = NEW.provider_key
    ) THEN
    RAISE EXCEPTION 'A superseded model variant must belong to the same project and provider.';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status IN ('published', 'historical') THEN
    SELECT *
    INTO immediate_prior
    FROM public.project_model_variants AS prior_variant
    WHERE prior_variant.project_id = NEW.project_id
    AND prior_variant.provider_key = NEW.provider_key
    AND prior_variant.status IN ('published', 'historical')
    ORDER BY prior_variant.created_at DESC, prior_variant.run_finished_at DESC NULLS LAST, prior_variant.id DESC
    LIMIT 1;

    IF FOUND THEN
      IF NEW.supersedes_variant_id IS DISTINCT FROM immediate_prior.id THEN
        RAISE EXCEPTION 'A new model variant must supersede the immediately prior same-provider release.';
      END IF;
      IF NEW.status <> 'published'
        OR NEW.run_role <> 'comparison_run'
        OR NEW.quality_status <> 'verified'
        OR NEW.is_current IS NOT TRUE THEN
        RAISE EXCEPTION 'A same-provider rerun must become the current verified comparison.';
      END IF;
      IF NEW.run_finished_at IS NULL
        OR immediate_prior.run_finished_at IS NULL
        OR NEW.run_finished_at <= immediate_prior.run_finished_at THEN
        RAISE EXCEPTION 'A superseding model variant must finish after the immediately prior release.';
      END IF;
    ELSIF NEW.supersedes_variant_id IS NOT NULL THEN
      RAISE EXCEPTION 'A provider launch root cannot supersede another run.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION validate_project_model_variant_lineage() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_project_model_variant_lineage() FROM anon, authenticated;

CREATE TRIGGER validate_project_model_variant_lineage_fields
  BEFORE INSERT OR UPDATE OF
    project_id,
    provider_key,
    supersedes_variant_id,
    status,
    quality_status,
    first_artifact_path,
    final_artifact_path,
    artifact_version_paths,
    first_pass_metrics,
    final_metrics
  ON project_model_variants
  FOR EACH ROW EXECUTE FUNCTION validate_project_model_variant_lineage();

CREATE OR REPLACE FUNCTION prevent_published_model_variant_evidence_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('published', 'historical', 'retired')
    AND NEW.status NOT IN ('published', 'historical', 'retired') THEN
    RAISE EXCEPTION 'Published model-variant evidence cannot return to an editable status.';
  END IF;

  IF OLD.status IN ('published', 'historical', 'retired') AND (
    NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.source_run_id IS DISTINCT FROM OLD.source_run_id
    OR NEW.provider_key IS DISTINCT FROM OLD.provider_key
    OR NEW.service_label IS DISTINCT FROM OLD.service_label
    OR NEW.model_release_key IS DISTINCT FROM OLD.model_release_key
    OR NEW.model_label IS DISTINCT FROM OLD.model_label
    OR NEW.model_settings IS DISTINCT FROM OLD.model_settings
    OR NEW.source_url IS DISTINCT FROM OLD.source_url
    OR NEW.source_package_file IS DISTINCT FROM OLD.source_package_file
    OR NEW.source_package_sha256 IS DISTINCT FROM OLD.source_package_sha256
    OR NEW.opening_prompt_sha256 IS DISTINCT FROM OLD.opening_prompt_sha256
    OR NEW.comparison_contract_version IS DISTINCT FROM OLD.comparison_contract_version
    OR NEW.comparison_contract_sha256 IS DISTINCT FROM OLD.comparison_contract_sha256
    OR NEW.operator_kind IS DISTINCT FROM OLD.operator_kind
    OR NEW.operator_label IS DISTINCT FROM OLD.operator_label
    OR NEW.automation_run_id IS DISTINCT FROM OLD.automation_run_id
    OR NEW.run_role IS DISTINCT FROM OLD.run_role
    OR NEW.quality_status IS DISTINCT FROM OLD.quality_status
    OR NEW.run_started_at IS DISTINCT FROM OLD.run_started_at
    OR NEW.run_finished_at IS DISTINCT FROM OLD.run_finished_at
    OR NEW.prompt_count IS DISTINCT FROM OLD.prompt_count
    OR NEW.repair_prompt_count IS DISTINCT FROM OLD.repair_prompt_count
    OR NEW.first_artifact_path IS DISTINCT FROM OLD.first_artifact_path
    OR NEW.final_artifact_path IS DISTINCT FROM OLD.final_artifact_path
    OR NEW.artifact_version_paths IS DISTINCT FROM OLD.artifact_version_paths
    OR NEW.first_pass_metrics IS DISTINCT FROM OLD.first_pass_metrics
    OR NEW.final_metrics IS DISTINCT FROM OLD.final_metrics
    OR NEW.supersedes_variant_id IS DISTINCT FROM OLD.supersedes_variant_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Published model-variant evidence is immutable; append a superseding row.';
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION prevent_published_model_variant_evidence_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION prevent_published_model_variant_evidence_update() FROM anon, authenticated;

CREATE TRIGGER preserve_project_model_variant_evidence
  BEFORE UPDATE ON project_model_variants
  FOR EACH ROW EXECUTE FUNCTION prevent_published_model_variant_evidence_update();

CREATE OR REPLACE FUNCTION prevent_locked_model_variant_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('published', 'historical', 'retired') THEN
    RAISE EXCEPTION 'Published model-variant evidence cannot be deleted; retire it instead.';
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION prevent_locked_model_variant_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION prevent_locked_model_variant_delete() FROM anon, authenticated;

CREATE TRIGGER preserve_project_model_variant_history
  BEFORE DELETE ON project_model_variants
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_model_variant_delete();

ALTER TABLE project_model_variants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE project_model_variants FROM anon, authenticated;
GRANT SELECT (
  id,
  project_id,
  source_run_id,
  provider_key,
  service_label,
  model_release_key,
  model_label,
  model_settings,
  source_url,
  source_package_file,
  source_package_sha256,
  opening_prompt_sha256,
  comparison_contract_version,
  comparison_contract_sha256,
  operator_kind,
  operator_label,
  run_role,
  quality_status,
  run_started_at,
  run_finished_at,
  prompt_count,
  repair_prompt_count,
  first_artifact_path,
  final_artifact_path,
  artifact_version_paths,
  first_pass_metrics,
  final_metrics,
  status,
  is_current,
  is_default,
  supersedes_variant_id,
  created_at,
  updated_at
) ON TABLE project_model_variants TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE project_model_variants FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE project_model_variants FROM service_role;
GRANT SELECT ON TABLE project_model_variants TO service_role;

CREATE POLICY "Published model variants are public to anon"
  ON project_model_variants
  FOR SELECT
  TO anon
  USING (
    status IN ('published', 'historical')
    AND EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = project_model_variants.project_id
      AND prompts.status = 'approved'
    )
  );

CREATE POLICY "Authenticated users read public variants or admins read all"
  ON project_model_variants
  FOR SELECT
  TO authenticated
  USING (
    (
      status IN ('published', 'historical')
      AND EXISTS (
        SELECT 1 FROM prompts
        WHERE prompts.id = project_model_variants.project_id
        AND prompts.status = 'approved'
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION publish_project_model_variant_release(
  target_project_id UUID,
  release_rows JSONB
)
RETURNS SETOF project_model_variants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  release_row JSONB;
  existing_row public.project_model_variants%ROWTYPE;
  immediate_prior public.project_model_variants%ROWTYPE;
  desired_prior_release_row JSONB;
  existing_source_run BOOLEAN;
  expected_supersedes_variant_id UUID;
  expected_artifact_paths TEXT[];
  release_count INTEGER;
  desired_default_count INTEGER;
  existing_default public.project_model_variants%ROWTYPE;
  retained_default_source_run_id TEXT;
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

  IF jsonb_typeof(release_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Model-variant release payload must be a JSON array.';
  END IF;

  release_count := jsonb_array_length(release_rows);
  IF release_count < 3 THEN
    RAISE EXCEPTION 'A model-variant release must represent at least three providers.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(target_project_id::TEXT, 0));

  IF NOT EXISTS (
    SELECT 1
    FROM public.prompts
    WHERE prompts.id = target_project_id
    AND prompts.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Model-variant releases require an approved canonical project.';
  END IF;

  IF (
    SELECT COUNT(DISTINCT row_value->>'provider_key')
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
  ) <> 3 OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    WHERE row_value->>'provider_key' NOT IN ('openai', 'anthropic', 'google')
  ) THEN
    RAISE EXCEPTION 'Release payload must cover OpenAI, Anthropic, and Google.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    GROUP BY row_value->>'source_run_id'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Release payload contains duplicate source-run identities.';
  END IF;

  SELECT COUNT(*)
  INTO desired_default_count
  FROM jsonb_array_elements(release_rows) AS rows(row_value)
  WHERE (row_value->>'is_default')::BOOLEAN;

  IF desired_default_count <> 1 OR NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    WHERE (row_value->>'is_default')::BOOLEAN
    AND (row_value->>'is_current')::BOOLEAN
    AND row_value->>'status' = 'published'
    AND row_value->>'quality_status' = 'verified'
    AND row_value->>'run_role' = 'comparison_run'
  ) THEN
    RAISE EXCEPTION 'Release payload must request one current verified comparison as its default.';
  END IF;

  SELECT *
  INTO existing_default
  FROM public.project_model_variants AS variant
  WHERE variant.project_id = target_project_id
  AND variant.status = 'published'
  AND variant.is_default
  FOR UPDATE;

  IF FOUND THEN
    retained_default_source_run_id := NULL;
    SELECT rows.row_value->>'source_run_id'
    INTO retained_default_source_run_id
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    WHERE rows.row_value->>'source_run_id' = existing_default.source_run_id
    AND (rows.row_value->>'is_current')::BOOLEAN
    AND rows.row_value->>'status' = 'published'
    AND rows.row_value->>'quality_status' = 'verified'
    LIMIT 1;

    IF retained_default_source_run_id IS NULL THEN
      SELECT rows.row_value->>'source_run_id'
      INTO retained_default_source_run_id
      FROM jsonb_array_elements(release_rows) AS rows(row_value)
      WHERE rows.row_value->>'provider_key' = existing_default.provider_key
      AND (rows.row_value->>'is_current')::BOOLEAN
      AND rows.row_value->>'status' = 'published'
      AND rows.row_value->>'quality_status' = 'verified'
      LIMIT 1;
    END IF;

    IF retained_default_source_run_id IS NULL THEN
      RAISE EXCEPTION 'Existing default has no current verified successor in the release payload.';
    END IF;

    SELECT jsonb_agg(
      jsonb_set(
        rows.row_value,
        '{is_default}',
        to_jsonb(rows.row_value->>'source_run_id' = retained_default_source_run_id),
        TRUE
      )
      ORDER BY rows.ordinality
    )
    INTO release_rows
    FROM jsonb_array_elements(release_rows) WITH ORDINALITY AS rows(row_value, ordinality);
  END IF;

  SELECT COUNT(*)
  INTO desired_default_count
  FROM jsonb_array_elements(release_rows) AS rows(row_value)
  WHERE (row_value->>'is_default')::BOOLEAN;

  IF desired_default_count <> 1 THEN
    RAISE EXCEPTION 'Release payload must select exactly one default run.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    GROUP BY row_value->>'provider_key'
    HAVING COUNT(*) FILTER (WHERE (row_value->>'is_current')::BOOLEAN) > 1
  ) THEN
    RAISE EXCEPTION 'Release payload selects multiple current runs for one provider.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    WHERE (row_value->>'is_default')::BOOLEAN
    AND (row_value->>'is_current')::BOOLEAN
    AND row_value->>'status' = 'published'
    AND row_value->>'quality_status' = 'verified'
    AND row_value->>'run_role' = 'comparison_run'
  ) THEN
    RAISE EXCEPTION 'Default run must be a current, verified, published comparison.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    WHERE (
      row_value->>'run_role' = 'historical_baseline'
      AND (
        row_value->>'status' <> 'historical'
        OR (row_value->>'is_current')::BOOLEAN
        OR (row_value->>'is_default')::BOOLEAN
      )
    ) OR (
      row_value->>'run_role' = 'comparison_run'
      AND row_value->>'status' <> 'published'
    ) OR row_value->>'run_role' NOT IN ('historical_baseline', 'comparison_run')
  ) THEN
    RAISE EXCEPTION 'Historical and comparison release roles have invalid public state.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    WHERE (row_value->>'is_current')::BOOLEAN
    AND (
      row_value->>'status' <> 'published'
      OR row_value->>'quality_status' <> 'verified'
      OR row_value->>'run_role' <> 'comparison_run'
    )
  ) THEN
    RAISE EXCEPTION 'Current provider runs must be verified, published comparisons.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.project_model_variants AS existing
    WHERE existing.project_id = target_project_id
    AND existing.status IN ('published', 'historical')
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(release_rows) AS rows(row_value)
      WHERE row_value->>'source_run_id' = existing.source_run_id
    )
  ) THEN
    RAISE EXCEPTION 'Release payload omits an existing public model-variant row.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.project_model_variants AS existing
      WHERE existing.source_run_id = rows.row_value->>'source_run_id'
    )
    GROUP BY rows.row_value->>'provider_key'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Release at most one new run per provider so supersession stays sequential.';
  END IF;

  FOR release_row IN SELECT value FROM jsonb_array_elements(release_rows)
  LOOP
    IF (release_row->>'project_id')::UUID IS DISTINCT FROM target_project_id THEN
      RAISE EXCEPTION 'Release row targets a different canonical project.';
    END IF;

    expected_artifact_paths := ARRAY(
      SELECT jsonb_array_elements_text(release_row->'artifact_version_paths')
    );
    expected_supersedes_variant_id := NULLIF(
      release_row->>'supersedes_variant_id',
      ''
    )::UUID;

    SELECT *
    INTO existing_row
    FROM public.project_model_variants
    WHERE source_run_id = release_row->>'source_run_id';
    existing_source_run := FOUND;

    IF existing_source_run AND (
      existing_row.project_id IS DISTINCT FROM target_project_id
      OR existing_row.provider_key IS DISTINCT FROM release_row->>'provider_key'
      OR existing_row.service_label IS DISTINCT FROM release_row->>'service_label'
      OR existing_row.model_release_key IS DISTINCT FROM release_row->>'model_release_key'
      OR existing_row.model_label IS DISTINCT FROM release_row->>'model_label'
      OR existing_row.model_settings IS DISTINCT FROM release_row->'model_settings'
      OR existing_row.source_url IS DISTINCT FROM release_row->>'source_url'
      OR existing_row.source_package_file IS DISTINCT FROM release_row->>'source_package_file'
      OR existing_row.source_package_sha256 IS DISTINCT FROM release_row->>'source_package_sha256'
      OR existing_row.opening_prompt_sha256 IS DISTINCT FROM release_row->>'opening_prompt_sha256'
      OR existing_row.comparison_contract_version IS DISTINCT FROM release_row->>'comparison_contract_version'
      OR existing_row.comparison_contract_sha256 IS DISTINCT FROM release_row->>'comparison_contract_sha256'
      OR existing_row.operator_kind IS DISTINCT FROM release_row->>'operator_kind'
      OR existing_row.operator_label IS DISTINCT FROM release_row->>'operator_label'
      OR existing_row.automation_run_id IS DISTINCT FROM NULLIF(release_row->>'automation_run_id', '')
      OR existing_row.run_role IS DISTINCT FROM release_row->>'run_role'
      OR existing_row.quality_status IS DISTINCT FROM release_row->>'quality_status'
      OR existing_row.run_started_at IS DISTINCT FROM NULLIF(release_row->>'run_started_at', '')::TIMESTAMPTZ
      OR existing_row.run_finished_at IS DISTINCT FROM NULLIF(release_row->>'run_finished_at', '')::TIMESTAMPTZ
      OR existing_row.prompt_count IS DISTINCT FROM (release_row->>'prompt_count')::SMALLINT
      OR existing_row.repair_prompt_count IS DISTINCT FROM (release_row->>'repair_prompt_count')::SMALLINT
      OR existing_row.first_artifact_path IS DISTINCT FROM release_row->>'first_artifact_path'
      OR existing_row.final_artifact_path IS DISTINCT FROM release_row->>'final_artifact_path'
      OR existing_row.artifact_version_paths IS DISTINCT FROM expected_artifact_paths
      OR existing_row.first_pass_metrics IS DISTINCT FROM release_row->'first_pass_metrics'
      OR existing_row.final_metrics IS DISTINCT FROM release_row->'final_metrics'
      OR existing_row.status IS DISTINCT FROM release_row->>'status'
      OR existing_row.supersedes_variant_id IS DISTINCT FROM expected_supersedes_variant_id
    ) THEN
      RAISE EXCEPTION 'Immutable model-variant evidence differs for source run %.', release_row->>'source_run_id';
    END IF;

    IF NOT existing_source_run THEN
      SELECT *
      INTO immediate_prior
      FROM public.project_model_variants AS prior_variant
      WHERE prior_variant.project_id = target_project_id
      AND prior_variant.provider_key = release_row->>'provider_key'
      AND prior_variant.status IN ('published', 'historical')
      ORDER BY prior_variant.created_at DESC, prior_variant.run_finished_at DESC NULLS LAST, prior_variant.id DESC
      LIMIT 1;

      IF FOUND THEN
        IF expected_supersedes_variant_id IS DISTINCT FROM immediate_prior.id THEN
          RAISE EXCEPTION 'New source run % must supersede immediately prior same-provider run %.',
            release_row->>'source_run_id', immediate_prior.source_run_id;
        END IF;
        IF (release_row->>'is_current')::BOOLEAN IS NOT TRUE THEN
          RAISE EXCEPTION 'A same-provider rerun must become the current provider release.';
        END IF;
        IF NULLIF(release_row->>'run_finished_at', '')::TIMESTAMPTZ IS NULL
          OR immediate_prior.run_finished_at IS NULL
          OR NULLIF(release_row->>'run_finished_at', '')::TIMESTAMPTZ <= immediate_prior.run_finished_at THEN
          RAISE EXCEPTION 'A superseding model variant must finish after the immediately prior release.';
        END IF;

        SELECT rows.row_value
        INTO desired_prior_release_row
        FROM jsonb_array_elements(release_rows) AS rows(row_value)
        WHERE rows.row_value->>'source_run_id' = immediate_prior.source_run_id
        LIMIT 1;
        IF NOT FOUND
          OR (desired_prior_release_row->>'is_current')::BOOLEAN
          OR (desired_prior_release_row->>'is_default')::BOOLEAN THEN
          RAISE EXCEPTION 'The immediately prior same-provider run must be demoted in the same atomic release.';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM public.project_model_variants AS current_variant
          WHERE current_variant.project_id = target_project_id
          AND current_variant.provider_key = release_row->>'provider_key'
          AND current_variant.status = 'published'
          AND current_variant.is_current
          AND current_variant.id <> immediate_prior.id
        ) THEN
          RAISE EXCEPTION 'The database current provider run is not the immediately prior release.';
        END IF;
      ELSIF expected_supersedes_variant_id IS NOT NULL THEN
        RAISE EXCEPTION 'A provider launch root cannot supersede another run.';
      END IF;
    END IF;
  END LOOP;

  UPDATE public.project_model_variants
  SET is_current = FALSE, is_default = FALSE, updated_at = NOW()
  WHERE project_model_variants.project_id = target_project_id
  AND project_model_variants.status = 'published'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(release_rows) AS rows(row_value)
    WHERE row_value->>'source_run_id' = project_model_variants.source_run_id
    AND (
      (
        project_model_variants.is_current
        AND NOT (row_value->>'is_current')::BOOLEAN
      )
      OR (
        project_model_variants.is_default
        AND NOT (row_value->>'is_default')::BOOLEAN
      )
    )
  );

  FOR release_row IN SELECT value FROM jsonb_array_elements(release_rows)
  LOOP
    expected_artifact_paths := ARRAY(
      SELECT jsonb_array_elements_text(release_row->'artifact_version_paths')
    );
    expected_supersedes_variant_id := NULLIF(
      release_row->>'supersedes_variant_id',
      ''
    )::UUID;

    IF EXISTS (
      SELECT 1
      FROM public.project_model_variants
      WHERE source_run_id = release_row->>'source_run_id'
    ) THEN
      UPDATE public.project_model_variants
      SET
        is_current = (release_row->>'is_current')::BOOLEAN,
        is_default = (release_row->>'is_default')::BOOLEAN,
        updated_at = NOW()
      WHERE source_run_id = release_row->>'source_run_id'
      AND (
        is_current IS DISTINCT FROM (release_row->>'is_current')::BOOLEAN
        OR is_default IS DISTINCT FROM (release_row->>'is_default')::BOOLEAN
      );
    ELSE
      INSERT INTO public.project_model_variants (
        project_id,
        source_run_id,
        provider_key,
        service_label,
        model_release_key,
        model_label,
        model_settings,
        source_url,
        source_package_file,
        source_package_sha256,
        opening_prompt_sha256,
        comparison_contract_version,
        comparison_contract_sha256,
        operator_kind,
        operator_label,
        automation_run_id,
        run_role,
        quality_status,
        run_started_at,
        run_finished_at,
        prompt_count,
        repair_prompt_count,
        first_artifact_path,
        final_artifact_path,
        artifact_version_paths,
        first_pass_metrics,
        final_metrics,
        status,
        is_current,
        is_default,
        supersedes_variant_id
      ) VALUES (
        target_project_id,
        release_row->>'source_run_id',
        release_row->>'provider_key',
        release_row->>'service_label',
        release_row->>'model_release_key',
        release_row->>'model_label',
        release_row->'model_settings',
        release_row->>'source_url',
        release_row->>'source_package_file',
        release_row->>'source_package_sha256',
        release_row->>'opening_prompt_sha256',
        release_row->>'comparison_contract_version',
        release_row->>'comparison_contract_sha256',
        release_row->>'operator_kind',
        release_row->>'operator_label',
        NULLIF(release_row->>'automation_run_id', ''),
        release_row->>'run_role',
        release_row->>'quality_status',
        NULLIF(release_row->>'run_started_at', '')::TIMESTAMPTZ,
        NULLIF(release_row->>'run_finished_at', '')::TIMESTAMPTZ,
        (release_row->>'prompt_count')::SMALLINT,
        (release_row->>'repair_prompt_count')::SMALLINT,
        release_row->>'first_artifact_path',
        release_row->>'final_artifact_path',
        expected_artifact_paths,
        release_row->'first_pass_metrics',
        release_row->'final_metrics',
        release_row->>'status',
        (release_row->>'is_current')::BOOLEAN,
        (release_row->>'is_default')::BOOLEAN,
        expected_supersedes_variant_id
      );
    END IF;
  END LOOP;

  IF (
    SELECT COUNT(*)
    FROM public.project_model_variants
    WHERE project_id = target_project_id
    AND status IN ('published', 'historical')
  ) <> release_count THEN
    RAISE EXCEPTION 'Published model-variant set is incomplete after release.';
  END IF;

  RETURN QUERY
  SELECT variant.*
  FROM public.project_model_variants AS variant
  WHERE variant.project_id = target_project_id
  AND variant.status IN ('published', 'historical')
  ORDER BY variant.run_finished_at DESC NULLS LAST, variant.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION publish_project_model_variant_release(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION publish_project_model_variant_release(UUID, JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION publish_project_model_variant_release(UUID, JSONB)
  TO service_role;


CREATE OR REPLACE FUNCTION publish_project_model_variant_cohort(releases JSONB)
RETURNS SETOF project_model_variants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  release_bundle JSONB;
  bundle_project_id UUID;
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

  IF jsonb_typeof(releases) IS DISTINCT FROM 'array' OR jsonb_array_length(releases) < 1 THEN
    RAISE EXCEPTION 'Model-variant cohort payload must be a nonempty JSON array.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(releases) AS bundles(bundle)
    GROUP BY bundle->>'project_id'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Model-variant cohort contains a duplicate canonical project.';
  END IF;

  FOR release_bundle IN
    SELECT bundle
    FROM jsonb_array_elements(releases) AS bundles(bundle)
    ORDER BY bundle->>'project_id'
  LOOP
    IF jsonb_typeof(release_bundle) IS DISTINCT FROM 'object'
      OR NULLIF(release_bundle->>'project_id', '') IS NULL
      OR jsonb_typeof(release_bundle->'release_rows') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Every cohort entry needs project_id and release_rows.';
    END IF;

    bundle_project_id := (release_bundle->>'project_id')::UUID;
    RETURN QUERY
    SELECT *
    FROM public.publish_project_model_variant_release(
      bundle_project_id,
      release_bundle->'release_rows'
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION publish_project_model_variant_cohort(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION publish_project_model_variant_cohort(JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION publish_project_model_variant_cohort(JSONB)
  TO service_role;

CREATE OR REPLACE FUNCTION set_project_model_variant_default(
  target_project_id UUID,
  target_variant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  PERFORM pg_advisory_xact_lock(hashtextextended(target_project_id::TEXT, 0));

  IF NOT EXISTS (
    SELECT 1
    FROM public.project_model_variants
    WHERE id = target_variant_id
    AND project_id = target_project_id
    AND status = 'published'
    AND is_current
    AND quality_status = 'verified'
    AND EXISTS (
      SELECT 1
      FROM public.prompts
      WHERE prompts.id = target_project_id
      AND prompts.status = 'approved'
    )
  ) THEN
    RAISE EXCEPTION 'Default model variant must be a current, verified, published run for this project.';
  END IF;

  UPDATE public.project_model_variants
  SET
    is_default = FALSE,
    updated_at = NOW()
  WHERE project_id = target_project_id
  AND is_default
  AND id <> target_variant_id;

  UPDATE public.project_model_variants
  SET
    is_default = TRUE,
    updated_at = NOW()
  WHERE project_id = target_project_id
  AND id = target_variant_id
  AND NOT is_default;
END;
$$;

REVOKE ALL ON FUNCTION set_project_model_variant_default(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_project_model_variant_default(UUID, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION set_project_model_variant_default(UUID, UUID)
  TO authenticated, service_role;

-- Indexes
CREATE INDEX idx_prompts_category ON prompts(category_id);
CREATE INDEX idx_prompts_status ON prompts(status);
CREATE INDEX idx_prompts_author ON prompts(author_id);
CREATE INDEX idx_prompts_difficulty ON prompts(difficulty);
CREATE INDEX idx_prompts_fork_source_project ON prompts(fork_source_project_id);
CREATE INDEX idx_prompts_fork_source_model_variant
  ON prompts(fork_source_model_variant_id)
  WHERE fork_source_model_variant_id IS NOT NULL;
CREATE INDEX idx_prompts_fork_source_run
  ON prompts(fork_source_run_id)
  WHERE fork_source_run_id IS NOT NULL;
CREATE UNIQUE INDEX idx_prompts_unique_approved_fork_branch_slot
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

-- Direct-write least privilege. Public publication stays RPC-only.
-- ---------------------------------------------------------------------------

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_steps ENABLE ROW LEVEL SECURITY;
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
CREATE INDEX idx_prompts_prompt_family ON prompts(prompt_family_id);
CREATE INDEX idx_prompts_parent_fork ON prompts(fork_parent_submission_id);
CREATE INDEX idx_prompt_steps_prompt ON prompt_steps(prompt_id);
CREATE INDEX idx_votes_prompt ON votes(prompt_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_prompt ON bookmarks(prompt_id);

CREATE OR REPLACE FUNCTION update_prompt_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prompts
    SET vote_count = vote_count + 1,
        updated_at = NOW()
    WHERE id = NEW.prompt_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE prompts
    SET vote_count = GREATEST(vote_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.prompt_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prompt_vote_count_trigger ON votes;
CREATE TRIGGER prompt_vote_count_trigger
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_prompt_vote_count();

CREATE OR REPLACE FUNCTION update_prompt_bookmark_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prompts
    SET bookmark_count = bookmark_count + 1,
        updated_at = NOW()
    WHERE id = NEW.prompt_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE prompts
    SET bookmark_count = GREATEST(bookmark_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.prompt_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prompt_bookmark_count_trigger ON bookmarks;
CREATE TRIGGER prompt_bookmark_count_trigger
  AFTER INSERT OR DELETE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_prompt_bookmark_count();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username'),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- Prompt steps follow their parent prompt's visibility
CREATE POLICY "Prompt steps are viewable with their prompt" ON prompt_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = prompt_steps.prompt_id
      AND (prompts.status = 'approved' OR prompts.author_id = auth.uid())
    )
  );

-- Profiles are public
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Profile owners may edit presentation fields, never their authorization role.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE profiles FROM anon, authenticated;
GRANT SELECT ON TABLE profiles TO anon, authenticated;
GRANT UPDATE (username, display_name, avatar_url, bio, updated_at)
  ON TABLE profiles TO authenticated;

-- Votes
CREATE POLICY "Votes are viewable by everyone" ON votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON votes FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM prompts
    WHERE prompts.id = votes.prompt_id
    AND prompts.status = 'approved'
  )
);
CREATE POLICY "Users can remove own votes" ON votes FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks
CREATE POLICY "Users can see own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can bookmark" ON bookmarks FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM prompts
    WHERE prompts.id = bookmarks.prompt_id
    AND prompts.status = 'approved'
  )
);
CREATE POLICY "Users can remove own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

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
        (existing.source_step_id = NEW.source_step_id AND existing.source_step_number <> NEW.source_step_number)
        OR (existing.source_step_number = NEW.source_step_number AND existing.source_step_id <> NEW.source_step_id)
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
    SELECT 1 FROM jsonb_array_elements(evidence_rows) AS rows(row_value)
    GROUP BY row_value->>'model_variant_id', row_value->>'source_step_id'
    HAVING COUNT(DISTINCT (row_value->>'source_step_number')::INT) <> 1
  ) OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(evidence_rows) AS rows(row_value)
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
