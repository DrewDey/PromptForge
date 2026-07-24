-- Keep the queue-only historical source-run intake working while the
-- invitation-only artifact pilot is evaluated. This is deliberately narrower
-- than restoring direct project publication: authenticated builders may only
-- create untouched queued rows that they own, and every public outcome still
-- requires the existing administrator publication path.
REVOKE INSERT ON TABLE public.source_run_submissions FROM authenticated;
GRANT INSERT (
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
) ON TABLE public.source_run_submissions TO authenticated;

DROP POLICY IF EXISTS "Users can submit own source runs"
  ON public.source_run_submissions;
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
    -- Historical repairs remain service-only so a browser insert cannot forge
    -- an append-only predecessor or replace the RPC-copied lineage tuple.
    AND resubmission_of_id IS NULL
  );

-- Provider share URLs are copied into reviewer and, by explicit consent,
-- public surfaces. Query strings and fragments are not required for supported
-- providers and can accidentally carry tracking or secret material.
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

  IF source_url !~* '^https://(chatgpt\.com/share/[A-Za-z0-9-]+|claude\.ai/share/[A-Za-z0-9-]+|g\.co/gemini/share/[A-Za-z0-9-]+|gemini\.google\.com/share/[A-Za-z0-9-]+)/?$' THEN
    RAISE EXCEPTION 'Use a public ChatGPT, Claude, or Gemini share link without a query string or fragment. Private conversation URLs are not accepted.';
  END IF;
END;
$$;

-- Fail closed for any record created before this stricter contract. Preserve
-- the provider share path, remove query/fragment material, and require a fresh
-- anonymous check before the link can become public again.
UPDATE public.community_project_submissions
SET source_url = pg_catalog.regexp_replace(source_url, '[?#].*$', ''),
    source_visibility = 'review_only',
    source_access_status = 'not_checked',
    source_checked_at = NULL,
    source_checked_by = NULL,
    updated_at = NOW()
WHERE source_url IS NOT NULL
  AND source_url ~ '[?#]';

NOTIFY pgrst, 'reload schema';
