DO $$
DECLARE
  preserved_valid_rows INT;
  preserved_invalid_rows INT;
  preserved_grandfathered_pairs INT;
BEGIN
  SELECT COUNT(*) INTO preserved_valid_rows
  FROM public.prompts
  WHERE id BETWEEN
    '71500000-0000-4000-8000-000000000001'
    AND '71500000-0000-4000-8000-000000000005';
  IF preserved_valid_rows <> 5 THEN
    RAISE EXCEPTION 'Failed provenance preflight changed valid source rows.';
  END IF;

  SELECT COUNT(*) INTO preserved_invalid_rows
  FROM public.prompts
  WHERE
    (
      id = '71900000-0000-4000-8000-000000000001'
      AND fork_source_model_variant_id =
        '73000000-0000-4000-8000-000000000999'
      AND fork_source_run_id = 'valid-run-a'
      AND fork_source_step_id = 'valid-run-a:step:1'
      AND fork_source_artifact_path = 'public/artifacts/valid-run-a.html'
      AND fork_source_artifact_sha256 = 'sha-valid-run-a'
    )
    OR (
      id = '71900000-0000-4000-8000-000000000002'
      AND fork_source_model_variant_id =
        '71200000-0000-4000-8000-000000000002'
      AND fork_source_run_id = 'foreign-run'
      AND fork_source_step_id = 'foreign-run:step:1'
      AND fork_source_artifact_path = 'public/artifacts/foreign-run.html'
      AND fork_source_artifact_sha256 = 'sha-foreign-run'
    )
    OR (
      id = '71900000-0000-4000-8000-000000000003'
      AND fork_source_model_variant_id =
        '71200000-0000-4000-8000-000000000001'
      AND fork_source_run_id = 'wrong-run'
      AND fork_source_step_id = 'valid-run-a:step:1'
      AND fork_source_artifact_path = 'public/artifacts/valid-run-a.html'
      AND fork_source_artifact_sha256 = 'sha-valid-run-a'
    )
    OR (
      id = '71900000-0000-4000-8000-000000000004'
      AND fork_source_model_variant_id =
        '71200000-0000-4000-8000-000000000001'
      AND fork_source_run_id = 'valid-run-a'
      AND fork_source_step_id = 'valid-run-a:step:1'
      AND fork_source_artifact_path = 'public/artifacts/wrong.html'
      AND fork_source_artifact_sha256 = 'sha-wrong'
    );
  IF preserved_invalid_rows <> 4 THEN
    RAISE EXCEPTION 'Failed provenance preflight rewrote false legacy evidence.';
  END IF;

  SELECT COUNT(*) INTO preserved_grandfathered_pairs
  FROM private.prepared_legacy_seed_profile_bindings AS binding
  JOIN public.source_run_submissions AS publication
    ON publication.extracted_prompt_id = binding.project_id
  JOIN public.prompts AS project
    ON project.id = binding.project_id
  WHERE (
    binding.source_run_id = '71700000-0000-4000-8000-000000000004'
    AND binding.project_id = '71500000-0000-4000-8000-000000000004'
    AND project.fork_source_step_id =
      '71000000-0000-4000-8000-000000000001:curated-run-a:step:3'
    AND publication.fork_source_step_id = project.fork_source_step_id
    AND publication.fork_source_artifact_path =
      'public/artifacts/curated-a.html'
    AND publication.fork_source_artifact_sha256 = 'sha-curated-a'
  ) OR (
    binding.source_run_id = '71700000-0000-4000-8000-000000000005'
    AND binding.project_id = '71500000-0000-4000-8000-000000000005'
    AND project.fork_source_step_id =
      '71000000-0000-4000-8000-000000000001:curated-run-b:step:4'
    AND publication.fork_source_step_id = project.fork_source_step_id
    AND publication.fork_source_artifact_path =
      'public/artifacts/curated-b.html'
    AND publication.fork_source_artifact_sha256 = 'sha-curated-b'
  );
  IF preserved_grandfathered_pairs <> 2 THEN
    RAISE EXCEPTION
      'Failed provenance preflight changed durable grandfathered publication pairs.';
  END IF;
END;
$$;
