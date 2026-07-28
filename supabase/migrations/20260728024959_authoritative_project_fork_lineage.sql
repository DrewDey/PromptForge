-- Authoritative bounded project-fork lineage
--
-- Product depth is ten total display levels: one root plus at most nine fork
-- descendants. The first fork keeps the historical stored depth 0, so valid
-- persisted fork depths are 0..8. This migration never rewrites lineage.

DO $$
DECLARE
  prompt_over_depth BIGINT;
  intake_over_depth BIGINT;
  community_over_depth BIGINT;
  unfinished_over_depth BIGINT;
  intake_publication_drift BIGINT;
  community_publication_drift BIGINT;
BEGIN
  SELECT COUNT(*) INTO prompt_over_depth
  FROM public.prompts
  WHERE fork_source_project_id IS NOT NULL
    AND fork_depth > 8;

  SELECT COUNT(*) INTO intake_over_depth
  FROM public.source_run_submissions
  WHERE fork_source_project_id IS NOT NULL
    AND fork_depth > 8;

  SELECT COUNT(*) INTO community_over_depth
  FROM public.community_project_submissions
  WHERE fork_source_project_id IS NOT NULL
    AND fork_depth > 8;

  SELECT COUNT(*) INTO unfinished_over_depth
  FROM public.user_project_states
  WHERE fork_started_at IS NOT NULL
    AND fork_depth > 8;

  IF prompt_over_depth > 0
    OR intake_over_depth > 0
    OR community_over_depth > 0
    OR unfinished_over_depth > 0 THEN
    RAISE EXCEPTION
      'Fork-lineage migration blocked: unexpected stored depth 9+ (prompts %, source-run intakes %, community intakes %, unfinished forks %).',
      prompt_over_depth,
      intake_over_depth,
      community_over_depth,
      unfinished_over_depth;
  END IF;

  SELECT COUNT(*) INTO intake_publication_drift
  FROM public.source_run_submissions AS intake
  JOIN public.prompts AS published
    ON published.id = intake.extracted_prompt_id
  WHERE intake.fork_source_project_id IS NOT NULL
    AND (
      intake.fork_source_project_id IS DISTINCT FROM published.fork_source_project_id
      OR intake.fork_source_project_title IS DISTINCT FROM published.fork_source_project_title
      OR intake.fork_source_model_variant_id IS DISTINCT FROM published.fork_source_model_variant_id
      OR intake.fork_source_run_id IS DISTINCT FROM published.fork_source_run_id
      OR intake.fork_source_step_id IS DISTINCT FROM published.fork_source_step_id
      OR intake.fork_source_step_number IS DISTINCT FROM published.fork_source_step_number
      OR intake.fork_source_artifact_path IS DISTINCT FROM published.fork_source_artifact_path
      OR intake.fork_source_artifact_sha256 IS DISTINCT FROM published.fork_source_artifact_sha256
      OR intake.fork_parent_submission_id IS DISTINCT FROM published.fork_parent_submission_id
      OR intake.prompt_family_id IS DISTINCT FROM published.prompt_family_id
      OR intake.fork_depth IS DISTINCT FROM published.fork_depth
      OR intake.fork_branch_index IS DISTINCT FROM published.fork_branch_index
    );

  SELECT COUNT(*) INTO community_publication_drift
  FROM public.community_project_submissions AS intake
  JOIN public.prompts AS published
    ON published.id = intake.prompt_id
  WHERE intake.fork_source_project_id IS NOT NULL
    AND (
      intake.fork_source_project_id IS DISTINCT FROM published.fork_source_project_id
      OR intake.fork_source_project_title IS DISTINCT FROM published.fork_source_project_title
      OR intake.fork_source_model_variant_id IS DISTINCT FROM published.fork_source_model_variant_id
      OR intake.fork_source_run_id IS DISTINCT FROM published.fork_source_run_id
      OR intake.fork_source_step_id IS DISTINCT FROM published.fork_source_step_id
      OR intake.fork_source_step_number IS DISTINCT FROM published.fork_source_step_number
      OR intake.fork_source_artifact_path IS DISTINCT FROM published.fork_source_artifact_path
      OR intake.fork_source_artifact_sha256 IS DISTINCT FROM published.fork_source_artifact_sha256
      OR intake.fork_parent_submission_id IS DISTINCT FROM published.fork_parent_submission_id
      OR intake.prompt_family_id IS DISTINCT FROM published.prompt_family_id
      OR intake.fork_depth IS DISTINCT FROM published.fork_depth
      OR intake.fork_branch_index IS DISTINCT FROM published.fork_branch_index
    );

  IF intake_publication_drift > 0 OR community_publication_drift > 0 THEN
    RAISE EXCEPTION
      'Fork-lineage migration blocked: intake/publication tuple drift (source-run %, community %).',
      intake_publication_drift,
      community_publication_drift;
  END IF;
