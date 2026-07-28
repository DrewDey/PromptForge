BEGIN;

INSERT INTO public.prompt_steps (
  id, prompt_id, step_number, title, content, result_content
) VALUES
  (
    '72100000-0000-4000-8000-000000000001',
    '71500000-0000-4000-8000-000000000001',
    2,
    'Eligible model response',
    'Prompt',
    'Response'
  ),
  (
    '72100000-0000-4000-8000-000000000003',
    '71500000-0000-4000-8000-000000000003',
    3,
    'Eligible source-run-only response',
    'Prompt',
    'Response'
  );

INSERT INTO public.project_model_variants (
  id, project_id, source_run_id, status, is_default
) VALUES (
  '72200000-0000-4000-8000-000000000001',
  '71500000-0000-4000-8000-000000000001',
  'eligible-child-run-b',
  'published',
  TRUE
);

INSERT INTO public.project_model_variant_artifacts (
  id,
  model_variant_id,
  source_step_id,
  source_step_number,
  artifact_path,
  artifact_sha256
) VALUES (
  '72300000-0000-4000-8000-000000000001',
  '72200000-0000-4000-8000-000000000001',
  'eligible-child-run-b:step:2',
  2,
  'public/artifacts/airlock-zero-gemini-35-flash-step-2.html',
  '7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497'
);

INSERT INTO public.source_run_submissions (
  id, extracted_prompt_id, status, intake_evidence
) VALUES (
  '72500000-0000-4000-8000-000000000001',
  '71500000-0000-4000-8000-000000000003',
  'draft_created',
  jsonb_build_object(
    'prompt_count', '3',
    'final_artifact_path',
      'public/artifacts/airlock-zero-gemini-35-flash-step-3.html',
    'final_artifact_sha256',
      'b390710493d8bc2797a1fe211b112ae5d3d8a1f610438f2ebed5aa153028fa35'
  )
);

INSERT INTO public.prompts (
  id,
  title,
  fork_source_project_id,
  fork_source_model_variant_id,
  fork_source_run_id,
  fork_source_step_id,
  fork_source_step_number,
  fork_source_artifact_path,
  fork_source_artifact_sha256,
  fork_parent_submission_id,
  prompt_family_id,
  fork_depth,
  fork_branch_index
) VALUES
  (
    '72400000-0000-4000-8000-000000000001',
    'Accepted browser model tuple',
    '71500000-0000-4000-8000-000000000001',
    '72200000-0000-4000-8000-000000000001',
    'eligible-child-run-b',
    'eligible-child-run-b:step:2',
    2,
    'public/artifacts/airlock-zero-gemini-35-flash-step-2.html',
    '7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497',
    '71500000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001:valid-run-a:step:1',
    1,
    0
  ),
  (
    '72400000-0000-4000-8000-000000000003',
    'Accepted browser source-run tuple',
    '71500000-0000-4000-8000-000000000003',
    NULL,
    '72500000-0000-4000-8000-000000000001',
    '71500000-0000-4000-8000-000000000003:72500000-0000-4000-8000-000000000001:step:3',
    3,
    'public/artifacts/airlock-zero-gemini-35-flash-step-3.html',
    'b390710493d8bc2797a1fe211b112ae5d3d8a1f610438f2ebed5aa153028fa35',
    '71500000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000001:71000000-0000-4000-8000-000000000001:71400000-0000-4000-8000-000000000001:step:2',
    1,
    0
  );

DO $$
DECLARE
  payload JSONB;
