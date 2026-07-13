-- Prevent signed-in callers from bypassing PathForge moderation and counters
-- through the Data API. Keep ordinary inserts narrow, move privileged state
-- transitions behind checked RPCs, and enforce account-level creation quotas
-- beneath every application client.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.pathforge_mutation_windows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (user_id, action_key)
);

REVOKE ALL ON TABLE private.pathforge_mutation_windows
  FROM PUBLIC, anon, authenticated, service_role;

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
  window_seconds INTEGER;
  current_count INTEGER;
  current_window TIMESTAMPTZ;
  now_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF actor_id IS NULL OR COALESCE((SELECT auth.jwt() ->> 'role'), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'prompts' THEN
      action_name := 'submit_project'; allowed_requests := 12; window_seconds := 3600;
    WHEN 'source_run_submissions' THEN
      action_name := 'submit_source_run'; allowed_requests := 12; window_seconds := 3600;
    WHEN 'suggestions' THEN
      action_name := 'submit_suggestion'; allowed_requests := 5; window_seconds := 3600;
    WHEN 'build_requests' THEN
      action_name := 'submit_build_request'; allowed_requests := 5; window_seconds := 3600;
    WHEN 'build_request_responses' THEN
      action_name := 'respond_to_build_request'; allowed_requests := 20; window_seconds := 3600;
    ELSE
      RAISE EXCEPTION 'Unsupported PathForge quota target.';
  END CASE;

  INSERT INTO private.pathforge_mutation_windows AS limits (
    user_id,
    action_key,
    window_started_at,
    request_count
  ) VALUES (
    actor_id,
    action_name,
    now_at,
    1
  )
  ON CONFLICT (user_id, action_key) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at <= now_at - make_interval(secs => window_seconds)
        THEN now_at
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at <= now_at - make_interval(secs => window_seconds)
        THEN 1
      ELSE limits.request_count + 1
    END
  RETURNING request_count, window_started_at
  INTO current_count, current_window;

  IF current_count > allowed_requests THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Too many submissions were made in a short time. Try again later.',
      DETAIL = FORMAT(
        'action=%s retry_after_seconds=%s',
        action_name,
        GREATEST(1, window_seconds - FLOOR(EXTRACT(EPOCH FROM (now_at - current_window)))::INTEGER)
      );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_pathforge_mutation_quota()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_pathforge_prompt_quota ON public.prompts;
CREATE TRIGGER enforce_pathforge_prompt_quota
  BEFORE INSERT ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_mutation_quota();

DROP TRIGGER IF EXISTS enforce_pathforge_source_run_quota ON public.source_run_submissions;
CREATE TRIGGER enforce_pathforge_source_run_quota
  BEFORE INSERT ON public.source_run_submissions
  FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_mutation_quota();

DROP TRIGGER IF EXISTS enforce_pathforge_suggestion_quota ON public.suggestions;
CREATE TRIGGER enforce_pathforge_suggestion_quota
  BEFORE INSERT ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_mutation_quota();

DROP TRIGGER IF EXISTS enforce_pathforge_build_request_quota ON public.build_requests;
CREATE TRIGGER enforce_pathforge_build_request_quota
  BEFORE INSERT ON public.build_requests
  FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_mutation_quota();

DROP TRIGGER IF EXISTS enforce_pathforge_build_response_quota ON public.build_request_responses;
CREATE TRIGGER enforce_pathforge_build_response_quota
  BEFORE INSERT ON public.build_request_responses
  FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_mutation_quota();

ALTER TABLE public.suggestions
  ADD CONSTRAINT suggestions_title_length CHECK (char_length(title) BETWEEN 4 AND 160) NOT VALID,
  ADD CONSTRAINT suggestions_body_length CHECK (char_length(body) BETWEEN 12 AND 5000) NOT VALID;
ALTER TABLE public.suggestions VALIDATE CONSTRAINT suggestions_title_length;
ALTER TABLE public.suggestions VALIDATE CONSTRAINT suggestions_body_length;

ALTER TABLE public.suggestion_responses
  ADD CONSTRAINT suggestion_responses_body_length CHECK (char_length(body) BETWEEN 1 AND 5000) NOT VALID;
ALTER TABLE public.suggestion_responses VALIDATE CONSTRAINT suggestion_responses_body_length;

CREATE OR REPLACE FUNCTION public.pathforge_touch_suggestion_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.suggestions
  SET updated_at = NOW()
  WHERE id = NEW.suggestion_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.pathforge_touch_suggestion_on_response()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS pathforge_touch_suggestion_on_response
  ON public.suggestion_responses;
CREATE TRIGGER pathforge_touch_suggestion_on_response
  AFTER INSERT ON public.suggestion_responses
  FOR EACH ROW EXECUTE FUNCTION public.pathforge_touch_suggestion_on_response();

ALTER TABLE public.build_requests
  ADD CONSTRAINT build_requests_title_length CHECK (char_length(title) BETWEEN 4 AND 160) NOT VALID,
  ADD CONSTRAINT build_requests_body_length CHECK (char_length(body) BETWEEN 20 AND 5000) NOT VALID;
ALTER TABLE public.build_requests VALIDATE CONSTRAINT build_requests_title_length;
ALTER TABLE public.build_requests VALIDATE CONSTRAINT build_requests_body_length;

ALTER TABLE public.build_request_responses
  ADD CONSTRAINT build_request_responses_body_length CHECK (char_length(body) BETWEEN 1 AND 5000) NOT VALID,
  ADD CONSTRAINT build_request_responses_pathforge_url CHECK (
    url IS NULL OR (
      char_length(url) <= 500
      AND url ~ '^/(prompt/[A-Za-z0-9-]+|[A-Za-z0-9-]+-demo)([?#].*)?$'
    )
  ) NOT VALID;
ALTER TABLE public.build_request_responses VALIDATE CONSTRAINT build_request_responses_body_length;
ALTER TABLE public.build_request_responses VALIDATE CONSTRAINT build_request_responses_pathforge_url;

CREATE OR REPLACE FUNCTION private.pathforge_require_suggestion_admin()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := (SELECT auth.uid());
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = actor_id AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN actor_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.pathforge_approve_suggestion(target_suggestion_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_id UUID;
BEGIN
  PERFORM private.pathforge_require_suggestion_admin();
  UPDATE public.suggestions
  SET moderation_status = 'approved',
      public_status = 'under_review',
      visibility = 'scheduled_public',
      approved_at = NOW(),
      scheduled_publish_at = NOW() + INTERVAL '24 hours',
      kept_private_at = NULL,
      updated_at = NOW()
  WHERE id = target_suggestion_id
  RETURNING id INTO updated_id;
  IF updated_id IS NULL THEN RAISE EXCEPTION 'Suggestion not found'; END IF;
  RETURN updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.pathforge_decline_suggestion(target_suggestion_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_id UUID;
BEGIN
  PERFORM private.pathforge_require_suggestion_admin();
  UPDATE public.suggestions
  SET moderation_status = 'declined',
      public_status = 'declined',
      visibility = 'private',
      updated_at = NOW()
  WHERE id = target_suggestion_id
  RETURNING id INTO updated_id;
  IF updated_id IS NULL THEN RAISE EXCEPTION 'Suggestion not found'; END IF;
  RETURN updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.pathforge_set_suggestion_public_status(
  target_suggestion_id UUID,
  target_public_status TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_id UUID;
BEGIN
  PERFORM private.pathforge_require_suggestion_admin();
  IF target_public_status NOT IN ('under_review', 'planned', 'shipped', 'declined') THEN
    RAISE EXCEPTION 'Invalid suggestion public status';
  END IF;

  UPDATE public.suggestions
  SET public_status = target_public_status,
      moderation_status = CASE
        WHEN target_public_status = 'declined' THEN 'declined'
        WHEN target_public_status IN ('planned', 'shipped') THEN 'approved'
        ELSE moderation_status
      END,
      visibility = CASE WHEN target_public_status = 'declined' THEN 'private' ELSE visibility END,
      updated_at = NOW()
  WHERE id = target_suggestion_id
  RETURNING id INTO updated_id;
  IF updated_id IS NULL THEN RAISE EXCEPTION 'Suggestion not found'; END IF;
  RETURN updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.pathforge_keep_suggestion_private(target_suggestion_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := (SELECT auth.uid());
  updated_id UUID;
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.suggestions
  SET visibility = 'private', kept_private_at = NOW(), updated_at = NOW()
  WHERE id = target_suggestion_id
    AND author_id = actor_id
    AND visibility = 'scheduled_public'
    AND scheduled_publish_at > NOW()
  RETURNING id INTO updated_id;
  IF updated_id IS NULL THEN RAISE EXCEPTION 'Suggestion cannot be kept private'; END IF;
  RETURN updated_id;
END;
$$;

REVOKE ALL ON FUNCTION private.pathforge_require_suggestion_admin() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.pathforge_approve_suggestion(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.pathforge_decline_suggestion(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.pathforge_set_suggestion_public_status(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.pathforge_keep_suggestion_private(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.pathforge_approve_suggestion(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.pathforge_decline_suggestion(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.pathforge_set_suggestion_public_status(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.pathforge_keep_suggestion_private(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pathforge_approve_suggestion(target_suggestion_id UUID)
RETURNS UUID LANGUAGE SQL SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.pathforge_approve_suggestion($1); $$;

CREATE OR REPLACE FUNCTION public.pathforge_decline_suggestion(target_suggestion_id UUID)
RETURNS UUID LANGUAGE SQL SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.pathforge_decline_suggestion($1); $$;

CREATE OR REPLACE FUNCTION public.pathforge_set_suggestion_public_status(
  target_suggestion_id UUID,
  target_public_status TEXT
)
RETURNS UUID LANGUAGE SQL SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.pathforge_set_suggestion_public_status($1, $2); $$;

CREATE OR REPLACE FUNCTION public.pathforge_keep_suggestion_private(target_suggestion_id UUID)
RETURNS UUID LANGUAGE SQL SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.pathforge_keep_suggestion_private($1); $$;

REVOKE ALL ON FUNCTION public.pathforge_approve_suggestion(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pathforge_decline_suggestion(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pathforge_set_suggestion_public_status(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pathforge_keep_suggestion_private(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pathforge_approve_suggestion(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pathforge_decline_suggestion(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pathforge_set_suggestion_public_status(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pathforge_keep_suggestion_private(UUID) TO authenticated, service_role;

-- OAuth providers do not reliably supply PathForge-specific profile fields.
-- Preserve an unset public handle for onboarding while still giving the new
-- account a usable display name.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'username'), ''),
    LEFT(COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'username'), ''),
      'PathForge builder'
    ), 60),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user()
  TO supabase_auth_admin;

NOTIFY pgrst, 'reload schema';
