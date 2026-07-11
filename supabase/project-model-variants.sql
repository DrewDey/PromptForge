-- PathForge canonical-project model variants
-- A model variant is an append-only provider rerun of one approved project.
-- It is not a prompt, an artifact version, or a community fork.

CREATE TABLE IF NOT EXISTS project_model_variants (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_model_variants_current_provider
  ON project_model_variants(project_id, provider_key)
  WHERE is_current AND status = 'published';

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_model_variants_default
  ON project_model_variants(project_id)
  WHERE is_default AND is_current AND status = 'published';

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_model_variants_automation_run
  ON project_model_variants(automation_run_id)
  WHERE automation_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_model_variants_project_history
  ON project_model_variants(project_id, run_finished_at DESC, created_at DESC);

DROP INDEX IF EXISTS public.idx_project_model_variants_supersedes;
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_model_variants_one_successor
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

DROP TRIGGER IF EXISTS validate_project_model_variant_lineage_fields ON project_model_variants;
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

DROP TRIGGER IF EXISTS preserve_project_model_variant_evidence ON project_model_variants;
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

DROP TRIGGER IF EXISTS preserve_project_model_variant_history ON project_model_variants;
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

-- A profile owner may edit public profile fields, never authorization state.
-- The model-variant RPCs trust profiles.role for the authenticated admin path,
-- so role must remain service-controlled.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE profiles FROM anon, authenticated;
GRANT SELECT ON TABLE profiles TO anon, authenticated;
GRANT UPDATE (username, display_name, avatar_url, bio, updated_at)
  ON TABLE profiles TO authenticated;

DROP POLICY IF EXISTS "Published model variants are public" ON project_model_variants;
DROP POLICY IF EXISTS "Published model variants are public to anon" ON project_model_variants;
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

DROP POLICY IF EXISTS "Admins can read every model variant" ON project_model_variants;
DROP POLICY IF EXISTS "Authenticated users read public variants or admins read all" ON project_model_variants;
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

DROP POLICY IF EXISTS "Admins can manage model variants" ON project_model_variants;
DROP POLICY IF EXISTS "Admins can insert model variants" ON project_model_variants;
DROP POLICY IF EXISTS "Admins can update model variants" ON project_model_variants;
DROP POLICY IF EXISTS "Admins can delete model variants" ON project_model_variants;

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