END;
$$;

ALTER TABLE public.prompts
  DROP CONSTRAINT IF EXISTS prompts_fork_depth_check,
  ADD CONSTRAINT prompts_fork_depth_check
    CHECK (fork_depth BETWEEN 0 AND 8);

ALTER TABLE public.source_run_submissions
  DROP CONSTRAINT IF EXISTS source_run_submissions_fork_depth_check,
  ADD CONSTRAINT source_run_submissions_fork_depth_check
    CHECK (fork_depth BETWEEN 0 AND 8);

ALTER TABLE public.community_project_submissions
  DROP CONSTRAINT IF EXISTS community_project_submissions_fork_depth_check,
  ADD CONSTRAINT community_project_submissions_fork_depth_check
    CHECK (fork_depth BETWEEN 0 AND 8);

ALTER TABLE public.user_project_states
  DROP CONSTRAINT IF EXISTS user_project_states_fork_depth_check,
  ADD CONSTRAINT user_project_states_fork_depth_check
    CHECK (fork_depth BETWEEN 0 AND 8);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.enforce_project_fork_lineage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent public.prompts%ROWTYPE;
  expected_depth INT;
  expected_family TEXT;
  source_response_exists BOOLEAN;
  ancestry_cycle BOOLEAN;
  ancestry_missing BOOLEAN;
  ancestry_too_deep BOOLEAN;
