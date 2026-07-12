-- Follow-up hardening from the post-deploy Supabase advisor pass.

-- Avoid overlapping permissive SELECT policies on public provenance while
-- retaining admin-only mutation rights.
DROP POLICY IF EXISTS "Admins control profile provenance"
  ON public.profile_provenance;

DROP POLICY IF EXISTS "Admins insert profile provenance"
  ON public.profile_provenance;
CREATE POLICY "Admins insert profile provenance"
  ON public.profile_provenance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins update profile provenance"
  ON public.profile_provenance;
CREATE POLICY "Admins update profile provenance"
  ON public.profile_provenance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins delete profile provenance"
  ON public.profile_provenance;
CREATE POLICY "Admins delete profile provenance"
  ON public.profile_provenance
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- Owner/admin source-run reads previously recalculated auth.uid() for every
-- candidate row and applied to the public role. Keep the same access boundary
-- with one initialization-plan lookup for signed-in users only.
DROP POLICY IF EXISTS "Users can view own source runs"
  ON public.source_run_submissions;
CREATE POLICY "Users can view own source runs"
  ON public.source_run_submissions
  FOR SELECT
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- Cover dashboard publication joins and the exact immutable artifact foreign
-- key used by variant-aware fork and repair records.
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_extracted_prompt
  ON public.source_run_submissions(extracted_prompt_id);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_exact_variant_artifact
  ON public.source_run_submissions(
    fork_source_model_variant_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_artifact_path,
    fork_source_artifact_sha256
  );

NOTIFY pgrst, 'reload schema';
