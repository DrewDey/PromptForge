-- Activate the narrow Data API contract only after the compatible application
-- release is live. The preceding migration installs the RPCs, constraints,
-- response trigger, and quotas without breaking legacy clients.

REVOKE ALL ON TABLE public.suggestions, public.suggestion_responses, public.suggestion_votes
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.suggestions, public.suggestion_responses, public.suggestion_votes
  TO anon, authenticated;
GRANT INSERT (title, body, author_id) ON TABLE public.suggestions TO authenticated;
GRANT INSERT (suggestion_id, responder_id, body, visibility)
  ON TABLE public.suggestion_responses TO authenticated;
GRANT INSERT (user_id, suggestion_id), DELETE
  ON TABLE public.suggestion_votes TO authenticated;

DROP POLICY IF EXISTS "Users can create own suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users create pending private suggestions" ON public.suggestions;
CREATE POLICY "Users create pending private suggestions"
  ON public.suggestions FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND moderation_status = 'pending'
    AND public_status = 'under_review'
    AND visibility = 'private'
    AND vote_count = 0
    AND approved_at IS NULL
    AND scheduled_publish_at IS NULL
    AND kept_private_at IS NULL
  );

DROP POLICY IF EXISTS "Suggestion votes are visible by everyone" ON public.suggestion_votes;
DROP POLICY IF EXISTS "Suggestion votes visible to owners and admins" ON public.suggestion_votes;
CREATE POLICY "Suggestion votes visible to owners and admins"
  ON public.suggestion_votes FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

REVOKE ALL ON TABLE public.build_requests, public.build_request_responses, public.build_request_votes
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.build_requests, public.build_request_responses, public.build_request_votes
  TO anon, authenticated;
GRANT INSERT (title, body, author_id) ON TABLE public.build_requests TO authenticated;
GRANT INSERT (request_id, responder_id, prompt_id, url, body)
  ON TABLE public.build_request_responses TO authenticated;
GRANT INSERT (user_id, request_id), DELETE
  ON TABLE public.build_request_votes TO authenticated;

DROP POLICY IF EXISTS "Users can create own build requests" ON public.build_requests;
DROP POLICY IF EXISTS "Users create open zero-vote build requests" ON public.build_requests;
CREATE POLICY "Users create open zero-vote build requests"
  ON public.build_requests FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND status = 'open'
    AND vote_count = 0
    AND accepted_response_id IS NULL
  );

DROP POLICY IF EXISTS "Users can update own build requests" ON public.build_requests;

DROP POLICY IF EXISTS "Users can respond to build requests" ON public.build_request_responses;
DROP POLICY IF EXISTS "Users create unaccepted zero-vote build responses" ON public.build_request_responses;
CREATE POLICY "Users create unaccepted zero-vote build responses"
  ON public.build_request_responses FOR INSERT TO authenticated
  WITH CHECK (
    responder_id = (SELECT auth.uid())
    AND is_accepted = FALSE
    AND vote_count = 0
    AND (
      url IS NULL
      OR url ~ '^/(prompt/[A-Za-z0-9-]+|[A-Za-z0-9-]+-demo)([?#].*)?$'
    )
    AND EXISTS (
      SELECT 1 FROM public.build_requests
      WHERE build_requests.id = build_request_responses.request_id
        AND build_requests.status <> 'closed'
    )
  );

DROP POLICY IF EXISTS "Build request votes are visible by everyone" ON public.build_request_votes;
DROP POLICY IF EXISTS "Build request votes visible to owners and admins" ON public.build_request_votes;
CREATE POLICY "Build request votes visible to owners and admins"
  ON public.build_request_votes FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can vote on build requests" ON public.build_request_votes;
DROP POLICY IF EXISTS "Users vote on open build requests" ON public.build_request_votes;
CREATE POLICY "Users vote on open build requests"
  ON public.build_request_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.build_requests
      WHERE build_requests.id = build_request_votes.request_id
        AND build_requests.status <> 'closed'
    )
  );

DROP POLICY IF EXISTS "Users can add steps to their prompts" ON public.prompt_steps;

NOTIFY pgrst, 'reload schema';
