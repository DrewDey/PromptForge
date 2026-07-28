INSERT INTO public.prompts (
  id,
  title,
  fork_source_project_id,
  fork_source_step_id,
  fork_source_step_number,
  prompt_family_id,
  fork_depth
) VALUES (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  'Unexpected legacy level eleven',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  1,
  'unexpected-family',
  9
);

INSERT INTO public.user_project_states (
  user_id,
  project_id,
  fork_started_at,
  fork_depth
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  NOW(),
  9
);
