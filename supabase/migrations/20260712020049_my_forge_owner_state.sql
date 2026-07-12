-- PathForge My Forge owner state and public profile provenance.
--
-- The public profile provenance row is presentation metadata controlled by
-- PathForge admins. Private project state belongs only to the signed-in owner.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.pathforge_profile_operators (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('pathforge_seed', 'pathforge_team')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
REVOKE ALL ON TABLE private.pathforge_profile_operators
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE private.pathforge_profile_operators TO service_role;

-- One-time adoption of the existing service-created seed fleet. These accounts
-- are confirmed, use the historical synthetic domain, and have the exact
-- username/email convention enforced by the seed provisioner. Future operator
-- status never trusts email; it requires service-only app metadata.
INSERT INTO private.pathforge_profile_operators (profile_id, kind)
SELECT profiles.id, 'pathforge_seed'
FROM public.profiles AS profiles
JOIN auth.users AS auth_users ON auth_users.id = profiles.id
WHERE auth_users.email_confirmed_at IS NOT NULL
  AND LOWER(COALESCE(auth_users.email, '')) LIKE '%@pathforge-seed.example.com'
  AND SPLIT_PART(LOWER(auth_users.email), '@', 1)
    LIKE LOWER(profiles.username) || '.%'
ON CONFLICT (profile_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Public, admin-controlled profile provenance
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_provenance (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'member' CHECK (
    kind IN ('member', 'pathforge_seed', 'pathforge_team')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_provenance ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profile_provenance FROM anon, authenticated;
GRANT SELECT ON TABLE public.profile_provenance TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profile_provenance TO service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_provenance TO authenticated;

-- Handles are user-facing URLs and must remain unique independent of case.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_casefold_unique
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- Profile owners may edit presentation fields, never authorization state.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE (username, display_name, avatar_url, bio, updated_at)
  ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "Profile provenance is public" ON public.profile_provenance;
CREATE POLICY "Profile provenance is public"
  ON public.profile_provenance
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Admins control profile provenance" ON public.profile_provenance;
DROP POLICY IF EXISTS "Admins insert profile provenance" ON public.profile_provenance;
CREATE POLICY "Admins insert profile provenance"
  ON public.profile_provenance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins update profile provenance" ON public.profile_provenance;
CREATE POLICY "Admins update profile provenance"
  ON public.profile_provenance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins delete profile provenance" ON public.profile_provenance;
CREATE POLICY "Admins delete profile provenance"
  ON public.profile_provenance
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION private.touch_my_forge_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.touch_my_forge_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.touch_my_forge_updated_at() TO service_role;

DROP TRIGGER IF EXISTS touch_profile_provenance_updated_at
  ON public.profile_provenance;
CREATE TRIGGER touch_profile_provenance_updated_at
  BEFORE UPDATE ON public.profile_provenance
  FOR EACH ROW EXECUTE FUNCTION private.touch_my_forge_updated_at();

INSERT INTO public.profile_provenance (profile_id, kind)
SELECT
  profiles.id,
  CASE
    WHEN operators.kind IS NOT NULL THEN operators.kind
    WHEN profiles.role = 'admin'
      THEN 'pathforge_team'
    ELSE 'member'
  END
FROM public.profiles
LEFT JOIN private.pathforge_profile_operators AS operators
  ON operators.profile_id = profiles.id
ON CONFLICT (profile_id) DO UPDATE
SET kind = EXCLUDED.kind,
    updated_at = NOW();

CREATE OR REPLACE FUNCTION private.create_profile_provenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  operator_kind TEXT;
  app_metadata JSONB;
BEGIN
  SELECT auth_users.raw_app_meta_data
  INTO app_metadata
  FROM auth.users AS auth_users
  WHERE auth_users.id = NEW.id;

  IF COALESCE(app_metadata->>'pathforge_seed', 'false') = 'true' THEN
    INSERT INTO private.pathforge_profile_operators (profile_id, kind)
    VALUES (NEW.id, 'pathforge_seed')
    ON CONFLICT (profile_id) DO UPDATE SET kind = EXCLUDED.kind;
  END IF;

  SELECT kind
  INTO operator_kind
  FROM private.pathforge_profile_operators
  WHERE profile_id = NEW.id;

  INSERT INTO public.profile_provenance (profile_id, kind)
  VALUES (
    NEW.id,
    CASE
      WHEN operator_kind IS NOT NULL THEN operator_kind
      WHEN NEW.role = 'admin'
        THEN 'pathforge_team'
      ELSE 'member'
    END
  )
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.create_profile_provenance()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS create_profile_provenance_on_profile_insert
  ON public.profiles;
CREATE TRIGGER create_profile_provenance_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.create_profile_provenance();

-- ---------------------------------------------------------------------------
-- Owner-only saved project state
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_project_states (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  selected_model_variant_id UUID REFERENCES public.project_model_variants(id) ON DELETE RESTRICT,
  selected_source_run_id TEXT,
  selected_step_id TEXT,
  selected_step_number INT,
  selected_artifact_path TEXT,
  selected_artifact_sha256 TEXT,
  model_updates_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fork_started_at TIMESTAMPTZ,
  fork_parent_submission_id TEXT,
  fork_depth INT NOT NULL DEFAULT 0 CHECK (fork_depth >= 0 AND fork_depth < 10),
  fork_branch_index INT NOT NULL DEFAULT 0 CHECK (fork_branch_index >= 0 AND fork_branch_index < 10),
  fork_prompt_family_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id),
  CHECK (
    (
      selected_model_variant_id IS NULL
      AND selected_source_run_id IS NULL
      AND selected_step_id IS NULL
      AND selected_step_number IS NULL
      AND selected_artifact_path IS NULL
      AND selected_artifact_sha256 IS NULL
    )
    OR (
      selected_model_variant_id IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(selected_source_run_id, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(selected_step_id, '')), '') IS NOT NULL
      AND selected_step_number > 0
      AND selected_artifact_path LIKE 'public/artifacts/%'
      AND LENGTH(selected_artifact_path) > LENGTH('public/artifacts/')
      AND selected_artifact_path = BTRIM(selected_artifact_path)
      AND selected_artifact_path NOT LIKE '%..%'
      AND STRPOS(selected_artifact_path, CHR(92)) = 0
      AND selected_artifact_sha256 ~ '^[0-9a-f]{64}$'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_user_project_states_project
  ON public.user_project_states(project_id);
CREATE INDEX IF NOT EXISTS idx_user_project_states_variant
  ON public.user_project_states(selected_model_variant_id)
  WHERE selected_model_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_project_states_recent
  ON public.user_project_states(user_id, last_opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_project_states_model_updates
  ON public.user_project_states(user_id, model_updates_seen_at DESC);

CREATE OR REPLACE FUNCTION private.validate_user_project_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.selected_model_variant_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.project_model_variants AS variant
    JOIN public.project_model_variant_artifacts AS artifact
      ON artifact.model_variant_id = variant.id
    WHERE variant.id = NEW.selected_model_variant_id
      AND variant.project_id = NEW.project_id
      AND variant.source_run_id = NEW.selected_source_run_id
      AND variant.status IN ('published', 'historical')
      AND artifact.source_step_id = NEW.selected_step_id
      AND artifact.source_step_number = NEW.selected_step_number
      AND artifact.artifact_path = NEW.selected_artifact_path
      AND artifact.artifact_sha256 = NEW.selected_artifact_sha256
      AND EXISTS (
        SELECT 1
        FROM public.prompts AS project
        WHERE project.id = NEW.project_id
          AND project.status = 'approved'
      )
  ) THEN
    RAISE EXCEPTION 'Saved project state must reference an exact public model run, response, and artifact.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_user_project_state()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_user_project_state_fields
  ON public.user_project_states;
CREATE TRIGGER validate_user_project_state_fields
  BEFORE INSERT OR UPDATE OF
    project_id,
    selected_model_variant_id,
    selected_source_run_id,
    selected_step_id,
    selected_step_number,
    selected_artifact_path,
    selected_artifact_sha256
  ON public.user_project_states
  FOR EACH ROW EXECUTE FUNCTION private.validate_user_project_state();

DROP TRIGGER IF EXISTS touch_user_project_states_updated_at
  ON public.user_project_states;
CREATE TRIGGER touch_user_project_states_updated_at
  BEFORE UPDATE ON public.user_project_states
  FOR EACH ROW EXECUTE FUNCTION private.touch_my_forge_updated_at();

ALTER TABLE public.user_project_states ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_project_states FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_project_states TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_project_states TO service_role;

DROP POLICY IF EXISTS "Owners read project state" ON public.user_project_states;
CREATE POLICY "Owners read project state"
  ON public.user_project_states
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Owners create project state" ON public.user_project_states;
CREATE POLICY "Owners create project state"
  ON public.user_project_states
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.prompts
      WHERE prompts.id = user_project_states.project_id
        AND prompts.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Owners update project state" ON public.user_project_states;
CREATE POLICY "Owners update project state"
  ON public.user_project_states
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.prompts
      WHERE prompts.id = user_project_states.project_id
        AND prompts.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Owners delete project state" ON public.user_project_states;
CREATE POLICY "Owners delete project state"
  ON public.user_project_states
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Existing saves begin with the current model catalog acknowledged. This
-- prevents launch-time model history from appearing as a new notification.
INSERT INTO public.user_project_states (
  user_id,
  project_id,
  model_updates_seen_at,
  last_opened_at,
  created_at,
  updated_at
)
SELECT
  bookmarks.user_id,
  bookmarks.prompt_id,
  NOW(),
  bookmarks.created_at,
  bookmarks.created_at,
  NOW()
FROM public.bookmarks
JOIN public.prompts ON prompts.id = bookmarks.prompt_id
WHERE bookmarks.user_id IS NOT NULL
  AND bookmarks.prompt_id IS NOT NULL
  AND prompts.status = 'approved'
ON CONFLICT (user_id, project_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Append-only repair lineage for source-run submissions
-- ---------------------------------------------------------------------------

ALTER TABLE public.source_run_submissions
  ADD COLUMN IF NOT EXISTS resubmission_of_id UUID,
  ADD COLUMN IF NOT EXISTS user_status_note TEXT;

ALTER TABLE public.source_run_submissions
  DROP CONSTRAINT IF EXISTS source_run_submissions_status_check,
  ADD CONSTRAINT source_run_submissions_status_check CHECK (
    status IN (
      'queued',
      'extracting',
      'in_review',
      'needs_repair',
      'draft_created',
      'published',
      'declined',
      'failed'
    )
  ),
  DROP CONSTRAINT IF EXISTS source_run_submissions_resubmission_not_self,
  ADD CONSTRAINT source_run_submissions_resubmission_not_self CHECK (
    resubmission_of_id IS NULL OR resubmission_of_id <> id
  ),
  DROP CONSTRAINT IF EXISTS source_run_submissions_user_status_note_length,
  ADD CONSTRAINT source_run_submissions_user_status_note_length CHECK (
    user_status_note IS NULL OR LENGTH(user_status_note) <= 2000
  ),
  DROP CONSTRAINT IF EXISTS source_run_submissions_resubmission_fkey,
  ADD CONSTRAINT source_run_submissions_resubmission_fkey
    FOREIGN KEY (resubmission_of_id)
    REFERENCES public.source_run_submissions(id)
    ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_source_run_submissions_resubmission
  ON public.source_run_submissions(resubmission_of_id)
  WHERE resubmission_of_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_run_submissions_one_active_repair
  ON public.source_run_submissions(resubmission_of_id)
  WHERE resubmission_of_id IS NOT NULL
    AND status NOT IN ('failed', 'declined');
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_owner_lifecycle
  ON public.source_run_submissions(author_id, created_at DESC, status);

-- Historical admin dismissals used `failed` before decline and processing
-- failure became separate owner-facing lifecycle states.
DROP INDEX IF EXISTS public.idx_source_run_submissions_active_source_url;
DROP INDEX IF EXISTS public.idx_source_run_submissions_active_author_source_url;
DROP INDEX IF EXISTS public.idx_source_run_submissions_active_canonical_source_url;
DROP INDEX IF EXISTS public.idx_source_run_submissions_active_author_canonical_source_url;
CREATE UNIQUE INDEX idx_source_run_submissions_active_source_url
  ON public.source_run_submissions(source_url)
  WHERE source_url IS NOT NULL
    AND status NOT IN ('failed', 'declined');
CREATE UNIQUE INDEX idx_source_run_submissions_active_author_source_url
  ON public.source_run_submissions(author_id, source_url)
  WHERE source_url IS NOT NULL
    AND status NOT IN ('failed', 'declined');
CREATE UNIQUE INDEX idx_source_run_submissions_active_canonical_source_url
  ON public.source_run_submissions(canonical_source_url)
  WHERE canonical_source_url IS NOT NULL
    AND status NOT IN ('failed', 'declined');
CREATE UNIQUE INDEX idx_source_run_submissions_active_author_canonical_source_url
  ON public.source_run_submissions(author_id, canonical_source_url)
  WHERE canonical_source_url IS NOT NULL
    AND status NOT IN ('failed', 'declined');

UPDATE public.source_run_submissions
SET
  status = 'declined',
  user_status_note = COALESCE(
    user_status_note,
    'This submission was closed during review and will not be published.'
  ),
  updated_at = NOW()
WHERE status = 'failed'
  AND admin_notes = 'Dismissed from admin pending review. This intake should not be drafted.';

CREATE OR REPLACE FUNCTION private.source_run_owned_by_current_user(target_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.source_run_submissions
      WHERE source_run_submissions.id = target_id
        AND source_run_submissions.author_id = (SELECT auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION private.source_run_owned_by_current_user(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.source_run_owned_by_current_user(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.validate_source_run_resubmission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  prior_submission public.source_run_submissions%ROWTYPE;
BEGIN
  IF NEW.resubmission_of_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO prior_submission
  FROM public.source_run_submissions
  WHERE id = NEW.resubmission_of_id;

  IF NOT FOUND OR prior_submission.author_id IS DISTINCT FROM NEW.author_id THEN
    RAISE EXCEPTION 'A repair submission must belong to the same profile as its prior submission.';
  END IF;

  IF prior_submission.status NOT IN ('needs_repair', 'failed') THEN
    RAISE EXCEPTION 'A repair submission requires a prior source run that needs repair or genuinely failed processing.';
  END IF;

  IF ROW(
    NEW.fork_source_project_id,
    NEW.fork_source_project_title,
    NEW.fork_source_model_variant_id,
    NEW.fork_source_run_id,
    NEW.fork_source_step_id,
    NEW.fork_source_step_number,
    NEW.fork_source_artifact_path,
    NEW.fork_source_artifact_sha256,
    NEW.fork_parent_submission_id,
    NEW.prompt_family_id,
    NEW.fork_depth,
    NEW.fork_branch_index
  ) IS DISTINCT FROM ROW(
    prior_submission.fork_source_project_id,
    prior_submission.fork_source_project_title,
    prior_submission.fork_source_model_variant_id,
    prior_submission.fork_source_run_id,
    prior_submission.fork_source_step_id,
    prior_submission.fork_source_step_number,
    prior_submission.fork_source_artifact_path,
    prior_submission.fork_source_artifact_sha256,
    prior_submission.fork_parent_submission_id,
    prior_submission.prompt_family_id,
    prior_submission.fork_depth,
    prior_submission.fork_branch_index
  ) THEN
    RAISE EXCEPTION 'A repair submission must preserve the exact fork lineage of its prior submission.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_source_run_resubmission()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_source_run_resubmission_owner
  ON public.source_run_submissions;
CREATE TRIGGER validate_source_run_resubmission_owner
  BEFORE INSERT OR UPDATE OF resubmission_of_id, author_id
  ON public.source_run_submissions
  FOR EACH ROW EXECUTE FUNCTION private.validate_source_run_resubmission();

CREATE OR REPLACE FUNCTION public.prevent_source_run_intake_evidence_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.author_id IS DISTINCT FROM OLD.author_id
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.source_url IS DISTINCT FROM OLD.source_url
    OR NEW.canonical_source_url IS DISTINCT FROM OLD.canonical_source_url
    OR NEW.file_name IS DISTINCT FROM OLD.file_name
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.source_package_file IS DISTINCT FROM OLD.source_package_file
    OR NEW.source_package_sha256 IS DISTINCT FROM OLD.source_package_sha256
    OR NEW.intake_evidence IS DISTINCT FROM OLD.intake_evidence
    OR NEW.fork_source_project_id IS DISTINCT FROM OLD.fork_source_project_id
    OR NEW.fork_source_project_title IS DISTINCT FROM OLD.fork_source_project_title
    OR NEW.fork_source_model_variant_id IS DISTINCT FROM OLD.fork_source_model_variant_id
    OR NEW.fork_source_run_id IS DISTINCT FROM OLD.fork_source_run_id
    OR NEW.fork_source_step_id IS DISTINCT FROM OLD.fork_source_step_id
    OR NEW.fork_source_step_number IS DISTINCT FROM OLD.fork_source_step_number
    OR NEW.fork_source_artifact_path IS DISTINCT FROM OLD.fork_source_artifact_path
    OR NEW.fork_source_artifact_sha256 IS DISTINCT FROM OLD.fork_source_artifact_sha256
    OR NEW.fork_parent_submission_id IS DISTINCT FROM OLD.fork_parent_submission_id
    OR NEW.prompt_family_id IS DISTINCT FROM OLD.prompt_family_id
    OR NEW.fork_depth IS DISTINCT FROM OLD.fork_depth
    OR NEW.fork_branch_index IS DISTINCT FROM OLD.fork_branch_index
    OR NEW.resubmission_of_id IS DISTINCT FROM OLD.resubmission_of_id THEN
    RAISE EXCEPTION 'Imported source-run intake and lineage evidence is immutable.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_source_run_intake_evidence_mutation()
  FROM PUBLIC, anon, authenticated;

GRANT INSERT (resubmission_of_id)
  ON TABLE public.source_run_submissions TO authenticated;
GRANT UPDATE (user_status_note)
  ON TABLE public.source_run_submissions TO authenticated;

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
      OR private.source_run_owned_by_current_user(resubmission_of_id)
    )
  );

NOTIFY pgrst, 'reload schema';
