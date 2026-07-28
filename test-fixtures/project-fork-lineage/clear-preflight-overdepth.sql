DELETE FROM public.prompts
WHERE id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

DELETE FROM public.user_project_states
WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND project_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
