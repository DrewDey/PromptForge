-- Release-review repairs are additive because the first community pilot
-- migration is already recorded in production. Keep every default closed and
-- preserve the existing service-only publication boundary.

-- Published checkpoints must be readable with their approved parent project.
-- Owners retain pending legacy steps, administrators retain moderation access,
-- and rejected/withdrawn community evidence fails closed for everyone else.
DROP POLICY IF EXISTS "Approved prompt steps, pending owners, and admins can read"
  ON public.prompt_steps;
DROP POLICY IF EXISTS "Prompt steps are viewable with their prompt"
  ON public.prompt_steps;
DROP POLICY IF EXISTS "Approved prompt steps are public"
  ON public.prompt_steps;
CREATE POLICY "Approved prompt steps are public"
  ON public.prompt_steps
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.prompts AS project
      WHERE project.id = prompt_steps.prompt_id
        AND project.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Pending prompt steps are visible to owners and admins"
  ON public.prompt_steps;
CREATE POLICY "Pending prompt steps are visible to owners and admins"
  ON public.prompt_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.prompts AS project
      WHERE project.id = prompt_steps.prompt_id
        AND project.status = 'pending'
        AND (
          project.author_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role = 'admin'
          )
        )
    )
  );

-- Deleting an auth profile must not cascade away submissions, reports, and
-- audit events ahead of the documented retention and investigation holds.
ALTER TABLE public.community_project_submissions
  DROP CONSTRAINT IF EXISTS community_project_submissions_author_id_fkey;
ALTER TABLE public.community_project_submissions
  ADD CONSTRAINT community_project_submissions_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Legacy source-run intake now records public-link permission separately from
-- private review access. Existing unpublished rows fail closed until a new
-- submission or repair explicitly records consent. Already-published prepared
-- catalog rows remain historical controlled catalog records; this migration
-- does not relabel them as contributor consent, and any later preparation or
-- repair must record new explicit consent.
ALTER TABLE public.source_run_submissions
  ADD COLUMN IF NOT EXISTS source_visibility TEXT NOT NULL DEFAULT 'review_only',
  ADD COLUMN IF NOT EXISTS source_publication_consent_at TIMESTAMPTZ;

ALTER TABLE public.source_run_submissions
  DROP CONSTRAINT IF EXISTS source_run_submissions_source_visibility_check;
ALTER TABLE public.source_run_submissions
  ADD CONSTRAINT source_run_submissions_source_visibility_check
  CHECK (source_visibility IN ('review_only', 'public'));

ALTER TABLE public.source_run_submissions
  DROP CONSTRAINT IF EXISTS source_run_submissions_public_source_consent_check;
