\set ON_ERROR_STOP on

INSERT INTO public.profiles (id, username, display_name)
VALUES (
  '81000000-0000-4000-8000-000000000001',
  'legacy_requester',
  'Legacy Requester'
);

INSERT INTO public.build_requests (
  id,
  title,
  body,
  author_id
) VALUES (
  '81100000-0000-4000-8000-000000000001',
  'Legacy populated request',
  'This row proves that a populated public board cannot be reinterpreted.',
  '81000000-0000-4000-8000-000000000001'
);

CREATE FUNCTION public.test_request_authority_legacy_fingerprint()
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH domain_relations AS (
    SELECT relation.oid
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE (
      namespace.nspname = 'public'
      AND relation.relname LIKE 'build_request%'
    ) OR (
      namespace.nspname = 'private'
      AND relation.relname LIKE 'pathforge_mutation_windows%'
    ) OR (
      namespace.nspname = 'storage'
      AND relation.relname IN ('buckets', 'objects')
    )
  )
  SELECT jsonb_build_object(
    'relations',
    (
      SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.identity), '[]')
      FROM (
        SELECT
          namespace.nspname || '.' || relation.relname AS identity,
          relation.relkind,
          relation.relrowsecurity,
          relation.relforcerowsecurity,
          COALESCE(relation.relacl::TEXT, '') AS acl
        FROM pg_catalog.pg_class AS relation
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = relation.relnamespace
        WHERE relation.oid IN (SELECT oid FROM domain_relations)
      ) AS row_data
    ),
    'columns',
    (
      SELECT COALESCE(
        jsonb_agg(to_jsonb(row_data) ORDER BY row_data.identity, row_data.attnum),
        '[]'
      )
      FROM (
        SELECT
          namespace.nspname || '.' || relation.relname AS identity,
          attribute.attnum,
          attribute.attname,
          pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) AS data_type,
          attribute.attnotnull,
          COALESCE(pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid), '')
            AS default_expression
        FROM pg_catalog.pg_attribute AS attribute
        JOIN pg_catalog.pg_class AS relation
          ON relation.oid = attribute.attrelid
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = relation.relnamespace
        LEFT JOIN pg_catalog.pg_attrdef AS default_value
          ON default_value.adrelid = attribute.attrelid
          AND default_value.adnum = attribute.attnum
        WHERE relation.oid IN (SELECT oid FROM domain_relations)
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
      ) AS row_data
    ),
    'constraints',
    (
      SELECT COALESCE(
        jsonb_agg(to_jsonb(row_data) ORDER BY row_data.identity),
        '[]'
      )
      FROM (
        SELECT
          namespace.nspname || '.' || constraint_value.conname AS identity,
          pg_catalog.pg_get_constraintdef(constraint_value.oid, TRUE) AS definition,
          constraint_value.convalidated
        FROM pg_catalog.pg_constraint AS constraint_value
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = constraint_value.connamespace
        WHERE constraint_value.conrelid IN (SELECT oid FROM domain_relations)
      ) AS row_data
    ),
    'policies',
    (
      SELECT COALESCE(
        jsonb_agg(to_jsonb(row_data) ORDER BY row_data.identity),
        '[]'
      )
      FROM (
        SELECT
          policy.schemaname || '.' || policy.tablename || '.' || policy.policyname
            AS identity,
          policy.permissive,
          policy.roles,
          policy.cmd,
          policy.qual,
          policy.with_check
        FROM pg_catalog.pg_policies AS policy
        WHERE (
          policy.schemaname = 'public'
          AND policy.tablename LIKE 'build_request%'
        ) OR (
          policy.schemaname = 'storage'
          AND policy.tablename IN ('buckets', 'objects')
        )
      ) AS row_data
    ),
    'triggers',
    (
      SELECT COALESCE(
        jsonb_agg(to_jsonb(row_data) ORDER BY row_data.identity),
        '[]'
      )
      FROM (
        SELECT
          namespace.nspname || '.' || relation.relname || '.' || trigger_value.tgname
            AS identity,
          pg_catalog.pg_get_triggerdef(trigger_value.oid, TRUE) AS definition,
          trigger_value.tgenabled
        FROM pg_catalog.pg_trigger AS trigger_value
        JOIN pg_catalog.pg_class AS relation
          ON relation.oid = trigger_value.tgrelid
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = relation.relnamespace
        WHERE relation.oid IN (SELECT oid FROM domain_relations)
          AND NOT trigger_value.tgisinternal
      ) AS row_data
    ),
    'functions',
    (
      SELECT COALESCE(
        jsonb_agg(to_jsonb(row_data) ORDER BY row_data.identity),
        '[]'
      )
      FROM (
        SELECT
          namespace.nspname || '.' || procedure.proname
            || '(' || pg_catalog.pg_get_function_identity_arguments(procedure.oid) || ')'
            AS identity,
          pg_catalog.pg_get_functiondef(procedure.oid) AS definition,
          procedure.prosecdef,
          COALESCE(procedure.proacl::TEXT, '') AS acl
        FROM pg_catalog.pg_proc AS procedure
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE (
          namespace.nspname = 'public'
          AND procedure.proname IN (
            'touch_build_request_on_response',
            'update_build_request_vote_count'
          )
        ) OR (
          namespace.nspname = 'private'
          AND procedure.proname = 'enforce_pathforge_mutation_quota'
        )
      ) AS row_data
    ),
    'request_rows',
    (SELECT COALESCE(jsonb_agg(to_jsonb(row_value) ORDER BY row_value.id), '[]')
      FROM public.build_requests AS row_value),
    'response_rows',
    (SELECT COALESCE(jsonb_agg(to_jsonb(row_value) ORDER BY row_value.id), '[]')
      FROM public.build_request_responses AS row_value),
    'vote_rows',
    (SELECT COALESCE(jsonb_agg(to_jsonb(row_value) ORDER BY row_value.id), '[]')
      FROM public.build_request_votes AS row_value),
    'storage_buckets',
    (SELECT COALESCE(jsonb_agg(to_jsonb(row_value) ORDER BY row_value.id), '[]')
      FROM storage.buckets AS row_value),
    'storage_objects',
    (SELECT COALESCE(jsonb_agg(to_jsonb(row_value) ORDER BY row_value.id), '[]')
      FROM storage.objects AS row_value)
  );
$$;

CREATE TABLE public.test_request_authority_preflight_snapshot (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  fingerprint JSONB NOT NULL
);

INSERT INTO public.test_request_authority_preflight_snapshot (fingerprint)
VALUES (public.test_request_authority_legacy_fingerprint());
