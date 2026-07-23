-- Invitation-only community project pilot.
--
-- Community bundles are deliberately separate from the legacy URL-only
-- source_run_submissions table. Publication is database-backed, reversible,
-- and does not require a route, registry entry, seed package, or deployment.

CREATE SCHEMA IF NOT EXISTS private;

-- Keep the existing privacy-conscious activation stream semantically honest:
-- community artifact submissions are not legacy URL-only source runs.
ALTER TABLE public.product_events
  DROP CONSTRAINT product_events_event_name_check,
  DROP CONSTRAINT product_events_builder_action,
  ADD CONSTRAINT product_events_event_name_check CHECK (event_name IN (
    'discovery_viewed',
    'discovery_searched',
    'project_opened',
    'build_path_reached',
    'artifact_opened',
    'model_run_compared',
    'builder_action_started',
    'account_created',
    'source_run_submitted',
    'community_project_submitted',
    'my_forge_returned'
  )),
  ADD CONSTRAINT product_events_builder_action CHECK (
    event_name NOT IN (
      'builder_action_started',
      'source_run_submitted',
      'community_project_submitted'
    )
    OR action IN ('fork', 'share')
  );

CREATE TABLE public.community_project_pilot_members (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  member_kind TEXT NOT NULL DEFAULT 'invited_builder' CHECK (
    member_kind IN ('internal_acceptance', 'invited_builder')
  ),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  note TEXT CHECK (note IS NULL OR LENGTH(note) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CHECK ((active AND revoked_at IS NULL) OR (NOT active AND revoked_at IS NOT NULL)),
  CHECK (
    (member_kind = 'internal_acceptance' AND expires_at IS NOT NULL)
    OR (member_kind = 'invited_builder' AND expires_at IS NULL)
  )
);

CREATE TABLE public.community_project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (LENGTH(BTRIM(title)) BETWEEN 3 AND 120),
  summary TEXT NOT NULL CHECK (LENGTH(BTRIM(summary)) BETWEEN 20 AND 2000),
  category_slug TEXT NOT NULL REFERENCES public.categories(slug) ON UPDATE CASCADE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  provider TEXT NOT NULL CHECK (LENGTH(BTRIM(provider)) BETWEEN 2 AND 80),
  model TEXT NOT NULL CHECK (LENGTH(BTRIM(model)) BETWEEN 2 AND 160),
  model_settings TEXT CHECK (model_settings IS NULL OR LENGTH(model_settings) <= 1000),
  evidence_scope TEXT NOT NULL CHECK (
    evidence_scope IN ('full_run', 'selected_excerpts', 'reconstructed_notes')
  ),
  source_url TEXT CHECK (source_url IS NULL OR source_url ~ '^https://[^[:space:]]+$'),
  source_visibility TEXT NOT NULL DEFAULT 'review_only' CHECK (
    source_visibility IN ('review_only', 'public')
  ),
  source_access_status TEXT NOT NULL DEFAULT 'not_checked' CHECK (
    source_access_status IN ('not_checked', 'public_verified', 'unavailable')
  ),
  source_checked_at TIMESTAMPTZ,
  source_checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  build_steps JSONB NOT NULL CHECK (
    jsonb_typeof(build_steps) = 'array'
    AND jsonb_array_length(build_steps) BETWEEN 1 AND 5
    AND octet_length(build_steps::TEXT) <= 250000
  ),
  artifact_path TEXT UNIQUE,
  artifact_original_name TEXT CHECK (
    artifact_original_name IS NULL OR LENGTH(artifact_original_name) BETWEEN 1 AND 180
  ),
  artifact_sha256 TEXT CHECK (artifact_sha256 IS NULL OR artifact_sha256 ~ '^[0-9a-f]{64}$'),
  artifact_size_bytes INT CHECK (
    artifact_size_bytes IS NULL OR artifact_size_bytes BETWEEN 1 AND 2000000
  ),
  artifact_scan JSONB CHECK (artifact_scan IS NULL OR jsonb_typeof(artifact_scan) = 'object'),
  artifact_integrity_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    artifact_integrity_status IN ('pending', 'verified', 'failed', 'purged')
  ),
  artifact_integrity_checked_at TIMESTAMPTZ,
  submitter_role TEXT NOT NULL CHECK (
    submitter_role = 'builder'
  ),
  reuse_permission TEXT NOT NULL CHECK (
    reuse_permission IN ('view_only', 'allow_pathforge_remix')
  ),
  terms_version TEXT NOT NULL CHECK (LENGTH(BTRIM(terms_version)) BETWEEN 1 AND 80),
  privacy_version TEXT NOT NULL CHECK (LENGTH(BTRIM(privacy_version)) BETWEEN 1 AND 80),
  builder_attested_at TIMESTAMPTZ NOT NULL,
  profile_attribution_attested_at TIMESTAMPTZ NOT NULL,
  rights_attested_at TIMESTAMPTZ NOT NULL,
  privacy_attested_at TIMESTAMPTZ NOT NULL,
  publication_consent_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'needs_repair', 'published', 'declined', 'withdrawn', 'removed')
  ),
  prompt_id UUID UNIQUE REFERENCES public.prompts(id) ON DELETE SET NULL,
  former_prompt_id UUID REFERENCES public.prompts(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_checklist_version TEXT CHECK (
    review_checklist_version IS NULL OR LENGTH(BTRIM(review_checklist_version)) BETWEEN 1 AND 80
  ),
  review_checklist JSONB CHECK (
    review_checklist IS NULL OR (
      jsonb_typeof(review_checklist) = 'object'
      AND review_checklist ?& ARRAY[
        'artifact_reviewed',
        'evidence_reviewed',
        'privacy_rights_reviewed',
        'public_truth_reviewed',
        'moderation_reviewed'
      ]
      AND review_checklist - ARRAY[
        'artifact_reviewed',
        'evidence_reviewed',
        'privacy_rights_reviewed',
        'public_truth_reviewed',
        'moderation_reviewed'
      ] = '{}'::JSONB
      AND review_checklist->'artifact_reviewed' = 'true'::JSONB
      AND review_checklist->'evidence_reviewed' = 'true'::JSONB
      AND review_checklist->'privacy_rights_reviewed' = 'true'::JSONB
      AND review_checklist->'public_truth_reviewed' = 'true'::JSONB
      AND review_checklist->'moderation_reviewed' = 'true'::JSONB
    )
  ),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT CHECK (review_notes IS NULL OR LENGTH(review_notes) <= 4000),
  user_status_note TEXT CHECK (user_status_note IS NULL OR LENGTH(user_status_note) <= 2000),
  published_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  submission_version INT NOT NULL DEFAULT 1 CHECK (submission_version BETWEEN 1 AND 100),
  fork_source_project_id TEXT,
  fork_source_project_title TEXT,
  fork_source_model_variant_id UUID REFERENCES public.project_model_variants(id) ON DELETE RESTRICT,
  fork_source_run_id TEXT,
  fork_source_step_id TEXT,
  fork_source_step_number INT CHECK (fork_source_step_number IS NULL OR fork_source_step_number > 0),
  fork_source_artifact_path TEXT,
  fork_source_artifact_sha256 TEXT CHECK (
    fork_source_artifact_sha256 IS NULL OR fork_source_artifact_sha256 ~ '^[0-9a-f]{64}$'
  ),
  fork_parent_submission_id TEXT,
  prompt_family_id TEXT,
  fork_depth INT NOT NULL DEFAULT 0 CHECK (fork_depth BETWEEN 0 AND 9),
  fork_branch_index INT NOT NULL DEFAULT 0 CHECK (fork_branch_index BETWEEN 0 AND 9),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (source_url IS NULL AND source_visibility = 'review_only' AND source_access_status = 'not_checked')
    OR source_url IS NOT NULL
  ),
  CHECK (
    (source_access_status = 'public_verified' AND source_checked_at IS NOT NULL AND source_checked_by IS NOT NULL)
    OR (source_access_status <> 'public_verified')
  ),
  CHECK (
    status IN ('withdrawn', 'removed')
    OR (
      artifact_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.html\.txt$'
      AND artifact_original_name IS NOT NULL
      AND artifact_sha256 ~ '^[0-9a-f]{64}$'
      AND artifact_size_bytes BETWEEN 1 AND 2000000
      AND artifact_scan IS NOT NULL
    )
  ),
  CHECK (
    (
      status = 'published'
      AND prompt_id IS NOT NULL
      AND published_at IS NOT NULL
      AND reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND review_checklist_version IS NOT NULL
      AND review_checklist IS NOT NULL
      AND LENGTH(BTRIM(COALESCE(review_notes, ''))) BETWEEN 20 AND 4000
    )
    OR status <> 'published'
  ),
  CHECK (
    (status = 'withdrawn' AND withdrawn_at IS NOT NULL)
    OR status <> 'withdrawn'
  ),
  CHECK (
    (status = 'removed' AND removed_at IS NOT NULL)
    OR status <> 'removed'
  )
);

CREATE INDEX community_project_submissions_owner_created_idx
  ON public.community_project_submissions(author_id, created_at DESC);
CREATE INDEX community_project_submissions_review_queue_idx
  ON public.community_project_submissions(status, created_at)
  WHERE status IN ('queued', 'needs_repair');
CREATE INDEX community_project_submissions_prompt_idx
  ON public.community_project_submissions(prompt_id)
  WHERE prompt_id IS NOT NULL;

