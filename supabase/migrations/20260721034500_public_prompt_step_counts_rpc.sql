-- Public catalog/profile reads need exact prompt cardinality without transferring
-- the multi-megabyte prompt-step bodies. Keep the privileged projection narrow,
-- approved-only, and bounded to one public list page.

CREATE OR REPLACE FUNCTION public.read_public_prompt_step_counts(
  checked_prompt_ids UUID[]
)
RETURNS TABLE (
  prompt_id UUID,
  step_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    prompt.id AS prompt_id,
    COUNT(step.id)::INTEGER AS step_count
  FROM public.prompts AS prompt
  LEFT JOIN public.prompt_steps AS step
    ON step.prompt_id = prompt.id
  WHERE pg_catalog.cardinality(checked_prompt_ids) BETWEEN 1 AND 300
    AND prompt.id = ANY (checked_prompt_ids)
    AND prompt.status = 'approved'
  GROUP BY prompt.id
  ORDER BY prompt.id;
$$;

REVOKE ALL ON FUNCTION public.read_public_prompt_step_counts(UUID[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_public_prompt_step_counts(UUID[])
  TO anon, authenticated, service_role;
