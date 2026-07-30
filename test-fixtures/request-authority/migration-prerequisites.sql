\set ON_ERROR_STOP on

CREATE SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END;
$$;

CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE SCHEMA storage;

CREATE FUNCTION auth.jwt()
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(pg_catalog.current_setting('request.jwt.claims', TRUE), ''),
    '{}'
  )::JSONB;
$$;

CREATE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NULLIF(auth.jwt()->>'sub', '')::UUID;
$$;

GRANT USAGE ON SCHEMA public, auth, storage
  TO anon, authenticated, service_role;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid()
  TO anon, authenticated, service_role;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user',
  username TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email_confirmed_at TIMESTAMPTZ
);

CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Fixture project',
  status TEXT NOT NULL DEFAULT 'approved'
);

CREATE TABLE public.project_model_variants (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.prompts(id),
  status TEXT NOT NULL DEFAULT 'published',
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.prompt_steps (
  id UUID PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id),
  step_number INTEGER NOT NULL,
  UNIQUE (prompt_id, step_number)
);

INSERT INTO public.prompts (id, title, status)
VALUES (
  '81200000-0000-4000-8000-000000000001',
  'Scope-valid public PathForge project',
  'approved'
);

INSERT INTO public.project_model_variants (
  id, project_id, status, is_default
) VALUES (
  '81300000-0000-4000-8000-000000000001',
  '81200000-0000-4000-8000-000000000001',
  'published',
  TRUE
);

INSERT INTO public.prompt_steps (id, prompt_id, step_number)
VALUES (
  '81400000-0000-4000-8000-000000000001',
  '81200000-0000-4000-8000-000000000001',
  1
);

CREATE TABLE public.project_model_variant_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_variant_id UUID NOT NULL REFERENCES public.project_model_variants(id),
  source_step_id TEXT NOT NULL,
  source_step_number INTEGER NOT NULL,
  artifact_path TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL
);

INSERT INTO public.project_model_variant_artifacts (
  id, model_variant_id, source_step_id, source_step_number,
  artifact_path, artifact_sha256
) VALUES (
  '81500000-0000-4000-8000-000000000001',
  '81300000-0000-4000-8000-000000000001',
  '81400000-0000-4000-8000-000000000001',
  1,
  'public/artifacts/request-authority-fixture.html',
  repeat('a', 64)
);

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
  owner_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket_id, name)
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- This is the deployed legacy board shape. The authority migration must accept
-- it only while all three legacy board tables are exactly empty.
CREATE TABLE public.build_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'answered', 'closed')),
  vote_count INT NOT NULL DEFAULT 0,
  accepted_response_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT build_requests_title_length
    CHECK (char_length(title) BETWEEN 4 AND 160),
  CONSTRAINT build_requests_body_length
    CHECK (char_length(body) BETWEEN 20 AND 5000)
);

CREATE TABLE public.build_request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL
    REFERENCES public.build_requests(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES public.prompts(id) ON DELETE SET NULL,
  url TEXT,
  body TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  vote_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT build_request_responses_body_length
    CHECK (char_length(body) BETWEEN 1 AND 5000),
  CONSTRAINT build_request_responses_pathforge_url CHECK (
    url IS NULL OR (
      char_length(url) <= 500
      AND url ~ '^/(prompt/[A-Za-z0-9-]+|[A-Za-z0-9-]+-demo)([?#].*)?$'
    )
  )
);

ALTER TABLE public.build_requests
  ADD CONSTRAINT build_requests_accepted_response_fk
  FOREIGN KEY (accepted_response_id)
  REFERENCES public.build_request_responses(id)
  ON DELETE SET NULL;

CREATE TABLE public.build_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id UUID NOT NULL
    REFERENCES public.build_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, request_id)
);

CREATE INDEX idx_build_requests_author
  ON public.build_requests(author_id);
CREATE INDEX idx_build_requests_status
  ON public.build_requests(status);
CREATE INDEX idx_build_request_responses_request
  ON public.build_request_responses(request_id);
CREATE INDEX idx_build_request_votes_request
  ON public.build_request_votes(request_id);

