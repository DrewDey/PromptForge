-- Canonical private Request a Build authority, contract version 1.
--
-- IMPORTANT: the entire migration is one atomic DO statement. The legacy
-- 0/0/0 lock/preflight is its first action.
-- A non-empty public board must abort before this migration makes any catalog or
-- data change. The ACCESS EXCLUSIVE locks keep the verified zero state stable
-- until the legacy relations are replaced.
DO $request_authority_migration$
DECLARE
  request_count BIGINT;
  response_count BIGINT;
  vote_count BIGINT;
  actual JSONB;
  expected JSONB;
  expected_alternative JSONB;
  catalog_profile TEXT;
  drift TEXT;
BEGIN
  LOCK TABLE public.build_requests,
    public.build_request_responses,
    public.build_request_votes
    IN ACCESS EXCLUSIVE MODE;

  SELECT COUNT(*) INTO request_count FROM public.build_requests;
  SELECT COUNT(*) INTO response_count FROM public.build_request_responses;
  SELECT COUNT(*) INTO vote_count FROM public.build_request_votes;

  IF request_count <> 0 OR response_count <> 0 OR vote_count <> 0 THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '55000',
        MESSAGE = format(
          'Request authority requires legacy 0/0/0; observed %s/%s/%s.',
          request_count,
          response_count,
          vote_count
        );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_extension AS extension_value
    JOIN pg_catalog.pg_namespace AS extension_namespace
      ON extension_namespace.oid = extension_value.extnamespace
    WHERE extension_value.extname = 'pgcrypto'
      AND extension_namespace.nspname = 'extensions'
  )
    OR pg_catalog.to_regprocedure(
      'extensions.gen_random_bytes(integer)'
    ) IS NULL
    OR pg_catalog.to_regprocedure(
      'extensions.digest(bytea,text)'
    ) IS NULL
    OR pg_catalog.to_regprocedure(
      'extensions.hmac(bytea,bytea,text)'
    ) IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request authority requires pgcrypto in the extensions schema.';
  END IF;

  WITH storage_relation AS (
    SELECT relation.oid, relation.relowner, relation.relacl,
      relation.relrowsecurity, relation.relforcerowsecurity,
      owner_role.rolname AS owner
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    JOIN pg_catalog.pg_roles AS owner_role
      ON owner_role.oid = relation.relowner
    WHERE namespace.nspname = 'storage'
      AND relation.relname = 'objects'
      AND relation.relkind = 'r'
  ),
  acl_group AS (
    SELECT pg_catalog.pg_get_userbyid(acl.grantee) AS grantee,
      acl.is_grantable,
      jsonb_agg(acl.privilege_type ORDER BY acl.privilege_type) AS privileges
    FROM storage_relation
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(
      storage_relation.relacl,
      pg_catalog.acldefault('r', storage_relation.relowner)
    )) AS acl
    GROUP BY acl.grantee, acl.is_grantable
  )
  SELECT jsonb_build_object(
    'owner', storage_relation.owner,
    'rowSecurity', storage_relation.relrowsecurity,
    'forceRowSecurity', storage_relation.relforcerowsecurity,
    'policyCount', (
      SELECT count(*)
      FROM pg_catalog.pg_policy AS policy_value
      WHERE policy_value.polrelid = storage_relation.oid
    ),
    'acl', COALESCE((
      SELECT jsonb_agg(to_jsonb(acl_group) ORDER BY acl_group.grantee)
      FROM acl_group
    ), '[]'::JSONB)
  )
  INTO actual
  FROM storage_relation;
  expected := $json$
  {
    "owner":"postgres",
    "rowSecurity":true,
    "forceRowSecurity":false,
    "policyCount":0,
    "acl":[
      {"grantee":"postgres","is_grantable":false,"privileges":["DELETE","INSERT","MAINTAIN","REFERENCES","SELECT","TRIGGER","TRUNCATE","UPDATE"]}
    ]
  }
  $json$::JSONB;
  expected_alternative := $json$
  {
    "owner":"supabase_storage_admin",
    "rowSecurity":true,
    "forceRowSecurity":false,
    "policyCount":0,
    "acl":[
      {"grantee":"anon","is_grantable":false,"privileges":["DELETE","INSERT","MAINTAIN","REFERENCES","SELECT","TRIGGER","TRUNCATE","UPDATE"]},
      {"grantee":"authenticated","is_grantable":false,"privileges":["DELETE","INSERT","MAINTAIN","REFERENCES","SELECT","TRIGGER","TRUNCATE","UPDATE"]},
      {"grantee":"postgres","is_grantable":true,"privileges":["DELETE","INSERT","MAINTAIN","REFERENCES","SELECT","TRIGGER","TRUNCATE","UPDATE"]},
      {"grantee":"service_role","is_grantable":false,"privileges":["DELETE","INSERT","MAINTAIN","REFERENCES","SELECT","TRIGGER","TRUNCATE","UPDATE"]},
      {"grantee":"supabase_storage_admin","is_grantable":true,"privileges":["DELETE","INSERT","MAINTAIN","REFERENCES","SELECT","TRIGGER","TRUNCATE","UPDATE"]}
    ]
  }
  $json$::JSONB;
  IF actual IS NOT DISTINCT FROM expected THEN
    catalog_profile := 'canonical';
  ELSIF actual IS NOT DISTINCT FROM expected_alternative THEN
    catalog_profile := 'production';
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request delivery storage isolation preflight failed.',
      DETAIL = format(
        'storage.objects expected one of %s or %s, observed %s.',
        expected, expected_alternative, actual
      );
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'role', role_value.rolname,
    'bypassRls', role_value.rolbypassrls,
    'superuser', role_value.rolsuper,
    'inherit', role_value.rolinherit
  ) ORDER BY role_value.rolname)
  INTO actual
  FROM pg_catalog.pg_roles AS role_value
  WHERE role_value.rolname = ANY (
    CASE catalog_profile
      WHEN 'production' THEN ARRAY[
        'anon', 'authenticated', 'postgres',
        'service_role', 'supabase_storage_admin'
      ]::TEXT[]
      ELSE ARRAY['anon', 'authenticated', 'service_role']::TEXT[]
    END
  );
  expected := CASE catalog_profile
    WHEN 'production' THEN $json$
      [
        {"role":"anon","bypassRls":false,"superuser":false,"inherit":true},
        {"role":"authenticated","bypassRls":false,"superuser":false,"inherit":true},
        {"role":"postgres","bypassRls":true,"superuser":false,"inherit":true},
        {"role":"service_role","bypassRls":true,"superuser":false,"inherit":true},
        {"role":"supabase_storage_admin","bypassRls":false,"superuser":false,"inherit":false}
      ]
    $json$::JSONB
    ELSE $json$
      [
        {"role":"anon","bypassRls":false,"superuser":false,"inherit":true},
        {"role":"authenticated","bypassRls":false,"superuser":false,"inherit":true},
        {"role":"service_role","bypassRls":true,"superuser":false,"inherit":true}
      ]
    $json$::JSONB
  END;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Request delivery storage isolation preflight failed.',
      DETAIL = format(
        'Role security attributes expected %s, observed %s.',
        expected, actual
      );
  END IF;

  -- Unknown incoming dependencies must be reported before a DROP is attempted.
  WITH roots AS (
    SELECT c.oid
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'build_requests', 'build_request_responses', 'build_request_votes'
      )
  ),
  unexpected AS (
    SELECT pg_catalog.format(
      'dependent relation %I.%I via %s',
      dependent_namespace.nspname,
      dependent_relation.relname,
      pg_catalog.pg_describe_object(
        dependency.classid, dependency.objid, dependency.objsubid
      )
    ) AS identity
    FROM roots
    JOIN pg_catalog.pg_depend AS dependency
      ON dependency.refclassid = 'pg_catalog.pg_class'::regclass
      AND dependency.refobjid = roots.oid
    JOIN pg_catalog.pg_rewrite AS rewrite_rule
      ON dependency.classid = 'pg_catalog.pg_rewrite'::regclass
      AND rewrite_rule.oid = dependency.objid
    JOIN pg_catalog.pg_class AS dependent_relation
      ON dependent_relation.oid = rewrite_rule.ev_class
    JOIN pg_catalog.pg_namespace AS dependent_namespace
      ON dependent_namespace.oid = dependent_relation.relnamespace
    WHERE dependent_relation.oid NOT IN (SELECT oid FROM roots)

    UNION ALL

    SELECT pg_catalog.format(
      'external foreign key %I.%I.%I',
      child_namespace.nspname, child_relation.relname, constraint_value.conname
    )
    FROM pg_catalog.pg_constraint AS constraint_value
    JOIN pg_catalog.pg_class AS child_relation
      ON child_relation.oid = constraint_value.conrelid
    JOIN pg_catalog.pg_namespace AS child_namespace
      ON child_namespace.oid = child_relation.relnamespace
    WHERE constraint_value.contype = 'f'
      AND constraint_value.confrelid IN (SELECT oid FROM roots)
      AND constraint_value.conrelid NOT IN (SELECT oid FROM roots)

    UNION ALL

    SELECT pg_catalog.format(
      'inheritance %s -> %s',
      inheritance.inhrelid::regclass,
      inheritance.inhparent::regclass
    )
    FROM pg_catalog.pg_inherits AS inheritance
    WHERE inheritance.inhrelid IN (SELECT oid FROM roots)
       OR inheritance.inhparent IN (SELECT oid FROM roots)

    UNION ALL

    SELECT pg_catalog.format(
      'publication %I contains %s',
      publication.pubname,
      publication_relation.prrelid::regclass
    )
    FROM pg_catalog.pg_publication_rel AS publication_relation
    JOIN pg_catalog.pg_publication AS publication
      ON publication.oid = publication_relation.prpubid
    WHERE publication_relation.prrelid IN (SELECT oid FROM roots)
  )
  SELECT string_agg(DISTINCT identity, '; ' ORDER BY identity)
  INTO drift
  FROM unexpected;

  IF drift IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = 'Unexpected dependency: ' || drift;
  END IF;

  SELECT jsonb_agg(to_jsonb(item) ORDER BY item.rel)
  INTO actual
  FROM (
    SELECT
      relation.relname AS rel,
      relation.relkind,
      relation.relrowsecurity AS row_security,
      relation.relforcerowsecurity AS force_row_security
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname LIKE 'build_request%'
      AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
  ) AS item;
  expected := $json$
  [
    {"rel":"build_request_responses","relkind":"r","row_security":true,"force_row_security":false},
    {"rel":"build_request_votes","relkind":"r","row_security":true,"force_row_security":false},
    {"rel":"build_requests","relkind":"r","row_security":true,"force_row_security":false}
  ]
  $json$::jsonb;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = format('Relation/RLS inventory expected %s, observed %s.', expected, actual);
  END IF;

  WITH roots AS (
    SELECT unnest(ARRAY[
      'public.build_requests'::regclass,
      'public.build_request_responses'::regclass,
      'public.build_request_votes'::regclass
    ]) AS oid
  )
  SELECT jsonb_agg(to_jsonb(item) ORDER BY item.rel, item.attnum)
  INTO actual
  FROM (
    SELECT
      relation.relname AS rel,
      attribute.attnum,
      attribute.attname,
      pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) AS data_type,
      attribute.attnotnull AS not_null,
      regexp_replace(
        lower(coalesce(pg_catalog.pg_get_expr(
          default_value.adbin, default_value.adrelid
        ), '')),
        '\s+', '', 'g'
      ) AS default_expr
    FROM pg_catalog.pg_attribute AS attribute
    JOIN pg_catalog.pg_class AS relation
      ON relation.oid = attribute.attrelid
    LEFT JOIN pg_catalog.pg_attrdef AS default_value
      ON default_value.adrelid = attribute.attrelid
      AND default_value.adnum = attribute.attnum
    WHERE attribute.attrelid IN (SELECT oid FROM roots)
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
  ) AS item;
  expected := $json$
  [
    {"rel":"build_request_responses","attnum":1,"attname":"id","not_null":true,"data_type":"uuid","default_expr":"gen_random_uuid()"},
    {"rel":"build_request_responses","attnum":2,"attname":"request_id","not_null":true,"data_type":"uuid","default_expr":""},
    {"rel":"build_request_responses","attnum":3,"attname":"responder_id","not_null":true,"data_type":"uuid","default_expr":""},
    {"rel":"build_request_responses","attnum":4,"attname":"prompt_id","not_null":false,"data_type":"uuid","default_expr":""},
    {"rel":"build_request_responses","attnum":5,"attname":"url","not_null":false,"data_type":"text","default_expr":""},
    {"rel":"build_request_responses","attnum":6,"attname":"body","not_null":true,"data_type":"text","default_expr":""},
    {"rel":"build_request_responses","attnum":7,"attname":"is_accepted","not_null":true,"data_type":"boolean","default_expr":"false"},
    {"rel":"build_request_responses","attnum":8,"attname":"vote_count","not_null":true,"data_type":"integer","default_expr":"0"},
    {"rel":"build_request_responses","attnum":9,"attname":"created_at","not_null":false,"data_type":"timestamp with time zone","default_expr":"now()"},
    {"rel":"build_request_votes","attnum":1,"attname":"id","not_null":true,"data_type":"uuid","default_expr":"gen_random_uuid()"},
    {"rel":"build_request_votes","attnum":2,"attname":"user_id","not_null":true,"data_type":"uuid","default_expr":""},
    {"rel":"build_request_votes","attnum":3,"attname":"request_id","not_null":true,"data_type":"uuid","default_expr":""},
    {"rel":"build_request_votes","attnum":4,"attname":"created_at","not_null":false,"data_type":"timestamp with time zone","default_expr":"now()"},
    {"rel":"build_requests","attnum":1,"attname":"id","not_null":true,"data_type":"uuid","default_expr":"gen_random_uuid()"},
    {"rel":"build_requests","attnum":2,"attname":"title","not_null":true,"data_type":"text","default_expr":""},
    {"rel":"build_requests","attnum":3,"attname":"body","not_null":true,"data_type":"text","default_expr":""},
    {"rel":"build_requests","attnum":4,"attname":"author_id","not_null":true,"data_type":"uuid","default_expr":""},
    {"rel":"build_requests","attnum":5,"attname":"status","not_null":true,"data_type":"text","default_expr":"'open'::text"},
    {"rel":"build_requests","attnum":6,"attname":"vote_count","not_null":true,"data_type":"integer","default_expr":"0"},
    {"rel":"build_requests","attnum":7,"attname":"accepted_response_id","not_null":false,"data_type":"uuid","default_expr":""},
    {"rel":"build_requests","attnum":8,"attname":"created_at","not_null":false,"data_type":"timestamp with time zone","default_expr":"now()"},
    {"rel":"build_requests","attnum":9,"attname":"updated_at","not_null":false,"data_type":"timestamp with time zone","default_expr":"now()"}
  ]
  $json$::jsonb;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = format('Column inventory expected %s, observed %s.', expected, actual);
  END IF;

  WITH roots AS (
    SELECT unnest(ARRAY[
      'public.build_requests'::regclass,
      'public.build_request_responses'::regclass,
      'public.build_request_votes'::regclass
    ]) AS oid
  )
  SELECT jsonb_agg(to_jsonb(item) ORDER BY item.rel, item.name)
  INTO actual
  FROM (
    SELECT
      relation.relname AS rel,
      constraint_value.conname AS name,
      constraint_value.contype AS type,
      constraint_value.convalidated AS validated,
      constraint_value.condeferrable AS deferrable,
      constraint_value.confdeltype AS delete_action,
      regexp_replace(
        pg_catalog.pg_get_constraintdef(constraint_value.oid, FALSE),
        '\s+', ' ', 'g'
      ) AS definition
    FROM pg_catalog.pg_constraint AS constraint_value
    JOIN pg_catalog.pg_class AS relation
      ON relation.oid = constraint_value.conrelid
    WHERE constraint_value.conrelid IN (SELECT oid FROM roots)
  ) AS item;
  expected := $json$
  [
    {"rel":"build_request_responses","name":"build_request_responses_body_length","type":"c","validated":true,"deferrable":false,"delete_action":" ","definition":"CHECK (((char_length(body) >= 1) AND (char_length(body) <= 5000)))"},
    {"rel":"build_request_responses","name":"build_request_responses_pathforge_url","type":"c","validated":true,"deferrable":false,"delete_action":" ","definition":"CHECK (((url IS NULL) OR ((char_length(url) <= 500) AND (url ~ '^/(prompt/[A-Za-z0-9-]+|[A-Za-z0-9-]+-demo)([?#].*)?$'::text))))"},
    {"rel":"build_request_responses","name":"build_request_responses_pkey","type":"p","validated":true,"deferrable":false,"delete_action":" ","definition":"PRIMARY KEY (id)"},
    {"rel":"build_request_responses","name":"build_request_responses_prompt_id_fkey","type":"f","validated":true,"deferrable":false,"delete_action":"n","definition":"FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE SET NULL"},
    {"rel":"build_request_responses","name":"build_request_responses_request_id_fkey","type":"f","validated":true,"deferrable":false,"delete_action":"c","definition":"FOREIGN KEY (request_id) REFERENCES build_requests(id) ON DELETE CASCADE"},
    {"rel":"build_request_responses","name":"build_request_responses_responder_id_fkey","type":"f","validated":true,"deferrable":false,"delete_action":"c","definition":"FOREIGN KEY (responder_id) REFERENCES profiles(id) ON DELETE CASCADE"},
    {"rel":"build_request_votes","name":"build_request_votes_pkey","type":"p","validated":true,"deferrable":false,"delete_action":" ","definition":"PRIMARY KEY (id)"},
    {"rel":"build_request_votes","name":"build_request_votes_request_id_fkey","type":"f","validated":true,"deferrable":false,"delete_action":"c","definition":"FOREIGN KEY (request_id) REFERENCES build_requests(id) ON DELETE CASCADE"},
    {"rel":"build_request_votes","name":"build_request_votes_user_id_fkey","type":"f","validated":true,"deferrable":false,"delete_action":"c","definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},
    {"rel":"build_request_votes","name":"build_request_votes_user_id_request_id_key","type":"u","validated":true,"deferrable":false,"delete_action":" ","definition":"UNIQUE (user_id, request_id)"},
    {"rel":"build_requests","name":"build_requests_accepted_response_fk","type":"f","validated":true,"deferrable":false,"delete_action":"n","definition":"FOREIGN KEY (accepted_response_id) REFERENCES build_request_responses(id) ON DELETE SET NULL"},
    {"rel":"build_requests","name":"build_requests_author_id_fkey","type":"f","validated":true,"deferrable":false,"delete_action":"c","definition":"FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE"},
    {"rel":"build_requests","name":"build_requests_body_length","type":"c","validated":true,"deferrable":false,"delete_action":" ","definition":"CHECK (((char_length(body) >= 20) AND (char_length(body) <= 5000)))"},
    {"rel":"build_requests","name":"build_requests_pkey","type":"p","validated":true,"deferrable":false,"delete_action":" ","definition":"PRIMARY KEY (id)"},
    {"rel":"build_requests","name":"build_requests_status_check","type":"c","validated":true,"deferrable":false,"delete_action":" ","definition":"CHECK ((status = ANY (ARRAY['open'::text, 'answered'::text, 'closed'::text])))"},
    {"rel":"build_requests","name":"build_requests_title_length","type":"c","validated":true,"deferrable":false,"delete_action":" ","definition":"CHECK (((char_length(title) >= 4) AND (char_length(title) <= 160)))"}
  ]
  $json$::jsonb;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = format('Constraint inventory expected %s, observed %s.', expected, actual);
  END IF;

  WITH roots AS (
    SELECT unnest(ARRAY[
      'public.build_requests'::regclass,
      'public.build_request_responses'::regclass,
      'public.build_request_votes'::regclass
    ]) AS oid
  )
  SELECT jsonb_agg(to_jsonb(item) ORDER BY item.rel, item.name)
  INTO actual
  FROM (
    SELECT
      relation.relname AS rel,
      index_relation.relname AS name,
      index_value.indisunique AS unique_index,
      index_value.indisprimary AS primary_index,
      index_value.indisvalid AS valid,
      index_value.indisready AS ready,
      regexp_replace(
        pg_catalog.pg_get_indexdef(index_value.indexrelid), '\s+', ' ', 'g'
      ) AS definition
    FROM pg_catalog.pg_index AS index_value
    JOIN pg_catalog.pg_class AS relation
      ON relation.oid = index_value.indrelid
    JOIN pg_catalog.pg_class AS index_relation
      ON index_relation.oid = index_value.indexrelid
    WHERE index_value.indrelid IN (SELECT oid FROM roots)
  ) AS item;
  expected := $json$
  [
    {"rel":"build_request_responses","name":"build_request_responses_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX build_request_responses_pkey ON public.build_request_responses USING btree (id)","unique_index":true,"primary_index":true},
    {"rel":"build_request_responses","name":"idx_build_request_responses_request","ready":true,"valid":true,"definition":"CREATE INDEX idx_build_request_responses_request ON public.build_request_responses USING btree (request_id)","unique_index":false,"primary_index":false},
    {"rel":"build_request_votes","name":"build_request_votes_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX build_request_votes_pkey ON public.build_request_votes USING btree (id)","unique_index":true,"primary_index":true},
    {"rel":"build_request_votes","name":"build_request_votes_user_id_request_id_key","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX build_request_votes_user_id_request_id_key ON public.build_request_votes USING btree (user_id, request_id)","unique_index":true,"primary_index":false},
    {"rel":"build_request_votes","name":"idx_build_request_votes_request","ready":true,"valid":true,"definition":"CREATE INDEX idx_build_request_votes_request ON public.build_request_votes USING btree (request_id)","unique_index":false,"primary_index":false},
    {"rel":"build_requests","name":"build_requests_pkey","ready":true,"valid":true,"definition":"CREATE UNIQUE INDEX build_requests_pkey ON public.build_requests USING btree (id)","unique_index":true,"primary_index":true},
    {"rel":"build_requests","name":"idx_build_requests_author","ready":true,"valid":true,"definition":"CREATE INDEX idx_build_requests_author ON public.build_requests USING btree (author_id)","unique_index":false,"primary_index":false},
    {"rel":"build_requests","name":"idx_build_requests_status","ready":true,"valid":true,"definition":"CREATE INDEX idx_build_requests_status ON public.build_requests USING btree (status)","unique_index":false,"primary_index":false}
  ]
  $json$::jsonb;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = format('Index inventory expected %s, observed %s.', expected, actual);
  END IF;

  WITH roots AS (
    SELECT unnest(ARRAY[
      'public.build_requests'::regclass,
      'public.build_request_responses'::regclass,
      'public.build_request_votes'::regclass
    ]) AS oid
  )
  SELECT jsonb_agg(to_jsonb(item) ORDER BY item.rel, item.name)
  INTO actual
  FROM (
    SELECT
      relation.relname AS rel,
      trigger_value.tgname AS name,
      trigger_value.tgenabled AS enabled,
      regexp_replace(
        pg_catalog.pg_get_triggerdef(trigger_value.oid, FALSE),
        '\s+', ' ', 'g'
      ) AS definition
    FROM pg_catalog.pg_trigger AS trigger_value
    JOIN pg_catalog.pg_class AS relation
      ON relation.oid = trigger_value.tgrelid
    WHERE trigger_value.tgrelid IN (SELECT oid FROM roots)
      AND NOT trigger_value.tgisinternal
  ) AS item;
  expected := $json$
  [
    {"rel":"build_request_responses","name":"build_request_response_touch_trigger","enabled":"O","definition":"CREATE TRIGGER build_request_response_touch_trigger AFTER INSERT ON public.build_request_responses FOR EACH ROW EXECUTE FUNCTION touch_build_request_on_response()"},
    {"rel":"build_request_responses","name":"enforce_pathforge_build_response_quota","enabled":"O","definition":"CREATE TRIGGER enforce_pathforge_build_response_quota BEFORE INSERT ON public.build_request_responses FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_mutation_quota()"},
    {"rel":"build_request_votes","name":"build_request_vote_count_trigger","enabled":"O","definition":"CREATE TRIGGER build_request_vote_count_trigger AFTER INSERT OR DELETE ON public.build_request_votes FOR EACH ROW EXECUTE FUNCTION update_build_request_vote_count()"},
    {"rel":"build_requests","name":"enforce_pathforge_build_request_quota","enabled":"O","definition":"CREATE TRIGGER enforce_pathforge_build_request_quota BEFORE INSERT ON public.build_requests FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_mutation_quota()"}
  ]
  $json$::jsonb;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = format('Trigger inventory expected %s, observed %s.', expected, actual);
  END IF;

  SELECT jsonb_agg(to_jsonb(item) ORDER BY item.tablename, item.policyname)
  INTO actual
  FROM (
    SELECT
      policy.tablename,
      policy.policyname,
      policy.permissive,
      policy.roles,
      policy.cmd,
      regexp_replace(coalesce(policy.qual, ''), '\s+', ' ', 'g') AS qual,
      regexp_replace(coalesce(policy.with_check, ''), '\s+', ' ', 'g') AS with_check
    FROM pg_catalog.pg_policies AS policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename IN (
        'build_requests', 'build_request_responses', 'build_request_votes'
      )
  ) AS item;
  expected := $json$
  [
    {"cmd":"SELECT","qual":"true","roles":["public"],"tablename":"build_request_responses","permissive":"PERMISSIVE","policyname":"Build request responses are publicly visible","with_check":""},
    {"cmd":"INSERT","qual":"","roles":["authenticated"],"tablename":"build_request_responses","permissive":"PERMISSIVE","policyname":"Users create unaccepted zero-vote build responses","with_check":"((auth.uid() = responder_id) AND (is_accepted = false) AND (vote_count = 0) AND (EXISTS ( SELECT 1 FROM build_requests WHERE ((build_requests.id = build_request_responses.request_id) AND (build_requests.status <> 'closed'::text)))))"},
    {"cmd":"SELECT","qual":"((user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))","roles":["public"],"tablename":"build_request_votes","permissive":"PERMISSIVE","policyname":"Build request votes visible to owners and admins","with_check":""},
    {"cmd":"DELETE","qual":"(auth.uid() = user_id)","roles":["authenticated"],"tablename":"build_request_votes","permissive":"PERMISSIVE","policyname":"Users can remove own build request votes","with_check":""},
    {"cmd":"INSERT","qual":"","roles":["authenticated"],"tablename":"build_request_votes","permissive":"PERMISSIVE","policyname":"Users vote on open build requests","with_check":"((auth.uid() = user_id) AND (EXISTS ( SELECT 1 FROM build_requests WHERE ((build_requests.id = build_request_votes.request_id) AND (build_requests.status <> 'closed'::text)))))"},
    {"cmd":"SELECT","qual":"true","roles":["public"],"tablename":"build_requests","permissive":"PERMISSIVE","policyname":"Build requests are publicly visible","with_check":""},
    {"cmd":"INSERT","qual":"","roles":["authenticated"],"tablename":"build_requests","permissive":"PERMISSIVE","policyname":"Users create open zero-vote build requests","with_check":"((auth.uid() = author_id) AND (status = 'open'::text) AND (vote_count = 0) AND (accepted_response_id IS NULL))"}
  ]
  $json$::jsonb;
  expected_alternative := $json$
  [
    {"cmd":"SELECT","qual":"true","roles":["public"],"tablename":"build_request_responses","permissive":"PERMISSIVE","policyname":"Build request responses are publicly visible","with_check":""},
    {"cmd":"INSERT","qual":"","roles":["authenticated"],"tablename":"build_request_responses","permissive":"PERMISSIVE","policyname":"Users create unaccepted zero-vote build responses","with_check":"((responder_id = ( SELECT auth.uid() AS uid)) AND (is_accepted = false) AND (vote_count = 0) AND ((url IS NULL) OR (url ~ '^/(prompt/[A-Za-z0-9-]+|[A-Za-z0-9-]+-demo)([?#].*)?$'::text)) AND (EXISTS ( SELECT 1 FROM build_requests WHERE ((build_requests.id = build_request_responses.request_id) AND (build_requests.status <> 'closed'::text)))))"},
    {"cmd":"SELECT","qual":"((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))","roles":["public"],"tablename":"build_request_votes","permissive":"PERMISSIVE","policyname":"Build request votes visible to owners and admins","with_check":""},
    {"cmd":"DELETE","qual":"(auth.uid() = user_id)","roles":["public"],"tablename":"build_request_votes","permissive":"PERMISSIVE","policyname":"Users can remove own build request votes","with_check":""},
    {"cmd":"INSERT","qual":"","roles":["authenticated"],"tablename":"build_request_votes","permissive":"PERMISSIVE","policyname":"Users vote on open build requests","with_check":"((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1 FROM build_requests WHERE ((build_requests.id = build_request_votes.request_id) AND (build_requests.status <> 'closed'::text)))))"},
    {"cmd":"SELECT","qual":"true","roles":["public"],"tablename":"build_requests","permissive":"PERMISSIVE","policyname":"Build requests are publicly visible","with_check":""},
    {"cmd":"INSERT","qual":"","roles":["authenticated"],"tablename":"build_requests","permissive":"PERMISSIVE","policyname":"Users create open zero-vote build requests","with_check":"((author_id = ( SELECT auth.uid() AS uid)) AND (status = 'open'::text) AND (vote_count = 0) AND (accepted_response_id IS NULL))"}
  ]
  $json$::jsonb;
  IF (
    catalog_profile = 'canonical'
    AND actual IS DISTINCT FROM expected
  ) OR (
    catalog_profile = 'production'
    AND actual IS DISTINCT FROM expected_alternative
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = format(
        'Policy inventory for %s profile expected %s, observed %s.',
        catalog_profile,
        CASE WHEN catalog_profile = 'canonical'
          THEN expected ELSE expected_alternative END,
        actual
      );
  END IF;

  WITH roots AS (
    SELECT unnest(ARRAY[
      'public.build_requests'::regclass,
      'public.build_request_responses'::regclass,
      'public.build_request_votes'::regclass
    ]) AS oid
  ),
  acl_rows AS (
    SELECT
      relation.relname AS rel,
      ''::TEXT AS column_name,
      pg_catalog.pg_get_userbyid(acl.grantee) AS grantee,
      acl.privilege_type,
      acl.is_grantable
    FROM pg_catalog.pg_class AS relation
    CROSS JOIN LATERAL pg_catalog.aclexplode(relation.relacl) AS acl
    WHERE relation.oid IN (SELECT oid FROM roots)
      AND acl.grantee <> relation.relowner

    UNION ALL

    SELECT
      relation.relname,
      attribute.attname,
      pg_catalog.pg_get_userbyid(acl.grantee),
      acl.privilege_type,
      acl.is_grantable
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_attribute AS attribute
      ON attribute.attrelid = relation.oid
    CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS acl
    WHERE relation.oid IN (SELECT oid FROM roots)
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
      AND acl.grantee <> relation.relowner
  )
  SELECT jsonb_agg(
    to_jsonb(acl_rows)
    ORDER BY rel, column_name, grantee, privilege_type
  )
  INTO actual
  FROM acl_rows;
  expected := $json$
  [
    {"rel":"build_request_responses","grantee":"anon","column_name":"","is_grantable":false,"privilege_type":"SELECT"},
    {"rel":"build_request_responses","grantee":"authenticated","column_name":"","is_grantable":false,"privilege_type":"SELECT"},
    {"rel":"build_request_responses","grantee":"authenticated","column_name":"body","is_grantable":false,"privilege_type":"INSERT"},
    {"rel":"build_request_responses","grantee":"authenticated","column_name":"prompt_id","is_grantable":false,"privilege_type":"INSERT"},
    {"rel":"build_request_responses","grantee":"authenticated","column_name":"request_id","is_grantable":false,"privilege_type":"INSERT"},
    {"rel":"build_request_responses","grantee":"authenticated","column_name":"responder_id","is_grantable":false,"privilege_type":"INSERT"},
    {"rel":"build_request_responses","grantee":"authenticated","column_name":"url","is_grantable":false,"privilege_type":"INSERT"},
    {"rel":"build_request_votes","grantee":"anon","column_name":"","is_grantable":false,"privilege_type":"SELECT"},
    {"rel":"build_request_votes","grantee":"authenticated","column_name":"","is_grantable":false,"privilege_type":"DELETE"},
    {"rel":"build_request_votes","grantee":"authenticated","column_name":"","is_grantable":false,"privilege_type":"SELECT"},
    {"rel":"build_request_votes","grantee":"authenticated","column_name":"request_id","is_grantable":false,"privilege_type":"INSERT"},
    {"rel":"build_request_votes","grantee":"authenticated","column_name":"user_id","is_grantable":false,"privilege_type":"INSERT"},
    {"rel":"build_requests","grantee":"anon","column_name":"","is_grantable":false,"privilege_type":"SELECT"},
    {"rel":"build_requests","grantee":"authenticated","column_name":"","is_grantable":false,"privilege_type":"SELECT"},
    {"rel":"build_requests","grantee":"authenticated","column_name":"author_id","is_grantable":false,"privilege_type":"INSERT"},
    {"rel":"build_requests","grantee":"authenticated","column_name":"body","is_grantable":false,"privilege_type":"INSERT"},
    {"rel":"build_requests","grantee":"authenticated","column_name":"title","is_grantable":false,"privilege_type":"INSERT"}
  ]
  $json$::jsonb;
  SELECT jsonb_agg(
    acl_value
    ORDER BY
      acl_value->>'rel',
      acl_value->>'column_name',
      acl_value->>'grantee',
      acl_value->>'privilege_type'
  )
  INTO expected_alternative
  FROM (
    SELECT canonical_value AS acl_value
    FROM jsonb_array_elements(expected) AS canonical_value

    UNION ALL

    SELECT jsonb_build_object(
      'rel', relation_name,
      'grantee', 'service_role',
      'column_name', '',
      'is_grantable', FALSE,
      'privilege_type', privilege_name
    )
    FROM unnest(ARRAY[
      'build_request_responses',
      'build_request_votes',
      'build_requests'
    ]::TEXT[]) AS relation_name
    CROSS JOIN unnest(ARRAY[
      'DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES',
      'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'
    ]::TEXT[]) AS privilege_name
  ) AS expected_acl;
  IF (
    catalog_profile = 'canonical'
    AND actual IS DISTINCT FROM expected
  ) OR (
    catalog_profile = 'production'
    AND actual IS DISTINCT FROM expected_alternative
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = format(
        'ACL inventory for %s profile expected %s, observed %s.',
        catalog_profile,
        CASE WHEN catalog_profile = 'canonical'
          THEN expected ELSE expected_alternative END,
        actual
      );
  END IF;

  SELECT jsonb_agg(to_jsonb(item) ORDER BY item.identity)
  INTO actual
  FROM (
    SELECT
      namespace.nspname || '.' || procedure.proname || '('
        || pg_catalog.pg_get_function_identity_arguments(procedure.oid) || ')'
        AS identity,
      owner_role.rolname AS owner,
      language.lanname AS language,
      pg_catalog.format_type(procedure.prorettype, NULL) AS returns,
      procedure.prosecdef AS security_definer,
      procedure.provolatile AS volatility,
      procedure.proisstrict AS strict,
      procedure.proconfig AS config,
      CASE
        -- This quota function is shared with unrelated PathForge mutation
        -- triggers. Fingerprint its security envelope, not its evolving cases.
        WHEN namespace.nspname = 'private' THEN NULL
        ELSE regexp_replace(
          pg_catalog.pg_get_functiondef(procedure.oid), '\s+', ' ', 'g'
        )
      END AS definition
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    JOIN pg_catalog.pg_language AS language
      ON language.oid = procedure.prolang
    JOIN pg_catalog.pg_roles AS owner_role
      ON owner_role.oid = procedure.proowner
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
  ) AS item;
  expected := $json$
  [
    {"owner":"postgres","config":["search_path=\"\""],"strict":false,"returns":"trigger","identity":"private.enforce_pathforge_mutation_quota()","language":"plpgsql","definition":null,"volatility":"v","security_definer":true},
    {"owner":"postgres","config":["search_path=\"\""],"strict":false,"returns":"trigger","identity":"public.touch_build_request_on_response()","language":"plpgsql","definition":"CREATE OR REPLACE FUNCTION public.touch_build_request_on_response() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$ BEGIN UPDATE public.build_requests SET updated_at = NOW(), status = CASE WHEN status = 'open' THEN 'answered' ELSE status END WHERE id = NEW.request_id; RETURN NEW; END; $function$ ","volatility":"v","security_definer":true},
    {"owner":"postgres","config":["search_path=\"\""],"strict":false,"returns":"trigger","identity":"public.update_build_request_vote_count()","language":"plpgsql","definition":"CREATE OR REPLACE FUNCTION public.update_build_request_vote_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$ BEGIN IF TG_OP = 'INSERT' THEN UPDATE public.build_requests SET vote_count = vote_count + 1, updated_at = NOW() WHERE id = NEW.request_id; RETURN NEW; END IF; IF TG_OP = 'DELETE' THEN UPDATE public.build_requests SET vote_count = GREATEST(vote_count - 1, 0), updated_at = NOW() WHERE id = OLD.request_id; RETURN OLD; END IF; RETURN NULL; END; $function$ ","volatility":"v","security_definer":true}
  ]
  $json$::jsonb;
  expected_alternative := $json$
  [
    {"owner":"postgres","config":["search_path=\"\""],"strict":false,"returns":"trigger","identity":"private.enforce_pathforge_mutation_quota()","language":"plpgsql","definition":null,"volatility":"v","security_definer":true},
    {"owner":"postgres","config":["search_path=public"],"strict":false,"returns":"trigger","identity":"public.touch_build_request_on_response()","language":"plpgsql","definition":"CREATE OR REPLACE FUNCTION public.touch_build_request_on_response() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$ BEGIN UPDATE build_requests SET updated_at = NOW(), status = CASE WHEN status = 'open' THEN 'answered' ELSE status END WHERE id = NEW.request_id; RETURN NEW; END; $function$ ","volatility":"v","security_definer":true},
    {"owner":"postgres","config":["search_path=public"],"strict":false,"returns":"trigger","identity":"public.update_build_request_vote_count()","language":"plpgsql","definition":"CREATE OR REPLACE FUNCTION public.update_build_request_vote_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$ BEGIN IF TG_OP = 'INSERT' THEN UPDATE build_requests SET vote_count = vote_count + 1, updated_at = NOW() WHERE id = NEW.request_id; RETURN NEW; END IF; IF TG_OP = 'DELETE' THEN UPDATE build_requests SET vote_count = GREATEST(vote_count - 1, 0), updated_at = NOW() WHERE id = OLD.request_id; RETURN OLD; END IF; RETURN NULL; END; $function$ ","volatility":"v","security_definer":true}
  ]
  $json$::jsonb;
  IF (
    catalog_profile = 'canonical'
    AND actual IS DISTINCT FROM expected
  ) OR (
    catalog_profile = 'production'
    AND actual IS DISTINCT FROM expected_alternative
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = format(
        'Function inventory for %s profile expected %s, observed %s.',
        catalog_profile,
        CASE WHEN catalog_profile = 'canonical'
          THEN expected ELSE expected_alternative END,
        actual
      );
  END IF;

  -- No non-owner role may execute the trigger functions. The quota function is
  -- retained because other PathForge relations also depend on it.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(
      procedure.proacl,
      pg_catalog.acldefault('f', procedure.proowner)
    )) AS acl
    WHERE (
      (
        namespace.nspname = 'public'
        AND procedure.proname IN (
          'touch_build_request_on_response',
          'update_build_request_vote_count'
        )
      ) OR (
        namespace.nspname = 'private'
        AND procedure.proname = 'enforce_pathforge_mutation_quota'
      )
    )
      AND (
        (
          acl.privilege_type = 'EXECUTE'
          AND acl.grantee IN (
            0,
            (SELECT role_value.oid FROM pg_catalog.pg_roles AS role_value
              WHERE role_value.rolname = 'anon'),
            (SELECT role_value.oid FROM pg_catalog.pg_roles AS role_value
              WHERE role_value.rolname = 'authenticated'),
            (SELECT role_value.oid FROM pg_catalog.pg_roles AS role_value
              WHERE role_value.rolname = 'service_role')
          )
        )
        OR pg_catalog.has_function_privilege(
          'anon', procedure.oid, 'EXECUTE'
        )
        OR pg_catalog.has_function_privilege(
          'authenticated', procedure.oid, 'EXECUTE'
        )
        OR pg_catalog.has_function_privilege(
          'service_role', procedure.oid, 'EXECUTE'
        )
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL =
        'A legacy trigger function grants effective EXECUTE to an application role.';
  END IF;

  -- The two public functions are about to be dropped. They may be used only by
  -- their expected legacy triggers. The shared private quota function is
  -- intentionally excluded from this check and must not be dropped.
  SELECT string_agg(
    relation.relname || '.' || trigger_value.tgname,
    '; ' ORDER BY relation.relname, trigger_value.tgname
  )
  INTO drift
  FROM pg_catalog.pg_trigger AS trigger_value
  JOIN pg_catalog.pg_class AS relation
    ON relation.oid = trigger_value.tgrelid
  JOIN pg_catalog.pg_proc AS procedure
    ON procedure.oid = trigger_value.tgfoid
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'touch_build_request_on_response',
      'update_build_request_vote_count'
    )
    AND NOT trigger_value.tgisinternal
    AND (
      (procedure.proname = 'touch_build_request_on_response' AND (
        relation.oid <> 'public.build_request_responses'::regclass
        OR trigger_value.tgname <> 'build_request_response_touch_trigger'
      ))
      OR
      (procedure.proname = 'update_build_request_vote_count' AND (
        relation.oid <> 'public.build_request_votes'::regclass
        OR trigger_value.tgname <> 'build_request_vote_count_trigger'
      ))
    );
  IF drift IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Legacy Request a Build catalog fingerprint mismatch.',
      DETAIL = 'Unexpected dependency on a function scheduled for DROP: ' || drift;
  END IF;

ALTER TABLE public.build_requests
  DROP CONSTRAINT build_requests_accepted_response_fk;
DROP TABLE public.build_request_votes;
DROP TABLE public.build_request_responses;
DROP TABLE public.build_requests;
DROP FUNCTION IF EXISTS public.update_build_request_vote_count();
DROP FUNCTION IF EXISTS public.touch_build_request_on_response();

CREATE TABLE public.build_request_controls (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  controls_version INTEGER NOT NULL DEFAULT 1 CHECK (controls_version > 0),
  mode TEXT NOT NULL DEFAULT 'private_v1' CHECK (mode = 'private_v1'),
  accepting_requests BOOLEAN NOT NULL DEFAULT FALSE,
  assigning_requests BOOLEAN NOT NULL DEFAULT FALSE,
  active_case_capacity INTEGER NOT NULL DEFAULT 4
    CHECK (active_case_capacity BETWEEN 1 AND 4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

INSERT INTO public.build_request_controls (
  singleton,
  controls_version,
  mode,
  accepting_requests,
  assigning_requests,
  active_case_capacity
) VALUES (TRUE, 1, 'private_v1', FALSE, FALSE, 4);

CREATE TABLE private.request_cursor_keys (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  secret BYTEA NOT NULL CHECK (octet_length(secret) = 32)
);
INSERT INTO private.request_cursor_keys (singleton, secret)
VALUES (TRUE, extensions.gen_random_bytes(32));
ALTER TABLE private.request_cursor_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.request_cursor_keys
FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE private.request_pseudonym_keys (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  secret BYTEA NOT NULL CHECK (octet_length(secret) = 32)
);
INSERT INTO private.request_pseudonym_keys (singleton, secret)
VALUES (TRUE, extensions.gen_random_bytes(32));
ALTER TABLE private.request_pseudonym_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.request_pseudonym_keys FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.request_pseudonym_keys
FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.build_request_pilot_admissions (
  account_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
  admission_version INTEGER NOT NULL DEFAULT 1 CHECK (admission_version > 0),
  admitted BOOLEAN NOT NULL,
  expires_at TIMESTAMPTZ,
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_by_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.build_request_pilot_admission_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  account_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  account_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL,
  admission_version INTEGER NOT NULL CHECK (admission_version > 0),
  admitted BOOLEAN NOT NULL,
  expires_at TIMESTAMPTZ,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (admitted OR expires_at IS NULL),
  UNIQUE (actor_id, idempotency_key)
);

CREATE TABLE public.build_request_account_deidentification_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_digest TEXT NOT NULL CHECK (actor_digest ~ '^[0-9a-f]{64}$'),
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  subject_digest TEXT NOT NULL CHECK (subject_digest ~ '^[0-9a-f]{64}$'),
  affected_case_count INTEGER NOT NULL CHECK (
    affected_case_count BETWEEN 0 AND 10000
  ),
  terminalized_case_count INTEGER NOT NULL CHECK (
    terminalized_case_count BETWEEN 0 AND affected_case_count
  ),
  admission_revoked BOOLEAN NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL,
  CHECK (expires_at = occurred_at + INTERVAL '400 days'),
  UNIQUE (actor_digest, idempotency_key)
);

CREATE TABLE public.build_request_deidentified_accounts (
  subject_digest TEXT PRIMARY KEY CHECK (subject_digest ~ '^[0-9a-f]{64}$'),
  deidentified_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.build_request_audit_tombstones (
  request_digest TEXT PRIMARY KEY CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  lifecycle_state TEXT NOT NULL,
  moderation_state TEXT NOT NULL,
  publication_state TEXT NOT NULL,
  close_reason TEXT,
  terminal_at TIMESTAMPTZ NOT NULL,
  event_count INTEGER NOT NULL CHECK (event_count >= 0),
  event_aggregate_digest TEXT NOT NULL CHECK (
    event_aggregate_digest ~ '^[0-9a-f]{64}$'
  ),
  manifest_digests JSONB NOT NULL CHECK (
    jsonb_typeof(manifest_digests) = 'array'
  ),
  aggregate_digest TEXT NOT NULL UNIQUE CHECK (
    aggregate_digest ~ '^[0-9a-f]{64}$'
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.build_request_audit_cleanup_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_digest TEXT NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  cleaned BOOLEAN NOT NULL,
  aggregate_digest TEXT NOT NULL CHECK (
    aggregate_digest ~ '^[0-9a-f]{64}$'
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.build_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requester_display_name TEXT NOT NULL
    CHECK (char_length(btrim(requester_display_name)) BETWEEN 1 AND 120),
  requester_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  lifecycle_state TEXT NOT NULL DEFAULT 'submitted' CHECK (
    lifecycle_state IN (
      'submitted', 'triage', 'clarification_requested', 'accepted',
      'building', 'review_pending', 'repair_required', 'delivery_ready',
      'delivered', 'completed', 'closed'
    )
  ),
  moderation_state TEXT NOT NULL DEFAULT 'clear'
    CHECK (moderation_state IN ('clear', 'held', 'removed')),
  publication_state TEXT NOT NULL DEFAULT 'private' CHECK (
    publication_state IN (
      'private', 'consent_pending', 'consented_pending_airlock',
      'published', 'withdrawn'
    )
  ),
  close_reason TEXT CHECK (
    close_reason IN (
      'existing_resolution', 'duplicate', 'out_of_scope',
      'capacity_unavailable', 'declined', 'withdrawn', 'expired',
      'failed_review', 'safety_removed', 'no_response'
    )
  ),
  close_explanation TEXT CHECK (
    close_explanation IS NULL
    OR char_length(btrim(close_explanation)) BETWEEN 1 AND 2000
  ),
  current_brief_revision_id UUID,
  current_delivery_revision_id UUID,
  resolution_reference JSONB,
  target_date DATE,
  delivery_response_started_at TIMESTAMPTZ,
  terminal_at TIMESTAMPTZ,
  raw_text_purged_at TIMESTAMPTZ,
  audit_tombstone_until TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (lifecycle_state = 'closed' AND close_reason IS NOT NULL)
    OR (lifecycle_state <> 'closed' AND close_reason IS NULL)
  )
);

-- Frozen legacy compatibility relations. These preserve the retired public
-- board relation shapes only; request_id has no relationship to private cases.
CREATE TABLE public.build_request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  responder_id UUID NOT NULL,
  prompt_id UUID,
  url TEXT,
  body TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.build_request_responses IS
  'Frozen empty legacy compatibility relation; not linked to private build requests.';

CREATE TABLE public.build_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, request_id)
);
COMMENT ON TABLE public.build_request_votes IS
  'Frozen empty legacy compatibility relation; not linked to private build requests.';

CREATE TABLE public.build_request_brief_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 4 AND 120),
  outcome TEXT NOT NULL CHECK (char_length(btrim(outcome)) BETWEEN 20 AND 4000),
  intended_user TEXT NOT NULL CHECK (char_length(btrim(intended_user)) BETWEEN 2 AND 1000),
  must_work_scenario TEXT NOT NULL
    CHECK (char_length(btrim(must_work_scenario)) BETWEEN 10 AND 1000),
  constraints TEXT NOT NULL CHECK (char_length(btrim(constraints)) <= 2000),
  pathforge_reference JSONB,
  authored_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  authored_by_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (request_id, revision_number),
  UNIQUE (request_id, id)
);

ALTER TABLE public.build_requests
  ADD CONSTRAINT build_requests_current_brief_revision_fk
  FOREIGN KEY (id, current_brief_revision_id)
  REFERENCES public.build_request_brief_revisions(request_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.build_request_acceptance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  brief_revision_id UUID NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal BETWEEN 1 AND 3),
  check_text TEXT NOT NULL CHECK (char_length(btrim(check_text)) BETWEEN 4 AND 500),
  FOREIGN KEY (request_id, brief_revision_id)
    REFERENCES public.build_request_brief_revisions(request_id, id)
    ON DELETE CASCADE,
  UNIQUE (brief_revision_id, ordinal),
  UNIQUE (request_id, brief_revision_id, id)
);

CREATE UNIQUE INDEX build_request_acceptance_checks_distinct
  ON public.build_request_acceptance_checks (brief_revision_id, lower(btrim(check_text)));

CREATE TABLE public.build_request_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('requester', 'triager', 'builder', 'reviewer')),
  account_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 120),
  deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX build_request_one_active_participant_role
  ON public.build_request_participants (request_id, actor_role)
  WHERE active;

CREATE TABLE public.build_request_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  assignment_role TEXT NOT NULL CHECK (assignment_role IN ('builder', 'reviewer')),
  account_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 120),
  deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_by_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ended_at TIMESTAMPTZ,
  UNIQUE (request_id, id),
  UNIQUE NULLS NOT DISTINCT (
    request_id, id, assignment_role, account_id
  ),
  CHECK ((active AND ended_at IS NULL AND account_id IS NOT NULL)
    OR (NOT active AND ended_at IS NOT NULL))
);

CREATE UNIQUE INDEX build_request_one_active_assignment_role
  ON public.build_request_assignments (request_id, assignment_role)
  WHERE active;

CREATE TABLE public.build_request_clarifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  question TEXT NOT NULL CHECK (char_length(btrim(question)) BETWEEN 1 AND 2000),
  answer TEXT CHECK (char_length(btrim(answer)) BETWEEN 1 AND 4000),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_by_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  answered_at TIMESTAMPTZ,
  UNIQUE (request_id, sequence),
  UNIQUE (request_id, id),
  CHECK ((answer IS NULL AND answered_at IS NULL) OR (answer IS NOT NULL AND answered_at IS NOT NULL))
);

-- Immutable acceptance-time snapshot of the complete bounded clarification
-- exchange. The digest is re-derived from source rows when a delivery is
-- sealed, so later mutation, addition, or omission fails closed.
CREATE TABLE public.build_request_accepted_clarification_sets (
  request_id UUID PRIMARY KEY REFERENCES public.build_requests(id) ON DELETE CASCADE,
  brief_revision_id UUID NOT NULL UNIQUE,
  accepted_clarifications JSONB NOT NULL CHECK (
    jsonb_typeof(accepted_clarifications) = 'array'
    AND jsonb_array_length(accepted_clarifications) BETWEEN 0 AND 3
  ),
  accepted_clarification_count INTEGER NOT NULL CHECK (
    accepted_clarification_count BETWEEN 0 AND 3
  ),
  accepted_clarification_digest TEXT NOT NULL CHECK (
    accepted_clarification_digest ~ '^[0-9a-f]{64}$'
  ),
  clarification_acceptance_cutoff TIMESTAMPTZ NOT NULL,
  accepted_clarifications_redacted BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_clarifications_redacted_at TIMESTAMPTZ,
  FOREIGN KEY (request_id, brief_revision_id)
    REFERENCES public.build_request_brief_revisions(request_id, id)
    ON DELETE CASCADE,
  CHECK (
    accepted_clarification_count =
      jsonb_array_length(accepted_clarifications)
  ),
  CHECK (
    (NOT accepted_clarifications_redacted
      AND accepted_clarifications_redacted_at IS NULL)
    OR
    (accepted_clarifications_redacted
      AND accepted_clarifications_redacted_at IS NOT NULL)
  )
);

CREATE TABLE public.build_request_delivery_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  revision_number INTEGER CHECK (revision_number > 0),
  revision_state TEXT NOT NULL DEFAULT 'staging'
    CHECK (
      revision_state IN (
        'staging', 'prepared', 'sealed', 'submitted', 'abandoned'
      )
    ),
  accepted_brief_revision_id UUID NOT NULL,
  builder_assignment_id UUID NOT NULL,
  builder_role TEXT NOT NULL DEFAULT 'builder' CHECK (builder_role = 'builder'),
  artifact_manifest_digest TEXT CHECK (artifact_manifest_digest ~ '^[0-9a-fA-F]{64}$'),
  artifact_count INTEGER CHECK (artifact_count BETWEEN 1 AND 5),
  total_bytes BIGINT CHECK (total_bytes BETWEEN 1 AND 12000000),
  evidence_checklist_version INTEGER CHECK (evidence_checklist_version BETWEEN 1 AND 10000),
  rights_snapshot_version INTEGER CHECK (rights_snapshot_version BETWEEN 1 AND 10000),
  revision_label TEXT CHECK (char_length(btrim(revision_label)) BETWEEN 1 AND 80),
  summary TEXT CHECK (char_length(btrim(summary)) BETWEEN 1 AND 2000),
  approved_pathforge_reference JSONB,
  authored_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  authored_by_display_name TEXT NOT NULL CHECK (char_length(btrim(authored_by_display_name)) BETWEEN 1 AND 120),
  authored_by_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  seal_receipt_id UUID,
  CHECK ((revision_state = 'abandoned') = (retired_at IS NOT NULL)),
  FOREIGN KEY (request_id, accepted_brief_revision_id)
    REFERENCES public.build_request_brief_revisions(request_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (request_id, builder_assignment_id)
    REFERENCES public.build_request_assignments(request_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (
    request_id, builder_assignment_id, builder_role, authored_by
  ) REFERENCES public.build_request_assignments(
    request_id, id, assignment_role, account_id
  ) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  UNIQUE NULLS NOT DISTINCT (request_id, revision_number),
  UNIQUE (request_id, id),
  UNIQUE (
    request_id, id, accepted_brief_revision_id, builder_assignment_id
  ),
  UNIQUE (request_id, id, accepted_brief_revision_id),
  UNIQUE NULLS NOT DISTINCT (
    request_id, id, artifact_manifest_digest, accepted_brief_revision_id
  )
);

ALTER TABLE public.build_requests
  ADD CONSTRAINT build_requests_current_delivery_revision_fk
  FOREIGN KEY (id, current_delivery_revision_id)
  REFERENCES public.build_request_delivery_revisions(request_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE UNIQUE INDEX build_request_one_wip_delivery_revision
  ON public.build_request_delivery_revisions (request_id)
  WHERE revision_state IN ('staging', 'prepared', 'sealed');

CREATE TABLE public.build_request_builder_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  brief_revision_id UUID NOT NULL,
  acceptance_check_id UUID NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'not_run')),
  evidence_text TEXT CHECK (char_length(btrim(evidence_text)) BETWEEN 1 AND 2000),
  evidence_ref TEXT CHECK (
    evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$'
  ),
  FOREIGN KEY (request_id, delivery_revision_id)
    REFERENCES public.build_request_delivery_revisions(request_id, id) ON DELETE CASCADE,
  FOREIGN KEY (request_id, delivery_revision_id, brief_revision_id)
    REFERENCES public.build_request_delivery_revisions(
      request_id, id, accepted_brief_revision_id
    ) ON DELETE CASCADE,
  FOREIGN KEY (request_id, brief_revision_id, acceptance_check_id)
    REFERENCES public.build_request_acceptance_checks(
      request_id, brief_revision_id, id
    ) ON DELETE CASCADE,
  UNIQUE (delivery_revision_id, acceptance_check_id)
);

CREATE TABLE public.build_request_delivery_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  accepted_brief_revision_id UUID NOT NULL,
  builder_assignment_id UUID NOT NULL,
  client_file_id TEXT NOT NULL CHECK (client_file_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$'),
  artifact_ordinal INTEGER NOT NULL CHECK (artifact_ordinal BETWEEN 1 AND 5),
  normalized_name TEXT NOT NULL CHECK (
    char_length(btrim(normalized_name)) BETWEEN 1 AND 120
    AND normalized_name !~ '[/\\]'
    AND normalized_name <> '..'
  ),
  byte_length BIGINT NOT NULL CHECK (byte_length BETWEEN 1 AND 4000000),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-fA-F]{64}$'),
  detected_media_type TEXT NOT NULL CHECK (
    detected_media_type IN (
      'text/html', 'text/markdown', 'text/plain', 'application/json',
      'text/csv', 'image/png', 'image/jpeg'
    )
  ),
  scanner_version TEXT NOT NULL CHECK (char_length(btrim(scanner_version)) BETWEEN 1 AND 80),
  staging_identity TEXT NOT NULL UNIQUE CHECK (
    char_length(staging_identity) BETWEEN 1 AND 1000
    AND staging_identity !~ E'[\\r\\n\\x00]'
  ),
  object_identity TEXT UNIQUE,
  integrity_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (integrity_status IN ('pending', 'verified', 'failed')),
  scan_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (scan_state IN ('pending', 'complete')),
  scan_verdict TEXT CHECK (scan_verdict IN ('clean', 'rejected', 'held')),
  finding_codes TEXT[] NOT NULL DEFAULT '{}',
  abandoned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  finalized_at TIMESTAMPTZ,
  stage_receipt_id UUID,
  FOREIGN KEY (request_id, delivery_revision_id)
    REFERENCES public.build_request_delivery_revisions(request_id, id) ON DELETE CASCADE,
  FOREIGN KEY (
    request_id, delivery_revision_id, accepted_brief_revision_id,
    builder_assignment_id
  ) REFERENCES public.build_request_delivery_revisions(
    request_id, id, accepted_brief_revision_id, builder_assignment_id
  ) ON DELETE CASCADE,
  FOREIGN KEY (request_id, accepted_brief_revision_id)
    REFERENCES public.build_request_brief_revisions(request_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (request_id, builder_assignment_id)
    REFERENCES public.build_request_assignments(request_id, id)
    ON DELETE CASCADE,
  UNIQUE (request_id, delivery_revision_id, id)
);
CREATE UNIQUE INDEX build_request_delivery_artifacts_active_client_file_uq
  ON public.build_request_delivery_artifacts (
    delivery_revision_id, client_file_id
  )
  WHERE abandoned_at IS NULL;
CREATE UNIQUE INDEX build_request_delivery_artifacts_active_ordinal_uq
  ON public.build_request_delivery_artifacts (
    delivery_revision_id, artifact_ordinal
  )
  WHERE abandoned_at IS NULL;

CREATE TABLE public.build_request_delivery_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  brief_revision_id UUID NOT NULL,
  manifest_digest TEXT NOT NULL CHECK (manifest_digest ~ '^[0-9a-fA-F]{64}$'),
  checklist_version INTEGER NOT NULL CHECK (checklist_version BETWEEN 1 AND 10000),
  safety_integrity_result TEXT NOT NULL CHECK (safety_integrity_result IN ('pass', 'fail')),
  verdict TEXT NOT NULL CHECK (verdict IN ('approve', 'repair')),
  reason TEXT CHECK (char_length(btrim(reason)) BETWEEN 1 AND 2000),
  review_notes TEXT CHECK (char_length(btrim(review_notes)) <= 2000),
  repair_instructions TEXT CHECK (char_length(btrim(repair_instructions)) BETWEEN 1 AND 2000),
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reviewer_assignment_id UUID NOT NULL,
  reviewer_role TEXT NOT NULL DEFAULT 'reviewer' CHECK (reviewer_role = 'reviewer'),
  reviewer_display_name TEXT NOT NULL CHECK (char_length(btrim(reviewer_display_name)) BETWEEN 1 AND 120),
  reviewer_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (request_id, delivery_revision_id)
    REFERENCES public.build_request_delivery_revisions(request_id, id) ON DELETE CASCADE,
  FOREIGN KEY (
    request_id, delivery_revision_id, manifest_digest, brief_revision_id
  ) REFERENCES public.build_request_delivery_revisions(
    request_id, id, artifact_manifest_digest, accepted_brief_revision_id
  ) ON DELETE CASCADE,
  FOREIGN KEY (
    request_id, reviewer_assignment_id, reviewer_role, reviewer_id
  ) REFERENCES public.build_request_assignments(
    request_id, id, assignment_role, account_id
  ) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  UNIQUE (request_id, id),
  UNIQUE (request_id, delivery_revision_id, id),
  UNIQUE (request_id, id, brief_revision_id),
  CHECK (
    (verdict = 'approve' AND safety_integrity_result = 'pass'
      AND reason IS NULL AND repair_instructions IS NULL)
    OR
    (verdict = 'repair' AND reason IS NOT NULL AND repair_instructions IS NOT NULL)
  )
);

CREATE TABLE public.build_request_delivery_review_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  review_id UUID NOT NULL,
  brief_revision_id UUID NOT NULL,
  acceptance_check_id UUID NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail')),
  evidence_ref TEXT CHECK (evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$'),
  FOREIGN KEY (request_id, review_id)
    REFERENCES public.build_request_delivery_reviews(request_id, id) ON DELETE CASCADE,
  FOREIGN KEY (request_id, review_id, brief_revision_id)
    REFERENCES public.build_request_delivery_reviews(
      request_id, id, brief_revision_id
    ) ON DELETE CASCADE,
  FOREIGN KEY (request_id, brief_revision_id, acceptance_check_id)
    REFERENCES public.build_request_acceptance_checks(
      request_id, brief_revision_id, id
    ) ON DELETE CASCADE,
  UNIQUE (review_id, acceptance_check_id)
);

CREATE TABLE public.build_request_requester_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  manifest_digest TEXT NOT NULL CHECK (
    manifest_digest ~ '^[0-9a-f]{64}$'
  ),
  brief_revision_id UUID NOT NULL,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requester_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  outcome TEXT NOT NULL CHECK (
    outcome IN ('useful', 'failed_acceptance_check')
  ),
  acceptance_check_id UUID,
  reason TEXT CHECK (
    reason IS NULL OR char_length(btrim(reason)) BETWEEN 1 AND 2000
  ),
  reason_digest TEXT CHECK (
    reason_digest IS NULL OR reason_digest ~ '^[0-9a-f]{64}$'
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (outcome = 'useful'
      AND acceptance_check_id IS NULL
      AND reason IS NULL
      AND reason_digest IS NULL)
    OR
    (outcome = 'failed_acceptance_check'
      AND acceptance_check_id IS NOT NULL
      AND reason_digest IS NOT NULL)
  ),
  FOREIGN KEY (
    request_id, delivery_revision_id, manifest_digest, brief_revision_id
  ) REFERENCES public.build_request_delivery_revisions(
    request_id, id, artifact_manifest_digest, accepted_brief_revision_id
  ) ON DELETE CASCADE,
  FOREIGN KEY (request_id, brief_revision_id, acceptance_check_id)
    REFERENCES public.build_request_acceptance_checks(
      request_id, brief_revision_id, id
    ) ON DELETE CASCADE,
  UNIQUE (delivery_revision_id)
);

CREATE TABLE public.build_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  event_kind TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  event_digest TEXT NOT NULL DEFAULT repeat('0', 64)
    CHECK (event_digest ~ '^[0-9a-f]{64}$'),
  actor_role TEXT NOT NULL CHECK (
    actor_role IN (
      'requester', 'triager', 'builder', 'reviewer', 'operator', 'system'
    )
  ),
  old_lifecycle_state TEXT,
  old_moderation_state TEXT,
  old_publication_state TEXT,
  old_close_reason TEXT,
  new_lifecycle_state TEXT NOT NULL,
  new_moderation_state TEXT NOT NULL,
  new_publication_state TEXT NOT NULL,
  new_close_reason TEXT,
  resulting_request_version INTEGER NOT NULL CHECK (resulting_request_version >= 0),
  correlation_id TEXT NOT NULL CHECK (
    correlation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  command_id UUID NOT NULL,
  command_receipt_id UUID,
  outbox_id UUID,
  participant_visible BOOLEAN NOT NULL DEFAULT FALSE,
  safe_metadata JSONB NOT NULL DEFAULT '{}',
  redactable_reason TEXT CHECK (
    redactable_reason IS NULL
    OR char_length(btrim(redactable_reason)) BETWEEN 1 AND 2000
  ),
  redactable_reason_digest TEXT CHECK (
    redactable_reason_digest IS NULL
    OR redactable_reason_digest ~ '^[0-9a-f]{64}$'
  ),
  CHECK (
    redactable_reason IS NULL OR redactable_reason_digest IS NOT NULL
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (request_id, sequence),
  UNIQUE (request_id, id),
  CHECK (
    (
      participant_visible
      AND command_receipt_id = command_id
      AND outbox_id = command_id
    )
    OR (
      NOT participant_visible
      AND command_receipt_id IS NULL
      AND outbox_id IS NULL
    )
  )
);

CREATE TABLE public.build_request_command_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  command_kind TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  request_version INTEGER NOT NULL CHECK (request_version >= 0),
  lifecycle_state TEXT NOT NULL,
  moderation_state TEXT NOT NULL,
  publication_state TEXT NOT NULL,
  close_reason TEXT,
  event_id UUID NOT NULL,
  receipt JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (actor_id, idempotency_key),
  UNIQUE (event_id),
  UNIQUE (request_id, id),
  UNIQUE (request_id, event_id),
  FOREIGN KEY (request_id, event_id)
    REFERENCES public.build_request_events(request_id, id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE public.build_request_participant_state (
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  last_read_event_sequence INTEGER NOT NULL CHECK (last_read_event_sequence >= 0),
  read_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (request_id, account_id)
);

CREATE TABLE public.build_request_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  topic TEXT NOT NULL CHECK (topic IN ('request_event_v1')),
  payload JSONB NOT NULL,
  available_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  delivered_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  UNIQUE (event_id, topic),
  UNIQUE (request_id, id),
  UNIQUE (request_id, event_id),
  FOREIGN KEY (request_id, event_id)
    REFERENCES public.build_request_events(request_id, id)
    DEFERRABLE INITIALLY DEFERRED
);

ALTER TABLE public.build_request_events
  ADD CONSTRAINT build_request_events_command_receipt_fk
  FOREIGN KEY (request_id, command_receipt_id)
  REFERENCES public.build_request_command_receipts(request_id, id)
  DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT build_request_events_outbox_fk
  FOREIGN KEY (request_id, outbox_id)
  REFERENCES public.build_request_outbox(request_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.build_request_retention_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  hold_kind TEXT NOT NULL CHECK (hold_kind IN ('moderation', 'legal', 'safety', 'review')),
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 2000),
  placed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  placed_by_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  released_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  released_by_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  released_at TIMESTAMPTZ,
  release_resolution TEXT CHECK (char_length(btrim(release_resolution)) BETWEEN 1 AND 2000),
  CHECK (
    (released_at IS NULL AND released_by IS NULL AND release_resolution IS NULL)
    OR (released_at IS NOT NULL AND release_resolution IS NOT NULL)
  )
);

CREATE INDEX build_requests_requester_updated
  ON public.build_requests (requester_id, updated_at DESC, id DESC);
CREATE UNIQUE INDEX build_request_one_active_case_per_requester
  ON public.build_requests (requester_id)
  WHERE requester_id IS NOT NULL
    AND moderation_state <> 'removed'
    AND lifecycle_state NOT IN ('completed', 'closed');
CREATE INDEX build_request_assignments_account_active
  ON public.build_request_assignments (account_id, active, assigned_at DESC);
CREATE INDEX build_request_events_request_sequence
  ON public.build_request_events (request_id, sequence DESC);

-- Defense in depth: all participant-visible tables are RLS enabled, but no
-- direct participant policy is installed. SECURITY DEFINER RPCs perform the
-- complete row and role authorization checks.
ALTER TABLE public.build_request_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_pilot_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_pilot_admission_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_account_deidentification_receipts
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_account_deidentification_receipts
  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_deidentified_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_deidentified_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_audit_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_audit_tombstones FORCE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_audit_cleanup_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_audit_cleanup_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.build_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_brief_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_acceptance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_accepted_clarification_sets
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_delivery_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_builder_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_delivery_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_delivery_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_delivery_review_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_requester_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_command_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_participant_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_retention_holds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.build_request_controls,
  public.build_request_pilot_admissions,
  public.build_request_pilot_admission_receipts,
  public.build_request_account_deidentification_receipts,
  public.build_request_deidentified_accounts,
  public.build_request_audit_tombstones,
  public.build_request_audit_cleanup_receipts,
  public.build_requests,
  public.build_request_responses,
  public.build_request_votes,
  public.build_request_brief_revisions,
  public.build_request_acceptance_checks,
  public.build_request_participants,
  public.build_request_assignments,
  public.build_request_clarifications,
  public.build_request_accepted_clarification_sets,
  public.build_request_delivery_revisions,
  public.build_request_builder_evidence,
  public.build_request_delivery_artifacts,
  public.build_request_delivery_reviews,
  public.build_request_delivery_review_checks,
  public.build_request_requester_outcomes,
  public.build_request_events,
  public.build_request_command_receipts,
  public.build_request_participant_state,
  public.build_request_outbox,
  public.build_request_retention_holds
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE
  public.build_request_controls,
  public.build_request_pilot_admissions,
  public.build_request_pilot_admission_receipts,
  public.build_request_account_deidentification_receipts,
  public.build_request_deidentified_accounts,
  public.build_request_audit_tombstones,
  public.build_request_audit_cleanup_receipts,
  public.build_requests,
  public.build_request_responses,
  public.build_request_votes,
  public.build_request_brief_revisions,
  public.build_request_acceptance_checks,
  public.build_request_participants,
  public.build_request_assignments,
  public.build_request_clarifications,
  public.build_request_accepted_clarification_sets,
  public.build_request_delivery_revisions,
  public.build_request_builder_evidence,
  public.build_request_delivery_artifacts,
  public.build_request_delivery_reviews,
  public.build_request_delivery_review_checks,
  public.build_request_requester_outcomes,
  public.build_request_events,
  public.build_request_command_receipts,
  public.build_request_participant_state,
  public.build_request_outbox,
  public.build_request_retention_holds
FROM service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-build-deliveries',
  'request-build-deliveries',
  FALSE,
  4000000,
  ARRAY[
    'text/html', 'text/markdown', 'text/plain', 'application/json',
    'text/csv', 'image/png', 'image/jpeg'
  ]::TEXT[]
)
ON CONFLICT (id) DO NOTHING;

DO $bucket$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'request-build-deliveries'
      AND name = 'request-build-deliveries'
      AND public = FALSE
      AND file_size_limit = 4000000
      AND allowed_mime_types = ARRAY[
        'text/html', 'text/markdown', 'text/plain', 'application/json',
        'text/csv', 'image/png', 'image/jpeg'
      ]::TEXT[]
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Existing request-build-deliveries bucket configuration is incompatible.';
  END IF;
END;
$bucket$;

CREATE OR REPLACE FUNCTION private.request_audit_cleanup_delete_allowed_v1(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    current_setting('request_authority.audit_cleanup', TRUE) = 'on'
    AND COALESCE(auth.jwt()->>'role', '') = 'service_role'
    AND current_setting(
      'request_authority.audit_cleanup_request_id', TRUE
    ) = p_request_id::TEXT
    AND current_setting(
      'request_authority.audit_cleanup_request_digest', TRUE
    ) = (
      SELECT encode(extensions.hmac(
        convert_to(p_request_id::TEXT, 'UTF8'),
        pseudonym_key.secret,
        'sha256'
      ), 'hex')
      FROM private.request_pseudonym_keys AS pseudonym_key
      WHERE pseudonym_key.singleton
    )
    AND EXISTS (
      SELECT 1
      FROM public.build_request_audit_tombstones AS tombstone
      JOIN public.build_request_audit_cleanup_receipts AS cleanup_receipt
        ON cleanup_receipt.request_digest = tombstone.request_digest
        AND cleanup_receipt.aggregate_digest = tombstone.aggregate_digest
        AND cleanup_receipt.cleaned
      WHERE tombstone.request_digest = current_setting(
        'request_authority.audit_cleanup_request_digest', TRUE
      )
    )
$$;

CREATE OR REPLACE FUNCTION private.request_reject_append_only_change_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND private.request_audit_cleanup_delete_allowed_v1(OLD.request_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE'
    AND current_setting('request_authority.raw_purge', TRUE) = 'on'
    AND COALESCE(auth.jwt()->>'role', '') = 'service_role' THEN
    IF TG_TABLE_NAME = 'build_request_accepted_clarification_sets'
      AND NOT COALESCE((
        to_jsonb(OLD)->>'accepted_clarifications_redacted'
      )::BOOLEAN, FALSE)
      AND COALESCE((
        to_jsonb(NEW)->>'accepted_clarifications_redacted'
      )::BOOLEAN, FALSE)
      AND to_jsonb(NEW)->>'accepted_clarifications_redacted_at' IS NOT NULL
      AND (to_jsonb(OLD) - ARRAY[
        'accepted_clarifications',
        'accepted_clarifications_redacted',
        'accepted_clarifications_redacted_at'
      ]) = (to_jsonb(NEW) - ARRAY[
        'accepted_clarifications',
        'accepted_clarifications_redacted',
        'accepted_clarifications_redacted_at'
      ])
      AND jsonb_array_length(to_jsonb(OLD)->'accepted_clarifications')
        = jsonb_array_length(to_jsonb(NEW)->'accepted_clarifications')
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          to_jsonb(OLD)->'accepted_clarifications'
        )
          WITH ORDINALITY AS old_item(value, position)
        JOIN jsonb_array_elements(
          to_jsonb(NEW)->'accepted_clarifications'
        )
          WITH ORDINALITY AS new_item(value, position)
          USING (position)
        WHERE old_item.value->>'clarificationId'
            IS DISTINCT FROM new_item.value->>'clarificationId'
          OR old_item.value->>'sequence'
            IS DISTINCT FROM new_item.value->>'sequence'
          OR new_item.value->>'question'
            IS DISTINCT FROM '[purged clarification]'
          OR new_item.value->>'answer'
            IS DISTINCT FROM '[purged answer]'
      ) THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME = 'build_request_brief_revisions'
      AND (to_jsonb(OLD) - ARRAY[
        'title', 'outcome', 'intended_user', 'must_work_scenario',
        'constraints', 'pathforge_reference'
      ]) = (to_jsonb(NEW) - ARRAY[
        'title', 'outcome', 'intended_user', 'must_work_scenario',
        'constraints', 'pathforge_reference'
      ]) THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME = 'build_request_events'
      AND to_jsonb(OLD)->>'redactable_reason' IS NOT NULL
      AND to_jsonb(NEW)->>'redactable_reason' IS NULL
      AND to_jsonb(NEW)->>'redactable_reason_digest' =
        to_jsonb(OLD)->>'redactable_reason_digest'
      AND (to_jsonb(OLD) - 'redactable_reason')
        = (to_jsonb(NEW) - 'redactable_reason') THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME = 'build_request_delivery_reviews'
      AND (to_jsonb(OLD) - ARRAY[
        'reason', 'review_notes', 'repair_instructions'
      ]) = (to_jsonb(NEW) - ARRAY[
        'reason', 'review_notes', 'repair_instructions'
      ]) THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME = 'build_request_delivery_review_checks'
      AND (to_jsonb(OLD) - 'evidence_ref')
        = (to_jsonb(NEW) - 'evidence_ref') THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME = 'build_request_builder_evidence'
      AND (to_jsonb(OLD) - ARRAY['evidence_text', 'evidence_ref'])
        = (to_jsonb(NEW) - ARRAY['evidence_text', 'evidence_ref']) THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME = 'build_request_requester_outcomes'
      AND to_jsonb(OLD)->>'reason' IS NOT NULL
      AND to_jsonb(NEW)->>'reason' IS NULL
      AND to_jsonb(NEW)->>'reason_digest' =
        to_jsonb(OLD)->>'reason_digest'
      AND (to_jsonb(OLD) - 'reason') = (to_jsonb(NEW) - 'reason') THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME = 'build_request_delivery_seals'
      AND (to_jsonb(OLD) - ARRAY[
        'canonical_manifest', 'canonical_manifest_redacted',
        'canonical_manifest_redacted_at'
      ]) = (to_jsonb(NEW) - ARRAY[
        'canonical_manifest', 'canonical_manifest_redacted',
        'canonical_manifest_redacted_at'
      ]) THEN
      RETURN NEW;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'build_request_brief_revisions' THEN
      IF OLD.authored_by IS NOT NULL AND NEW.authored_by IS NULL
        AND NOT OLD.authored_by_deidentified AND NEW.authored_by_deidentified
        AND (to_jsonb(OLD) - ARRAY['authored_by', 'authored_by_deidentified'])
          = (to_jsonb(NEW) - ARRAY['authored_by', 'authored_by_deidentified']) THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME = 'build_request_events' THEN
      IF OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL
        AND NOT OLD.actor_deidentified AND NEW.actor_deidentified
        AND OLD.event_digest = NEW.event_digest
        AND (to_jsonb(OLD) - ARRAY['actor_id', 'actor_deidentified'])
          = (to_jsonb(NEW) - ARRAY['actor_id', 'actor_deidentified']) THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME = 'build_request_delivery_reviews' THEN
      IF OLD.reviewer_id IS NOT NULL AND NEW.reviewer_id IS NULL
        AND NOT OLD.reviewer_deidentified AND NEW.reviewer_deidentified
        AND NEW.reviewer_display_name = 'Former participant'
        AND (to_jsonb(OLD) - ARRAY[
          'reviewer_id', 'reviewer_deidentified', 'reviewer_display_name'
        ]) = (to_jsonb(NEW) - ARRAY[
          'reviewer_id', 'reviewer_deidentified', 'reviewer_display_name'
        ]) THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME = 'build_request_requester_outcomes' THEN
      IF OLD.requester_id IS NOT NULL AND NEW.requester_id IS NULL
        AND NOT OLD.requester_deidentified
        AND NEW.requester_deidentified
        AND (to_jsonb(OLD) - ARRAY[
          'requester_id', 'requester_deidentified'
        ]) = (to_jsonb(NEW) - ARRAY[
          'requester_id', 'requester_deidentified'
        ]) THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME = 'build_request_command_receipts' THEN
      IF OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL
        AND NOT OLD.actor_deidentified AND NEW.actor_deidentified
        AND (to_jsonb(OLD) - ARRAY['actor_id', 'actor_deidentified'])
          = (to_jsonb(NEW) - ARRAY['actor_id', 'actor_deidentified']) THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME IN (
      'build_request_controls_receipts',
      'build_request_update_acknowledgements'
    ) THEN
      IF OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL
        AND NOT OLD.actor_deidentified AND NEW.actor_deidentified
        AND (to_jsonb(OLD) - ARRAY['actor_id', 'actor_deidentified'])
          = (to_jsonb(NEW) - ARRAY['actor_id', 'actor_deidentified']) THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME = 'build_request_pilot_admission_receipts' THEN
      IF (
          NEW.actor_id IS NOT DISTINCT FROM OLD.actor_id
          OR (OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL)
        )
        AND (
          NEW.account_id IS NOT DISTINCT FROM OLD.account_id
          OR (OLD.account_id IS NOT NULL AND NEW.account_id IS NULL)
        )
        AND NEW.actor_deidentified = (
          OLD.actor_deidentified
          OR (OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL)
        )
        AND NEW.account_deidentified =
          (
            OLD.account_deidentified
            OR (OLD.account_id IS NOT NULL AND NEW.account_id IS NULL)
          )
        AND (to_jsonb(OLD) - ARRAY[
          'actor_id', 'actor_deidentified', 'account_id', 'account_deidentified'
        ]) = (to_jsonb(NEW) - ARRAY[
          'actor_id', 'actor_deidentified', 'account_id', 'account_deidentified'
        ]) THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;
  RAISE EXCEPTION USING ERRCODE = '55000',
    MESSAGE = format('%I is append-only.', TG_TABLE_NAME);
END;
$$;

CREATE OR REPLACE FUNCTION private.request_guard_outbox_delivery_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND private.request_audit_cleanup_delete_allowed_v1(OLD.request_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'DELETE'
    OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.request_id IS DISTINCT FROM OLD.request_id
    OR NEW.event_id IS DISTINCT FROM OLD.event_id
    OR NEW.topic IS DISTINCT FROM OLD.topic
    OR NEW.payload IS DISTINCT FROM OLD.payload
    OR NEW.available_at IS DISTINCT FROM OLD.available_at
    OR NEW.attempts <> OLD.attempts + 1
    OR (
      OLD.delivered_at IS NOT NULL
      AND NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
    )
    OR (
      OLD.delivered_at IS NULL
      AND NEW.delivered_at IS NOT NULL
      AND NEW.delivered_at < OLD.available_at
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Request outbox evidence is immutable.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_legacy_responses_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON public.build_request_responses
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_legacy_votes_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON public.build_request_votes
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();

CREATE OR REPLACE FUNCTION private.request_event_digest_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.redactable_reason IS NOT NULL THEN
    NEW.redactable_reason := btrim(
      NEW.redactable_reason, E' \t\n\f\v'
    );
    NEW.redactable_reason_digest :=
      private.request_pseudonym_text_v1(NEW.redactable_reason);
  END IF;
  NEW.event_digest := encode(extensions.digest(convert_to(jsonb_build_object(
    'request_id', NEW.request_id,
    'sequence', NEW.sequence,
    'event_kind', NEW.event_kind,
    'actor_role', NEW.actor_role,
    'old_lifecycle_state', NEW.old_lifecycle_state,
    'old_moderation_state', NEW.old_moderation_state,
    'old_publication_state', NEW.old_publication_state,
    'old_close_reason', NEW.old_close_reason,
    'new_lifecycle_state', NEW.new_lifecycle_state,
    'new_moderation_state', NEW.new_moderation_state,
    'new_publication_state', NEW.new_publication_state,
    'new_close_reason', NEW.new_close_reason,
    'resulting_request_version', NEW.resulting_request_version,
    'correlation_id', NEW.correlation_id,
    'command_id', NEW.command_id,
    'command_receipt_id', NEW.command_receipt_id,
    'outbox_id', NEW.outbox_id,
    'participant_visible', NEW.participant_visible,
    'safe_metadata', NEW.safe_metadata,
    'redactable_reason_digest', NEW.redactable_reason_digest,
    'occurred_at', NEW.occurred_at
  )::TEXT, 'UTF8'), 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_events_digest
  BEFORE INSERT ON public.build_request_events
  FOR EACH ROW EXECUTE FUNCTION private.request_event_digest_v1();

CREATE TRIGGER build_request_brief_revisions_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_brief_revisions
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_accepted_clarification_sets_append_only
  BEFORE UPDATE OR DELETE
  ON public.build_request_accepted_clarification_sets
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_pilot_admission_receipts_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_pilot_admission_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_events_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_events
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_command_receipts_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_command_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_outbox_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_outbox
  FOR EACH ROW EXECUTE FUNCTION private.request_guard_outbox_delivery_v1();
CREATE TRIGGER build_request_delivery_reviews_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_delivery_reviews
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_delivery_review_checks_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_delivery_review_checks
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_builder_evidence_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_builder_evidence
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_requester_outcomes_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_requester_outcomes
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();

CREATE OR REPLACE FUNCTION private.request_guard_clarification_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND private.request_audit_cleanup_delete_allowed_v1(OLD.request_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT'
    AND NEW.answer IS NULL
    AND NEW.answered_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.build_requests AS request_case
      WHERE request_case.id = NEW.request_id
        AND request_case.lifecycle_state = 'triage'
        AND request_case.moderation_state = 'clear'
    ) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
    AND current_setting('request_authority.raw_purge', TRUE) = 'on'
    AND COALESCE(auth.jwt()->>'role', '') = 'service_role'
    AND NEW.question = '[purged clarification]'
    AND (
      (OLD.answer IS NULL AND NEW.answer IS NULL)
      OR (OLD.answer IS NOT NULL AND NEW.answer = '[purged answer]')
    )
    AND (to_jsonb(OLD) - ARRAY['question', 'answer'])
      = (to_jsonb(NEW) - ARRAY['question', 'answer']) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
    AND OLD.answer IS NULL
    AND OLD.answered_at IS NULL
    AND NEW.answer IS NOT NULL
    AND NEW.answered_at IS NOT NULL
    AND (to_jsonb(OLD) - ARRAY['answer', 'answered_at'])
      = (to_jsonb(NEW) - ARRAY['answer', 'answered_at'])
    AND EXISTS (
      SELECT 1
      FROM public.build_requests AS request_case
      WHERE request_case.id = OLD.request_id
        AND request_case.lifecycle_state = 'clarification_requested'
        AND request_case.moderation_state = 'clear'
    ) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
    AND OLD.requested_by IS NOT NULL
    AND NEW.requested_by IS NULL
    AND NOT OLD.requested_by_deidentified
    AND NEW.requested_by_deidentified
    AND current_setting(
      'request_authority.deidentify_account_id', TRUE
    ) = OLD.requested_by::TEXT
    AND (to_jsonb(OLD) - ARRAY[
      'requested_by', 'requested_by_deidentified'
    ]) = (to_jsonb(NEW) - ARRAY[
      'requested_by', 'requested_by_deidentified'
    ]) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION USING ERRCODE = '55000',
    MESSAGE = 'Clarification history is immutable.';
END;
$$;

CREATE TRIGGER build_request_clarifications_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.build_request_clarifications
  FOR EACH ROW EXECUTE FUNCTION private.request_guard_clarification_v1();
REVOKE ALL ON FUNCTION private.request_guard_clarification_v1()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.request_guard_delivery_revision_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND private.request_audit_cleanup_delete_allowed_v1(OLD.request_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE'
    AND current_setting('request_authority.raw_purge', TRUE) = 'on'
    AND COALESCE(auth.jwt()->>'role', '') = 'service_role'
    AND (to_jsonb(OLD) - ARRAY[
      'revision_label', 'summary'
    ]) = (to_jsonb(NEW) - ARRAY[
      'revision_label', 'summary'
    ]) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
    AND OLD.authored_by IS NOT NULL AND NEW.authored_by IS NULL
    AND NOT OLD.authored_by_deidentified AND NEW.authored_by_deidentified
    AND NEW.authored_by_display_name = 'Former participant'
    AND (to_jsonb(OLD) - ARRAY[
      'authored_by', 'authored_by_deidentified', 'authored_by_display_name'
    ]) = (to_jsonb(NEW) - ARRAY[
      'authored_by', 'authored_by_deidentified', 'authored_by_display_name'
    ]) THEN
    RETURN NEW;
  END IF;
  IF OLD.revision_state IN ('submitted', 'abandoned') THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Submitted delivery revisions are immutable.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_delivery_revision_immutable_after_submit
  BEFORE UPDATE OR DELETE ON public.build_request_delivery_revisions
  FOR EACH ROW EXECUTE FUNCTION private.request_guard_delivery_revision_v1();

CREATE OR REPLACE FUNCTION private.request_guard_assignment_separation_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.active AND EXISTS (
      SELECT 1 FROM public.build_requests AS request_case
      WHERE request_case.id = NEW.request_id
        AND request_case.requester_id = NEW.account_id
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Requester, builder, and reviewer separation is required.';
  END IF;
  IF NEW.active AND EXISTS (
    SELECT 1
    FROM public.build_request_assignments AS other
    WHERE other.request_id = NEW.request_id
      AND other.active
      AND other.assignment_role <> NEW.assignment_role
      AND other.account_id = NEW.account_id
      AND other.id <> NEW.id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Builder and reviewer must be distinct accounts.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_assignment_role_separation
  BEFORE INSERT OR UPDATE ON public.build_request_assignments
  FOR EACH ROW EXECUTE FUNCTION private.request_guard_assignment_separation_v1();

CREATE OR REPLACE FUNCTION private.request_actor_role_v1(p_actor_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT CASE WHEN p.role = 'admin' THEN 'admin' ELSE 'requester' END
    FROM public.profiles AS p
    WHERE p.id = p_actor_id
  ), 'none');
$$;

CREATE OR REPLACE FUNCTION private.request_display_name_v1(p_actor_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(btrim(p.display_name), ''),
    NULLIF(btrim(p.username), ''),
    'PathForge participant'
  )
  FROM public.profiles AS p
  WHERE p.id = p_actor_id;
$$;

CREATE OR REPLACE FUNCTION private.request_assert_contract_v1(p_contract_version INTEGER)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_contract_version IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported Request a Build contract version.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.request_cursor_encode_v1(
  p_prefix TEXT,
  p_payload JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret BYTEA;
  v_body TEXT;
  v_signature TEXT;
BEGIN
  IF p_prefix NOT IN ('rq1', 'rqe1', 'rqm1')
    OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor payload is invalid.';
  END IF;
  SELECT cursor_key.secret INTO STRICT v_secret
  FROM private.request_cursor_keys AS cursor_key
  WHERE cursor_key.singleton;
  v_body := rtrim(translate(replace(replace(
    encode(convert_to(p_payload::TEXT, 'UTF8'), 'base64'), E'\n', ''
  ), E'\r', ''),
    '+/', '-_'
  ), '=');
  v_signature := rtrim(translate(replace(replace(encode(extensions.hmac(
    convert_to(p_prefix || '_' || v_body, 'UTF8'),
    v_secret,
    'sha256'
  ), 'base64'), E'\n', ''), E'\r', ''), '+/', '-_'), '=');
  RETURN p_prefix || '_' || v_body || '.' || v_signature;
END;
$$;

CREATE OR REPLACE FUNCTION private.request_pseudonym_text_v1(
  p_value TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT encode(extensions.hmac(
    convert_to(p_value, 'UTF8'),
    pseudonym_key.secret,
    'sha256'
  ), 'hex')
  FROM private.request_pseudonym_keys AS pseudonym_key
  WHERE pseudonym_key.singleton
$$;

CREATE OR REPLACE FUNCTION private.request_account_pseudonym_v1(
  p_account_id UUID
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.request_pseudonym_text_v1(p_account_id::TEXT)
$$;

CREATE OR REPLACE FUNCTION private.request_lock_available_actor_v1(
  p_actor_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request actor is not available.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-subject:' ||
      private.request_account_pseudonym_v1(p_actor_id),
    0
  ));
  IF EXISTS (
    SELECT 1
    FROM public.build_request_deidentified_accounts AS tombstone
    WHERE tombstone.subject_digest =
      private.request_account_pseudonym_v1(p_actor_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request actor is no longer available.',
      DETAIL = 'request_authority:unauthorized';
  END IF;
END;
$$;

-- Extension seam for a later publication layer. The private authority remains
-- standalone and defaults to no scoped preservation. A publication migration
-- may replace this helper without turning its preservation into a generic
-- hold that blocks raw-text or artifact cleanup.
CREATE OR REPLACE FUNCTION private.request_publication_preservation_active_v1(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT FALSE
$$;

CREATE OR REPLACE FUNCTION private.request_cursor_decode_v1(
  p_prefix TEXT,
  p_cursor TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret BYTEA;
  v_token TEXT;
  v_body TEXT;
  v_signature TEXT;
  v_expected TEXT;
  v_payload JSONB;
BEGIN
  IF p_prefix NOT IN ('rq1', 'rqe1', 'rqm1')
    OR p_cursor IS NULL
    OR char_length(p_cursor) > 600
    OR p_cursor !~ ('^' || p_prefix || '_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor is invalid.';
  END IF;
  v_token := substr(p_cursor, char_length(p_prefix) + 2);
  v_body := split_part(v_token, '.', 1);
  v_signature := split_part(v_token, '.', 2);
  IF array_length(string_to_array(v_token, '.'), 1) <> 2
    OR char_length(v_body) NOT BETWEEN 8 AND 400
    OR char_length(v_signature) NOT BETWEEN 16 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor is invalid.';
  END IF;
  SELECT cursor_key.secret INTO STRICT v_secret
  FROM private.request_cursor_keys AS cursor_key
  WHERE cursor_key.singleton;
  v_expected := rtrim(translate(replace(replace(encode(extensions.hmac(
    convert_to(p_prefix || '_' || v_body, 'UTF8'),
    v_secret,
    'sha256'
  ), 'base64'), E'\n', ''), E'\r', ''), '+/', '-_'), '=');
  IF extensions.digest(convert_to(v_signature, 'UTF8'), 'sha256')
    IS DISTINCT FROM extensions.digest(
      convert_to(v_expected, 'UTF8'), 'sha256'
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor is invalid.';
  END IF;
  BEGIN
    v_payload := convert_from(decode(
      translate(v_body, '-_', '+/') ||
        repeat('=', (4 - char_length(v_body) % 4) % 4),
      'base64'
    ), 'UTF8')::JSONB;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor is invalid.';
  END;
  IF jsonb_typeof(v_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor is invalid.';
  END IF;
  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION
  private.request_cursor_encode_v1(TEXT, JSONB),
  private.request_cursor_decode_v1(TEXT, TEXT),
  private.request_pseudonym_text_v1(TEXT),
  private.request_account_pseudonym_v1(UUID),
  private.request_lock_available_actor_v1(UUID),
  private.request_publication_preservation_active_v1(UUID)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.request_assert_safe_text_v1(
  p_value TEXT,
  p_name TEXT,
  p_min INTEGER,
  p_max INTEGER,
  p_sensitive BOOLEAN DEFAULT FALSE
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF p_value IS NULL OR p_value ~ E'[\\x00\\r]' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('%s contains prohibited control characters.', p_name);
  END IF;
  cleaned := btrim(p_value, E' \t\n\f\v');
  IF char_length(cleaned) < p_min OR char_length(cleaned) > p_max THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('%s must be %s-%s characters.', p_name, p_min, p_max);
  END IF;
  IF p_sensitive AND (
        cleaned ~* '(https?://|www\\.|[[:alnum:]-]+\\.(com|net|org|io|dev|app)(/|\\y))'
        OR cleaned ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}'
        OR cleaned ~* '(sk-(proj-)?[A-Za-z0-9_-]{12,}|(api|access|secret|private)[_-]?key[[:space:]]*[:=]|bearer[[:space:]]+[A-Za-z0-9._~+/-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
      ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('%s contains prohibited sensitive material.', p_name);
  END IF;
  RETURN cleaned;
END;
$$;

CREATE OR REPLACE FUNCTION private.request_assert_opaque_v1(p_value TEXT, p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_value IS NULL OR p_value !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('%s must be a bounded opaque identifier.', p_name);
  END IF;
  RETURN p_value;
END;
$$;

CREATE OR REPLACE FUNCTION private.request_assert_json_keys_v1(
  p_value JSONB,
  p_expected TEXT[],
  p_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_actual TEXT[];
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('%s must be an object.', p_name);
  END IF;
  SELECT COALESCE(array_agg(key_name ORDER BY key_name COLLATE "C"), '{}')
  INTO v_actual
  FROM jsonb_object_keys(p_value) AS key_name;
  IF v_actual IS DISTINCT FROM (
    SELECT COALESCE(array_agg(expected_key ORDER BY expected_key COLLATE "C"), '{}')
    FROM unnest(p_expected) AS expected_key
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('%s fields are incomplete or unknown.', p_name);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.request_has_scope_v1(p_request_id UUID, p_actor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.build_requests AS r
    WHERE r.id = p_request_id
      AND (
        r.lifecycle_state NOT IN ('completed', 'closed')
        OR (
          COALESCE(
            r.audit_tombstone_until,
            r.terminal_at + INTERVAL '400 days'
          ) > clock_timestamp()
        )
        OR (
          private.request_actor_role_v1(p_actor_id) = 'admin'
          AND EXISTS (
            SELECT 1
            FROM public.build_request_retention_holds AS preserved_hold
            WHERE preserved_hold.request_id = r.id
              AND preserved_hold.released_at IS NULL
          )
        )
      )
      AND (
        r.requester_id = p_actor_id
        OR EXISTS (
          SELECT 1 FROM public.build_request_assignments AS a
          WHERE a.request_id = r.id
            AND a.account_id = p_actor_id
            AND a.active
        )
        OR EXISTS (
          SELECT 1 FROM public.build_request_participants AS p
          WHERE p.request_id = r.id
            AND p.account_id = p_actor_id
            AND p.active
        )
        OR private.request_actor_role_v1(p_actor_id) = 'admin'
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.request_can_view_v1(p_request_id UUID, p_actor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.request_has_scope_v1(p_request_id, p_actor_id)
    AND EXISTS (
      SELECT 1 FROM public.build_requests AS request_case
      WHERE request_case.id = p_request_id
        AND request_case.moderation_state = 'clear'
    );
$$;

CREATE OR REPLACE FUNCTION private.request_receipt_v1(
  p_command_id UUID,
  p_request_id UUID,
  p_event_id UUID,
  p_replayed BOOLEAN,
  p_occurred_at TIMESTAMPTZ,
  p_authority_result JSONB DEFAULT NULL
)
RETURNS TABLE (
  contract_version INTEGER,
  command_id UUID,
  request_id UUID,
  request_version INTEGER,
  event_id UUID,
  lifecycle_state TEXT,
  moderation_state TEXT,
  publication_state TEXT,
  close_reason TEXT,
  replayed BOOLEAN,
  occurred_at TIMESTAMPTZ,
  authority_result JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    1,
    receipt.id,
    receipt.request_id,
    receipt.request_version,
    receipt.event_id,
    receipt.lifecycle_state,
    receipt.moderation_state,
    receipt.publication_state,
    receipt.close_reason,
    p_replayed,
    receipt.created_at,
    COALESCE(receipt.receipt->'authority_result', '{}'::JSONB)
  FROM public.build_request_command_receipts AS receipt
  WHERE receipt.id = p_command_id
    AND receipt.request_id = p_request_id
    AND receipt.event_id = p_event_id;
$$;

REVOKE ALL ON FUNCTION
  private.request_actor_role_v1(UUID),
  private.request_display_name_v1(UUID),
  private.request_assert_contract_v1(INTEGER),
  private.request_assert_safe_text_v1(TEXT, TEXT, INTEGER, INTEGER, BOOLEAN),
  private.request_assert_opaque_v1(TEXT, TEXT),
  private.request_assert_json_keys_v1(JSONB, TEXT[], TEXT),
  private.request_has_scope_v1(UUID, UUID),
  private.request_can_view_v1(UUID, UUID),
  private.request_receipt_v1(UUID, UUID, UUID, BOOLEAN, TIMESTAMPTZ, JSONB)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.request_validate_pathforge_reference_v1(
  p_reference JSONB,
  p_project_only BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_kind TEXT;
  v_project_id UUID;
  v_model_variant_id UUID;
  v_response_step_number INTEGER;
BEGIN
  IF p_reference IS NULL OR jsonb_typeof(p_reference) = 'null' THEN
    RETURN NULL;
  END IF;
  IF jsonb_typeof(p_reference) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PathForge reference must be an object.';
  END IF;
  v_kind := p_reference->>'kind';
  BEGIN
    v_project_id := (p_reference->>'project_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PathForge project reference is invalid.';
  END;

  IF v_kind = 'project' THEN
    IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_reference) AS key)
      IS DISTINCT FROM ARRAY['kind', 'project_id']::TEXT[] THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PathForge project reference has unknown fields.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.prompts AS p
      WHERE p.id = v_project_id AND p.status = 'approved'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PathForge project is not approved.';
    END IF;
    RETURN jsonb_build_object('kind', 'project', 'project_id', v_project_id);
  ELSIF v_kind = 'response' AND NOT p_project_only THEN
    IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_reference) AS key)
      IS DISTINCT FROM ARRAY['kind', 'model_variant_id', 'project_id', 'response_step_number']::TEXT[] THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PathForge response reference has unknown fields.';
    END IF;
    BEGIN
      v_model_variant_id := (p_reference->>'model_variant_id')::UUID;
      v_response_step_number := (p_reference->>'response_step_number')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PathForge response reference is invalid.';
    END;
    IF v_response_step_number NOT BETWEEN 1 AND 100
      OR NOT EXISTS (
        SELECT 1
        FROM public.prompts AS p
        JOIN public.project_model_variants AS mv
          ON mv.project_id = p.id
        JOIN public.prompt_steps AS ps
          ON ps.prompt_id = p.id
        WHERE p.id = v_project_id
          AND p.status = 'approved'
          AND mv.id = v_model_variant_id
          AND mv.status = 'published'
          AND ps.step_number = v_response_step_number
          AND EXISTS (
            SELECT 1
            FROM public.project_model_variant_artifacts AS artifact_evidence
            WHERE artifact_evidence.model_variant_id = mv.id
              AND artifact_evidence.source_step_number = ps.step_number
              AND artifact_evidence.source_step_id = ps.id::TEXT
              AND artifact_evidence.artifact_path LIKE 'public/artifacts/%'
              AND artifact_evidence.artifact_sha256 ~ '^[0-9a-f]{64}$'
          )
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'PathForge response reference is not an approved matching response.';
    END IF;
    RETURN jsonb_build_object(
      'kind', 'response',
      'project_id', v_project_id,
      'model_variant_id', v_model_variant_id,
      'response_step_number', v_response_step_number
    );
  END IF;
  RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PathForge reference kind is invalid.';
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_build_request_v1(
  p_contract_version INTEGER,
  p_idempotency_key TEXT,
  p_brief JSONB
)
RETURNS TABLE (
  contract_version INTEGER,
  command_id UUID,
  request_id UUID,
  request_version INTEGER,
  event_id UUID,
  lifecycle_state TEXT,
  moderation_state TEXT,
  publication_state TEXT,
  close_reason TEXT,
  replayed BOOLEAN,
  occurred_at TIMESTAMPTZ,
  authority_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  controls public.build_request_controls%ROWTYPE;
  existing public.build_request_command_receipts%ROWTYPE;
  request_row public.build_requests%ROWTYPE;
  brief_id UUID := gen_random_uuid();
  event_uuid UUID := gen_random_uuid();
  command_uuid UUID := gen_random_uuid();
  occurred TIMESTAMPTZ := clock_timestamp();
  request_hash TEXT;
  reference JSONB;
  checks JSONB;
  check_value JSONB;
  check_text TEXT;
  normalized_check_text TEXT;
  check_ordinal INTEGER := 0;
  title_value TEXT;
  outcome_value TEXT;
  intended_user_value TEXT;
  scenario_value TEXT;
  constraints_value TEXT;
  display_value TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Authentication is required.';
  END IF;
  IF p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid idempotency key.';
  END IF;
  IF p_brief IS NULL OR jsonb_typeof(p_brief) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Brief must be an object.';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_brief) AS key)
    IS DISTINCT FROM ARRAY[
      'acceptance_checks', 'constraints', 'intended_user', 'must_work_scenario',
      'outcome', 'pathforge_reference', 'title'
    ]::TEXT[] THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Brief fields are incomplete or unknown.';
  END IF;
  title_value := private.request_assert_safe_text_v1(
    p_brief->>'title', 'title', 4, 120, TRUE
  );
  outcome_value := private.request_assert_safe_text_v1(
    p_brief->>'outcome', 'outcome', 20, 4000, TRUE
  );
  intended_user_value := private.request_assert_safe_text_v1(
    p_brief->>'intended_user', 'intendedUser', 2, 1000, TRUE
  );
  scenario_value := private.request_assert_safe_text_v1(
    p_brief->>'must_work_scenario', 'mustWorkScenario', 10, 1000, TRUE
  );
  constraints_value := private.request_assert_safe_text_v1(
    COALESCE(p_brief->>'constraints', ''), 'constraints', 0, 2000, TRUE
  );
  reference := private.request_validate_pathforge_reference_v1(
    p_brief->'pathforge_reference'
  );
  checks := p_brief->'acceptance_checks';
  IF jsonb_typeof(checks) <> 'array'
    OR jsonb_array_length(checks) NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'acceptanceChecks must contain 1-3 checks.';
  END IF;
  request_hash := private.request_pseudonym_text_v1(
    jsonb_build_object(
      'contract', p_contract_version, 'brief', p_brief
    )::TEXT
  );
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor_id::TEXT || ':' || p_idempotency_key, 0));

  SELECT * INTO existing
  FROM public.build_request_command_receipts AS prior_receipt
  WHERE prior_receipt.actor_id = v_actor_id
    AND prior_receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF existing.command_kind <> 'submit' OR existing.request_hash <> request_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN QUERY
      SELECT * FROM private.request_receipt_v1(
        existing.id, existing.request_id, existing.event_id, TRUE,
        existing.created_at, COALESCE(existing.receipt->'authority_result', '{}'::JSONB)
      );
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-subject:' || private.request_account_pseudonym_v1(v_actor_id),
    0
  ));
  IF EXISTS (
    SELECT 1
    FROM public.build_request_deidentified_accounts AS tombstone
    WHERE tombstone.subject_digest =
      private.request_account_pseudonym_v1(v_actor_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request actor is not admitted.',
      DETAIL = 'request_authority:not_admitted';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    WHERE profile.id = v_actor_id
      AND auth_user.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '28000',
      MESSAGE = 'Authentication is required.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_pilot_admissions AS admission
    WHERE admission.account_id = v_actor_id
      AND admission.admitted
      AND (
        admission.expires_at IS NULL
        OR admission.expires_at > occurred
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:not_admitted';
  END IF;

  SELECT * INTO controls
  FROM public.build_request_controls
  WHERE singleton
  FOR UPDATE;
  IF NOT controls.accepting_requests THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:controls_off';
  END IF;
  IF (
    SELECT count(*)
    FROM public.build_requests AS active_request
    WHERE active_request.moderation_state <> 'removed'
      AND active_request.lifecycle_state NOT IN ('completed', 'closed')
  ) >= controls.active_case_capacity THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:capacity_full';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.build_request_command_receipts AS recent_receipt
    WHERE recent_receipt.actor_id = v_actor_id
      AND recent_receipt.command_kind = 'submit'
      AND recent_receipt.created_at > occurred - INTERVAL '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:rate_limited';
  END IF;

  display_value := private.request_display_name_v1(v_actor_id);
  BEGIN
    INSERT INTO public.build_requests (
      id, requester_id, requester_display_name, submitted_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_actor_id, display_value, occurred, occurred
    ) RETURNING * INTO request_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION USING ERRCODE = '23505',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:duplicate';
  END;

  INSERT INTO public.build_request_brief_revisions (
    id, request_id, revision_number, title, outcome, intended_user,
    must_work_scenario, constraints, pathforge_reference, authored_by, created_at
  ) VALUES (
    brief_id, request_row.id, 1, title_value, outcome_value, intended_user_value,
    scenario_value, constraints_value, reference, v_actor_id, occurred
  );

  FOR check_value IN SELECT value FROM jsonb_array_elements(checks)
  LOOP
    IF jsonb_typeof(check_value) <> 'string' THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Each acceptance check must be a string.';
    END IF;
    check_ordinal := check_ordinal + 1;
    check_text := private.request_assert_safe_text_v1(
      check_value #>> '{}', 'acceptanceCheck', 4, 500, TRUE
    );
    normalized_check_text := lower(btrim(check_text));
    IF lower(check_text) = lower(scenario_value)
      OR EXISTS (
        SELECT 1 FROM public.build_request_acceptance_checks AS stored_check
        WHERE stored_check.brief_revision_id = brief_id
          AND lower(btrim(stored_check.check_text)) = normalized_check_text
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Acceptance checks and must-work scenario must be distinct.';
    END IF;
    INSERT INTO public.build_request_acceptance_checks (
      request_id, brief_revision_id, ordinal, check_text
    ) VALUES (request_row.id, brief_id, check_ordinal, check_text);
  END LOOP;

  UPDATE public.build_requests
  SET current_brief_revision_id = brief_id
  WHERE id = request_row.id;

  INSERT INTO public.build_request_participants (
    request_id, actor_role, account_id, display_name, joined_at
  ) VALUES (request_row.id, 'requester', v_actor_id, display_value, occurred);

  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_id, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, command_receipt_id, outbox_id,
    participant_visible, safe_metadata, redactable_reason, occurred_at
  ) VALUES (
    event_uuid, request_row.id, 1, 'submitted', v_actor_id, 'requester',
    NULL, NULL, NULL, NULL,
    request_row.lifecycle_state, request_row.moderation_state,
    request_row.publication_state, request_row.close_reason, 0,
    p_idempotency_key, command_uuid, command_uuid, command_uuid, TRUE,
    jsonb_build_object('brief_revision_id', brief_id), NULL, occurred
  );

  INSERT INTO public.build_request_command_receipts (
    id, actor_id, idempotency_key, request_id, command_kind, request_hash,
    request_version, lifecycle_state, moderation_state, publication_state,
    close_reason, event_id, receipt, created_at
  ) VALUES (
    command_uuid, v_actor_id, p_idempotency_key, request_row.id, 'submit',
    request_hash, 0, request_row.lifecycle_state, request_row.moderation_state,
    request_row.publication_state, request_row.close_reason,
    event_uuid, '{"authority_result":{}}', occurred
  );
  INSERT INTO public.build_request_outbox (
    id, request_id, event_id, topic, payload, available_at
  ) VALUES (
    command_uuid, request_row.id, event_uuid, 'request_event_v1',
    jsonb_build_object('request_id', request_row.id, 'event_id', event_uuid, 'kind', 'submitted'),
    occurred
  );

  RETURN QUERY
    SELECT * FROM private.request_receipt_v1(
      command_uuid, request_row.id, event_uuid, FALSE, occurred, '{}'::JSONB
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_build_request_v1(INTEGER, TEXT, JSONB)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_build_request_v1(INTEGER, TEXT, JSONB)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.build_request_command_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_expected_version INTEGER,
  p_idempotency_key TEXT,
  p_command TEXT,
  p_payload JSONB
)
RETURNS TABLE (
  contract_version INTEGER,
  command_id UUID,
  request_id UUID,
  request_version INTEGER,
  event_id UUID,
  lifecycle_state TEXT,
  moderation_state TEXT,
  publication_state TEXT,
  close_reason TEXT,
  replayed BOOLEAN,
  occurred_at TIMESTAMPTZ,
  authority_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_event_actor_role TEXT;
  v_request public.build_requests%ROWTYPE;
  v_before public.build_requests%ROWTYPE;
  v_existing public.build_request_command_receipts%ROWTYPE;
  v_assignment public.build_request_assignments%ROWTYPE;
  v_revision public.build_request_delivery_revisions%ROWTYPE;
  v_artifact public.build_request_delivery_artifacts%ROWTYPE;
  v_review_id UUID;
  v_outcome_id UUID;
  v_event_id UUID := gen_random_uuid();
  v_command_id UUID := gen_random_uuid();
  v_occurred_at TIMESTAMPTZ := clock_timestamp();
  v_hash TEXT;
  v_authority JSONB := '{}'::JSONB;
  v_event_metadata JSONB := '{}'::JSONB;
  v_sequence INTEGER;
  v_display TEXT;
  v_reference JSONB;
  v_target_date DATE;
  v_item JSONB;
  v_count INTEGER;
  v_total BIGINT;
  v_min_ordinal INTEGER;
  v_max_ordinal INTEGER;
  v_assigning_requests BOOLEAN;
  v_subject_target UUID;
  v_accepted_clarifications JSONB;
  v_accepted_clarification_count INTEGER;
  v_accepted_clarification_digest TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Authentication is required.';
  END IF;
  IF p_request_id IS NULL
    OR p_expected_version IS NULL
    OR p_expected_version < 0
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_command IS NULL
    OR p_payload IS NULL
    OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid command envelope.';
  END IF;
  CASE p_command
    WHEN 'begin_triage', 'start_build', 'close_no_response' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, '{}'::TEXT[], 'Command payload'
      );
    WHEN 'request_clarification' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['question'], 'Command payload'
      );
    WHEN 'submit_clarification' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['clarificationId', 'answer'], 'Command payload'
      );
    WHEN 'accept' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['builderId', 'targetDate'], 'Command payload'
      );
    WHEN 'assign_reviewer' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['reviewerId'], 'Command payload'
      );
    WHEN 'reassign_triager' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['triagerId', 'reason'], 'Command payload'
      );
    WHEN 'reassign_builder' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['builderId', 'reason'], 'Command payload'
      );
    WHEN 'reassign_reviewer' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['reviewerId', 'reason'], 'Command payload'
      );
    WHEN 'prepare_delivery_revision' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY[
          'deliveryRevisionId', 'acceptedBriefRevisionId',
          'activeBuilderAssignmentId', 'revisionLabel', 'summary',
          'builderEvidence', 'approvedPathForgeReference'
        ], 'Command payload'
      );
    WHEN 'stage_delivery_artifact' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY[
          'deliveryRevisionId', 'acceptedBriefRevisionId',
          'activeBuilderAssignmentId', 'artifactOrdinal', 'clientFileId',
          'normalizedName', 'byteLength', 'sha256',
          'detectedMediaType', 'scannerVersion'
        ], 'Command payload'
      );
      IF jsonb_typeof(p_payload->'acceptedBriefRevisionId')
          IS DISTINCT FROM 'string'
        OR p_payload->>'acceptedBriefRevisionId'
          !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Accepted brief revision id is invalid.';
      END IF;
    WHEN 'abandon_delivery_artifact' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['deliveryRevisionId', 'artifactId'], 'Command payload'
      );
    WHEN 'submit_delivery', 'resubmit_delivery' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['deliveryRevisionId', 'sealReceiptId'], 'Command payload'
      );
    WHEN 'approve_delivery' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY[
          'deliveryRevisionId', 'manifestDigest', 'checklistVersion',
          'checks', 'safetyIntegrityResult', 'reviewNotes'
        ], 'Command payload'
      );
    WHEN 'request_repair' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY[
          'deliveryRevisionId', 'manifestDigest', 'checklistVersion',
          'checks', 'safetyIntegrityResult', 'reason', 'repairInstructions'
        ], 'Command payload'
      );
    WHEN 'requester_delivery_outcome' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload,
        CASE WHEN p_payload->>'outcome' = 'failed_acceptance_check'
          THEN ARRAY[
            'deliveryRevisionId', 'manifestDigest', 'outcome',
            'failedAcceptanceCheckId', 'reason'
          ]
          ELSE ARRAY['deliveryRevisionId', 'manifestDigest', 'outcome']
        END,
        'Command payload'
      );
      IF jsonb_typeof(p_payload->'deliveryRevisionId')
          IS DISTINCT FROM 'string'
        OR p_payload->>'deliveryRevisionId'
          !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Delivery revision id is invalid.';
      END IF;
    WHEN 'acknowledge_delivery' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['deliveryRevisionId'], 'Command payload'
      );
      IF jsonb_typeof(p_payload->'deliveryRevisionId')
          IS DISTINCT FROM 'string'
        OR p_payload->>'deliveryRevisionId'
          !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Delivery revision id is invalid.';
      END IF;
    WHEN 'close' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload,
        CASE WHEN p_payload->>'reason' = 'existing_resolution'
          THEN ARRAY['reason', 'note', 'resolutionReference']
          WHEN p_payload->>'reason' = 'duplicate'
          THEN ARRAY['reason']
          ELSE ARRAY['reason', 'note']
        END,
        'Command payload'
      );
    WHEN 'withdraw', 'place_moderation_hold', 'remove_for_moderation' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['reason'], 'Command payload'
      );
    WHEN 'release_moderation_hold' THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload, ARRAY['resolution'], 'Command payload'
      );
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Unsupported request command.';
  END CASE;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'contract', p_contract_version, 'request_id', p_request_id,
    'expected_version', p_expected_version, 'command', p_command,
    'payload', COALESCE(p_payload, '{}'::JSONB)
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor_id::TEXT || ':' || p_idempotency_key, 0));

  SELECT * INTO v_existing
  FROM public.build_request_command_receipts AS prior_receipt
  WHERE prior_receipt.actor_id = v_actor_id
    AND prior_receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN QUERY SELECT * FROM private.request_receipt_v1(
      v_existing.id, v_existing.request_id, v_existing.event_id, TRUE,
      v_existing.created_at, COALESCE(v_existing.receipt->'authority_result', '{}'::JSONB)
    );
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-subject:' ||
      private.request_account_pseudonym_v1(v_actor_id),
    0
  ));
  IF EXISTS (
    SELECT 1
    FROM public.build_request_deidentified_accounts AS tombstone
    WHERE tombstone.subject_digest =
      private.request_account_pseudonym_v1(v_actor_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request actor is no longer available.',
      DETAIL = 'request_authority:unauthorized';
  END IF;

  BEGIN
    v_subject_target := CASE p_command
      WHEN 'accept' THEN (p_payload->>'builderId')::UUID
      WHEN 'assign_reviewer' THEN (p_payload->>'reviewerId')::UUID
      WHEN 'reassign_triager' THEN (p_payload->>'triagerId')::UUID
      WHEN 'reassign_builder' THEN (p_payload->>'builderId')::UUID
      WHEN 'reassign_reviewer' THEN (p_payload->>'reviewerId')::UUID
      ELSE NULL
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Assignment target is invalid.';
  END;
  IF v_subject_target IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'request-subject:' ||
        private.request_account_pseudonym_v1(v_subject_target),
      0
    ));
    IF EXISTS (
      SELECT 1
      FROM public.build_request_deidentified_accounts AS tombstone
      WHERE tombstone.subject_digest =
        private.request_account_pseudonym_v1(v_subject_target)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Assignment target is not available.';
    END IF;
  END IF;

  SELECT * INTO v_request
  FROM public.build_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Request was not found.';
  END IF;
  IF NOT private.request_has_scope_v1(p_request_id, v_actor_id)
    AND NOT (
      private.request_actor_role_v1(v_actor_id) = 'admin'
      AND p_command IN (
        'place_moderation_hold', 'release_moderation_hold',
        'remove_for_moderation'
      )
    ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Request was not found.',
      DETAIL = 'request_authority:not_found';
  END IF;
  v_before := v_request;
  v_actor_role := private.request_actor_role_v1(v_actor_id);
  v_display := private.request_display_name_v1(v_actor_id);
  v_event_actor_role := CASE
    WHEN p_command IN (
      'submit_clarification', 'acknowledge_delivery',
      'requester_delivery_outcome', 'withdraw'
    ) THEN 'requester'
    WHEN p_command IN (
      'start_build', 'prepare_delivery_revision',
      'stage_delivery_artifact', 'abandon_delivery_artifact',
      'submit_delivery', 'resubmit_delivery'
    ) THEN 'builder'
    WHEN p_command IN (
      'approve_delivery', 'request_repair'
    ) THEN 'reviewer'
    WHEN p_command IN (
      'begin_triage', 'request_clarification', 'accept',
      'assign_reviewer', 'reassign_builder', 'reassign_reviewer',
      'close', 'close_no_response'
    ) THEN 'triager'
    WHEN p_command IN (
      'reassign_triager', 'place_moderation_hold',
      'release_moderation_hold', 'remove_for_moderation'
    ) THEN 'operator'
    ELSE NULL
  END;
  IF v_event_actor_role IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request command event authority is not available.';
  END IF;
  IF v_request.version <> p_expected_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  IF v_request.moderation_state <> 'clear'
    AND p_command NOT IN (
      'release_moderation_hold', 'remove_for_moderation'
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Request is held by moderation.';
  END IF;
  IF v_request.lifecycle_state IN ('completed', 'closed')
    AND p_command NOT IN (
      'place_moderation_hold', 'release_moderation_hold',
      'remove_for_moderation'
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Terminal request state cannot be changed.';
  END IF;
  IF p_command IN (
    'begin_triage', 'accept', 'assign_reviewer', 'reassign_triager',
    'reassign_builder', 'reassign_reviewer'
  ) THEN
    SELECT controls.assigning_requests
    INTO STRICT v_assigning_requests
    FROM public.build_request_controls AS controls
    WHERE controls.singleton
    FOR UPDATE;
    IF NOT v_assigning_requests THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:controls_off';
    END IF;
  END IF;

  IF p_command = 'begin_triage' THEN
    IF v_actor_role NOT IN ('admin', 'triager')
      OR v_request.lifecycle_state <> 'submitted'
      OR EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'begin_triage is not allowed.';
    END IF;
    UPDATE public.build_requests SET lifecycle_state = 'triage' WHERE id = p_request_id;
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (p_request_id, 'triager', v_actor_id, v_display)
    ;

  ELSIF p_command = 'request_clarification' THEN
    IF v_request.lifecycle_state <> 'triage'
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'request_clarification is not allowed.';
    END IF;
    IF (
      SELECT count(*) FROM public.build_request_clarifications AS prior_clarification
      WHERE prior_clarification.request_id = p_request_id
    ) >= 3 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Clarification limit has been reached.';
    END IF;
    v_authority := jsonb_build_object('clarificationId', gen_random_uuid());
    INSERT INTO public.build_request_clarifications (
      id, request_id, sequence, question, requested_by, requested_at
    ) VALUES (
      (v_authority->>'clarificationId')::UUID, p_request_id,
      COALESCE((SELECT max(c.sequence) + 1 FROM public.build_request_clarifications AS c
        WHERE c.request_id = p_request_id), 1),
      private.request_assert_safe_text_v1(p_payload->>'question', 'question', 1, 2000, TRUE),
      v_actor_id, v_occurred_at
    );
    UPDATE public.build_requests SET lifecycle_state = 'clarification_requested' WHERE id = p_request_id;

  ELSIF p_command = 'submit_clarification' THEN
    IF v_request.requester_id <> v_actor_id OR v_request.lifecycle_state <> 'clarification_requested' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'submit_clarification is not allowed.';
    END IF;
    UPDATE public.build_request_clarifications AS clarification
    SET answer = private.request_assert_safe_text_v1(p_payload->>'answer', 'answer', 1, 4000, TRUE),
        answered_at = v_occurred_at
    WHERE clarification.request_id = p_request_id
      AND clarification.id = (p_payload->>'clarificationId')::UUID
      AND clarification.answer IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Clarification is invalid or already answered.';
    END IF;
    UPDATE public.build_requests SET lifecycle_state = 'triage' WHERE id = p_request_id;

  ELSIF p_command = 'accept' THEN
    IF v_request.lifecycle_state <> 'triage'
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'accept is not allowed.';
    END IF;
    IF COALESCE(p_payload->>'targetDate', '')
      !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Target date is invalid.';
    END IF;
    BEGIN
      v_target_date := (p_payload->>'targetDate')::DATE;
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Target date is invalid.';
    END;
    IF v_target_date < current_date THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Target date is in the past.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    PERFORM 1
    FROM public.build_request_clarifications AS accepted_clarification
    WHERE accepted_clarification.request_id = p_request_id
    ORDER BY accepted_clarification.sequence
    FOR UPDATE;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_clarifications AS unanswered_clarification
      WHERE unanswered_clarification.request_id = p_request_id
        AND (
          unanswered_clarification.answer IS NULL
          OR unanswered_clarification.answered_at IS NULL
        )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Every clarification must be answered before acceptance.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    SELECT
      COALESCE(jsonb_agg(jsonb_build_object(
        'clarificationId', clarification.id,
        'sequence', clarification.sequence,
        'question', clarification.question,
        'answer', clarification.answer
      ) ORDER BY clarification.sequence, clarification.id), '[]'::JSONB),
      count(*)::INTEGER
    INTO v_accepted_clarifications, v_accepted_clarification_count
    FROM public.build_request_clarifications AS clarification
    WHERE clarification.request_id = p_request_id;
    IF v_accepted_clarification_count > 3
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_accepted_clarifications)
          WITH ORDINALITY AS accepted(value, position)
        WHERE (accepted.value->>'sequence')::INTEGER <> accepted.position
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Accepted clarification set is invalid.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    v_accepted_clarification_digest := encode(extensions.digest(convert_to(
      private.request_canonical_json_v1(v_accepted_clarifications),
      'UTF8'
    ), 'sha256'), 'hex');
    PERFORM 1 FROM public.build_request_controls WHERE singleton FOR UPDATE;
    IF NOT (SELECT assigning_requests FROM public.build_request_controls WHERE singleton) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:controls_off';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_requests AS active_request
      WHERE active_request.id <> p_request_id
        AND active_request.moderation_state <> 'removed'
        AND active_request.lifecycle_state NOT IN ('completed', 'closed')
    ) >= (
      SELECT active_case_capacity
      FROM public.build_request_controls
      WHERE singleton
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:capacity_full';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles AS builder_profile
      JOIN auth.users AS builder_user ON builder_user.id = builder_profile.id
      WHERE builder_profile.id = (p_payload->>'builderId')::UUID
        AND builder_user.email_confirmed_at IS NOT NULL
    ) OR (p_payload->>'builderId')::UUID = v_request.requester_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Builder assignment is invalid.';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Assignment history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    v_authority := jsonb_build_object('assignmentId', gen_random_uuid());
    INSERT INTO public.build_request_assignments (
      id, request_id, assignment_role, account_id, display_name, assigned_by, assigned_at
    ) VALUES (
      (v_authority->>'assignmentId')::UUID, p_request_id, 'builder',
      (p_payload->>'builderId')::UUID,
      private.request_display_name_v1((p_payload->>'builderId')::UUID),
      v_actor_id, v_occurred_at
    );
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'builder', (p_payload->>'builderId')::UUID,
      private.request_display_name_v1((p_payload->>'builderId')::UUID)
    );
    INSERT INTO public.build_request_accepted_clarification_sets (
      request_id, brief_revision_id, accepted_clarifications,
      accepted_clarification_count, accepted_clarification_digest,
      clarification_acceptance_cutoff
    ) VALUES (
      p_request_id, v_request.current_brief_revision_id,
      v_accepted_clarifications, v_accepted_clarification_count,
      v_accepted_clarification_digest, v_occurred_at
    );
    v_authority := v_authority || jsonb_build_object(
      'acceptedClarificationCount', v_accepted_clarification_count,
      'acceptedClarificationDigest', v_accepted_clarification_digest,
      'clarificationAcceptanceCutoff', v_occurred_at
    );
    UPDATE public.build_requests
    SET lifecycle_state = 'accepted', target_date = v_target_date
    WHERE id = p_request_id;

  ELSIF p_command = 'assign_reviewer' THEN
    IF v_request.lifecycle_state NOT IN (
        'accepted', 'building', 'repair_required', 'review_pending'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_reviewer
        WHERE active_reviewer.request_id = p_request_id
          AND active_reviewer.assignment_role = 'reviewer'
          AND active_reviewer.active
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'assign_reviewer is not allowed.';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles AS reviewer_profile
      JOIN auth.users AS reviewer_user ON reviewer_user.id = reviewer_profile.id
      WHERE reviewer_profile.id = (p_payload->>'reviewerId')::UUID
        AND reviewer_user.email_confirmed_at IS NOT NULL
    ) OR EXISTS (
      SELECT 1 FROM public.build_request_assignments AS existing_builder
      WHERE existing_builder.request_id = p_request_id AND existing_builder.active
        AND existing_builder.assignment_role = 'builder'
        AND existing_builder.account_id = (p_payload->>'reviewerId')::UUID
    ) OR (p_payload->>'reviewerId')::UUID = v_request.requester_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Reviewer assignment is invalid.';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Assignment history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    v_authority := jsonb_build_object('assignmentId', gen_random_uuid());
    INSERT INTO public.build_request_assignments (
      id, request_id, assignment_role, account_id, display_name, assigned_by, assigned_at
    ) VALUES (
      (v_authority->>'assignmentId')::UUID, p_request_id, 'reviewer',
      (p_payload->>'reviewerId')::UUID,
      private.request_display_name_v1((p_payload->>'reviewerId')::UUID),
      v_actor_id, v_occurred_at
    );
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'reviewer', (p_payload->>'reviewerId')::UUID,
      private.request_display_name_v1((p_payload->>'reviewerId')::UUID)
    );

  ELSIF p_command = 'reassign_triager' THEN
    IF v_actor_role IS DISTINCT FROM 'admin'
      OR v_request.lifecycle_state IN ('submitted', 'completed', 'closed')
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS prior_triager
        WHERE prior_triager.request_id = p_request_id
          AND prior_triager.actor_role = 'triager'
          AND (
            prior_triager.active
            OR (
              NOT prior_triager.active
              AND prior_triager.deidentified
              AND prior_triager.account_id IS NULL
            )
          )
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.profiles AS triager_profile
        JOIN auth.users AS triager_user
          ON triager_user.id = triager_profile.id
        WHERE triager_profile.id = (p_payload->>'triagerId')::UUID
          AND triager_profile.role = 'admin'
          AND triager_user.email_confirmed_at IS NOT NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.build_request_participants AS current_triager
        WHERE current_triager.request_id = p_request_id
          AND current_triager.actor_role = 'triager'
          AND current_triager.active
          AND current_triager.account_id = (p_payload->>'triagerId')::UUID
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'reassign_triager is not allowed.';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_participants AS triager_history
      WHERE triager_history.request_id = p_request_id
        AND triager_history.actor_role = 'triager'
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Participant history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    PERFORM private.request_assert_safe_text_v1(
      p_payload->>'reason', 'reason', 1, 500, TRUE
    );
    v_event_metadata := jsonb_build_object(
      'reason', btrim(p_payload->>'reason', E' \t\n\f\v')
    );
    UPDATE public.build_request_participants AS prior_triager
    SET active = FALSE
    WHERE prior_triager.request_id = p_request_id
      AND prior_triager.actor_role = 'triager'
      AND prior_triager.active;
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'triager', (p_payload->>'triagerId')::UUID,
      private.request_display_name_v1((p_payload->>'triagerId')::UUID)
    );
    v_authority := '{}'::JSONB;

  ELSIF p_command = 'reassign_builder' THEN
    IF v_request.lifecycle_state NOT IN (
        'accepted', 'building', 'repair_required'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS prior_builder
        WHERE prior_builder.request_id = p_request_id
          AND prior_builder.assignment_role = 'builder'
          AND (
            prior_builder.active
            OR (
              prior_builder.deidentified
              AND prior_builder.account_id IS NULL
              AND prior_builder.ended_at IS NOT NULL
            )
          )
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.profiles AS builder_profile
        JOIN auth.users AS builder_user
          ON builder_user.id = builder_profile.id
        WHERE builder_profile.id = (p_payload->>'builderId')::UUID
          AND builder_user.email_confirmed_at IS NOT NULL
      )
      OR (p_payload->>'builderId')::UUID = v_request.requester_id
      OR EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_reviewer
        WHERE active_reviewer.request_id = p_request_id
          AND active_reviewer.assignment_role = 'reviewer'
          AND active_reviewer.active
          AND active_reviewer.account_id = (p_payload->>'builderId')::UUID
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'reassign_builder is not allowed.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS current_builder
      WHERE current_builder.request_id = p_request_id
        AND current_builder.assignment_role = 'builder'
        AND current_builder.active
        AND current_builder.account_id = (p_payload->>'builderId')::UUID
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Builder reassignment target is already active.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_delivery_revisions AS active_wip_revision
      WHERE active_wip_revision.request_id = p_request_id
        AND active_wip_revision.revision_state IN (
          'staging', 'prepared', 'sealed'
        )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Builder reassignment is blocked by active delivery work.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Assignment history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    PERFORM private.request_assert_safe_text_v1(
      p_payload->>'reason', 'reason', 1, 500, TRUE
    );
    v_event_metadata := jsonb_build_object(
      'reason', btrim(p_payload->>'reason', E' \t\n\f\v')
    );
    UPDATE public.build_request_assignments AS prior_builder
    SET active = FALSE, ended_at = v_occurred_at
    WHERE prior_builder.request_id = p_request_id
      AND prior_builder.assignment_role = 'builder'
      AND prior_builder.active;
    UPDATE public.build_request_participants AS prior_builder_participant
    SET active = FALSE
    WHERE prior_builder_participant.request_id = p_request_id
      AND prior_builder_participant.actor_role = 'builder'
      AND prior_builder_participant.active;
    v_authority := jsonb_build_object('assignmentId', gen_random_uuid());
    INSERT INTO public.build_request_assignments (
      id, request_id, assignment_role, account_id, display_name,
      assigned_by, assigned_at
    ) VALUES (
      (v_authority->>'assignmentId')::UUID, p_request_id, 'builder',
      (p_payload->>'builderId')::UUID,
      private.request_display_name_v1((p_payload->>'builderId')::UUID),
      v_actor_id, v_occurred_at
    );
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'builder', (p_payload->>'builderId')::UUID,
      private.request_display_name_v1((p_payload->>'builderId')::UUID)
    );

  ELSIF p_command = 'reassign_reviewer' THEN
    IF v_request.lifecycle_state NOT IN (
        'accepted', 'building', 'repair_required', 'review_pending'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS prior_reviewer
        WHERE prior_reviewer.request_id = p_request_id
          AND prior_reviewer.assignment_role = 'reviewer'
          AND prior_reviewer.active
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.profiles AS reviewer_profile
        JOIN auth.users AS reviewer_user
          ON reviewer_user.id = reviewer_profile.id
        WHERE reviewer_profile.id = (p_payload->>'reviewerId')::UUID
          AND reviewer_user.email_confirmed_at IS NOT NULL
      )
      OR (p_payload->>'reviewerId')::UUID = v_request.requester_id
      OR EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_builder
        WHERE active_builder.request_id = p_request_id
          AND active_builder.assignment_role = 'builder'
          AND active_builder.active
          AND active_builder.account_id = (p_payload->>'reviewerId')::UUID
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'reassign_reviewer is not allowed.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS current_reviewer
      WHERE current_reviewer.request_id = p_request_id
        AND current_reviewer.assignment_role = 'reviewer'
        AND current_reviewer.active
        AND current_reviewer.account_id = (p_payload->>'reviewerId')::UUID
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Reviewer reassignment target is already active.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    PERFORM private.request_assert_safe_text_v1(
      p_payload->>'reason', 'reason', 1, 500, TRUE
    );
    IF (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) >= 20 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Assignment history limit has been reached.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    v_event_metadata := jsonb_build_object(
      'reason', btrim(p_payload->>'reason', E' \t\n\f\v')
    );
    UPDATE public.build_request_assignments AS prior_reviewer
    SET active = FALSE, ended_at = v_occurred_at
    WHERE prior_reviewer.request_id = p_request_id
      AND prior_reviewer.assignment_role = 'reviewer'
      AND prior_reviewer.active;
    UPDATE public.build_request_participants AS prior_reviewer_participant
    SET active = FALSE
    WHERE prior_reviewer_participant.request_id = p_request_id
      AND prior_reviewer_participant.actor_role = 'reviewer'
      AND prior_reviewer_participant.active;
    v_authority := jsonb_build_object('assignmentId', gen_random_uuid());
    INSERT INTO public.build_request_assignments (
      id, request_id, assignment_role, account_id, display_name,
      assigned_by, assigned_at
    ) VALUES (
      (v_authority->>'assignmentId')::UUID, p_request_id, 'reviewer',
      (p_payload->>'reviewerId')::UUID,
      private.request_display_name_v1((p_payload->>'reviewerId')::UUID),
      v_actor_id, v_occurred_at
    );
    INSERT INTO public.build_request_participants (
      request_id, actor_role, account_id, display_name
    ) VALUES (
      p_request_id, 'reviewer', (p_payload->>'reviewerId')::UUID,
      private.request_display_name_v1((p_payload->>'reviewerId')::UUID)
    );

  ELSIF p_command = 'start_build' THEN
    IF v_request.lifecycle_state <> 'accepted' OR NOT EXISTS (
      SELECT 1 FROM public.build_request_assignments AS active_builder
      WHERE active_builder.request_id = p_request_id
        AND active_builder.assignment_role = 'builder'
        AND active_builder.active AND active_builder.account_id = v_actor_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'start_build is not allowed.';
    END IF;
    UPDATE public.build_requests SET lifecycle_state = 'building' WHERE id = p_request_id;

  ELSIF p_command = 'stage_delivery_artifact' THEN
    IF (
      SELECT count(*) FROM public.build_request_delivery_revisions AS prior_delivery
      WHERE prior_delivery.request_id = p_request_id
        AND prior_delivery.revision_state = 'submitted'
    ) >= 2 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Delivery revision limit has been reached.',
        DETAIL = 'request_authority:delivery_revision_limit';
    END IF;
    SELECT * INTO v_assignment
    FROM public.build_request_assignments AS staged_builder
    WHERE staged_builder.id = (p_payload->>'activeBuilderAssignmentId')::UUID
      AND staged_builder.request_id = p_request_id
      AND staged_builder.assignment_role = 'builder'
      AND staged_builder.active AND staged_builder.account_id = v_actor_id;
    IF NOT FOUND OR v_request.lifecycle_state NOT IN ('building', 'repair_required')
      OR (p_payload->>'acceptedBriefRevisionId')::UUID
        IS DISTINCT FROM v_request.current_brief_revision_id THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Artifact staging is not allowed.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_delivery_revisions AS conflicting_revision
      WHERE conflicting_revision.request_id = p_request_id
        AND (
          (
            conflicting_revision.revision_state IN (
              'staging', 'prepared', 'sealed'
            )
            AND conflicting_revision.id <>
              (p_payload->>'deliveryRevisionId')::UUID
          )
          OR (
            conflicting_revision.id =
              (p_payload->>'deliveryRevisionId')::UUID
            AND conflicting_revision.revision_state <> 'staging'
          )
        )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Another delivery revision already owns the case workspace.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    INSERT INTO public.build_request_delivery_revisions (
      id, request_id, accepted_brief_revision_id, builder_assignment_id,
      authored_by, authored_by_display_name
    ) VALUES (
      (p_payload->>'deliveryRevisionId')::UUID, p_request_id,
      v_request.current_brief_revision_id, v_assignment.id, v_actor_id, v_display
    )
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_revision
    FROM public.build_request_delivery_revisions AS staged_revision
    WHERE staged_revision.id = (p_payload->>'deliveryRevisionId')::UUID
      AND staged_revision.request_id = p_request_id
      AND staged_revision.revision_state = 'staging'
      AND staged_revision.authored_by = v_actor_id
      AND staged_revision.accepted_brief_revision_id = v_request.current_brief_revision_id
      AND staged_revision.builder_assignment_id = v_assignment.id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery revision staging is invalid.';
    END IF;
    IF (
      SELECT count(*)
      FROM public.build_request_delivery_artifacts AS attempted_artifact
      WHERE attempted_artifact.delivery_revision_id = v_revision.id
    ) >= 8 OR COALESCE((
      SELECT sum(attempted_artifact.byte_length)
      FROM public.build_request_delivery_artifacts AS attempted_artifact
      WHERE attempted_artifact.delivery_revision_id = v_revision.id
    ), 0) + (p_payload->>'byteLength')::BIGINT > 24000000 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Delivery revision staging lifetime limit was reached.',
        DETAIL = 'request_authority:artifact_staging_limit';
    END IF;
    IF (
      SELECT count(*) FROM public.build_request_delivery_artifacts AS staged_artifact
      WHERE staged_artifact.delivery_revision_id = v_revision.id
        AND staged_artifact.abandoned_at IS NULL
    ) >= 5 OR COALESCE((
      SELECT sum(staged_artifact.byte_length)
      FROM public.build_request_delivery_artifacts AS staged_artifact
      WHERE staged_artifact.delivery_revision_id = v_revision.id
        AND staged_artifact.abandoned_at IS NULL
    ), 0) + (p_payload->>'byteLength')::BIGINT > 12000000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery revision staging is invalid or full.';
    END IF;
    v_authority := jsonb_build_object(
      'deliveryRevisionId', v_revision.id,
      'artifactId', gen_random_uuid()
    );
    INSERT INTO public.build_request_delivery_artifacts (
      id, request_id, delivery_revision_id, accepted_brief_revision_id,
      builder_assignment_id, client_file_id, artifact_ordinal, normalized_name, byte_length,
      sha256, detected_media_type, scanner_version, staging_identity
    ) VALUES (
      (v_authority->>'artifactId')::UUID, p_request_id, v_revision.id,
      v_revision.accepted_brief_revision_id, v_revision.builder_assignment_id,
      private.request_assert_opaque_v1(p_payload->>'clientFileId', 'clientFileId'),
      (p_payload->>'artifactOrdinal')::INTEGER,
      private.request_assert_safe_text_v1(p_payload->>'normalizedName', 'normalizedName', 1, 120),
      (p_payload->>'byteLength')::BIGINT, lower(p_payload->>'sha256'),
      p_payload->>'detectedMediaType',
      private.request_assert_safe_text_v1(p_payload->>'scannerVersion', 'scannerVersion', 1, 80),
      concat(
        'requests/', p_request_id, '/deliveries/', v_revision.id,
        '/artifacts/', (v_authority->>'artifactId'), '/', gen_random_uuid()
      )
    );

  ELSIF p_command = 'finalize_delivery_artifact' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact custody attestation is server-only.';

  ELSIF p_command = 'abandon_delivery_artifact' THEN
    UPDATE public.build_request_delivery_artifacts AS a
    SET abandoned_at = v_occurred_at, integrity_status = 'failed'
    FROM public.build_request_delivery_revisions AS d,
      public.build_request_assignments AS ba
    WHERE a.id = (p_payload->>'artifactId')::UUID
      AND a.delivery_revision_id = (p_payload->>'deliveryRevisionId')::UUID
      AND a.request_id = p_request_id
      AND d.id = a.delivery_revision_id AND d.revision_state = 'staging'
      AND ba.id = d.builder_assignment_id AND ba.active AND ba.account_id = v_actor_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Artifact abandonment is not allowed.';
    END IF;

  ELSIF p_command = 'prepare_delivery_revision' THEN
    SELECT * INTO v_revision
    FROM public.build_request_delivery_revisions AS draft_revision
    WHERE draft_revision.id = (p_payload->>'deliveryRevisionId')::UUID
      AND draft_revision.request_id = p_request_id
      AND draft_revision.revision_state = 'staging'
      AND draft_revision.accepted_brief_revision_id =
        (p_payload->>'acceptedBriefRevisionId')::UUID
      AND draft_revision.builder_assignment_id =
        (p_payload->>'activeBuilderAssignmentId')::UUID
      AND draft_revision.authored_by = v_actor_id
    FOR UPDATE;
    IF NOT FOUND OR v_request.lifecycle_state NOT IN ('building', 'repair_required') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Delivery preparation is not allowed.';
    END IF;
    PERFORM 1
    FROM public.build_request_delivery_artifacts AS locked_artifact
    WHERE locked_artifact.request_id = p_request_id
      AND locked_artifact.delivery_revision_id = v_revision.id
      AND locked_artifact.abandoned_at IS NULL
    FOR UPDATE;
    SELECT count(*), COALESCE(sum(artifact.byte_length), 0),
      min(artifact.artifact_ordinal), max(artifact.artifact_ordinal)
    INTO v_count, v_total, v_min_ordinal, v_max_ordinal
    FROM public.build_request_delivery_artifacts AS artifact
    WHERE artifact.request_id = p_request_id
      AND artifact.delivery_revision_id = v_revision.id
      AND artifact.abandoned_at IS NULL;
    IF v_count NOT BETWEEN 1 AND 5
      OR v_total NOT BETWEEN 1 AND 12000000
      OR v_min_ordinal <> 1
      OR v_max_ordinal <> v_count
      OR (
        SELECT count(DISTINCT artifact.artifact_ordinal)
        FROM public.build_request_delivery_artifacts AS artifact
        WHERE artifact.request_id = p_request_id
          AND artifact.delivery_revision_id = v_revision.id
          AND artifact.abandoned_at IS NULL
      ) <> v_count
      OR EXISTS (
        SELECT 1
        FROM public.build_request_delivery_artifacts AS artifact
        WHERE artifact.request_id = p_request_id
          AND artifact.delivery_revision_id = v_revision.id
          AND artifact.abandoned_at IS NULL
          AND (
            artifact.accepted_brief_revision_id IS DISTINCT FROM
              v_revision.accepted_brief_revision_id
            OR artifact.builder_assignment_id IS DISTINCT FROM
              v_revision.builder_assignment_id
            OR artifact.integrity_status <> 'verified'
            OR artifact.scan_state <> 'complete'
            OR artifact.scan_verdict <> 'clean'
            OR artifact.object_identity IS NULL
            OR NOT EXISTS (
              SELECT 1
              FROM public.build_request_artifact_attestations AS attestation
              WHERE attestation.request_id = artifact.request_id
                AND attestation.delivery_revision_id =
                  artifact.delivery_revision_id
                AND attestation.artifact_id = artifact.id
                AND attestation.stage_receipt_id =
                  artifact.stage_receipt_id
                AND attestation.object_identity =
                  artifact.object_identity
                AND attestation.scan_verdict = 'clean'
            )
          )
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery revision artifacts are not ready for preparation.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    IF jsonb_typeof(p_payload->'builderEvidence') <> 'array'
      OR jsonb_array_length(p_payload->'builderEvidence') NOT BETWEEN 1 AND 3 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'builderEvidence must contain 1-3 results.';
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'builderEvidence')
    LOOP
      PERFORM private.request_assert_json_keys_v1(
        v_item,
        ARRAY['acceptanceCheckId', 'result', 'evidenceText', 'evidenceRef'],
        'Builder evidence'
      );
      IF v_item->>'result' NOT IN ('pass', 'fail', 'not_run') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Builder evidence result is invalid.';
      END IF;
      INSERT INTO public.build_request_builder_evidence (
        request_id, delivery_revision_id, brief_revision_id, acceptance_check_id,
        result, evidence_text, evidence_ref
      ) VALUES (
        p_request_id, v_revision.id, v_revision.accepted_brief_revision_id,
        (v_item->>'acceptanceCheckId')::UUID, v_item->>'result',
        CASE WHEN v_item->'evidenceText' = 'null'::JSONB
          THEN NULL ELSE private.request_assert_safe_text_v1(
            v_item->>'evidenceText',
            'evidenceText', 1, 2000, TRUE
          ) END,
        CASE WHEN v_item->'evidenceRef' = 'null'::JSONB
          THEN NULL ELSE private.request_assert_opaque_v1(
            v_item->>'evidenceRef', 'evidenceRef'
          ) END
      );
    END LOOP;
    IF (
      SELECT count(*) FROM public.build_request_builder_evidence AS prepared_evidence
      WHERE prepared_evidence.delivery_revision_id = v_revision.id
    ) <> (
      SELECT count(*) FROM public.build_request_acceptance_checks AS accepted_check
      WHERE accepted_check.brief_revision_id = v_revision.accepted_brief_revision_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Builder evidence must cover every accepted check exactly once.';
    END IF;
    IF p_payload->'approvedPathForgeReference' <> 'null'::JSONB THEN
      PERFORM private.request_assert_json_keys_v1(
        p_payload->'approvedPathForgeReference',
        CASE
          WHEN p_payload->'approvedPathForgeReference'->>'kind' = 'project'
            THEN ARRAY['kind', 'projectId']
          ELSE ARRAY[
            'kind', 'projectId', 'modelVariantId', 'responseStepNumber'
          ]
        END,
        'Approved PathForge reference'
      );
    END IF;
    UPDATE public.build_request_delivery_revisions
    SET revision_state = 'prepared',
        evidence_checklist_version = 1,
        rights_snapshot_version = 1,
        revision_label = private.request_assert_safe_text_v1(
          p_payload->>'revisionLabel',
          'revisionLabel', 1, 80, TRUE
        ),
        summary = private.request_assert_safe_text_v1(
          p_payload->>'summary', 'summary', 1, 2000, TRUE
        ),
        approved_pathforge_reference =
          private.request_validate_pathforge_reference_v1(
            CASE
              WHEN p_payload->'approvedPathForgeReference' = 'null'::JSONB THEN NULL
              WHEN p_payload->'approvedPathForgeReference'->>'kind' = 'project' THEN
                jsonb_build_object(
                  'kind', 'project',
                  'project_id',
                    p_payload->'approvedPathForgeReference'->>'projectId'
                )
              ELSE jsonb_build_object(
                'kind', 'response',
                'project_id',
                  p_payload->'approvedPathForgeReference'->>'projectId',
                'model_variant_id',
                  p_payload->'approvedPathForgeReference'->>'modelVariantId',
                'response_step_number',
                  p_payload->'approvedPathForgeReference'->>'responseStepNumber'
              )
            END
          )
    WHERE id = v_revision.id;
    v_authority := jsonb_build_object('deliveryRevisionId', v_revision.id);

  ELSIF p_command IN ('submit_delivery', 'resubmit_delivery') THEN
    IF (
      SELECT count(*)
      FROM public.build_request_delivery_revisions AS prior_delivery
      WHERE prior_delivery.request_id = p_request_id
        AND prior_delivery.revision_state = 'submitted'
    ) >= 2 THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Delivery revision limit has been reached.',
        DETAIL = 'request_authority:delivery_revision_limit';
    END IF;
    SELECT sealed_revision.* INTO v_revision
    FROM public.build_request_delivery_revisions AS sealed_revision
    JOIN public.build_request_assignments AS builder_assignment
      ON builder_assignment.id = sealed_revision.builder_assignment_id
    WHERE sealed_revision.id = (p_payload->>'deliveryRevisionId')::UUID
      AND sealed_revision.request_id = p_request_id
      AND sealed_revision.revision_state = 'sealed'
      AND sealed_revision.seal_receipt_id = (p_payload->>'sealReceiptId')::UUID
      AND builder_assignment.active
      AND builder_assignment.account_id = v_actor_id
      AND EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_reviewer
        WHERE active_reviewer.request_id = p_request_id
          AND active_reviewer.assignment_role = 'reviewer'
          AND active_reviewer.active
          AND active_reviewer.account_id IS NOT NULL
          AND active_reviewer.account_id IS DISTINCT FROM
            builder_assignment.account_id
      )
    FOR UPDATE OF sealed_revision;
    IF NOT FOUND OR (
      p_command = 'submit_delivery' AND v_request.lifecycle_state <> 'building'
    ) OR (
      p_command = 'resubmit_delivery' AND v_request.lifecycle_state <> 'repair_required'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sealed delivery submission is not allowed.';
    END IF;
    UPDATE public.build_request_delivery_revisions
    SET revision_number = COALESCE((
          SELECT max(previous_revision.revision_number) + 1
          FROM public.build_request_delivery_revisions AS previous_revision
          WHERE previous_revision.request_id = p_request_id
            AND previous_revision.revision_state = 'submitted'
        ), 1),
        revision_state = 'submitted',
        submitted_at = v_occurred_at
    WHERE id = v_revision.id;
    UPDATE public.build_requests
    SET current_delivery_revision_id = v_revision.id,
        lifecycle_state = 'review_pending'
    WHERE id = p_request_id;
    v_authority := jsonb_build_object('deliveryRevisionId', v_revision.id);

  ELSIF p_command IN ('approve_delivery', 'request_repair') THEN
    IF COALESCE(p_payload->>'manifestDigest', '') !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery manifest digest is invalid.';
    END IF;
    SELECT d.* INTO v_revision
    FROM public.build_request_delivery_revisions AS d
    JOIN public.build_request_assignments AS ra
      ON ra.request_id = d.request_id AND ra.assignment_role = 'reviewer'
      AND ra.active AND ra.account_id = v_actor_id
    WHERE d.id = (p_payload->>'deliveryRevisionId')::UUID
      AND d.request_id = p_request_id AND d.revision_state = 'submitted'
      AND d.id = v_request.current_delivery_revision_id
      AND d.artifact_manifest_digest = lower(p_payload->>'manifestDigest');
    IF NOT FOUND OR v_request.lifecycle_state <> 'review_pending' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Delivery review is not allowed.';
    END IF;
    BEGIN
      v_count := (p_payload->>'checklistVersion')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery review checklist version is invalid.';
    END;
    IF v_count IS DISTINCT FROM v_revision.evidence_checklist_version THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery review checklist version is invalid.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    SELECT reviewer_assignment.* INTO STRICT v_assignment
    FROM public.build_request_assignments AS reviewer_assignment
    WHERE reviewer_assignment.request_id = p_request_id
      AND reviewer_assignment.assignment_role = 'reviewer'
      AND reviewer_assignment.active
      AND reviewer_assignment.account_id = v_actor_id;
    IF jsonb_typeof(p_payload->'checks') <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Review checks are required.';
    END IF;
    v_review_id := gen_random_uuid();
    INSERT INTO public.build_request_delivery_reviews (
      id, request_id, delivery_revision_id, brief_revision_id,
      manifest_digest, checklist_version,
      safety_integrity_result, verdict, reason, review_notes, repair_instructions,
      reviewer_id, reviewer_assignment_id, reviewer_display_name, reviewed_at
    ) VALUES (
      v_review_id, p_request_id, v_revision.id,
      v_revision.accepted_brief_revision_id, v_revision.artifact_manifest_digest,
      v_count, p_payload->>'safetyIntegrityResult',
      CASE WHEN p_command = 'approve_delivery' THEN 'approve' ELSE 'repair' END,
      CASE WHEN p_command = 'request_repair' THEN
        private.request_assert_safe_text_v1(
          p_payload->>'reason', 'reason', 1, 2000, TRUE
        ) END,
      CASE WHEN p_command = 'approve_delivery' THEN
        private.request_assert_safe_text_v1(
          p_payload->>'reviewNotes', 'reviewNotes', 0, 2000, TRUE
        ) END,
      CASE WHEN p_command = 'request_repair' THEN
        private.request_assert_safe_text_v1(
          p_payload->>'repairInstructions', 'repairInstructions', 1, 2000, TRUE
        ) END,
      v_actor_id, v_assignment.id, v_display, v_occurred_at
    );
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'checks')
    LOOP
      PERFORM private.request_assert_json_keys_v1(
        v_item,
        ARRAY['acceptanceCheckId', 'result', 'evidenceRef'],
        'Review check'
      );
      INSERT INTO public.build_request_delivery_review_checks (
        request_id, review_id, brief_revision_id, acceptance_check_id, result, evidence_ref
      ) VALUES (
        p_request_id, v_review_id, v_revision.accepted_brief_revision_id,
        (v_item->>'acceptanceCheckId')::UUID, v_item->>'result',
        CASE WHEN v_item->'evidenceRef' = 'null'::JSONB THEN NULL ELSE
          private.request_assert_opaque_v1(v_item->>'evidenceRef', 'evidenceRef') END
      );
    END LOOP;
    IF (
      SELECT count(*) FROM public.build_request_delivery_review_checks AS completed_review_check
      WHERE completed_review_check.review_id = v_review_id
    ) <> (
      SELECT count(*) FROM public.build_request_acceptance_checks AS review_acceptance_check
      WHERE review_acceptance_check.brief_revision_id = v_revision.accepted_brief_revision_id
    ) OR (
      p_command = 'approve_delivery' AND (
        p_payload->>'safetyIntegrityResult' <> 'pass'
        OR EXISTS (
          SELECT 1 FROM public.build_request_delivery_review_checks AS failed_check
          WHERE failed_check.review_id = v_review_id AND failed_check.result <> 'pass'
        )
      )
    ) OR (
      p_command = 'request_repair'
      AND p_payload->>'safetyIntegrityResult' <> 'fail'
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_review_checks AS failed_check
        WHERE failed_check.review_id = v_review_id
          AND failed_check.result = 'fail'
      )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Review must cover and satisfy accepted checks.';
    END IF;
    UPDATE public.build_requests
    SET lifecycle_state = CASE
      WHEN p_command = 'approve_delivery' THEN 'delivery_ready'
      WHEN (
        SELECT count(*)
        FROM public.build_request_delivery_revisions AS exhausted_revision
        WHERE exhausted_revision.request_id = p_request_id
          AND exhausted_revision.revision_state = 'submitted'
      ) >= 2 THEN 'closed'
      ELSE 'repair_required'
    END,
    close_reason = CASE
      WHEN p_command = 'request_repair' AND (
        SELECT count(*)
        FROM public.build_request_delivery_revisions AS exhausted_revision
        WHERE exhausted_revision.request_id = p_request_id
          AND exhausted_revision.revision_state = 'submitted'
      ) >= 2 THEN 'failed_review'
      ELSE NULL
    END,
    close_explanation = CASE
      WHEN p_command = 'request_repair' AND (
        SELECT count(*)
        FROM public.build_request_delivery_revisions AS exhausted_revision
        WHERE exhausted_revision.request_id = p_request_id
          AND exhausted_revision.revision_state = 'submitted'
      ) >= 2 THEN 'The delivery did not pass final review.'
      ELSE close_explanation
    END,
    terminal_at = CASE
      WHEN p_command = 'request_repair' AND (
        SELECT count(*)
        FROM public.build_request_delivery_revisions AS exhausted_revision
        WHERE exhausted_revision.request_id = p_request_id
          AND exhausted_revision.revision_state = 'submitted'
      ) >= 2 THEN COALESCE(terminal_at, v_occurred_at)
      ELSE terminal_at
    END,
    delivery_response_started_at = CASE
      WHEN p_command = 'approve_delivery' THEN v_occurred_at
      ELSE NULL
    END
    WHERE id = p_request_id;

  ELSIF p_command = 'acknowledge_delivery' THEN
    IF v_request.requester_id <> v_actor_id
      OR v_request.lifecycle_state <> 'delivery_ready'
      OR (p_payload->>'deliveryRevisionId')::UUID
        IS DISTINCT FROM v_request.current_delivery_revision_id THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Delivery acknowledgement is not allowed.';
    END IF;
    UPDATE public.build_requests
    SET lifecycle_state = 'delivered',
        delivery_response_started_at =
          COALESCE(delivery_response_started_at, v_occurred_at)
    WHERE id = p_request_id;

  ELSIF p_command = 'requester_delivery_outcome' THEN
    IF COALESCE(p_payload->>'manifestDigest', '') !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery manifest digest is invalid.';
    END IF;
    IF v_request.requester_id <> v_actor_id
      OR v_request.lifecycle_state NOT IN ('delivery_ready', 'delivered')
      OR (p_payload->>'deliveryRevisionId')::UUID
        IS DISTINCT FROM v_request.current_delivery_revision_id
      OR NOT EXISTS (
        SELECT 1 FROM public.build_request_delivery_revisions AS outcome_revision
        WHERE outcome_revision.id = v_request.current_delivery_revision_id
          AND outcome_revision.artifact_manifest_digest = lower(p_payload->>'manifestDigest')
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Requester outcome is not allowed.';
    END IF;
    SELECT * INTO STRICT v_revision
    FROM public.build_request_delivery_revisions AS outcome_revision
    WHERE outcome_revision.id = v_request.current_delivery_revision_id
      AND outcome_revision.request_id = p_request_id
      AND outcome_revision.artifact_manifest_digest =
        lower(p_payload->>'manifestDigest');
    v_outcome_id := gen_random_uuid();
    IF p_payload->>'outcome' = 'useful' THEN
      INSERT INTO public.build_request_requester_outcomes (
        id, request_id, delivery_revision_id, manifest_digest,
        brief_revision_id, requester_id, outcome, occurred_at
      ) VALUES (
        v_outcome_id, p_request_id, v_revision.id,
        v_revision.artifact_manifest_digest,
        v_revision.accepted_brief_revision_id, v_actor_id,
        'useful', v_occurred_at
      );
      v_event_metadata := jsonb_build_object('outcome', 'useful');
      UPDATE public.build_requests
      SET lifecycle_state = 'completed',
          terminal_at = COALESCE(terminal_at, v_occurred_at)
      WHERE id = p_request_id;
    ELSIF p_payload->>'outcome' = 'failed_acceptance_check' AND EXISTS (
      SELECT 1 FROM public.build_request_acceptance_checks AS failed_acceptance
      WHERE failed_acceptance.brief_revision_id = v_request.current_brief_revision_id
        AND failed_acceptance.id = (p_payload->>'failedAcceptanceCheckId')::UUID
    ) THEN
      INSERT INTO public.build_request_requester_outcomes (
        id, request_id, delivery_revision_id, manifest_digest,
        brief_revision_id, requester_id, outcome, acceptance_check_id,
        reason, reason_digest, occurred_at
      ) VALUES (
        v_outcome_id, p_request_id, v_revision.id,
        v_revision.artifact_manifest_digest,
        v_revision.accepted_brief_revision_id, v_actor_id,
        'failed_acceptance_check',
        (p_payload->>'failedAcceptanceCheckId')::UUID,
        private.request_assert_safe_text_v1(
          p_payload->>'reason', 'reason', 1, 2000, TRUE
        ),
        private.request_pseudonym_text_v1(
          btrim(p_payload->>'reason', E' \t\n\f\v')
        ),
        v_occurred_at
      );
      v_event_metadata := jsonb_build_object(
        'outcome', 'failed_acceptance_check',
        'acceptanceCheckId', p_payload->>'failedAcceptanceCheckId',
        'reason', btrim(p_payload->>'reason', E' \t\n\f\v')
      );
      UPDATE public.build_requests
      SET lifecycle_state = CASE
            WHEN (
              SELECT count(*)
              FROM public.build_request_delivery_revisions AS exhausted_revision
              WHERE exhausted_revision.request_id = p_request_id
                AND exhausted_revision.revision_state = 'submitted'
            ) >= 2 THEN 'closed'
            ELSE 'repair_required'
          END,
          close_reason = CASE
            WHEN (
              SELECT count(*)
              FROM public.build_request_delivery_revisions AS exhausted_revision
              WHERE exhausted_revision.request_id = p_request_id
                AND exhausted_revision.revision_state = 'submitted'
            ) >= 2 THEN 'failed_review'
            ELSE NULL
          END,
          close_explanation = CASE
            WHEN (
              SELECT count(*)
              FROM public.build_request_delivery_revisions AS exhausted_revision
              WHERE exhausted_revision.request_id = p_request_id
                AND exhausted_revision.revision_state = 'submitted'
            ) >= 2 THEN 'The delivery did not pass final acceptance.'
            ELSE close_explanation
          END,
          terminal_at = CASE
            WHEN (
              SELECT count(*)
              FROM public.build_request_delivery_revisions AS exhausted_revision
              WHERE exhausted_revision.request_id = p_request_id
                AND exhausted_revision.revision_state = 'submitted'
            ) >= 2 THEN COALESCE(terminal_at, v_occurred_at)
            ELSE terminal_at
          END
      WHERE id = p_request_id;
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Requester outcome is invalid.';
    END IF;

  ELSIF p_command IN ('close', 'close_no_response', 'withdraw') THEN
    IF p_command = 'withdraw' THEN
      IF v_request.requester_id <> v_actor_id
        OR v_request.lifecycle_state NOT IN (
          'submitted', 'triage', 'clarification_requested', 'accepted',
          'building', 'review_pending', 'repair_required'
        ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'withdraw is not allowed.';
      END IF;
      UPDATE public.build_requests
      SET lifecycle_state = 'closed', close_reason = 'withdrawn',
          close_explanation = private.request_assert_safe_text_v1(
            p_payload->>'reason', 'reason', 1, 2000, TRUE
          ),
          publication_state = 'withdrawn',
          terminal_at = COALESCE(terminal_at, v_occurred_at)
      WHERE id = p_request_id;
    ELSE
      IF NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS active_triager
        WHERE active_triager.request_id = p_request_id
          AND active_triager.actor_role = 'triager'
          AND active_triager.active
          AND active_triager.account_id = v_actor_id
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'close is not allowed.';
      END IF;
      IF p_command = 'close_no_response' THEN
        IF v_request.lifecycle_state NOT IN ('delivery_ready', 'delivered')
          OR v_request.delivery_response_started_at IS NULL
          OR v_request.delivery_response_started_at >
            v_occurred_at - INTERVAL '14 days'
          OR NOT EXISTS (
            SELECT 1
            FROM public.build_request_delivery_revisions AS no_response_revision
            JOIN public.build_request_delivery_reviews AS no_response_review
              ON no_response_review.delivery_revision_id = no_response_revision.id
            WHERE no_response_revision.id = v_request.current_delivery_revision_id
              AND no_response_review.verdict = 'approve'
          ) THEN
          RAISE EXCEPTION USING ERRCODE = '55000',
            MESSAGE = 'No-response close is not yet eligible.';
        END IF;
        UPDATE public.build_requests
        SET lifecycle_state = 'closed', close_reason = 'no_response',
            terminal_at = COALESCE(terminal_at, v_occurred_at)
        WHERE id = p_request_id;
      ELSE
        IF p_payload->>'reason' NOT IN (
          'existing_resolution', 'duplicate', 'out_of_scope',
          'capacity_unavailable', 'declined', 'expired'
        ) THEN
          RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'Close reason is invalid.';
        END IF;
        IF NOT (
          private.request_allowed_close_reasons_v1(p_request_id, v_actor_id)
            ? (p_payload->>'reason')
        ) THEN
          RAISE EXCEPTION USING ERRCODE = '55000',
            MESSAGE = 'Close reason is not eligible for the current request state.',
            DETAIL = 'request_authority:invalid_transition';
        END IF;
        IF p_payload->>'reason' = 'existing_resolution' THEN
          IF p_payload->'resolutionReference' IS NULL
            OR p_payload->'resolutionReference' = 'null'::JSONB THEN
            RAISE EXCEPTION USING ERRCODE = '22023',
              MESSAGE = 'Existing resolution requires an approved PathForge reference.';
          END IF;
          PERFORM private.request_assert_json_keys_v1(
            p_payload->'resolutionReference',
            CASE
              WHEN p_payload->'resolutionReference'->>'kind' = 'project'
                THEN ARRAY['kind', 'projectId']
              ELSE ARRAY[
                'kind', 'projectId', 'modelVariantId', 'responseStepNumber'
              ]
            END,
            'Resolution reference'
          );
          v_reference := private.request_validate_pathforge_reference_v1(
            CASE
              WHEN p_payload->'resolutionReference'->>'kind' = 'project' THEN
                jsonb_build_object(
                  'kind', 'project',
                  'project_id', p_payload->'resolutionReference'->>'projectId'
                )
              ELSE jsonb_build_object(
                'kind', 'response',
                'project_id', p_payload->'resolutionReference'->>'projectId',
                'model_variant_id',
                  p_payload->'resolutionReference'->>'modelVariantId',
                'response_step_number',
                  p_payload->'resolutionReference'->>'responseStepNumber'
              )
            END
          );
        ELSIF p_payload->'resolutionReference' IS NOT NULL
          AND p_payload->'resolutionReference' <> 'null'::JSONB THEN
          RAISE EXCEPTION USING ERRCODE = '22023',
            MESSAGE = 'Only an existing-resolution close may include a resolution reference.';
        END IF;
        IF p_payload->>'reason' <> 'duplicate' THEN
          PERFORM private.request_assert_safe_text_v1(
            p_payload->>'note', 'note', 1, 2000, TRUE
          );
        END IF;
        UPDATE public.build_requests
        SET lifecycle_state = 'closed', close_reason = p_payload->>'reason',
            close_explanation = CASE
              WHEN p_payload->>'reason' = 'duplicate'
                THEN 'Closed because this request duplicates an existing request.'
              ELSE btrim(p_payload->>'note', E' \t\n\f\v')
            END,
            resolution_reference = v_reference,
            terminal_at = COALESCE(terminal_at, v_occurred_at)
        WHERE id = p_request_id;
        v_event_metadata := jsonb_strip_nulls(jsonb_build_object(
          'reason', p_payload->>'reason',
          'resolutionReference', CASE
            WHEN v_reference IS NULL THEN NULL
            WHEN v_reference->>'kind' = 'project' THEN
              jsonb_build_object(
                'kind', 'project',
                'projectId', v_reference->>'project_id'
              )
            ELSE jsonb_build_object(
              'kind', 'response',
              'projectId', v_reference->>'project_id',
              'modelVariantId', v_reference->>'model_variant_id',
              'responseStepNumber',
                (v_reference->>'response_step_number')::INTEGER
            )
          END
        ));
      END IF;
    END IF;

  ELSIF p_command = 'place_moderation_hold' THEN
    IF v_actor_role <> 'admin' OR v_request.moderation_state <> 'clear'
      OR EXISTS (
        SELECT 1 FROM public.build_request_retention_holds AS existing_hold
        WHERE existing_hold.request_id = p_request_id
          AND existing_hold.hold_kind = 'moderation'
          AND existing_hold.released_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
        WHERE cleanup_claim.request_id = p_request_id
          AND cleanup_claim.resolved_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_receipts AS cleaned_artifact
        WHERE cleaned_artifact.request_id = p_request_id
      ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Moderation hold is not allowed.';
    END IF;
    INSERT INTO public.build_request_retention_holds (
      request_id, hold_kind, reason, placed_by, placed_at
    ) VALUES (
      p_request_id, 'moderation',
      private.request_assert_safe_text_v1(
        p_payload->>'reason', 'reason', 1, 2000, TRUE
      ),
      v_actor_id, v_occurred_at
    );
    UPDATE public.build_requests SET moderation_state = 'held' WHERE id = p_request_id;

  ELSIF p_command = 'release_moderation_hold' THEN
    IF v_actor_role <> 'admin' OR v_request.moderation_state <> 'held'
      OR (
        SELECT count(*) FROM public.build_request_retention_holds AS active_hold_count
        WHERE active_hold_count.request_id = p_request_id
          AND active_hold_count.hold_kind = 'moderation'
          AND active_hold_count.released_at IS NULL
      ) <> 1 THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Moderation release is not allowed.';
    END IF;
    UPDATE public.build_request_retention_holds AS active_hold
    SET released_by = v_actor_id, released_at = v_occurred_at,
        release_resolution = private.request_assert_safe_text_v1(
          p_payload->>'resolution', 'resolution', 1, 2000, TRUE
        )
    WHERE active_hold.request_id = p_request_id
      AND active_hold.hold_kind = 'moderation'
      AND active_hold.released_at IS NULL;
    UPDATE public.build_requests SET moderation_state = 'clear' WHERE id = p_request_id;

  ELSIF p_command = 'remove_for_moderation' THEN
    IF v_actor_role <> 'admin'
      OR v_request.moderation_state = 'removed' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Moderation removal is not allowed.';
    END IF;
    v_event_metadata := jsonb_build_object(
      'reason',
      private.request_assert_safe_text_v1(
        p_payload->>'reason', 'reason', 1, 2000, TRUE
      )
    );
    UPDATE public.build_request_retention_holds AS moderation_hold
    SET released_by = v_actor_id,
        released_at = v_occurred_at,
        release_resolution = 'Closed by irreversible moderation removal.'
    WHERE moderation_hold.request_id = p_request_id
      AND moderation_hold.hold_kind = 'moderation'
      AND moderation_hold.released_at IS NULL;
    UPDATE public.build_requests AS request_case
    SET moderation_state = 'removed',
        lifecycle_state = CASE
          WHEN request_case.lifecycle_state IN ('completed', 'closed')
            THEN request_case.lifecycle_state
          ELSE 'closed'
        END,
        close_reason = CASE
          WHEN request_case.lifecycle_state IN ('completed', 'closed')
            THEN request_case.close_reason
          ELSE 'safety_removed'
        END,
        terminal_at = CASE
          WHEN request_case.lifecycle_state IN ('completed', 'closed')
            THEN request_case.terminal_at
          ELSE COALESCE(request_case.terminal_at, v_occurred_at)
        END,
        publication_state = 'withdrawn'
    WHERE request_case.id = p_request_id;

  ELSE
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported request command.';
  END IF;

  UPDATE public.build_requests
  SET version = version + 1, updated_at = v_occurred_at
  WHERE id = p_request_id
  RETURNING * INTO v_request;
  IF v_request.lifecycle_state IN ('completed', 'closed') THEN
    UPDATE public.build_request_assignments AS terminal_assignment
    SET active = FALSE, ended_at = COALESCE(terminal_assignment.ended_at, v_occurred_at)
    WHERE terminal_assignment.request_id = p_request_id
      AND terminal_assignment.active;
    UPDATE public.build_request_participants AS terminal_participant
    SET active = FALSE
    WHERE terminal_participant.request_id = p_request_id
      AND terminal_participant.active;
  END IF;
  SELECT COALESCE(max(next_event.sequence) + 1, 1) INTO v_sequence
  FROM public.build_request_events AS next_event
  WHERE next_event.request_id = p_request_id;
  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_id, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, command_receipt_id, outbox_id,
    participant_visible, safe_metadata, redactable_reason, occurred_at
  ) VALUES (
    v_event_id, p_request_id, v_sequence, p_command, v_actor_id,
    v_event_actor_role,
    v_before.lifecycle_state, v_before.moderation_state,
    v_before.publication_state, v_before.close_reason,
    v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason, v_request.version,
    p_idempotency_key, v_command_id, v_command_id, v_command_id, TRUE,
    v_event_metadata - 'reason',
    v_event_metadata->>'reason',
    v_occurred_at
  );
  INSERT INTO public.build_request_command_receipts (
    id, actor_id, idempotency_key, request_id, command_kind, request_hash,
    request_version, lifecycle_state, moderation_state, publication_state,
    close_reason, event_id, receipt, created_at
  ) VALUES (
    v_command_id, v_actor_id, p_idempotency_key, p_request_id, p_command, v_hash,
    v_request.version, v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason, v_event_id,
    jsonb_build_object('authority_result', v_authority), v_occurred_at
  );
  IF p_command = 'stage_delivery_artifact' THEN
    UPDATE public.build_request_delivery_artifacts AS staged_receipt_artifact
    SET stage_receipt_id = v_command_id
    WHERE staged_receipt_artifact.id = (v_authority->>'artifactId')::UUID
      AND staged_receipt_artifact.request_id = p_request_id;
  END IF;
  INSERT INTO public.build_request_outbox (
    id, request_id, event_id, topic, payload, available_at
  ) VALUES (
    v_command_id, p_request_id, v_event_id, 'request_event_v1',
    jsonb_build_object('request_id', p_request_id, 'event_id', v_event_id, 'kind', p_command),
    v_occurred_at
  );
  RETURN QUERY SELECT * FROM private.request_receipt_v1(
    v_command_id, p_request_id, v_event_id, FALSE, v_occurred_at, v_authority
  );
END;
$$;

REVOKE ALL ON FUNCTION public.build_request_command_v1(
  INTEGER, UUID, INTEGER, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.build_request_command_v1(
  INTEGER, UUID, INTEGER, TEXT, TEXT, JSONB
) TO authenticated;

CREATE OR REPLACE FUNCTION public.deidentify_build_request_account_v1(
  p_contract_version INTEGER,
  p_account_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_service BOOLEAN := COALESCE(auth.jwt()->>'role', '') = 'service_role';
  v_actor_digest TEXT;
  v_subject_digest TEXT;
  v_hash TEXT;
  v_prior public.build_request_account_deidentification_receipts%ROWTYPE;
  v_case_ids UUID[];
  v_case_id UUID;
  v_before public.build_requests%ROWTYPE;
  v_after public.build_requests%ROWTYPE;
  v_event_id UUID;
  v_command_id UUID;
  v_sequence INTEGER;
  v_case_key TEXT;
  v_occurred_at TIMESTAMPTZ := clock_timestamp();
  v_affected_count INTEGER := 0;
  v_terminalized_count INTEGER := 0;
  v_admission_revoked BOOLEAN := FALSE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF p_account_id IS NULL
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Account deidentification request is invalid.';
  END IF;
  IF NOT v_service
    AND (
      v_actor_id IS NULL
      OR private.request_actor_role_v1(v_actor_id) <> 'admin'
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Account deidentification is not allowed.';
  END IF;
  v_actor_digest := CASE
    WHEN v_service THEN (
      SELECT encode(extensions.hmac(
        convert_to('service_role', 'UTF8'),
        pseudonym_key.secret,
        'sha256'
      ), 'hex')
      FROM private.request_pseudonym_keys AS pseudonym_key
      WHERE pseudonym_key.singleton
    )
    ELSE private.request_account_pseudonym_v1(v_actor_id)
  END;
  v_subject_digest := private.request_account_pseudonym_v1(p_account_id);
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'contract', p_contract_version,
    'subjectDigest', v_subject_digest
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor_digest || ':' || p_idempotency_key, 0
  ));
  SELECT * INTO v_prior
  FROM public.build_request_account_deidentification_receipts AS prior
  WHERE prior.actor_digest = v_actor_digest
    AND prior.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_hash
      OR v_prior.subject_digest <> v_subject_digest THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'contractVersion', 1,
      'accountId', p_account_id,
      'affectedCaseCount', v_prior.affected_case_count,
      'terminalizedCaseCount', v_prior.terminalized_case_count,
      'admissionRevoked', v_prior.admission_revoked,
      'replayed', TRUE,
      'occurredAt', v_prior.occurred_at
    );
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-subject:' || v_subject_digest, 0
  ));
  INSERT INTO public.build_request_deidentified_accounts (
    subject_digest, deidentified_at
  ) VALUES (
    v_subject_digest, v_occurred_at
  )
  ON CONFLICT (subject_digest) DO NOTHING;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_delivery_revisions AS active_workspace
    WHERE active_workspace.authored_by = p_account_id
      AND active_workspace.revision_state IN (
        'staging', 'prepared', 'sealed'
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Account deidentification is blocked by active delivery work.',
      DETAIL = 'request_authority:invalid_transition';
  END IF;
  SELECT array_agg(affected_request_id ORDER BY affected_request_id)
  INTO v_case_ids
  FROM (
    SELECT request_case.id AS affected_request_id
    FROM public.build_requests AS request_case
    WHERE request_case.requester_id = p_account_id
    UNION
    SELECT participant.request_id
    FROM public.build_request_participants AS participant
    WHERE participant.account_id = p_account_id
    UNION
    SELECT assignment.request_id
    FROM public.build_request_assignments AS assignment
    WHERE assignment.account_id = p_account_id
      OR assignment.assigned_by = p_account_id
    UNION
    SELECT brief.request_id
    FROM public.build_request_brief_revisions AS brief
    WHERE brief.authored_by = p_account_id
    UNION
    SELECT clarification.request_id
    FROM public.build_request_clarifications AS clarification
    WHERE clarification.requested_by = p_account_id
    UNION
    SELECT revision.request_id
    FROM public.build_request_delivery_revisions AS revision
    WHERE revision.authored_by = p_account_id
    UNION
    SELECT review.request_id
    FROM public.build_request_delivery_reviews AS review
    WHERE review.reviewer_id = p_account_id
    UNION
    SELECT outcome.request_id
    FROM public.build_request_requester_outcomes AS outcome
    WHERE outcome.requester_id = p_account_id
    UNION
    SELECT event_value.request_id
    FROM public.build_request_events AS event_value
    WHERE event_value.actor_id = p_account_id
    UNION
    SELECT retention_hold.request_id
    FROM public.build_request_retention_holds AS retention_hold
    WHERE retention_hold.placed_by = p_account_id
      OR retention_hold.released_by = p_account_id
    UNION
    SELECT receipt.request_id
    FROM public.build_request_command_receipts AS receipt
    WHERE receipt.actor_id = p_account_id
    UNION
    SELECT acknowledgement.request_id
    FROM public.build_request_update_acknowledgements AS acknowledgement
    WHERE acknowledgement.actor_id = p_account_id
  ) AS affected;
  v_affected_count := COALESCE(array_length(v_case_ids, 1), 0);
  v_admission_revoked := EXISTS (
    SELECT 1
    FROM public.build_request_pilot_admissions AS admission
    WHERE admission.account_id = p_account_id
  );
  FOREACH v_case_id IN ARRAY COALESCE(v_case_ids, ARRAY[]::UUID[])
  LOOP
    SELECT * INTO STRICT v_before
    FROM public.build_requests
    WHERE id = v_case_id
    FOR UPDATE;
    IF v_before.requester_id = p_account_id THEN
      UPDATE public.build_requests AS requester_case
      SET publication_state = 'withdrawn',
          lifecycle_state = CASE
            WHEN requester_case.lifecycle_state IN ('completed', 'closed')
              THEN requester_case.lifecycle_state
            ELSE 'closed'
          END,
          close_reason = CASE
            WHEN requester_case.lifecycle_state IN ('completed', 'closed')
              THEN requester_case.close_reason
            ELSE 'withdrawn'
          END,
          close_explanation = CASE
            WHEN requester_case.lifecycle_state IN ('completed', 'closed')
              THEN requester_case.close_explanation
            ELSE 'Request closed after account removal.'
          END,
          terminal_at = CASE
            WHEN requester_case.lifecycle_state IN ('completed', 'closed')
              THEN requester_case.terminal_at
            ELSE COALESCE(requester_case.terminal_at, v_occurred_at)
          END
      WHERE requester_case.id = v_case_id;
      IF v_before.lifecycle_state NOT IN ('completed', 'closed') THEN
        v_terminalized_count := v_terminalized_count + 1;
        UPDATE public.build_request_assignments
        SET active = FALSE,
            ended_at = COALESCE(ended_at, v_occurred_at)
        WHERE request_id = v_case_id AND active;
        UPDATE public.build_request_participants
        SET active = FALSE
        WHERE request_id = v_case_id AND active;
      END IF;
    END IF;
    UPDATE public.build_requests
    SET version = version + 1, updated_at = v_occurred_at
    WHERE id = v_case_id
    RETURNING * INTO v_after;
    SELECT COALESCE(max(event_value.sequence) + 1, 1)
    INTO v_sequence
    FROM public.build_request_events AS event_value
    WHERE event_value.request_id = v_case_id;
    v_event_id := gen_random_uuid();
    v_command_id := gen_random_uuid();
    v_case_key := concat(
      'deid:', private.request_pseudonym_text_v1(p_idempotency_key),
      ':case:',
      replace(v_case_id::TEXT, '-', '')
    );
    INSERT INTO public.build_request_events (
      id, request_id, sequence, event_kind, actor_id, actor_role,
      old_lifecycle_state, old_moderation_state, old_publication_state,
      old_close_reason, new_lifecycle_state, new_moderation_state,
      new_publication_state, new_close_reason, resulting_request_version,
      correlation_id, command_id, command_receipt_id, outbox_id,
      participant_visible, safe_metadata, occurred_at
    ) VALUES (
      v_event_id, v_case_id, v_sequence, 'account_deidentified',
      CASE WHEN v_service THEN NULL ELSE v_actor_id END,
      CASE WHEN v_service THEN 'system' ELSE 'operator' END,
      v_before.lifecycle_state, v_before.moderation_state,
      v_before.publication_state, v_before.close_reason,
      v_after.lifecycle_state, v_after.moderation_state,
      v_after.publication_state, v_after.close_reason, v_after.version,
      v_case_key, v_command_id, v_command_id, v_command_id, TRUE,
      jsonb_build_object('identityState', 'deidentified'), v_occurred_at
    );
    INSERT INTO public.build_request_command_receipts (
      id, actor_id, actor_deidentified, idempotency_key, request_id,
      command_kind, request_hash, request_version, lifecycle_state,
      moderation_state, publication_state, close_reason, event_id,
      receipt, created_at
    ) VALUES (
      v_command_id, CASE WHEN v_service THEN NULL ELSE v_actor_id END,
      FALSE, v_case_key, v_case_id, 'account_deidentified', v_hash,
      v_after.version, v_after.lifecycle_state, v_after.moderation_state,
      v_after.publication_state, v_after.close_reason, v_event_id,
      '{"authority_result":{}}', v_occurred_at
    );
    INSERT INTO public.build_request_outbox (
      id, request_id, event_id, topic, payload, available_at
    ) VALUES (
      v_command_id, v_case_id, v_event_id, 'request_event_v1',
      jsonb_build_object(
        'request_id', v_case_id,
        'event_id', v_event_id,
        'kind', 'account_deidentified'
      ),
      v_occurred_at
    );
  END LOOP;
  DELETE FROM public.build_request_participant_state
  WHERE account_id = p_account_id;
  DELETE FROM public.build_request_pilot_admissions
  WHERE account_id = p_account_id;
  UPDATE public.build_request_pilot_admissions
  SET changed_by = NULL, changed_by_deidentified = TRUE
  WHERE changed_by = p_account_id;
  UPDATE public.build_request_pilot_admission_receipts
  SET actor_id = CASE WHEN actor_id = p_account_id THEN NULL ELSE actor_id END,
      actor_deidentified = actor_deidentified OR actor_id = p_account_id,
      account_id = CASE
        WHEN account_id = p_account_id THEN NULL ELSE account_id
      END,
      account_deidentified =
        account_deidentified OR account_id = p_account_id
  WHERE actor_id = p_account_id OR account_id = p_account_id;
  UPDATE public.build_request_participants
  SET account_id = NULL, display_name = 'Former participant',
      deidentified = TRUE, active = FALSE
  WHERE account_id = p_account_id;
  UPDATE public.build_request_assignments
  SET account_id = NULL, display_name = 'Former participant',
      deidentified = TRUE, active = FALSE,
      ended_at = COALESCE(ended_at, v_occurred_at)
  WHERE account_id = p_account_id;
  UPDATE public.build_request_assignments
  SET assigned_by = NULL, assigned_by_deidentified = TRUE
  WHERE assigned_by = p_account_id;
  UPDATE public.build_request_brief_revisions
  SET authored_by = NULL, authored_by_deidentified = TRUE
  WHERE authored_by = p_account_id;
  PERFORM set_config(
    'request_authority.deidentify_account_id',
    p_account_id::TEXT,
    TRUE
  );
  UPDATE public.build_request_clarifications
  SET requested_by = NULL, requested_by_deidentified = TRUE
  WHERE requested_by = p_account_id;
  PERFORM set_config(
    'request_authority.deidentify_account_id',
    '',
    TRUE
  );
  UPDATE public.build_request_delivery_revisions
  SET authored_by = NULL,
      authored_by_display_name = 'Former participant',
      authored_by_deidentified = TRUE
  WHERE authored_by = p_account_id;
  UPDATE public.build_request_delivery_reviews
  SET reviewer_id = NULL,
      reviewer_display_name = 'Former participant',
      reviewer_deidentified = TRUE
  WHERE reviewer_id = p_account_id;
  UPDATE public.build_request_requester_outcomes
  SET requester_id = NULL, requester_deidentified = TRUE
  WHERE requester_id = p_account_id;
  UPDATE public.build_request_events
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id = p_account_id;
  UPDATE public.build_request_retention_holds
  SET placed_by = NULL, placed_by_deidentified = TRUE
  WHERE placed_by = p_account_id;
  UPDATE public.build_request_retention_holds
  SET released_by = NULL, released_by_deidentified = TRUE
  WHERE released_by = p_account_id;
  UPDATE public.build_request_command_receipts
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id = p_account_id;
  UPDATE public.build_request_controls_receipts
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id = p_account_id;
  UPDATE public.build_request_update_acknowledgements
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id = p_account_id;
  UPDATE public.build_requests
  SET requester_id = NULL,
      requester_display_name = 'Former participant',
      requester_deidentified = TRUE
  WHERE requester_id = p_account_id;
  INSERT INTO public.build_request_account_deidentification_receipts (
    actor_digest, idempotency_key, request_hash, subject_digest,
    affected_case_count, terminalized_case_count, admission_revoked,
    occurred_at, expires_at
  ) VALUES (
    v_actor_digest, p_idempotency_key, v_hash, v_subject_digest,
    v_affected_count, v_terminalized_count, v_admission_revoked,
    v_occurred_at, v_occurred_at + INTERVAL '400 days'
  );
  RETURN jsonb_build_object(
    'contractVersion', 1,
    'accountId', p_account_id,
    'affectedCaseCount', v_affected_count,
    'terminalizedCaseCount', v_terminalized_count,
    'admissionRevoked', v_admission_revoked,
    'replayed', FALSE,
    'occurredAt', v_occurred_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deidentify_build_request_account_v1(
  INTEGER, UUID, TEXT
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deidentify_build_request_account_v1(
  INTEGER, UUID, TEXT
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION
public.expire_build_request_account_deidentification_receipt_v1(
  p_contract_version INTEGER,
  p_receipt_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_expired BOOLEAN := FALSE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Account deidentification receipt expiry is not allowed.';
  END IF;
  IF p_receipt_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Account deidentification receipt expiry is invalid.';
  END IF;
  DELETE FROM public.build_request_account_deidentification_receipts AS receipt
  WHERE receipt.id = p_receipt_id
    AND receipt.expires_at <= v_now
  RETURNING TRUE INTO v_expired;
  RETURN jsonb_build_object(
    'contractVersion', 1,
    'receiptId', p_receipt_id,
    'expired', COALESCE(v_expired, FALSE),
    'occurredAt', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION
public.expire_build_request_account_deidentification_receipt_v1(
  INTEGER, UUID
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION
public.expire_build_request_account_deidentification_receipt_v1(
  INTEGER, UUID
) TO service_role;

CREATE OR REPLACE FUNCTION public.retire_build_request_delivery_revision_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_delivery_revision_id UUID,
  p_expected_version INTEGER,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hash TEXT;
  v_prior public.build_request_command_receipts%ROWTYPE;
  v_request public.build_requests%ROWTYPE;
  v_revision public.build_request_delivery_revisions%ROWTYPE;
  v_event_id UUID := gen_random_uuid();
  v_command_id UUID := gen_random_uuid();
  v_sequence INTEGER;
  v_retired_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Delivery revision retirement is not allowed.';
  END IF;
  IF p_request_id IS NULL
    OR p_delivery_revision_id IS NULL
    OR p_expected_version IS NULL
    OR p_expected_version < 0
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Delivery revision retirement is invalid.';
  END IF;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'contract', p_contract_version,
    'requestId', p_request_id,
    'deliveryRevisionId', p_delivery_revision_id,
    'expectedVersion', p_expected_version
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'delivery-retirement:' || p_idempotency_key, 0
  ));
  SELECT * INTO v_prior
  FROM public.build_request_command_receipts AS prior
  WHERE prior.command_kind = 'retire_delivery_revision'
    AND prior.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_hash
      OR v_prior.request_id <> p_request_id THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    PERFORM 1
    FROM public.build_requests AS request_case
    JOIN public.build_request_delivery_revisions AS revision
      ON revision.request_id = request_case.id
      AND revision.id = p_delivery_revision_id
    WHERE request_case.id = p_request_id
      AND request_case.lifecycle_state IN ('completed', 'closed')
      AND revision.revision_state = 'abandoned'
    FOR UPDATE OF request_case, revision;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Delivery revision retirement replay is invalid.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    RETURN jsonb_build_object(
      'requestId', p_request_id,
      'deliveryRevisionId', p_delivery_revision_id,
      'revisionState', 'abandoned',
      'retiredAt',
        (v_prior.receipt->'authority_result'->>'retiredAt')::TIMESTAMPTZ,
      'replayed', TRUE
    );
  END IF;
  SELECT request_case.*
  INTO v_request
  FROM public.build_requests AS request_case
  JOIN public.build_request_delivery_revisions AS revision
    ON revision.request_id = request_case.id
    AND revision.id = p_delivery_revision_id
  WHERE request_case.id = p_request_id
    AND request_case.version = p_expected_version
    AND request_case.lifecycle_state IN ('completed', 'closed')
    AND revision.revision_state IN ('staging', 'prepared', 'sealed')
    AND NOT EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS active_assignment
      WHERE active_assignment.request_id = request_case.id
        AND active_assignment.active
    )
  FOR UPDATE OF request_case, revision;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Delivery revision retirement is not currently allowed.',
      DETAIL = 'request_authority:invalid_transition';
  END IF;
  SELECT * INTO STRICT v_revision
  FROM public.build_request_delivery_revisions
  WHERE request_id = p_request_id
    AND id = p_delivery_revision_id;
  UPDATE public.build_request_delivery_revisions
  SET revision_state = 'abandoned', retired_at = v_retired_at
  WHERE request_id = p_request_id
    AND id = p_delivery_revision_id;
  UPDATE public.build_requests
  SET version = version + 1, updated_at = v_retired_at
  WHERE id = p_request_id
  RETURNING * INTO v_request;
  SELECT COALESCE(max(event_value.sequence) + 1, 1)
  INTO v_sequence
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = p_request_id;
  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, command_receipt_id, outbox_id,
    participant_visible, safe_metadata, occurred_at
  ) VALUES (
    v_event_id, p_request_id, v_sequence, 'delivery_revision_retired',
    'system', v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason,
    v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason,
    v_request.version, p_idempotency_key, v_command_id,
    v_command_id, v_command_id, TRUE,
    '{}'::JSONB,
    v_retired_at
  );
  INSERT INTO public.build_request_command_receipts (
    id, actor_id, idempotency_key, request_id, command_kind, request_hash,
    request_version, lifecycle_state, moderation_state, publication_state,
    close_reason, event_id, receipt, created_at
  ) VALUES (
    v_command_id, NULL, p_idempotency_key, p_request_id,
    'retire_delivery_revision', v_hash, v_request.version,
    v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason, v_event_id,
    jsonb_build_object('authority_result', jsonb_build_object(
      'deliveryRevisionId', p_delivery_revision_id,
      'retiredAt', v_retired_at
    )),
    v_retired_at
  );
  INSERT INTO public.build_request_outbox (
    id, request_id, event_id, topic, payload, available_at
  ) VALUES (
    v_command_id, p_request_id, v_event_id, 'request_event_v1',
    jsonb_build_object(
      'request_id', p_request_id,
      'event_id', v_event_id,
      'kind', 'delivery_revision_retired'
    ),
    v_retired_at
  );
  RETURN jsonb_build_object(
    'requestId', p_request_id,
    'deliveryRevisionId', p_delivery_revision_id,
    'revisionState', 'abandoned',
    'retiredAt', v_retired_at,
    'replayed', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.retire_build_request_delivery_revision_v1(
  INTEGER, UUID, UUID, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.retire_build_request_delivery_revision_v1(
  INTEGER, UUID, UUID, INTEGER, TEXT
) TO service_role;

CREATE TABLE public.build_request_controls_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL,
  controls_version INTEGER NOT NULL,
  accepting_requests BOOLEAN NOT NULL,
  assigning_requests BOOLEAN NOT NULL,
  active_case_capacity INTEGER NOT NULL CHECK (active_case_capacity BETWEEN 1 AND 4),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (actor_id, idempotency_key)
);
ALTER TABLE public.build_request_controls_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.build_request_controls_receipts
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER build_request_controls_receipts_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_controls_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();

CREATE TABLE public.build_request_update_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  request_id UUID NOT NULL REFERENCES public.build_requests(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL,
  acknowledged_event_sequence INTEGER NOT NULL CHECK (acknowledged_event_sequence >= 0),
  latest_event_sequence INTEGER NOT NULL CHECK (latest_event_sequence >= 0),
  last_read_event_sequence INTEGER NOT NULL CHECK (last_read_event_sequence >= 0),
  unread_count INTEGER NOT NULL CHECK (unread_count >= 0),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (actor_id, idempotency_key)
);
ALTER TABLE public.build_request_update_acknowledgements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.build_request_update_acknowledgements
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER build_request_update_acknowledgements_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_update_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();

CREATE OR REPLACE FUNCTION public.acknowledge_build_request_updates_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_expected_event_sequence INTEGER,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_hash TEXT;
  v_prior public.build_request_update_acknowledgements%ROWTYPE;
  v_latest INTEGER;
  v_previous INTEGER;
  v_unread INTEGER;
  v_replayed BOOLEAN;
  v_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF p_request_id IS NULL
    OR p_expected_event_sequence IS NULL
    OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request update acknowledgement is invalid.';
  END IF;
  IF v_actor_id IS NULL
    THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Request was not found.';
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  IF NOT private.request_has_scope_v1(p_request_id, v_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Request was not found.';
  END IF;
  IF p_expected_event_sequence < 0
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request update acknowledgement is invalid.';
  END IF;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'requestId', p_request_id,
    'expectedEventSequence', p_expected_event_sequence
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-read:' || v_actor_id::TEXT || ':' || p_request_id::TEXT, 0
  ));
  SELECT prior.* INTO v_prior
  FROM public.build_request_update_acknowledgements AS prior
  WHERE prior.actor_id = v_actor_id
    AND prior.idempotency_key = p_idempotency_key;
  v_replayed := FOUND;
  SELECT COALESCE(max(event_value.sequence), 0) INTO v_latest
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = p_request_id
    AND event_value.participant_visible;
  IF v_replayed THEN
    IF v_prior.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'latestEventSequence', v_prior.latest_event_sequence,
      'lastReadEventSequence', v_prior.last_read_event_sequence,
      'unreadCount', v_prior.unread_count
    );
  END IF;
  SELECT state.last_read_event_sequence INTO v_previous
  FROM public.build_request_participant_state AS state
  WHERE state.request_id = p_request_id AND state.account_id = v_actor_id
  FOR UPDATE;
  v_previous := COALESCE(v_previous, 0);
  IF p_expected_event_sequence > v_latest
    OR p_expected_event_sequence < v_previous
    OR (
      p_expected_event_sequence = 0 AND v_latest <> 0
    )
    OR (
      p_expected_event_sequence > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.build_request_events AS expected_event
        WHERE expected_event.request_id = p_request_id
          AND expected_event.participant_visible
          AND expected_event.sequence = p_expected_event_sequence
      )
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  INSERT INTO public.build_request_participant_state (
    request_id, account_id, last_read_event_sequence, read_at
  ) VALUES (p_request_id, v_actor_id, p_expected_event_sequence, v_at)
  ON CONFLICT (request_id, account_id) DO UPDATE
  SET last_read_event_sequence = EXCLUDED.last_read_event_sequence,
      read_at = EXCLUDED.read_at;
  SELECT count(*) INTO v_unread
  FROM public.build_request_events AS visible_event
  WHERE visible_event.request_id = p_request_id
    AND visible_event.participant_visible
    AND visible_event.sequence > p_expected_event_sequence;
  INSERT INTO public.build_request_update_acknowledgements (
    actor_id, request_id, idempotency_key, request_hash,
    acknowledged_event_sequence, latest_event_sequence,
    last_read_event_sequence, unread_count, acknowledged_at
  ) VALUES (
    v_actor_id, p_request_id, p_idempotency_key, v_hash,
    p_expected_event_sequence, v_latest,
    p_expected_event_sequence, v_unread, v_at
  );
  RETURN jsonb_build_object(
    'latestEventSequence', v_latest,
    'lastReadEventSequence', p_expected_event_sequence,
    'unreadCount', v_unread
  );
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_build_request_updates_v1(
  INTEGER, UUID, INTEGER, TEXT
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_build_request_updates_v1(
  INTEGER, UUID, INTEGER, TEXT
) TO authenticated;

CREATE TABLE public.build_request_artifact_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL,
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  artifact_id UUID NOT NULL,
  stage_receipt_id UUID NOT NULL,
  object_identity TEXT NOT NULL,
  scan_verdict TEXT NOT NULL CHECK (scan_verdict = 'clean'),
  attestation_version INTEGER NOT NULL CHECK (attestation_version > 0),
  event_id UUID NOT NULL,
  attested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (artifact_id),
  FOREIGN KEY (request_id, delivery_revision_id, artifact_id)
    REFERENCES public.build_request_delivery_artifacts(
      request_id, delivery_revision_id, id
    ) ON DELETE CASCADE,
  FOREIGN KEY (request_id, stage_receipt_id)
    REFERENCES public.build_request_command_receipts(request_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (request_id, event_id)
    REFERENCES public.build_request_events(request_id, id)
    ON DELETE CASCADE
);

CREATE TABLE public.build_request_delivery_seals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL,
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  prepare_receipt_id UUID NOT NULL,
  manifest_contract_version TEXT NOT NULL DEFAULT 'request-delivery-manifest-v1'
    CHECK (manifest_contract_version = 'request-delivery-manifest-v1'),
  policy_version TEXT NOT NULL DEFAULT 'request-delivery-passive-v1'
    CHECK (policy_version = 'request-delivery-passive-v1'),
  canonical_manifest JSONB,
  manifest_digest TEXT NOT NULL CHECK (manifest_digest ~ '^[0-9a-f]{64}$'),
  canonical_manifest_redacted BOOLEAN NOT NULL DEFAULT FALSE,
  canonical_manifest_redacted_at TIMESTAMPTZ,
  artifact_count INTEGER NOT NULL CHECK (artifact_count BETWEEN 1 AND 5),
  total_bytes BIGINT NOT NULL CHECK (total_bytes BETWEEN 1 AND 12000000),
  event_id UUID NOT NULL,
  sealed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (delivery_revision_id),
  UNIQUE (request_id, id),
  CHECK (
    (NOT canonical_manifest_redacted
      AND canonical_manifest IS NOT NULL
      AND canonical_manifest_redacted_at IS NULL)
    OR
    (canonical_manifest_redacted
      AND canonical_manifest IS NULL
      AND canonical_manifest_redacted_at IS NOT NULL)
  ),
  FOREIGN KEY (request_id, delivery_revision_id)
    REFERENCES public.build_request_delivery_revisions(request_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (request_id, prepare_receipt_id)
    REFERENCES public.build_request_command_receipts(request_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (request_id, event_id)
    REFERENCES public.build_request_events(request_id, id)
    ON DELETE CASCADE
);

CREATE TABLE public.build_request_artifact_cleanup_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  artifact_id UUID NOT NULL,
  owner_request_hash TEXT NOT NULL CHECK (
    owner_request_hash ~ '^[0-9a-f]{64}$'
  ),
  claim_version INTEGER NOT NULL DEFAULT 1 CHECK (claim_version >= 1),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  owner_lease_until TIMESTAMPTZ NOT NULL,
  delete_started_at TIMESTAMPTZ,
  delete_start_request_hash TEXT CHECK (
    delete_start_request_hash IS NULL
    OR delete_start_request_hash ~ '^[0-9a-f]{64}$'
  ),
  delete_start_receipt JSONB,
  resolved_at TIMESTAMPTZ,
  resolution TEXT CHECK (
    resolution IN ('confirmed_removed', 'aborted_object_present')
  ),
  resolution_request_hash TEXT CHECK (
    resolution_request_hash IS NULL
    OR resolution_request_hash ~ '^[0-9a-f]{64}$'
  ),
  resolution_receipt JSONB,
  CHECK (
    (delete_started_at IS NULL
      AND delete_start_request_hash IS NULL
      AND delete_start_receipt IS NULL)
    OR
    (delete_started_at IS NOT NULL
      AND delete_start_request_hash IS NOT NULL
      AND delete_start_receipt IS NOT NULL)
  ),
  CHECK (
    (resolved_at IS NULL
      AND resolution IS NULL
      AND resolution_request_hash IS NULL
      AND resolution_receipt IS NULL)
    OR
    (resolved_at IS NOT NULL
      AND resolution IS NOT NULL
      AND resolution_request_hash IS NOT NULL
      AND resolution_receipt IS NOT NULL)
  ),
  UNIQUE (request_id, delivery_revision_id, artifact_id, id),
  FOREIGN KEY (request_id, delivery_revision_id, artifact_id)
    REFERENCES public.build_request_delivery_artifacts(
      request_id, delivery_revision_id, id
    ) ON DELETE CASCADE
);
CREATE UNIQUE INDEX build_request_one_unresolved_artifact_cleanup_claim
  ON public.build_request_artifact_cleanup_claims (
    request_id, delivery_revision_id, artifact_id
  )
  WHERE resolved_at IS NULL;

CREATE TABLE public.build_request_artifact_cleanup_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  request_id UUID NOT NULL,
  delivery_revision_id UUID NOT NULL,
  artifact_id UUID NOT NULL,
  cleanup_claim_id UUID NOT NULL,
  cleanup_claim_version INTEGER NOT NULL CHECK (cleanup_claim_version >= 1),
  cleanup_disposition TEXT NOT NULL CHECK (
    cleanup_disposition IN ('worker_removed', 'preexisting_missing')
  ),
  cleaned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (cleanup_claim_id, cleanup_claim_version),
  FOREIGN KEY (request_id, delivery_revision_id, artifact_id)
    REFERENCES public.build_request_delivery_artifacts(
      request_id, delivery_revision_id, id
    ) ON DELETE CASCADE,
  FOREIGN KEY (
    request_id, delivery_revision_id, artifact_id, cleanup_claim_id
  ) REFERENCES public.build_request_artifact_cleanup_claims(
    request_id, delivery_revision_id, artifact_id, id
  ) ON DELETE CASCADE
);

ALTER TABLE public.build_request_delivery_artifacts
  ADD CONSTRAINT build_request_delivery_artifacts_stage_receipt_fk
  FOREIGN KEY (request_id, stage_receipt_id)
  REFERENCES public.build_request_command_receipts(request_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.build_request_delivery_revisions
  ADD CONSTRAINT build_request_delivery_revisions_seal_receipt_fk
  FOREIGN KEY (request_id, seal_receipt_id)
  REFERENCES public.build_request_delivery_seals(request_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.build_request_artifact_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_delivery_seals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_artifact_cleanup_claims
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_artifact_cleanup_claims
  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_artifact_cleanup_receipts
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_artifact_cleanup_receipts
  FORCE ROW LEVEL SECURITY;
REVOKE ALL ON
  public.build_request_artifact_attestations,
  public.build_request_delivery_seals,
  public.build_request_artifact_cleanup_claims,
  public.build_request_artifact_cleanup_receipts
FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER build_request_artifact_attestations_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_artifact_attestations
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();
CREATE TRIGGER build_request_delivery_seals_append_only
  BEFORE UPDATE OR DELETE ON public.build_request_delivery_seals
  FOR EACH ROW EXECUTE FUNCTION private.request_reject_append_only_change_v1();

CREATE OR REPLACE FUNCTION private.request_canonical_json_v1(p_value JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_result TEXT;
BEGIN
  CASE jsonb_typeof(p_value)
    WHEN 'null' THEN RETURN 'null';
    WHEN 'boolean' THEN RETURN p_value::TEXT;
    WHEN 'number' THEN RETURN p_value::TEXT;
    WHEN 'string' THEN RETURN to_jsonb(p_value #>> '{}')::TEXT;
    WHEN 'array' THEN
      SELECT '[' || COALESCE(string_agg(
        private.request_canonical_json_v1(item.value),
        ',' ORDER BY item.ordinality
      ), '') || ']'
      INTO v_result
      FROM jsonb_array_elements(p_value) WITH ORDINALITY AS item(value, ordinality);
      RETURN v_result;
    WHEN 'object' THEN
      SELECT '{' || COALESCE(string_agg(
        to_jsonb(member.key)::TEXT || ':' ||
          private.request_canonical_json_v1(member.value),
        ',' ORDER BY member.key COLLATE "C"
      ), '') || '}'
      INTO v_result
      FROM jsonb_each(p_value) AS member(key, value);
      RETURN v_result;
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Canonical JSON value is invalid.';
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_build_request_delivery_artifact_object_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_delivery_revision_id UUID,
  p_artifact_id UUID,
  p_stage_receipt_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_artifact public.build_request_delivery_artifacts%ROWTYPE;
  v_request_version INTEGER;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact object preparation is not allowed.';
  END IF;
  IF p_request_id IS NULL
    OR p_delivery_revision_id IS NULL
    OR p_artifact_id IS NULL
    OR p_stage_receipt_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Artifact object preparation is invalid.';
  END IF;
  SELECT artifact.* INTO v_artifact
  FROM public.build_request_delivery_artifacts AS artifact
  JOIN public.build_requests AS request_case
    ON request_case.id = artifact.request_id
  JOIN public.build_request_delivery_revisions AS revision
    ON revision.id = artifact.delivery_revision_id
  JOIN public.build_request_assignments AS assignment
    ON assignment.id = revision.builder_assignment_id
  JOIN public.build_request_command_receipts AS stage_receipt
    ON stage_receipt.id = artifact.stage_receipt_id
  WHERE artifact.id = p_artifact_id
    AND artifact.request_id = p_request_id
    AND artifact.delivery_revision_id = p_delivery_revision_id
    AND artifact.stage_receipt_id = p_stage_receipt_id
    AND artifact.abandoned_at IS NULL
    AND request_case.current_brief_revision_id = revision.accepted_brief_revision_id
    AND request_case.moderation_state = 'clear'
    AND request_case.lifecycle_state IN ('building', 'repair_required')
    AND revision.revision_state IN ('staging', 'prepared')
    AND NOT EXISTS (
      SELECT 1
      FROM public.build_request_delivery_revisions AS competing_revision
      WHERE competing_revision.request_id = request_case.id
        AND competing_revision.id <> revision.id
        AND competing_revision.revision_state IN ('sealed', 'submitted')
        AND competing_revision.id IS DISTINCT FROM
          request_case.current_delivery_revision_id
    )
    AND assignment.active
    AND assignment.request_id = artifact.request_id
    AND assignment.account_id = stage_receipt.actor_id
    AND stage_receipt.command_kind = 'stage_delivery_artifact'
    AND stage_receipt.request_id = artifact.request_id
    AND stage_receipt.receipt->'authority_result'->>'artifactId' = artifact.id::TEXT
    AND stage_receipt.receipt->'authority_result'->>'deliveryRevisionId' = revision.id::TEXT;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Staged artifact was not found.';
  END IF;
  SELECT request_case.version INTO v_request_version
  FROM public.build_requests AS request_case
  WHERE request_case.id = p_request_id;
  RETURN jsonb_build_object(
    'stageReceiptId', p_stage_receipt_id,
    'requestId', v_artifact.request_id,
    'expectedRequestVersion', v_request_version,
    'artifactId', v_artifact.id,
    'deliveryRevisionId', v_artifact.delivery_revision_id,
    'acceptedBriefRevisionId', v_artifact.accepted_brief_revision_id,
    'activeBuilderAssignmentId', v_artifact.builder_assignment_id,
    'artifactOrdinal', v_artifact.artifact_ordinal,
    'sha256', v_artifact.sha256,
    'byteLength', v_artifact.byte_length,
    'detectedMediaType', v_artifact.detected_media_type,
    'scannerVersion', v_artifact.scanner_version,
    'objectIdentity', v_artifact.staging_identity,
    'retentionState', 'retained',
    'accessUntil', NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.attest_build_request_delivery_artifact_object_v1(
  p_contract_version INTEGER,
  p_idempotency_key TEXT,
  p_expected_request_version INTEGER,
  p_request_id UUID,
  p_delivery_revision_id UUID,
  p_artifact_id UUID,
  p_accepted_brief_revision_id UUID,
  p_active_builder_assignment_id UUID,
  p_artifact_ordinal INTEGER,
  p_stage_receipt_id UUID,
  p_object_identity TEXT,
  p_sha256 TEXT,
  p_byte_length BIGINT,
  p_detected_media_type TEXT,
  p_scanner_version TEXT,
  p_scan_verdict TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hash TEXT;
  v_prior public.build_request_artifact_attestations%ROWTYPE;
  v_artifact public.build_request_delivery_artifacts%ROWTYPE;
  v_event_id UUID := gen_random_uuid();
  v_sequence INTEGER;
  v_attested_at TIMESTAMPTZ := clock_timestamp();
  v_receipt_id UUID := gen_random_uuid();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Artifact attestation is not allowed.';
  END IF;
  IF p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_expected_request_version IS NULL
    OR p_expected_request_version < 0
    OR p_request_id IS NULL
    OR p_delivery_revision_id IS NULL
    OR p_artifact_id IS NULL
    OR p_accepted_brief_revision_id IS NULL
    OR p_active_builder_assignment_id IS NULL
    OR p_artifact_ordinal IS NULL
    OR p_artifact_ordinal NOT BETWEEN 1 AND 5
    OR p_stage_receipt_id IS NULL
    OR p_object_identity IS NULL
    OR p_sha256 IS NULL
    OR p_byte_length IS NULL
    OR p_byte_length NOT BETWEEN 1 AND 4000000
    OR p_detected_media_type IS NULL
    OR p_scanner_version IS NULL
    OR p_scan_verdict IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Artifact attestation is invalid.';
  END IF;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'request', p_request_id, 'revision', p_delivery_revision_id,
    'artifact', p_artifact_id, 'stage_receipt', p_stage_receipt_id,
    'brief', p_accepted_brief_revision_id,
    'assignment', p_active_builder_assignment_id,
    'ordinal', p_artifact_ordinal,
    'identity', p_object_identity, 'sha256', lower(p_sha256),
    'bytes', p_byte_length, 'media', p_detected_media_type,
    'scanner', p_scanner_version, 'verdict', p_scan_verdict
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended('artifact-attest:' || p_idempotency_key, 0));
  SELECT prior.* INTO v_prior
  FROM public.build_request_artifact_attestations AS prior
  WHERE prior.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    PERFORM 1
    FROM public.build_requests AS request_case
    JOIN public.build_request_delivery_revisions AS revision
      ON revision.request_id = request_case.id
      AND revision.id = p_delivery_revision_id
    JOIN public.build_request_assignments AS assignment
      ON assignment.request_id = revision.request_id
      AND assignment.id = revision.builder_assignment_id
    WHERE request_case.id = p_request_id
      AND request_case.moderation_state = 'clear'
      AND request_case.lifecycle_state IN ('building', 'repair_required')
      AND request_case.current_brief_revision_id =
        p_accepted_brief_revision_id
      AND revision.revision_state IN ('staging', 'prepared')
      AND revision.accepted_brief_revision_id =
        p_accepted_brief_revision_id
      AND revision.builder_assignment_id =
        p_active_builder_assignment_id
      AND assignment.active
    FOR UPDATE OF request_case;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Artifact attestation is not currently allowed.',
        DETAIL = 'request_authority:invalid_transition';
    END IF;
    RETURN jsonb_build_object(
      'attestationReceiptId', v_prior.id,
      'requestId', v_prior.request_id,
      'artifactId', v_prior.artifact_id,
      'deliveryRevisionId', v_prior.delivery_revision_id,
      'artifactOrdinal', (
        SELECT artifact.artifact_ordinal
        FROM public.build_request_delivery_artifacts AS artifact
        WHERE artifact.id = v_prior.artifact_id
      ),
      'attestationVersion', v_prior.attestation_version,
      'replayed', TRUE, 'attestedAt', v_prior.attested_at
    );
  END IF;
  PERFORM 1 FROM public.build_requests AS request_case
  WHERE request_case.id = p_request_id
    AND request_case.version = p_expected_request_version
    AND request_case.moderation_state = 'clear'
    AND request_case.lifecycle_state IN ('building', 'repair_required')
    AND request_case.current_brief_revision_id =
      p_accepted_brief_revision_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  SELECT artifact.* INTO v_artifact
  FROM public.build_request_delivery_artifacts AS artifact
  JOIN public.build_request_delivery_revisions AS revision
    ON revision.id = artifact.delivery_revision_id
  JOIN public.build_request_assignments AS assignment
    ON assignment.id = revision.builder_assignment_id
  JOIN public.build_request_command_receipts AS stage_receipt
    ON stage_receipt.id = artifact.stage_receipt_id
  WHERE artifact.id = p_artifact_id
    AND artifact.request_id = p_request_id
    AND artifact.delivery_revision_id = p_delivery_revision_id
    AND artifact.accepted_brief_revision_id = p_accepted_brief_revision_id
    AND artifact.builder_assignment_id = p_active_builder_assignment_id
    AND artifact.artifact_ordinal = p_artifact_ordinal
    AND artifact.stage_receipt_id = p_stage_receipt_id
    AND artifact.staging_identity = p_object_identity
    AND artifact.sha256 = lower(p_sha256)
    AND artifact.byte_length = p_byte_length
    AND artifact.detected_media_type = p_detected_media_type
    AND artifact.scanner_version = p_scanner_version
    AND artifact.abandoned_at IS NULL
    AND revision.request_id = p_request_id
    AND revision.accepted_brief_revision_id = p_accepted_brief_revision_id
    AND revision.builder_assignment_id = p_active_builder_assignment_id
    AND revision.revision_state IN ('staging', 'prepared')
    AND assignment.active
    AND assignment.account_id = stage_receipt.actor_id
    AND stage_receipt.command_kind = 'stage_delivery_artifact'
    AND EXISTS (
      SELECT 1 FROM storage.objects AS stored_object
      WHERE stored_object.bucket_id = 'request-build-deliveries'
        AND stored_object.name = artifact.staging_identity
    );
  IF NOT FOUND OR p_scan_verdict <> 'clean' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Artifact attestation binding failed.';
  END IF;
  UPDATE public.build_request_delivery_artifacts AS attested_artifact
  SET integrity_status = 'verified',
      scan_state = 'complete', scan_verdict = p_scan_verdict,
      object_identity = attested_artifact.staging_identity,
      finalized_at = v_attested_at
  WHERE attested_artifact.id = v_artifact.id;
  UPDATE public.build_requests AS request_case
  SET version = request_case.version + 1,
      updated_at = v_attested_at
  WHERE request_case.id = p_request_id
  RETURNING request_case.version INTO p_expected_request_version;
  SELECT COALESCE(max(event_value.sequence) + 1, 1) INTO v_sequence
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = p_request_id;
  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, safe_metadata, occurred_at
  ) VALUES (
    v_event_id, p_request_id, v_sequence, 'artifact_attested', 'system',
    (SELECT lifecycle_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT moderation_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT publication_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT close_reason FROM public.build_requests WHERE id = p_request_id),
    (SELECT lifecycle_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT moderation_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT publication_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT close_reason FROM public.build_requests WHERE id = p_request_id),
    p_expected_request_version, p_idempotency_key, v_receipt_id,
    jsonb_build_object(
      'artifact_id', p_artifact_id,
      'delivery_revision_id', p_delivery_revision_id,
      'scan_verdict', p_scan_verdict
    ), v_attested_at
  );
  INSERT INTO public.build_request_artifact_attestations (
    id, idempotency_key, request_hash, request_id, delivery_revision_id,
    artifact_id, stage_receipt_id, object_identity, scan_verdict,
    attestation_version, event_id, attested_at
  ) VALUES (
    v_receipt_id, p_idempotency_key, v_hash, p_request_id, p_delivery_revision_id,
    p_artifact_id, p_stage_receipt_id, p_object_identity, p_scan_verdict,
    p_expected_request_version, v_event_id, v_attested_at
  );
  RETURN jsonb_build_object(
    'attestationReceiptId', v_receipt_id,
    'requestId', p_request_id,
    'artifactId', p_artifact_id,
    'deliveryRevisionId', p_delivery_revision_id,
    'artifactOrdinal', p_artifact_ordinal,
    'attestationVersion', p_expected_request_version,
    'replayed', FALSE, 'attestedAt', v_attested_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_build_request_delivery_artifact_custody_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_delivery_revision_id UUID,
  p_artifact_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request_version INTEGER;
  v_terminal_at TIMESTAMPTZ;
  v_retention_state TEXT;
  v_artifact public.build_request_delivery_artifacts%ROWTYPE;
  v_attestation public.build_request_artifact_attestations%ROWTYPE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact custody resolution is not allowed.';
  END IF;
  IF p_request_id IS NULL
    OR p_delivery_revision_id IS NULL
    OR p_artifact_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Artifact custody resolution is invalid.';
  END IF;

  SELECT artifact.*
  INTO v_artifact
  FROM public.build_request_delivery_artifacts AS artifact
  JOIN public.build_request_delivery_revisions AS revision
    ON revision.id = artifact.delivery_revision_id
    AND revision.request_id = artifact.request_id
  JOIN public.build_requests AS request_case
    ON request_case.id = artifact.request_id
  JOIN public.build_request_assignments AS builder_assignment
    ON builder_assignment.id = revision.builder_assignment_id
    AND builder_assignment.request_id = revision.request_id
  JOIN public.build_request_command_receipts AS stage_receipt
    ON stage_receipt.id = artifact.stage_receipt_id
    AND stage_receipt.request_id = artifact.request_id
  JOIN public.build_request_artifact_attestations AS attestation
    ON attestation.artifact_id = artifact.id
    AND attestation.request_id = artifact.request_id
    AND attestation.delivery_revision_id = artifact.delivery_revision_id
    AND attestation.stage_receipt_id = artifact.stage_receipt_id
  WHERE artifact.request_id = p_request_id
    AND artifact.delivery_revision_id = p_delivery_revision_id
    AND artifact.id = p_artifact_id
    AND artifact.abandoned_at IS NULL
    AND artifact.integrity_status = 'verified'
    AND artifact.scan_state = 'complete'
    AND artifact.scan_verdict = 'clean'
    AND artifact.object_identity IS NOT NULL
    AND artifact.object_identity = artifact.staging_identity
    AND attestation.object_identity = artifact.object_identity
    AND attestation.scan_verdict = 'clean'
    AND attestation.attestation_version > 0
    AND revision.revision_state IN ('prepared', 'sealed', 'submitted')
    AND revision.accepted_brief_revision_id = artifact.accepted_brief_revision_id
    AND revision.builder_assignment_id = artifact.builder_assignment_id
    AND request_case.current_brief_revision_id = revision.accepted_brief_revision_id
    AND (
      (
        revision.revision_state IN ('prepared', 'sealed')
        AND request_case.lifecycle_state IN ('building', 'repair_required')
      )
      OR (
        revision.revision_state = 'submitted'
        AND request_case.current_delivery_revision_id = revision.id
    AND request_case.lifecycle_state IN (
          'review_pending', 'delivery_ready', 'delivered', 'completed'
        )
      )
      OR (
        revision.revision_state = 'submitted'
        AND request_case.current_delivery_revision_id = revision.id
        AND request_case.lifecycle_state = 'closed'
        AND request_case.close_reason = 'no_response'
      )
    )
    AND request_case.moderation_state = 'clear'
    AND (
      request_case.lifecycle_state = 'review_pending'
      OR revision.revision_state <> 'submitted'
      OR (
        SELECT current_review.verdict = 'approve'
          AND current_review.manifest_digest = revision.artifact_manifest_digest
        FROM public.build_request_delivery_reviews AS current_review
        WHERE current_review.request_id = request_case.id
          AND current_review.delivery_revision_id = revision.id
        ORDER BY current_review.reviewed_at DESC, current_review.id DESC
        LIMIT 1
      ) IS TRUE
    )
    AND builder_assignment.assignment_role = 'builder'
    AND (
      builder_assignment.active
      OR (
        revision.revision_state = 'submitted'
        AND request_case.current_delivery_revision_id = revision.id
        AND (
          request_case.lifecycle_state = 'completed'
          OR (
            request_case.lifecycle_state = 'closed'
            AND request_case.close_reason = 'no_response'
          )
        )
      )
    )
    AND builder_assignment.account_id IS NOT NULL
    AND builder_assignment.account_id = revision.authored_by
    AND builder_assignment.account_id = stage_receipt.actor_id
    AND stage_receipt.command_kind = 'stage_delivery_artifact'
    AND stage_receipt.receipt->'authority_result'->>'artifactId' = artifact.id::TEXT
    AND stage_receipt.receipt->'authority_result'->>'deliveryRevisionId' =
      revision.id::TEXT
    AND (
      revision.revision_state = 'prepared'
      OR EXISTS (
        SELECT 1
        FROM public.build_request_delivery_seals AS seal
        WHERE seal.delivery_revision_id = revision.id
          AND seal.request_id = revision.request_id
          AND seal.id = revision.seal_receipt_id
          AND seal.manifest_digest = revision.artifact_manifest_digest
      )
    )
    AND EXISTS (
      SELECT 1
      FROM storage.objects AS stored_object
      WHERE stored_object.bucket_id = 'request-build-deliveries'
        AND stored_object.name = artifact.object_identity
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Artifact custody was not found.';
  END IF;

  SELECT request_case.version, request_case.terminal_at
  INTO STRICT v_request_version, v_terminal_at
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_artifact.request_id;

  SELECT attestation.*
  INTO STRICT v_attestation
  FROM public.build_request_artifact_attestations AS attestation
  WHERE attestation.artifact_id = v_artifact.id;

  v_retention_state := CASE
    WHEN EXISTS (
      SELECT 1 FROM public.build_request_retention_holds AS active_hold
      WHERE active_hold.request_id = v_artifact.request_id
        AND active_hold.released_at IS NULL
    ) THEN 'preserved_by_hold'
    WHEN v_terminal_at IS NOT NULL
      AND clock_timestamp() >= v_terminal_at + INTERVAL '90 days'
      THEN 'cleanup_eligible'
    ELSE 'retained'
  END;

  RETURN jsonb_build_object(
    'requestVersion', v_request_version,
    'requestId', v_artifact.request_id,
    'deliveryRevisionId', v_artifact.delivery_revision_id,
    'artifactId', v_artifact.id,
    'stageReceiptId', v_artifact.stage_receipt_id,
    'acceptedBriefRevisionId', v_artifact.accepted_brief_revision_id,
    'activeBuilderAssignmentId', v_artifact.builder_assignment_id,
    'artifactOrdinal', v_artifact.artifact_ordinal,
    'sha256', v_artifact.sha256,
    'byteLength', v_artifact.byte_length,
    'detectedMediaType', v_artifact.detected_media_type,
    'scannerVersion', v_artifact.scanner_version,
    'objectIdentity', v_artifact.object_identity,
    'attestationReceiptId', v_attestation.id,
    'attestationVersion', v_attestation.attestation_version,
    'retentionState', v_retention_state,
    'accessUntil', CASE
      WHEN v_terminal_at IS NULL THEN NULL
      ELSE v_terminal_at + INTERVAL '90 days'
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_build_request_delivery_artifact_cleanup_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_delivery_revision_id UUID,
  p_artifact_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_artifact public.build_request_delivery_artifacts%ROWTYPE;
  v_terminal_at TIMESTAMPTZ;
  v_moderation_state TEXT;
  v_custody_state TEXT;
  v_retention_state TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact cleanup resolution is not allowed.';
  END IF;
  IF p_request_id IS NULL
    OR p_delivery_revision_id IS NULL
    OR p_artifact_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Artifact cleanup resolution is invalid.';
  END IF;
  SELECT artifact.*
  INTO v_artifact
  FROM public.build_request_delivery_artifacts AS artifact
  JOIN public.build_request_delivery_revisions AS revision
    ON revision.request_id = artifact.request_id
    AND revision.id = artifact.delivery_revision_id
  JOIN public.build_requests AS request_case
    ON request_case.id = artifact.request_id
  JOIN public.build_request_command_receipts AS stage_receipt
    ON stage_receipt.request_id = artifact.request_id
    AND stage_receipt.id = artifact.stage_receipt_id
  WHERE artifact.request_id = p_request_id
    AND artifact.delivery_revision_id = p_delivery_revision_id
    AND artifact.id = p_artifact_id
    AND artifact.accepted_brief_revision_id =
      revision.accepted_brief_revision_id
    AND artifact.builder_assignment_id = revision.builder_assignment_id
    AND stage_receipt.command_kind = 'stage_delivery_artifact'
    AND stage_receipt.receipt->'authority_result'->>'artifactId' =
      artifact.id::TEXT
    AND stage_receipt.receipt->'authority_result'->>'deliveryRevisionId' =
      revision.id::TEXT;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Artifact cleanup custody was not found.';
  END IF;
  SELECT request_case.terminal_at, request_case.moderation_state
  INTO STRICT v_terminal_at, v_moderation_state
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_artifact.request_id;

  v_custody_state := CASE
    WHEN v_artifact.abandoned_at IS NOT NULL THEN 'abandoned'
    WHEN EXISTS (
      SELECT 1
      FROM public.build_request_artifact_attestations AS attestation
      WHERE attestation.request_id = v_artifact.request_id
        AND attestation.delivery_revision_id = v_artifact.delivery_revision_id
        AND attestation.artifact_id = v_artifact.id
        AND attestation.stage_receipt_id = v_artifact.stage_receipt_id
        AND attestation.object_identity = v_artifact.staging_identity
    ) THEN 'attested'
    ELSE 'staged'
  END;
  v_retention_state := CASE
    WHEN v_moderation_state = 'held'
      OR EXISTS (
        SELECT 1
        FROM public.build_request_retention_holds AS active_hold
        WHERE active_hold.request_id = v_artifact.request_id
          AND active_hold.released_at IS NULL
      ) THEN 'preserved_by_hold'
    WHEN v_terminal_at IS NOT NULL
      AND clock_timestamp() >= v_terminal_at + INTERVAL '90 days'
      THEN 'cleanup_eligible'
    ELSE 'retained'
  END;
  RETURN jsonb_build_object(
    'requestId', v_artifact.request_id,
    'deliveryRevisionId', v_artifact.delivery_revision_id,
    'artifactId', v_artifact.id,
    'objectIdentity', v_artifact.staging_identity,
    'sha256', v_artifact.sha256,
    'byteLength', v_artifact.byte_length,
    'detectedMediaType', v_artifact.detected_media_type,
    'custodyState', v_custody_state,
    'retentionState', v_retention_state,
    'accessUntil', CASE
      WHEN v_terminal_at IS NULL THEN NULL
      ELSE v_terminal_at + INTERVAL '90 days'
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_build_request_maintenance_work_v1(
  p_contract_version INTEGER,
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cursor JSONB;
  v_cursor_work_key TEXT;
  v_items JSONB;
  v_next TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request maintenance enumeration is not allowed.';
  END IF;
  IF p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 100
    OR char_length(COALESCE(p_cursor, '')) > 600 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request maintenance query is invalid.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rqm1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY['version', 'kind', 'workKey'],
        'Request maintenance cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'maintenance'
        OR v_cursor->>'workKey' IS NULL
        OR char_length(v_cursor->>'workKey') NOT BETWEEN 38 AND 112
        OR v_cursor->>'workKey' !~
          '^((1|3|4):[0-9a-f-]{36}|(2):[0-9a-f-]{36}:[0-9a-f-]{36}:[0-9a-f-]{36}|5:[0-9a-f-]{36}:[0-9a-f-]{36})$' THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Request maintenance cursor is invalid.';
      END IF;
      v_cursor_work_key := v_cursor->>'workKey';
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Request maintenance cursor is invalid.';
    END;
  END IF;
  WITH eligible_work AS (
    SELECT
      '1:' || request_case.id::TEXT AS work_key,
      jsonb_build_object(
        'category', 'raw_text_purge',
        'requestId', request_case.id
      ) AS item
    FROM public.build_requests AS request_case
    WHERE request_case.terminal_at IS NOT NULL
      AND request_case.raw_text_purged_at IS NULL
      AND request_case.moderation_state <> 'held'
      AND request_case.terminal_at + INTERVAL '90 days' <= clock_timestamp()
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_retention_holds AS active_hold
        WHERE active_hold.request_id = request_case.id
          AND active_hold.released_at IS NULL
      )
    UNION ALL
    SELECT
      '2:' || artifact.request_id::TEXT || ':' ||
        artifact.delivery_revision_id::TEXT || ':' || artifact.id::TEXT,
      jsonb_build_object(
        'category', 'artifact_cleanup',
        'requestId', artifact.request_id,
        'deliveryRevisionId', artifact.delivery_revision_id,
        'artifactId', artifact.id
      )
    FROM public.build_request_delivery_artifacts AS artifact
    JOIN public.build_requests AS request_case
      ON request_case.id = artifact.request_id
    WHERE request_case.terminal_at IS NOT NULL
      AND request_case.terminal_at + INTERVAL '90 days' <= clock_timestamp()
      AND (
        (
          request_case.moderation_state <> 'held'
          AND NOT EXISTS (
            SELECT 1
            FROM public.build_request_retention_holds AS active_hold
            WHERE active_hold.request_id = request_case.id
              AND active_hold.released_at IS NULL
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
          WHERE cleanup_claim.request_id = artifact.request_id
            AND cleanup_claim.delivery_revision_id =
              artifact.delivery_revision_id
            AND cleanup_claim.artifact_id = artifact.id
            AND cleanup_claim.resolved_at IS NULL
            AND cleanup_claim.delete_started_at IS NOT NULL
        )
      )
      AND (
        NOT EXISTS (
          SELECT 1
          FROM public.build_request_artifact_cleanup_receipts AS cleanup_receipt
          WHERE cleanup_receipt.request_id = artifact.request_id
            AND cleanup_receipt.delivery_revision_id =
              artifact.delivery_revision_id
            AND cleanup_receipt.artifact_id = artifact.id
        )
        OR EXISTS (
          SELECT 1
          FROM storage.objects AS stored_object
          WHERE stored_object.bucket_id = 'request-build-deliveries'
            AND stored_object.name IN (
              artifact.staging_identity, artifact.object_identity
            )
        )
      )
    UNION ALL
    SELECT
      '3:' || request_case.id::TEXT,
      jsonb_build_object(
        'category', 'audit_tombstone_expiry',
        'requestId', request_case.id
      )
    FROM public.build_requests AS request_case
    WHERE request_case.terminal_at IS NOT NULL
      AND request_case.raw_text_purged_at IS NOT NULL
      AND request_case.audit_tombstone_until IS NOT NULL
      AND request_case.audit_tombstone_until <= clock_timestamp()
      AND request_case.moderation_state <> 'held'
      AND NOT private.request_publication_preservation_active_v1(
        request_case.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_retention_holds AS active_hold
        WHERE active_hold.request_id = request_case.id
          AND active_hold.released_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_artifacts AS artifact
        JOIN storage.objects AS stored_object
          ON stored_object.bucket_id = 'request-build-deliveries'
          AND stored_object.name IN (
            artifact.staging_identity, artifact.object_identity
        )
        WHERE artifact.request_id = request_case.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_artifacts AS artifact
        WHERE artifact.request_id = request_case.id
          AND NOT EXISTS (
            SELECT 1
            FROM public.build_request_artifact_cleanup_receipts
              AS cleanup_receipt
            WHERE cleanup_receipt.request_id = artifact.request_id
              AND cleanup_receipt.delivery_revision_id =
                artifact.delivery_revision_id
              AND cleanup_receipt.artifact_id = artifact.id
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
        WHERE cleanup_claim.request_id = request_case.id
          AND cleanup_claim.resolved_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_revisions AS active_workspace
        WHERE active_workspace.request_id = request_case.id
          AND active_workspace.revision_state IN (
            'staging', 'prepared', 'sealed'
          )
      )
    UNION ALL
    SELECT
      '4:' || receipt.id::TEXT,
      jsonb_build_object(
        'category', 'account_deidentification_receipt_expiry',
        'receiptId', receipt.id
      )
    FROM public.build_request_account_deidentification_receipts AS receipt
    WHERE receipt.expires_at <= clock_timestamp()
    UNION ALL
    SELECT
      '5:' || revision.request_id::TEXT || ':' || revision.id::TEXT,
      jsonb_build_object(
        'category', 'delivery_revision_retirement',
        'requestId', revision.request_id,
        'deliveryRevisionId', revision.id,
        'expectedVersion', request_case.version
      )
    FROM public.build_request_delivery_revisions AS revision
    JOIN public.build_requests AS request_case
      ON request_case.id = revision.request_id
    WHERE request_case.lifecycle_state IN ('completed', 'closed')
      AND revision.revision_state IN ('staging', 'prepared', 'sealed')
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_assignment
        WHERE active_assignment.request_id = request_case.id
          AND active_assignment.active
      )
  ),
  page AS (
    SELECT eligible_work.work_key, eligible_work.item,
      row_number() OVER (ORDER BY eligible_work.work_key) AS row_number
    FROM eligible_work
    WHERE p_cursor IS NULL
      OR eligible_work.work_key > v_cursor_work_key
    ORDER BY eligible_work.work_key
    LIMIT p_limit + 1
  )
  SELECT COALESCE(jsonb_agg(
      page.item ORDER BY page.work_key
    ) FILTER (WHERE page.row_number <= p_limit), '[]'::JSONB),
    CASE WHEN max(page.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1('rqm1', jsonb_build_object(
        'version', 1,
        'kind', 'maintenance',
        'workKey', boundary.work_key
      ))
      FROM page AS boundary
      WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM page;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_build_request_delivery_artifact_cleanup_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_delivery_revision_id UUID,
  p_artifact_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.build_requests%ROWTYPE;
  v_claim public.build_request_artifact_cleanup_claims%ROWTYPE;
  v_owner_hash TEXT;
  v_now TIMESTAMPTZ;
  v_lease_until TIMESTAMPTZ;
  v_replayed BOOLEAN := FALSE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact cleanup claim is not allowed.';
  END IF;
  IF p_request_id IS NULL
    OR p_delivery_revision_id IS NULL
    OR p_artifact_id IS NULL
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Artifact cleanup claim is invalid.';
  END IF;
  v_owner_hash := private.request_pseudonym_text_v1(
    jsonb_build_object(
      'operation', 'artifact_cleanup_claim',
      'contract', p_contract_version,
      'requestId', p_request_id,
      'deliveryRevisionId', p_delivery_revision_id,
      'artifactId', p_artifact_id,
      'idempotencyKey', p_idempotency_key
    )::TEXT
  );
  SELECT request_case.* INTO v_request
  FROM public.build_requests AS request_case
  WHERE request_case.id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Artifact cleanup custody was not found.';
  END IF;
  PERFORM 1
  FROM public.build_request_delivery_artifacts AS artifact
  WHERE artifact.request_id = p_request_id
    AND artifact.delivery_revision_id = p_delivery_revision_id
    AND artifact.id = p_artifact_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Artifact cleanup custody was not found.';
  END IF;
  SELECT unresolved.* INTO v_claim
  FROM public.build_request_artifact_cleanup_claims AS unresolved
  WHERE unresolved.request_id = p_request_id
    AND unresolved.delivery_revision_id = p_delivery_revision_id
    AND unresolved.artifact_id = p_artifact_id
    AND unresolved.resolved_at IS NULL
  FOR UPDATE;
  v_now := clock_timestamp();
  v_lease_until := v_now + INTERVAL '5 minutes';
  IF v_request.terminal_at IS NULL
    OR v_request.terminal_at + INTERVAL '90 days' > v_now
    OR (
      (NOT FOUND OR v_claim.delete_started_at IS NULL)
      AND (
        v_request.moderation_state = 'held'
        OR EXISTS (
          SELECT 1
          FROM public.build_request_retention_holds AS active_hold
          WHERE active_hold.request_id = p_request_id
            AND active_hold.released_at IS NULL
        )
      )
    )
    OR (
      EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_receipts AS cleaned
        WHERE cleaned.request_id = p_request_id
          AND cleaned.delivery_revision_id = p_delivery_revision_id
          AND cleaned.artifact_id = p_artifact_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_artifacts AS artifact
        JOIN storage.objects AS stored_object
          ON stored_object.bucket_id = 'request-build-deliveries'
          AND stored_object.name IN (
            artifact.staging_identity, artifact.object_identity
          )
        WHERE artifact.request_id = p_request_id
          AND artifact.delivery_revision_id = p_delivery_revision_id
          AND artifact.id = p_artifact_id
      )
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup is not eligible to be claimed.';
  END IF;
  IF FOUND THEN
    IF v_claim.owner_request_hash = v_owner_hash
      AND v_claim.owner_lease_until > v_now THEN
      v_replayed := TRUE;
    ELSIF v_claim.owner_request_hash <> v_owner_hash
      AND v_claim.owner_lease_until > v_now THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Artifact cleanup is already claimed.';
    ELSE
      UPDATE public.build_request_artifact_cleanup_claims AS takeover
      SET owner_request_hash = v_owner_hash,
          claim_version = takeover.claim_version + 1,
          claimed_at = v_now,
          owner_lease_until = v_lease_until
      WHERE takeover.id = v_claim.id
      RETURNING takeover.* INTO v_claim;
    END IF;
  ELSE
    INSERT INTO public.build_request_artifact_cleanup_claims (
      request_id, delivery_revision_id, artifact_id,
      owner_request_hash, claimed_at, owner_lease_until
    ) VALUES (
      p_request_id, p_delivery_revision_id, p_artifact_id,
      v_owner_hash, v_now, v_lease_until
    )
    RETURNING * INTO v_claim;
  END IF;
  RETURN jsonb_build_object(
    'cleanupClaimId', v_claim.id,
    'requestId', v_claim.request_id,
    'deliveryRevisionId', v_claim.delivery_revision_id,
    'artifactId', v_claim.artifact_id,
    'claimVersion', v_claim.claim_version,
    'leaseUntil', v_claim.owner_lease_until,
    'deletionStarted', v_claim.delete_started_at IS NOT NULL,
    'replayed', v_replayed
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_build_request_delivery_artifact_cleanup_delete_v1(
  p_contract_version INTEGER,
  p_cleanup_claim_id UUID,
  p_claim_version INTEGER,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claim public.build_request_artifact_cleanup_claims%ROWTYPE;
  v_request public.build_requests%ROWTYPE;
  v_start_hash TEXT;
  v_started_at TIMESTAMPTZ;
  v_receipt JSONB;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact cleanup deletion start is not allowed.';
  END IF;
  IF p_cleanup_claim_id IS NULL
    OR p_claim_version IS NULL
    OR p_claim_version < 1
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Artifact cleanup deletion start is invalid.';
  END IF;
  v_start_hash := private.request_pseudonym_text_v1(
    jsonb_build_object(
      'operation', 'artifact_cleanup_delete_start',
      'contract', p_contract_version,
      'cleanupClaimId', p_cleanup_claim_id,
      'claimVersion', p_claim_version,
      'idempotencyKey', p_idempotency_key
    )::TEXT
  );
  SELECT cleanup_claim.* INTO v_claim
  FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
  WHERE cleanup_claim.id = p_cleanup_claim_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Artifact cleanup claim was not found.';
  END IF;
  SELECT request_case.* INTO STRICT v_request
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_claim.request_id
  FOR UPDATE;
  SELECT cleanup_claim.* INTO STRICT v_claim
  FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
  WHERE cleanup_claim.id = p_cleanup_claim_id
  FOR UPDATE;
  v_started_at := clock_timestamp();
  IF v_claim.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim is already resolved.';
  END IF;
  IF v_claim.claim_version <> p_claim_version THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim is stale.';
  END IF;
  IF v_claim.owner_lease_until <= v_started_at THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim lease expired.';
  END IF;
  IF v_claim.delete_started_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'cleanupClaimId', v_claim.id,
      'requestId', v_claim.request_id,
      'deliveryRevisionId', v_claim.delivery_revision_id,
      'artifactId', v_claim.artifact_id,
      'claimVersion', v_claim.claim_version,
      'deleteStartedAt', v_claim.delete_started_at,
      'replayed', TRUE
    );
  END IF;
  IF v_request.terminal_at IS NULL
    OR v_request.moderation_state = 'held'
    OR v_request.terminal_at + INTERVAL '90 days' > v_started_at
    OR EXISTS (
      SELECT 1
      FROM public.build_request_retention_holds AS active_hold
      WHERE active_hold.request_id = v_claim.request_id
        AND active_hold.released_at IS NULL
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_delivery_artifacts AS artifact
      JOIN storage.objects AS stored_object
        ON stored_object.bucket_id = 'request-build-deliveries'
        AND stored_object.name IN (
          artifact.staging_identity, artifact.object_identity
        )
      WHERE artifact.request_id = v_claim.request_id
        AND artifact.delivery_revision_id = v_claim.delivery_revision_id
        AND artifact.id = v_claim.artifact_id
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup deletion cannot start.';
  END IF;
  v_receipt := jsonb_build_object(
    'cleanupClaimId', v_claim.id,
    'requestId', v_claim.request_id,
    'deliveryRevisionId', v_claim.delivery_revision_id,
    'artifactId', v_claim.artifact_id,
    'claimVersion', v_claim.claim_version,
    'deleteStartedAt', v_started_at
  );
  UPDATE public.build_request_artifact_cleanup_claims AS cleanup_claim
  SET delete_started_at = v_started_at,
      delete_start_request_hash = v_start_hash,
      delete_start_receipt = v_receipt
  WHERE cleanup_claim.id = v_claim.id;
  RETURN v_receipt || jsonb_build_object('replayed', FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_build_request_delivery_artifact_cleanup_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_delivery_revision_id UUID,
  p_artifact_id UUID,
  p_cleanup_claim_id UUID,
  p_claim_version INTEGER,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_artifact public.build_request_delivery_artifacts%ROWTYPE;
  v_request public.build_requests%ROWTYPE;
  v_claim public.build_request_artifact_cleanup_claims%ROWTYPE;
  v_prior public.build_request_artifact_cleanup_receipts%ROWTYPE;
  v_request_hash TEXT;
  v_receipt_id UUID := gen_random_uuid();
  v_cleaned_at TIMESTAMPTZ;
  v_disposition TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact cleanup confirmation is not allowed.';
  END IF;
  IF p_request_id IS NULL
    OR p_delivery_revision_id IS NULL
    OR p_artifact_id IS NULL
    OR p_cleanup_claim_id IS NULL
    OR p_claim_version IS NULL
    OR p_claim_version < 1
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Artifact cleanup confirmation is invalid.';
  END IF;
  v_request_hash := private.request_pseudonym_text_v1(
    jsonb_build_object(
      'contract', p_contract_version,
      'requestId', p_request_id,
      'deliveryRevisionId', p_delivery_revision_id,
      'artifactId', p_artifact_id,
      'cleanupClaimId', p_cleanup_claim_id,
      'claimVersion', p_claim_version
    )::TEXT
  );
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-artifact-cleanup:' || p_idempotency_key, 0
  ));
  SELECT * INTO v_prior
  FROM public.build_request_artifact_cleanup_receipts AS prior
  WHERE prior.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_request_hash
      OR v_prior.request_id <> p_request_id
      OR v_prior.delivery_revision_id <> p_delivery_revision_id
      OR v_prior.artifact_id <> p_artifact_id
      OR v_prior.cleanup_claim_id <> p_cleanup_claim_id
      OR v_prior.cleanup_claim_version <> p_claim_version THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.build_request_delivery_artifacts AS artifact
      JOIN storage.objects AS stored_object
        ON stored_object.bucket_id = 'request-build-deliveries'
        AND stored_object.name IN (
          artifact.staging_identity, artifact.object_identity
        )
      WHERE artifact.request_id = v_prior.request_id
        AND artifact.delivery_revision_id = v_prior.delivery_revision_id
        AND artifact.id = v_prior.artifact_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Confirmed artifact object exists.';
    END IF;
    RETURN jsonb_build_object(
      'cleanupReceiptId', v_prior.id,
      'requestId', v_prior.request_id,
      'deliveryRevisionId', v_prior.delivery_revision_id,
      'artifactId', v_prior.artifact_id,
      'cleanupClaimId', v_prior.cleanup_claim_id,
      'claimVersion', v_prior.cleanup_claim_version,
      'cleanupDisposition', v_prior.cleanup_disposition,
      'replayed', TRUE,
      'cleanedAt', v_prior.cleaned_at
    );
  END IF;
  SELECT request_case.* INTO STRICT v_request
  FROM public.build_requests AS request_case
  WHERE request_case.id = p_request_id
  FOR UPDATE;
  SELECT artifact.* INTO v_artifact
  FROM public.build_request_delivery_artifacts AS artifact
  WHERE artifact.request_id = p_request_id
    AND artifact.delivery_revision_id = p_delivery_revision_id
    AND artifact.id = p_artifact_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Artifact cleanup custody was not found.';
  END IF;
  SELECT cleanup_claim.* INTO v_claim
  FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
  WHERE cleanup_claim.request_id = p_request_id
    AND cleanup_claim.delivery_revision_id = p_delivery_revision_id
    AND cleanup_claim.artifact_id = p_artifact_id
    AND cleanup_claim.id = p_cleanup_claim_id
  FOR UPDATE;
  IF NOT FOUND OR v_claim.claim_version <> p_claim_version THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim is stale.';
  END IF;
  IF v_claim.resolved_at IS NOT NULL THEN
    IF v_claim.resolution = 'confirmed_removed'
      AND v_claim.resolution_request_hash = v_request_hash THEN
      IF EXISTS (
        SELECT 1
        FROM storage.objects AS stored_object
        WHERE stored_object.bucket_id = 'request-build-deliveries'
          AND stored_object.name IN (
            v_artifact.staging_identity, v_artifact.object_identity
          )
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '55000',
          MESSAGE = 'Confirmed artifact object exists.';
      END IF;
      RETURN v_claim.resolution_receipt ||
        jsonb_build_object('replayed', TRUE);
    END IF;
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim is already resolved.';
  END IF;
  v_cleaned_at := clock_timestamp();
  IF v_claim.owner_lease_until <= v_cleaned_at THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim lease expired.';
  END IF;
  IF v_request.terminal_at IS NULL
    OR v_request.terminal_at + INTERVAL '90 days' > v_cleaned_at
    OR (
      v_claim.delete_started_at IS NULL
      AND (
        v_request.moderation_state = 'held'
        OR EXISTS (
          SELECT 1
          FROM public.build_request_retention_holds AS active_hold
          WHERE active_hold.request_id = p_request_id
            AND active_hold.released_at IS NULL
        )
      )
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup is not eligible for confirmation.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM storage.objects AS stored_object
    WHERE stored_object.bucket_id = 'request-build-deliveries'
      AND stored_object.name IN (
        v_artifact.staging_identity, v_artifact.object_identity
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact object still exists.';
  END IF;
  v_disposition := CASE
    WHEN v_claim.delete_started_at IS NULL THEN 'preexisting_missing'
    ELSE 'worker_removed'
  END;
  SELECT cleanup_receipt.* INTO v_prior
  FROM public.build_request_artifact_cleanup_receipts AS cleanup_receipt
  WHERE cleanup_receipt.cleanup_claim_id = p_cleanup_claim_id
    AND cleanup_receipt.cleanup_claim_version = p_claim_version;
  IF FOUND THEN
    UPDATE public.build_request_artifact_cleanup_claims AS cleanup_claim
    SET resolved_at = v_cleaned_at,
        resolution = 'confirmed_removed',
        resolution_request_hash = v_request_hash,
        resolution_receipt = jsonb_build_object(
          'cleanupReceiptId', v_prior.id,
          'requestId', p_request_id,
          'deliveryRevisionId', p_delivery_revision_id,
          'artifactId', p_artifact_id,
          'cleanupClaimId', p_cleanup_claim_id,
          'claimVersion', p_claim_version,
          'cleanupDisposition', v_prior.cleanup_disposition,
          'cleanedAt', v_prior.cleaned_at
        )
    WHERE cleanup_claim.id = p_cleanup_claim_id;
    RETURN jsonb_build_object(
      'cleanupReceiptId', v_prior.id,
      'requestId', p_request_id,
      'deliveryRevisionId', p_delivery_revision_id,
      'artifactId', p_artifact_id,
      'cleanupClaimId', p_cleanup_claim_id,
      'claimVersion', p_claim_version,
      'cleanupDisposition', v_prior.cleanup_disposition,
      'replayed', TRUE,
      'cleanedAt', v_prior.cleaned_at
    );
  END IF;
  INSERT INTO public.build_request_artifact_cleanup_receipts (
    id, idempotency_key, request_hash, request_id,
    delivery_revision_id, artifact_id, cleanup_claim_id,
    cleanup_claim_version, cleanup_disposition, cleaned_at
  ) VALUES (
    v_receipt_id, p_idempotency_key, v_request_hash, p_request_id,
    p_delivery_revision_id, p_artifact_id, p_cleanup_claim_id,
    p_claim_version, v_disposition, v_cleaned_at
  );
  UPDATE public.build_request_artifact_cleanup_claims AS cleanup_claim
  SET resolved_at = v_cleaned_at,
      resolution = 'confirmed_removed',
      resolution_request_hash = v_request_hash,
      resolution_receipt = jsonb_build_object(
        'cleanupReceiptId', v_receipt_id,
        'requestId', p_request_id,
        'deliveryRevisionId', p_delivery_revision_id,
        'artifactId', p_artifact_id,
        'cleanupClaimId', p_cleanup_claim_id,
        'claimVersion', p_claim_version,
        'cleanupDisposition', v_disposition,
        'cleanedAt', v_cleaned_at
      )
  WHERE cleanup_claim.id = p_cleanup_claim_id;
  RETURN jsonb_build_object(
    'cleanupReceiptId', v_receipt_id,
    'requestId', p_request_id,
    'deliveryRevisionId', p_delivery_revision_id,
    'artifactId', p_artifact_id,
    'cleanupClaimId', p_cleanup_claim_id,
    'claimVersion', p_claim_version,
    'cleanupDisposition', v_disposition,
    'replayed', FALSE,
    'cleanedAt', v_cleaned_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.abort_build_request_delivery_artifact_cleanup_v1(
  p_contract_version INTEGER,
  p_cleanup_claim_id UUID,
  p_claim_version INTEGER,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claim public.build_request_artifact_cleanup_claims%ROWTYPE;
  v_resolution_hash TEXT;
  v_now TIMESTAMPTZ;
  v_receipt JSONB;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact cleanup abort is not allowed.';
  END IF;
  IF p_cleanup_claim_id IS NULL
    OR p_claim_version IS NULL
    OR p_claim_version < 1
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Artifact cleanup abort is invalid.';
  END IF;
  v_resolution_hash := private.request_pseudonym_text_v1(
    jsonb_build_object(
      'operation', 'artifact_cleanup_abort',
      'contract', p_contract_version,
      'cleanupClaimId', p_cleanup_claim_id,
      'claimVersion', p_claim_version,
      'idempotencyKey', p_idempotency_key
    )::TEXT
  );
  SELECT cleanup_claim.* INTO v_claim
  FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
  WHERE cleanup_claim.id = p_cleanup_claim_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Artifact cleanup claim was not found.';
  END IF;
  PERFORM 1
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_claim.request_id
  FOR UPDATE;
  SELECT cleanup_claim.* INTO STRICT v_claim
  FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
  WHERE cleanup_claim.id = p_cleanup_claim_id
  FOR UPDATE;
  IF v_claim.resolved_at IS NOT NULL THEN
    IF v_claim.resolution = 'aborted_object_present'
      AND v_claim.resolution_request_hash = v_resolution_hash THEN
      RETURN v_claim.resolution_receipt ||
        jsonb_build_object('replayed', TRUE);
    END IF;
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim is already resolved.';
  END IF;
  IF v_claim.claim_version <> p_claim_version THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim is stale.';
  END IF;
  IF v_claim.delete_started_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim cannot be aborted after deletion starts.';
  END IF;
  v_now := clock_timestamp();
  IF v_claim.owner_lease_until <= v_now THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim lease expired.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.build_request_delivery_artifacts AS artifact
    JOIN storage.objects AS stored_object
      ON stored_object.bucket_id = 'request-build-deliveries'
      AND stored_object.name IN (
        artifact.staging_identity, artifact.object_identity
      )
    WHERE artifact.request_id = v_claim.request_id
      AND artifact.delivery_revision_id = v_claim.delivery_revision_id
      AND artifact.id = v_claim.artifact_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Artifact cleanup claim cannot be aborted after object removal.';
  END IF;
  v_receipt := jsonb_build_object(
    'cleanupClaimId', v_claim.id,
    'requestId', v_claim.request_id,
    'deliveryRevisionId', v_claim.delivery_revision_id,
    'artifactId', v_claim.artifact_id,
    'claimVersion', v_claim.claim_version,
    'abortedAt', v_now
  );
  UPDATE public.build_request_artifact_cleanup_claims AS cleanup_claim
  SET resolved_at = v_now,
      resolution = 'aborted_object_present',
      resolution_request_hash = v_resolution_hash,
      resolution_receipt = v_receipt
  WHERE cleanup_claim.id = v_claim.id;
  RETURN v_receipt || jsonb_build_object('replayed', FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_build_request_raw_text_v1(
  p_contract_version INTEGER,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_terminal_at TIMESTAMPTZ;
  v_purged_at TIMESTAMPTZ := clock_timestamp();
  v_existing TIMESTAMPTZ;
  v_moderation_state TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request raw-text purge is not allowed.';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request raw-text purge is invalid.';
  END IF;
  SELECT request_case.terminal_at, request_case.raw_text_purged_at,
    request_case.moderation_state
  INTO v_terminal_at, v_existing, v_moderation_state
  FROM public.build_requests AS request_case
  WHERE request_case.id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Request was not found.';
  END IF;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'requestId', p_request_id, 'purgedAt', v_existing,
      'auditTombstoneUntil', v_terminal_at + INTERVAL '400 days',
      'replayed', TRUE
    );
  END IF;
  IF v_terminal_at IS NULL
    OR v_moderation_state = 'held'
    OR v_terminal_at + INTERVAL '90 days' > v_purged_at
    OR EXISTS (
      SELECT 1 FROM public.build_request_retention_holds AS active_hold
      WHERE active_hold.request_id = p_request_id
        AND active_hold.released_at IS NULL
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'Request raw text is not eligible for purge.';
  END IF;
  PERFORM set_config('request_authority.raw_purge', 'on', TRUE);
  UPDATE public.build_request_brief_revisions
  SET title = '[purged request title]',
      outcome = '[purged request outcome text]',
      intended_user = '[purged]',
      must_work_scenario = '[purged request scenario]',
      constraints = '[purged]',
      pathforge_reference = NULL
  WHERE request_id = p_request_id;
  UPDATE public.build_request_acceptance_checks
  SET check_text = '[purged acceptance check ' || ordinal::TEXT || ']'
  WHERE request_id = p_request_id;
  UPDATE public.build_request_clarifications
  SET question = '[purged clarification]',
      answer = CASE WHEN answer IS NULL THEN NULL ELSE '[purged answer]' END
  WHERE request_id = p_request_id;
  UPDATE public.build_request_accepted_clarification_sets
  SET accepted_clarifications = COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'clarificationId', accepted_item.value->>'clarificationId',
      'sequence', (accepted_item.value->>'sequence')::INTEGER,
      'question', '[purged clarification]',
      'answer', '[purged answer]'
    ) ORDER BY accepted_item.position)
    FROM jsonb_array_elements(accepted_clarifications)
      WITH ORDINALITY AS accepted_item(value, position)
  ), '[]'::JSONB),
      accepted_clarifications_redacted = TRUE,
      accepted_clarifications_redacted_at = v_purged_at
  WHERE request_id = p_request_id
    AND NOT accepted_clarifications_redacted;
  UPDATE public.build_request_delivery_revisions
  SET revision_label = CASE WHEN revision_label IS NULL THEN NULL ELSE '[purged]' END,
      summary = CASE WHEN summary IS NULL THEN NULL ELSE '[purged]' END
  WHERE request_id = p_request_id;
  UPDATE public.build_request_builder_evidence
  SET evidence_text = CASE WHEN evidence_text IS NULL THEN NULL ELSE '[purged]' END,
      evidence_ref = CASE WHEN evidence_ref IS NULL THEN NULL ELSE 'purged' END
  WHERE request_id = p_request_id;
  UPDATE public.build_request_delivery_reviews
  SET reason = CASE WHEN reason IS NULL THEN NULL ELSE '[purged review reason]' END,
      review_notes = CASE WHEN review_notes IS NULL THEN NULL ELSE '[purged]' END,
      repair_instructions = CASE
        WHEN repair_instructions IS NULL THEN NULL
        ELSE '[purged repair instructions]'
      END
  WHERE request_id = p_request_id;
  UPDATE public.build_request_delivery_review_checks
  SET evidence_ref = CASE WHEN evidence_ref IS NULL THEN NULL ELSE 'purged' END
  WHERE request_id = p_request_id;
  UPDATE public.build_request_requester_outcomes
  SET reason = NULL
  WHERE request_id = p_request_id
    AND reason IS NOT NULL;
  UPDATE public.build_request_delivery_artifacts
  SET client_file_id = 'purged-artifact-' || artifact_ordinal::TEXT,
      normalized_name = 'purged-artifact-' || artifact_ordinal::TEXT
  WHERE request_id = p_request_id;
  UPDATE public.build_request_events
  SET redactable_reason = NULL
  WHERE request_id = p_request_id
    AND redactable_reason IS NOT NULL;
  UPDATE public.build_request_retention_holds
  SET reason = '[purged retention reason]',
      release_resolution = CASE
        WHEN release_resolution IS NULL THEN NULL ELSE '[purged resolution]'
      END
  WHERE request_id = p_request_id;
  UPDATE public.build_request_delivery_seals
  SET canonical_manifest = NULL,
      canonical_manifest_redacted = TRUE,
      canonical_manifest_redacted_at = v_purged_at
  WHERE request_id = p_request_id
    AND NOT canonical_manifest_redacted;
  UPDATE public.build_requests
  SET close_explanation = CASE close_reason
        WHEN 'existing_resolution'
          THEN 'Closed because an existing PathForge resolution was recorded.'
        WHEN 'duplicate'
          THEN 'Closed because this request duplicates an existing request.'
        WHEN 'out_of_scope'
          THEN 'Closed because this request is outside the pilot scope.'
        WHEN 'capacity_unavailable'
          THEN 'Closed because pilot capacity was unavailable.'
        WHEN 'declined'
          THEN 'Closed because the request was declined.'
        WHEN 'failed_review'
          THEN 'Closed after the delivery review limit was reached.'
        WHEN 'withdrawn'
          THEN 'Closed after the request was withdrawn.'
        WHEN 'expired'
          THEN 'Closed after the clarification response window expired.'
        ELSE NULL
      END,
      raw_text_purged_at = v_purged_at,
      audit_tombstone_until = v_terminal_at + INTERVAL '400 days'
  WHERE id = p_request_id;
  RETURN jsonb_build_object(
    'requestId', p_request_id, 'purgedAt', v_purged_at,
    'auditTombstoneUntil', v_terminal_at + INTERVAL '400 days',
    'replayed', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_build_request_audit_tombstone_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_request public.build_requests%ROWTYPE;
  v_prior public.build_request_audit_cleanup_receipts%ROWTYPE;
  v_request_digest TEXT;
  v_request_hash TEXT;
  v_event_count INTEGER;
  v_event_aggregate_digest TEXT;
  v_manifest_digests JSONB;
  v_aggregate_digest TEXT;
  v_aggregate_payload JSONB;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request audit tombstone expiry is not allowed.';
  END IF;
  IF p_request_id IS NULL
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request audit tombstone expiry is invalid.';
  END IF;
  v_request_digest := private.request_pseudonym_text_v1(p_request_id::TEXT);
  v_request_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'contract', p_contract_version,
    'requestDigest', v_request_digest
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-audit-expiry:' || p_idempotency_key, 0
  ));
  SELECT * INTO v_prior
  FROM public.build_request_audit_cleanup_receipts AS prior
  WHERE prior.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_request_hash
      OR v_prior.request_digest <> v_request_digest THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'contractVersion', 1,
      'requestId', p_request_id,
      'cleaned', v_prior.cleaned,
      'replayed', TRUE,
      'aggregateDigest', v_prior.aggregate_digest,
      'occurredAt', v_prior.occurred_at
    );
  END IF;
  SELECT * INTO v_request
  FROM public.build_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    SELECT tombstone.aggregate_digest
    INTO v_aggregate_digest
    FROM public.build_request_audit_tombstones AS tombstone
    WHERE tombstone.request_digest = v_request_digest;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002',
        MESSAGE = 'Request audit tombstone was not found.';
    END IF;
    INSERT INTO public.build_request_audit_cleanup_receipts (
      idempotency_key, request_digest, request_hash, cleaned,
      aggregate_digest, occurred_at
    ) VALUES (
      p_idempotency_key, v_request_digest, v_request_hash, FALSE,
      v_aggregate_digest, v_now
    );
    RETURN jsonb_build_object(
      'contractVersion', 1,
      'requestId', p_request_id,
      'cleaned', FALSE,
      'replayed', FALSE,
      'aggregateDigest', v_aggregate_digest,
      'occurredAt', v_now
    );
  END IF;
  SELECT count(*)::INTEGER,
    encode(extensions.digest(convert_to(COALESCE(string_agg(
      event_value.event_digest, '' ORDER BY event_value.sequence
    ), ''), 'UTF8'), 'sha256'), 'hex')
  INTO v_event_count, v_event_aggregate_digest
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = p_request_id;
  SELECT COALESCE(jsonb_agg(
    revision.artifact_manifest_digest ORDER BY revision.revision_number
  ) FILTER (
    WHERE revision.artifact_manifest_digest IS NOT NULL
  ), '[]'::JSONB)
  INTO v_manifest_digests
  FROM public.build_request_delivery_revisions AS revision
  WHERE revision.request_id = p_request_id;
  v_aggregate_payload := jsonb_build_object(
    'requestDigest', v_request_digest,
    'lifecycleState', v_request.lifecycle_state,
    'moderationState', v_request.moderation_state,
    'publicationState', v_request.publication_state,
    'closeReason', v_request.close_reason,
    'terminalAt', v_request.terminal_at,
    'eventCount', v_event_count,
    'eventAggregateDigest', v_event_aggregate_digest,
    'manifestDigests', v_manifest_digests
  );
  v_aggregate_digest := encode(extensions.digest(
    convert_to(v_aggregate_payload::TEXT, 'UTF8'), 'sha256'
  ), 'hex');
  IF v_request.terminal_at IS NULL
    OR v_request.raw_text_purged_at IS NULL
    OR v_request.audit_tombstone_until IS NULL
    OR v_request.audit_tombstone_until > v_now
    OR v_request.moderation_state = 'held'
    OR private.request_publication_preservation_active_v1(p_request_id)
    OR EXISTS (
      SELECT 1
      FROM public.build_request_retention_holds AS active_hold
      WHERE active_hold.request_id = p_request_id
        AND active_hold.released_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_delivery_artifacts AS artifact
      JOIN storage.objects AS stored_object
        ON stored_object.bucket_id = 'request-build-deliveries'
        AND stored_object.name IN (
          artifact.staging_identity, artifact.object_identity
      )
      WHERE artifact.request_id = p_request_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
      WHERE cleanup_claim.request_id = p_request_id
        AND cleanup_claim.resolved_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.build_request_delivery_revisions AS active_workspace
      WHERE active_workspace.request_id = p_request_id
        AND active_workspace.revision_state IN (
          'staging', 'prepared', 'sealed'
        )
    ) THEN
    RETURN jsonb_build_object(
      'contractVersion', 1,
      'requestId', p_request_id,
      'cleaned', FALSE,
      'replayed', FALSE,
      'aggregateDigest', v_aggregate_digest,
      'occurredAt', v_now
    );
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_delivery_artifacts AS artifact
    WHERE artifact.request_id = p_request_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_receipts AS cleanup_receipt
        WHERE cleanup_receipt.request_id = artifact.request_id
          AND cleanup_receipt.delivery_revision_id =
            artifact.delivery_revision_id
          AND cleanup_receipt.artifact_id = artifact.id
      )
  ) THEN
    RETURN jsonb_build_object(
      'contractVersion', 1,
      'requestId', p_request_id,
      'cleaned', FALSE,
      'replayed', FALSE,
      'aggregateDigest', v_aggregate_digest,
      'occurredAt', v_now
    );
  END IF;
  INSERT INTO public.build_request_audit_tombstones (
    request_digest, lifecycle_state, moderation_state, publication_state,
    close_reason, terminal_at, event_count, event_aggregate_digest,
    manifest_digests, aggregate_digest, occurred_at
  ) VALUES (
    v_request_digest, v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason,
    v_request.terminal_at, v_event_count, v_event_aggregate_digest,
    v_manifest_digests, v_aggregate_digest, v_now
  )
  ON CONFLICT (request_digest) DO NOTHING;
  INSERT INTO public.build_request_audit_cleanup_receipts (
    idempotency_key, request_digest, request_hash, cleaned,
    aggregate_digest, occurred_at
  ) VALUES (
    p_idempotency_key, v_request_digest, v_request_hash, TRUE,
    v_aggregate_digest, v_now
  );
  PERFORM set_config(
    'request_authority.audit_cleanup_request_id',
    p_request_id::TEXT,
    TRUE
  );
  PERFORM set_config(
    'request_authority.audit_cleanup_request_digest',
    v_request_digest,
    TRUE
  );
  PERFORM set_config('request_authority.audit_cleanup', 'on', TRUE);
  DELETE FROM public.build_requests
  WHERE id = p_request_id;
  RETURN jsonb_build_object(
    'contractVersion', 1,
    'requestId', p_request_id,
    'cleaned', TRUE,
    'replayed', FALSE,
    'aggregateDigest', v_aggregate_digest,
    'occurredAt', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_build_request_audit_tombstone_v1(
  INTEGER, UUID, TEXT
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_build_request_audit_tombstone_v1(
  INTEGER, UUID, TEXT
) TO service_role;

CREATE OR REPLACE FUNCTION public.seal_build_request_delivery_revision_v1(
  p_contract_version INTEGER,
  p_idempotency_key TEXT,
  p_request_id UUID,
  p_delivery_revision_id UUID,
  p_prepare_receipt_id UUID,
  p_artifacts JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hash TEXT;
  v_prior public.build_request_delivery_seals%ROWTYPE;
  v_revision public.build_request_delivery_revisions%ROWTYPE;
  v_manifest JSONB;
  v_accepted_clarifications JSONB;
  v_accepted_clarification_digest TEXT;
  v_accepted_scope public.build_request_accepted_clarification_sets%ROWTYPE;
  v_digest TEXT;
  v_count INTEGER;
  v_total BIGINT;
  v_min_ordinal INTEGER;
  v_max_ordinal INTEGER;
  v_event_id UUID := gen_random_uuid();
  v_sequence INTEGER;
  v_sealed_at TIMESTAMPTZ := clock_timestamp();
  v_seal_id UUID := gen_random_uuid();
  v_item JSONB;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Delivery sealing is not allowed.';
  END IF;
  IF p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_request_id IS NULL
    OR p_delivery_revision_id IS NULL
    OR p_prepare_receipt_id IS NULL
    OR p_artifacts IS NULL
    OR jsonb_typeof(p_artifacts) <> 'array'
    OR jsonb_array_length(p_artifacts) NOT BETWEEN 1 AND 5
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_artifacts) WITH ORDINALITY
        AS supplied(value, position)
      WHERE jsonb_typeof(supplied.value) <> 'object'
        OR EXISTS (
          SELECT 1
          FROM jsonb_object_keys(supplied.value) AS supplied_key(key_name)
          WHERE supplied_key.key_name NOT IN ('artifact_ordinal', 'artifact_id')
        )
        OR (supplied.value->>'artifact_ordinal')::INTEGER <> supplied.position
        OR (supplied.value->>'artifact_ordinal')::INTEGER NOT BETWEEN 1 AND 5
        OR (supplied.value->>'artifact_id')::UUID IS NULL
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Delivery seal artifact bindings are invalid.';
  END IF;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'request', p_request_id, 'revision', p_delivery_revision_id,
    'prepare_receipt', p_prepare_receipt_id,
    'artifacts', p_artifacts
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended('delivery-seal:' || p_idempotency_key, 0));
  SELECT prior.* INTO v_prior
  FROM public.build_request_delivery_seals AS prior
  WHERE prior.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_artifacts)
    LOOP
      PERFORM public.resolve_build_request_delivery_artifact_custody_v1(
        p_contract_version,
        p_request_id,
        p_delivery_revision_id,
        (v_item->>'artifact_id')::UUID
      );
    END LOOP;
    IF jsonb_array_length(p_artifacts) <> v_prior.artifact_count THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery seal replay custody is invalid.';
    END IF;
    RETURN jsonb_build_object(
      'sealReceiptId', v_prior.id, 'deliveryRevisionId', v_prior.delivery_revision_id,
      'requestId', v_prior.request_id,
      'manifestDigest', v_prior.manifest_digest,
      'manifestContractVersion', v_prior.manifest_contract_version,
      'policyVersion', v_prior.policy_version,
      'artifactCount', v_prior.artifact_count, 'totalBytes', v_prior.total_bytes,
      'replayed', TRUE, 'sealedAt', v_prior.sealed_at
    );
  END IF;
  SELECT revision.* INTO v_revision
  FROM public.build_request_delivery_revisions AS revision
  JOIN public.build_requests AS request_case
    ON request_case.id = revision.request_id
  JOIN public.build_request_command_receipts AS prepare_receipt
    ON prepare_receipt.id = p_prepare_receipt_id
  WHERE revision.id = p_delivery_revision_id
    AND revision.request_id = p_request_id
    AND revision.revision_state = 'prepared'
    AND request_case.moderation_state = 'clear'
    AND request_case.lifecycle_state IN ('building', 'repair_required')
    AND request_case.current_brief_revision_id =
      revision.accepted_brief_revision_id
    AND prepare_receipt.request_id = revision.request_id
    AND prepare_receipt.command_kind = 'prepare_delivery_revision'
    AND prepare_receipt.receipt->'authority_result'->>'deliveryRevisionId' = revision.id::TEXT
  FOR UPDATE OF revision, request_case;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Prepared delivery revision binding failed.';
  END IF;
  SELECT accepted_scope.*
  INTO v_accepted_scope
  FROM public.build_request_accepted_clarification_sets AS accepted_scope
  WHERE accepted_scope.request_id = v_revision.request_id
    AND accepted_scope.brief_revision_id =
      v_revision.accepted_brief_revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Accepted clarification provenance is missing.';
  END IF;
  IF v_accepted_scope.accepted_clarifications_redacted THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Accepted clarification provenance has been redacted.';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'clarificationId', clarification.id,
    'sequence', clarification.sequence,
    'question', clarification.question,
    'answer', clarification.answer
  ) ORDER BY clarification.sequence, clarification.id), '[]'::JSONB)
  INTO v_accepted_clarifications
  FROM public.build_request_clarifications AS clarification
  WHERE clarification.request_id = v_revision.request_id;
  v_accepted_clarification_digest := encode(extensions.digest(convert_to(
    private.request_canonical_json_v1(v_accepted_clarifications),
    'UTF8'
  ), 'sha256'), 'hex');
  IF jsonb_array_length(v_accepted_clarifications)
      <> v_accepted_scope.accepted_clarification_count
    OR v_accepted_clarifications IS DISTINCT FROM
      v_accepted_scope.accepted_clarifications
    OR v_accepted_clarification_digest IS DISTINCT FROM
      v_accepted_scope.accepted_clarification_digest
    OR EXISTS (
      SELECT 1
      FROM public.build_request_clarifications AS clarification
      WHERE clarification.request_id = v_revision.request_id
        AND (
          clarification.answer IS NULL
          OR clarification.answered_at IS NULL
          OR clarification.requested_at >
            v_accepted_scope.clarification_acceptance_cutoff
          OR clarification.answered_at >
            v_accepted_scope.clarification_acceptance_cutoff
        )
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_accepted_clarifications)
        WITH ORDINALITY AS accepted(value, position)
      WHERE (accepted.value->>'sequence')::INTEGER <> accepted.position
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Accepted clarification provenance does not match.';
  END IF;
  PERFORM 1
  FROM public.build_request_delivery_artifacts AS artifact
  WHERE artifact.delivery_revision_id = v_revision.id
    AND artifact.abandoned_at IS NULL
  ORDER BY artifact.artifact_ordinal
  FOR UPDATE;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_delivery_artifacts AS artifact
    WHERE artifact.delivery_revision_id = v_revision.id
      AND artifact.abandoned_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_artifacts) AS supplied(value)
        WHERE (supplied.value->>'artifact_ordinal')::INTEGER = artifact.artifact_ordinal
          AND (supplied.value->>'artifact_id')::UUID = artifact.id
      )
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_artifacts) AS supplied(value)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.build_request_delivery_artifacts AS artifact
      WHERE artifact.delivery_revision_id = v_revision.id
        AND artifact.abandoned_at IS NULL
        AND artifact.artifact_ordinal =
          (supplied.value->>'artifact_ordinal')::INTEGER
        AND artifact.id = (supplied.value->>'artifact_id')::UUID
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Delivery seal artifact bindings do not match the revision.';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_artifacts)
  LOOP
    PERFORM public.resolve_build_request_delivery_artifact_custody_v1(
      p_contract_version,
      p_request_id,
      p_delivery_revision_id,
      (v_item->>'artifact_id')::UUID
    );
  END LOOP;
  SELECT count(*), COALESCE(sum(artifact.byte_length), 0),
    min(artifact.artifact_ordinal), max(artifact.artifact_ordinal)
  INTO v_count, v_total, v_min_ordinal, v_max_ordinal
  FROM public.build_request_delivery_artifacts AS artifact
  WHERE artifact.delivery_revision_id = v_revision.id
    AND artifact.abandoned_at IS NULL;
  IF v_count NOT BETWEEN 1 AND 5 OR v_total > 12000000
    OR v_min_ordinal <> 1 OR v_max_ordinal <> v_count
    OR EXISTS (
      SELECT 1 FROM public.build_request_delivery_artifacts AS artifact
      WHERE artifact.delivery_revision_id = v_revision.id
        AND artifact.abandoned_at IS NULL
        AND (
          artifact.integrity_status <> 'verified'
          OR artifact.scan_verdict <> 'clean'
          OR artifact.object_identity IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM public.build_request_artifact_attestations AS attestation
            WHERE attestation.artifact_id = artifact.id
              AND attestation.scan_verdict = 'clean'
          )
        )
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Delivery artifact set is not sealable.';
  END IF;
  v_manifest := jsonb_build_object(
    'version', 'request-delivery-manifest-v1',
    'policyVersion', 'request-delivery-passive-v1',
    'requestId', p_request_id,
    'deliveryRevisionId', v_revision.id,
    'acceptedBriefRevisionId', v_revision.accepted_brief_revision_id,
    'acceptedBrief', (
      SELECT jsonb_build_object(
        'title', brief.title,
        'outcome', brief.outcome,
        'intendedUser', brief.intended_user,
        'mustWorkScenario', brief.must_work_scenario,
        'constraints', brief.constraints,
        'pathforgeReference', CASE
          WHEN brief.pathforge_reference IS NULL THEN NULL
          WHEN brief.pathforge_reference->>'kind' = 'project' THEN
            jsonb_build_object(
              'kind', 'project',
              'projectId', brief.pathforge_reference->>'project_id'
            )
          ELSE jsonb_build_object(
            'kind', 'response',
            'projectId', brief.pathforge_reference->>'project_id',
            'modelVariantId',
              brief.pathforge_reference->>'model_variant_id',
            'responseStepNumber',
              (brief.pathforge_reference->>'response_step_number')::INTEGER
          )
        END,
        'acceptanceChecks', (
          SELECT jsonb_agg(jsonb_build_object(
            'acceptanceCheckId', acceptance_check.id,
            'ordinal', acceptance_check.ordinal,
            'text', acceptance_check.check_text
          ) ORDER BY acceptance_check.ordinal, acceptance_check.id)
          FROM public.build_request_acceptance_checks AS acceptance_check
          WHERE acceptance_check.brief_revision_id = brief.id
        )
      )
      FROM public.build_request_brief_revisions AS brief
      WHERE brief.id = v_revision.accepted_brief_revision_id
        AND brief.request_id = v_revision.request_id
    ),
    'acceptedClarifications', v_accepted_clarifications,
    'acceptedClarificationCount',
      v_accepted_scope.accepted_clarification_count,
    'acceptedClarificationDigest',
      v_accepted_scope.accepted_clarification_digest,
    'clarificationAcceptanceCutoff',
      v_accepted_scope.clarification_acceptance_cutoff,
    'builderAssignmentId', v_revision.builder_assignment_id,
    'revisionLabel', v_revision.revision_label,
    'summary', v_revision.summary,
    'approvedPathForgeReference', CASE
      WHEN v_revision.approved_pathforge_reference IS NULL THEN NULL
      WHEN v_revision.approved_pathforge_reference->>'kind' = 'project' THEN
        jsonb_build_object(
          'kind', 'project',
          'projectId', v_revision.approved_pathforge_reference->>'project_id'
        )
      ELSE jsonb_build_object(
        'kind', 'response',
        'projectId', v_revision.approved_pathforge_reference->>'project_id',
        'modelVariantId', v_revision.approved_pathforge_reference->>'model_variant_id',
        'responseStepNumber',
          (v_revision.approved_pathforge_reference->>'response_step_number')::INTEGER
      )
    END,
    'evidenceChecklistVersion', 1,
    'artifactCount', v_count,
    'totalBytes', v_total,
    'rightsSnapshot', jsonb_build_object(
      'version', 'request-rights-v1',
      'builderIsAuthor', TRUE,
      'requesterRights', jsonb_build_array(
        'non_exclusive_use', 'download'
      ),
      'confidential', FALSE,
      'exclusive', FALSE,
      'workForHire', FALSE
    ),
    'artifacts', (
      SELECT jsonb_agg(jsonb_build_object(
        'artifactOrdinal', artifact.artifact_ordinal,
        'artifactId', artifact.id,
        'safeName', artifact.normalized_name,
        'byteLength', artifact.byte_length,
        'sha256', artifact.sha256,
        'mediaType', artifact.detected_media_type
      ) ORDER BY artifact.artifact_ordinal)
      FROM public.build_request_delivery_artifacts AS artifact
      WHERE artifact.delivery_revision_id = v_revision.id
        AND artifact.abandoned_at IS NULL
    ),
    'builderEvidence', (
      SELECT jsonb_agg(jsonb_build_object(
        'acceptanceCheckId', evidence.acceptance_check_id,
        'result', evidence.result,
        'evidenceText', evidence.evidence_text,
        'evidenceRef', evidence.evidence_ref
      ) ORDER BY accepted_check.ordinal, accepted_check.id)
      FROM public.build_request_builder_evidence AS evidence
      JOIN public.build_request_acceptance_checks AS accepted_check
        ON accepted_check.id = evidence.acceptance_check_id
      WHERE evidence.delivery_revision_id = v_revision.id
    )
  );
  v_digest := encode(extensions.digest(convert_to(
    private.request_canonical_json_v1(v_manifest), 'UTF8'
  ), 'sha256'), 'hex');
  SELECT COALESCE(max(event_value.sequence) + 1, 1) INTO v_sequence
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = p_request_id;
  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, safe_metadata, occurred_at
  ) VALUES (
    v_event_id, p_request_id, v_sequence, 'delivery_revision_sealed', 'system',
    (SELECT lifecycle_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT moderation_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT publication_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT close_reason FROM public.build_requests WHERE id = p_request_id),
    (SELECT lifecycle_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT moderation_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT publication_state FROM public.build_requests WHERE id = p_request_id),
    (SELECT close_reason FROM public.build_requests WHERE id = p_request_id),
    (SELECT version FROM public.build_requests WHERE id = p_request_id),
    p_idempotency_key, v_seal_id,
    jsonb_build_object(
      'delivery_revision_id', v_revision.id,
      'manifest_digest', v_digest,
      'artifact_count', v_count,
      'total_bytes', v_total
    ), v_sealed_at
  );
  INSERT INTO public.build_request_delivery_seals (
    id, idempotency_key, request_hash, request_id, delivery_revision_id,
    prepare_receipt_id, manifest_contract_version, policy_version,
    canonical_manifest, manifest_digest, artifact_count, total_bytes,
    event_id, sealed_at
  ) VALUES (
    v_seal_id, p_idempotency_key, v_hash, p_request_id, v_revision.id,
    p_prepare_receipt_id, 'request-delivery-manifest-v1',
    'request-delivery-passive-v1', v_manifest,
    v_digest, v_count, v_total, v_event_id, v_sealed_at
  );
  UPDATE public.build_request_delivery_revisions AS sealed_revision
  SET revision_state = 'sealed', seal_receipt_id = v_seal_id,
      artifact_manifest_digest = v_digest,
      artifact_count = v_count, total_bytes = v_total,
      evidence_checklist_version = 1, rights_snapshot_version = 1
  WHERE sealed_revision.id = v_revision.id;
  RETURN jsonb_build_object(
    'sealReceiptId', v_seal_id, 'requestId', p_request_id,
    'deliveryRevisionId', v_revision.id,
    'manifestDigest', v_digest,
    'manifestContractVersion', 'request-delivery-manifest-v1',
    'policyVersion', 'request-delivery-passive-v1',
    'artifactCount', v_count, 'totalBytes', v_total,
    'replayed', FALSE, 'sealedAt', v_sealed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION
  public.prepare_build_request_delivery_artifact_object_v1(
    INTEGER, UUID, UUID, UUID, UUID
  ),
  public.attest_build_request_delivery_artifact_object_v1(
    INTEGER, TEXT, INTEGER, UUID, UUID, UUID, UUID, UUID, INTEGER,
    UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT
  ),
  public.resolve_build_request_delivery_artifact_custody_v1(
    INTEGER, UUID, UUID, UUID
  ),
  public.resolve_build_request_delivery_artifact_cleanup_v1(
    INTEGER, UUID, UUID, UUID
  ),
  public.list_build_request_maintenance_work_v1(INTEGER, TEXT, INTEGER),
  public.claim_build_request_delivery_artifact_cleanup_v1(
    INTEGER, UUID, UUID, UUID, TEXT
  ),
  public.begin_build_request_delivery_artifact_cleanup_delete_v1(
    INTEGER, UUID, INTEGER, TEXT
  ),
  public.confirm_build_request_delivery_artifact_cleanup_v1(
    INTEGER, UUID, UUID, UUID, UUID, INTEGER, TEXT
  ),
  public.abort_build_request_delivery_artifact_cleanup_v1(
    INTEGER, UUID, INTEGER, TEXT
  ),
  public.purge_build_request_raw_text_v1(INTEGER, UUID),
  public.seal_build_request_delivery_revision_v1(
    INTEGER, TEXT, UUID, UUID, UUID, JSONB
  )
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION
  public.prepare_build_request_delivery_artifact_object_v1(
    INTEGER, UUID, UUID, UUID, UUID
  ),
  public.attest_build_request_delivery_artifact_object_v1(
    INTEGER, TEXT, INTEGER, UUID, UUID, UUID, UUID, UUID, INTEGER,
    UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT
  ),
  public.resolve_build_request_delivery_artifact_custody_v1(
    INTEGER, UUID, UUID, UUID
  ),
  public.resolve_build_request_delivery_artifact_cleanup_v1(
    INTEGER, UUID, UUID, UUID
  ),
  public.list_build_request_maintenance_work_v1(INTEGER, TEXT, INTEGER),
  public.claim_build_request_delivery_artifact_cleanup_v1(
    INTEGER, UUID, UUID, UUID, TEXT
  ),
  public.begin_build_request_delivery_artifact_cleanup_delete_v1(
    INTEGER, UUID, INTEGER, TEXT
  ),
  public.confirm_build_request_delivery_artifact_cleanup_v1(
    INTEGER, UUID, UUID, UUID, UUID, INTEGER, TEXT
  ),
  public.abort_build_request_delivery_artifact_cleanup_v1(
    INTEGER, UUID, INTEGER, TEXT
  ),
  public.purge_build_request_raw_text_v1(INTEGER, UUID),
  public.seal_build_request_delivery_revision_v1(
    INTEGER, TEXT, UUID, UUID, UUID, JSONB
  )
TO service_role;

CREATE OR REPLACE FUNCTION public.set_build_request_pilot_admission_v1(
  p_contract_version INTEGER,
  p_account_id UUID,
  p_expected_admission_version INTEGER,
  p_idempotency_key TEXT,
  p_admitted BOOLEAN,
  p_reason TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_hash TEXT;
  v_prior public.build_request_pilot_admission_receipts%ROWTYPE;
  v_admission public.build_request_pilot_admissions%ROWTYPE;
  v_found BOOLEAN;
  v_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF private.request_actor_role_v1(v_actor_id) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request pilot admission change is not allowed.';
  END IF;
  IF p_account_id IS NULL
    OR p_expected_admission_version IS NULL
    OR p_expected_admission_version < 0
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_admitted IS NULL
    OR p_reason IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request pilot admission change is invalid.';
  END IF;
  PERFORM private.request_assert_safe_text_v1(
    p_reason, 'reason', 1, 500, TRUE
  );
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'accountId', p_account_id, 'expectedVersion', p_expected_admission_version,
    'admitted', p_admitted,
    'reason', btrim(p_reason, E' \t\n\f\v'),
    'expiresAt', CASE WHEN p_admitted THEN p_expires_at ELSE NULL END
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-admission:' || p_account_id::TEXT, 0
  ));
  SELECT prior.* INTO v_prior
  FROM public.build_request_pilot_admission_receipts AS prior
  WHERE prior.actor_id = v_actor_id
    AND prior.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'contractVersion', 1, 'accountId', v_prior.account_id,
      'admissionVersion', v_prior.admission_version,
      'admitted', v_prior.admitted, 'expiresAt', v_prior.expires_at,
      'replayed', TRUE,
      'occurredAt', v_prior.occurred_at
    );
  END IF;
  IF (p_admitted AND p_expires_at IS NOT NULL AND p_expires_at <= v_at)
    OR (NOT p_admitted AND p_expires_at IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request pilot admission expiry is invalid.';
  END IF;
  IF p_admitted AND NOT EXISTS (
    SELECT 1
    FROM public.profiles AS target_profile
    JOIN auth.users AS target_user ON target_user.id = target_profile.id
    WHERE target_profile.id = p_account_id
      AND target_user.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request pilot participant is invalid.';
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-subject:' || private.request_account_pseudonym_v1(p_account_id),
    0
  ));
  IF EXISTS (
    SELECT 1
    FROM public.build_request_deidentified_accounts AS tombstone
    WHERE tombstone.subject_digest =
      private.request_account_pseudonym_v1(p_account_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request pilot participant is invalid.';
  END IF;
  SELECT admission.* INTO v_admission
  FROM public.build_request_pilot_admissions AS admission
  WHERE admission.account_id = p_account_id
  FOR UPDATE;
  v_found := FOUND;
  IF (v_found AND v_admission.admission_version <> p_expected_admission_version)
    OR (NOT v_found AND p_expected_admission_version <> 0) THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  INSERT INTO public.build_request_pilot_admissions (
    account_id, admission_version, admitted, expires_at,
    reason, changed_by, changed_at
  ) VALUES (
    p_account_id, 1, p_admitted,
    CASE WHEN p_admitted THEN p_expires_at ELSE NULL END,
    btrim(p_reason, E' \t\n\f\v'), v_actor_id, v_at
  )
  ON CONFLICT (account_id) DO UPDATE
  SET admission_version =
        public.build_request_pilot_admissions.admission_version + 1,
      admitted = EXCLUDED.admitted,
      expires_at = EXCLUDED.expires_at,
      reason = EXCLUDED.reason,
      changed_by = EXCLUDED.changed_by,
      changed_at = EXCLUDED.changed_at
  RETURNING * INTO v_admission;
  INSERT INTO public.build_request_pilot_admission_receipts (
    actor_id, account_id, idempotency_key, request_hash,
    admission_version, admitted, expires_at, occurred_at
  ) VALUES (
    v_actor_id, p_account_id, p_idempotency_key, v_hash,
    v_admission.admission_version, v_admission.admitted,
    v_admission.expires_at, v_at
  );
  RETURN jsonb_build_object(
    'contractVersion', 1, 'accountId', p_account_id,
    'admissionVersion', v_admission.admission_version,
    'admitted', v_admission.admitted, 'expiresAt', v_admission.expires_at,
    'replayed', FALSE,
    'occurredAt', v_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_build_request_pilot_admission_v1(
  INTEGER, UUID, INTEGER, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_build_request_pilot_admission_v1(
  INTEGER, UUID, INTEGER, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ
) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_build_request_controls_v1(
  p_contract_version INTEGER,
  p_expected_controls_version INTEGER,
  p_idempotency_key TEXT,
  p_accepting_requests BOOLEAN,
  p_assigning_requests BOOLEAN,
  p_active_case_capacity INTEGER
)
RETURNS TABLE (
  controls_version INTEGER,
  accepting_requests BOOLEAN,
  assigning_requests BOOLEAN,
  active_case_capacity INTEGER,
  replayed BOOLEAN,
  occurred_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_hash TEXT;
  v_existing public.build_request_controls_receipts%ROWTYPE;
  v_controls public.build_request_controls%ROWTYPE;
  v_occurred TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF private.request_actor_role_v1(v_actor_id) <> 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Controls update is not allowed.';
  END IF;
  IF p_expected_controls_version IS NULL
    OR p_expected_controls_version < 0
    OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_accepting_requests IS NULL
    OR p_assigning_requests IS NULL
    OR p_active_case_capacity IS NULL
    OR p_active_case_capacity NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Controls update is invalid.';
  END IF;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'expected', p_expected_controls_version,
    'accepting', p_accepting_requests,
    'assigning', p_assigning_requests,
    'capacity', p_active_case_capacity
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor_id::TEXT || ':' || p_idempotency_key, 0));
  SELECT * INTO v_existing
  FROM public.build_request_controls_receipts AS prior_controls
  WHERE prior_controls.actor_id = v_actor_id
    AND prior_controls.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN QUERY SELECT
      v_existing.controls_version, v_existing.accepting_requests,
      v_existing.assigning_requests, v_existing.active_case_capacity,
      TRUE, v_existing.occurred_at;
    RETURN;
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  SELECT * INTO v_controls FROM public.build_request_controls
  WHERE singleton FOR UPDATE;
  IF v_controls.controls_version <> p_expected_controls_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  UPDATE public.build_request_controls
  SET controls_version = controls_version + 1,
      accepting_requests = p_accepting_requests,
      assigning_requests = p_assigning_requests,
      active_case_capacity = p_active_case_capacity,
      updated_at = v_occurred
  WHERE singleton
  RETURNING * INTO v_controls;
  INSERT INTO public.build_request_controls_receipts (
    actor_id, idempotency_key, request_hash, controls_version,
    accepting_requests, assigning_requests, active_case_capacity, occurred_at
  ) VALUES (
    v_actor_id, p_idempotency_key, v_hash, v_controls.controls_version,
    v_controls.accepting_requests, v_controls.assigning_requests,
    v_controls.active_case_capacity, v_occurred
  );
  RETURN QUERY SELECT
    v_controls.controls_version, v_controls.accepting_requests,
    v_controls.assigning_requests, v_controls.active_case_capacity,
    FALSE, v_occurred;
END;
$$;

REVOKE ALL ON FUNCTION public.set_build_request_controls_v1(
  INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, INTEGER
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_build_request_controls_v1(
  INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, INTEGER
) TO authenticated;

CREATE OR REPLACE FUNCTION private.request_allowed_close_reasons_v1(
  p_request_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_case public.build_requests%ROWTYPE;
  reasons JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO request_case
  FROM public.build_requests
  WHERE id = p_request_id;
  IF NOT FOUND
    OR request_case.moderation_state <> 'clear'
    OR request_case.lifecycle_state IN ('completed', 'closed')
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_participants AS active_triager
      WHERE active_triager.request_id = p_request_id
        AND active_triager.actor_role = 'triager'
        AND active_triager.account_id = p_actor_id
        AND active_triager.active
    ) THEN
    RETURN reasons;
  END IF;
  IF request_case.lifecycle_state IN ('submitted', 'triage') THEN
    RETURN jsonb_build_array(
      'existing_resolution', 'duplicate', 'out_of_scope',
      'capacity_unavailable', 'declined'
    );
  ELSIF request_case.lifecycle_state = 'clarification_requested' THEN
    reasons := jsonb_build_array(
      'existing_resolution', 'duplicate', 'out_of_scope',
      'capacity_unavailable', 'declined'
    );
    IF EXISTS (
      SELECT 1
      FROM public.build_request_clarifications AS clarification
      WHERE clarification.request_id = p_request_id
        AND clarification.answer IS NULL
        AND clarification.requested_at
          <= clock_timestamp() - INTERVAL '7 days'
    ) THEN
      reasons := reasons || jsonb_build_array('expired');
    END IF;
    RETURN reasons;
  ELSIF request_case.lifecycle_state IN (
    'accepted', 'building', 'repair_required', 'review_pending'
  ) THEN
    RETURN jsonb_build_array('declined');
  END IF;
  RETURN reasons;
END;
$$;

CREATE OR REPLACE FUNCTION private.request_capabilities_v1(
  p_request_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_case public.build_requests%ROWTYPE;
  capabilities TEXT[] := ARRAY['view_case'];
  is_operator BOOLEAN;
  is_requester BOOLEAN;
  is_triager BOOLEAN;
  is_builder BOOLEAN;
  is_reviewer BOOLEAN;
  submitted_revision_count INTEGER;
  workspace_state TEXT;
  workspace_id UUID;
  assigning_enabled BOOLEAN := FALSE;
BEGIN
  SELECT * INTO request_case
  FROM public.build_requests
  WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN '[]'::JSONB;
  END IF;
  SELECT controls.assigning_requests
  INTO assigning_enabled
  FROM public.build_request_controls AS controls
  WHERE controls.singleton;
  is_operator := private.request_actor_role_v1(p_actor_id) = 'admin';
  is_requester := request_case.requester_id = p_actor_id;
  is_triager := EXISTS (
    SELECT 1
    FROM public.build_request_participants AS participant
    WHERE participant.request_id = p_request_id
      AND participant.actor_role = 'triager'
      AND participant.account_id = p_actor_id
      AND participant.active
  );
  is_builder := EXISTS (
    SELECT 1
    FROM public.build_request_assignments AS assignment
    WHERE assignment.request_id = p_request_id
      AND assignment.assignment_role = 'builder'
      AND assignment.account_id = p_actor_id
      AND assignment.active
  );
  is_reviewer := EXISTS (
    SELECT 1
    FROM public.build_request_assignments AS assignment
    WHERE assignment.request_id = p_request_id
      AND assignment.assignment_role = 'reviewer'
      AND assignment.account_id = p_actor_id
      AND assignment.active
  );
  IF request_case.moderation_state = 'removed' THEN
    RETURN '[]'::JSONB;
  END IF;
  IF request_case.moderation_state = 'held' THEN
    IF is_operator THEN
      capabilities := ARRAY[
        'release_moderation_hold', 'remove_for_moderation'
      ];
    ELSE
      capabilities := ARRAY[]::TEXT[];
    END IF;
    RETURN to_jsonb(capabilities);
  END IF;
  IF is_operator THEN
    IF assigning_enabled AND request_case.lifecycle_state = 'submitted' THEN
      capabilities := array_append(capabilities, 'begin_triage');
    END IF;
    IF assigning_enabled
      AND request_case.lifecycle_state NOT IN ('completed', 'closed')
      AND EXISTS (
        SELECT 1
        FROM public.build_request_participants AS prior_triager
        WHERE prior_triager.request_id = p_request_id
          AND prior_triager.actor_role = 'triager'
          AND (
            prior_triager.active
            OR (
              NOT prior_triager.active
              AND prior_triager.deidentified
              AND prior_triager.account_id IS NULL
            )
          )
      )
      AND (
        SELECT count(*)
        FROM public.build_request_participants AS triager_history
        WHERE triager_history.request_id = p_request_id
          AND triager_history.actor_role = 'triager'
      ) < 20
      AND request_case.lifecycle_state <> 'submitted'
    THEN
      capabilities := array_append(capabilities, 'reassign_triager');
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_claims AS cleanup_claim
        WHERE cleanup_claim.request_id = p_request_id
          AND cleanup_claim.resolved_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_artifact_cleanup_receipts AS cleaned_artifact
        WHERE cleaned_artifact.request_id = p_request_id
      ) THEN
      capabilities := array_append(capabilities, 'place_moderation_hold');
    END IF;
    capabilities := array_append(capabilities, 'remove_for_moderation');
  END IF;
  IF request_case.lifecycle_state IN ('completed', 'closed') THEN
    RETURN to_jsonb(capabilities);
  END IF;
  IF is_triager THEN
    IF request_case.lifecycle_state = 'triage' THEN
      capabilities := array_append(capabilities, 'request_clarification');
      IF assigning_enabled AND (
        SELECT count(*)
        FROM public.build_request_assignments AS assignment_history
        WHERE assignment_history.request_id = p_request_id
      ) < 20 THEN
        capabilities := array_append(capabilities, 'accept');
      END IF;
    END IF;
    IF assigning_enabled AND request_case.lifecycle_state IN (
      'accepted', 'building', 'repair_required', 'review_pending'
    ) AND NOT EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS active_reviewer
      WHERE active_reviewer.request_id = p_request_id
        AND active_reviewer.assignment_role = 'reviewer'
      AND active_reviewer.active
    ) AND (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) < 20 THEN
      capabilities := array_append(capabilities, 'assign_reviewer');
    END IF;
    IF assigning_enabled AND request_case.lifecycle_state IN (
      'accepted', 'building', 'repair_required'
    ) AND EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS active_builder
      WHERE active_builder.request_id = p_request_id
        AND active_builder.assignment_role = 'builder'
        AND (
          active_builder.active
          OR (
            active_builder.deidentified
            AND active_builder.account_id IS NULL
            AND active_builder.ended_at IS NOT NULL
          )
        )
    ) AND NOT EXISTS (
      SELECT 1
      FROM public.build_request_delivery_revisions AS active_workspace
      WHERE active_workspace.request_id = p_request_id
        AND active_workspace.revision_state IN (
          'staging', 'prepared', 'sealed'
        )
    ) AND (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) < 20 THEN
      capabilities := array_append(capabilities, 'reassign_builder');
    END IF;
    IF assigning_enabled AND request_case.lifecycle_state IN (
      'accepted', 'building', 'repair_required', 'review_pending'
    ) AND EXISTS (
      SELECT 1
      FROM public.build_request_assignments AS active_reviewer
      WHERE active_reviewer.request_id = p_request_id
        AND active_reviewer.assignment_role = 'reviewer'
        AND active_reviewer.active
    ) AND (
      SELECT count(*)
      FROM public.build_request_assignments AS assignment_history
      WHERE assignment_history.request_id = p_request_id
    ) < 20 THEN
      capabilities := array_append(capabilities, 'reassign_reviewer');
    END IF;
    IF request_case.lifecycle_state IN ('delivery_ready', 'delivered')
      AND request_case.delivery_response_started_at IS NOT NULL
      AND request_case.delivery_response_started_at
        <= clock_timestamp() - INTERVAL '14 days' THEN
      capabilities := array_append(capabilities, 'close_no_response');
    END IF;
    IF jsonb_array_length(
      private.request_allowed_close_reasons_v1(p_request_id, p_actor_id)
    ) > 0 THEN
      capabilities := array_append(capabilities, 'close');
    END IF;
  END IF;
  IF is_requester THEN
    IF request_case.lifecycle_state = 'clarification_requested' THEN
      capabilities := array_append(capabilities, 'submit_clarification');
    END IF;
    IF request_case.lifecycle_state = 'delivery_ready' THEN
      capabilities := array_append(capabilities, 'acknowledge_delivery');
    END IF;
    IF request_case.lifecycle_state IN ('delivery_ready', 'delivered') THEN
      capabilities := array_append(
        capabilities, 'requester_delivery_outcome'
      );
    END IF;
    IF request_case.lifecycle_state IN (
      'submitted', 'triage', 'clarification_requested', 'accepted',
      'building', 'review_pending', 'repair_required'
    ) THEN
      capabilities := array_append(capabilities, 'withdraw');
    END IF;
  END IF;
  IF is_builder THEN
    IF request_case.lifecycle_state = 'accepted' THEN
      capabilities := array_append(capabilities, 'start_build');
    END IF;
    SELECT count(*) INTO submitted_revision_count
    FROM public.build_request_delivery_revisions AS submitted_revision
    WHERE submitted_revision.request_id = p_request_id
      AND submitted_revision.revision_state = 'submitted';
    IF submitted_revision_count < 2
      AND request_case.lifecycle_state IN ('building', 'repair_required') THEN
      SELECT workspace.id, workspace.revision_state
      INTO workspace_id, workspace_state
      FROM public.build_request_delivery_revisions AS workspace
      JOIN public.build_request_assignments AS workspace_builder
        ON workspace_builder.id = workspace.builder_assignment_id
      WHERE workspace.request_id = p_request_id
        AND workspace.revision_state IN ('staging', 'prepared', 'sealed')
        AND workspace_builder.account_id = p_actor_id
        AND workspace_builder.active
      ORDER BY workspace.id
      LIMIT 1;
      IF workspace_id IS NULL OR (
        workspace_state = 'staging'
        AND (
          SELECT count(*)
          FROM public.build_request_delivery_artifacts AS attempted_artifact
          WHERE attempted_artifact.delivery_revision_id = workspace_id
        ) < 8
        AND COALESCE((
          SELECT sum(attempted_artifact.byte_length)
          FROM public.build_request_delivery_artifacts AS attempted_artifact
          WHERE attempted_artifact.delivery_revision_id = workspace_id
        ), 0) < 24000000
      ) THEN
        capabilities := array_append(
          capabilities, 'stage_delivery_artifact'
        );
      END IF;
      IF workspace_state = 'staging' THEN
        capabilities := array_append(
          capabilities, 'abandon_delivery_artifact'
        );
        IF EXISTS (
          SELECT 1
          FROM public.build_request_delivery_artifacts AS artifact
          WHERE artifact.delivery_revision_id = workspace_id
            AND artifact.abandoned_at IS NULL
            AND artifact.integrity_status = 'verified'
            AND artifact.scan_state = 'complete'
            AND artifact.scan_verdict = 'clean'
        ) THEN
          capabilities := array_append(
            capabilities, 'prepare_delivery_revision'
          );
        END IF;
      ELSIF workspace_state = 'sealed' AND EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS active_reviewer
        WHERE active_reviewer.request_id = p_request_id
          AND active_reviewer.assignment_role = 'reviewer'
          AND active_reviewer.active
      ) THEN
        capabilities := array_append(
          capabilities,
          CASE
            WHEN request_case.lifecycle_state = 'repair_required'
              THEN 'resubmit_delivery'
            ELSE 'submit_delivery'
          END
        );
      END IF;
    END IF;
  END IF;
  IF is_reviewer AND request_case.lifecycle_state = 'review_pending' THEN
    capabilities := array_append(capabilities, 'approve_delivery');
    capabilities := array_append(capabilities, 'request_repair');
  END IF;
  RETURN to_jsonb(capabilities);
END;
$$;

CREATE OR REPLACE FUNCTION private.request_next_actions_v1(
  p_request_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'kind', capability,
    'label', replace(initcap(replace(capability, '_', ' ')), ' No ', ' no '),
    'requiresConfirmation', capability IN (
      'close', 'close_no_response', 'withdraw',
      'remove_for_moderation'
    )
  ) ORDER BY ordinal), '[]'::JSONB)
  FROM jsonb_array_elements_text(
    private.request_capabilities_v1(p_request_id, p_actor_id)
  ) WITH ORDINALITY AS value(capability, ordinal)
  WHERE capability <> 'view_case';
$$;

CREATE OR REPLACE FUNCTION private.request_summary_json_v1(
  p_request_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'contractVersion', 1,
    'requestId', r.id,
    'requestVersion', r.version,
    'lifecycleState', r.lifecycle_state,
    'moderationState', r.moderation_state,
    'publicationState', r.publication_state,
    'closeReason', r.close_reason,
    'resolutionReference', CASE
      WHEN r.moderation_state <> 'clear'
        OR r.resolution_reference IS NULL THEN NULL
      WHEN r.resolution_reference->>'kind' = 'project' THEN jsonb_build_object(
        'kind', 'project', 'projectId', r.resolution_reference->>'project_id'
      )
      ELSE jsonb_build_object(
        'kind', 'response',
        'projectId', r.resolution_reference->>'project_id',
        'modelVariantId', r.resolution_reference->>'model_variant_id',
        'responseStepNumber', (r.resolution_reference->>'response_step_number')::INTEGER
      )
    END,
    'title', CASE
      WHEN r.moderation_state = 'held' THEN 'Request temporarily unavailable'
      WHEN r.moderation_state = 'removed' THEN 'Request unavailable'
      ELSE br.title
    END,
    'activeActorRoles', COALESCE((
      SELECT jsonb_agg(DISTINCT role_name)
      FROM (
        SELECT 'requester'::TEXT AS role_name WHERE r.requester_id = p_actor_id
        UNION
        SELECT a.assignment_role FROM public.build_request_assignments AS a
        WHERE a.request_id = r.id
          AND a.account_id = p_actor_id
          AND a.active
        UNION
        SELECT 'triager' FROM public.build_request_participants AS p
        WHERE p.request_id = r.id AND p.account_id = p_actor_id
          AND p.actor_role = 'triager'
          AND p.active
      ) AS roles
    ), '[]'::JSONB),
    'nextActions', private.request_next_actions_v1(r.id, p_actor_id),
    'unread', jsonb_build_object(
      'unreadCount', (
        SELECT count(*)::INTEGER
        FROM public.build_request_events AS e
        WHERE e.request_id = r.id
          AND e.participant_visible
          AND e.sequence > COALESCE((
            SELECT s.last_read_event_sequence
            FROM public.build_request_participant_state AS s
            WHERE s.request_id = r.id AND s.account_id = p_actor_id
          ), 0)
      ),
      'latestEventSequence', COALESCE((
        SELECT max(e.sequence)
        FROM public.build_request_events AS e
        WHERE e.request_id = r.id AND e.participant_visible
      ), 0),
      'lastReadEventSequence', (
        SELECT s.last_read_event_sequence FROM public.build_request_participant_state AS s
        WHERE s.request_id = r.id AND s.account_id = p_actor_id
      )
    ),
    'submittedAt', r.submitted_at,
    'updatedAt', r.updated_at
  )
  FROM public.build_requests AS r
  JOIN public.build_request_brief_revisions AS br
    ON br.id = r.current_brief_revision_id
  WHERE r.id = p_request_id;
$$;

CREATE OR REPLACE FUNCTION public.get_build_request_availability_v1(
  p_contract_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_controls public.build_request_controls%ROWTYPE;
  v_active INTEGER;
  v_eligibility TEXT;
  v_reason TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  SELECT * INTO STRICT v_controls
  FROM public.build_request_controls
  WHERE singleton;
  SELECT count(*) INTO v_active
  FROM public.build_requests AS active_request
  WHERE active_request.moderation_state <> 'removed'
    AND active_request.lifecycle_state NOT IN ('completed', 'closed');
  v_reason := CASE
    WHEN NOT v_controls.accepting_requests THEN 'controls_off'
    WHEN v_active >= v_controls.active_case_capacity THEN 'capacity_full'
    ELSE NULL
  END;
  IF v_actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    WHERE profile.id = v_actor_id
      AND auth_user.email_confirmed_at IS NOT NULL
  ) THEN
    v_eligibility := 'sign_in_required';
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.build_request_pilot_admissions AS admission
    WHERE admission.account_id = v_actor_id
      AND admission.admitted
      AND (admission.expires_at IS NULL OR admission.expires_at > clock_timestamp())
  ) THEN
    v_eligibility := 'not_admitted';
  ELSIF EXISTS (
    SELECT 1 FROM public.build_requests AS own_case
    WHERE own_case.requester_id = v_actor_id
      AND own_case.moderation_state <> 'removed'
      AND own_case.lifecycle_state NOT IN ('completed', 'closed')
  ) THEN
    v_eligibility := 'already_active';
  ELSIF NOT v_controls.accepting_requests THEN
    v_eligibility := 'controls_off';
  ELSE
    v_eligibility := 'available';
  END IF;
  RETURN jsonb_build_object(
    'intakeEligibility', v_eligibility,
    'controlsVersion', v_controls.controls_version,
    'acceptingRequests', v_controls.accepting_requests,
    'assigningRequests', v_controls.assigning_requests,
    'activeCaseCount', v_active,
    'activeCaseCapacity', v_controls.active_case_capacity,
    'remainingCapacity', GREATEST(v_controls.active_case_capacity - v_active, 0),
    'unavailableReason', v_reason
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_build_requests_v1(
  p_contract_version INTEGER,
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_items JSONB;
  v_next TEXT;
  v_cursor JSONB;
  v_cursor_at TIMESTAMPTZ;
  v_cursor_id UUID;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 50
    OR char_length(COALESCE(p_cursor, '')) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Request list query is invalid.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rq1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY['version', 'kind', 'actorId', 'updatedAt', 'requestId'],
        'Request list cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'my'
        OR v_cursor->>'actorId' <> v_actor_id::TEXT THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Request list cursor is invalid.';
      END IF;
      v_cursor_at := (v_cursor->>'updatedAt')::TIMESTAMPTZ;
      v_cursor_id := (v_cursor->>'requestId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Request list cursor is invalid.',
        DETAIL = SQLERRM;
    END;
  END IF;
  WITH eligible AS (
    SELECT r.id, r.updated_at,
      private.request_summary_json_v1(r.id, v_actor_id) AS item,
      row_number() OVER (ORDER BY r.updated_at DESC, r.id DESC) AS row_number
    FROM public.build_requests AS r
    WHERE r.requester_id = v_actor_id
      AND (
        r.lifecycle_state NOT IN ('completed', 'closed')
        OR (
          COALESCE(
            r.audit_tombstone_until,
            r.terminal_at + INTERVAL '400 days'
          ) > clock_timestamp()
        )
      )
      AND (
        p_cursor IS NULL
        OR (r.updated_at, r.id) < (v_cursor_at, v_cursor_id)
      )
    ORDER BY r.updated_at DESC, r.id DESC
    LIMIT p_limit + 1
  )
  SELECT COALESCE(jsonb_agg(
      page.item ORDER BY page.updated_at DESC, page.id DESC
    ) FILTER (WHERE page.row_number <= p_limit), '[]'::JSONB),
    CASE WHEN max(page.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1('rq1', jsonb_build_object(
        'version', 1, 'kind', 'my', 'actorId', v_actor_id,
        'updatedAt', boundary.updated_at, 'requestId', boundary.id
      ))
      FROM eligible AS boundary WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM eligible AS page;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_build_request_queue_v1(
  p_contract_version INTEGER,
  p_scope TEXT,
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_role TEXT;
  v_items JSONB;
  v_next TEXT;
  v_cursor JSONB;
  v_cursor_at TIMESTAMPTZ;
  v_cursor_id UUID;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  v_role := private.request_actor_role_v1(v_actor_id);
  IF v_actor_id IS NULL
    OR p_scope IS NULL
    OR p_scope NOT IN ('admin', 'triager', 'builder', 'reviewer')
    OR p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 50
    OR char_length(COALESCE(p_cursor, '')) > 500
    OR (p_scope = 'admin' AND v_role <> 'admin')
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Assigned queue scope is not allowed.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rq1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY[
          'version', 'kind', 'actorId', 'scope', 'updatedAt', 'requestId'
        ],
        'Assigned queue cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'queue'
        OR v_cursor->>'actorId' <> v_actor_id::TEXT
        OR v_cursor->>'scope' <> p_scope THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Assigned queue cursor is invalid.';
      END IF;
      v_cursor_at := (v_cursor->>'updatedAt')::TIMESTAMPTZ;
      v_cursor_id := (v_cursor->>'requestId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Assigned queue cursor is invalid.',
        DETAIL = SQLERRM;
    END;
  END IF;
  WITH eligible AS (
    SELECT r.id, r.updated_at,
      private.request_summary_json_v1(r.id, v_actor_id) || jsonb_build_object(
        'actorRole', CASE
          WHEN p_scope = 'admin' THEN 'admin'
          WHEN p_scope = 'triager' THEN 'triager'
          ELSE p_scope
        END,
        'targetDate', r.target_date
      ) AS item,
      row_number() OVER (ORDER BY r.updated_at DESC, r.id DESC) AS row_number
    FROM public.build_requests AS r
    WHERE (
        p_cursor IS NULL
        OR (r.updated_at, r.id) < (v_cursor_at, v_cursor_id)
      )
      AND (
        r.lifecycle_state NOT IN ('completed', 'closed')
        OR (
          COALESCE(
            r.audit_tombstone_until,
            r.terminal_at + INTERVAL '400 days'
          ) > clock_timestamp()
        )
        OR (
          p_scope = 'admin'
          AND EXISTS (
            SELECT 1
            FROM public.build_request_retention_holds AS preserved_hold
            WHERE preserved_hold.request_id = r.id
              AND preserved_hold.released_at IS NULL
          )
        )
      )
      AND (
        (
          p_scope = 'admin'
          AND v_role = 'admin'
        )
        OR (
          p_scope = 'triager'
          AND EXISTS (
            SELECT 1
            FROM public.build_request_participants AS triager_participant
            WHERE triager_participant.request_id = r.id
              AND triager_participant.account_id = v_actor_id
              AND triager_participant.actor_role = 'triager'
              AND triager_participant.active
          )
        )
        OR EXISTS (
          SELECT 1 FROM public.build_request_assignments AS a
          WHERE a.request_id = r.id AND a.account_id = v_actor_id
            AND a.assignment_role = p_scope AND a.active
        )
      )
    ORDER BY r.updated_at DESC, r.id DESC
    LIMIT p_limit + 1
  )
  SELECT COALESCE(jsonb_agg(
      page.item ORDER BY page.updated_at DESC, page.id DESC
    ) FILTER (WHERE page.row_number <= p_limit), '[]'::JSONB),
    CASE WHEN max(page.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1('rq1', jsonb_build_object(
        'version', 1, 'kind', 'queue', 'actorId', v_actor_id, 'scope', p_scope,
        'updatedAt', boundary.updated_at, 'requestId', boundary.id
      ))
      FROM eligible AS boundary WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM eligible AS page;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_build_request_delivery_revision_action_v1(
  p_contract_version INTEGER,
  p_actor_id UUID,
  p_request_id UUID,
  p_delivery_revision_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.build_requests%ROWTYPE;
  v_revision public.build_request_delivery_revisions%ROWTYPE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role'
    OR p_actor_id IS NULL
    OR p_request_id IS NULL
    OR p_delivery_revision_id IS NULL
    OR p_action IS NULL
    OR p_action NOT IN (
      'approve_delivery', 'request_repair', 'requester_delivery_outcome'
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Delivery revision action is not available.';
  END IF;
  SELECT request_case.*
  INTO v_request
  FROM public.build_requests AS request_case
  JOIN public.build_request_delivery_revisions AS revision
    ON revision.id = request_case.current_delivery_revision_id
    AND revision.request_id = request_case.id
  WHERE request_case.id = p_request_id
    AND revision.id = p_delivery_revision_id
    AND revision.revision_state = 'submitted'
    AND revision.artifact_manifest_digest ~ '^[0-9a-f]{64}$'
    AND request_case.moderation_state = 'clear';
  IF FOUND THEN
    SELECT revision.*
    INTO v_revision
    FROM public.build_request_delivery_revisions AS revision
    WHERE revision.id = p_delivery_revision_id
      AND revision.request_id = p_request_id;
  END IF;
  IF NOT FOUND OR (
    p_action IN ('approve_delivery', 'request_repair')
    AND (
      v_request.lifecycle_state <> 'review_pending'
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS reviewer_assignment
        WHERE reviewer_assignment.request_id = v_request.id
          AND reviewer_assignment.assignment_role = 'reviewer'
          AND reviewer_assignment.account_id = p_actor_id
          AND reviewer_assignment.active
      )
    )
  ) OR (
    p_action = 'requester_delivery_outcome'
    AND (
      v_request.lifecycle_state NOT IN ('delivery_ready', 'delivered')
      OR v_request.requester_id IS DISTINCT FROM p_actor_id
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Delivery revision action is not available.';
  END IF;
  RETURN jsonb_build_object(
    'requestId', v_request.id,
    'deliveryRevisionId', v_revision.id,
    'requestVersion', v_request.version,
    'manifestDigest', v_revision.artifact_manifest_digest,
    'action', p_action
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_build_request_eligible_assignees_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_assignment_role TEXT,
  p_query TEXT DEFAULT '',
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_query TEXT := btrim(COALESCE(p_query, ''));
  v_cursor JSONB;
  v_cursor_name TEXT;
  v_cursor_id UUID;
  v_items JSONB;
  v_next TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF private.request_actor_role_v1(v_actor_id) <> 'admin'
    OR p_request_id IS NULL
    OR p_assignment_role IS NULL
    OR p_assignment_role NOT IN ('triager', 'builder', 'reviewer')
    OR p_query IS NULL
    OR p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 50
    OR char_length(v_query) > 80
    OR char_length(COALESCE(p_cursor, '')) > 500
    OR NOT EXISTS (
      SELECT 1 FROM public.build_requests AS request_case
      WHERE request_case.id = p_request_id
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Eligible assignee list is not available.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rq1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY[
          'version', 'kind', 'actorId', 'requestId',
          'assignmentRole', 'query',
          'displayName', 'accountId'
        ],
        'Eligible assignee cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'eligible-assignees'
        OR v_cursor->>'actorId' <> v_actor_id::TEXT
        OR v_cursor->>'requestId' <> p_request_id::TEXT
        OR v_cursor->>'assignmentRole' <> p_assignment_role
        OR v_cursor->>'query' <> lower(v_query) THEN
        RAISE EXCEPTION 'invalid cursor';
      END IF;
      v_cursor_name := v_cursor->>'displayName';
      v_cursor_id := (v_cursor->>'accountId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Eligible assignee cursor is invalid.';
    END;
  END IF;
  WITH candidates AS (
    SELECT profile.id,
      private.request_display_name_v1(profile.id) AS display_name
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.build_requests AS request_case ON request_case.id = p_request_id
    WHERE auth_user.email_confirmed_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_deidentified_accounts AS tombstone
        WHERE tombstone.subject_digest =
          private.request_account_pseudonym_v1(profile.id)
      )
      AND (
        p_assignment_role <> 'triager'
        OR profile.role = 'admin'
      )
      AND profile.id IS DISTINCT FROM request_case.requester_id
      AND (
        v_query = ''
        OR private.request_display_name_v1(profile.id) ILIKE
          '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%'
            ESCAPE '\'
      )
      AND (
        p_assignment_role = 'triager'
        OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS opposite_assignment
        WHERE opposite_assignment.request_id = p_request_id
          AND opposite_assignment.account_id = profile.id
          AND opposite_assignment.active
          AND opposite_assignment.assignment_role <> p_assignment_role
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS current_assignment
        WHERE p_assignment_role IN ('builder', 'reviewer')
          AND current_assignment.request_id = p_request_id
          AND current_assignment.assignment_role = p_assignment_role
          AND current_assignment.account_id = profile.id
          AND current_assignment.active
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS current_triager
        WHERE p_assignment_role = 'triager'
          AND current_triager.request_id = p_request_id
          AND current_triager.actor_role = 'triager'
          AND current_triager.account_id = profile.id
          AND current_triager.active
      )
      AND (
        p_cursor IS NULL
        OR (
          lower(private.request_display_name_v1(profile.id)), profile.id
        ) > (lower(v_cursor_name), v_cursor_id)
      )
    ORDER BY lower(private.request_display_name_v1(profile.id)), profile.id
    LIMIT p_limit + 1
  ), numbered AS (
    SELECT candidates.*,
      row_number() OVER (ORDER BY lower(display_name), id) AS row_number
    FROM candidates
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'accountId', numbered.id, 'displayName', numbered.display_name
    ) ORDER BY lower(numbered.display_name), numbered.id)
      FILTER (WHERE numbered.row_number <= p_limit), '[]'::JSONB),
    CASE WHEN max(numbered.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1('rq1', jsonb_build_object(
        'version', 1, 'kind', 'eligible-assignees',
        'actorId', v_actor_id,
        'requestId', p_request_id,
        'assignmentRole', p_assignment_role,
        'query', lower(v_query),
        'displayName', boundary.display_name,
        'accountId', boundary.id
      ))
      FROM numbered AS boundary
      WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM numbered;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_build_request_pilot_admissions_v1(
  p_contract_version INTEGER,
  p_query TEXT DEFAULT '',
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_query TEXT := lower(btrim(COALESCE(p_query, '')));
  v_cursor JSONB;
  v_cursor_name TEXT;
  v_cursor_id UUID;
  v_items JSONB;
  v_next TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF private.request_actor_role_v1(v_actor_id) <> 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Pilot admission list is not available.';
  END IF;
  IF p_query IS NULL
    OR p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 50
    OR char_length(v_query) > 80
    OR char_length(COALESCE(p_cursor, '')) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Pilot admission list query is invalid.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rq1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY[
          'version', 'kind', 'actorId', 'query', 'displayName', 'accountId'
        ],
        'Pilot admission cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'pilot-admissions'
        OR v_cursor->>'actorId' <> v_actor_id::TEXT
        OR v_cursor->>'query' <> v_query THEN
        RAISE EXCEPTION 'invalid cursor';
      END IF;
      v_cursor_name := v_cursor->>'displayName';
      v_cursor_id := (v_cursor->>'accountId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Pilot admission cursor is invalid.';
    END;
  END IF;
  WITH candidates AS (
    SELECT
      profile.id,
      private.request_display_name_v1(profile.id) AS display_name,
      COALESCE(admission.admission_version, 0) AS admission_version,
      COALESCE(admission.admitted, FALSE) AS admitted,
      admission.expires_at
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    LEFT JOIN public.build_request_pilot_admissions AS admission
      ON admission.account_id = profile.id
    WHERE auth_user.email_confirmed_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_deidentified_accounts AS tombstone
        WHERE tombstone.subject_digest =
          private.request_account_pseudonym_v1(profile.id)
      )
      AND (
        v_query = ''
        OR lower(private.request_display_name_v1(profile.id)) LIKE
          '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%'
            ESCAPE '\'
      )
      AND (
        p_cursor IS NULL
        OR (
          lower(private.request_display_name_v1(profile.id)), profile.id
        ) > (lower(v_cursor_name), v_cursor_id)
      )
    ORDER BY lower(private.request_display_name_v1(profile.id)), profile.id
    LIMIT p_limit + 1
  ), numbered AS (
    SELECT candidates.*,
      row_number() OVER (ORDER BY lower(display_name), id) AS row_number
    FROM candidates
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'accountId', numbered.id,
      'displayName', numbered.display_name,
      'admissionVersion', numbered.admission_version,
      'admitted', numbered.admitted,
      'expiresAt', numbered.expires_at
    ) ORDER BY lower(numbered.display_name), numbered.id)
      FILTER (WHERE numbered.row_number <= p_limit), '[]'::JSONB),
    CASE WHEN max(numbered.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1('rq1', jsonb_build_object(
        'version', 1,
        'kind', 'pilot-admissions',
        'actorId', v_actor_id,
        'query', v_query,
        'displayName', boundary.display_name,
        'accountId', boundary.id
      ))
      FROM numbered AS boundary
      WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM numbered;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION private.request_event_page_json_v1(
  p_request_id UUID,
  p_cursor TEXT,
  p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_cursor JSONB;
  v_cursor_sequence INTEGER;
  v_items JSONB;
  v_next TEXT;
BEGIN
  IF p_request_id IS NULL
    OR p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 50
    OR char_length(COALESCE(p_cursor, '')) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request event cursor is invalid.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rqe1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY[
          'version', 'kind', 'requestId', 'actorId', 'lastSequence'
        ],
        'Request event cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'events'
        OR v_cursor->>'requestId' <> p_request_id::TEXT
        OR v_cursor->>'actorId' <> v_actor_id::TEXT
        OR v_cursor->>'lastSequence' IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Request event cursor is invalid.';
      END IF;
      v_cursor_sequence := (v_cursor->>'lastSequence')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Request event cursor is invalid.';
    END;
  END IF;

  WITH eligible AS (
    SELECT event_value.id, event_value.sequence, event_value.event_kind,
      event_value.actor_id, event_value.actor_deidentified,
      event_value.actor_role, event_value.safe_metadata,
      event_value.redactable_reason, event_value.occurred_at,
      event_value.old_lifecycle_state, event_value.old_moderation_state,
      event_value.old_publication_state, event_value.old_close_reason,
      event_value.new_lifecycle_state, event_value.new_moderation_state,
      event_value.new_publication_state, event_value.new_close_reason,
      event_value.resulting_request_version, event_value.correlation_id,
      event_value.command_id,
      row_number() OVER (ORDER BY event_value.sequence DESC) AS row_number
    FROM public.build_request_events AS event_value
    WHERE event_value.request_id = p_request_id
      AND event_value.participant_visible
      AND (
        p_cursor IS NULL
        OR event_value.sequence < v_cursor_sequence
      )
    ORDER BY event_value.sequence DESC
    LIMIT p_limit + 1
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'eventId', visible.id,
      'sequence', visible.sequence,
      'kind', CASE visible.event_kind
        WHEN 'submitted' THEN 'request_submitted'
        WHEN 'begin_triage' THEN 'triage_started'
        WHEN 'request_clarification' THEN 'clarification_requested'
        WHEN 'submit_clarification' THEN 'clarification_submitted'
        WHEN 'accept' THEN 'request_accepted'
        WHEN 'assign_reviewer' THEN 'reviewer_assigned'
        WHEN 'reassign_triager' THEN 'triager_reassigned'
        WHEN 'reassign_builder' THEN 'builder_reassigned'
        WHEN 'reassign_reviewer' THEN 'reviewer_reassigned'
        WHEN 'start_build' THEN 'build_started'
        WHEN 'prepare_delivery_revision' THEN 'delivery_revision_prepared'
        WHEN 'stage_delivery_artifact' THEN 'delivery_artifact_staged'
        WHEN 'abandon_delivery_artifact' THEN 'delivery_artifact_abandoned'
        WHEN 'submit_delivery' THEN 'delivery_submitted'
        WHEN 'resubmit_delivery' THEN 'delivery_resubmitted'
        WHEN 'approve_delivery' THEN 'delivery_approved'
        WHEN 'request_repair' THEN 'delivery_repair_requested'
        WHEN 'acknowledge_delivery' THEN 'delivery_acknowledged'
        WHEN 'requester_delivery_outcome' THEN 'requester_outcome_recorded'
        WHEN 'close' THEN 'request_closed'
        WHEN 'close_no_response' THEN 'request_closed'
        WHEN 'withdraw' THEN 'request_withdrawn'
        WHEN 'place_moderation_hold' THEN 'moderation_hold_placed'
        WHEN 'release_moderation_hold' THEN 'moderation_hold_released'
        WHEN 'remove_for_moderation' THEN 'moderation_removed'
        WHEN 'account_deidentified' THEN 'account_deidentified'
        WHEN 'delivery_revision_retired' THEN 'delivery_revision_retired'
      END,
      'label', replace(initcap(replace(visible.event_kind, '_', ' ')), ' No ', ' no '),
      'actorRole', visible.actor_role,
      'actor', CASE
        WHEN visible.actor_role = 'system' THEN NULL
        ELSE jsonb_build_object(
          'displayName', CASE
            WHEN visible.actor_deidentified THEN 'Former participant'
            ELSE COALESCE(
              private.request_display_name_v1(visible.actor_id),
              'PathForge participant'
            )
          END,
          'deidentified', visible.actor_deidentified
        )
      END,
      'occurredAt', visible.occurred_at,
      'oldAxes', CASE WHEN visible.old_lifecycle_state IS NULL THEN NULL
        ELSE jsonb_build_object(
          'lifecycleState', visible.old_lifecycle_state,
          'moderationState', visible.old_moderation_state,
          'publicationState', visible.old_publication_state,
          'closeReason', visible.old_close_reason
        ) END,
      'newAxes', jsonb_build_object(
        'lifecycleState', visible.new_lifecycle_state,
        'moderationState', visible.new_moderation_state,
        'publicationState', visible.new_publication_state,
        'closeReason', visible.new_close_reason
      ),
      'reason', COALESCE(
        visible.redactable_reason, visible.safe_metadata->>'reason'
      ),
      'reference', visible.safe_metadata->'resolutionReference'
    ) ORDER BY visible.sequence DESC)
      FILTER (WHERE visible.row_number <= p_limit), '[]'::JSONB),
    CASE WHEN max(visible.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1('rqe1', jsonb_build_object(
        'version', 1, 'kind', 'events', 'requestId', p_request_id,
        'actorId', v_actor_id, 'lastSequence', boundary.sequence
      ))
      FROM eligible AS boundary
      WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM eligible AS visible;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION private.request_held_event_page_json_v1(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'eventId', held_event.id,
        'sequence', held_event.sequence,
        'kind', 'moderation_hold_placed',
        'label', 'Request temporarily unavailable during moderation review',
        'actorRole', 'system',
        'actor', NULL,
        'occurredAt', held_event.occurred_at,
        'oldAxes', NULL,
        'newAxes', jsonb_build_object(
          'lifecycleState', held_event.new_lifecycle_state,
          'moderationState', held_event.new_moderation_state,
          'publicationState', held_event.new_publication_state,
          'closeReason', held_event.new_close_reason
        ),
        'reason', NULL,
        'reference', NULL
      ))
      FROM (
        SELECT event_value.id, event_value.sequence, event_value.occurred_at,
          event_value.new_lifecycle_state,
          event_value.new_moderation_state,
          event_value.new_publication_state,
          event_value.new_close_reason
        FROM public.build_request_events AS event_value
        WHERE event_value.request_id = p_request_id
          AND event_value.event_kind = 'place_moderation_hold'
          AND event_value.new_moderation_state = 'held'
        ORDER BY event_value.sequence DESC
        LIMIT 1
      ) AS held_event
    ), '[]'::JSONB),
    'nextCursor', NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.list_build_request_events_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_request public.build_requests%ROWTYPE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF p_request_id IS NULL
    OR p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 50
    OR char_length(COALESCE(p_cursor, '')) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request event query is invalid.';
  END IF;
  IF v_actor_id IS NULL
    OR NOT private.request_has_scope_v1(p_request_id, v_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Request was not found.';
  END IF;
  SELECT * INTO v_request FROM public.build_requests WHERE id = p_request_id;
  IF v_request.moderation_state = 'removed' THEN
    IF v_request.requester_id IS DISTINCT FROM v_actor_id
      AND private.request_actor_role_v1(v_actor_id) <> 'admin' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002',
        MESSAGE = 'Request was not found.';
    END IF;
    RETURN jsonb_build_object('items', '[]'::JSONB, 'nextCursor', NULL);
  ELSIF v_request.moderation_state = 'held' THEN
    RETURN private.request_held_event_page_json_v1(p_request_id);
  END IF;
  RETURN private.request_event_page_json_v1(p_request_id, p_cursor, p_limit);
END;
$$;

CREATE OR REPLACE FUNCTION private.request_retention_notices_v1(
  p_request_id UUID,
  p_moderation_state TEXT,
  p_terminal_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_notices JSONB := '[]'::JSONB;
BEGIN
  IF p_terminal_at IS NOT NULL THEN
    v_notices := v_notices || jsonb_build_array(
      jsonb_build_object(
        'kind', 'raw_content_retention',
        'label',
          'Participant access ends at this deadline; private raw content and hosted artifacts then become eligible for policy cleanup.',
        'effectiveUntil', p_terminal_at + INTERVAL '90 days'
      ),
      jsonb_build_object(
        'kind', 'audit_retention',
        'label',
          'This is the scheduled retention deadline for the deidentified case audit record unless an active preservation hold applies.',
        'effectiveUntil', p_terminal_at + INTERVAL '400 days'
      )
    );
  END IF;
  IF p_moderation_state = 'held' THEN
    v_notices := v_notices || jsonb_build_array(jsonb_build_object(
      'kind', 'moderation_hold',
      'label',
        'This request is unavailable during moderation review; the hold preserves evidence but does not extend participant artifact access.',
      'effectiveUntil', NULL
    ));
  ELSIF EXISTS (
    SELECT 1
    FROM public.build_request_retention_holds AS active_hold
    WHERE active_hold.request_id = p_request_id
      AND active_hold.released_at IS NULL
  ) THEN
    v_notices := v_notices || jsonb_build_array(jsonb_build_object(
      'kind', 'preservation_hold',
      'label',
        'Authority is preserving retained evidence under an active hold; the hold does not extend participant artifact access.',
      'effectiveUntil', NULL
    ));
  END IF;
  RETURN v_notices;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_build_request_v1(
  p_contract_version INTEGER,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_result JSONB;
  v_latest INTEGER;
  v_request public.build_requests%ROWTYPE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request detail query is invalid.';
  END IF;
  IF NOT private.request_has_scope_v1(p_request_id, v_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Request was not found.';
  END IF;
  SELECT * INTO STRICT v_request
  FROM public.build_requests AS request_case
  WHERE request_case.id = p_request_id;
  IF v_request.moderation_state = 'removed' THEN
    IF v_request.requester_id IS DISTINCT FROM v_actor_id
      AND private.request_actor_role_v1(v_actor_id) <> 'admin' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002',
        MESSAGE = 'Request was not found.';
    END IF;
    RETURN jsonb_build_object(
      'visibility', 'removed',
      'contractVersion', 1, 'requestId', v_request.id,
      'requestVersion', v_request.version,
      'lifecycleState', v_request.lifecycle_state,
      'moderationState', 'removed',
      'publicationState', v_request.publication_state,
      'closeReason', v_request.close_reason,
      'safeLabel', 'Request unavailable',
      'unread', private.request_summary_json_v1(
        v_request.id, v_actor_id
      )->'unread',
      'submittedAt', v_request.submitted_at,
      'updatedAt', v_request.updated_at,
      'events', jsonb_build_object(
        'items', '[]'::JSONB, 'nextCursor', NULL
      ),
      'notices', private.request_retention_notices_v1(
        v_request.id, v_request.moderation_state, v_request.terminal_at
      ),
      'actor', jsonb_build_object(
        'accountId', v_actor_id,
        'roles', COALESCE((
          SELECT jsonb_agg(role_name ORDER BY role_name)
          FROM (
            SELECT 'requester'::TEXT AS role_name
            WHERE v_request.requester_id = v_actor_id
            UNION
            SELECT assignment.assignment_role
            FROM public.build_request_assignments AS assignment
            WHERE assignment.request_id = v_request.id
              AND assignment.account_id = v_actor_id
              AND assignment.active
            UNION
            SELECT 'triager'
            WHERE EXISTS (
                SELECT 1
                FROM public.build_request_participants AS triager
                WHERE triager.request_id = v_request.id
                  AND triager.account_id = v_actor_id
                  AND triager.actor_role = 'triager'
                  AND triager.active
              )
          ) AS actor_role
        ), '[]'::JSONB),
        'operatorAuthority', CASE
          WHEN private.request_actor_role_v1(v_actor_id) = 'admin'
            THEN 'admin'
          ELSE 'none'
        END,
        'capabilities', '[]'::JSONB,
        'allowedCloseReasons', '[]'::JSONB,
        'unreadCount', (
          private.request_summary_json_v1(v_request.id, v_actor_id)
            ->'unread'->>'unreadCount'
        )::INTEGER
      )
    );
  ELSIF v_request.moderation_state = 'held' THEN
    RETURN jsonb_build_object(
      'visibility', 'held',
      'contractVersion', 1, 'requestId', v_request.id,
      'requestVersion', v_request.version,
      'lifecycleState', v_request.lifecycle_state,
      'moderationState', 'held',
      'publicationState', v_request.publication_state,
      'closeReason', v_request.close_reason,
      'safeLabel', 'Request temporarily unavailable',
      'unread', private.request_summary_json_v1(
        v_request.id, v_actor_id
      )->'unread',
      'submittedAt', v_request.submitted_at,
      'updatedAt', v_request.updated_at,
      'events', private.request_held_event_page_json_v1(v_request.id),
      'notices', private.request_retention_notices_v1(
        v_request.id, v_request.moderation_state, v_request.terminal_at
      ),
      'actor', jsonb_build_object(
        'accountId', v_actor_id,
        'roles', COALESCE((
          SELECT jsonb_agg(role_name ORDER BY role_name)
          FROM (
            SELECT 'requester'::TEXT AS role_name
            WHERE v_request.requester_id = v_actor_id
            UNION
            SELECT assignment.assignment_role
            FROM public.build_request_assignments AS assignment
            WHERE assignment.request_id = v_request.id
              AND assignment.account_id = v_actor_id
              AND assignment.active
            UNION
            SELECT 'triager'
            WHERE EXISTS (
                SELECT 1
                FROM public.build_request_participants AS triager
                WHERE triager.request_id = v_request.id
                  AND triager.account_id = v_actor_id
                  AND triager.actor_role = 'triager'
                  AND triager.active
              )
          ) AS actor_role
        ), '[]'::JSONB),
        'operatorAuthority', CASE
          WHEN private.request_actor_role_v1(v_actor_id) = 'admin'
            THEN 'admin'
          ELSE 'none'
        END,
        'capabilities', CASE
          WHEN private.request_actor_role_v1(v_actor_id) = 'admin'
            THEN jsonb_build_array(
              'release_moderation_hold', 'remove_for_moderation'
            )
          ELSE '[]'::JSONB
        END,
        'allowedCloseReasons', '[]'::JSONB,
        'unreadCount', (
          private.request_summary_json_v1(v_request.id, v_actor_id)
            ->'unread'->>'unreadCount'
        )::INTEGER
      )
    );
  END IF;
  SELECT private.request_summary_json_v1(r.id, v_actor_id) || jsonb_build_object(
    'visibility', 'full',
    'targetDate', r.target_date,
    'closureNote', CASE
      WHEN r.close_reason IN (
        'existing_resolution', 'duplicate', 'out_of_scope',
        'capacity_unavailable', 'declined', 'withdrawn', 'expired',
        'failed_review'
      ) THEN r.close_explanation
      ELSE NULL
    END,
    'briefRevisionId', br.id,
    'brief', jsonb_build_object(
      'title', br.title, 'outcome', br.outcome, 'intendedUser', br.intended_user,
      'mustWorkScenario', br.must_work_scenario, 'constraints', br.constraints,
      'acceptanceChecks', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'acceptanceCheckId', ac.id, 'ordinal', ac.ordinal, 'text', ac.check_text
        ) ORDER BY ac.ordinal)
        FROM public.build_request_acceptance_checks AS ac
        WHERE ac.brief_revision_id = br.id
      ), '[]'::JSONB),
      'pathforgeReference', CASE
        WHEN br.pathforge_reference IS NULL THEN NULL
        WHEN br.pathforge_reference->>'kind' = 'project' THEN jsonb_build_object(
          'kind', 'project', 'projectId', br.pathforge_reference->>'project_id'
        )
        ELSE jsonb_build_object(
          'kind', 'response',
          'projectId', br.pathforge_reference->>'project_id',
          'modelVariantId', br.pathforge_reference->>'model_variant_id',
          'responseStepNumber', (br.pathforge_reference->>'response_step_number')::INTEGER
        )
      END
    ),
    'participants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'role', p.actor_role,
        'displayName', p.display_name, 'deidentified', p.deidentified
      ) ORDER BY p.joined_at)
      FROM public.build_request_participants AS p
      WHERE p.request_id = r.id
        AND p.active
    ), '[]'::JSONB),
    'assignments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'assignmentId', a.id, 'role', a.assignment_role,
        'assignee', jsonb_build_object(
          'displayName', a.display_name,
          'deidentified', a.deidentified
        ),
        'active', a.active, 'assignedAt', a.assigned_at, 'endedAt', a.ended_at
      ) ORDER BY a.assigned_at, a.id)
      FROM public.build_request_assignments AS a WHERE a.request_id = r.id
    ), '[]'::JSONB),
    'clarifications', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'clarificationId', c.id, 'sequence', c.sequence, 'question', c.question,
        'answer', c.answer, 'requestedAt', c.requested_at, 'answeredAt', c.answered_at
      ) ORDER BY c.sequence)
      FROM public.build_request_clarifications AS c WHERE c.request_id = r.id
    ), '[]'::JSONB),
    'requesterOutcomes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'outcomeId', requester_outcome.id,
        'deliveryRevisionId', requester_outcome.delivery_revision_id,
        'acceptedBriefRevisionId', requester_outcome.brief_revision_id,
        'outcome', requester_outcome.outcome,
        'acceptanceCheckId', requester_outcome.acceptance_check_id,
        'reason', requester_outcome.reason,
        'occurredAt', requester_outcome.occurred_at,
        'isCurrent',
          requester_outcome.delivery_revision_id =
            r.current_delivery_revision_id
      ) ORDER BY requester_outcome.occurred_at, requester_outcome.id)
      FROM public.build_request_requester_outcomes AS requester_outcome
      WHERE requester_outcome.request_id = r.id
    ), '[]'::JSONB),
    'deliveryRevisions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'deliveryRevisionId', d.id,
        'acceptedBriefRevisionId', d.accepted_brief_revision_id,
        'activeBuilderAssignmentId', d.builder_assignment_id,
        'sealReceiptId', d.seal_receipt_id,
        'artifactCount', d.artifact_count, 'totalBytes', d.total_bytes,
        'evidenceChecklistVersion', d.evidence_checklist_version,
        'rightsSnapshotVersion', d.rights_snapshot_version,
        'revisionLabel', d.revision_label, 'summary', d.summary,
        'builderEvidence', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'acceptanceCheckId', be.acceptance_check_id, 'result', be.result,
            'evidenceText', be.evidence_text, 'evidenceRef', be.evidence_ref
          ) ORDER BY ac.ordinal)
          FROM public.build_request_builder_evidence AS be
          JOIN public.build_request_acceptance_checks AS ac ON ac.id = be.acceptance_check_id
          WHERE be.delivery_revision_id = d.id
        ), '[]'::JSONB),
        'approvedPathForgeReference', CASE
          WHEN d.approved_pathforge_reference IS NULL THEN NULL
          WHEN d.approved_pathforge_reference->>'kind' = 'project' THEN jsonb_build_object(
            'kind', 'project', 'projectId', d.approved_pathforge_reference->>'project_id'
          )
          ELSE jsonb_build_object(
            'kind', 'response',
            'projectId', d.approved_pathforge_reference->>'project_id',
            'modelVariantId', d.approved_pathforge_reference->>'model_variant_id',
            'responseStepNumber', (d.approved_pathforge_reference->>'response_step_number')::INTEGER
          )
        END,
        'revisionNumber', d.revision_number,
        'authoredBy', jsonb_build_object(
          'displayName', d.authored_by_display_name,
          'deidentified', d.authored_by_deidentified
        ),
        'submittedAt', d.submitted_at,
        'isCurrent', d.id = r.current_delivery_revision_id,
        'artifacts', COALESCE((
          SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
            'artifactId', da.id, 'artifactOrdinal', da.artifact_ordinal,
            'normalizedName', da.normalized_name,
            'detectedMediaType', da.detected_media_type, 'byteLength', da.byte_length,
            'sha256', da.sha256, 'integrityStatus', da.integrity_status,
            'scanState', da.scan_state, 'scanVerdict', da.scan_verdict,
            'findingCodes', to_jsonb(da.finding_codes),
            'readerHref', CASE WHEN d.id = r.current_delivery_revision_id
              AND r.moderation_state = 'clear'
              AND r.publication_state <> 'withdrawn'
              AND (
                (
                  r.lifecycle_state = 'review_pending'
                  AND d.revision_state = 'submitted'
                  AND EXISTS (
                    SELECT 1
                    FROM public.build_request_assignments AS reader_reviewer
                    WHERE reader_reviewer.request_id = r.id
                      AND reader_reviewer.assignment_role = 'reviewer'
                      AND reader_reviewer.account_id = v_actor_id
                      AND reader_reviewer.active
                  )
                )
                OR (
                  (
                    r.lifecycle_state IN ('delivery_ready', 'delivered')
                    OR (
                      r.lifecycle_state IN ('completed', 'closed')
                      AND r.terminal_at IS NOT NULL
                      AND r.terminal_at + INTERVAL '90 days' >
                        clock_timestamp()
                      AND (
                        r.lifecycle_state <> 'closed'
                        OR r.close_reason = 'no_response'
                      )
                    )
                  )
                  AND (
                    SELECT approved.verdict = 'approve'
                      AND approved.manifest_digest =
                        d.artifact_manifest_digest
                    FROM public.build_request_delivery_reviews AS approved
                    WHERE approved.delivery_revision_id = d.id
                    ORDER BY approved.reviewed_at DESC, approved.id DESC
                    LIMIT 1
                  ) IS TRUE
                )
              )
              AND da.integrity_status = 'verified'
              AND da.scan_state = 'complete'
              AND da.scan_verdict = 'clean'
              THEN '/api/requests/deliveries/' || da.id || '/reader'
            END
          )) ORDER BY da.artifact_ordinal, da.id)
          FROM public.build_request_delivery_artifacts AS da
          WHERE da.delivery_revision_id = d.id AND da.abandoned_at IS NULL
        ), '[]'::JSONB),
        'reviews', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'deliveryRevisionId', rv.delivery_revision_id,
            'checklistVersion', rv.checklist_version,
            'checks', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'acceptanceCheckId', rc.acceptance_check_id,
                'result', rc.result, 'evidenceRef', rc.evidence_ref
              ) ORDER BY ac2.ordinal)
              FROM public.build_request_delivery_review_checks AS rc
              JOIN public.build_request_acceptance_checks AS ac2 ON ac2.id = rc.acceptance_check_id
              WHERE rc.review_id = rv.id
            ), '[]'::JSONB),
            'safetyIntegrityResult', rv.safety_integrity_result,
            'verdict', rv.verdict, 'reason', rv.reason,
            'reviewNotes', rv.review_notes,
            'repairInstructions', rv.repair_instructions,
            'reviewer', jsonb_build_object(
              'displayName', rv.reviewer_display_name,
              'deidentified', rv.reviewer_deidentified
            ),
            'reviewedAt', rv.reviewed_at,
            'isCurrent', d.id = r.current_delivery_revision_id
              AND rv.id = (
                SELECT newest.id FROM public.build_request_delivery_reviews AS newest
                WHERE newest.delivery_revision_id = d.id
                ORDER BY newest.reviewed_at DESC, newest.id DESC LIMIT 1
              )
          ) ORDER BY rv.reviewed_at)
          FROM public.build_request_delivery_reviews AS rv
          WHERE rv.delivery_revision_id = d.id
        ), '[]'::JSONB)
      ) ORDER BY d.revision_number)
      FROM public.build_request_delivery_revisions AS d
      WHERE d.request_id = r.id AND d.revision_state = 'submitted'
        AND (
          private.request_actor_role_v1(v_actor_id) = 'admin'
          OR EXISTS (
            SELECT 1
            FROM public.build_request_assignments AS delivery_scope
            WHERE delivery_scope.request_id = r.id
              AND delivery_scope.account_id = v_actor_id
              AND delivery_scope.active
              AND delivery_scope.assignment_role IN (
                'triager', 'builder', 'reviewer'
              )
          )
          OR EXISTS (
            SELECT 1
            FROM public.build_request_delivery_reviews AS approved_review
            WHERE approved_review.delivery_revision_id = d.id
              AND approved_review.verdict = 'approve'
          )
        )
    ), '[]'::JSONB),
    'builderWorkspace', CASE
      WHEN (
        SELECT count(*)
        FROM public.build_request_delivery_revisions AS submitted_revision
        WHERE submitted_revision.request_id = r.id
          AND submitted_revision.revision_state = 'submitted'
      ) >= 2 THEN NULL
      ELSE (
        SELECT jsonb_build_object(
          'deliveryRevisionId', workspace.id,
          'acceptedBriefRevisionId', workspace.accepted_brief_revision_id,
          'activeBuilderAssignmentId', workspace.builder_assignment_id,
          'revisionState', workspace.revision_state,
          'revisionLabel', workspace.revision_label,
          'summary', workspace.summary,
          'builderEvidence', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'acceptanceCheckId', evidence.acceptance_check_id,
              'result', evidence.result,
              'evidenceText', evidence.evidence_text,
              'evidenceRef', evidence.evidence_ref
            ) ORDER BY acceptance.ordinal)
            FROM public.build_request_builder_evidence AS evidence
            JOIN public.build_request_acceptance_checks AS acceptance
              ON acceptance.id = evidence.acceptance_check_id
            WHERE evidence.delivery_revision_id = workspace.id
          ), '[]'::JSONB),
          'approvedPathForgeReference', CASE
            WHEN workspace.approved_pathforge_reference IS NULL THEN NULL
            WHEN workspace.approved_pathforge_reference->>'kind' = 'project'
              THEN jsonb_build_object(
                'kind', 'project',
                'projectId',
                  workspace.approved_pathforge_reference->>'project_id'
              )
            ELSE jsonb_build_object(
              'kind', 'response',
              'projectId',
                workspace.approved_pathforge_reference->>'project_id',
              'modelVariantId',
                workspace.approved_pathforge_reference->>'model_variant_id',
              'responseStepNumber',
                (
                  workspace.approved_pathforge_reference
                    ->>'response_step_number'
                )::INTEGER
            )
          END,
          'artifacts', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'artifactId', artifact.id,
              'artifactOrdinal', artifact.artifact_ordinal,
              'normalizedName', artifact.normalized_name,
              'detectedMediaType', artifact.detected_media_type,
              'byteLength', artifact.byte_length,
              'sha256', artifact.sha256,
              'integrityStatus', artifact.integrity_status,
              'scanState', artifact.scan_state,
              'scanVerdict', artifact.scan_verdict,
              'findingCodes', to_jsonb(artifact.finding_codes)
            ) ORDER BY artifact.artifact_ordinal, artifact.id)
            FROM public.build_request_delivery_artifacts AS artifact
            WHERE artifact.delivery_revision_id = workspace.id
              AND artifact.abandoned_at IS NULL
          ), '[]'::JSONB),
          'sealReceiptId', workspace.seal_receipt_id
        )
        FROM public.build_request_delivery_revisions AS workspace
        JOIN public.build_request_assignments AS workspace_builder
          ON workspace_builder.id = workspace.builder_assignment_id
          AND workspace_builder.request_id = workspace.request_id
        WHERE workspace.request_id = r.id
          AND workspace.revision_state IN ('staging', 'prepared', 'sealed')
          AND workspace_builder.assignment_role = 'builder'
          AND workspace_builder.active
          AND workspace_builder.account_id = v_actor_id
        ORDER BY workspace.id
        LIMIT 1
      )
    END,
    'events', private.request_event_page_json_v1(r.id, NULL, 20),
    'notices', private.request_retention_notices_v1(
      r.id, r.moderation_state, r.terminal_at
    ),
    'actor', jsonb_build_object(
      'accountId', v_actor_id,
      'roles', COALESCE((
        SELECT jsonb_agg(DISTINCT role_name) FROM (
          SELECT 'requester'::TEXT AS role_name WHERE r.requester_id = v_actor_id
          UNION SELECT a.assignment_role FROM public.build_request_assignments AS a
            WHERE a.request_id = r.id AND a.account_id = v_actor_id AND a.active
          UNION SELECT 'triager'
            WHERE EXISTS (
                SELECT 1
                FROM public.build_request_participants AS triager
                WHERE triager.request_id = r.id
                  AND triager.account_id = v_actor_id
                  AND triager.actor_role = 'triager'
                  AND triager.active
              )
        ) AS actor_roles
      ), '[]'::JSONB),
      'operatorAuthority', CASE
        WHEN private.request_actor_role_v1(v_actor_id) = 'admin'
          THEN 'admin'
        ELSE 'none'
      END,
      'capabilities', private.request_capabilities_v1(r.id, v_actor_id),
      'allowedCloseReasons',
        private.request_allowed_close_reasons_v1(r.id, v_actor_id),
      'unreadCount', (
        SELECT count(*)::INTEGER
        FROM public.build_request_events AS unread_event
        WHERE unread_event.request_id = r.id
          AND unread_event.participant_visible
          AND unread_event.sequence > COALESCE((
            SELECT state.last_read_event_sequence
            FROM public.build_request_participant_state AS state
            WHERE state.request_id = r.id
              AND state.account_id = v_actor_id
          ), 0)
      )
    )
  ) INTO v_result
  FROM public.build_requests AS r
  JOIN public.build_request_brief_revisions AS br ON br.id = r.current_brief_revision_id
  WHERE r.id = p_request_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_build_request_delivery_artifact_v1(
  p_contract_version INTEGER,
  p_delivery_artifact_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_artifact public.build_request_delivery_artifacts%ROWTYPE;
  v_request public.build_requests%ROWTYPE;
  v_revision public.build_request_delivery_revisions%ROWTYPE;
  v_is_active_reviewer BOOLEAN := FALSE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF p_delivery_artifact_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Delivery artifact query is invalid.';
  END IF;
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'unauthenticated');
  END IF;
  SELECT * INTO v_artifact FROM public.build_request_delivery_artifacts
  WHERE id = p_delivery_artifact_id;
  IF NOT FOUND OR NOT private.request_has_scope_v1(v_artifact.request_id, v_actor_id) THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'not_found');
  END IF;
  SELECT * INTO v_request FROM public.build_requests WHERE id = v_artifact.request_id;
  SELECT * INTO v_revision FROM public.build_request_delivery_revisions
  WHERE id = v_artifact.delivery_revision_id;
  SELECT EXISTS (
    SELECT 1
    FROM public.build_request_assignments AS reviewer_assignment
    WHERE reviewer_assignment.request_id = v_artifact.request_id
      AND reviewer_assignment.assignment_role = 'reviewer'
      AND reviewer_assignment.account_id = v_actor_id
      AND reviewer_assignment.active
  ) INTO v_is_active_reviewer;
  IF v_request.moderation_state = 'held' THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'held');
  ELSIF v_request.moderation_state = 'removed' THEN
    IF v_request.requester_id IS DISTINCT FROM v_actor_id
      AND private.request_actor_role_v1(v_actor_id) <> 'admin' THEN
      RETURN jsonb_build_object('status', 'unavailable', 'reason', 'not_found');
    END IF;
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'removed');
  ELSIF v_request.publication_state = 'withdrawn' THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'withdrawn');
  ELSIF v_request.lifecycle_state = 'repair_required' THEN
    RETURN jsonb_build_object(
      'status', 'unavailable', 'reason', 'stale_revision'
    );
  ELSIF v_revision.id <> v_request.current_delivery_revision_id THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'stale_revision');
  ELSIF v_request.lifecycle_state = 'review_pending'
    AND NOT v_is_active_reviewer THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'not_found');
  ELSIF v_request.lifecycle_state NOT IN (
    'review_pending', 'delivery_ready', 'delivered', 'completed', 'closed'
  ) OR (
    v_request.lifecycle_state = 'closed'
    AND v_request.close_reason <> 'no_response'
  ) THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'not_found');
  ELSIF v_request.lifecycle_state IN ('completed', 'closed')
    AND (
      v_request.terminal_at IS NULL
      OR clock_timestamp() >= v_request.terminal_at + INTERVAL '90 days'
    ) THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'closed');
  ELSIF v_artifact.integrity_status <> 'verified'
    OR v_artifact.scan_state <> 'complete'
    OR v_artifact.scan_verdict <> 'clean'
    OR (
      v_request.lifecycle_state <> 'review_pending'
      AND (
      SELECT approved_review.verdict = 'approve'
        AND approved_review.manifest_digest = v_revision.artifact_manifest_digest
      FROM public.build_request_delivery_reviews AS approved_review
      WHERE approved_review.request_id = v_request.id
        AND approved_review.delivery_revision_id = v_revision.id
      ORDER BY approved_review.reviewed_at DESC, approved_review.id DESC
      LIMIT 1
      ) IS DISTINCT FROM TRUE
    ) THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'not_found');
  END IF;
  RETURN jsonb_build_object(
    'status', 'ready',
    'artifact', jsonb_build_object(
      'deliveryArtifactId', v_artifact.id,
      'deliveryRevisionId', v_revision.id,
      'requestId', v_request.id,
      'normalizedName', v_artifact.normalized_name,
      'detectedMediaType', v_artifact.detected_media_type,
      'byteLength', v_artifact.byte_length,
      'sha256', v_artifact.sha256,
      'integrityStatus', 'verified',
      'deliveryStatus', CASE
        WHEN v_request.lifecycle_state = 'closed'
          AND v_request.close_reason = 'no_response' THEN 'closed_no_response'
        ELSE v_request.lifecycle_state
      END,
      'accessUntil', CASE
        WHEN v_request.lifecycle_state IN ('completed', 'closed')
          THEN v_request.terminal_at + INTERVAL '90 days'
        ELSE NULL
      END,
      'readerHref', '/api/requests/deliveries/' || v_artifact.id || '/reader'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_build_request_delivery_artifact_object_v1(
  p_contract_version INTEGER,
  p_artifact_id UUID,
  p_delivery_revision_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_artifact public.build_request_delivery_artifacts%ROWTYPE;
  v_manifest_digest TEXT;
  v_terminal_at TIMESTAMPTZ;
  v_moderation_state TEXT;
  v_retention_state TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Artifact object resolution is not allowed.';
  END IF;
  IF p_artifact_id IS NULL OR p_delivery_revision_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Artifact object resolution is invalid.';
  END IF;
  SELECT a.*
  INTO v_artifact
  FROM public.build_request_delivery_artifacts AS a
  JOIN public.build_request_delivery_revisions AS d
    ON d.id = a.delivery_revision_id
  JOIN public.build_requests AS r ON r.id = a.request_id
  WHERE a.id = p_artifact_id
    AND a.delivery_revision_id = p_delivery_revision_id
    AND d.revision_state = 'submitted'
    AND d.artifact_manifest_digest ~ '^[0-9a-f]{64}$'
    AND r.current_delivery_revision_id = d.id
    AND r.moderation_state = 'clear'
    AND r.publication_state <> 'withdrawn'
    AND (
      r.lifecycle_state IN (
        'review_pending', 'delivery_ready', 'delivered', 'completed'
      )
      OR (
        r.lifecycle_state = 'closed'
        AND r.close_reason = 'no_response'
      )
    )
    AND (
      r.lifecycle_state IN ('review_pending', 'delivery_ready', 'delivered')
      OR (
        r.terminal_at IS NOT NULL
        AND clock_timestamp() < r.terminal_at + INTERVAL '90 days'
      )
    )
    AND a.integrity_status = 'verified'
    AND a.scan_state = 'complete'
    AND a.scan_verdict = 'clean'
    AND a.object_identity IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.build_request_delivery_seals AS seal
      WHERE seal.request_id = r.id
        AND seal.delivery_revision_id = d.id
        AND seal.id = d.seal_receipt_id
        AND seal.manifest_digest = d.artifact_manifest_digest
    )
    AND (
      r.lifecycle_state = 'review_pending'
      OR (
        SELECT rv.verdict = 'approve'
          AND rv.manifest_digest = d.artifact_manifest_digest
        FROM public.build_request_delivery_reviews AS rv
        WHERE rv.request_id = r.id
          AND rv.delivery_revision_id = d.id
        ORDER BY rv.reviewed_at DESC, rv.id DESC
        LIMIT 1
      ) IS TRUE
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Artifact object was not found.';
  END IF;
  SELECT revision.artifact_manifest_digest
  INTO STRICT v_manifest_digest
  FROM public.build_request_delivery_revisions AS revision
  WHERE revision.id = v_artifact.delivery_revision_id
    AND revision.request_id = v_artifact.request_id;
  SELECT request_case.terminal_at, request_case.moderation_state
  INTO v_terminal_at, v_moderation_state
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_artifact.request_id;
  v_retention_state := CASE
    WHEN v_moderation_state = 'held'
      OR EXISTS (
      SELECT 1 FROM public.build_request_retention_holds AS active_hold
      WHERE active_hold.request_id = v_artifact.request_id
        AND active_hold.released_at IS NULL
    ) THEN 'preserved_by_hold'
    WHEN v_terminal_at IS NOT NULL
      AND clock_timestamp() >= v_terminal_at + INTERVAL '90 days'
      THEN 'cleanup_eligible'
    ELSE 'retained'
  END;
  RETURN jsonb_build_object(
    'artifactId', v_artifact.id,
    'deliveryRevisionId', v_artifact.delivery_revision_id,
    'manifestDigest', v_manifest_digest,
    'objectIdentity', v_artifact.object_identity,
    'retentionState', v_retention_state,
    'accessUntil', CASE
      WHEN v_terminal_at IS NULL THEN NULL
      ELSE v_terminal_at + INTERVAL '90 days'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION
  private.request_summary_json_v1(UUID, UUID),
  private.request_retention_notices_v1(UUID, TEXT, TIMESTAMPTZ),
  private.request_event_page_json_v1(UUID, TEXT, INTEGER),
  private.request_held_event_page_json_v1(UUID),
  public.get_build_request_availability_v1(INTEGER),
  public.list_my_build_requests_v1(INTEGER, TEXT, INTEGER),
  public.list_build_request_queue_v1(INTEGER, TEXT, TEXT, INTEGER),
  public.list_build_request_eligible_assignees_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT, INTEGER
  ),
  public.list_build_request_pilot_admissions_v1(
    INTEGER, TEXT, TEXT, INTEGER
  ),
  public.resolve_build_request_delivery_revision_action_v1(
    INTEGER, UUID, UUID, UUID, TEXT
  ),
  public.list_build_request_events_v1(INTEGER, UUID, TEXT, INTEGER),
  public.get_build_request_v1(INTEGER, UUID),
  public.resolve_build_request_delivery_artifact_v1(INTEGER, UUID),
  public.resolve_build_request_delivery_artifact_object_v1(INTEGER, UUID, UUID)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION
  public.get_build_request_availability_v1(INTEGER)
TO anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.list_my_build_requests_v1(INTEGER, TEXT, INTEGER),
  public.list_build_request_queue_v1(INTEGER, TEXT, TEXT, INTEGER),
  public.list_build_request_eligible_assignees_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT, INTEGER
  ),
  public.list_build_request_pilot_admissions_v1(
    INTEGER, TEXT, TEXT, INTEGER
  ),
  public.list_build_request_events_v1(INTEGER, UUID, TEXT, INTEGER),
  public.get_build_request_v1(INTEGER, UUID),
  public.resolve_build_request_delivery_artifact_v1(INTEGER, UUID)
TO authenticated;
GRANT EXECUTE ON FUNCTION
  public.resolve_build_request_delivery_revision_action_v1(
    INTEGER, UUID, UUID, UUID, TEXT
  ),
  public.resolve_build_request_delivery_artifact_object_v1(INTEGER, UUID, UUID)
TO service_role;

REVOKE ALL ON FUNCTION
  private.request_canonical_json_v1(JSONB),
  private.request_cursor_encode_v1(TEXT, JSONB),
  private.request_cursor_decode_v1(TEXT, TEXT),
  private.request_pseudonym_text_v1(TEXT),
  private.request_account_pseudonym_v1(UUID),
  private.request_lock_available_actor_v1(UUID),
  private.request_event_digest_v1(),
  private.request_validate_pathforge_reference_v1(JSONB, BOOLEAN),
  private.request_allowed_close_reasons_v1(UUID, UUID),
  private.request_capabilities_v1(UUID, UUID),
  private.request_next_actions_v1(UUID, UUID),
  private.request_audit_cleanup_delete_allowed_v1(UUID),
  private.request_reject_append_only_change_v1(),
  private.request_guard_outbox_delivery_v1(),
  private.request_guard_delivery_revision_v1(),
  private.request_guard_assignment_separation_v1()
FROM PUBLIC, anon, authenticated, service_role;

END;
$request_authority_migration$;
