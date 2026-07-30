\set ON_ERROR_STOP on

DO $roles$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'postgres'
  ) THEN
    CREATE ROLE postgres
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin'
  ) THEN
    CREATE ROLE supabase_storage_admin
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END;
$roles$;

ALTER TABLE public.build_requests OWNER TO postgres;
ALTER TABLE public.build_request_responses OWNER TO postgres;
ALTER TABLE public.build_request_votes OWNER TO postgres;
ALTER FUNCTION public.touch_build_request_on_response() OWNER TO postgres;
ALTER FUNCTION public.update_build_request_vote_count() OWNER TO postgres;
ALTER FUNCTION private.enforce_pathforge_mutation_quota() OWNER TO postgres;

ALTER TABLE storage.objects OWNER TO supabase_storage_admin;
GRANT ALL PRIVILEGES ON TABLE storage.objects
  TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE storage.objects
  TO postgres WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON TABLE storage.objects
  TO supabase_storage_admin WITH GRANT OPTION;

GRANT ALL PRIVILEGES ON TABLE
  public.build_requests,
  public.build_request_responses,
  public.build_request_votes
TO service_role;

DROP POLICY "Users create unaccepted zero-vote build responses"
  ON public.build_request_responses;
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
      SELECT 1
      FROM public.build_requests
      WHERE build_requests.id = build_request_responses.request_id
        AND build_requests.status <> 'closed'
    )
  );

DROP POLICY "Build request votes visible to owners and admins"
  ON public.build_request_votes;
CREATE POLICY "Build request votes visible to owners and admins"
  ON public.build_request_votes FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

DROP POLICY "Users can remove own build request votes"
  ON public.build_request_votes;
CREATE POLICY "Users can remove own build request votes"
  ON public.build_request_votes FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY "Users vote on open build requests"
  ON public.build_request_votes;
CREATE POLICY "Users vote on open build requests"
  ON public.build_request_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.build_requests
      WHERE build_requests.id = build_request_votes.request_id
        AND build_requests.status <> 'closed'
    )
  );

DROP POLICY "Users create open zero-vote build requests"
  ON public.build_requests;
CREATE POLICY "Users create open zero-vote build requests"
  ON public.build_requests FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND status = 'open'
    AND vote_count = 0
    AND accepted_response_id IS NULL
  );

UPDATE public.test_request_authority_preflight_snapshot
SET fingerprint = public.test_request_authority_legacy_fingerprint()
WHERE singleton;