CREATE TABLE public.community_project_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.community_project_submissions(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('builder', 'admin', 'system')),
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'submitted',
      'repair_requested',
      'resubmitted',
      'published',
      'declined',
      'withdrawn',
      'removed',
      'artifact_purged',
      'reported',
      'report_reviewing',
      'report_resolved',
      'report_dismissed'
    )
  ),
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  details JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (
    jsonb_typeof(details) = 'object' AND octet_length(details::TEXT) <= 20000
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX community_project_events_submission_created_idx
  ON public.community_project_events(submission_id, created_at DESC);

CREATE TABLE public.community_project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.community_project_submissions(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES public.prompts(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_fingerprint TEXT NOT NULL CHECK (reporter_fingerprint ~ '^[0-9a-f]{64}$'),
  reporter_email TEXT NOT NULL CHECK (
    LENGTH(BTRIM(reporter_email)) BETWEEN 3 AND 254
    AND reporter_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  reason TEXT NOT NULL CHECK (
    reason IN ('privacy', 'copyright', 'malware', 'abuse', 'misleading', 'other')
  ),
  details TEXT NOT NULL CHECK (LENGTH(BTRIM(details)) BETWEEN 20 AND 4000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_notes TEXT CHECK (resolution_notes IS NULL OR LENGTH(resolution_notes) <= 4000),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX community_project_reports_open_idx
  ON public.community_project_reports(status, created_at)
  WHERE status IN ('open', 'reviewing');
CREATE INDEX community_project_reports_submission_idx
  ON public.community_project_reports(submission_id, created_at DESC);
CREATE INDEX community_project_reports_fingerprint_created_idx
  ON public.community_project_reports(reporter_fingerprint, created_at DESC);

CREATE TABLE public.community_project_operations (
  operation TEXT PRIMARY KEY CHECK (operation IN ('reconciliation', 'report_intake')),
  lease_id UUID,
  lease_expires_at TIMESTAMPTZ,
  last_started_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'never_run' CHECK (
    last_status IN ('never_run', 'running', 'succeeded', 'failed')
  ),
  last_error TEXT CHECK (last_error IS NULL OR LENGTH(last_error) <= 2000),
  last_metrics JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (
    jsonb_typeof(last_metrics) = 'object' AND octet_length(last_metrics::TEXT) <= 20000
  ),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (lease_id IS NULL AND lease_expires_at IS NULL)
    OR (lease_id IS NOT NULL AND lease_expires_at IS NOT NULL)
  )
);

INSERT INTO public.community_project_operations (operation)
VALUES ('reconciliation'), ('report_intake');

CREATE TABLE public.community_project_pilot_controls (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  allow_admin_submissions BOOLEAN NOT NULL DEFAULT TRUE,
  allow_internal_acceptance_submissions BOOLEAN NOT NULL DEFAULT TRUE,
  allow_invited_submissions BOOLEAN NOT NULL DEFAULT FALSE,
  allow_publication BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- External invitations and publication remain technically locked after
-- deployment. One expiring owner-operated acceptance account can exercise the
-- real non-admin flow without enabling the external invited cohort.
INSERT INTO public.community_project_pilot_controls (singleton)
VALUES (TRUE);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-project-quarantine',
  'community-project-quarantine',
  FALSE,
  2000000,
  ARRAY['text/plain']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION private.pathforge_actor_is_admin(actor UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = actor
      AND profiles.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.pathforge_actor_can_submit_community_project(actor UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_project_pilot_controls AS control
    WHERE control.singleton
      AND (
        (control.allow_admin_submissions AND private.pathforge_actor_is_admin(actor))
        OR (
          EXISTS (
            SELECT 1
            FROM public.community_project_pilot_members AS member
            WHERE member.user_id = actor
              AND member.active
              AND (
                (
                  member.member_kind = 'internal_acceptance'
                  AND control.allow_internal_acceptance_submissions
                  AND member.expires_at > NOW()
                )
                OR (
                  member.member_kind = 'invited_builder'
                  AND control.allow_invited_submissions
                )
              )
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.community_project_pilot_eligible()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.pathforge_actor_can_submit_community_project((SELECT auth.uid()));
$$;

CREATE OR REPLACE FUNCTION private.set_community_project_pilot_member(
  target_user UUID,
  administrator UUID,
  enabled BOOLEAN,
  requested_member_kind TEXT DEFAULT 'invited_builder',
  member_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_member_kind TEXT;
  resolved_member_kind TEXT;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    OR NOT private.pathforge_actor_is_admin(administrator) THEN
    RAISE EXCEPTION 'Admin service access required.';
  END IF;
  IF target_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = target_user
  ) THEN
    RAISE EXCEPTION 'The pilot member account does not exist.';
  END IF;
  IF member_note IS NOT NULL AND LENGTH(member_note) > 1000 THEN
    RAISE EXCEPTION 'Pilot member notes must be 1000 characters or fewer.';
  END IF;
  IF COALESCE(requested_member_kind, '') NOT IN ('internal_acceptance', 'invited_builder') THEN
    RAISE EXCEPTION 'Choose an internal acceptance account or an invited builder.';
  END IF;

  SELECT member.member_kind INTO existing_member_kind
  FROM public.community_project_pilot_members AS member
  WHERE member.user_id = target_user;
  resolved_member_kind := CASE
    WHEN NOT enabled AND existing_member_kind IS NOT NULL THEN existing_member_kind
    ELSE requested_member_kind
  END;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('community-project-pilot-member-cap', 0)
  );
  IF enabled
    AND resolved_member_kind = 'internal_acceptance'
    AND (
      SELECT COUNT(*)
      FROM public.community_project_pilot_members AS member
      WHERE member.active
        AND member.member_kind = 'internal_acceptance'
        AND member.expires_at > NOW()
        AND member.user_id <> target_user
    ) >= 1 THEN
    RAISE EXCEPTION 'Only one owner-operated internal acceptance account may be active.';
  END IF;
  IF enabled
    AND resolved_member_kind = 'invited_builder'
    AND (
      SELECT COUNT(*)
      FROM public.community_project_pilot_members AS member
      WHERE member.active
        AND member.member_kind = 'invited_builder'
        AND member.user_id <> target_user
    ) >= 30 THEN
    RAISE EXCEPTION 'The invitation-only pilot is capped at 30 active non-admin members.';
  END IF;

  INSERT INTO public.community_project_pilot_members (
    user_id, invited_by, member_kind, active, expires_at, note,
    revoked_at, created_at, updated_at
  ) VALUES (
    target_user,
    administrator,
    resolved_member_kind,
    enabled,
    CASE
      WHEN resolved_member_kind = 'internal_acceptance' AND enabled
        THEN NOW() + INTERVAL '7 days'
      WHEN resolved_member_kind = 'internal_acceptance' THEN NOW()
      ELSE NULL
    END,
    NULLIF(BTRIM(COALESCE(member_note, '')), ''),
    CASE WHEN enabled THEN NULL ELSE NOW() END,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET invited_by = administrator,
      member_kind = resolved_member_kind,
      active = enabled,
      expires_at = CASE
        WHEN resolved_member_kind = 'internal_acceptance' AND enabled
          THEN NOW() + INTERVAL '7 days'
        WHEN resolved_member_kind = 'internal_acceptance' THEN NOW()
        ELSE NULL
      END,
      note = NULLIF(BTRIM(COALESCE(member_note, '')), ''),
      revoked_at = CASE WHEN enabled THEN NULL ELSE NOW() END,
      updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION private.record_community_project_report_readiness(
  administrator UUID,
  proof_hash TEXT,
  correlation UUID
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
  IF proof_hash IS NULL OR proof_hash !~ '^[0-9a-f]{64}$' OR correlation IS NULL THEN
    RAISE EXCEPTION 'A valid report-intake readiness proof is required.';
  END IF;

  UPDATE public.community_project_operations
  SET last_started_at = NOW(),
      last_success_at = NOW(),
      last_status = 'succeeded',
      last_error = NULL,
      last_metrics = jsonb_build_object(
        'probe', 'report-rate-limit-hmac',
        'proof_prefix', LEFT(proof_hash, 12),
        'correlation_id', correlation
      ),
      updated_at = NOW()
  WHERE operation = 'report_intake';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The report-intake readiness operation is unavailable.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_community_project_publication_control(
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
  IF enabled AND NOT (
    EXISTS (
      SELECT 1
      FROM public.community_project_operations
      WHERE operation = 'reconciliation'
        AND last_status = 'succeeded'
        AND last_success_at > NOW() - INTERVAL '26 hours'
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations
      WHERE operation = 'report_intake'
        AND last_status = 'succeeded'
        AND last_success_at > NOW() - INTERVAL '26 hours'
    )
  ) THEN
    RAISE EXCEPTION 'Publication requires fresh successful reconciliation and report-intake readiness proofs.';
  END IF;

  UPDATE public.community_project_pilot_controls
  SET allow_publication = enabled,
      updated_by = administrator,
      updated_at = NOW()
  WHERE singleton;
END;
$$;

CREATE OR REPLACE FUNCTION private.pathforge_validate_community_build_steps(steps JSONB)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  step JSONB;
BEGIN
  IF jsonb_typeof(steps) IS DISTINCT FROM 'array'
    OR jsonb_array_length(steps) NOT BETWEEN 1 AND 5
    OR octet_length(steps::TEXT) > 250000 THEN
    RAISE EXCEPTION 'Build evidence must contain between one and five checkpoints.';
  END IF;

  FOR step IN SELECT value FROM jsonb_array_elements(steps)
  LOOP
    IF jsonb_typeof(step) IS DISTINCT FROM 'object'
      OR NOT (step ?& ARRAY['title', 'prompt', 'response'])
      OR step - ARRAY['title', 'prompt', 'response'] <> '{}'::JSONB
      OR jsonb_typeof(step->'title') IS DISTINCT FROM 'string'
      OR jsonb_typeof(step->'prompt') IS DISTINCT FROM 'string'
      OR jsonb_typeof(step->'response') IS DISTINCT FROM 'string'
      OR LENGTH(BTRIM(step->>'title')) NOT BETWEEN 1 AND 120
      OR LENGTH(BTRIM(step->>'prompt')) NOT BETWEEN 1 AND 30000
      OR LENGTH(BTRIM(step->>'response')) NOT BETWEEN 1 AND 50000 THEN
      RAISE EXCEPTION 'Each build checkpoint must contain a title, prompt, and response within pilot limits.';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.pathforge_validate_community_source_url(source_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF source_url IS NULL THEN
    RETURN;
  END IF;

  IF source_url !~* '^https://(chatgpt\.com/share/[A-Za-z0-9-]+|claude\.ai/share/[A-Za-z0-9-]+|g\.co/gemini/share/[A-Za-z0-9-]+|gemini\.google\.com/share/[A-Za-z0-9-]+)([/?#][^[:space:]]*)?$' THEN
    RAISE EXCEPTION 'Use a public ChatGPT, Claude, or Gemini share link. Private conversation URLs are not accepted.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.pathforge_resolve_community_fork(requested_fork JSONB)
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
    OR COALESCE(requested_fork->>'source_project_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR COALESCE(requested_fork->>'source_step_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR COALESCE(requested_fork->>'source_step_number', '') !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'Community project fork request is incomplete or invalid.';
  END IF;

  source_project := (requested_fork->>'source_project_id')::UUID;
  requested_step := (requested_fork->>'source_step_id')::UUID;
  requested_step_number := (requested_fork->>'source_step_number')::INT;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(source_project::TEXT || '|community-project-fork', 0)
  );
  SELECT
    project.title,
    COALESCE(NULLIF(BTRIM(project.prompt_family_id), ''), project.id::TEXT),
    project.fork_depth,
    project.fork_source_project_id IS NOT NULL
  INTO source_title, source_family, source_depth, source_is_fork
  FROM public.prompts AS project
  JOIN public.community_project_submissions AS source_submission
    ON source_submission.prompt_id = project.id
  WHERE project.id = source_project
    AND project.status = 'approved'
    AND source_submission.status = 'published'
    AND source_submission.reuse_permission = 'allow_pathforge_remix';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The pilot accepts forks only from a published community project whose builder enabled PathForge remixing.';
  END IF;
  IF source_depth >= 9 THEN
    RAISE EXCEPTION 'This project has reached the maximum fork depth.';
  END IF;

  SELECT step.step_number
  INTO authoritative_step_number
  FROM public.prompt_steps AS step
  WHERE step.id = requested_step
    AND step.prompt_id = source_project
    AND step.step_number = requested_step_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested fork checkpoint does not belong to that public project.';
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
    'parent_submission_id', CASE WHEN source_is_fork THEN source_project::TEXT ELSE '' END,
    'prompt_family_id', source_family,
    'depth', source_depth + 1,
    'branch_index', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.pathforge_validate_community_submission_payload(payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  expected_keys TEXT[] := ARRAY[
    'title',
    'summary',
    'category_slug',
    'difficulty',
    'provider',
    'model',
    'model_settings',
    'evidence_scope',
    'source_url',
    'source_visibility',
    'build_steps',
    'artifact_path',
    'artifact_original_name',
    'artifact_sha256',
    'artifact_size_bytes',
    'artifact_scan',
    'submitter_role',
    'reuse_permission',
    'terms_version',
    'privacy_version',
    'builder_attested_at',
    'profile_attribution_attested_at',
    'rights_attested_at',
    'privacy_attested_at',
    'publication_consent_at',
    'fork'
  ];
  scan JSONB;
  fork JSONB;
BEGIN
  IF jsonb_typeof(payload) IS DISTINCT FROM 'object'
    OR NOT (payload ?& expected_keys)
    OR payload - expected_keys <> '{}'::JSONB THEN
    RAISE EXCEPTION 'Community project payload contains missing or unsupported fields.';
  END IF;

  IF LENGTH(BTRIM(payload->>'title')) NOT BETWEEN 3 AND 120
    OR LENGTH(BTRIM(payload->>'summary')) NOT BETWEEN 20 AND 2000
    OR LENGTH(BTRIM(payload->>'category_slug')) NOT BETWEEN 2 AND 80
    OR payload->>'difficulty' NOT IN ('beginner', 'intermediate', 'advanced')
    OR LENGTH(BTRIM(payload->>'provider')) NOT BETWEEN 2 AND 80
    OR LENGTH(BTRIM(payload->>'model')) NOT BETWEEN 2 AND 160
    OR LENGTH(COALESCE(payload->>'model_settings', '')) > 1000
    OR payload->>'evidence_scope' NOT IN ('full_run', 'selected_excerpts', 'reconstructed_notes')
    OR payload->>'source_visibility' NOT IN ('review_only', 'public')
    OR payload->>'submitter_role' <> 'builder'
    OR payload->>'reuse_permission' NOT IN ('view_only', 'allow_pathforge_remix')
    OR LENGTH(BTRIM(payload->>'terms_version')) NOT BETWEEN 1 AND 80
    OR LENGTH(BTRIM(payload->>'privacy_version')) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Community project payload contains invalid metadata.';
  END IF;

  IF NULLIF(BTRIM(COALESCE(payload->>'source_url', '')), '') IS NULL
    AND payload->>'source_visibility' <> 'review_only' THEN
    RAISE EXCEPTION 'A source link cannot be public when no source link was supplied.';
  END IF;

  PERFORM private.pathforge_validate_community_source_url(
    NULLIF(BTRIM(COALESCE(payload->>'source_url', '')), '')
  );
  PERFORM private.pathforge_validate_community_build_steps(payload->'build_steps');

  IF COALESCE(payload->>'artifact_path', '') !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.html\.txt$'
    OR LENGTH(payload->>'artifact_original_name') NOT BETWEEN 1 AND 180
    OR COALESCE(payload->>'artifact_sha256', '') !~ '^[0-9a-f]{64}$'
    OR (payload->>'artifact_size_bytes')::INT NOT BETWEEN 1 AND 2000000 THEN
    RAISE EXCEPTION 'Community project artifact metadata is invalid.';
  END IF;

  scan := payload->'artifact_scan';
  IF jsonb_typeof(scan) IS DISTINCT FROM 'object'
    OR scan->>'passed' <> 'true'
    OR scan->>'sha256' IS DISTINCT FROM payload->>'artifact_sha256'
    OR (scan->>'byte_length')::INT IS DISTINCT FROM (payload->>'artifact_size_bytes')::INT
    OR jsonb_typeof(scan->'findings') IS DISTINCT FROM 'array'
    OR jsonb_array_length(scan->'findings') <> 0
    OR LENGTH(BTRIM(scan->>'scanner_version')) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Community project artifact did not pass the required scanner.';
  END IF;

  PERFORM (payload->>'rights_attested_at')::TIMESTAMPTZ;
  PERFORM (payload->>'privacy_attested_at')::TIMESTAMPTZ;
  PERFORM (payload->>'publication_consent_at')::TIMESTAMPTZ;
  PERFORM (payload->>'builder_attested_at')::TIMESTAMPTZ;
  PERFORM (payload->>'profile_attribution_attested_at')::TIMESTAMPTZ;

  fork := payload->'fork';
  IF fork <> 'null'::JSONB THEN
    IF jsonb_typeof(fork) IS DISTINCT FROM 'object'
      OR NOT (fork ?& ARRAY[
        'source_project_id',
        'source_step_id',
        'source_step_number'
      ])
      OR fork - ARRAY[
        'source_project_id',
        'source_step_id',
        'source_step_number'
      ] <> '{}'::JSONB
      OR COALESCE(fork->>'source_project_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      OR COALESCE(fork->>'source_step_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      OR COALESCE(fork->>'source_step_number', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Community project fork metadata is invalid.';
    END IF;
  END IF;
END;
$$;

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
  ) >= 50 THEN
    RAISE EXCEPTION 'The invitation-only pilot has reached its 50-submission cap.';
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

CREATE OR REPLACE FUNCTION private.request_community_project_repair(
  target_submission UUID,
  reviewer UUID,
  builder_note TEXT,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    OR NOT private.pathforge_actor_is_admin(reviewer) THEN
    RAISE EXCEPTION 'Admin service access required.';
  END IF;
  IF LENGTH(BTRIM(builder_note)) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'Repair guidance must be between 10 and 2000 characters.';
  END IF;

  UPDATE public.community_project_submissions
  SET status = 'needs_repair',
      reviewed_by = reviewer,
      user_status_note = BTRIM(builder_note),
      updated_at = NOW()
  WHERE id = target_submission
    AND status = 'queued';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a queued community project can be sent for repair.';
  END IF;

  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    target_submission, reviewer, 'admin', 'repair_requested', correlation,
    jsonb_build_object('builder_note', BTRIM(builder_note))
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.replace_community_project_submission(
  target_submission UUID,
  actor UUID,
  payload JSONB,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  prior public.community_project_submissions%ROWTYPE;
  fork JSONB := payload->'fork';
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  PERFORM private.pathforge_validate_community_submission_payload(payload);

  SELECT * INTO prior
  FROM public.community_project_submissions
  WHERE id = target_submission
  FOR UPDATE;
  IF NOT FOUND OR prior.author_id <> actor OR prior.status <> 'needs_repair' THEN
    RAISE EXCEPTION 'That community project is not available for repair.';
  END IF;
  fork := private.pathforge_resolve_community_fork(fork);
  IF (prior.fork_source_project_id IS NULL) IS DISTINCT FROM (fork = 'null'::JSONB)
    OR (
      fork <> 'null'::JSONB
      AND (
        prior.fork_source_project_id IS DISTINCT FROM fork->>'source_project_id'
        OR prior.fork_source_step_id IS DISTINCT FROM fork->>'source_step_id'
        OR prior.fork_source_step_number IS DISTINCT FROM (fork->>'source_step_number')::INT
      )
    ) THEN
    RAISE EXCEPTION 'A replacement bundle must preserve its database-verified fork source.';
  END IF;
  IF split_part(payload->>'artifact_path', '/', 1) <> actor::TEXT
    OR NOT EXISTS (
      SELECT 1 FROM storage.objects
      WHERE objects.bucket_id = 'community-project-quarantine'
        AND objects.name = payload->>'artifact_path'
    ) THEN
    RAISE EXCEPTION 'The replacement artifact is not present in private quarantine.';
  END IF;

  UPDATE public.community_project_submissions
  SET title = BTRIM(payload->>'title'),
      summary = BTRIM(payload->>'summary'),
      category_slug = BTRIM(payload->>'category_slug'),
      difficulty = payload->>'difficulty',
      provider = BTRIM(payload->>'provider'),
      model = BTRIM(payload->>'model'),
      model_settings = NULLIF(BTRIM(COALESCE(payload->>'model_settings', '')), ''),
      evidence_scope = payload->>'evidence_scope',
      source_url = NULLIF(BTRIM(COALESCE(payload->>'source_url', '')), ''),
      source_visibility = payload->>'source_visibility',
      source_access_status = 'not_checked',
      source_checked_at = NULL,
      source_checked_by = NULL,
      build_steps = payload->'build_steps',
      artifact_path = payload->>'artifact_path',
      artifact_original_name = payload->>'artifact_original_name',
      artifact_sha256 = payload->>'artifact_sha256',
      artifact_size_bytes = (payload->>'artifact_size_bytes')::INT,
      artifact_scan = payload->'artifact_scan',
      artifact_integrity_status = 'pending',
      artifact_integrity_checked_at = NULL,
      submitter_role = payload->>'submitter_role',
      reuse_permission = payload->>'reuse_permission',
      terms_version = payload->>'terms_version',
      privacy_version = payload->>'privacy_version',
      builder_attested_at = (payload->>'builder_attested_at')::TIMESTAMPTZ,
      profile_attribution_attested_at = (payload->>'profile_attribution_attested_at')::TIMESTAMPTZ,
      rights_attested_at = (payload->>'rights_attested_at')::TIMESTAMPTZ,
      privacy_attested_at = (payload->>'privacy_attested_at')::TIMESTAMPTZ,
      publication_consent_at = (payload->>'publication_consent_at')::TIMESTAMPTZ,
      status = 'queued',
      reviewed_by = NULL,
      review_notes = NULL,
      user_status_note = NULL,
      submission_version = submission_version + 1,
      fork_source_project_id = CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_project_id'), '') END,
      fork_source_project_title = CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_project_title'), '') END,
      fork_source_model_variant_id = CASE WHEN fork = 'null'::JSONB OR NULLIF(fork->>'source_model_variant_id', '') IS NULL THEN NULL ELSE (fork->>'source_model_variant_id')::UUID END,
      fork_source_run_id = CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_run_id'), '') END,
      fork_source_step_id = CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_step_id'), '') END,
      fork_source_step_number = CASE WHEN fork = 'null'::JSONB OR NULLIF(fork->>'source_step_number', '') IS NULL THEN NULL ELSE (fork->>'source_step_number')::INT END,
      fork_source_artifact_path = CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_artifact_path'), '') END,
      fork_source_artifact_sha256 = CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'source_artifact_sha256'), '') END,
      fork_parent_submission_id = CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'parent_submission_id'), '') END,
      prompt_family_id = CASE WHEN fork = 'null'::JSONB THEN NULL ELSE NULLIF(BTRIM(fork->>'prompt_family_id'), '') END,
      fork_depth = CASE WHEN fork = 'null'::JSONB THEN 0 ELSE (fork->>'depth')::INT END,
      fork_branch_index = CASE WHEN fork = 'null'::JSONB THEN 0 ELSE (fork->>'branch_index')::INT END,
      updated_at = NOW()
  WHERE id = target_submission;

  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    target_submission, actor, 'builder', 'resubmitted', correlation,
    jsonb_build_object(
      'submission_version', prior.submission_version + 1,
      'artifact_sha256', payload->>'artifact_sha256'
    )
  );

  RETURN prior.artifact_path;
END;
$$;

CREATE OR REPLACE FUNCTION private.publish_community_project_submission(
  target_submission UUID,
  reviewer UUID,
  source_access_confirmed BOOLEAN DEFAULT FALSE,
  review_checks JSONB DEFAULT NULL,
  reviewer_notes TEXT DEFAULT NULL,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submission public.community_project_submissions%ROWTYPE;
  published_prompt UUID;
  category_id UUID;
  step JSONB;
  step_index INT := 0;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    OR NOT private.pathforge_actor_is_admin(reviewer) THEN
    RAISE EXCEPTION 'Admin service access required.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_pilot_controls AS control
    WHERE control.singleton
      AND control.allow_publication
      AND EXISTS (
        SELECT 1
        FROM public.community_project_operations
        WHERE operation = 'reconciliation'
          AND last_status = 'succeeded'
          AND last_success_at > NOW() - INTERVAL '26 hours'
      )
      AND EXISTS (
        SELECT 1
        FROM public.community_project_operations
        WHERE operation = 'report_intake'
          AND last_status = 'succeeded'
          AND last_success_at > NOW() - INTERVAL '26 hours'
      )
  ) THEN
    RAISE EXCEPTION 'Community project publication is paused until fresh reconciliation and report-intake proofs pass.';
  END IF;
  IF jsonb_typeof(review_checks) IS DISTINCT FROM 'object'
    OR NOT (review_checks ?& ARRAY[
      'artifact_reviewed',
      'evidence_reviewed',
      'privacy_rights_reviewed',
      'public_truth_reviewed',
      'moderation_reviewed'
    ])
    OR review_checks - ARRAY[
      'artifact_reviewed',
      'evidence_reviewed',
      'privacy_rights_reviewed',
      'public_truth_reviewed',
      'moderation_reviewed'
    ] <> '{}'::JSONB
    OR review_checks->'artifact_reviewed' IS DISTINCT FROM 'true'::JSONB
    OR review_checks->'evidence_reviewed' IS DISTINCT FROM 'true'::JSONB
    OR review_checks->'privacy_rights_reviewed' IS DISTINCT FROM 'true'::JSONB
    OR review_checks->'public_truth_reviewed' IS DISTINCT FROM 'true'::JSONB
    OR review_checks->'moderation_reviewed' IS DISTINCT FROM 'true'::JSONB THEN
    RAISE EXCEPTION 'Complete every required human review check before publication.';
  END IF;
  IF LENGTH(BTRIM(COALESCE(reviewer_notes, ''))) NOT BETWEEN 20 AND 4000 THEN
    RAISE EXCEPTION 'Record review notes between 20 and 4000 characters before publication.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_submission::TEXT || '|community-project-publication', 0)
  );
  SELECT * INTO submission
  FROM public.community_project_submissions
  WHERE id = target_submission
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community project submission does not exist.';
  END IF;
  IF submission.status = 'published' THEN
    RETURN submission.prompt_id;
  END IF;
  IF submission.status <> 'queued'
    OR submission.prompt_id IS NOT NULL
    OR submission.artifact_path IS NULL
    OR submission.artifact_scan->>'passed' <> 'true' THEN
    RAISE EXCEPTION 'Only a complete queued community project can be published.';
  END IF;
  IF submission.source_visibility = 'public'
    AND (submission.source_url IS NULL OR NOT source_access_confirmed) THEN
    RAISE EXCEPTION 'Public source links require a fresh anonymous access check.';
  END IF;
  IF submission.fork_source_project_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.prompts AS source_project
      JOIN public.community_project_submissions AS source_submission
        ON source_submission.prompt_id = source_project.id
      JOIN public.prompt_steps AS source_step
        ON source_step.prompt_id = source_project.id
       AND source_step.id::TEXT = submission.fork_source_step_id
       AND source_step.step_number = submission.fork_source_step_number
      WHERE source_project.id::TEXT = BTRIM(submission.fork_source_project_id)
        AND source_project.status = 'approved'
        AND source_submission.status = 'published'
        AND source_submission.reuse_permission = 'allow_pathforge_remix'
    ) THEN
    RAISE EXCEPTION 'The selected fork source is no longer a remix-enabled public community project.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE objects.bucket_id = 'community-project-quarantine'
      AND objects.name = submission.artifact_path
  ) THEN
    RAISE EXCEPTION 'The reviewed artifact is missing from private quarantine.';
  END IF;

  SELECT categories.id INTO category_id
  FROM public.categories
  WHERE categories.slug = submission.category_slug;
  IF category_id IS NULL THEN
    RAISE EXCEPTION 'The selected category no longer exists.';
  END IF;

  published_prompt := gen_random_uuid();
  INSERT INTO public.prompts (
    id,
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
    vote_count,
    bookmark_count,
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
    created_at,
    updated_at
  ) VALUES (
    published_prompt,
    submission.title,
    submission.summary,
    submission.summary,
    'Interactive HTML artifact included.',
    category_id,
    submission.difficulty,
    submission.model,
    submission.model,
    ARRAY[submission.provider, 'HTML', 'Browser']::TEXT[],
    ARRAY['community-project', 'evidence-' || submission.evidence_scope]::TEXT[],
    'approved',
    submission.author_id,
    0,
    0,
    submission.fork_source_project_id,
    submission.fork_source_project_title,
    submission.fork_source_model_variant_id,
    submission.fork_source_run_id,
    submission.fork_source_step_id,
    submission.fork_source_step_number,
    submission.fork_source_artifact_path,
    submission.fork_source_artifact_sha256,
    submission.fork_parent_submission_id,
    submission.prompt_family_id,
    submission.fork_depth,
    submission.fork_branch_index,
    NOW(),
    NOW()
  );

  FOR step IN SELECT value FROM jsonb_array_elements(submission.build_steps)
  LOOP
    step_index := step_index + 1;
    INSERT INTO public.prompt_steps (
      prompt_id, step_number, title, content, result_content, description
    ) VALUES (
      published_prompt,
      step_index,
      step->>'title',
      step->>'prompt',
      step->>'response',
      CASE submission.evidence_scope
        WHEN 'full_run' THEN 'Contributor states this checkpoint is part of the complete run.'
        WHEN 'selected_excerpts' THEN 'Contributor selected this checkpoint from a larger run.'
        ELSE 'Contributor reconstructed this checkpoint from memory or notes.'
      END
    );
  END LOOP;

  UPDATE public.community_project_submissions
  SET status = 'published',
      prompt_id = published_prompt,
      reviewed_by = reviewer,
      review_checklist_version = '2026-07-22-pilot-review-v1',
      review_checklist = review_checks,
      reviewed_at = NOW(),
      review_notes = BTRIM(reviewer_notes),
      artifact_integrity_status = 'verified',
      artifact_integrity_checked_at = NOW(),
      source_access_status = CASE
        WHEN source_visibility = 'public' THEN 'public_verified'
        ELSE 'not_checked'
      END,
      source_checked_at = CASE
        WHEN source_visibility = 'public' THEN NOW()
        ELSE NULL
      END,
      source_checked_by = CASE
        WHEN source_visibility = 'public' THEN reviewer
        ELSE NULL
      END,
      prompt_family_id = (
        SELECT published.prompt_family_id
        FROM public.prompts AS published
        WHERE published.id = published_prompt
      ),
      fork_depth = (
        SELECT published.fork_depth
        FROM public.prompts AS published
        WHERE published.id = published_prompt
      ),
      fork_branch_index = (
        SELECT published.fork_branch_index
        FROM public.prompts AS published
        WHERE published.id = published_prompt
      ),
      published_at = NOW(),
      user_status_note = 'Published through the invitation-only community project pilot.',
      updated_at = NOW()
  WHERE id = target_submission;

  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    target_submission, reviewer, 'admin', 'published', correlation,
    jsonb_build_object(
      'prompt_id', published_prompt,
      'source_access_confirmed', source_access_confirmed,
      'review_checklist_version', '2026-07-22-pilot-review-v1',
      'artifact_sha256', submission.artifact_sha256
    )
  );

  RETURN published_prompt;
END;
$$;

CREATE OR REPLACE FUNCTION private.decline_community_project_submission(
  target_submission UUID,
  reviewer UUID,
  builder_note TEXT,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    OR NOT private.pathforge_actor_is_admin(reviewer) THEN
    RAISE EXCEPTION 'Admin service access required.';
  END IF;
  IF LENGTH(BTRIM(builder_note)) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'Decline guidance must be between 10 and 2000 characters.';
  END IF;
  UPDATE public.community_project_submissions
  SET status = 'declined',
      reviewed_by = reviewer,
      user_status_note = BTRIM(builder_note),
      updated_at = NOW()
  WHERE id = target_submission
    AND status IN ('queued', 'needs_repair');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That community project cannot be declined from its current state.';
  END IF;
  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    target_submission, reviewer, 'admin', 'declined', correlation,
    jsonb_build_object('builder_note', BTRIM(builder_note))
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.withdraw_community_project_submission(
  target_submission UUID,
  actor UUID,
  removal_kind TEXT DEFAULT 'withdrawn',
  reason TEXT DEFAULT NULL,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submission public.community_project_submissions%ROWTYPE;
  actor_is_admin BOOLEAN;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF removal_kind NOT IN ('withdrawn', 'removed') THEN
    RAISE EXCEPTION 'Unsupported removal kind.';
  END IF;
  actor_is_admin := private.pathforge_actor_is_admin(actor);

  SELECT * INTO submission
  FROM public.community_project_submissions
  WHERE id = target_submission
  FOR UPDATE;
  IF NOT FOUND
    OR (submission.author_id <> actor AND NOT actor_is_admin)
    OR submission.status IN ('withdrawn', 'removed') THEN
    RAISE EXCEPTION 'That community project is unavailable for removal.';
  END IF;
  IF removal_kind = 'removed' AND NOT actor_is_admin THEN
    RAISE EXCEPTION 'Administrator access is required for removal.';
  END IF;

  UPDATE public.community_project_submissions
  SET status = removal_kind,
      former_prompt_id = submission.prompt_id,
      prompt_id = NULL,
      title = CASE WHEN removal_kind = 'withdrawn' THEN 'Withdrawn project' ELSE 'Removed project' END,
      summary = CASE
        WHEN removal_kind = 'withdrawn' THEN 'This project was withdrawn by its contributor.'
        ELSE 'This project was removed during moderation.'
      END,
      model_settings = NULL,
      source_url = NULL,
      source_visibility = 'review_only',
      source_access_status = 'not_checked',
      source_checked_at = NULL,
      source_checked_by = NULL,
      build_steps = '[{"title":"Removed","prompt":"Removed from PathForge.","response":"Removed from PathForge."}]'::JSONB,
      review_notes = NULL,
      user_status_note = CASE
        WHEN removal_kind = 'withdrawn' THEN 'Withdrawn and no longer public.'
        ELSE COALESCE(NULLIF(BTRIM(reason), ''), 'Removed during moderation.')
      END,
      withdrawn_at = CASE WHEN removal_kind = 'withdrawn' THEN NOW() ELSE withdrawn_at END,
      removed_at = CASE WHEN removal_kind = 'removed' THEN NOW() ELSE removed_at END,
      updated_at = NOW()
  WHERE id = target_submission;

  -- Revoke every public read authority without deleting a prompt that may
  -- already have model-variant, bookmark, or fork dependents. A rejected
  -- tombstone preserves those foreign keys while every public query fails
  -- closed on approved status.
  IF submission.prompt_id IS NOT NULL THEN
    UPDATE public.prompts
    SET status = 'rejected',
        title = CASE WHEN removal_kind = 'withdrawn' THEN 'Withdrawn project' ELSE 'Removed project' END,
        description = CASE
          WHEN removal_kind = 'withdrawn' THEN 'This project was withdrawn by its contributor.'
          ELSE 'This project was removed during moderation.'
        END,
        content = 'No public project content remains.',
        result_content = NULL,
        updated_at = NOW()
    WHERE prompts.id = submission.prompt_id;
  END IF;

  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    target_submission,
    actor,
    CASE WHEN actor_is_admin THEN 'admin' ELSE 'builder' END,
    removal_kind,
    correlation,
    jsonb_build_object(
      'former_prompt_id', submission.prompt_id,
      'reason', NULLIF(BTRIM(COALESCE(reason, '')), '')
    )
  );

  RETURN submission.artifact_path;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.get_public_community_project(target_prompt UUID)
RETURNS TABLE (
  submission_id UUID,
  prompt_id UUID,
  evidence_scope TEXT,
  provider TEXT,
  model TEXT,
  model_settings TEXT,
  source_url TEXT,
  source_checked_at TIMESTAMPTZ,
  artifact_sha256 TEXT,
  artifact_size_bytes INT,
  submitter_role TEXT,
  reuse_permission TEXT,
  submission_version INT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    submission.id,
    submission.prompt_id,
    submission.evidence_scope,
    submission.provider,
    submission.model,
    submission.model_settings,
    CASE
      WHEN submission.source_visibility = 'public'
        AND submission.source_access_status = 'public_verified'
      THEN submission.source_url
      ELSE NULL
    END,
    CASE
      WHEN submission.source_visibility = 'public'
        AND submission.source_access_status = 'public_verified'
      THEN submission.source_checked_at
      ELSE NULL
    END,
    submission.artifact_sha256,
    submission.artifact_size_bytes,
    submission.submitter_role,
    submission.reuse_permission,
    submission.submission_version,
    submission.published_at
  FROM public.community_project_submissions AS submission
  JOIN public.prompts AS project ON project.id = submission.prompt_id
  WHERE submission.prompt_id = target_prompt
    AND submission.status = 'published'
    AND project.status = 'approved';
$$;

-- Discovery and public profiles resolve the same publication capsule in one
-- bounded read. A tag or artifact-looking URL alone never promotes a project
-- to reviewed community status.
CREATE OR REPLACE FUNCTION public.get_public_community_projects(target_prompts UUID[])
RETURNS TABLE (
  submission_id UUID,
  prompt_id UUID,
  evidence_scope TEXT,
  provider TEXT,
  model TEXT,
  model_settings TEXT,
  source_url TEXT,
  source_checked_at TIMESTAMPTZ,
  artifact_sha256 TEXT,
  artifact_size_bytes INT,
  submitter_role TEXT,
  reuse_permission TEXT,
  submission_version INT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    submission.id,
    submission.prompt_id,
    submission.evidence_scope,
    submission.provider,
    submission.model,
    submission.model_settings,
    CASE
      WHEN submission.source_visibility = 'public'
        AND submission.source_access_status = 'public_verified'
      THEN submission.source_url
      ELSE NULL
    END,
    CASE
      WHEN submission.source_visibility = 'public'
        AND submission.source_access_status = 'public_verified'
      THEN submission.source_checked_at
      ELSE NULL
    END,
    submission.artifact_sha256,
    submission.artifact_size_bytes,
    submission.submitter_role,
    submission.reuse_permission,
    submission.submission_version,
    submission.published_at
  FROM public.community_project_submissions AS submission
  JOIN public.prompts AS project ON project.id = submission.prompt_id
  WHERE cardinality(COALESCE(target_prompts, '{}'::UUID[])) BETWEEN 1 AND 300
    AND submission.prompt_id = ANY(target_prompts)
    AND submission.status = 'published'
    AND project.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.get_public_community_project_artifact_path(target_prompt UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT submission.artifact_path
  FROM public.community_project_submissions AS submission
  JOIN public.prompts AS project ON project.id = submission.prompt_id
  WHERE submission.prompt_id = target_prompt
    AND submission.status = 'published'
    AND project.status = 'approved'
    AND submission.artifact_path IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION private.create_community_project_report(
  target_prompt UUID,
  reporter UUID,
  reporter_email_value TEXT,
  report_reason TEXT,
  report_details TEXT,
  request_fingerprint TEXT,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submission UUID;
  report_id UUID := gen_random_uuid();
  normalized_email TEXT := LOWER(BTRIM(reporter_email_value));
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  SELECT project.id INTO submission
  FROM public.community_project_submissions AS project
  JOIN public.prompts AS prompt ON prompt.id = project.prompt_id
  WHERE project.prompt_id = target_prompt
    AND project.status = 'published'
    AND prompt.status = 'approved';
  IF submission IS NULL THEN
    RAISE EXCEPTION 'That public community project is unavailable.';
  END IF;
  IF normalized_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR LENGTH(normalized_email) > 254
    OR report_reason NOT IN ('privacy', 'copyright', 'malware', 'abuse', 'misleading', 'other')
    OR LENGTH(BTRIM(report_details)) NOT BETWEEN 20 AND 4000
    OR COALESCE(request_fingerprint, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Complete every report field within the stated limits.';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('community-project-report-global', 0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(submission::TEXT || '|community-project-report', 0)
  );
  IF (
    SELECT COUNT(*)
    FROM public.community_project_reports
    WHERE community_project_reports.reporter_fingerprint = request_fingerprint
      AND community_project_reports.created_at > NOW() - INTERVAL '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'Report limit reached. An administrator already has the recent reports.';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.community_project_reports
    WHERE community_project_reports.submission_id = submission
      AND LOWER(community_project_reports.reporter_email) = normalized_email
      AND community_project_reports.created_at > NOW() - INTERVAL '24 hours'
  ) >= 3 THEN
    RAISE EXCEPTION 'Report limit reached. An administrator already has the recent reports.';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.community_project_reports
    WHERE community_project_reports.submission_id = submission
      AND community_project_reports.created_at > NOW() - INTERVAL '24 hours'
  ) >= 25 OR (
    SELECT COUNT(*)
    FROM public.community_project_reports
    WHERE community_project_reports.created_at > NOW() - INTERVAL '24 hours'
  ) >= 250 THEN
    RAISE EXCEPTION 'Report intake is temporarily at capacity. Contact PathForge directly for an urgent safety issue.';
  END IF;

  INSERT INTO public.community_project_reports (
    id, submission_id, prompt_id, reporter_id, reporter_fingerprint,
    reporter_email, reason, details
  ) VALUES (
    report_id, submission, target_prompt, reporter, request_fingerprint,
    normalized_email, report_reason, BTRIM(report_details)
  );
  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    submission,
    NULL,
    'system',
    'reported',
    correlation,
    jsonb_build_object('report_id', report_id, 'reason', report_reason)
  );
  RETURN report_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_community_project_report_status(
  target_report UUID,
  reviewer UUID,
  next_status TEXT,
  notes TEXT DEFAULT NULL,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  report public.community_project_reports%ROWTYPE;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    OR NOT private.pathforge_actor_is_admin(reviewer) THEN
    RAISE EXCEPTION 'Admin service access required.';
  END IF;
  IF next_status NOT IN ('reviewing', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Unsupported report state.';
  END IF;
  IF next_status IN ('resolved', 'dismissed')
    AND LENGTH(BTRIM(COALESCE(notes, ''))) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'A final report decision needs notes between 10 and 4000 characters.';
  END IF;
  IF notes IS NOT NULL AND LENGTH(notes) > 4000 THEN
    RAISE EXCEPTION 'Report notes must be 4000 characters or fewer.';
  END IF;

  SELECT * INTO report
  FROM public.community_project_reports
  WHERE id = target_report
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That community project report does not exist.';
  END IF;

  UPDATE public.community_project_reports
  SET status = next_status,
      resolution_notes = NULLIF(BTRIM(COALESCE(notes, '')), ''),
      resolved_by = CASE WHEN next_status IN ('resolved', 'dismissed') THEN reviewer ELSE NULL END,
      resolved_at = CASE WHEN next_status IN ('resolved', 'dismissed') THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE id = target_report;

  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    report.submission_id,
    reviewer,
    'admin',
    'report_' || next_status,
    correlation,
    jsonb_build_object(
      'report_id', target_report,
      'notes_recorded', NULLIF(BTRIM(COALESCE(notes, '')), '') IS NOT NULL
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.community_project_publication_drift()
RETURNS TABLE (
  submission_id UUID,
  prompt_id UUID,
  status TEXT,
  issue TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    submission.id,
    submission.prompt_id,
    submission.status,
    CASE
      WHEN submission.status = 'published' AND submission.prompt_id IS NULL
        THEN 'published_without_prompt'
      WHEN submission.status = 'published' AND project.id IS NULL
        THEN 'published_prompt_missing'
      WHEN submission.status = 'published' AND project.status <> 'approved'
        THEN 'published_prompt_not_approved'
      WHEN submission.status = 'published' AND object.id IS NULL
        THEN 'published_artifact_missing'
      WHEN submission.status <> 'published' AND project.status = 'approved'
        THEN 'unpublished_submission_has_approved_prompt'
      ELSE NULL
    END
  FROM public.community_project_submissions AS submission
  LEFT JOIN public.prompts AS project ON project.id = submission.prompt_id
  LEFT JOIN storage.objects AS object
    ON object.bucket_id = 'community-project-quarantine'
    AND object.name = submission.artifact_path
  WHERE (
    submission.status = 'published'
    AND (
      submission.prompt_id IS NULL
      OR project.id IS NULL
      OR project.status <> 'approved'
      OR object.id IS NULL
    )
  ) OR (
    submission.status <> 'published'
    AND project.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION private.community_project_cleanup_candidates()
RETURNS TABLE (
  submission_id UUID,
  artifact_path TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT submission.id, submission.artifact_path
  FROM public.community_project_submissions AS submission
  WHERE submission.status IN ('withdrawn', 'removed')
    AND submission.artifact_path IS NOT NULL
  ORDER BY submission.updated_at
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION private.community_project_storage_orphans()
RETURNS TABLE (
  artifact_path TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT object.name, object.created_at
  FROM storage.objects AS object
  LEFT JOIN public.community_project_submissions AS submission
    ON submission.artifact_path = object.name
  WHERE object.bucket_id = 'community-project-quarantine'
    AND submission.id IS NULL
  ORDER BY object.created_at
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION private.finalize_community_project_artifact_cleanup(
  target_submission UUID,
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
    AND artifact_path IS NOT NULL;
  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1
      FROM public.community_project_submissions
      WHERE id = target_submission
        AND status IN ('withdrawn', 'removed')
        AND artifact_path IS NULL
    ) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'No removed project artifact is awaiting cleanup.';
  END IF;

  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    target_submission, NULL, 'system', 'artifact_purged', correlation,
    jsonb_build_object('reconciled', TRUE)
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.begin_community_project_reconciliation(
  run_id UUID,
  lease_seconds INT DEFAULT 55
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF run_id IS NULL OR lease_seconds NOT BETWEEN 15 AND 300 THEN
    RAISE EXCEPTION 'Invalid reconciliation lease.';
  END IF;

  UPDATE public.community_project_operations
  SET lease_id = run_id,
      lease_expires_at = NOW() + make_interval(secs => lease_seconds),
      last_started_at = NOW(),
      last_status = 'running',
      last_error = NULL,
      updated_at = NOW()
  WHERE operation = 'reconciliation'
    AND (lease_id IS NULL OR lease_expires_at < NOW());
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION private.finish_community_project_reconciliation(
  run_id UUID,
  succeeded BOOLEAN,
  error_summary TEXT DEFAULT NULL,
  metrics JSONB DEFAULT '{}'::JSONB
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
  IF jsonb_typeof(metrics) IS DISTINCT FROM 'object'
    OR octet_length(metrics::TEXT) > 20000
    OR LENGTH(COALESCE(error_summary, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid reconciliation result.';
  END IF;

  UPDATE public.community_project_operations
  SET lease_id = NULL,
      lease_expires_at = NULL,
      last_success_at = CASE WHEN succeeded THEN NOW() ELSE last_success_at END,
      last_status = CASE WHEN succeeded THEN 'succeeded' ELSE 'failed' END,
      last_error = CASE WHEN succeeded THEN NULL ELSE NULLIF(BTRIM(COALESCE(error_summary, '')), '') END,
      last_metrics = metrics,
      updated_at = NOW()
  WHERE operation = 'reconciliation'
    AND lease_id = run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reconciliation lease is missing or expired.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.record_community_project_artifact_integrity(
  target_submission UUID,
  actual_sha256 TEXT,
  actual_size_bytes INT,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS TEXT
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
  IF COALESCE(actual_sha256, '') !~ '^[0-9a-f]{64}$'
    OR actual_size_bytes NOT BETWEEN 0 AND 2000000 THEN
    RAISE EXCEPTION 'Invalid integrity result.';
  END IF;

  SELECT * INTO submission
  FROM public.community_project_submissions
  WHERE id = target_submission
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community project submission does not exist.';
  END IF;
  IF submission.status <> 'published' THEN
    RETURN 'skipped';
  END IF;

  IF submission.artifact_sha256 = actual_sha256
    AND submission.artifact_size_bytes = actual_size_bytes THEN
    UPDATE public.community_project_submissions
    SET artifact_integrity_status = 'verified',
        artifact_integrity_checked_at = NOW(),
        updated_at = NOW()
    WHERE id = target_submission;
    RETURN 'verified';
  END IF;

  UPDATE public.community_project_submissions
  SET status = 'removed',
      former_prompt_id = submission.prompt_id,
      prompt_id = NULL,
      title = 'Removed project',
      summary = 'This project was removed after its stored artifact failed an integrity check.',
      model_settings = NULL,
      source_url = NULL,
      source_visibility = 'review_only',
      source_access_status = 'not_checked',
      source_checked_at = NULL,
      source_checked_by = NULL,
      build_steps = '[{"title":"Removed","prompt":"Removed from PathForge.","response":"Removed from PathForge."}]'::JSONB,
      review_notes = NULL,
      user_status_note = 'Removed automatically because the stored artifact no longer matched its reviewed hash.',
      removed_at = NOW(),
      artifact_integrity_status = 'failed',
      artifact_integrity_checked_at = NOW(),
      updated_at = NOW()
  WHERE id = target_submission;

  IF submission.prompt_id IS NOT NULL THEN
    UPDATE public.prompts
    SET status = 'rejected',
        title = 'Removed project',
        description = 'This project was removed after an artifact integrity failure.',
        content = 'No public project content remains.',
        result_content = NULL,
        updated_at = NOW()
    WHERE id = submission.prompt_id;
  END IF;

  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    target_submission,
    NULL,
    'system',
    'removed',
    correlation,
    jsonb_build_object(
      'reason', 'artifact_integrity_failure',
      'expected_sha256', submission.artifact_sha256,
      'actual_sha256', actual_sha256,
      'expected_size_bytes', submission.artifact_size_bytes,
      'actual_size_bytes', actual_size_bytes
    )
  );
  RETURN 'removed';
END;
$$;

-- PostgREST exposes the public schema, not private implementation helpers.
-- These service-only wrappers keep every state transition callable from the
-- server while preserving the private implementation boundary.
CREATE OR REPLACE FUNCTION public.begin_community_project_reconciliation(
  run_id UUID,
  lease_seconds INT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.begin_community_project_reconciliation(run_id, lease_seconds);
$$;

CREATE OR REPLACE FUNCTION public.finish_community_project_reconciliation(
  run_id UUID,
  succeeded BOOLEAN,
  error_summary TEXT,
  metrics JSONB
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.finish_community_project_reconciliation(
    run_id, succeeded, error_summary, metrics
  );
$$;

CREATE OR REPLACE FUNCTION public.record_community_project_artifact_integrity(
  target_submission UUID,
  actual_sha256 TEXT,
  actual_size_bytes INT,
  correlation UUID
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.record_community_project_artifact_integrity(
    target_submission, actual_sha256, actual_size_bytes, correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.set_community_project_pilot_member(
  target_user UUID,
  administrator UUID,
  enabled BOOLEAN,
  requested_member_kind TEXT,
  member_note TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.set_community_project_pilot_member(
    target_user, administrator, enabled, requested_member_kind, member_note
  );
$$;

CREATE OR REPLACE FUNCTION public.record_community_project_report_readiness(
  administrator UUID,
  proof_hash TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.record_community_project_report_readiness(
    administrator, proof_hash, correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.set_community_project_publication_control(
  administrator UUID,
  enabled BOOLEAN
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.set_community_project_publication_control(administrator, enabled);
$$;

CREATE OR REPLACE FUNCTION public.create_community_project_submission(
  actor UUID,
  payload JSONB,
  correlation UUID
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.create_community_project_submission(actor, payload, correlation);
$$;

CREATE OR REPLACE FUNCTION public.request_community_project_repair(
  target_submission UUID,
  reviewer UUID,
  builder_note TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.request_community_project_repair(
    target_submission, reviewer, builder_note, correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.replace_community_project_submission(
  target_submission UUID,
  actor UUID,
  payload JSONB,
  correlation UUID
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.replace_community_project_submission(
    target_submission, actor, payload, correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.publish_community_project_submission(
  target_submission UUID,
  reviewer UUID,
  source_access_confirmed BOOLEAN,
  review_checks JSONB,
  reviewer_notes TEXT,
  correlation UUID
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.publish_community_project_submission(
    target_submission, reviewer, source_access_confirmed, review_checks,
    reviewer_notes, correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.decline_community_project_submission(
  target_submission UUID,
  reviewer UUID,
  builder_note TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.decline_community_project_submission(
    target_submission, reviewer, builder_note, correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.withdraw_community_project_submission(
  target_submission UUID,
  actor UUID,
  removal_kind TEXT,
  reason TEXT,
  correlation UUID
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.withdraw_community_project_submission(
    target_submission, actor, removal_kind, reason, correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.confirm_community_project_artifact_purged(
  target_submission UUID,
  actor UUID,
  correlation UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.confirm_community_project_artifact_purged(
    target_submission, actor, correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.create_community_project_report(
  target_prompt UUID,
  reporter UUID,
  reporter_email_value TEXT,
  report_reason TEXT,
  report_details TEXT,
  request_fingerprint TEXT,
  correlation UUID
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.create_community_project_report(
    target_prompt,
    reporter,
    reporter_email_value,
    report_reason,
    report_details,
    request_fingerprint,
    correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.set_community_project_report_status(
  target_report UUID,
  reviewer UUID,
  next_status TEXT,
  notes TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.set_community_project_report_status(
    target_report, reviewer, next_status, notes, correlation
  );
$$;

CREATE OR REPLACE FUNCTION public.community_project_publication_drift()
RETURNS TABLE (
  submission_id UUID,
  prompt_id UUID,
  status TEXT,
  issue TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM private.community_project_publication_drift();
$$;

CREATE OR REPLACE FUNCTION public.community_project_cleanup_candidates()
RETURNS TABLE (
  submission_id UUID,
  artifact_path TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM private.community_project_cleanup_candidates();
$$;

CREATE OR REPLACE FUNCTION public.community_project_storage_orphans()
RETURNS TABLE (
  artifact_path TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM private.community_project_storage_orphans();
$$;

CREATE OR REPLACE FUNCTION public.finalize_community_project_artifact_cleanup(
  target_submission UUID,
  correlation UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.finalize_community_project_artifact_cleanup(
    target_submission, correlation
  );
$$;

ALTER TABLE public.community_project_pilot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_project_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_project_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_project_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_project_pilot_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pilot members read own eligibility"
  ON public.community_project_pilot_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Owners and admins read community submissions"
  ON public.community_project_submissions
  FOR SELECT TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Owners and admins read community events"
  ON public.community_project_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.community_project_submissions
      WHERE community_project_submissions.id = community_project_events.submission_id
        AND (
          community_project_submissions.author_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.role = 'admin'
          )
        )
    )
  );

CREATE POLICY "Reporters and admins read community reports"
  ON public.community_project_reports
  FOR SELECT TO authenticated
  USING (
    reporter_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Published community artifacts are readable" ON storage.objects;
DROP FUNCTION IF EXISTS public.community_project_artifact_is_public(TEXT);

REVOKE ALL ON TABLE public.community_project_pilot_members
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_project_submissions
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_project_events
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_project_reports
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_project_operations
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.community_project_pilot_controls
  FROM PUBLIC, anon, authenticated;

GRANT SELECT (
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
  source_access_status,
  source_checked_at,
  build_steps,
  artifact_path,
  artifact_original_name,
  artifact_sha256,
  artifact_size_bytes,
  artifact_scan,
  artifact_integrity_status,
  artifact_integrity_checked_at,
  submitter_role,
  reuse_permission,
  terms_version,
  privacy_version,
  builder_attested_at,
  profile_attribution_attested_at,
  rights_attested_at,
  privacy_attested_at,
  publication_consent_at,
  status,
  prompt_id,
  user_status_note,
  published_at,
  withdrawn_at,
  removed_at,
  submission_version,
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
  created_at,
  updated_at
) ON TABLE public.community_project_submissions TO authenticated;
GRANT ALL ON TABLE public.community_project_pilot_members TO service_role;
GRANT ALL ON TABLE public.community_project_submissions TO service_role;
GRANT ALL ON TABLE public.community_project_events TO service_role;
GRANT ALL ON TABLE public.community_project_reports TO service_role;
GRANT ALL ON TABLE public.community_project_operations TO service_role;
GRANT ALL ON TABLE public.community_project_pilot_controls TO service_role;

REVOKE ALL ON FUNCTION public.community_project_pilot_eligible()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_project_pilot_eligible()
  TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_community_project(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_community_project(UUID)
  TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_public_community_projects(UUID[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_community_projects(UUID[])
  TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_public_community_project_artifact_path(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_community_project_artifact_path(UUID)
  TO service_role;

REVOKE ALL ON FUNCTION private.create_community_project_submission(UUID, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.request_community_project_repair(UUID, UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.publish_community_project_submission(UUID, UUID, BOOLEAN, JSONB, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.decline_community_project_submission(UUID, UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.withdraw_community_project_submission(UUID, UUID, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.confirm_community_project_artifact_purged(UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.create_community_project_report(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.community_project_publication_drift()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_community_project_pilot_member(UUID, UUID, BOOLEAN, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_community_project_report_readiness(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_community_project_publication_control(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_community_project_report_status(UUID, UUID, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.community_project_cleanup_candidates()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.community_project_storage_orphans()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.finalize_community_project_artifact_cleanup(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.begin_community_project_reconciliation(UUID, INT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.finish_community_project_reconciliation(UUID, BOOLEAN, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_community_project_artifact_integrity(UUID, TEXT, INT, UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.create_community_project_submission(UUID, JSONB, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.request_community_project_repair(UUID, UUID, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.publish_community_project_submission(UUID, UUID, BOOLEAN, JSONB, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.decline_community_project_submission(UUID, UUID, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.withdraw_community_project_submission(UUID, UUID, TEXT, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.confirm_community_project_artifact_purged(UUID, UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.create_community_project_report(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.community_project_publication_drift()
  TO service_role;
GRANT EXECUTE ON FUNCTION private.set_community_project_pilot_member(UUID, UUID, BOOLEAN, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.record_community_project_report_readiness(UUID, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.set_community_project_publication_control(UUID, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.set_community_project_report_status(UUID, UUID, TEXT, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.community_project_cleanup_candidates()
  TO service_role;
GRANT EXECUTE ON FUNCTION private.community_project_storage_orphans()
  TO service_role;
GRANT EXECUTE ON FUNCTION private.finalize_community_project_artifact_cleanup(UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.begin_community_project_reconciliation(UUID, INT)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.finish_community_project_reconciliation(UUID, BOOLEAN, TEXT, JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.record_community_project_artifact_integrity(UUID, TEXT, INT, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION private.pathforge_actor_is_admin(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.pathforge_actor_can_submit_community_project(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.pathforge_validate_community_build_steps(JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.pathforge_validate_community_source_url(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.pathforge_resolve_community_fork(JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.pathforge_validate_community_submission_payload(JSONB)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_community_project_submission(UUID, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_community_project_repair(UUID, UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_community_project_submission(UUID, UUID, BOOLEAN, JSONB, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decline_community_project_submission(UUID, UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.withdraw_community_project_submission(UUID, UUID, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_community_project_artifact_purged(UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_community_project_report(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_project_publication_drift()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_community_project_pilot_member(UUID, UUID, BOOLEAN, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_community_project_report_readiness(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_community_project_publication_control(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_community_project_report_status(UUID, UUID, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_project_cleanup_candidates()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_project_storage_orphans()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_community_project_artifact_cleanup(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.begin_community_project_reconciliation(UUID, INT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_community_project_reconciliation(UUID, BOOLEAN, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_community_project_artifact_integrity(UUID, TEXT, INT, UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_community_project_submission(UUID, JSONB, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.request_community_project_repair(UUID, UUID, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_community_project_submission(UUID, UUID, BOOLEAN, JSONB, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.decline_community_project_submission(UUID, UUID, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_community_project_submission(UUID, UUID, TEXT, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_community_project_artifact_purged(UUID, UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.create_community_project_report(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.community_project_publication_drift()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_community_project_pilot_member(UUID, UUID, BOOLEAN, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_community_project_report_readiness(UUID, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_community_project_publication_control(UUID, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_community_project_report_status(UUID, UUID, TEXT, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.community_project_cleanup_candidates()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.community_project_storage_orphans()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_community_project_artifact_cleanup(UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_community_project_reconciliation(UUID, INT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_community_project_reconciliation(UUID, BOOLEAN, TEXT, JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_community_project_artifact_integrity(UUID, TEXT, INT, UUID)
  TO service_role;

-- The project-bundle pilot replaces new URL-only intake. Keep the historical
-- table readable for My Forge and admin review, but close every direct insert
-- route. The only remaining write is a service-only, append-only repair that
-- locks an owned repair-eligible predecessor and copies its lineage itself.
DROP POLICY IF EXISTS "Users submit untouched queued source runs"
  ON public.source_run_submissions;
DROP POLICY IF EXISTS "Users can submit own source runs"
  ON public.source_run_submissions;
REVOKE INSERT ON TABLE public.source_run_submissions FROM authenticated;

CREATE OR REPLACE FUNCTION private.create_legacy_source_run_repair(
  target_submission UUID,
  actor UUID,
  repair_title TEXT,
  repair_source_url TEXT,
  repair_notes TEXT DEFAULT NULL,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  prior public.source_run_submissions%ROWTYPE;
  repair_id UUID := gen_random_uuid();
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF actor IS NULL THEN
    RAISE EXCEPTION 'An authenticated repair owner is required.';
  END IF;
  IF LENGTH(BTRIM(COALESCE(repair_title, ''))) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Repair title must be between 1 and 200 characters.';
  END IF;
  IF repair_source_url IS NULL
    OR BTRIM(repair_source_url) !~ '^https://[^[:space:]]+$'
    OR LENGTH(BTRIM(repair_source_url)) > 4000 THEN
    RAISE EXCEPTION 'Repair source URL must be a secure URL within 4000 characters.';
  END IF;
  IF repair_notes IS NOT NULL AND LENGTH(repair_notes) > 20000 THEN
    RAISE EXCEPTION 'Repair notes must be 20000 characters or fewer.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_submission::TEXT || '|legacy-source-run-repair', 0)
  );
  SELECT * INTO prior
  FROM public.source_run_submissions
  WHERE id = target_submission
  FOR UPDATE;

  IF NOT FOUND OR prior.author_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'That repair source run is unavailable.';
  END IF;
  IF prior.status NOT IN ('needs_repair', 'failed') THEN
    RAISE EXCEPTION 'That source run is not eligible for a repair submission.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.source_run_submissions AS existing
    WHERE existing.resubmission_of_id = target_submission
      AND existing.status NOT IN ('failed', 'declined')
  ) THEN
    RAISE EXCEPTION 'A repair submission is already active for this source run.';
  END IF;

  INSERT INTO public.source_run_submissions (
    id,
    title,
    source_url,
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
  ) VALUES (
    repair_id,
    BTRIM(repair_title),
    BTRIM(repair_source_url),
    NULL,
    NULLIF(BTRIM(COALESCE(repair_notes, '')), ''),
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
    prior.fork_branch_index,
    prior.id,
    actor,
    'queued'
  );

  RETURN repair_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_legacy_source_run_repair(
  target_submission UUID,
  actor UUID,
  repair_title TEXT,
  repair_source_url TEXT,
  repair_notes TEXT DEFAULT NULL,
  correlation UUID DEFAULT gen_random_uuid()
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
    correlation
  );
$$;

REVOKE ALL ON FUNCTION private.create_legacy_source_run_repair(UUID, UUID, TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_legacy_source_run_repair(UUID, UUID, TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_legacy_source_run_repair(UUID, UUID, TEXT, TEXT, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.create_legacy_source_run_repair(UUID, UUID, TEXT, TEXT, TEXT, UUID)
  TO service_role;

-- Retire the older direct prompt/step creation surface beneath the UI. New
-- community projects must enter through the scanned private bundle RPC, while
-- prepared source-run publication and historical repairs remain privileged
-- RPCs. Existing legacy prompt moderation remains admin-only.
DROP POLICY IF EXISTS "Authenticated users create pending zero-engagement prompts"
  ON public.prompts;
REVOKE INSERT ON TABLE public.prompts FROM authenticated;

DROP POLICY IF EXISTS "Owners edit pending prompts and admins review"
  ON public.prompts;
CREATE POLICY "Admins review legacy prompts"
  ON public.prompts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "Owners can add steps to pending prompts"
  ON public.prompt_steps;
REVOKE INSERT ON TABLE public.prompt_steps FROM authenticated;

CREATE OR REPLACE FUNCTION private.guard_community_prompt_review_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    AND EXISTS (
      SELECT 1
      FROM public.community_project_submissions AS submission
      WHERE submission.prompt_id = OLD.id
        OR submission.former_prompt_id = OLD.id
    )
    AND (
      NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.content IS DISTINCT FROM OLD.content
      OR NEW.result_content IS DISTINCT FROM OLD.result_content
      OR NEW.category_id IS DISTINCT FROM OLD.category_id
      OR NEW.difficulty IS DISTINCT FROM OLD.difficulty
      OR NEW.model_used IS DISTINCT FROM OLD.model_used
      OR NEW.model_recommendation IS DISTINCT FROM OLD.model_recommendation
      OR NEW.tools_used IS DISTINCT FROM OLD.tools_used
      OR NEW.tags IS DISTINCT FROM OLD.tags
      OR NEW.status IS DISTINCT FROM OLD.status
    ) THEN
    RAISE EXCEPTION 'Community project reviewed fields must use the community review, publication, or removal workflow.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_community_prompt_review_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS guard_community_prompt_status_mutation ON public.prompts;
DROP TRIGGER IF EXISTS guard_community_prompt_review_mutation ON public.prompts;
CREATE TRIGGER guard_community_prompt_review_mutation
  BEFORE UPDATE OF title, description, content, result_content, category_id,
    difficulty, model_used, model_recommendation, tools_used, tags, status
  ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION private.guard_community_prompt_review_mutation();

-- Keep the activation completion funnel aligned with the production bundle
-- flow while retaining historical legacy source-run completions.
CREATE OR REPLACE FUNCTION public.pathforge_activation_dashboard(
  p_days INTEGER DEFAULT 30,
  p_environment TEXT DEFAULT 'production'
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
WITH bounds AS (
  SELECT
    LEAST(180, GREATEST(1, COALESCE(p_days, 30))) AS days,
    CASE
      WHEN p_environment IN ('production', 'preview', 'development') THEN p_environment
      ELSE 'production'
    END AS environment,
    (
      date_trunc('day', now() AT TIME ZONE 'UTC')
      - (LEAST(180, GREATEST(1, COALESCE(p_days, 30))) - 1) * INTERVAL '1 day'
    ) AT TIME ZONE 'UTC' AS started_at,
    now() AS ended_at
),
all_events AS (
  SELECT events.*
  FROM public.product_events AS events
  CROSS JOIN bounds
  WHERE events.occurred_at >= bounds.started_at
    AND events.occurred_at <= bounds.ended_at
    AND events.environment = bounds.environment
),
external_events AS (
  SELECT *
  FROM all_events
  WHERE actor_type IN ('anonymous', 'member')
),
project_entries AS (
  SELECT DISTINCT ON (session_id)
    session_id,
    occurred_at AS project_at,
    project_id,
    project_title,
    path
  FROM external_events
  WHERE event_name = 'project_opened'
  ORDER BY session_id, occurred_at, id
),
session_stages AS (
  SELECT
    entry.*,
    evidence.evidence_at,
    action_stage.action_at,
    completion.completed_at,
    COALESCE(discovery.surface, 'direct') AS entry_surface
  FROM project_entries AS entry
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS evidence_at
    FROM external_events AS event
    WHERE event.session_id = entry.session_id
      AND event.event_name = 'build_path_reached'
      AND event.occurred_at >= entry.project_at
  ) AS evidence ON TRUE
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS action_at
    FROM external_events AS event
    WHERE event.session_id = entry.session_id
      AND event.event_name = 'builder_action_started'
      AND evidence.evidence_at IS NOT NULL
      AND event.occurred_at >= evidence.evidence_at
  ) AS action_stage ON TRUE
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS completed_at
    FROM external_events AS event
    WHERE event.session_id = entry.session_id
      AND event.event_name IN ('source_run_submitted', 'community_project_submitted')
      AND action_stage.action_at IS NOT NULL
      AND event.occurred_at >= action_stage.action_at
  ) AS completion ON TRUE
  LEFT JOIN LATERAL (
    SELECT event.surface
    FROM external_events AS event
    WHERE event.session_id = entry.session_id
      AND event.event_name = 'discovery_viewed'
      AND event.occurred_at <= entry.project_at
    ORDER BY event.occurred_at DESC, event.id DESC
    LIMIT 1
  ) AS discovery ON TRUE
),
session_totals AS (
  SELECT
    count(*)::INTEGER AS project_sessions,
    count(*) FILTER (WHERE evidence_at IS NOT NULL)::INTEGER AS evidence_sessions,
    count(*) FILTER (WHERE action_at IS NOT NULL)::INTEGER AS activated_sessions,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::INTEGER AS completed_sessions
  FROM session_stages
),
member_actions AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    session_id,
    occurred_at AS action_at
  FROM external_events
  WHERE actor_type = 'member'
    AND user_id IS NOT NULL
    AND event_name IN ('builder_action_started', 'source_run_submitted', 'community_project_submitted')
  ORDER BY user_id, occurred_at, id
),
member_returns AS (
  SELECT action.user_id
  FROM member_actions AS action
  WHERE EXISTS (
    SELECT 1
    FROM external_events AS event
    WHERE event.actor_type = 'member'
      AND event.user_id = action.user_id
      AND event.event_name = 'my_forge_returned'
      AND event.session_id <> action.session_id
      AND event.occurred_at > action.action_at
  )
),
project_visits AS (
  SELECT DISTINCT ON (session_id, COALESCE(project_id, path))
    session_id,
    COALESCE(project_id, path) AS project_key,
    project_id,
    project_title,
    path,
    occurred_at AS project_at
  FROM external_events
  WHERE event_name = 'project_opened'
  ORDER BY session_id, COALESCE(project_id, path), occurred_at, id
),
project_visit_stages AS (
  SELECT
    visit.*,
    evidence.evidence_at,
    action_stage.action_at,
    completion.completed_at
  FROM project_visits AS visit
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS evidence_at
    FROM external_events AS event
    WHERE event.session_id = visit.session_id
      AND event.event_name = 'build_path_reached'
      AND COALESCE(event.project_id, event.path) = visit.project_key
      AND event.occurred_at >= visit.project_at
  ) AS evidence ON TRUE
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS action_at
    FROM external_events AS event
    WHERE event.session_id = visit.session_id
      AND event.event_name = 'builder_action_started'
      AND COALESCE(event.project_id, event.path) = visit.project_key
      AND evidence.evidence_at IS NOT NULL
      AND event.occurred_at >= evidence.evidence_at
  ) AS action_stage ON TRUE
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS completed_at
    FROM external_events AS event
    WHERE event.session_id = visit.session_id
      AND event.event_name IN ('source_run_submitted', 'community_project_submitted')
      AND (
        event.project_id IS NULL
        OR COALESCE(event.project_id, event.path) = visit.project_key
      )
      AND action_stage.action_at IS NOT NULL
      AND event.occurred_at >= action_stage.action_at
  ) AS completion ON TRUE
),
project_rollup AS (
  SELECT
    project_key,
    max(project_id) AS project_id,
    max(project_title) AS project_title,
    max(path) AS path,
    count(*)::INTEGER AS opens,
    count(*) FILTER (WHERE evidence_at IS NOT NULL)::INTEGER AS evidence,
    count(*) FILTER (WHERE action_at IS NOT NULL)::INTEGER AS activated,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::INTEGER AS completed
  FROM project_visit_stages
  GROUP BY project_key
),
top_projects AS (
  SELECT *
  FROM project_rollup
  ORDER BY activated DESC, evidence DESC, opens DESC, project_key
  LIMIT 8
),
surface_rollup AS (
  SELECT
    entry_surface AS surface,
    count(*)::INTEGER AS project_sessions,
    count(*) FILTER (WHERE evidence_at IS NOT NULL)::INTEGER AS evidence_sessions,
    count(*) FILTER (WHERE action_at IS NOT NULL)::INTEGER AS activated_sessions
  FROM session_stages
  GROUP BY entry_surface
  ORDER BY activated_sessions DESC, project_sessions DESC, entry_surface
),
calendar_days AS (
  SELECT generate_series(
    bounds.started_at::DATE,
    bounds.ended_at::DATE,
    INTERVAL '1 day'
  )::DATE AS day
  FROM bounds
),
daily_rollup AS (
  SELECT
    (project_at AT TIME ZONE 'UTC')::DATE AS day,
    count(*)::INTEGER AS project_sessions,
    count(*) FILTER (WHERE evidence_at IS NOT NULL)::INTEGER AS evidence_sessions,
    count(*) FILTER (WHERE action_at IS NOT NULL)::INTEGER AS activated_sessions,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::INTEGER AS completed_sessions
  FROM session_stages
  GROUP BY (project_at AT TIME ZONE 'UTC')::DATE
),
daily AS (
  SELECT
    calendar.day,
    COALESCE(rollup.project_sessions, 0)::INTEGER AS project_sessions,
    COALESCE(rollup.evidence_sessions, 0)::INTEGER AS evidence_sessions,
    COALESCE(rollup.activated_sessions, 0)::INTEGER AS activated_sessions,
    COALESCE(rollup.completed_sessions, 0)::INTEGER AS completed_sessions
  FROM calendar_days AS calendar
  LEFT JOIN daily_rollup AS rollup USING (day)
  ORDER BY calendar.day
),
health AS (
  SELECT
    count(*)::INTEGER AS total_events,
    count(*) FILTER (WHERE actor_type IN ('anonymous', 'member'))::INTEGER AS external_events,
    count(*) FILTER (WHERE actor_type IN ('seed', 'team', 'admin'))::INTEGER AS internal_events,
    count(DISTINCT session_id) FILTER (WHERE actor_type IN ('anonymous', 'member'))::INTEGER AS external_sessions,
    max(occurred_at) AS last_event_at
  FROM all_events
),
supporting AS (
  SELECT
    count(DISTINCT session_id) FILTER (WHERE event_name = 'discovery_viewed')::INTEGER AS discovery_sessions,
    count(DISTINCT session_id) FILTER (WHERE event_name = 'discovery_searched')::INTEGER AS search_sessions,
    count(DISTINCT session_id) FILTER (WHERE event_name = 'artifact_opened')::INTEGER AS artifact_sessions,
    count(DISTINCT session_id) FILTER (WHERE event_name = 'model_run_compared')::INTEGER AS comparison_sessions,
    count(DISTINCT session_id) FILTER (WHERE event_name = 'account_created')::INTEGER AS account_sessions
  FROM external_events
)
SELECT jsonb_build_object(
  'window', jsonb_build_object(
    'days', bounds.days,
    'environment', bounds.environment,
    'started_at', bounds.started_at,
    'ended_at', bounds.ended_at
  ),
  'summary', jsonb_build_object(
    'project_sessions', totals.project_sessions,
    'evidence_sessions', totals.evidence_sessions,
    'activated_sessions', totals.activated_sessions,
    'completed_sessions', totals.completed_sessions,
    'activation_rate', COALESCE(round(totals.activated_sessions * 100.0 / NULLIF(totals.project_sessions, 0), 1), 0),
    'evidence_rate', COALESCE(round(totals.evidence_sessions * 100.0 / NULLIF(totals.project_sessions, 0), 1), 0),
    'completion_rate', COALESCE(round(totals.completed_sessions * 100.0 / NULLIF(totals.activated_sessions, 0), 1), 0),
    'member_builders', (SELECT count(*)::INTEGER FROM member_actions),
    'returning_builders', (SELECT count(*)::INTEGER FROM member_returns),
    'return_rate', COALESCE(round(
      (SELECT count(*) FROM member_returns) * 100.0 / NULLIF((SELECT count(*) FROM member_actions), 0),
      1
    ), 0),
    'account_sessions', supporting.account_sessions
  ),
  'funnel', jsonb_build_array(
    jsonb_build_object('key', 'project_opened', 'label', 'Opened a project', 'sessions', totals.project_sessions, 'rate_from_previous', 100),
    jsonb_build_object('key', 'build_path_reached', 'label', 'Reached build evidence', 'sessions', totals.evidence_sessions, 'rate_from_previous', COALESCE(round(totals.evidence_sessions * 100.0 / NULLIF(totals.project_sessions, 0), 1), 0)),
    jsonb_build_object('key', 'builder_action_started', 'label', 'Started a fork or share', 'sessions', totals.activated_sessions, 'rate_from_previous', COALESCE(round(totals.activated_sessions * 100.0 / NULLIF(totals.evidence_sessions, 0), 1), 0)),
    jsonb_build_object('key', 'submission_completed', 'label', 'Completed a project submission', 'sessions', totals.completed_sessions, 'rate_from_previous', COALESCE(round(totals.completed_sessions * 100.0 / NULLIF(totals.activated_sessions, 0), 1), 0))
  ),
  'supporting', jsonb_build_object(
    'discovery_sessions', supporting.discovery_sessions,
    'search_sessions', supporting.search_sessions,
    'artifact_sessions', supporting.artifact_sessions,
    'comparison_sessions', supporting.comparison_sessions
  ),
  'daily', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'date', day,
      'project_sessions', project_sessions,
      'evidence_sessions', evidence_sessions,
      'activated_sessions', activated_sessions,
      'completed_sessions', completed_sessions
    ) ORDER BY day)
    FROM daily
  ), '[]'::JSONB),
  'projects', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'project_id', project_id,
      'project_title', COALESCE(project_title, project_id, path),
      'path', path,
      'opens', opens,
      'evidence', evidence,
      'activated', activated,
      'completed', completed,
      'activation_rate', COALESCE(round(activated * 100.0 / NULLIF(opens, 0), 1), 0)
    ) ORDER BY activated DESC, evidence DESC, opens DESC)
    FROM top_projects
  ), '[]'::JSONB),
  'surfaces', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'surface', surface,
      'project_sessions', project_sessions,
      'evidence_sessions', evidence_sessions,
      'activated_sessions', activated_sessions,
      'activation_rate', COALESCE(round(activated_sessions * 100.0 / NULLIF(project_sessions, 0), 1), 0)
    ) ORDER BY activated_sessions DESC, project_sessions DESC)
    FROM surface_rollup
  ), '[]'::JSONB),
  'health', jsonb_build_object(
    'total_events', health.total_events,
    'external_events', health.external_events,
    'internal_events', health.internal_events,
    'external_sessions', health.external_sessions,
    'last_event_at', health.last_event_at
  )
)
FROM bounds
CROSS JOIN session_totals AS totals
CROSS JOIN supporting
CROSS JOIN health;
$$;

REVOKE ALL ON FUNCTION public.pathforge_activation_dashboard(INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pathforge_activation_dashboard(INTEGER, TEXT)
  TO service_role;

-- Delete report contact/evidence after its 90-day resolved retention window,
-- and delete deidentified withdrawal/removal audit records after 400 days.
-- Open investigations hold both records. Artifact bytes must already be
-- physically purged before a submission tombstone can age out.
CREATE OR REPLACE FUNCTION private.purge_community_project_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reports_purged INTEGER := 0;
  prompts_deidentified INTEGER := 0;
  submissions_purged INTEGER := 0;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;

  WITH expired AS (
    SELECT report.id
    FROM public.community_project_reports AS report
    WHERE report.status IN ('resolved', 'dismissed')
      AND report.resolved_at <= NOW() - INTERVAL '90 days'
    ORDER BY report.resolved_at, report.id
    LIMIT 500
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM public.community_project_reports AS report
  USING expired
  WHERE report.id = expired.id;
  GET DIAGNOSTICS reports_purged = ROW_COUNT;

  WITH expired AS (
    SELECT submission.id, COALESCE(submission.prompt_id, submission.former_prompt_id) AS prompt_id
    FROM public.community_project_submissions AS submission
    WHERE submission.status IN ('withdrawn', 'removed')
      AND submission.artifact_path IS NULL
      AND submission.artifact_integrity_status = 'purged'
      AND CASE
        WHEN submission.status = 'withdrawn' THEN submission.withdrawn_at
        ELSE submission.removed_at
      END <= NOW() - INTERVAL '400 days'
      AND NOT EXISTS (
        SELECT 1
        FROM public.community_project_reports AS report
        WHERE report.submission_id = submission.id
          AND report.status IN ('open', 'reviewing')
      )
    ORDER BY COALESCE(submission.withdrawn_at, submission.removed_at), submission.id
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.prompts AS project
  SET author_id = NULL,
      title = 'Unavailable project',
      description = 'This project is no longer available.',
      content = 'No public project content remains.',
      result_content = NULL,
      model_used = NULL,
      model_recommendation = NULL,
      tools_used = '{}'::TEXT[],
      tags = '{}'::TEXT[],
      updated_at = NOW()
  FROM expired
  WHERE project.id = expired.prompt_id
    AND project.status = 'rejected';
  GET DIAGNOSTICS prompts_deidentified = ROW_COUNT;

  WITH expired AS (
    SELECT submission.id
    FROM public.community_project_submissions AS submission
    WHERE submission.status IN ('withdrawn', 'removed')
      AND submission.artifact_path IS NULL
      AND submission.artifact_integrity_status = 'purged'
      AND CASE
        WHEN submission.status = 'withdrawn' THEN submission.withdrawn_at
        ELSE submission.removed_at
      END <= NOW() - INTERVAL '400 days'
      AND NOT EXISTS (
        SELECT 1
        FROM public.community_project_reports AS report
        WHERE report.submission_id = submission.id
          AND report.status IN ('open', 'reviewing')
      )
    ORDER BY COALESCE(submission.withdrawn_at, submission.removed_at), submission.id
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM public.community_project_submissions AS submission
  USING expired
  WHERE submission.id = expired.id;
  GET DIAGNOSTICS submissions_purged = ROW_COUNT;

  RETURN jsonb_build_object(
    'reportsPurged', reports_purged,
    'promptTombstonesDeidentified', prompts_deidentified,
    'submissionTombstonesPurged', submissions_purged
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_community_project_retention()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.purge_community_project_retention();
$$;

REVOKE ALL ON FUNCTION private.purge_community_project_retention()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_community_project_retention()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.purge_community_project_retention()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_community_project_retention()
  TO service_role;

NOTIFY pgrst, 'reload schema';