BEGIN
  SELECT public.read_public_project_fork_lineage(
    '72400000-0000-4000-8000-000000000001'
  ) INTO payload;
  IF payload->>'status' <> 'complete'
    OR payload::TEXT NOT LIKE
      '%72200000-0000-4000-8000-000000000001%'
    OR payload::TEXT NOT LIKE '%eligible-child-run-b:step:2%'
    OR payload::TEXT NOT LIKE
      '%public/artifacts/airlock-zero-gemini-35-flash-step-2.html%'
    OR payload::TEXT NOT LIKE
      '%7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497%'
  THEN
    RAISE EXCEPTION 'Accepted model action did not round-trip: %', payload;
  END IF;

  SELECT public.read_public_project_fork_lineage(
    '72400000-0000-4000-8000-000000000003'
  ) INTO payload;
  IF payload->>'status' <> 'complete'
    OR payload::TEXT NOT LIKE
      '%72500000-0000-4000-8000-000000000001%'
    OR payload::TEXT LIKE
      '%"fork_source_model_variant_id": "72200000-0000-4000-8000-000000000001"%'
    OR payload::TEXT NOT LIKE
      '%public/artifacts/airlock-zero-gemini-35-flash-step-3.html%'
  THEN
    RAISE EXCEPTION
      'Accepted source-run-only action did not round-trip: %', payload;
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.prompts (
      id, title, fork_source_project_id, fork_source_model_variant_id,
      fork_source_run_id, fork_source_step_id, fork_source_step_number,
      fork_source_artifact_path, fork_source_artifact_sha256,
      fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index
    ) VALUES (
      '72600000-0000-4000-8000-000000000001',
      'Rejected false model',
      '71500000-0000-4000-8000-000000000001',
      '73000000-0000-4000-8000-000000000999',
      'eligible-child-run-b', 'eligible-child-run-b:step:2', 2,
      'public/artifacts/airlock-zero-gemini-35-flash-step-2.html',
      '7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497',
      '71500000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001:valid-run-a:step:1', 1, 1
    );
    RAISE EXCEPTION 'False model tuple was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'False model tuple was accepted.' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.prompts (
      id, title, fork_source_project_id, fork_source_model_variant_id,
      fork_source_run_id, fork_source_step_id, fork_source_step_number,
      fork_source_artifact_path, fork_source_artifact_sha256,
      fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index
    ) VALUES (
      '72600000-0000-4000-8000-000000000002',
      'Rejected wrong run',
      '71500000-0000-4000-8000-000000000001',
      '72200000-0000-4000-8000-000000000001',
      'wrong-run', 'eligible-child-run-b:step:2', 2,
      'public/artifacts/airlock-zero-gemini-35-flash-step-2.html',
      '7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497',
      '71500000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001:valid-run-a:step:1', 1, 2
    );
    RAISE EXCEPTION 'Wrong run tuple was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Wrong run tuple was accepted.' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.prompts (
      id, title, fork_source_project_id, fork_source_model_variant_id,
      fork_source_run_id, fork_source_step_id, fork_source_step_number,
      fork_source_artifact_path, fork_source_artifact_sha256,
      fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index
    ) VALUES (
      '72600000-0000-4000-8000-000000000003',
      'Rejected wrong step',
      '71500000-0000-4000-8000-000000000001',
      '72200000-0000-4000-8000-000000000001',
      'eligible-child-run-b', 'eligible-child-run-b:step:999', 999,
      'public/artifacts/airlock-zero-gemini-35-flash-step-2.html',
      '7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497',
      '71500000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001:valid-run-a:step:1', 1, 3
    );
    RAISE EXCEPTION 'Wrong step tuple was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Wrong step tuple was accepted.' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.prompts (
      id, title, fork_source_project_id, fork_source_model_variant_id,
      fork_source_run_id, fork_source_step_id, fork_source_step_number,
      fork_source_artifact_path, fork_source_artifact_sha256,
      fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index
    ) VALUES (
      '72600000-0000-4000-8000-000000000004',
      'Rejected wrong artifact',
      '71500000-0000-4000-8000-000000000001',
      '72200000-0000-4000-8000-000000000001',
      'eligible-child-run-b', 'eligible-child-run-b:step:2', 2,
      'public/artifacts/wrong.html', 'sha-wrong',
      '71500000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001:valid-run-a:step:1', 1, 4
    );
    RAISE EXCEPTION 'Wrong artifact tuple was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Wrong artifact tuple was accepted.' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.prompts (
      id, title, fork_source_project_id, fork_source_model_variant_id,
      fork_source_run_id, fork_source_step_id, fork_source_step_number,
      fork_source_artifact_path, fork_source_artifact_sha256,
      fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index
    ) VALUES (
      '72600000-0000-4000-8000-000000000005',
      'Rejected incomplete tuple',
      '71500000-0000-4000-8000-000000000001',
      '72200000-0000-4000-8000-000000000001',
      'eligible-child-run-b', 'eligible-child-run-b:step:2', 2,
      'public/artifacts/airlock-zero-gemini-35-flash-step-2.html', NULL,
      '71500000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001:valid-run-a:step:1', 1, 5
    );
    RAISE EXCEPTION 'Incomplete tuple was accepted.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Incomplete tuple was accepted.' THEN RAISE; END IF;
  END;
END;
$$;

ALTER TABLE public.prompts DISABLE TRIGGER enforce_project_fork_lineage_fields;
UPDATE public.prompts
SET fork_source_model_variant_id =
  '73000000-0000-4000-8000-000000000999'
WHERE id = '72400000-0000-4000-8000-000000000001';

DO $$
DECLARE
  payload JSONB;
BEGIN
  SELECT public.read_public_project_fork_lineage(
    '72400000-0000-4000-8000-000000000001'
  ) INTO payload;
  IF payload->>'status' <> 'invalid'
    OR payload->>'affected_project_id'
      <> '72400000-0000-4000-8000-000000000001'
  THEN
    RAISE EXCEPTION
      'False emitted identity was not retained as invalid truth: %', payload;
  END IF;
END;
$$;
ALTER TABLE public.prompts ENABLE TRIGGER enforce_project_fork_lineage_fields;

ROLLBACK;