ALTER TABLE public.source_run_submissions
  ADD CONSTRAINT source_run_submissions_public_source_consent_check
  CHECK (
    source_visibility = 'review_only'
    OR (
      source_url IS NOT NULL
      AND source_publication_consent_at IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION private.pathforge_validate_legacy_source_run_url(source_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF source_url IS NULL THEN
    RETURN;
  END IF;
  IF source_url !~* '^https://(chatgpt\.com/share/[A-Za-z0-9-]+|claude\.ai/share/[A-Za-z0-9-]+|g\.co/gemini/share/[A-Za-z0-9-]+|gemini\.google\.com/share/[A-Za-z0-9-]+)/?$' THEN
    RAISE EXCEPTION 'Use a public ChatGPT, Claude, or Gemini share link without a query string or fragment. Private conversation URLs are not accepted.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.guard_legacy_source_run_public_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.pathforge_validate_legacy_source_run_url(NEW.source_url);
  IF NEW.source_visibility = 'public'
    AND (NEW.source_url IS NULL OR NEW.source_publication_consent_at IS NULL) THEN
    RAISE EXCEPTION 'Public source links require explicit contributor consent.';
  END IF;
  IF TG_OP = 'UPDATE'
    AND NEW.source_visibility = 'public'
    AND (
      NEW.source_url IS DISTINCT FROM OLD.source_url
      OR OLD.source_visibility IS DISTINCT FROM 'public'
    )
    AND NEW.source_publication_consent_at IS NOT DISTINCT FROM OLD.source_publication_consent_at THEN
    RAISE EXCEPTION 'Changing a public source link requires renewed explicit contributor consent.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_legacy_source_run_public_link
  ON public.source_run_submissions;
CREATE TRIGGER guard_legacy_source_run_public_link
  BEFORE INSERT OR UPDATE OF source_url, source_visibility, source_publication_consent_at
  ON public.source_run_submissions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_legacy_source_run_public_link();

-- A prepared showcase copies the source link into a public project. Make the
-- contributor's explicit public-link permission a database publication gate,
-- including for trusted service callers and historical review-only rows.
CREATE OR REPLACE FUNCTION private.require_legacy_source_run_publication_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (
      (
        TG_OP = 'INSERT'
        AND (NEW.status = 'draft_created' OR NEW.extracted_prompt_id IS NOT NULL)
      )
      OR (
        TG_OP = 'UPDATE'
        AND (
          (NEW.status = 'draft_created' AND OLD.status IS DISTINCT FROM 'draft_created')
          OR (
            NEW.extracted_prompt_id IS NOT NULL
            AND NEW.extracted_prompt_id IS DISTINCT FROM OLD.extracted_prompt_id
          )
          OR (
            NEW.status = 'draft_created'
            AND (
              NEW.source_url IS DISTINCT FROM OLD.source_url
              OR NEW.source_visibility IS DISTINCT FROM OLD.source_visibility
              OR NEW.source_publication_consent_at IS DISTINCT FROM OLD.source_publication_consent_at
            )
          )
        )
      )
    )
    AND (
      NEW.source_visibility <> 'public'
      OR NEW.source_url IS NULL
      OR NEW.source_publication_consent_at IS NULL
    ) THEN
    RAISE EXCEPTION 'Prepared publication requires explicit consent for the public source link.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_legacy_source_run_publication_consent_on_insert
  ON public.source_run_submissions;
CREATE TRIGGER require_legacy_source_run_publication_consent_on_insert
  BEFORE INSERT
  ON public.source_run_submissions
  FOR EACH ROW
  EXECUTE FUNCTION private.require_legacy_source_run_publication_consent();

DROP TRIGGER IF EXISTS require_legacy_source_run_publication_consent_on_update
  ON public.source_run_submissions;
CREATE TRIGGER require_legacy_source_run_publication_consent_on_update
  BEFORE UPDATE OF
    status,
    extracted_prompt_id,
    source_url,
    source_visibility,
    source_publication_consent_at
  ON public.source_run_submissions
  FOR EACH ROW
  EXECUTE FUNCTION private.require_legacy_source_run_publication_consent();

REVOKE INSERT ON TABLE public.source_run_submissions FROM authenticated;
GRANT INSERT (
  title,
  source_url,
  source_visibility,
  source_publication_consent_at,
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
  resubmission_of_id,
  author_id,
  status
) ON TABLE public.source_run_submissions TO authenticated;

-- The current browser creates an ordinary queue row or uses a service-only
-- repair RPC. The policy also preserves safe application rollback: the prior
-- client may create a repair only when it copies the complete, owned,
-- repair-eligible predecessor lineage and no active sibling repair exists.
DROP POLICY IF EXISTS "Users submit untouched queued source runs"
  ON public.source_run_submissions;
CREATE POLICY "Users submit untouched queued source runs"
  ON public.source_run_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND status = 'queued'
    AND extracted_prompt_id IS NULL
    AND admin_notes IS NULL
    AND user_status_note IS NULL
    AND canonical_source_url IS NULL
    AND source_package_file IS NULL
    AND source_package_sha256 IS NULL
    AND intake_evidence IS NULL
    AND (
      resubmission_of_id IS NULL
      OR (
        EXISTS (
          SELECT 1
          FROM public.source_run_submissions AS prior
          WHERE prior.id = source_run_submissions.resubmission_of_id
            AND prior.author_id = (SELECT auth.uid())
            AND prior.status IN ('needs_repair', 'failed')
            AND ROW(
              source_run_submissions.fork_source_project_id,
              source_run_submissions.fork_source_project_title,
              source_run_submissions.fork_source_model_variant_id,
              source_run_submissions.fork_source_run_id,
              source_run_submissions.fork_source_step_id,
              source_run_submissions.fork_source_step_number,
              source_run_submissions.fork_source_artifact_path,
              source_run_submissions.fork_source_artifact_sha256,
              source_run_submissions.fork_parent_submission_id,
              source_run_submissions.prompt_family_id,
              source_run_submissions.fork_depth,
              source_run_submissions.fork_branch_index
            ) IS NOT DISTINCT FROM ROW(
              prior.fork_source_project_id,
              prior.fork_source_project_title,
              prior.fork_source_model_variant_id,
              prior.fork_source_run_id,
              prior.fork_source_step_id,
              prior.fork_source_step_number,
              prior.fork_source_artifact_path,
              prior.fork_source_artifact_sha256,
              prior.fork_parent_submission_id,
              prior.prompt_family_id,
              prior.fork_depth,
              prior.fork_branch_index
            )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.source_run_submissions AS sibling
          WHERE sibling.resubmission_of_id = source_run_submissions.resubmission_of_id
            AND sibling.status NOT IN ('failed', 'declined')
        )
      )
    )
  );

-- New callers record explicit public-link consent. Keep the prior six-argument
-- function for application rollback; it creates a review-only repair.
CREATE OR REPLACE FUNCTION private.create_legacy_source_run_repair(
  target_submission UUID,
  actor UUID,
  repair_title TEXT,
  repair_source_url TEXT,
  repair_notes TEXT,
  repair_source_visibility TEXT,
  repair_source_publication_consent_at TIMESTAMPTZ,
  correlation UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  repair_id UUID;
BEGIN
  IF repair_source_visibility <> 'public'
    OR repair_source_publication_consent_at IS NULL THEN
    RAISE EXCEPTION 'Legacy repairs require explicit public-link consent.';
  END IF;
  PERFORM private.pathforge_validate_legacy_source_run_url(repair_source_url);
  repair_id := private.create_legacy_source_run_repair(
    target_submission,
    actor,
    repair_title,
    repair_source_url,
    repair_notes,
    correlation
  );
  UPDATE public.source_run_submissions
  SET source_visibility = repair_source_visibility,
      source_publication_consent_at = repair_source_publication_consent_at,
      updated_at = NOW()
  WHERE id = repair_id;
  RETURN repair_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_legacy_source_run_repair(
  target_submission UUID,
  actor UUID,
  repair_title TEXT,
  repair_source_url TEXT,
  repair_notes TEXT,
  repair_source_visibility TEXT,
  repair_source_publication_consent_at TIMESTAMPTZ,
  correlation UUID
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.create_legacy_source_run_repair(
    target_submission,
    actor,
    repair_title,
    repair_source_url,
    repair_notes,
    repair_source_visibility,
    repair_source_publication_consent_at,
    correlation
  );
$$;

REVOKE ALL ON FUNCTION private.create_legacy_source_run_repair(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_legacy_source_run_repair(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_legacy_source_run_repair(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_legacy_source_run_repair(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID
) TO service_role;

-- Count only live workflow rows against the 50-submission pilot cap. Retained
-- declined, withdrawn, and removed audit records must not consume capacity.
CREATE OR REPLACE FUNCTION private.create_community_project_submission(
  actor UUID,
  payload JSONB,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submission_id UUID := gen_random_uuid();
  fork JSONB := payload->'fork';
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF actor IS NULL OR NOT private.pathforge_actor_can_submit_community_project(actor) THEN
    RAISE EXCEPTION 'This account is not eligible for the community project pilot.';
  END IF;

  PERFORM private.pathforge_validate_community_submission_payload(payload);
  fork := private.pathforge_resolve_community_fork(fork);

  IF split_part(payload->>'artifact_path', '/', 1) <> actor::TEXT THEN
    RAISE EXCEPTION 'Artifact path does not belong to the submitting account.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE objects.bucket_id = 'community-project-quarantine'
      AND objects.name = payload->>'artifact_path'
  ) THEN
    RAISE EXCEPTION 'The scanned artifact is not present in private quarantine.';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('community-project-pilot-submission-cap', 0)
  );
  IF (
    SELECT COUNT(*)
    FROM public.community_project_submissions
    WHERE status IN ('queued', 'needs_repair', 'published')
  ) >= 50 THEN
    RAISE EXCEPTION 'The invitation-only pilot has reached its 50-active-submission cap.';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.community_project_submissions
    WHERE community_project_submissions.author_id = actor
      AND community_project_submissions.created_at > NOW() - INTERVAL '1 hour'
      AND community_project_submissions.status NOT IN ('withdrawn', 'removed')
  ) >= 5 THEN
    RAISE EXCEPTION 'Community project pilot limit reached. Try again later.';
  END IF;

  INSERT INTO public.community_project_submissions (
    id,
    author_id,
    title,
    summary,
    category_slug,
    difficulty,
    provider,
    model,
    model_settings,
    evidence_scope,
    source_url,
    source_visibility,
    build_steps,
    artifact_path,
    artifact_original_name,
    artifact_sha256,
    artifact_size_bytes,
    artifact_scan,
    submitter_role,
    reuse_permission,
    terms_version,
    privacy_version,
    builder_attested_at,
    profile_attribution_attested_at,
    rights_attested_at,
    privacy_attested_at,
    publication_consent_at,
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
  ) VALUES (
    submission_id,
    actor,
    BTRIM(payload->>'title'),
    BTRIM(payload->>'summary'),
    BTRIM(payload->>'category_slug'),
    payload->>'difficulty',
    BTRIM(payload->>'provider'),
    BTRIM(payload->>'model'),
    NULLIF(BTRIM(COALESCE(payload->>'model_settings', '')), ''),
    payload->>'evidence_scope',
    NULLIF(BTRIM(COALESCE(payload->>'source_url', '')), ''),
    payload->>'source_visibility',
    payload->'build_steps',
    payload->>'artifact_path',
    payload->>'artifact_original_name',
    payload->>'artifact_sha256',
    (payload->>'artifact_size_bytes')::INT,
    payload->'artifact_scan',
    payload->>'submitter_role',
    payload->>'reuse_permission',
    payload->>'terms_version',
    payload->>'privacy_version',
    (payload->>'builder_attested_at')::TIMESTAMPTZ,
    (payload->>'profile_attribution_attested_at')::TIMESTAMPTZ,
    (payload->>'rights_attested_at')::TIMESTAMPTZ,
    (payload->>'privacy_attested_at')::TIMESTAMPTZ,
    (payload->>'publication_consent_at')::TIMESTAMPTZ,
    CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_project_id'), '') END,
    CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_project_title'), '') END,
    CASE WHEN fork = 'null'::JSONB OR NULLIF(fork->>'source_model_variant_id', '') IS NULL THEN NULL ELSE (fork->>'source_model_variant_id')::UUID END,
    CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_run_id'), '') END,
    CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_step_id'), '') END,
    CASE WHEN fork = 'null'::JSONB OR NULLIF(fork->>'source_step_number', '') IS NULL THEN NULL ELSE (fork->>'source_step_number')::INT END,
    CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_artifact_path'), '') END,
    CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_artifact_sha256'), '') END,
    CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'parent_submission_id'), '') END,
    CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'prompt_family_id'), '') END,
    CASE WHEN fork = 'null'::JSONB THEN 0 ELSE (fork->>'depth')::INT END,
    CASE WHEN fork = 'null'::JSONB THEN 0 ELSE (fork->>'branch_index')::INT END
  );

  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id,
    details
  ) VALUES (
    submission_id, actor, 'builder', 'submitted', correlation,
    jsonb_build_object(
      'submission_version', 1,
      'artifact_sha256', payload->>'artifact_sha256',
      'scanner_version', payload->'artifact_scan'->>'scanner_version'
    )
  );

  RETURN submission_id;
