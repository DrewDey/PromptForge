-- Split historical admin declines from genuine processing failures so My Forge
-- can present truthful next actions.

-- Declined is terminal just like failed. Closed historical submissions may
-- share a source URL with the one retained canonical intake.
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

NOTIFY pgrst, 'reload schema';
