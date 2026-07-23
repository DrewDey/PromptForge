\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END;
$$;

CREATE SCHEMA auth;
CREATE SCHEMA storage;

CREATE FUNCTION auth.jwt()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', TRUE), ''), '{}')::JSONB;
$$;

CREATE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt()->>'sub', '')::UUID;
$$;

GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid() TO anon, authenticated, service_role;

CREATE TABLE public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  actor_type TEXT NOT NULL DEFAULT 'anonymous' CHECK (
    actor_type IN ('anonymous', 'member', 'seed', 'team', 'admin')
  ),
  event_name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production' CHECK (
    environment IN ('production', 'preview', 'development')
  ),
  path TEXT NOT NULL DEFAULT '/',
  surface TEXT,
  action TEXT,
  project_id TEXT,
  project_title TEXT,
  source_run_id TEXT,
  metric_value INTEGER,
  schema_version SMALLINT NOT NULL DEFAULT 1,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT product_events_event_name_check CHECK (event_name IN (
    'discovery_viewed', 'discovery_searched', 'project_opened',
    'build_path_reached', 'artifact_opened', 'model_run_compared',
    'builder_action_started', 'account_created', 'source_run_submitted',
    'my_forge_returned'
  )),
  CONSTRAINT product_events_builder_action CHECK (
    event_name NOT IN ('builder_action_started', 'source_run_submitted')
    OR action IN ('fork', 'share')
  )
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user',
  username TEXT UNIQUE,
  display_name TEXT
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.project_model_variants (
  id UUID PRIMARY KEY,
  project_id UUID,
  source_run_id TEXT
);

CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  result_content TEXT,
  category_id UUID REFERENCES public.categories(id),
  difficulty TEXT NOT NULL,
  model_used TEXT,
  model_recommendation TEXT,
  tools_used TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id),
  vote_count INT NOT NULL DEFAULT 0,
  bookmark_count INT NOT NULL DEFAULT 0,
  fork_source_project_id TEXT,
  fork_source_project_title TEXT,
  fork_source_model_variant_id UUID REFERENCES public.project_model_variants(id),
  fork_source_run_id TEXT,
  fork_source_step_id TEXT,
  fork_source_step_number INT,
  fork_source_artifact_path TEXT,
  fork_source_artifact_sha256 TEXT,
  fork_parent_submission_id TEXT,
  prompt_family_id TEXT,
  fork_depth INT NOT NULL DEFAULT 0,
  fork_branch_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prompts_variant_aware_fork_fields_check CHECK (
    (
      fork_source_model_variant_id IS NULL
      AND fork_source_run_id IS NULL
      AND fork_source_artifact_path IS NULL
      AND fork_source_artifact_sha256 IS NULL
    ) OR (
      NULLIF(BTRIM(COALESCE(fork_source_project_id, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(fork_source_run_id, '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(fork_source_step_id, '')), '') IS NOT NULL
      AND fork_source_step_number > 0
      AND fork_source_artifact_path LIKE 'public/artifacts/%'
      AND fork_source_artifact_sha256 ~ '^[0-9a-f]{64}$'
    )
  )
);

CREATE TABLE public.prompt_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  result_content TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mirror the legacy direct-write grants/policies that the pilot migration must
-- explicitly retire in an already-running PathForge database.
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public prompts, owners, and admins can read"
  ON public.prompts FOR SELECT
  USING (
    status = 'approved'
    OR author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
GRANT INSERT (
  title, description, content, result_content, category_id, difficulty,
  model_used, model_recommendation, tools_used, tags, status, author_id
) ON public.prompts TO authenticated;
GRANT UPDATE (
  title, description, content, result_content, category_id, difficulty,
  model_used, model_recommendation, tools_used, tags, status, updated_at
) ON public.prompts TO authenticated;
CREATE POLICY "Authenticated users create pending zero-engagement prompts"
  ON public.prompts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND status = 'pending'
    AND vote_count = 0 AND bookmark_count = 0
  );
CREATE POLICY "Owners edit pending prompts and admins review"
  ON public.prompts FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

ALTER TABLE public.prompt_steps ENABLE ROW LEVEL SECURITY;
GRANT INSERT (prompt_id, step_number, title, content, result_content, description)
  ON public.prompt_steps TO authenticated;
CREATE POLICY "Owners can add steps to pending prompts"
  ON public.prompt_steps FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prompts
    WHERE prompts.id = prompt_steps.prompt_id
      AND prompts.author_id = auth.uid()
      AND prompts.status = 'pending'
  ));

ALTER TABLE public.project_model_variants
  ADD CONSTRAINT project_model_variants_project_fkey
  FOREIGN KEY (project_id) REFERENCES public.prompts(id) ON DELETE RESTRICT;

CREATE TABLE public.source_run_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled source run',
  source_url TEXT,
  file_name TEXT,
  notes TEXT,
  fork_source_project_id TEXT,
  fork_source_project_title TEXT,
  fork_source_model_variant_id UUID,
  fork_source_run_id TEXT,
  fork_source_step_id TEXT,
  fork_source_step_number INT,
  fork_source_artifact_path TEXT,
  fork_source_artifact_sha256 TEXT,
  fork_parent_submission_id TEXT,
  prompt_family_id TEXT,
  fork_depth INT NOT NULL DEFAULT 0,
  fork_branch_index INT NOT NULL DEFAULT 0,
  resubmission_of_id UUID REFERENCES public.source_run_submissions(id) ON DELETE RESTRICT,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  extracted_prompt_id UUID REFERENCES public.prompts(id) ON DELETE SET NULL,
  admin_notes TEXT,
  user_status_note TEXT,
  canonical_source_url TEXT,
  source_package_file TEXT,
  source_package_sha256 TEXT,
  intake_evidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.source_run_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.source_run_submissions TO authenticated;
CREATE POLICY "Users submit untouched queued source runs"
  ON public.source_run_submissions FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND status = 'queued');
CREATE POLICY "Users can view own source runs"
  ON public.source_run_submissions FOR SELECT TO authenticated
  USING (author_id = auth.uid());

CREATE TABLE storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  public BOOLEAN NOT NULL DEFAULT FALSE,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[]
);

CREATE TABLE storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT NOT NULL REFERENCES storage.buckets(id),
  name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket_id, name)
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles, public.prompts, public.prompt_steps, public.categories TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public, storage TO service_role;

INSERT INTO public.categories (slug, name) VALUES ('personal', 'Personal & Fun');
