-- Five production-shaped valid first-generation rows remain in place when the
-- migration is retried. The final four rows are deterministic invalid legacy
-- tuples used to prove the migration aborts without rewriting evidence.

INSERT INTO public.prompts (id, title)
VALUES
  ('71000000-0000-4000-8000-000000000001', 'Valid provenance root'),
  ('71000000-0000-4000-8000-000000000002', 'Foreign provenance root');

INSERT INTO public.prompt_steps (
  id, prompt_id, step_number, title, content, result_content
) VALUES
  (
    '71100000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    1,
    'Root step',
    'Prompt',
    'Response'
  ),
  (
    '71100000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000002',
    1,
    'Foreign root step',
    'Prompt',
    'Response'
  );

INSERT INTO public.project_model_variants (
  id, project_id, source_run_id, status, is_default
) VALUES
  (
    '71200000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    'valid-run-a',
    'published',
    TRUE
  ),
  (
    '71200000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000002',
    'foreign-run',
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
) VALUES
  (
    '71300000-0000-4000-8000-000000000001',
    '71200000-0000-4000-8000-000000000001',
    'valid-run-a:step:1',
    1,
    'public/artifacts/valid-run-a.html',
    'sha-valid-run-a'
  ),
  (
    '71300000-0000-4000-8000-000000000002',
    '71200000-0000-4000-8000-000000000002',
    'foreign-run:step:1',
    1,
    'public/artifacts/foreign-run.html',
    'sha-foreign-run'
  );

