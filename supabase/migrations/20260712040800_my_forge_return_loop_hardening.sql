-- Keep unfinished-fork lineage independent from mutable artifact resume state,
-- initialize model-update baselines when a project is saved, and acknowledge
-- viewed model releases monotonically with server-owned timestamps.

ALTER TABLE public.user_project_states
  ADD COLUMN IF NOT EXISTS fork_source_model_variant_id UUID
    REFERENCES public.project_model_variants(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS fork_source_run_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_step_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_step_number INT,
  ADD COLUMN IF NOT EXISTS fork_source_artifact_path TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_artifact_sha256 TEXT;

ALTER TABLE public.user_project_states
  DROP CONSTRAINT IF EXISTS user_project_states_fork_source_fields_check,
  ADD CONSTRAINT user_project_states_fork_source_fields_check CHECK (
    (
      fork_source_model_variant_id IS NULL
      AND fork_source_run_id IS NULL
      AND fork_source_artifact_path IS NULL
      AND fork_source_artifact_sha256 IS NULL
      AND (
        (
          fork_source_step_id IS NULL
          AND fork_source_step_number IS NULL
        )
        OR (
          NULLIF(BTRIM(COALESCE(fork_source_step_id, '')), '') IS NOT NULL
          AND fork_source_step_number > 0
        )
      )
    )
    OR (
      fork_source_model_variant_id IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(fork_source_run_id, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(fork_source_step_id, '')), '') IS NOT NULL
      AND fork_source_step_number > 0
      AND fork_source_artifact_path LIKE 'public/artifacts/%'
      AND LENGTH(fork_source_artifact_path) > LENGTH('public/artifacts/')
      AND fork_source_artifact_path = BTRIM(fork_source_artifact_path)
      AND fork_source_artifact_path NOT LIKE '%..%'
      AND STRPOS(fork_source_artifact_path, CHR(92)) = 0
      AND fork_source_artifact_sha256 ~ '^[0-9a-f]{64}$'
    )
  );

CREATE INDEX IF NOT EXISTS idx_user_project_states_fork_variant
  ON public.user_project_states(fork_source_model_variant_id)
  WHERE fork_source_model_variant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.validate_user_project_fork_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.fork_source_model_variant_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.project_model_variants AS variant
      JOIN public.project_model_variant_artifacts AS artifact
        ON artifact.model_variant_id = variant.id
      JOIN public.prompts AS project
        ON project.id = variant.project_id
      WHERE variant.id = NEW.fork_source_model_variant_id
        AND variant.project_id = NEW.project_id
        AND variant.source_run_id = NEW.fork_source_run_id
        AND variant.status IN ('published', 'historical')
        AND artifact.source_step_id = NEW.fork_source_step_id
        AND artifact.source_step_number = NEW.fork_source_step_number
        AND artifact.artifact_path = NEW.fork_source_artifact_path
        AND artifact.artifact_sha256 = NEW.fork_source_artifact_sha256
        AND project.status = 'approved'
    ) THEN
      RAISE EXCEPTION 'Unfinished fork must preserve an exact public model run, response, and artifact.';
    END IF;
  ELSIF NEW.fork_source_step_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.prompt_steps AS step
      JOIN public.prompts AS project
        ON project.id = step.prompt_id
      WHERE step.id::TEXT = NEW.fork_source_step_id
        AND step.prompt_id = NEW.project_id
        AND step.step_number = NEW.fork_source_step_number
        AND project.status = 'approved'
    ) THEN
      RAISE EXCEPTION 'Unfinished fork response must belong to the public source project.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_user_project_fork_source()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_user_project_fork_source_fields
  ON public.user_project_states;
CREATE TRIGGER validate_user_project_fork_source_fields
  BEFORE INSERT OR UPDATE OF
    project_id,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_artifact_path,
    fork_source_artifact_sha256
  ON public.user_project_states
  FOR EACH ROW EXECUTE FUNCTION private.validate_user_project_fork_source();

CREATE OR REPLACE FUNCTION private.initialize_bookmarked_project_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_project_states (
    user_id,
    project_id,
    model_updates_seen_at,
    last_opened_at
  ) VALUES (
    NEW.user_id,
    NEW.prompt_id,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.created_at, NOW())
  )
  ON CONFLICT (user_id, project_id) DO UPDATE
    SET model_updates_seen_at = GREATEST(
      public.user_project_states.model_updates_seen_at,
      EXCLUDED.model_updates_seen_at
    );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.initialize_bookmarked_project_state()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS initialize_project_state_on_bookmark
  ON public.bookmarks;
CREATE TRIGGER initialize_project_state_on_bookmark
  AFTER INSERT ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION private.initialize_bookmarked_project_state();

INSERT INTO public.user_project_states (
  user_id,
  project_id,
  model_updates_seen_at,
  last_opened_at
)
SELECT
  bookmark.user_id,
  bookmark.prompt_id,
  COALESCE(bookmark.created_at, NOW()),
  COALESCE(bookmark.created_at, NOW())
FROM public.bookmarks AS bookmark
JOIN public.prompts AS project
  ON project.id = bookmark.prompt_id
WHERE project.status = 'approved'
ON CONFLICT (user_id, project_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.mark_project_model_update_seen(
  p_project_id UUID,
  p_source_run_id TEXT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  viewer_id UUID := auth.uid();
  viewed_release_at TIMESTAMPTZ;
  stored_seen_at TIMESTAMPTZ;
BEGIN
  IF viewer_id IS NULL THEN
    RAISE EXCEPTION 'Log in to update My Forge.';
  END IF;

  SELECT variant.created_at
    INTO viewed_release_at
  FROM public.project_model_variants AS variant
  JOIN public.prompts AS project
    ON project.id = variant.project_id
  WHERE variant.project_id = p_project_id
    AND variant.source_run_id = p_source_run_id
    AND variant.status = 'published'
    AND variant.is_current = TRUE
    AND project.status = 'approved';

  IF viewed_release_at IS NULL THEN
    RAISE EXCEPTION 'Only a current public model run can be marked as seen.';
  END IF;

  INSERT INTO public.user_project_states (
    user_id,
    project_id,
    model_updates_seen_at,
    last_opened_at
  ) VALUES (
    viewer_id,
    p_project_id,
    viewed_release_at,
    NOW()
  )
  ON CONFLICT (user_id, project_id) DO UPDATE
    SET model_updates_seen_at = GREATEST(
      public.user_project_states.model_updates_seen_at,
      EXCLUDED.model_updates_seen_at
    )
  RETURNING model_updates_seen_at INTO stored_seen_at;

  RETURN stored_seen_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_project_model_update_seen(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_project_model_update_seen(UUID, TEXT)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
