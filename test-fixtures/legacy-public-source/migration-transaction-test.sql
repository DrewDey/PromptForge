\set ON_ERROR_STOP on

SET request.jwt.claims = '{"role":"service_role"}';

CREATE TEMP TABLE legacy_source_test_state (
  builder UUID NOT NULL,
  administrator UUID NOT NULL,
  source_run_a UUID NOT NULL,
  source_run_b UUID NOT NULL,
  project_a UUID NOT NULL,
  project_b UUID NOT NULL,
  intake_a JSONB NOT NULL,
  intake_b JSONB NOT NULL,
  fork_b JSONB
);
GRANT SELECT ON legacy_source_test_state TO anon, authenticated;

DO $test$
DECLARE
  builder UUID := '11000000-0000-4000-8000-000000000001';
  administrator UUID := '11000000-0000-4000-8000-000000000002';
  source_run_a UUID := '33000000-0000-4000-8000-000000000001';
  source_run_b UUID := '33000000-0000-4000-8000-000000000002';
  project_a UUID := '33000000-0000-4000-8000-000000000003';
  project_b UUID := '33000000-0000-4000-8000-000000000004';
  shared_private_locator TEXT :=
    'https://chatgpt.com/c/6a208694-1e78-8327-8ec7-3b231b18169d';
  intake_a JSONB;
  intake_b JSONB;
  fork_b JSONB;
  result_record RECORD;