BEGIN
  IF NULLIF(BTRIM(COALESCE(NEW.fork_source_project_id, '')), '') IS NULL THEN
    IF NEW.fork_source_project_title IS NOT NULL
      OR NEW.fork_source_model_variant_id IS NOT NULL
      OR NEW.fork_source_run_id IS NOT NULL
      OR NEW.fork_source_step_id IS NOT NULL
      OR NEW.fork_source_step_number IS NOT NULL
      OR NEW.fork_source_artifact_path IS NOT NULL
      OR NEW.fork_source_artifact_sha256 IS NOT NULL
      OR NEW.fork_parent_submission_id IS NOT NULL
      OR NEW.prompt_family_id IS NOT NULL
      OR NEW.fork_depth <> 0
      OR NEW.fork_branch_index <> 0 THEN
      RAISE EXCEPTION 'A non-fork project cannot persist fork-lineage metadata.';
    END IF;
    RETURN NEW;
  END IF;

  NEW.fork_source_project_id = BTRIM(NEW.fork_source_project_id);
  NEW.fork_source_step_id = NULLIF(BTRIM(COALESCE(NEW.fork_source_step_id, '')), '');
  NEW.fork_parent_submission_id =
    NULLIF(BTRIM(COALESCE(NEW.fork_parent_submission_id, '')), '');
  NEW.prompt_family_id = NULLIF(BTRIM(COALESCE(NEW.prompt_family_id, '')), '');

  IF NEW.fork_branch_index NOT BETWEEN 0 AND 9 THEN
    RAISE EXCEPTION 'Fork branch index must be between 0 and 9.';
  END IF;
  IF NEW.fork_source_step_id IS NULL OR NEW.fork_source_step_number IS NULL THEN
    RAISE EXCEPTION 'A fork must identify one exact public parent response.';
  END IF;

  SELECT source.*
  INTO parent
  FROM public.prompts AS source
  WHERE source.id::TEXT = NEW.fork_source_project_id
    AND source.status = 'approved'
  FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fork parent must be an approved public project.';
  END IF;
  IF TG_TABLE_NAME = 'prompts' AND NEW.id::TEXT = parent.id::TEXT THEN
    RAISE EXCEPTION 'A project cannot fork itself.';
  END IF;

  IF parent.fork_source_project_id IS NULL THEN
    expected_depth := 0;
    expected_family := parent.id::TEXT || ':' || NEW.fork_source_step_id;
    IF NEW.fork_parent_submission_id IS NOT NULL THEN
      RAISE EXCEPTION 'A first-generation fork cannot claim a fork parent submission.';
    END IF;
  ELSE
    expected_depth := parent.fork_depth + 1;
    expected_family := NULLIF(BTRIM(COALESCE(parent.prompt_family_id, '')), '');
    IF NEW.fork_parent_submission_id IS DISTINCT FROM parent.id::TEXT THEN
      RAISE EXCEPTION 'A descendant fork must name its immediate parent project.';
    END IF;
  END IF;

  IF expected_depth > 8 OR NEW.fork_depth IS DISTINCT FROM expected_depth THEN
    RAISE EXCEPTION
      'Fork stored depth is not the authoritative parent depth (expected %, observed %).',
      expected_depth,
      NEW.fork_depth;
  END IF;
  IF expected_family IS NULL OR NEW.prompt_family_id IS DISTINCT FROM expected_family THEN
    RAISE EXCEPTION 'Fork prompt family does not match its authoritative parent family.';
  END IF;

  IF NEW.fork_source_model_variant_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.project_model_variant_artifacts AS artifact
      JOIN public.project_model_variants AS variant
        ON variant.id = artifact.model_variant_id
      WHERE variant.id = NEW.fork_source_model_variant_id
        AND variant.project_id = parent.id
        AND variant.source_run_id = NEW.fork_source_run_id
        AND variant.status IN ('published', 'historical')
        AND artifact.source_step_id = NEW.fork_source_step_id
        AND artifact.source_step_number = NEW.fork_source_step_number
        AND artifact.artifact_path = NEW.fork_source_artifact_path
        AND artifact.artifact_sha256 = NEW.fork_source_artifact_sha256
    ) INTO source_response_exists;
  ELSIF NEW.fork_source_run_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.source_run_submissions AS source_run
      WHERE source_run.extracted_prompt_id = parent.id
        AND source_run.id::TEXT = NEW.fork_source_run_id
        AND source_run.status = 'draft_created'
        AND source_run.intake_evidence IS NOT NULL
        AND NEW.fork_source_step_id = (
          parent.id::TEXT || ':' || source_run.id::TEXT
          || ':step:' || NEW.fork_source_step_number::TEXT
        )
        AND source_run.intake_evidence->>'prompt_count' =
          NEW.fork_source_step_number::TEXT
        AND source_run.intake_evidence->>'final_artifact_path' =
          NEW.fork_source_artifact_path
        AND source_run.intake_evidence->>'final_artifact_sha256' =
          NEW.fork_source_artifact_sha256
    ) INTO source_response_exists;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.prompt_steps AS step
      WHERE step.prompt_id = parent.id
        AND step.id::TEXT = NEW.fork_source_step_id
        AND step.step_number = NEW.fork_source_step_number
        AND step.result_content IS NOT NULL
    ) INTO source_response_exists;
  END IF;

  IF NOT source_response_exists THEN
    RAISE EXCEPTION 'Fork source response does not belong to the approved parent project.';
  END IF;

  WITH RECURSIVE ancestry AS (
    SELECT
      parent.id,
      parent.fork_source_project_id,
      ARRAY[parent.id]::UUID[] AS path,
      FALSE AS cycle,
      0 AS hop
    UNION ALL
    SELECT
      source.id,
      source.fork_source_project_id,
      ancestry.path || source.id,
      source.id = ANY(ancestry.path),
      ancestry.hop + 1
    FROM ancestry
    JOIN public.prompts AS source
      ON source.id::TEXT = ancestry.fork_source_project_id
      AND source.status = 'approved'
    WHERE NOT ancestry.cycle
      AND ancestry.hop < 9
  )
  SELECT
    COALESCE(BOOL_OR(cycle OR id::TEXT = NEW.id::TEXT), FALSE),
    COALESCE(BOOL_OR(
      NOT cycle
      AND fork_source_project_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.prompts AS missing_parent
        WHERE missing_parent.id::TEXT = ancestry.fork_source_project_id
          AND missing_parent.status = 'approved'
      )
    ), FALSE),
    COALESCE(BOOL_OR(
      NOT cycle
      AND hop = 8
      AND fork_source_project_id IS NOT NULL
    ), FALSE)
  INTO ancestry_cycle, ancestry_missing, ancestry_too_deep
  FROM ancestry;

  IF ancestry_cycle THEN
    RAISE EXCEPTION 'Fork lineage contains a cycle.';
  END IF;
  IF ancestry_missing THEN
    RAISE EXCEPTION 'Fork lineage contains a missing or non-public ancestor.';
  END IF;
  IF ancestry_too_deep THEN
    RAISE EXCEPTION 'Fork lineage would exceed ten total display levels.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_project_fork_lineage()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_project_fork_lineage_fields ON public.prompts;
