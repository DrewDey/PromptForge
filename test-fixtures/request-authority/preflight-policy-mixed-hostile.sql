\set ON_ERROR_STOP on
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