BEGIN
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (builder, 'user', 'legacy_builder', 'Legacy Builder'),
    (administrator, 'admin', 'legacy_admin', 'Legacy Admin');

  intake_a := jsonb_build_object(
    'author_id', builder,
    'title', 'Legacy parent source run',
    'source_url', shared_private_locator,
    'canonical_source_url', shared_private_locator,
    'file_name', NULL,
    'notes', 'Immutable private source evidence.',
    'source_package_file', 'seed-runs/legacy-parent.json',
    'source_package_sha256', repeat('a', 64),
    'intake_evidence', jsonb_build_object('schema_version', 1)
  );
  intake_b := jsonb_build_object(
    'author_id', builder,
    'title', 'Legacy child source run',
    'source_url', shared_private_locator,
    'canonical_source_url', shared_private_locator,
    'file_name', NULL,
    'notes', 'Distinct scoped evidence sharing the archival locator.',
    'source_package_file', 'seed-runs/legacy-child.json',
    'source_package_sha256', repeat('b', 64),
    'intake_evidence', jsonb_build_object('schema_version', 1)
  );
  fork_b := jsonb_build_object(
    'source_project_id', project_a,
    'source_project_title', 'Legacy parent source run',
    'source_model_variant_id', NULL,
    'source_run_id', source_run_a,
    'source_step_id', project_a::TEXT || ':' || source_run_a::TEXT || ':step:3',
    'source_step_number', 3,
    'source_artifact_path', 'public/artifacts/legacy-parent-step-3.html',
    'source_artifact_sha256', repeat('c', 64),
    'parent_fork_id', NULL,
    'prompt_family_id', 'legacy-family',
    'fork_depth', 1,
    'fork_branch_index', 0
  );
  intake_a := jsonb_set(
    intake_a,
    '{intake_evidence}',
    jsonb_build_object(
      'schema_version', 1,
      'provider', 'ChatGPT',
      'model_used', 'Legacy parent fixture',
      'model_settings', 'Fixture',
      'prompt_count', 1,
      'final_artifact_path', 'public/artifacts/legacy-parent-step-3.html',
      'final_artifact_sha256', repeat('c', 64),
      'profile_registry_id', 'legacy-builder',
      'verification_notes', '[]'::JSONB,
      'artifact_version_notes', '[]'::JSONB,
      'source_inspiration_notes', '[]'::JSONB,
      'fork', 'null'::JSONB
    )
  );
  intake_b := jsonb_set(
    intake_b,
    '{intake_evidence}',
    jsonb_build_object(
      'schema_version', 1,
      'provider', 'ChatGPT',
      'model_used', 'Legacy child fixture',
      'model_settings', 'Fixture',
      'prompt_count', 1,
      'final_artifact_path', 'public/artifacts/legacy-child-step-4.html',
      'final_artifact_sha256', repeat('d', 64),
      'profile_registry_id', 'legacy-builder',
      'verification_notes', '[]'::JSONB,
      'artifact_version_notes', '[]'::JSONB,
      'source_inspiration_notes', '[]'::JSONB,
      'fork', fork_b
    )
  );

  SELECT * INTO result_record
  FROM public.import_legacy_prepared_source_run(
    source_run_a, project_a, intake_a, NULL
  );
  IF result_record.source_run_id <> source_run_a
    OR result_record.status <> 'queued'
    OR NOT result_record.inserted THEN
    RAISE EXCEPTION 'The first legacy import did not return its inserted queued row.';
  END IF;

  SELECT * INTO result_record
  FROM public.import_legacy_prepared_source_run(
    source_run_b, project_b, intake_b, fork_b
  );
  IF result_record.source_run_id <> source_run_b
    OR result_record.status <> 'queued'
    OR NOT result_record.inserted THEN
    RAISE EXCEPTION 'The forked legacy import did not return its inserted queued row.';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.source_run_submissions
    WHERE source_url = shared_private_locator
      AND source_visibility = 'review_only'
      AND source_publication_consent_at IS NULL
  ) <> 2 THEN
    RAISE EXCEPTION 'Distinct source-run identities could not preserve one shared private locator.';
  END IF;

  SELECT * INTO result_record
  FROM public.import_legacy_prepared_source_run(
    source_run_b, project_b, intake_b, fork_b
  );
  IF result_record.inserted OR result_record.source_run_id <> source_run_b THEN
    RAISE EXCEPTION 'An exact repeated legacy import was not idempotent.';
  END IF;

  BEGIN
    PERFORM public.import_legacy_prepared_source_run(
      source_run_b, project_a, intake_b, fork_b
    );
    RAISE EXCEPTION 'An exact repeated legacy import changed its prepared-project binding.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'An exact repeated legacy import changed its prepared-project binding.'
        OR SQLERRM <> 'Source-run identity is bound to a different prepared project.' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM public.import_legacy_prepared_source_run(
      source_run_b,
      project_b,
      jsonb_set(intake_b, '{title}', '"Changed evidence"'),
      fork_b
    );
    RAISE EXCEPTION 'A repeated source-run identity accepted different evidence.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A repeated source-run identity accepted different evidence.'
        OR SQLERRM <> 'Source-run identity already belongs to different immutable evidence.' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    DELETE FROM public.profiles WHERE id = builder;
    RAISE EXCEPTION 'Deleting a legacy builder cascaded away immutable imported evidence.';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
  IF (
    SELECT COUNT(*)
    FROM public.source_run_submissions
    WHERE id IN (source_run_a, source_run_b)
  ) <> 2 THEN
    RAISE EXCEPTION 'The narrow import ledger did not retain both immutable source runs.';
  END IF;

  BEGIN
    INSERT INTO public.source_run_submissions (
      id, title, source_url, author_id, source_visibility, status
    ) VALUES (
      gen_random_uuid(),
      'Direct private service insert',
      shared_private_locator,
      builder,
      'review_only',
      'queued'
    );
    RAISE EXCEPTION 'A direct service insert bypassed the legacy import lane.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A direct service insert bypassed the legacy import lane.'
        OR SQLERRM <> 'Use a supported public provider share link without a query string or fragment. Private conversation URLs are not accepted.' THEN
        RAISE;
      END IF;
  END;

  INSERT INTO legacy_source_test_state VALUES (
    builder,
    administrator,
    source_run_a,
    source_run_b,
    project_a,
    project_b,
    intake_a,
    intake_b,
    fork_b
  );
END;
$test$;

SET ROLE authenticated;
SET request.jwt.claims =
  '{"role":"authenticated","sub":"11000000-0000-4000-8000-000000000001"}';
DO $test$
BEGIN
  BEGIN
    PERFORM public.import_legacy_prepared_source_run(
      (SELECT source_run_a FROM legacy_source_test_state),
      (SELECT project_a FROM legacy_source_test_state),
      (SELECT intake_a FROM legacy_source_test_state),
      NULL
    );
    RAISE EXCEPTION 'An authenticated client invoked the service-only legacy importer.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.source_run_submissions (
      title, source_url, author_id, source_visibility, status
    ) VALUES (
      'Private browser intake',
      'https://claude.ai/chat/private-browser-session',
      (SELECT builder FROM legacy_source_test_state),
      'review_only',
      'queued'
    );
    RAISE EXCEPTION 'Ordinary browser intake accepted a private provider locator.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Ordinary browser intake accepted a private provider locator.'
        OR SQLERRM <> 'Use a supported public provider share link without a query string or fragment. Private conversation URLs are not accepted.' THEN
        RAISE;
      END IF;
  END;