CREATE TRIGGER enforce_project_fork_lineage_fields
  BEFORE INSERT OR UPDATE OF
    fork_source_project_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_artifact_path,
    fork_source_artifact_sha256,
    fork_parent_submission_id,
    prompt_family_id,
    fork_depth,
    fork_branch_index
  ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION private.enforce_project_fork_lineage();

DROP TRIGGER IF EXISTS enforce_project_fork_lineage_fields
  ON public.source_run_submissions;
CREATE TRIGGER enforce_project_fork_lineage_fields
  BEFORE INSERT OR UPDATE OF
    fork_source_project_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_artifact_path,
    fork_source_artifact_sha256,
    fork_parent_submission_id,
    prompt_family_id,
    fork_depth,
    fork_branch_index
  ON public.source_run_submissions
  FOR EACH ROW EXECUTE FUNCTION private.enforce_project_fork_lineage();

DROP TRIGGER IF EXISTS enforce_project_fork_lineage_fields
  ON public.community_project_submissions;
CREATE TRIGGER enforce_project_fork_lineage_fields
  BEFORE INSERT OR UPDATE OF
    fork_source_project_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_artifact_path,
    fork_source_artifact_sha256,
    fork_parent_submission_id,
    prompt_family_id,
    fork_depth,
    fork_branch_index
  ON public.community_project_submissions
  FOR EACH ROW EXECUTE FUNCTION private.enforce_project_fork_lineage();

