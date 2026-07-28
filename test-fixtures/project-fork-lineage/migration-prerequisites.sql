CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE private.prepared_legacy_seed_profile_bindings (
  source_run_id UUID PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE
);

CREATE TABLE public.prompts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  model_used TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
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
  CONSTRAINT prompts_fork_depth_check CHECK (fork_depth BETWEEN 0 AND 9)
);

CREATE TABLE public.prompt_steps (
  id UUID PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id),
  step_number INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  result_content TEXT
);

CREATE TABLE public.project_model_variants (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.prompts(id),
  source_run_id TEXT NOT NULL,
  service_label TEXT NOT NULL DEFAULT 'Fixture provider',
  model_label TEXT NOT NULL DEFAULT 'Fixture model',
  status TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.project_model_variant_artifacts (
  id UUID PRIMARY KEY,
  model_variant_id UUID NOT NULL REFERENCES public.project_model_variants(id),
  source_step_id TEXT NOT NULL,
  source_step_number INT NOT NULL,
  artifact_path TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.source_run_submissions (
  id UUID PRIMARY KEY,
  extracted_prompt_id UUID REFERENCES public.prompts(id),
  status TEXT NOT NULL DEFAULT 'queued',
  intake_evidence JSONB,
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
  CONSTRAINT source_run_submissions_fork_depth_check
    CHECK (fork_depth BETWEEN 0 AND 9)
);

CREATE TABLE public.community_project_submissions (
  id UUID PRIMARY KEY,
  prompt_id UUID REFERENCES public.prompts(id),
  status TEXT NOT NULL DEFAULT 'queued',
  reuse_permission TEXT NOT NULL DEFAULT 'allow_pathforge_remix',
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
  CONSTRAINT community_project_submissions_fork_depth_check
    CHECK (fork_depth BETWEEN 0 AND 9)
);

CREATE TABLE public.user_project_states (
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  fork_started_at TIMESTAMPTZ,
  fork_depth INT NOT NULL DEFAULT 0,
  fork_branch_index INT NOT NULL DEFAULT 0,
  fork_parent_submission_id TEXT,
  fork_prompt_family_id TEXT,
  selected_model_variant_id UUID,
  selected_source_run_id TEXT,
  selected_step_id TEXT,
  selected_step_number INT,
  selected_artifact_path TEXT,
  selected_artifact_sha256 TEXT,
  fork_source_model_variant_id UUID,
  fork_source_run_id TEXT,
  fork_source_step_id TEXT,
  fork_source_step_number INT,
  fork_source_artifact_path TEXT,
  fork_source_artifact_sha256 TEXT,
  CONSTRAINT user_project_states_fork_depth_check
    CHECK (fork_depth BETWEEN 0 AND 9),
  PRIMARY KEY (user_id, project_id)
);
