BEGIN;

DO $$
DECLARE
  root_id UUID := '10000000-0000-4000-8000-000000000001';
  root_step UUID := '20000000-0000-4000-8000-000000000001';
  parent_id UUID := root_id;
  parent_step UUID := root_step;
  child_id UUID;
  child_step UUID;
  family_id TEXT := root_id::TEXT || ':' || root_step::TEXT;
  child_depth INT;
  terminal_id UUID;
  terminal_step UUID;
  payload JSONB;
  caught BOOLEAN;
BEGIN
  INSERT INTO public.prompts (id, title)
  VALUES (root_id, 'Level 1 root');
  INSERT INTO public.prompt_steps (
    id, prompt_id, step_number, title, content, result_content
  ) VALUES (
    root_step, root_id, 1, 'Root prompt', 'Root prompt text', 'Root response'
  );

  FOR child_depth IN 0..8 LOOP
    child_id := (
      '10000000-0000-4000-8000-' || LPAD((child_depth + 2)::TEXT, 12, '0')
    )::UUID;
    child_step := (
      '20000000-0000-4000-8000-' || LPAD((child_depth + 2)::TEXT, 12, '0')
    )::UUID;

    INSERT INTO public.prompts (
      id,
      title,
      fork_source_project_id,
      fork_source_project_title,
      fork_source_step_id,
      fork_source_step_number,
      fork_parent_submission_id,
      prompt_family_id,
      fork_depth,
      fork_branch_index
    ) VALUES (
      child_id,
      'Level ' || (child_depth + 2)::TEXT,
      parent_id::TEXT,
      'Parent level ' || (child_depth + 1)::TEXT,
      parent_step::TEXT,
      1,
      CASE WHEN child_depth = 0 THEN NULL ELSE parent_id::TEXT END,
      family_id,
      child_depth,
      child_depth % 10
    );
    INSERT INTO public.prompt_steps (
      id, prompt_id, step_number, title, content, result_content
    ) VALUES (
      child_step,
      child_id,
      1,
      'Prompt level ' || (child_depth + 2)::TEXT,
      'Prompt text ' || (child_depth + 2)::TEXT,
      'Response level ' || (child_depth + 2)::TEXT
    );
    parent_id := child_id;
    parent_step := child_step;
  END LOOP;
  terminal_id := parent_id;
  terminal_step := parent_step;

  caught := FALSE;
  BEGIN
    INSERT INTO public.prompts (
      id,
      title,
      fork_source_project_id,
      fork_source_step_id,
      fork_source_step_number,
      fork_parent_submission_id,
      prompt_family_id,
      fork_depth
    ) VALUES (
      '10000000-0000-4000-8000-000000000011',
      'Forbidden level 11',
      terminal_id::TEXT,
      terminal_step::TEXT,
      1,
      terminal_id::TEXT,
      family_id,
      9
    );
  EXCEPTION WHEN OTHERS THEN
    caught := TRUE;
  END;
  IF NOT caught THEN
    RAISE EXCEPTION 'Stored depth 9 was not rejected.';
  END IF;

  caught := FALSE;
  BEGIN
    INSERT INTO public.user_project_states (
      user_id,
      project_id,
      fork_started_at,
      fork_depth
    ) VALUES (
      '60000000-0000-4000-8000-000000000001',
      terminal_id,
      NOW(),
      9
    );
  EXCEPTION WHEN OTHERS THEN
    caught := TRUE;
  END;
  IF NOT caught THEN
    RAISE EXCEPTION 'Unfinished My Forge stored depth 9 was not rejected.';
  END IF;

  caught := FALSE;
  BEGIN
    INSERT INTO public.prompts (
      id,
      title,
      fork_source_project_id,
      fork_source_step_id,
      fork_source_step_number,
      fork_parent_submission_id,
      prompt_family_id,
      fork_depth
    ) VALUES (
      '10000000-0000-4000-8000-000000000012',
      'Wrong family',
      root_id::TEXT,
      root_step::TEXT,
      1,
      NULL,
      'client-trusted-family',
      0
    );
  EXCEPTION WHEN OTHERS THEN
    caught := TRUE;
  END;
  IF NOT caught THEN
    RAISE EXCEPTION 'Client-trusted family was not rejected.';
  END IF;

  caught := FALSE;
  BEGIN
    INSERT INTO public.prompts (
      id,
      title,
      fork_source_project_id,
      fork_source_step_id,
      fork_source_step_number,
      fork_parent_submission_id,
      prompt_family_id,
      fork_depth
    ) VALUES (
      '10000000-0000-4000-8000-000000000013',
      'Wrong response',
      root_id::TEXT,
      '30000000-0000-4000-8000-000000000013',
      1,
      NULL,
      root_id::TEXT || ':30000000-0000-4000-8000-000000000013',
      0
    );
  EXCEPTION WHEN OTHERS THEN
    caught := TRUE;
  END;
  IF NOT caught THEN
    RAISE EXCEPTION 'Missing parent response was not rejected.';
  END IF;

  INSERT INTO public.source_run_submissions (
    id,
    extracted_prompt_id,
    status,
    fork_source_project_id,
    fork_source_project_title,
    fork_source_step_id,
    fork_source_step_number,
    fork_parent_submission_id,
    prompt_family_id,
    fork_depth,
    fork_branch_index
  )
  SELECT
    '40000000-0000-4000-8000-000000000001',
    child.id,
    'draft_created',
    child.fork_source_project_id,
    child.fork_source_project_title,
    child.fork_source_step_id,
    child.fork_source_step_number,
    child.fork_parent_submission_id,
    child.prompt_family_id,
    child.fork_depth,
    child.fork_branch_index
  FROM public.prompts AS child
  WHERE child.fork_depth = 0
    AND child.fork_source_project_id = root_id::TEXT;

  INSERT INTO public.community_project_submissions (
    id,
    prompt_id,
    status,
    reuse_permission,
    fork_source_project_id,
    fork_source_project_title,
    fork_source_step_id,
    fork_source_step_number,
    fork_parent_submission_id,
    prompt_family_id,
    fork_depth,
    fork_branch_index
  )
  SELECT
    '50000000-0000-4000-8000-000000000001',
    child.id,
    'published',
    'allow_pathforge_remix',
    child.fork_source_project_id,
    child.fork_source_project_title,
    child.fork_source_step_id,
    child.fork_source_step_number,
    child.fork_parent_submission_id,
    child.prompt_family_id,
    child.fork_depth,
    child.fork_branch_index
  FROM public.prompts AS child
  WHERE child.fork_depth = 0
    AND child.fork_source_project_id = root_id::TEXT;

  SELECT public.read_public_project_fork_lineage(terminal_id)
  INTO payload;
  IF payload->>'status' <> 'complete'
    OR jsonb_array_length(payload->'nodes') <> 10
    OR payload->'nodes'->0->>'project_id' <> root_id::TEXT
    OR payload->'nodes'->9->>'project_id' <> terminal_id::TEXT THEN
    RAISE EXCEPTION 'Single authoritative lineage RPC returned incorrect truth: %', payload;
  END IF;
