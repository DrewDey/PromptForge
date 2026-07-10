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

CREATE INDEX IF NOT EXISTS idx_project_model_variants_supersedes
  ON project_model_variants(supersedes_variant_id)
  WHERE supersedes_variant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION validate_project_model_variant_lineage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
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

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION validate_project_model_variant_lineage() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_project_model_variant_lineage() FROM anon, authenticated;

DROP TRIGGER IF EXISTS validate_project_model_variant_lineage_fields ON project_model_variants;
CREATE TRIGGER validate_project_model_variant_lineage_fields
  BEFORE INSERT OR UPDATE OF project_id, provider_key, supersedes_variant_id, status
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
  comparison_contract_version,
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
GRANT INSERT, UPDATE, DELETE ON TABLE project_model_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE project_model_variants TO service_role;

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
CREATE POLICY "Admins can insert model variants"
  ON project_model_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update model variants" ON project_model_variants;
CREATE POLICY "Admins can update model variants"
  ON project_model_variants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete model variants" ON project_model_variants;
CREATE POLICY "Admins can delete model variants"
  ON project_model_variants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION set_project_model_variant_default(
  target_project_id UUID,
  target_variant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF CURRENT_USER <> 'service_role'
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
    is_default = (id = target_variant_id),
    updated_at = NOW()
  WHERE project_id = target_project_id
  AND (is_default OR id = target_variant_id);
END;
$$;

REVOKE ALL ON FUNCTION set_project_model_variant_default(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_project_model_variant_default(UUID, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION set_project_model_variant_default(UUID, UUID)
  TO authenticated, service_role;
