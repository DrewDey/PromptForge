-- A model run becomes new to PathForge when its published registry row is
-- created, not when the upstream model session happened to finish.

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