END;
$$;

DO $$
DECLARE
  batch_count INT;
BEGIN
  SELECT COUNT(*) INTO batch_count
  FROM public.read_public_project_fork_lineages(ARRAY[
    '10000000-0000-4000-8000-000000000001'::UUID,
    '10000000-0000-4000-8000-000000000010'::UUID
  ]);
  IF batch_count <> 2 THEN
    RAISE EXCEPTION 'Batch lineage RPC did not return exactly two keyed rows.';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_project_states'::REGCLASS
      AND conname = 'user_project_states_fork_depth_check'
      AND pg_get_constraintdef(oid) ~ 'fork_depth.*>= 0.*fork_depth.*<= 8'
  ) THEN
    RAISE EXCEPTION 'My Forge fork depth constraint is not cataloged as 0..8.';
  END IF;

  IF has_function_privilege(
    'public',
    'private.enforce_project_fork_lineage()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Private lineage trigger remains executable by PUBLIC.';
  END IF;
  IF has_function_privilege(
    'public',
    'private.project_fork_tuple_is_valid(text,uuid,text,text,integer,text,text,text,text,integer,integer,text,boolean)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Private lineage tuple validator remains executable by PUBLIC.';
  END IF;
  IF has_function_privilege(
    'public',
    'private.validate_user_project_fork_source()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'Private unfinished-fork validator remains executable by PUBLIC.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.user_project_states'::REGCLASS
      AND tgname = 'validate_user_project_fork_source_fields'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Unfinished-fork authority trigger is not installed.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    CROSS JOIN LATERAL unnest(proconfig) AS setting
    WHERE oid = 'private.validate_user_project_fork_source()'::REGPROCEDURE
      AND setting IN ('search_path=', 'search_path=""')
  ) THEN
    RAISE EXCEPTION
      'Unfinished-fork authority validator does not pin an empty search_path.';
  END IF;
  IF NOT has_function_privilege(
    'anon',
    'public.read_public_project_fork_lineages(uuid[])',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Anon role lacks explicit batch lineage RPC execution.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    CROSS JOIN LATERAL unnest(proconfig) AS setting
    WHERE oid = 'public.read_public_project_fork_lineages(uuid[])'::REGPROCEDURE
      AND setting IN ('search_path=', 'search_path=""')
  ) THEN
    RAISE EXCEPTION 'Batch lineage RPC does not pin an empty search_path.';
  END IF;
END;
$$;

ROLLBACK;
