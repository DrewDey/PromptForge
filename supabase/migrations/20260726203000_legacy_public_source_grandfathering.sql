-- Preserve immutable provider-session evidence without treating it as a public
-- link. Public provider shares live in a separate, revocable registry and are
-- projected only for the exact approved project/source-run pair.

CREATE OR REPLACE FUNCTION private.pathforge_public_provider_key(candidate_url TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN candidate_url ~ '^https://chatgpt\.com/(share/[A-Za-z0-9_-]+|s/[A-Za-z0-9_-]+)/?$'
      THEN 'openai'
    WHEN candidate_url ~ '^https://claude\.ai/share/[A-Za-z0-9_-]+/?$'
      THEN 'anthropic'
    WHEN candidate_url ~ '^https://(share\.gemini\.google/[A-Za-z0-9_-]+|g\.co/gemini/share/[A-Za-z0-9_-]+|gemini\.google\.com/share/[A-Za-z0-9_-]+)/?$'
      THEN 'google'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION private.pathforge_public_provider_key(TEXT)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.pathforge_validate_private_provider_locator(
  candidate_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF candidate_url IS NULL
    OR candidate_url IS DISTINCT FROM pg_catalog.btrim(candidate_url)
    OR pg_catalog.length(candidate_url) > 4000
    OR candidate_url !~ '^https://(chatgpt\.com|chat\.openai\.com|claude\.ai|share\.gemini\.google|gemini\.google\.com|aistudio\.google\.com|g\.co|openrouter\.ai)/[^[:space:]]+$' THEN
    RAISE EXCEPTION 'Legacy source evidence must be an allowlisted secure provider locator.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.pathforge_validate_private_provider_locator(TEXT)
  FROM PUBLIC, anon, authenticated;

-- Keep the historical callable name for ordinary intake, but make the accepted
-- public-share set match the catalog registry. Private locators are accepted
-- only through the service-only import lane below.
CREATE OR REPLACE FUNCTION private.pathforge_validate_legacy_source_run_url(
  source_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF source_url IS NULL THEN
    RETURN;
  END IF;
  IF private.pathforge_public_provider_key(source_url) IS NULL THEN
    RAISE EXCEPTION 'Use a supported public provider share link without a query string or fragment. Private conversation URLs are not accepted.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.guard_legacy_source_run_public_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') = 'service_role'
    AND NEW.source_visibility = 'review_only'
    AND pg_catalog.current_setting(
      'pathforge.legacy_source_import_id',
      TRUE
    ) = NEW.id::TEXT THEN
    PERFORM private.pathforge_validate_private_provider_locator(NEW.source_url);
  ELSE
    PERFORM private.pathforge_validate_legacy_source_run_url(NEW.source_url);
  END IF;

  IF NEW.source_visibility = 'public'
    AND (NEW.source_url IS NULL OR NEW.source_publication_consent_at IS NULL) THEN
    RAISE EXCEPTION 'Public source links require explicit contributor consent.';
  END IF;
  IF TG_OP = 'UPDATE'
    AND NEW.source_visibility = 'public'
    AND (
      NEW.source_url IS DISTINCT FROM OLD.source_url
      OR OLD.source_visibility IS DISTINCT FROM 'public'
    )
    AND NEW.source_publication_consent_at IS NOT DISTINCT FROM OLD.source_publication_consent_at THEN
    RAISE EXCEPTION 'Changing a public source link requires renewed explicit contributor consent.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_legacy_source_run_public_link()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_legacy_source_run_public_link
  ON public.source_run_submissions;
CREATE TRIGGER guard_legacy_source_run_public_link
  BEFORE INSERT OR UPDATE OF source_url, source_visibility, source_publication_consent_at
  ON public.source_run_submissions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_legacy_source_run_public_link();

-- Distinct immutable runs may legitimately share one private archival locator.
-- Preserve ordinary public-intake duplicate protection without conflating those
-- private runs.
DROP INDEX IF EXISTS public.idx_source_run_submissions_active_source_url;
DROP INDEX IF EXISTS public.idx_source_run_submissions_active_author_source_url;
DROP INDEX IF EXISTS public.idx_source_run_submissions_active_canonical_source_url;
DROP INDEX IF EXISTS public.idx_source_run_submissions_active_author_canonical_source_url;
CREATE UNIQUE INDEX idx_source_run_submissions_active_source_url
  ON public.source_run_submissions(source_url)
  WHERE source_url IS NOT NULL
    AND source_visibility = 'public'
    AND status NOT IN ('failed', 'declined');
CREATE UNIQUE INDEX idx_source_run_submissions_active_author_source_url
  ON public.source_run_submissions(author_id, source_url)
  WHERE source_url IS NOT NULL
    AND source_visibility = 'public'
    AND status NOT IN ('failed', 'declined');
CREATE UNIQUE INDEX idx_source_run_submissions_active_canonical_source_url
  ON public.source_run_submissions(canonical_source_url)
  WHERE canonical_source_url IS NOT NULL
    AND source_visibility = 'public'
    AND status NOT IN ('failed', 'declined');
CREATE UNIQUE INDEX idx_source_run_submissions_active_author_canonical_source_url
  ON public.source_run_submissions(author_id, canonical_source_url)
  WHERE canonical_source_url IS NOT NULL
    AND source_visibility = 'public'
    AND status NOT IN ('failed', 'declined');

-- Persist the exact project identity supplied to the narrow legacy importer.
-- Keeping this ledger private avoids exposing archival intake metadata, while
-- its restrictive FK protects only imported package evidence from cascade
-- deletion (the global source-run author FK remains unchanged).
CREATE TABLE private.legacy_prepared_source_run_imports (
  source_run_id UUID PRIMARY KEY
    REFERENCES public.source_run_submissions(id) ON DELETE RESTRICT,
  expected_project_id UUID NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON TABLE private.legacy_prepared_source_run_imports
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE private.legacy_prepared_source_run_imports
  TO service_role;

CREATE TABLE IF NOT EXISTS public.source_run_public_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_run_id UUID NOT NULL
    REFERENCES public.source_run_submissions(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL,
  public_share_url TEXT NOT NULL,
  provider_key TEXT NOT NULL CHECK (
    provider_key IN ('openai', 'anthropic', 'google')
  ),
  consent_obtained_at TIMESTAMPTZ NOT NULL,
  anonymous_access_verified_at TIMESTAMPTZ NOT NULL,
  anonymous_access_verified_by UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  access_state TEXT NOT NULL CHECK (
    access_state IN ('public_exact', 'public_partial')
  ),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT source_run_public_share_links_url_check CHECK (
    public_share_url = BTRIM(public_share_url)
    AND LENGTH(public_share_url) <= 2000
    AND private.pathforge_public_provider_key(public_share_url) = provider_key
  ),
  CONSTRAINT source_run_public_share_links_revocation_check CHECK (
    (
      revoked_at IS NULL
      AND revoked_by IS NULL
      AND revocation_reason IS NULL
    )
    OR (
      revoked_at IS NOT NULL
      AND revoked_by IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(revocation_reason, '')), '') IS NOT NULL
      AND LENGTH(revocation_reason) <= 1000
    )
  ),
  CONSTRAINT source_run_public_share_links_verification_order_check CHECK (
    anonymous_access_verified_at >= consent_obtained_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_run_public_share_links_one_active
  ON public.source_run_public_share_links(source_run_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_source_run_public_share_links_public_lookup
  ON public.source_run_public_share_links(project_id, source_run_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.source_run_public_share_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.source_run_public_share_links
  FROM PUBLIC, anon, authenticated;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.source_run_public_share_links FROM service_role;
REVOKE INSERT, UPDATE
  ON TABLE public.source_run_public_share_links FROM service_role;
GRANT SELECT
  ON TABLE public.source_run_public_share_links TO service_role;

CREATE OR REPLACE FUNCTION private.preserve_source_run_public_share_link_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Public source-link evidence is retained; revoke it instead.';
  END IF;
  IF NEW.source_run_id IS DISTINCT FROM OLD.source_run_id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.public_share_url IS DISTINCT FROM OLD.public_share_url
    OR NEW.provider_key IS DISTINCT FROM OLD.provider_key
    OR NEW.consent_obtained_at IS DISTINCT FROM OLD.consent_obtained_at
    OR NEW.anonymous_access_verified_at IS DISTINCT FROM OLD.anonymous_access_verified_at
    OR NEW.anonymous_access_verified_by IS DISTINCT FROM OLD.anonymous_access_verified_by
    OR NEW.access_state IS DISTINCT FROM OLD.access_state
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Registered public source-link evidence is immutable; revoke and append a replacement.';
  END IF;
  IF OLD.revoked_at IS NOT NULL
    OR NEW.revoked_at IS NULL
    OR NEW.revoked_by IS NULL
    OR NULLIF(BTRIM(COALESCE(NEW.revocation_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Public source-link evidence may only transition once from active to revoked.';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.preserve_source_run_public_share_link_evidence()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS preserve_source_run_public_share_link_evidence
  ON public.source_run_public_share_links;
CREATE TRIGGER preserve_source_run_public_share_link_evidence
  BEFORE UPDATE OR DELETE
  ON public.source_run_public_share_links
  FOR EACH ROW
  EXECUTE FUNCTION private.preserve_source_run_public_share_link_evidence();

CREATE OR REPLACE FUNCTION private.source_run_public_share_is_publishable(
  checked_project_id UUID,
  checked_source_run_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.source_run_public_share_links AS link
    WHERE link.project_id = checked_project_id
      AND link.source_run_id = checked_source_run_id
      AND link.revoked_at IS NULL
      AND private.pathforge_public_provider_key(link.public_share_url)
        = link.provider_key
  );
$$;

REVOKE ALL ON FUNCTION private.source_run_public_share_is_publishable(UUID, UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.register_source_run_public_share_link(
  target_source_run_id UUID,
  target_project_id UUID,
  target_public_share_url TEXT,
  target_provider_key TEXT,
  target_consent_obtained_at TIMESTAMPTZ,
  target_anonymous_access_verified_at TIMESTAMPTZ,
  target_anonymous_access_verified_by UUID,
  target_access_state TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_link public.source_run_public_share_links%ROWTYPE;
  inserted_id UUID;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF target_source_run_id IS NULL
    OR target_project_id IS NULL
    OR target_consent_obtained_at IS NULL
    OR target_anonymous_access_verified_at IS NULL
    OR target_anonymous_access_verified_by IS NULL
    OR target_consent_obtained_at > NOW()
    OR target_anonymous_access_verified_at > NOW()
    OR target_anonymous_access_verified_at < target_consent_obtained_at
    OR target_access_state NOT IN ('public_exact', 'public_partial')
    OR private.pathforge_public_provider_key(target_public_share_url)
      IS DISTINCT FROM target_provider_key THEN
    RAISE EXCEPTION 'Public source-link registration is incomplete or invalid.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions AS source_run
    WHERE source_run.id = target_source_run_id
      AND (
        source_run.extracted_prompt_id = target_project_id
        OR EXISTS (
          SELECT 1
          FROM private.legacy_prepared_source_run_imports AS legacy_import
          WHERE legacy_import.source_run_id = source_run.id
            AND legacy_import.expected_project_id = target_project_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.project_model_variants AS variant
          WHERE variant.source_run_id = source_run.id::TEXT
            AND variant.project_id = target_project_id
            AND variant.status IN ('published', 'historical')
        )
      )
  ) THEN
    RAISE EXCEPTION 'The public source link does not match the source-run project binding.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_source_run_id::TEXT || '|public-source-link',
      0
    )
  );
  SELECT *
  INTO existing_link
  FROM public.source_run_public_share_links AS link
  WHERE link.source_run_id = target_source_run_id
    AND link.revoked_at IS NULL
  FOR UPDATE;

  IF FOUND THEN
    IF ROW(
      existing_link.project_id,
      existing_link.public_share_url,
      existing_link.provider_key,
      existing_link.consent_obtained_at,
      existing_link.anonymous_access_verified_at,
      existing_link.anonymous_access_verified_by,
      existing_link.access_state
    ) IS DISTINCT FROM ROW(
      target_project_id,
      target_public_share_url,
      target_provider_key,
      target_consent_obtained_at,
      target_anonymous_access_verified_at,
      target_anonymous_access_verified_by,
      target_access_state
    ) THEN
      RAISE EXCEPTION 'A different active public source link is already registered for this source run.';
    END IF;
    RETURN existing_link.id;
  END IF;

  INSERT INTO public.source_run_public_share_links (
    source_run_id,
    project_id,
    public_share_url,
    provider_key,
    consent_obtained_at,
    anonymous_access_verified_at,
    anonymous_access_verified_by,
    access_state
  ) VALUES (
    target_source_run_id,
    target_project_id,
    target_public_share_url,
    target_provider_key,
    target_consent_obtained_at,
    target_anonymous_access_verified_at,
    target_anonymous_access_verified_by,
    target_access_state
  )
  RETURNING id INTO inserted_id;
  RETURN inserted_id;
END;
$$;

REVOKE ALL ON FUNCTION private.register_source_run_public_share_link(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.register_source_run_public_share_link(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT
) TO service_role;

CREATE OR REPLACE FUNCTION public.register_source_run_public_share_link(
  target_source_run_id UUID,
  target_project_id UUID,
  target_public_share_url TEXT,
  target_provider_key TEXT,
  target_consent_obtained_at TIMESTAMPTZ,
  target_anonymous_access_verified_at TIMESTAMPTZ,
  target_anonymous_access_verified_by UUID,
  target_access_state TEXT
)
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.register_source_run_public_share_link(
    $1, $2, $3, $4, $5, $6, $7, $8
  );
$$;

REVOKE ALL ON FUNCTION public.register_source_run_public_share_link(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_source_run_public_share_link(
  UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT
) TO service_role;

CREATE OR REPLACE FUNCTION private.revoke_source_run_public_share_link(
  target_source_run_id UUID,
  actor UUID,
  reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF actor IS NULL
    OR NULLIF(BTRIM(COALESCE(reason, '')), '') IS NULL
    OR LENGTH(reason) > 1000 THEN
    RAISE EXCEPTION 'Public source-link revocation requires an operator and reason.';
  END IF;
  UPDATE public.source_run_public_share_links
  SET revoked_at = NOW(),
      revoked_by = actor,
      revocation_reason = BTRIM(reason)
  WHERE source_run_id = target_source_run_id
    AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active public source link exists for this source run.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.revoke_source_run_public_share_link(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.revoke_source_run_public_share_link(UUID, UUID, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_source_run_public_share_link(
  target_source_run_id UUID,
  actor UUID,
  reason TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.revoke_source_run_public_share_link($1, $2, $3);
$$;

REVOKE ALL ON FUNCTION public.revoke_source_run_public_share_link(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_source_run_public_share_link(UUID, UUID, TEXT)
  TO service_role;

-- Public readers receive only the approved, exact, active projection. The raw
-- source_run_submissions and project_model_variants locators remain private.
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

CREATE OR REPLACE FUNCTION public.check_source_run_public_share_for_publication(
  checked_project_id UUID,
  checked_source_run_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role = 'admin'
    ) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;
  RETURN private.source_run_public_share_is_publishable(
    checked_project_id,
    checked_source_run_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_source_run_public_share_for_publication(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_source_run_public_share_for_publication(UUID, UUID)
  TO authenticated, service_role;

-- The service-only import lane preserves exact private provider locators. It is
-- idempotent for identical immutable evidence and never creates public-link or
-- publication state.
CREATE OR REPLACE FUNCTION private.import_legacy_prepared_source_run(
  target_source_run_id UUID,
  target_expected_project_id UUID,
  immutable_intake JSONB,
  immutable_fork JSONB
)
RETURNS TABLE (
  source_run_id UUID,
  status TEXT,
  inserted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_source_run public.source_run_submissions%ROWTYPE;
  actual_intake JSONB;
  actual_fork JSONB;
  normalized_fork JSONB := COALESCE(immutable_fork, 'null'::JSONB);
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF target_source_run_id IS NULL OR target_expected_project_id IS NULL THEN
    RAISE EXCEPTION 'Legacy import requires exact source-run and project identities.';
  END IF;
  IF jsonb_typeof(immutable_intake) IS DISTINCT FROM 'object'
    OR NOT (immutable_intake ?& ARRAY[
      'author_id',
      'title',
      'source_url',
      'canonical_source_url',
      'file_name',
      'notes',
      'source_package_file',
      'source_package_sha256',
      'intake_evidence'
    ])
    OR immutable_intake - ARRAY[
      'author_id',
      'title',
      'source_url',
      'canonical_source_url',
      'file_name',
      'notes',
      'source_package_file',
      'source_package_sha256',
      'intake_evidence'
    ] <> '{}'::JSONB
    OR immutable_intake->'file_name' IS DISTINCT FROM 'null'::JSONB
    OR NULLIF(BTRIM(immutable_intake->>'title'), '') IS NULL
    OR NULLIF(BTRIM(immutable_intake->>'source_package_file'), '') IS NULL
    OR COALESCE(immutable_intake->>'source_package_sha256', '') !~ '^[0-9a-f]{64}$'
    OR jsonb_typeof(immutable_intake->'intake_evidence') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Legacy immutable intake payload is malformed or contains unsupported fields.';
  END IF;
  PERFORM private.pathforge_validate_private_provider_locator(
    immutable_intake->>'source_url'
  );
  PERFORM private.pathforge_validate_private_provider_locator(
    immutable_intake->>'canonical_source_url'
  );

  IF normalized_fork <> 'null'::JSONB
    AND (
      jsonb_typeof(normalized_fork) IS DISTINCT FROM 'object'
      OR NOT (normalized_fork ?& ARRAY[
        'source_project_id',
        'source_project_title',
        'source_model_variant_id',
        'source_run_id',
        'source_step_id',
        'source_step_number',
        'source_artifact_path',
        'source_artifact_sha256',
        'parent_fork_id',
        'prompt_family_id',
        'fork_depth',
        'fork_branch_index'
      ])
      OR normalized_fork - ARRAY[
        'source_project_id',
        'source_project_title',
        'source_model_variant_id',
        'source_run_id',
        'source_step_id',
        'source_step_number',
        'source_artifact_path',
        'source_artifact_sha256',
        'parent_fork_id',
        'prompt_family_id',
        'fork_depth',
        'fork_branch_index'
      ] <> '{}'::JSONB
    ) THEN
    RAISE EXCEPTION 'Legacy immutable fork payload is malformed or contains unsupported fields.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.source_run_public_share_links AS link
    WHERE link.source_run_id = target_source_run_id
      AND link.revoked_at IS NULL
      AND link.project_id IS DISTINCT FROM target_expected_project_id
  ) THEN
    RAISE EXCEPTION 'The active public source link belongs to a different prepared project.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_source_run_id::TEXT || '|legacy-import', 0)
  );
  SELECT *
  INTO existing_source_run
  FROM public.source_run_submissions AS source_run
  WHERE source_run.id = target_source_run_id
  FOR UPDATE;

  IF FOUND THEN
    actual_intake := jsonb_build_object(
      'author_id', existing_source_run.author_id,
      'title', existing_source_run.title,
      'source_url', existing_source_run.source_url,
      'canonical_source_url', existing_source_run.canonical_source_url,
      'file_name', existing_source_run.file_name,
      'notes', existing_source_run.notes,
      'source_package_file', existing_source_run.source_package_file,
      'source_package_sha256', existing_source_run.source_package_sha256,
      'intake_evidence', existing_source_run.intake_evidence
    );
    actual_fork := CASE
      WHEN NULLIF(BTRIM(COALESCE(existing_source_run.fork_source_project_id, '')), '') IS NULL
        THEN 'null'::JSONB
      ELSE jsonb_build_object(
        'source_project_id', existing_source_run.fork_source_project_id,
        'source_project_title', existing_source_run.fork_source_project_title,
        'source_model_variant_id', existing_source_run.fork_source_model_variant_id,
        'source_run_id', existing_source_run.fork_source_run_id,
        'source_step_id', existing_source_run.fork_source_step_id,
        'source_step_number', existing_source_run.fork_source_step_number,
        'source_artifact_path', existing_source_run.fork_source_artifact_path,
        'source_artifact_sha256', existing_source_run.fork_source_artifact_sha256,
        'parent_fork_id', existing_source_run.fork_parent_submission_id,
        'prompt_family_id', existing_source_run.prompt_family_id,
        'fork_depth', existing_source_run.fork_depth,
        'fork_branch_index', existing_source_run.fork_branch_index
      )
    END;
    IF actual_intake IS DISTINCT FROM immutable_intake
      OR actual_fork IS DISTINCT FROM normalized_fork THEN
      RAISE EXCEPTION 'Source-run identity already belongs to different immutable evidence.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM private.legacy_prepared_source_run_imports AS legacy_import
      WHERE legacy_import.source_run_id = target_source_run_id
        AND legacy_import.expected_project_id IS DISTINCT FROM target_expected_project_id
    ) THEN
      RAISE EXCEPTION 'Source-run identity is bound to a different prepared project.';
    END IF;
    INSERT INTO private.legacy_prepared_source_run_imports (
      source_run_id,
      expected_project_id
    ) VALUES (
      target_source_run_id,
      target_expected_project_id
    )
    ON CONFLICT ON CONSTRAINT legacy_prepared_source_run_imports_pkey
      DO NOTHING;
    RETURN QUERY
      SELECT existing_source_run.id, existing_source_run.status, FALSE;
    RETURN;
  END IF;

  PERFORM pg_catalog.set_config(
    'pathforge.legacy_source_import_id',
    target_source_run_id::TEXT,
    TRUE
  );
  INSERT INTO public.source_run_submissions (
    id,
    title,
    source_url,
    canonical_source_url,
    file_name,
    notes,
    source_package_file,
    source_package_sha256,
    intake_evidence,
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
    author_id,
    source_visibility,
    source_publication_consent_at,
    status
  ) VALUES (
    target_source_run_id,
    immutable_intake->>'title',
    immutable_intake->>'source_url',
    immutable_intake->>'canonical_source_url',
    NULL,
    immutable_intake->>'notes',
    immutable_intake->>'source_package_file',
    immutable_intake->>'source_package_sha256',
    immutable_intake->'intake_evidence',
    normalized_fork->>'source_project_id',
    normalized_fork->>'source_project_title',
    NULLIF(normalized_fork->>'source_model_variant_id', '')::UUID,
    normalized_fork->>'source_run_id',
    normalized_fork->>'source_step_id',
    NULLIF(normalized_fork->>'source_step_number', '')::INT,
    normalized_fork->>'source_artifact_path',
    normalized_fork->>'source_artifact_sha256',
    normalized_fork->>'parent_fork_id',
    normalized_fork->>'prompt_family_id',
    COALESCE(NULLIF(normalized_fork->>'fork_depth', '')::INT, 0),
    COALESCE(NULLIF(normalized_fork->>'fork_branch_index', '')::INT, 0),
    (immutable_intake->>'author_id')::UUID,
    'review_only',
    NULL,
    'queued'
  )
  RETURNING source_run_submissions.id, source_run_submissions.status
  INTO source_run_id, status;
  PERFORM pg_catalog.set_config(
    'pathforge.legacy_source_import_id',
    '',
    TRUE
  );
  INSERT INTO private.legacy_prepared_source_run_imports (
    source_run_id,
    expected_project_id
  ) VALUES (
    target_source_run_id,
    target_expected_project_id
  );
  inserted := TRUE;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION private.import_legacy_prepared_source_run(
  UUID, UUID, JSONB, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.import_legacy_prepared_source_run(
  UUID, UUID, JSONB, JSONB
) TO service_role;

CREATE OR REPLACE FUNCTION public.import_legacy_prepared_source_run(
  target_source_run_id UUID,
  expected_project_id UUID,
  immutable_intake JSONB,
  immutable_fork JSONB
)
RETURNS TABLE (
  source_run_id UUID,
  status TEXT,
  inserted BOOLEAN
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM private.import_legacy_prepared_source_run($1, $2, $3, $4);
$$;

REVOKE ALL ON FUNCTION public.import_legacy_prepared_source_run(
  UUID, UUID, JSONB, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_legacy_prepared_source_run(
  UUID, UUID, JSONB, JSONB
) TO service_role;

-- Imported legacy packages depend on the separate exact public-share record.
-- Ordinary public-share intake keeps the existing source-row consent gate so
-- it can publish before an operator appends the separately verified display
-- projection. Legacy source_url remains part of the package/hash identity
-- check and is never used as a public fallback.
CREATE OR REPLACE FUNCTION private.require_legacy_source_run_publication_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  publication_transition BOOLEAN;
  legacy_expected_project_id UUID;
  is_legacy_import BOOLEAN;
BEGIN
  publication_transition := (
    (
      TG_OP = 'INSERT'
      AND (NEW.status = 'draft_created' OR NEW.extracted_prompt_id IS NOT NULL)
    )
    OR (
      TG_OP = 'UPDATE'
      AND (
        (NEW.status = 'draft_created' AND OLD.status IS DISTINCT FROM 'draft_created')
        OR (
          NEW.extracted_prompt_id IS NOT NULL
          AND NEW.extracted_prompt_id IS DISTINCT FROM OLD.extracted_prompt_id
        )
        OR (
          NEW.status = 'draft_created'
          AND (
            NEW.source_url IS DISTINCT FROM OLD.source_url
            OR NEW.source_visibility IS DISTINCT FROM OLD.source_visibility
            OR NEW.source_publication_consent_at IS DISTINCT FROM OLD.source_publication_consent_at
          )
        )
      )
    )
  );
  IF NOT publication_transition THEN
    RETURN NEW;
  END IF;

  SELECT legacy_import.expected_project_id
  INTO legacy_expected_project_id
  FROM private.legacy_prepared_source_run_imports AS legacy_import
  WHERE legacy_import.source_run_id = NEW.id;
  is_legacy_import := FOUND;

  IF is_legacy_import THEN
    IF NEW.extracted_prompt_id IS DISTINCT FROM legacy_expected_project_id
      OR NOT private.source_run_public_share_is_publishable(
        legacy_expected_project_id,
        NEW.id
      ) THEN
      RAISE EXCEPTION 'Prepared publication requires a separately consented and anonymously verified public source link.';
    END IF;
  ELSIF NEW.source_visibility IS DISTINCT FROM 'public'
    OR NEW.source_url IS NULL
    OR NEW.source_publication_consent_at IS NULL
    OR private.pathforge_public_provider_key(NEW.source_url) IS NULL THEN
    RAISE EXCEPTION 'Prepared publication requires explicit consent for the public source link.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.require_legacy_source_run_publication_consent()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS require_legacy_source_run_publication_consent_on_insert
  ON public.source_run_submissions;
CREATE TRIGGER require_legacy_source_run_publication_consent_on_insert
  BEFORE INSERT
  ON public.source_run_submissions
  FOR EACH ROW
  EXECUTE FUNCTION private.require_legacy_source_run_publication_consent();

DROP TRIGGER IF EXISTS require_legacy_source_run_publication_consent_on_update
  ON public.source_run_submissions;
CREATE TRIGGER require_legacy_source_run_publication_consent_on_update
  BEFORE UPDATE OF
    status,
    extracted_prompt_id,
    source_url,
    source_visibility,
    source_publication_consent_at
  ON public.source_run_submissions
  FOR EACH ROW
  EXECUTE FUNCTION private.require_legacy_source_run_publication_consent();

-- Prevent authenticated admins from bypassing the public wrapper and replaying
-- publication without the new exact link gate.
REVOKE ALL ON FUNCTION private.publish_prepared_showcase_source_run(
  UUID, JSONB, JSONB, JSONB
) FROM authenticated;
GRANT EXECUTE ON FUNCTION private.publish_prepared_showcase_source_run(
  UUID, JSONB, JSONB, JSONB
) TO service_role;

CREATE OR REPLACE FUNCTION public.publish_prepared_showcase_source_run(
  target_source_run_id UUID,
  expected_intake JSONB,
  expected_fork JSONB,
  project_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_project_id UUID;
  target_source_run public.source_run_submissions%ROWTYPE;
  legacy_expected_project_id UUID;
  is_legacy_import BOOLEAN;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role = 'admin'
    ) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;
  IF jsonb_typeof(project_payload) IS DISTINCT FROM 'object'
    OR NULLIF(BTRIM(project_payload->>'id'), '') IS NULL THEN
    RAISE EXCEPTION 'Prepared project payload is malformed or missing its identity.';
  END IF;
  target_project_id := (project_payload->>'id')::UUID;

  SELECT *
  INTO target_source_run
  FROM public.source_run_submissions AS source_run
  WHERE source_run.id = target_source_run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source run not found.';
  END IF;

  SELECT legacy_import.expected_project_id
  INTO legacy_expected_project_id
  FROM private.legacy_prepared_source_run_imports AS legacy_import
  WHERE legacy_import.source_run_id = target_source_run_id;
  is_legacy_import := FOUND;

  IF is_legacy_import THEN
    IF target_project_id IS DISTINCT FROM legacy_expected_project_id
      OR NOT private.source_run_public_share_is_publishable(
        legacy_expected_project_id,
        target_source_run_id
      ) THEN
      RAISE EXCEPTION 'Prepared publication requires a separately consented and anonymously verified public source link.';
    END IF;
  ELSIF target_source_run.source_visibility IS DISTINCT FROM 'public'
    OR target_source_run.source_url IS NULL
    OR target_source_run.source_publication_consent_at IS NULL
    OR private.pathforge_public_provider_key(target_source_run.source_url) IS NULL THEN
    RAISE EXCEPTION 'Prepared publication requires explicit consent for the public source link.';
  END IF;

  RETURN private.publish_prepared_showcase_source_run(
    target_source_run_id,
    expected_intake,
    expected_fork,
    project_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_prepared_showcase_source_run(
  UUID, JSONB, JSONB, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_prepared_showcase_source_run(
  UUID, JSONB, JSONB, JSONB
) TO authenticated, service_role;

-- Model-variant source_url is also immutable private evidence. Keep it available
-- to service operations while removing it from anonymous/authenticated Data API
-- column grants.
REVOKE SELECT (source_url)
  ON TABLE public.project_model_variants FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
