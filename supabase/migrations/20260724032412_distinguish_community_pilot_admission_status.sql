-- Keep durable pilot admission separate from the operational gates that can
-- temporarily pause new submissions. Authorization remains fail-closed in
-- pathforge_actor_can_submit_community_project; this projection only explains
-- the current state to the signed-in account.
CREATE OR REPLACE FUNCTION private.pathforge_community_project_pilot_status(actor UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN actor IS NULL THEN 'signed_out'
    WHEN private.pathforge_actor_can_submit_community_project(actor) THEN 'eligible'
    WHEN private.pathforge_actor_is_admin(actor) THEN 'temporarily_paused'
    WHEN member.user_id IS NULL THEN 'not_admitted'
    WHEN NOT member.active THEN 'revoked'
    WHEN member.member_kind = 'internal_acceptance'
      AND (member.expires_at IS NULL OR member.expires_at <= NOW()) THEN 'expired'
    ELSE 'temporarily_paused'
  END
  FROM (SELECT actor AS user_id) AS requested
  LEFT JOIN public.community_project_pilot_members AS member
    ON member.user_id = requested.user_id;
$$;

CREATE OR REPLACE FUNCTION public.community_project_pilot_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.pathforge_community_project_pilot_status((SELECT auth.uid()));
$$;

-- Repairs remain private and return to manual review. They may continue for an
-- active admitted account while operational gates are temporarily paused, but
-- revocation, expiry, loss of admission, or a missing actor closes the write.
CREATE OR REPLACE FUNCTION private.pathforge_actor_can_repair_community_project(actor UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.pathforge_community_project_pilot_status(actor)
    IN ('eligible', 'temporarily_paused');
$$;

CREATE OR REPLACE FUNCTION public.replace_community_project_submission(
  target_submission UUID,
  actor UUID,
  payload JSONB,
  correlation UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.pathforge_actor_can_repair_community_project(actor) THEN
    RAISE EXCEPTION 'Current pilot admission is required to repair this community project.';
  END IF;
  RETURN private.replace_community_project_submission(
    target_submission, actor, payload, correlation
  );
END;
$$;

-- A tag invalidation can race an already-running Next.js cache fill. Keep a
-- durable database revision in every public-catalog cache key so a late fill
-- is confined to the old revision and can never resurrect removed public
-- state for later requests.
CREATE TABLE public.pathforge_public_catalog_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.pathforge_public_catalog_state (singleton)
VALUES (TRUE);

ALTER TABLE public.pathforge_public_catalog_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pathforge_public_catalog_state
  FROM PUBLIC, anon, authenticated;
GRANT SELECT (singleton, revision) ON TABLE public.pathforge_public_catalog_state
  TO anon, authenticated;
GRANT ALL ON TABLE public.pathforge_public_catalog_state
  TO service_role;

CREATE POLICY "Public catalog revision is readable"
  ON public.pathforge_public_catalog_state
  FOR SELECT
  TO anon, authenticated
  USING (singleton);

CREATE OR REPLACE FUNCTION public.get_public_catalog_revision()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT state.revision::TEXT
  FROM public.pathforge_public_catalog_state AS state
  WHERE state.singleton;
$$;

CREATE OR REPLACE FUNCTION private.bump_pathforge_public_catalog_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  should_bump BOOLEAN := TRUE;
BEGIN
  -- Pending prompts, their evidence steps, and profiles with no approved
  -- project are private work. They must not become an authenticated
  -- cache-busting surface. Row-level triggers let this function advance the
  -- global revision only when the affected row can change a public card.
  IF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'prompts' THEN
    should_bump := CASE TG_OP
      WHEN 'INSERT' THEN NEW.status = 'approved'
      WHEN 'DELETE' THEN OLD.status = 'approved'
      ELSE (
        (OLD.status = 'approved' OR NEW.status = 'approved')
        AND NEW IS DISTINCT FROM OLD
      )
    END;
  ELSIF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'prompt_steps' THEN
    SELECT (
      NEW IS DISTINCT FROM OLD
      AND EXISTS (
        SELECT 1
        FROM public.prompts AS prompt
        WHERE prompt.status = 'approved'
          AND prompt.id IN (OLD.prompt_id, NEW.prompt_id)
      )
    )
    INTO should_bump;
  ELSIF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'profiles' THEN
    SELECT (
      NEW IS DISTINCT FROM OLD
      AND EXISTS (
        SELECT 1
        FROM public.prompts AS prompt
        WHERE prompt.status = 'approved'
          AND prompt.author_id IN (OLD.id, NEW.id)
      )
    )
    INTO should_bump;
  ELSIF TG_TABLE_SCHEMA = 'public' AND TG_TABLE_NAME = 'profile_provenance' THEN
    SELECT (
      NEW IS DISTINCT FROM OLD
      AND EXISTS (
        SELECT 1
        FROM public.prompts AS prompt
        WHERE prompt.status = 'approved'
          AND prompt.author_id IN (OLD.profile_id, NEW.profile_id)
      )
    )
    INTO should_bump;
  ELSIF TG_TABLE_SCHEMA <> 'public'
    OR TG_TABLE_NAME NOT IN ('categories', 'community_project_submissions') THEN
    RAISE EXCEPTION 'Unsupported public-catalog revision trigger source %.%',
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME;
  END IF;

  IF NOT COALESCE(should_bump, FALSE) THEN
    RETURN NULL;
  END IF;

  UPDATE public.pathforge_public_catalog_state
  SET revision = revision + 1,
      updated_at = clock_timestamp()
  WHERE singleton;
  RETURN NULL;
END;
$$;

CREATE TRIGGER bump_public_catalog_revision_on_prompts
  AFTER INSERT OR DELETE OR UPDATE OF
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
    fork_source_step_id,
    fork_source_step_number,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_artifact_path,
    fork_source_artifact_sha256,
    fork_parent_submission_id,
    prompt_family_id,
    fork_depth,
    fork_branch_index,
    created_at
  ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION private.bump_pathforge_public_catalog_revision();

CREATE TRIGGER bump_public_catalog_revision_on_prompt_steps
  AFTER INSERT OR UPDATE OR DELETE ON public.prompt_steps
  FOR EACH ROW
  EXECUTE FUNCTION private.bump_pathforge_public_catalog_revision();

CREATE TRIGGER bump_public_catalog_revision_on_categories
  AFTER INSERT OR DELETE OR UPDATE OF
    name,
    slug,
    description,
    icon,
    prompt_count
  ON public.categories
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.bump_pathforge_public_catalog_revision();

CREATE TRIGGER bump_public_catalog_revision_on_profiles
  AFTER INSERT OR DELETE OR UPDATE OF
    username,
    display_name,
    avatar_url,
    bio,
    role
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.bump_pathforge_public_catalog_revision();

CREATE TRIGGER bump_public_catalog_revision_on_profile_provenance
  AFTER INSERT OR UPDATE OR DELETE ON public.profile_provenance
  FOR EACH ROW
  EXECUTE FUNCTION private.bump_pathforge_public_catalog_revision();

-- The public project capsule is joined from the moderated submission. Avoid
-- making private queued edits a cache-invalidation lever, while still
-- versioning every insertion, removal, or public-field update that can affect
-- a published capsule.
CREATE TRIGGER bump_public_catalog_revision_on_published_submission_insert
  AFTER INSERT ON public.community_project_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION private.bump_pathforge_public_catalog_revision();

CREATE TRIGGER bump_public_catalog_revision_on_published_submission_delete
  AFTER DELETE ON public.community_project_submissions
  FOR EACH ROW
  WHEN (OLD.status = 'published')
  EXECUTE FUNCTION private.bump_pathforge_public_catalog_revision();

CREATE TRIGGER bump_public_catalog_revision_on_published_submission_update
  AFTER UPDATE OF
    evidence_scope,
    provider,
    model,
    model_settings,
    source_url,
    source_visibility,
    source_access_status,
    source_checked_at,
    artifact_sha256,
    artifact_size_bytes,
    submitter_role,
    reuse_permission,
    submission_version,
    published_at,
    status,
    prompt_id
  ON public.community_project_submissions
  FOR EACH ROW
  WHEN (OLD.status = 'published' OR NEW.status = 'published')
  EXECUTE FUNCTION private.bump_pathforge_public_catalog_revision();

REVOKE ALL ON FUNCTION private.pathforge_community_project_pilot_status(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.pathforge_community_project_pilot_status(UUID)
  TO service_role;

REVOKE ALL ON FUNCTION private.pathforge_actor_can_repair_community_project(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.pathforge_actor_can_repair_community_project(UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.community_project_pilot_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_project_pilot_status()
  TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_catalog_revision()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_revision()
  TO anon, authenticated;

REVOKE ALL ON FUNCTION private.bump_pathforge_public_catalog_revision()
  FROM PUBLIC, anon, authenticated, service_role;

-- The checked public wrapper is the only service-role repair entrypoint.
REVOKE EXECUTE ON FUNCTION private.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  FROM service_role;
REVOKE ALL ON FUNCTION public.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  TO service_role;