END;
$$;

-- A single revocable manifest replaces two route RPCs. Bytes may be cached only
-- after this manifest is rechecked, so withdrawal/removal remains immediate.
CREATE OR REPLACE FUNCTION public.get_public_community_project_artifact_manifest(
  target_prompt UUID
)
RETURNS TABLE (
  artifact_path TEXT,
  artifact_sha256 TEXT,
  artifact_size_bytes INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    submission.artifact_path,
    submission.artifact_sha256,
    submission.artifact_size_bytes
  FROM public.community_project_submissions AS submission
  JOIN public.prompts AS project ON project.id = submission.prompt_id
  WHERE submission.prompt_id = target_prompt
    AND submission.status = 'published'
    AND submission.artifact_integrity_status = 'verified'
    AND project.status = 'approved'
    AND submission.artifact_path IS NOT NULL
    AND submission.artifact_sha256 ~ '^[0-9a-f]{64}$'
    AND submission.artifact_size_bytes BETWEEN 1 AND 2000000;
$$;

REVOKE ALL ON FUNCTION public.get_public_community_project_artifact_manifest(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_community_project_artifact_manifest(UUID)
  TO service_role;

-- The external cohort remains closed by default but can now be deliberately
-- enabled or re-locked through the shipped admin product.
CREATE OR REPLACE FUNCTION private.set_community_project_invitation_control(
  administrator UUID,
  enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    OR NOT private.pathforge_actor_is_admin(administrator) THEN
    RAISE EXCEPTION 'Admin service access required.';
  END IF;
  UPDATE public.community_project_pilot_controls
  SET allow_invited_submissions = enabled,
      updated_by = administrator,
      updated_at = NOW()
  WHERE singleton;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community project pilot controls are unavailable.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_community_project_invitation_control(
  administrator UUID,
  enabled BOOLEAN
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.set_community_project_invitation_control(administrator, enabled);
$$;

REVOKE ALL ON FUNCTION private.set_community_project_invitation_control(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_community_project_invitation_control(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.set_community_project_invitation_control(UUID, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_community_project_invitation_control(UUID, BOOLEAN)
  TO service_role;

-- A stale application build may still enqueue a private bundle during a
-- rollback, but publication must use the exact scanner contract reviewed with
-- this release.
CREATE OR REPLACE FUNCTION private.require_current_community_artifact_scan_for_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published'
    AND (
      jsonb_typeof(NEW.artifact_scan) IS DISTINCT FROM 'object'
      OR NEW.artifact_scan->>'passed' IS DISTINCT FROM 'true'
      OR NEW.artifact_scan->>'scanner_version' IS DISTINCT FROM 'html-static-v3'
      OR CASE
        WHEN jsonb_typeof(NEW.artifact_scan->'findings') = 'array'
          THEN jsonb_array_length(NEW.artifact_scan->'findings') <> 0
        ELSE TRUE
      END
      OR NEW.artifact_integrity_status IS DISTINCT FROM 'verified'
    ) THEN
    RAISE EXCEPTION 'Publication requires a verified html-static-v3 artifact scan.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_current_community_artifact_scan_for_publication
  ON public.community_project_submissions;
CREATE TRIGGER require_current_community_artifact_scan_for_publication
  BEFORE INSERT OR UPDATE OF status, artifact_scan, artifact_integrity_status
  ON public.community_project_submissions
  FOR EACH ROW
  EXECUTE FUNCTION private.require_current_community_artifact_scan_for_publication();

-- Normalize the public record to the actual script-disabled presentation even
-- though the already-applied publication function used an interactive label.
CREATE OR REPLACE FUNCTION private.normalize_community_prompt_static_label()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.tags @> ARRAY['community-project']::TEXT[]
    AND NEW.result_content = 'Interactive HTML artifact included.' THEN
    NEW.result_content := 'Script-disabled HTML preview included.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_community_prompt_static_label
  ON public.prompts;
CREATE TRIGGER normalize_community_prompt_static_label
  BEFORE INSERT OR UPDATE OF result_content, tags
  ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION private.normalize_community_prompt_static_label();

UPDATE public.prompts
SET result_content = 'Script-disabled HTML preview included.',
    updated_at = NOW()
WHERE tags @> ARRAY['community-project']::TEXT[]
  AND result_content = 'Interactive HTML artifact included.';

-- Browser-required textareas are not an authorization boundary. Reject empty
-- or vague moderation removals at the database event boundary so the entire
-- removal transaction rolls back without a durable reason.
CREATE OR REPLACE FUNCTION private.require_community_project_removal_reason()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.event_type = 'removed'
    AND LENGTH(BTRIM(COALESCE(NEW.details->>'reason', ''))) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'A moderation removal reason between 10 and 2000 characters is required.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_community_project_removal_reason
  ON public.community_project_events;
CREATE TRIGGER require_community_project_removal_reason
  BEFORE INSERT
  ON public.community_project_events
  FOR EACH ROW
  EXECUTE FUNCTION private.require_community_project_removal_reason();

-- Repeated cleanup confirmation is a successful no-op. It must not append a
-- second artifact_purged audit event.
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
DECLARE
  submission public.community_project_submissions%ROWTYPE;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;

  SELECT candidate.* INTO submission
  FROM public.community_project_submissions AS candidate
  WHERE candidate.id = target_submission
    AND candidate.status IN ('withdrawn', 'removed')
    AND (candidate.author_id = actor OR private.pathforge_actor_is_admin(actor))
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Artifact purge confirmation does not match a removed project.';
  END IF;

  IF submission.artifact_integrity_status = 'purged'
    AND submission.artifact_path IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.objects AS object
    WHERE object.bucket_id = 'community-project-quarantine'
      AND object.name = submission.artifact_path
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
    AND (author_id = actor OR private.pathforge_actor_is_admin(actor))
    AND artifact_integrity_status <> 'purged';
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

REVOKE ALL ON FUNCTION private.pathforge_validate_legacy_source_run_url(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.guard_legacy_source_run_public_link()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.require_legacy_source_run_publication_consent()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.require_current_community_artifact_scan_for_publication()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.normalize_community_prompt_static_label()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.require_community_project_removal_reason()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