CREATE OR REPLACE FUNCTION public.update_build_request_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.build_requests
    SET vote_count = vote_count + 1,
        updated_at = NOW()
    WHERE id = NEW.request_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE public.build_requests
    SET vote_count = GREATEST(vote_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER build_request_vote_count_trigger
  AFTER INSERT OR DELETE ON public.build_request_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_build_request_vote_count();

CREATE OR REPLACE FUNCTION public.touch_build_request_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.build_requests
  SET updated_at = NOW(),
      status = CASE WHEN status = 'open' THEN 'answered' ELSE status END
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_response_touch_trigger
  AFTER INSERT ON public.build_request_responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_build_request_on_response();

CREATE TABLE private.pathforge_mutation_windows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (user_id, action_key)
);

CREATE OR REPLACE FUNCTION private.enforce_pathforge_mutation_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := (SELECT auth.uid());
  action_name TEXT;
  allowed_requests INTEGER;
  current_count INTEGER;
  current_window TIMESTAMPTZ;
  now_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF actor_id IS NULL
    OR COALESCE((SELECT auth.jwt() ->> 'role'), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'build_requests' THEN
    action_name := 'submit_build_request';
    allowed_requests := 5;
  ELSIF TG_TABLE_NAME = 'build_request_responses' THEN
    action_name := 'respond_to_build_request';
    allowed_requests := 20;
  ELSE
    RAISE EXCEPTION 'Unsupported PathForge quota target.';
  END IF;

  INSERT INTO private.pathforge_mutation_windows AS limits (
    user_id, action_key, window_started_at, request_count
  ) VALUES (
    actor_id, action_name, now_at, 1
  )
  ON CONFLICT (user_id, action_key) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at <= now_at - INTERVAL '1 hour'
        THEN now_at
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at <= now_at - INTERVAL '1 hour'
        THEN 1
      ELSE limits.request_count + 1
    END
  RETURNING request_count, window_started_at
  INTO current_count, current_window;

  IF current_count > allowed_requests THEN
    RAISE EXCEPTION 'Too many submissions were made in a short time. Try again later.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_pathforge_build_request_quota
  BEFORE INSERT ON public.build_requests
  FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_mutation_quota();
CREATE TRIGGER enforce_pathforge_build_response_quota
  BEFORE INSERT ON public.build_request_responses
  FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_mutation_quota();

REVOKE ALL ON FUNCTION public.update_build_request_vote_count(),
  public.touch_build_request_on_response(),
  private.enforce_pathforge_mutation_quota()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE private.pathforge_mutation_windows
  FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.build_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Build requests are publicly visible"
  ON public.build_requests FOR SELECT USING (TRUE);
CREATE POLICY "Build request responses are publicly visible"
  ON public.build_request_responses FOR SELECT USING (TRUE);
CREATE POLICY "Users create open zero-vote build requests"
  ON public.build_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND status = 'open'
    AND vote_count = 0
    AND accepted_response_id IS NULL
  );
CREATE POLICY "Users create unaccepted zero-vote build responses"
  ON public.build_request_responses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = responder_id
    AND is_accepted = FALSE
    AND vote_count = 0
    AND EXISTS (
      SELECT 1
      FROM public.build_requests
      WHERE build_requests.id = build_request_responses.request_id
        AND build_requests.status <> 'closed'
    )
  );
CREATE POLICY "Build request votes visible to owners and admins"
  ON public.build_request_votes FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
CREATE POLICY "Users vote on open build requests"
  ON public.build_request_votes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.build_requests
      WHERE build_requests.id = build_request_votes.request_id
        AND build_requests.status <> 'closed'
    )
  );
CREATE POLICY "Users can remove own build request votes"
  ON public.build_request_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.build_requests, public.build_request_responses,
  public.build_request_votes TO anon, authenticated;
GRANT INSERT (title, body, author_id)
  ON public.build_requests TO authenticated;
GRANT INSERT (request_id, responder_id, prompt_id, url, body)
  ON public.build_request_responses TO authenticated;
GRANT INSERT (user_id, request_id)
  ON public.build_request_votes TO authenticated;
GRANT DELETE ON public.build_request_votes TO authenticated;