-- Correct the server-owned community fork tuple. Request payloads still carry
-- only source project/step hints; the database derives family and depth.
CREATE OR REPLACE FUNCTION private.pathforge_resolve_community_fork(
  requested_fork JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  source_project UUID;
  requested_step UUID;
  requested_step_number INT;
  source_title TEXT;
  source_family TEXT;
  source_depth INT;
  source_is_fork BOOLEAN;
  authoritative_step_number INT;
  next_family TEXT;
  next_depth INT;
BEGIN
  IF requested_fork = 'null'::JSONB THEN
    RETURN 'null'::JSONB;
  END IF;
  IF jsonb_typeof(requested_fork) IS DISTINCT FROM 'object'
    OR NOT (requested_fork ?& ARRAY[
      'source_project_id',
      'source_step_id',
      'source_step_number'
    ])
    OR requested_fork - ARRAY[
      'source_project_id',
      'source_step_id',
      'source_step_number'
    ] <> '{}'::JSONB
    OR COALESCE(requested_fork->>'source_project_id', '') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR COALESCE(requested_fork->>'source_step_id', '') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR COALESCE(requested_fork->>'source_step_number', '') !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'Community project fork request is incomplete or invalid.';
  END IF;

  source_project := (requested_fork->>'source_project_id')::UUID;
  requested_step := (requested_fork->>'source_step_id')::UUID;
  requested_step_number := (requested_fork->>'source_step_number')::INT;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      source_project::TEXT || '|community-project-fork',
      0
    )
  );
  SELECT
    project.title,
    NULLIF(BTRIM(COALESCE(project.prompt_family_id, '')), ''),
    project.fork_depth,
    project.fork_source_project_id IS NOT NULL
  INTO source_title, source_family, source_depth, source_is_fork
  FROM public.prompts AS project
  JOIN public.community_project_submissions AS source_submission
    ON source_submission.prompt_id = project.id
  WHERE project.id = source_project
    AND project.status = 'approved'
    AND source_submission.status = 'published'
    AND source_submission.reuse_permission = 'allow_pathforge_remix'
  FOR KEY SHARE OF project;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'The pilot accepts forks only from a published community project whose builder enabled PathForge remixing.';
  END IF;

  SELECT step.step_number
  INTO authoritative_step_number
  FROM public.prompt_steps AS step
  WHERE step.id = requested_step
    AND step.prompt_id = source_project
    AND step.step_number = requested_step_number
    AND step.result_content IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION
      'The requested fork checkpoint does not belong to that public project.';
  END IF;

  IF source_is_fork THEN
    IF source_depth >= 8 OR source_family IS NULL THEN
      RAISE EXCEPTION 'This project has reached the maximum fork depth.';
    END IF;
    next_depth := source_depth + 1;
    next_family := source_family;
  ELSE
    next_depth := 0;
    next_family := source_project::TEXT || ':' || requested_step::TEXT;
  END IF;

  RETURN jsonb_build_object(
    'source_project_id', source_project::TEXT,
    'source_project_title', source_title,
    'source_model_variant_id', '',
    'source_run_id', '',
    'source_step_id', requested_step::TEXT,
    'source_step_number', authoritative_step_number,
    'source_artifact_path', '',
    'source_artifact_sha256', '',
    'parent_submission_id',
      CASE WHEN source_is_fork THEN source_project::TEXT ELSE '' END,
    'prompt_family_id', next_family,
    'depth', next_depth,
    'branch_index', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION private.pathforge_resolve_community_fork(JSONB)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.read_public_project_fork_lineage(
  target_project UUID
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE lineage AS (
    SELECT
      project.*,
      0 AS hop,
      ARRAY[project.id]::UUID[] AS path,
      FALSE AS cycle
    FROM public.prompts AS project
    WHERE project.id = target_project
      AND project.status = 'approved'

    UNION ALL

    SELECT
      parent.*,
      child.hop + 1,
      child.path || parent.id,
      parent.id = ANY(child.path)
    FROM lineage AS child
    JOIN public.prompts AS parent
      ON parent.id::TEXT = child.fork_source_project_id
      AND parent.status = 'approved'
    WHERE NOT child.cycle
      AND child.hop < 10
  ),
  facts AS (
    SELECT
      EXISTS (SELECT 1 FROM lineage WHERE cycle) AS cycle,
      EXISTS (
        SELECT 1
        FROM lineage AS child
        WHERE NOT child.cycle
          AND child.fork_source_project_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM public.prompts AS parent
            WHERE parent.id::TEXT = child.fork_source_project_id
              AND parent.status = 'approved'
          )
      ) AS missing_parent,
      EXISTS (
        SELECT 1
        FROM lineage
        WHERE NOT cycle
          AND hop >= 10
      ) AS truncated
  ),
  projected AS (
    SELECT
      lineage.hop,
      jsonb_build_object(
        'project_id', lineage.id,
        'title', lineage.title,
        'description', lineage.description,
        'model_used', lineage.model_used,
        'provider_name', (
          SELECT variant.service_label
          FROM public.project_model_variants AS variant
          WHERE variant.project_id = lineage.id
            AND variant.status IN ('published', 'historical')
            AND (
              (
                lineage.hop > 0
                AND EXISTS (
                  SELECT 1
                  FROM lineage AS child
                  WHERE child.hop = lineage.hop - 1
                    AND (
                      child.fork_source_model_variant_id = variant.id
                      OR (
                        child.fork_source_model_variant_id IS NULL
                        AND child.fork_source_run_id = variant.source_run_id
                      )
                    )
                )
              )
              OR (lineage.hop = 0 AND variant.is_default)
            )
          ORDER BY variant.id
          LIMIT 1
        ),
        'presentation_model_label', (
          SELECT variant.model_label
          FROM public.project_model_variants AS variant
          WHERE variant.project_id = lineage.id
            AND variant.status IN ('published', 'historical')
            AND (
              (
                lineage.hop > 0
                AND EXISTS (
                  SELECT 1
                  FROM lineage AS child
                  WHERE child.hop = lineage.hop - 1
                    AND (
                      child.fork_source_model_variant_id = variant.id
                      OR (
                        child.fork_source_model_variant_id IS NULL
                        AND child.fork_source_run_id = variant.source_run_id
                      )
                    )
                )
              )
              OR (lineage.hop = 0 AND variant.is_default)
            )
          ORDER BY variant.id
          LIMIT 1
        ),
        'presentation_source_run_id', (
          SELECT child.fork_source_run_id
          FROM lineage AS child
          WHERE child.hop = lineage.hop - 1
          LIMIT 1
        ),
        'fork_source_project_id', lineage.fork_source_project_id,
        'fork_source_project_title', lineage.fork_source_project_title,
        'fork_source_model_variant_id', lineage.fork_source_model_variant_id,
        'fork_source_run_id', lineage.fork_source_run_id,
        'fork_source_step_id', lineage.fork_source_step_id,
        'fork_source_step_number', lineage.fork_source_step_number,
        'fork_source_artifact_path', lineage.fork_source_artifact_path,
        'fork_source_artifact_sha256', lineage.fork_source_artifact_sha256,
        'fork_parent_submission_id', lineage.fork_parent_submission_id,
        'prompt_family_id', lineage.prompt_family_id,
        'fork_depth', lineage.fork_depth,
        'fork_branch_index', lineage.fork_branch_index,
        'steps', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', step.id,
              'step_number', step.step_number,
              'title', step.title,
              'content', step.content,
              'result_content', step.result_content,
              'artifacts', COALESCE((
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', artifact.id,
                    'artifact_path', artifact.artifact_path,
                    'artifact_title',
                      pg_catalog.regexp_replace(
                        artifact.artifact_path,
                        '^.*/',
                        ''
                      ),
                    'artifact_sha256', artifact.artifact_sha256,
                    'model_variant_id', variant.id,
                    'source_run_id', variant.source_run_id,
                    'source_step_id', artifact.source_step_id,
                    'source_step_number', artifact.source_step_number,
                    'is_default', variant.is_default
                  )
                  ORDER BY
                    variant.is_default DESC,
                    artifact.created_at,
                    artifact.id
                )
                FROM public.project_model_variant_artifacts AS artifact
                JOIN public.project_model_variants AS variant
                  ON variant.id = artifact.model_variant_id
                WHERE variant.project_id = lineage.id
                  AND variant.status IN ('published', 'historical')
                  AND artifact.source_step_number = step.step_number
              ), '[]'::JSONB)
            )
            ORDER BY step.step_number, step.id
          )
          FROM public.prompt_steps AS step
          WHERE step.prompt_id = lineage.id
            AND (
              lineage.fork_source_run_id IS NULL
              OR step.step_number > COALESCE(lineage.fork_source_step_number, 0)
            )
        ), '[]'::JSONB)
      ) AS node
    FROM lineage
    WHERE NOT lineage.cycle
      AND lineage.hop < 10
  )
  SELECT jsonb_build_object(
    'status', CASE
      WHEN NOT EXISTS (SELECT 1 FROM lineage) THEN 'unavailable'
      WHEN facts.cycle THEN 'cycle'
      WHEN facts.truncated THEN 'truncated'
      WHEN facts.missing_parent THEN 'missing-parent'
      ELSE 'complete'
    END,
    'affected_project_id', CASE
      WHEN NOT EXISTS (SELECT 1 FROM lineage) THEN target_project::TEXT
      WHEN facts.cycle THEN (
        SELECT id::TEXT FROM lineage WHERE cycle ORDER BY hop LIMIT 1
      )
      WHEN facts.truncated THEN (
        SELECT id::TEXT FROM lineage WHERE hop >= 10 ORDER BY hop LIMIT 1
      )
      WHEN facts.missing_parent THEN (
        SELECT fork_source_project_id
        FROM lineage AS child
        WHERE NOT child.cycle
          AND child.fork_source_project_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM public.prompts AS parent
            WHERE parent.id::TEXT = child.fork_source_project_id
              AND parent.status = 'approved'
          )
        ORDER BY child.hop
        LIMIT 1
      )
      ELSE NULL
    END,
    'nodes', COALESCE((
      SELECT jsonb_agg(projected.node ORDER BY projected.hop DESC)
      FROM projected
    ), '[]'::JSONB)
  )
  FROM facts;
