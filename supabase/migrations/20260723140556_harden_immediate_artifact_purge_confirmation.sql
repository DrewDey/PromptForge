-- An immediate withdrawal/removal revokes public access in its first
-- transaction. This follow-up record is only allowed after Storage itself
-- confirms that the private quarantine object no longer exists. Keeping that
-- check in the database makes the immediate path match daily reconciliation
-- instead of relying solely on a successful client-side Storage response.
CREATE OR REPLACE FUNCTION private.confirm_community_project_artifact_purged(
  target_submission UUID,
  actor UUID,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.objects AS object
    JOIN public.community_project_submissions AS submission
      ON submission.artifact_path = object.name
    WHERE submission.id = target_submission
      AND object.bucket_id = 'community-project-quarantine'
  ) THEN
    RAISE EXCEPTION 'The private artifact still exists and cannot be marked purged.';
  END IF;

  UPDATE public.community_project_submissions
  SET artifact_path = NULL,
      artifact_original_name = NULL,
      artifact_sha256 = NULL,
      artifact_size_bytes = NULL,
      artifact_scan = NULL,
      artifact_integrity_status = 'purged',
      artifact_integrity_checked_at = NOW(),
      updated_at = NOW()
  WHERE id = target_submission
    AND status IN ('withdrawn', 'removed')
    AND (author_id = actor OR private.pathforge_actor_is_admin(actor));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Artifact purge confirmation does not match a removed project.';
  END IF;

  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    target_submission,
    actor,
    CASE WHEN private.pathforge_actor_is_admin(actor) THEN 'admin' ELSE 'builder' END,
    'artifact_purged',
    correlation,
    '{}'::JSONB
  );
END;
$$;
