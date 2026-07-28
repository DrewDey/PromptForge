BEGIN;

DO $$
DECLARE
  child_id UUID := '71500000-0000-4000-8000-000000000001';
  source_run_child_id UUID := '71500000-0000-4000-8000-000000000003';
  grandfathered_child_id UUID := '71500000-0000-4000-8000-000000000004';
  preserved_controls INT;
  payload JSONB;
BEGIN
  SELECT COUNT(*) INTO preserved_controls
  FROM public.prompts
  WHERE id BETWEEN
    '71500000-0000-4000-8000-000000000001'
    AND '71500000-0000-4000-8000-000000000005';
  IF preserved_controls <> 5 THEN
    RAISE EXCEPTION
      'Migration did not preserve all five valid production-shaped rows.';
  END IF;

  SELECT public.read_public_project_fork_lineage(child_id) INTO payload;
  IF payload->>'status' <> 'complete'
    OR payload->'nodes'->0->'steps'->0->'artifacts'->0->>'model_variant_id'
      <> '71200000-0000-4000-8000-000000000001'
    OR payload->'nodes'->0->'steps'->0->'artifacts'->0->>'is_selected'
      <> 'true' THEN
    RAISE EXCEPTION 'Valid model provenance did not remain complete: %', payload;
  END IF;

  SELECT public.read_public_project_fork_lineage(source_run_child_id)
  INTO payload;
  IF payload->>'status' <> 'complete' THEN
    RAISE EXCEPTION 'Valid source-run-only provenance was rejected: %', payload;
  END IF;

  SELECT public.read_public_project_fork_lineage(grandfathered_child_id)
  INTO payload;
  IF payload->>'status' <> 'complete' THEN
    RAISE EXCEPTION 'Grandfathered curated provenance was rejected: %', payload;
  END IF;
END;
$$;

DO $$
DECLARE
  caught BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_project_states
    WHERE user_id = '71800000-0000-4000-8000-000000000001'
      AND project_id = '71000000-0000-4000-8000-000000000001'
      AND fork_started_at IS NOT NULL
      AND fork_source_model_variant_id IS NULL
      AND fork_source_run_id IS NULL
      AND fork_source_step_id =
        '71100000-0000-4000-8000-000000000001'
      AND fork_source_step_number = 1
      AND fork_depth = 0
  ) THEN
    RAISE EXCEPTION
      'Valid legacy prompt-step unfinished fork was not preserved.';
  END IF;

  INSERT INTO public.user_project_states (
    user_id,
    project_id,
    fork_started_at,
    fork_depth,
    fork_branch_index,
    fork_parent_submission_id,
    fork_prompt_family_id,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_artifact_path,
    fork_source_artifact_sha256
  ) VALUES (
    '71800000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000001',
    NOW(),
    0,
    1,
    NULL,
    '71000000-0000-4000-8000-000000000001:valid-run-a:step:1',
    '71200000-0000-4000-8000-000000000001',
    'valid-run-a',
    'valid-run-a:step:1',
    1,
    'public/artifacts/valid-run-a.html',
    'sha-valid-run-a'
  );

  caught := FALSE;
  BEGIN
    UPDATE public.user_project_states
    SET
      fork_depth = 8,
      fork_parent_submission_id = 'not-the-parent',
      fork_prompt_family_id = 'not-the-family'
    WHERE user_id = '71800000-0000-4000-8000-000000000003'
      AND project_id = '71000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN OTHERS THEN
    caught := TRUE;
  END;
  IF NOT caught THEN
    RAISE EXCEPTION
      'Forged unfinished-fork family/depth/parent coordinates were accepted.';
  END IF;

  caught := FALSE;
  BEGIN
    UPDATE public.user_project_states
    SET fork_prompt_family_id = 'not-the-family'
    WHERE user_id = '71800000-0000-4000-8000-000000000001'
      AND project_id = '71000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN OTHERS THEN
    caught := TRUE;
  END;
  IF NOT caught THEN
    RAISE EXCEPTION
      'Legacy prompt-step unfinished fork accepted a forged family.';
  END IF;
END;
$$;

ALTER TABLE public.prompts DISABLE TRIGGER enforce_project_fork_lineage_fields;

UPDATE public.prompts
SET fork_source_model_variant_id =
  '73000000-0000-4000-8000-000000000999'
WHERE id = '71500000-0000-4000-8000-000000000001';

DO $$
DECLARE
  child_id UUID := '71500000-0000-4000-8000-000000000001';
  payload JSONB;
BEGIN
  SELECT public.read_public_project_fork_lineage(child_id) INTO payload;
  IF payload->>'status' <> 'invalid'
    OR payload->>'affected_project_id' <> child_id::TEXT THEN
    RAISE EXCEPTION 'Nonexistent model variant was not invalid: %', payload;
  END IF;
END;
$$;

UPDATE public.prompts
SET
  fork_source_model_variant_id =
    '71200000-0000-4000-8000-000000000002',
  fork_source_run_id = 'foreign-run',
  fork_source_step_id = 'foreign-run:step:1',
  fork_source_artifact_path = 'public/artifacts/foreign-run.html',
  fork_source_artifact_sha256 = 'sha-foreign-run'
WHERE id = '71500000-0000-4000-8000-000000000001';

DO $$
DECLARE
  child_id UUID := '71500000-0000-4000-8000-000000000001';
  payload JSONB;
BEGIN
  SELECT public.read_public_project_fork_lineage(child_id) INTO payload;
  IF payload->>'status' <> 'invalid' THEN
    RAISE EXCEPTION 'Foreign model variant was not invalid: %', payload;
  END IF;
END;
$$;

UPDATE public.prompts
SET
  fork_source_model_variant_id =
    '71200000-0000-4000-8000-000000000001',
  fork_source_run_id = 'wrong-run',
  fork_source_step_id = 'valid-run-a:step:1',
  fork_source_artifact_path = 'public/artifacts/valid-run-a.html',
  fork_source_artifact_sha256 = 'sha-valid-run-a'
WHERE id = '71500000-0000-4000-8000-000000000001';

DO $$
DECLARE
  child_id UUID := '71500000-0000-4000-8000-000000000001';
  payload JSONB;
BEGIN
  SELECT public.read_public_project_fork_lineage(child_id) INTO payload;
  IF payload->>'status' <> 'invalid' THEN
    RAISE EXCEPTION 'Wrong run under a real variant was not invalid: %', payload;
  END IF;
END;
$$;

UPDATE public.prompts
SET
  fork_source_run_id = 'valid-run-a',
  fork_source_artifact_path = 'public/artifacts/wrong.html',
  fork_source_artifact_sha256 = 'sha-wrong'
WHERE id = '71500000-0000-4000-8000-000000000001';

DO $$
DECLARE
  child_id UUID := '71500000-0000-4000-8000-000000000001';
  payload JSONB;
BEGIN
  SELECT public.read_public_project_fork_lineage(child_id) INTO payload;
  IF payload->>'status' <> 'invalid' THEN
    RAISE EXCEPTION 'Wrong artifact under a real variant was not invalid: %', payload;
  END IF;
END;
$$;

ALTER TABLE public.prompts ENABLE TRIGGER enforce_project_fork_lineage_fields;

ROLLBACK;