$$;

REVOKE ALL ON FUNCTION private.read_public_project_fork_lineage(UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.read_public_project_fork_lineages(
  target_projects UUID[]
)
RETURNS TABLE (
  target_project_id UUID,
  lineage JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target UUID;
BEGIN
  IF pg_catalog.cardinality(target_projects) NOT BETWEEN 1 AND 10
    OR target_projects IS NULL
    OR pg_catalog.array_position(target_projects, NULL) IS NOT NULL
    OR (
      SELECT COUNT(DISTINCT value)
      FROM pg_catalog.unnest(target_projects) AS value
    ) <> pg_catalog.cardinality(target_projects) THEN
    RAISE EXCEPTION
      'Public fork-lineage reads require 1 to 10 unique project IDs.';
  END IF;

  FOREACH target IN ARRAY target_projects LOOP
    target_project_id := target;
    lineage := private.read_public_project_fork_lineage(target);
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.read_public_project_fork_lineage(
  target_project UUID
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.read_public_project_fork_lineage(target_project);
$$;

REVOKE ALL ON FUNCTION public.read_public_project_fork_lineages(UUID[])
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_public_project_fork_lineage(UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_public_project_fork_lineages(UUID[])
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.read_public_project_fork_lineage(UUID)
  TO anon, authenticated, service_role;
