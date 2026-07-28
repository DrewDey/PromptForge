DO $$
BEGIN
  IF has_schema_privilege('public', 'private', 'USAGE')
    OR has_schema_privilege('anon', 'private', 'USAGE')
    OR has_schema_privilege('authenticated', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'Failed preflight changed private-schema access.';
  END IF;

  IF to_regprocedure(
    'private.project_fork_tuple_is_valid(text,uuid,text,text,integer,text,text,text,text,integer,integer,text,boolean)'
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'Failed preflight left the permanent tuple validator behind.';
  END IF;

  IF to_regprocedure('private.enforce_project_fork_lineage()') IS NOT NULL
    OR to_regprocedure('private.validate_user_project_fork_source()') IS NOT NULL
    OR to_regprocedure('public.read_public_project_fork_lineage(uuid)') IS NOT NULL
    OR to_regprocedure('public.read_public_project_fork_lineages(uuid[])') IS NOT NULL
  THEN
    RAISE EXCEPTION 'Failed preflight left a migration function behind.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE NOT tgisinternal
      AND tgname IN (
        'enforce_project_fork_lineage_fields',
        'validate_user_project_fork_source_fields'
      )
  ) THEN
    RAISE EXCEPTION 'Failed preflight left a migration trigger behind.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.prompts'::REGCLASS
      AND conname = 'prompts_fork_depth_check'
      AND pg_get_constraintdef(oid) ~ 'fork_depth.*>= 0.*fork_depth.*<= 9'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_project_states'::REGCLASS
      AND conname = 'user_project_states_fork_depth_check'
      AND pg_get_constraintdef(oid) ~ 'fork_depth.*>= 0.*fork_depth.*<= 9'
  ) THEN
    RAISE EXCEPTION 'Failed preflight changed a persisted depth constraint.';
  END IF;
END;
$$;
