-- The model-update acknowledgement only reads public model history and writes
-- the caller's owner-scoped state row, so normal RLS is sufficient.

ALTER FUNCTION public.mark_project_model_update_seen(UUID, TEXT)
  SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.mark_project_model_update_seen(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_project_model_update_seen(UUID, TEXT)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