END;
$test$;
RESET ROLE;

SET request.jwt.claims = '{"role":"service_role"}';
DO $test$
DECLARE
  link_id UUID;
  ordinary_source_run UUID := '22000000-0000-4000-8000-000000000001';
  ordinary_missing_consent UUID := '22000000-0000-4000-8000-000000000002';
  ordinary_project UUID := '22000000-0000-4000-8000-000000000003';
  published_project UUID;
BEGIN
  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'source_run_public_share_links'
      AND column_name = 'source_run_id'
  ) <> 'uuid' THEN
    RAISE EXCEPTION 'Public source-link identity is not structurally UUID typed.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.source_run_public_share_links'::REGCLASS
      AND contype = 'f'
      AND confrelid = 'public.source_run_submissions'::REGCLASS
  ) THEN
    RAISE EXCEPTION 'Public source links are not anchored to source-run submissions.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.source_run_submissions'::REGCLASS
      AND conname = 'source_run_submissions_author_id_fkey'
      AND confdeltype = 'c'
  ) THEN
    RAISE EXCEPTION 'The migration unexpectedly changed global source-run account deletion.';
  END IF;

  INSERT INTO public.source_run_submissions (
    id,
    title,
    source_url,
    source_visibility,
    source_publication_consent_at,
    author_id,
    status
  ) VALUES (
    ordinary_source_run,
    'Ordinary consented source run',
    'https://chatgpt.com/share/ordinary-consented-source',
    'public',
    NOW() - INTERVAL '2 minutes',
    (SELECT builder FROM legacy_source_test_state),
    'queued'
  );

  published_project := public.publish_prepared_showcase_source_run(
    ordinary_source_run,
    '{}'::JSONB,
    NULL,
    jsonb_build_object('id', ordinary_project)
  );
  IF published_project IS DISTINCT FROM ordinary_project THEN
    RAISE EXCEPTION 'Ordinary consented intake did not reach the prepared publisher.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.read_public_source_run_share_link(
      ordinary_project,
      ordinary_source_run
    )
  ) THEN
    RAISE EXCEPTION 'Ordinary publication exposed an unverified provider-link projection.';
  END IF;

  INSERT INTO public.prompts (
    id,
    title,
    description,
    content,
    difficulty,
    status,
    author_id
  ) VALUES (
    ordinary_project,
    'Ordinary prepared project',
    'Fixture',
    'Fixture',
    'beginner',
    'approved',
    (SELECT builder FROM legacy_source_test_state)
  );
  UPDATE public.source_run_submissions
  SET status = 'draft_created',
      extracted_prompt_id = ordinary_project
  WHERE id = ordinary_source_run;

  link_id := public.register_source_run_public_share_link(
    ordinary_source_run,
    ordinary_project,
    'https://chatgpt.com/share/ordinary-consented-source',
    'openai',
    NOW() - INTERVAL '2 minutes',
    NOW() - INTERVAL '1 minute',
    (SELECT administrator FROM legacy_source_test_state),
    'public_exact'
  );
  IF link_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.read_public_source_run_share_link(
      ordinary_project,
      ordinary_source_run
    )
  ) THEN
    RAISE EXCEPTION 'Ordinary publication could not append its verified provider-link projection.';
  END IF;

  INSERT INTO public.source_run_submissions (
    id,
    title,
    source_url,
    source_visibility,
    source_publication_consent_at,
    author_id,
    status
  ) VALUES (
    ordinary_missing_consent,
    'Ordinary source run missing consent',
    'https://chatgpt.com/share/ordinary-missing-consent',
    'review_only',
    NULL,
    (SELECT builder FROM legacy_source_test_state),
    'queued'
  );
  BEGIN
    PERFORM public.publish_prepared_showcase_source_run(
      ordinary_missing_consent,
      '{}'::JSONB,
      NULL,
      jsonb_build_object(
        'id',
        '22000000-0000-4000-8000-000000000004'::UUID
      )
    );
    RAISE EXCEPTION 'Ordinary intake published without public-link consent.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Ordinary intake published without public-link consent.'
        OR SQLERRM <> 'Prepared publication requires explicit consent for the public source link.' THEN
        RAISE;
      END IF;
  END;

  IF public.check_source_run_public_share_for_publication(
    (SELECT project_a FROM legacy_source_test_state),
    (SELECT source_run_a FROM legacy_source_test_state)
  ) THEN
    RAISE EXCEPTION 'A review-only legacy run passed publication before public-share registration.';
  END IF;
  BEGIN
    PERFORM public.publish_prepared_showcase_source_run(
      (SELECT source_run_a FROM legacy_source_test_state),
      (SELECT intake_a FROM legacy_source_test_state),
      NULL,
      jsonb_build_object('id', (SELECT project_a FROM legacy_source_test_state))
    );
    RAISE EXCEPTION 'The prepared publisher accepted a legacy run before public-share registration.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'The prepared publisher accepted a legacy run before public-share registration.'
        OR SQLERRM <> 'Prepared publication requires a separately consented and anonymously verified public source link.' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM public.register_source_run_public_share_link(
      (SELECT source_run_a FROM legacy_source_test_state),
      (SELECT project_a FROM legacy_source_test_state),
      'https://chatgpt.com/c/private-account-session',
      'openai',
      NOW() - INTERVAL '2 minutes',
      NOW() - INTERVAL '1 minute',
      (SELECT administrator FROM legacy_source_test_state),
      'public_exact'
    );
    RAISE EXCEPTION 'A private provider locator entered the public-share registry.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A private provider locator entered the public-share registry.'
        OR SQLERRM <> 'Public source-link registration is incomplete or invalid.' THEN
        RAISE;
      END IF;
  END;

  link_id := public.register_source_run_public_share_link(
    (SELECT source_run_a FROM legacy_source_test_state),
    (SELECT project_a FROM legacy_source_test_state),
    'https://chatgpt.com/share/6a201fb5-4a20-832e-9d7d-38a4e7207a50',
    'openai',
    NOW() - INTERVAL '2 minutes',
    NOW() - INTERVAL '1 minute',
    (SELECT administrator FROM legacy_source_test_state),
    'public_exact'
  );
  IF link_id IS NULL OR NOT public.check_source_run_public_share_for_publication(
    (SELECT project_a FROM legacy_source_test_state),
    (SELECT source_run_a FROM legacy_source_test_state)
  ) OR public.check_source_run_public_share_for_publication(
    (SELECT project_b FROM legacy_source_test_state),
    (SELECT source_run_a FROM legacy_source_test_state)
  ) THEN
    RAISE EXCEPTION 'The exact project/source-run publication gate is not fail closed.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions
    WHERE id = (SELECT source_run_a FROM legacy_source_test_state)
      AND source_visibility = 'review_only'
      AND source_publication_consent_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Public-share registration mutated immutable legacy intake visibility or consent.';
  END IF;
  IF public.publish_prepared_showcase_source_run(
    (SELECT source_run_a FROM legacy_source_test_state),
    (SELECT intake_a FROM legacy_source_test_state),
    NULL,
    jsonb_build_object('id', (SELECT project_a FROM legacy_source_test_state))
  ) <> (SELECT project_a FROM legacy_source_test_state) THEN
    RAISE EXCEPTION 'The exact share gate did not hand the review-only run to the prepared publisher.';
  END IF;
  BEGIN
    PERFORM public.publish_prepared_showcase_source_run(
      (SELECT source_run_b FROM legacy_source_test_state),
      (SELECT intake_b FROM legacy_source_test_state),
      (SELECT fork_b FROM legacy_source_test_state),
      jsonb_build_object('id', (SELECT project_b FROM legacy_source_test_state))
    );
    RAISE EXCEPTION 'The prepared publisher accepted a legacy run with no public-share row.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'The prepared publisher accepted a legacy run with no public-share row.'
        OR SQLERRM <> 'Prepared publication requires a separately consented and anonymously verified public source link.' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM public.import_legacy_prepared_source_run(
      (SELECT source_run_a FROM legacy_source_test_state),
      (SELECT project_b FROM legacy_source_test_state),
      (SELECT intake_a FROM legacy_source_test_state),
      NULL
    );
    RAISE EXCEPTION 'Legacy import ignored an active public-link project mismatch.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Legacy import ignored an active public-link project mismatch.'
        OR SQLERRM <> 'The active public source link belongs to a different prepared project.' THEN
        RAISE;
      END IF;
  END;

  INSERT INTO public.prompts (
    id, title, description, content, difficulty, status, author_id
  ) VALUES
    (
      (SELECT project_a FROM legacy_source_test_state),
      'Legacy exact project',
      'Approved project with a separate exact public source.',
      'Build the exact legacy project.',
      'beginner',
      'approved',
      (SELECT builder FROM legacy_source_test_state)
    ),
    (
      (SELECT project_b FROM legacy_source_test_state),
      'Legacy missing-link project',
      'Approved project without a matching public source record.',
      'Build the missing-link legacy project.',
      'beginner',
      'approved',
      (SELECT builder FROM legacy_source_test_state)
    );

  UPDATE public.source_run_submissions
  SET status = 'draft_created',
      extracted_prompt_id = (SELECT project_a FROM legacy_source_test_state)
  WHERE id = (SELECT source_run_a FROM legacy_source_test_state);
  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions
    WHERE id = (SELECT source_run_a FROM legacy_source_test_state)
      AND status = 'draft_created'
      AND extracted_prompt_id = (SELECT project_a FROM legacy_source_test_state)
      AND source_visibility = 'review_only'
      AND source_publication_consent_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The separate public-share gate did not hand off a review-only legacy run.';
  END IF;

  BEGIN
    UPDATE public.source_run_submissions
    SET status = 'draft_created',
        extracted_prompt_id = (SELECT project_b FROM legacy_source_test_state)
    WHERE id = (SELECT source_run_b FROM legacy_source_test_state);
    RAISE EXCEPTION 'Prepared publication bypassed the separate public-share gate.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Prepared publication bypassed the separate public-share gate.'
        OR SQLERRM <> 'Prepared publication requires a separately consented and anonymously verified public source link.' THEN
        RAISE;
      END IF;
  END;
