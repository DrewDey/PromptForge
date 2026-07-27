BEGIN;

-- Some prepared projects were already approved before their immutable legacy
-- source run could be imported. An exact service-reviewed import binding plus
-- an active verified public-share row is sufficient to display the provider
-- link for that existing project; it must not rewrite the project or pretend
-- the queued intake was newly published.
CREATE OR REPLACE FUNCTION public.read_public_source_run_share_link(
  checked_project_id UUID,
  checked_source_run_id UUID
)
RETURNS TABLE (
  project_id UUID,
  source_run_id UUID,
  public_share_url TEXT,
  provider_key TEXT,
  consent_obtained_at TIMESTAMPTZ,
  anonymous_access_verified_at TIMESTAMPTZ,
  access_state TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    link.project_id,
    link.source_run_id,
    link.public_share_url,
    link.provider_key,
    link.consent_obtained_at,
    link.anonymous_access_verified_at,
    link.access_state
  FROM public.source_run_public_share_links AS link
  INNER JOIN public.prompts AS project
    ON project.id = link.project_id
    AND project.status = 'approved'
  WHERE link.project_id = checked_project_id
    AND link.source_run_id = checked_source_run_id
    AND link.revoked_at IS NULL
    AND private.pathforge_public_provider_key(link.public_share_url)
      = link.provider_key
    AND (
      EXISTS (
        SELECT 1
        FROM public.source_run_submissions AS source_run
        WHERE source_run.id = link.source_run_id
          AND source_run.extracted_prompt_id = link.project_id
          AND source_run.status IN ('draft_created', 'published')
      )
      OR EXISTS (
        SELECT 1
        FROM private.legacy_prepared_source_run_imports AS legacy_import
        INNER JOIN public.source_run_submissions AS source_run
          ON source_run.id = legacy_import.source_run_id
        WHERE legacy_import.source_run_id = link.source_run_id
          AND legacy_import.expected_project_id = link.project_id
          AND source_run.status = 'queued'
          AND source_run.extracted_prompt_id IS NULL
          AND source_run.admin_notes IS NULL
          AND source_run.source_visibility = 'review_only'
          AND source_run.source_publication_consent_at IS NULL
          AND source_run.author_id = project.author_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_model_variants AS variant
        WHERE variant.project_id = link.project_id
          AND variant.source_run_id = link.source_run_id::TEXT
          AND variant.status IN ('published', 'historical')
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.read_public_source_run_share_link(UUID, UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_public_source_run_share_link(UUID, UUID)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