INSERT INTO public.source_run_submissions (
  id, extracted_prompt_id, status, intake_evidence
) VALUES (
  '71400000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  'draft_created',
  jsonb_build_object(
    'prompt_count', '2',
    'final_artifact_path', 'public/artifacts/source-run-only.html',
    'final_artifact_sha256', 'sha-source-run-only'
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
  prompt_family_id,
  fork_depth,
  fork_branch_index
) VALUES
  (
    '71500000-0000-4000-8000-000000000001',
    'Valid model child one',
    '71000000-0000-4000-8000-000000000001',
    '71200000-0000-4000-8000-000000000001',
    'valid-run-a',
    'valid-run-a:step:1',
    1,
    'public/artifacts/valid-run-a.html',
    'sha-valid-run-a',
    '71000000-0000-4000-8000-000000000001:valid-run-a:step:1',
    0,
    0
  ),
  (
    '71500000-0000-4000-8000-000000000002',
    'Valid model child two',
    '71000000-0000-4000-8000-000000000001',
    '71200000-0000-4000-8000-000000000001',
    'valid-run-a',
    'valid-run-a:step:1',
    1,
    'public/artifacts/valid-run-a.html',
    'sha-valid-run-a',
    '71000000-0000-4000-8000-000000000001:valid-run-a:step:1',
    0,
    1
  ),
  (
    '71500000-0000-4000-8000-000000000003',
    'Valid source-run-only child',
    '71000000-0000-4000-8000-000000000001',
    NULL,
    '71400000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001:71400000-0000-4000-8000-000000000001:step:2',
    2,
    'public/artifacts/source-run-only.html',
    'sha-source-run-only',
    '71000000-0000-4000-8000-000000000001:71000000-0000-4000-8000-000000000001:71400000-0000-4000-8000-000000000001:step:2',
    0,
    2
  ),
  (
    '71500000-0000-4000-8000-000000000004',
    'Grandfathered curated child one',
    '71000000-0000-4000-8000-000000000001',
    NULL,
    NULL,
    '71000000-0000-4000-8000-000000000001:curated-run-a:step:3',
    3,
    'public/artifacts/curated-a.html',
    'sha-curated-a',
    '71000000-0000-4000-8000-000000000001:71000000-0000-4000-8000-000000000001:curated-run-a:step:3',
    0,
    3
  ),
  (
    '71500000-0000-4000-8000-000000000005',
    'Grandfathered curated child two',
    '71000000-0000-4000-8000-000000000001',
    NULL,
    NULL,
    '71000000-0000-4000-8000-000000000001:curated-run-b:step:4',
    4,
    'public/artifacts/curated-b.html',
    'sha-curated-b',
    '71000000-0000-4000-8000-000000000001:71000000-0000-4000-8000-000000000001:curated-run-b:step:4',
    0,
    4
  );

INSERT INTO public.source_run_submissions (
  id,
  extracted_prompt_id,
  status,
  fork_source_project_id,
  fork_source_model_variant_id,
  fork_source_run_id,
  fork_source_step_id,
  fork_source_step_number,
  fork_source_artifact_path,
  fork_source_artifact_sha256,
  prompt_family_id,
  fork_depth,
  fork_branch_index
)
SELECT
  ('71600000-0000-4000-8000-' || LPAD(ROW_NUMBER() OVER (
    ORDER BY child.id
  )::TEXT, 12, '0'))::UUID,
  child.id,
  'draft_created',
  child.fork_source_project_id,
  child.fork_source_model_variant_id,
  child.fork_source_run_id,
  child.fork_source_step_id,
  child.fork_source_step_number,
  child.fork_source_artifact_path,
  child.fork_source_artifact_sha256,
  child.prompt_family_id,
  child.fork_depth,
  child.fork_branch_index
FROM public.prompts AS child
WHERE child.id BETWEEN
  '71500000-0000-4000-8000-000000000001'
  AND '71500000-0000-4000-8000-000000000005';

INSERT INTO private.prepared_legacy_seed_profile_bindings (
  source_run_id, project_id
) VALUES
  (
    '71600000-0000-4000-8000-000000000004',
    '71500000-0000-4000-8000-000000000004'
  ),
  (
    '71600000-0000-4000-8000-000000000005',
    '71500000-0000-4000-8000-000000000005'
  );

INSERT INTO public.user_project_states (
  user_id,
  project_id,
  fork_started_at,
  fork_depth,
  fork_branch_index,
  fork_parent_submission_id,
  fork_prompt_family_id,
  fork_source_step_id,
  fork_source_step_number
) VALUES
  (
    '71800000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    NOW(),
    0,
    0,
    NULL,
    '71000000-0000-4000-8000-000000000001:71100000-0000-4000-8000-000000000001',
    '71100000-0000-4000-8000-000000000001',
    1
  ),
  (
    '71800000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000001',
    NOW(),
    1,
    0,
    'forged-parent',
    'forged-family',
    '71100000-0000-4000-8000-000000000001',
    1
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
  prompt_family_id,
  fork_depth,
  fork_branch_index
) VALUES
  (
    '71900000-0000-4000-8000-000000000001',
    'Nonexistent model variant',
    '71000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000999',
    'valid-run-a',
    'valid-run-a:step:1',
    1,
    'public/artifacts/valid-run-a.html',
    'sha-valid-run-a',
    '71000000-0000-4000-8000-000000000001:valid-run-a:step:1',
    0,
    5
  ),
  (
    '71900000-0000-4000-8000-000000000002',
    'Foreign model variant',
    '71000000-0000-4000-8000-000000000001',
    '71200000-0000-4000-8000-000000000002',
    'foreign-run',
    'foreign-run:step:1',
    1,
    'public/artifacts/foreign-run.html',
    'sha-foreign-run',
    '71000000-0000-4000-8000-000000000001:foreign-run:step:1',
    0,
    6
  ),
  (
    '71900000-0000-4000-8000-000000000003',
    'Wrong run under real variant',
    '71000000-0000-4000-8000-000000000001',
    '71200000-0000-4000-8000-000000000001',
    'wrong-run',
    'valid-run-a:step:1',
    1,
    'public/artifacts/valid-run-a.html',
    'sha-valid-run-a',
    '71000000-0000-4000-8000-000000000001:valid-run-a:step:1',
    0,
    7
  ),
  (
    '71900000-0000-4000-8000-000000000004',
    'Wrong artifact under real variant',
    '71000000-0000-4000-8000-000000000001',
    '71200000-0000-4000-8000-000000000001',
    'valid-run-a',
    'valid-run-a:step:1',
    1,
    'public/artifacts/wrong.html',
    'sha-wrong',
    '71000000-0000-4000-8000-000000000001:valid-run-a:step:1',
    0,
    8
  ),
  (
    '71900000-0000-4000-8000-000000000005',
    'Grandfather publication decoy',
    '71000000-0000-4000-8000-000000000001',
    NULL,
    NULL,
    '71000000-0000-4000-8000-000000000001:decoy-run:step:5',
    5,
    'public/artifacts/decoy.html',
    'sha-decoy',
    '71000000-0000-4000-8000-000000000001:71000000-0000-4000-8000-000000000001:decoy-run:step:5',
    0,
    9
  );

INSERT INTO public.source_run_submissions (
  id, extracted_prompt_id, status
) VALUES (
  '71700000-0000-4000-8000-000000000005',
  '71900000-0000-4000-8000-000000000005',
  'draft_created'
);

INSERT INTO public.source_run_submissions (
  id,
  extracted_prompt_id,
  status,
  fork_source_project_id,
  fork_source_step_id,
  fork_source_step_number,
  fork_source_artifact_path,
  fork_source_artifact_sha256,
  prompt_family_id,
  fork_depth,
  fork_branch_index
) VALUES (
  '71700000-0000-4000-8000-000000000105',
  '71900000-0000-4000-8000-000000000005',
  'draft_created',
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001:decoy-run:step:5',
  5,
  'public/artifacts/decoy.html',
  'sha-decoy',
  '71000000-0000-4000-8000-000000000001:71000000-0000-4000-8000-000000000001:decoy-run:step:5',
  0,
  9
);

INSERT INTO private.prepared_legacy_seed_profile_bindings (
  source_run_id, project_id
) VALUES (
  '71700000-0000-4000-8000-000000000005',
  '71900000-0000-4000-8000-000000000005'
);
