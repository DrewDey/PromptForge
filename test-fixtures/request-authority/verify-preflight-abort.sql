\set ON_ERROR_STOP on

DO $test$
BEGIN
  IF (
    SELECT fingerprint
    FROM public.test_request_authority_preflight_snapshot
    WHERE singleton
  ) IS DISTINCT FROM public.test_request_authority_legacy_fingerprint() THEN
    RAISE EXCEPTION
      'A failed authority preflight changed legacy data or catalog authority.';
  END IF;

  IF (
    SELECT COUNT(*) FROM public.build_requests
  ) <> 1 OR (
    SELECT COUNT(*) FROM public.build_request_responses
  ) <> 0 OR (
    SELECT COUNT(*) FROM public.build_request_votes
  ) <> 0 THEN
    RAISE EXCEPTION
      'A failed authority preflight changed the legacy 1/0/0 fixture.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname LIKE 'build_request%'
      AND relation.relname NOT IN (
        'build_requests',
        'build_requests_pkey',
        'idx_build_requests_author',
        'idx_build_requests_status',
        'build_request_responses',
        'build_request_responses_pkey',
        'idx_build_request_responses_request',
        'build_request_votes',
        'build_request_votes_pkey',
        'idx_build_request_votes_request',
        'build_request_votes_user_id_request_id_key'
      )
  ) OR EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'build_requests'
      AND column_name NOT IN (
        'id',
        'title',
        'body',
        'author_id',
        'status',
        'vote_count',
        'accepted_response_id',
        'created_at',
        'updated_at'
      )
  ) THEN
    RAISE EXCEPTION
      'A failed authority preflight left permanent private-case objects behind.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE procedure.proname LIKE '%build_request%'
      AND NOT (
        namespace.nspname = 'public'
        AND procedure.proname IN (
          'test_request_authority_legacy_fingerprint',
          'touch_build_request_on_response',
          'update_build_request_vote_count'
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_type AS type_value
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = type_value.typnamespace
    WHERE type_value.typname LIKE 'build_request%'
      AND type_value.typtype = 'e'
  ) THEN
    RAISE EXCEPTION
      'A failed authority preflight left request functions or enum types behind.';
  END IF;
END;
$test$;