END;
$test$;

SET ROLE anon;
SET request.jwt.claims = '{"role":"anon"}';
DO $test$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.read_public_source_run_share_link(
      (SELECT project_a FROM legacy_source_test_state),
      (SELECT source_run_a FROM legacy_source_test_state)
    )
  ) <> 1 THEN
    RAISE EXCEPTION 'The exact approved public-share projection was not readable.';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.read_public_source_run_share_link(
      (SELECT project_b FROM legacy_source_test_state),
      (SELECT source_run_b FROM legacy_source_test_state)
    )
  ) <> 0 THEN
    RAISE EXCEPTION 'A missing public-share record projected a provider link.';
  END IF;

  BEGIN
    PERFORM COUNT(*) FROM public.source_run_public_share_links;
    RAISE EXCEPTION 'Anonymous readers accessed the raw public-share evidence table.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM source_url FROM public.project_model_variants;
    RAISE EXCEPTION 'Anonymous readers retained model-variant private source locators.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
RESET ROLE;

SET request.jwt.claims = '{"role":"service_role"}';
DO $test$
BEGIN
  PERFORM public.revoke_source_run_public_share_link(
    (SELECT source_run_a FROM legacy_source_test_state),
    (SELECT administrator FROM legacy_source_test_state),
    'Provider share was withdrawn during the disposable test.'
  );
  IF (
    SELECT COUNT(*)
    FROM public.read_public_source_run_share_link(
      (SELECT project_a FROM legacy_source_test_state),
      (SELECT source_run_a FROM legacy_source_test_state)
    )
  ) <> 0 THEN
    RAISE EXCEPTION 'A revoked provider share remained publicly projected.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.prompts
    WHERE id = (SELECT project_a FROM legacy_source_test_state)
      AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'A missing provider link broke the existing approved project.';
  END IF;
  BEGIN
    DELETE FROM public.source_run_public_share_links
    WHERE source_run_id = (SELECT source_run_a FROM legacy_source_test_state);
    RAISE EXCEPTION 'Revoked public-link evidence was deleted instead of retained.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Revoked public-link evidence was deleted instead of retained.'
        OR SQLERRM <> 'Public source-link evidence is retained; revoke it instead.' THEN
        RAISE;
      END IF;
  END;
END;
$test$;
