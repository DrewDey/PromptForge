-- Keep Vercel's fail-closed release check on a small, indexed database path.
-- The function exposes only the same approved published/historical rows that
-- are already public through project_model_variants RLS.

CREATE OR REPLACE FUNCTION public.read_public_model_variant_registry(
  checked_source_run_ids TEXT[]
)
RETURNS TABLE (
  project_id UUID,
  source_run_id TEXT,
  source_package_sha256 TEXT,
  opening_prompt_sha256 TEXT,
  comparison_contract_sha256 TEXT,
  status TEXT,
  quality_status TEXT,
  is_current BOOLEAN,
  is_default BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    variant.project_id,
    variant.source_run_id,
    variant.source_package_sha256,
    variant.opening_prompt_sha256,
    variant.comparison_contract_sha256,
    variant.status,
    variant.quality_status,
    variant.is_current,
    variant.is_default
  FROM public.project_model_variants AS variant
  INNER JOIN public.prompts AS prompt
    ON prompt.id = variant.project_id
    AND prompt.status = 'approved'
  WHERE pg_catalog.cardinality(checked_source_run_ids) BETWEEN 1 AND 100
    AND variant.source_run_id = ANY (checked_source_run_ids)
    AND variant.status IN ('published', 'historical')
  ORDER BY variant.source_run_id;
$$;

REVOKE ALL ON FUNCTION public.read_public_model_variant_registry(TEXT[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_public_model_variant_registry(TEXT[])
  TO anon, authenticated, service_role;
