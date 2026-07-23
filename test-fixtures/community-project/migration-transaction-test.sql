\set ON_ERROR_STOP on

SET request.jwt.claims = '{"role":"service_role"}';

CREATE TEMP TABLE test_state (
  builder UUID,
  stranger UUID,
  administrator UUID,
  submission UUID,
  prompt UUID,
  report UUID,
  legacy_source UUID,
  legacy_repair UUID,
  fork_submission UUID,
  fork_prompt UUID,
  fork_artifact_path TEXT,
  artifact_path TEXT
);
GRANT SELECT ON test_state TO anon, authenticated;

DO $test$
DECLARE
  builder UUID := '10000000-0000-4000-8000-000000000001';
  stranger UUID := '10000000-0000-4000-8000-000000000002';
  administrator UUID := '10000000-0000-4000-8000-000000000003';
  artifact TEXT := builder::TEXT || '/20000000-0000-4000-8000-000000000001.html.txt';
  submission UUID;
  legacy_source UUID := '30000000-0000-4000-8000-000000000001';
  payload JSONB;
BEGIN
  INSERT INTO public.profiles (id, role, username, display_name) VALUES
    (builder, 'user', 'pilot_builder', 'Pilot Builder'),
    (stranger, 'user', 'unrelated_user', 'Unrelated User'),
    (administrator, 'admin', 'pilot_admin', 'Pilot Admin');

  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_pilot_controls
    WHERE singleton
      AND allow_internal_acceptance_submissions
      AND NOT allow_invited_submissions
      AND NOT allow_publication
  ) THEN
    RAISE EXCEPTION 'The production-safe internal controls did not default closed.';
  END IF;
  IF private.pathforge_actor_can_submit_community_project(builder) THEN
    RAISE EXCEPTION 'A fresh non-admin became eligible before admission.';
  END IF;

  PERFORM public.set_community_project_pilot_member(
    stranger, administrator, TRUE, 'invited_builder', 'External cohort remains locked'
  );
  IF private.pathforge_actor_can_submit_community_project(stranger) THEN
    RAISE EXCEPTION 'An invited builder bypassed the locked external invitation control.';
  END IF;

  INSERT INTO public.source_run_submissions (
    id, title, source_url, notes, fork_source_project_id,
    fork_source_project_title, fork_source_step_id, fork_source_step_number,
    prompt_family_id, fork_depth, fork_branch_index, author_id, status
  ) VALUES (
    legacy_source,
    'Historical repair source',
    'https://chatgpt.com/share/historical-repair',
    'Historical source-run record',
    '40000000-0000-4000-8000-000000000001',
    'Historical parent project',
    '40000000-0000-4000-8000-000000000002',
    2,
    'historical-family',
    1,
    3,
    builder,
    'needs_repair'
  );

  PERFORM public.set_community_project_pilot_member(
    builder, administrator, TRUE, 'internal_acceptance', 'Disposable transaction test'
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.community_project_pilot_members
    WHERE user_id = builder
      AND active
      AND member_kind = 'internal_acceptance'
      AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'The expiring internal acceptance account did not become active.';
  END IF;
  IF NOT private.pathforge_actor_can_submit_community_project(builder) THEN
    RAISE EXCEPTION 'The admitted internal acceptance account remained ineligible.';
  END IF;

  BEGIN
    PERFORM public.set_community_project_pilot_member(
      stranger, administrator, TRUE, 'internal_acceptance', 'Must exceed the single-account cap'
    );
    RAISE EXCEPTION 'A second internal acceptance account bypassed the cap.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A second internal acceptance account bypassed the cap.'
        OR SQLERRM <> 'Only one owner-operated internal acceptance account may be active.' THEN
        RAISE;
      END IF;
  END;

  UPDATE public.community_project_pilot_members
  SET expires_at = NOW() - INTERVAL '1 minute'
  WHERE user_id = builder;
  IF private.pathforge_actor_can_submit_community_project(builder) THEN
    RAISE EXCEPTION 'An expired internal acceptance account remained eligible.';
  END IF;
  PERFORM public.set_community_project_pilot_member(
    builder, administrator, TRUE, 'internal_acceptance', 'Renewed disposable transaction test'
  );

  INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES ('community-project-quarantine', artifact, '{"mimetype":"text/plain"}');

  payload := jsonb_build_object(
    'title', 'Disposable community project',
    'summary', 'A safe disposable project used to prove the complete publication transaction.',
    'category_slug', 'personal',
    'difficulty', 'beginner',
    'provider', 'ChatGPT',
    'model', 'Builder reported model',
    'model_settings', '',
    'evidence_scope', 'selected_excerpts',
    'source_url', '',
    'source_visibility', 'review_only',
    'build_steps', jsonb_build_array(jsonb_build_object(
      'title', 'Build checkpoint',
      'prompt', 'Create a safe one-file interactive counter.',
      'response', 'Created a one-file counter with no network dependency.'
    )),
    'artifact_path', artifact,
    'artifact_original_name', 'safe-counter.html',
    'artifact_sha256', repeat('a', 64),
    'artifact_size_bytes', 512,
    'artifact_scan', jsonb_build_object(
      'passed', TRUE,
      'scanner_version', 'html-static-v2',
      'scanned_at', NOW(),
      'sha256', repeat('a', 64),
      'byte_length', 512,
      'findings', '[]'::JSONB
    ),
    'submitter_role', 'builder',
    'reuse_permission', 'allow_pathforge_remix',
    'terms_version', '2026-07-22-pilot-v1',
    'privacy_version', '2026-07-22-pilot-v1',
    'builder_attested_at', NOW(),
    'profile_attribution_attested_at', NOW(),
    'rights_attested_at', NOW(),
    'privacy_attested_at', NOW(),
    'publication_consent_at', NOW(),
    'fork', NULL
  );

  BEGIN
    PERFORM public.create_community_project_submission(
      builder,
      jsonb_set(
        jsonb_set(
          payload,
          '{source_url}',
          to_jsonb('https://chatgpt.com/share/private-query?token=secret'::TEXT)
        ),
        '{source_visibility}',
        to_jsonb('public'::TEXT)
      ),
      gen_random_uuid()
    );
    RAISE EXCEPTION 'A community source URL retained query-string material.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A community source URL retained query-string material.'
        OR SQLERRM <> 'Use a public ChatGPT, Claude, or Gemini share link without a query string or fragment. Private conversation URLs are not accepted.' THEN
        RAISE;
      END IF;
  END;

  submission := public.create_community_project_submission(
    builder, payload, gen_random_uuid()
  );
  INSERT INTO test_state (
    builder, stranger, administrator, submission, legacy_source, artifact_path
  ) VALUES (
    builder, stranger, administrator, submission, legacy_source, artifact
  );
END;
$test$;

DO $test$
DECLARE
  administrator UUID := (SELECT test_state.administrator FROM test_state);
  candidate UUID;
  overflow_candidate UUID := gen_random_uuid();
BEGIN
  FOR member_index IN 1..29 LOOP
    candidate := gen_random_uuid();
    INSERT INTO public.profiles (id, role, username, display_name)
    VALUES (
      candidate,
      'user',
      'cap_user_' || LPAD(member_index::TEXT, 2, '0'),
      'Cap user ' || member_index
    );
    PERFORM public.set_community_project_pilot_member(
      candidate, administrator, TRUE, 'invited_builder', 'Invitation cap fixture'
    );
  END LOOP;

  INSERT INTO public.profiles (id, role, username, display_name)
  VALUES (overflow_candidate, 'user', 'cap_user_31', 'Cap user 31');
  BEGIN
    PERFORM public.set_community_project_pilot_member(
      overflow_candidate, administrator, TRUE, 'invited_builder', 'Must exceed invitation cap'
    );
    RAISE EXCEPTION 'A thirty-first invited builder bypassed the cap.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A thirty-first invited builder bypassed the cap.'
        OR SQLERRM <> 'The invitation-only pilot is capped at 30 active non-admin members.' THEN
        RAISE;
      END IF;
  END;

  IF (
    SELECT COUNT(*)
    FROM public.community_project_pilot_members
    WHERE active AND member_kind = 'invited_builder'
  ) <> 30 THEN
    RAISE EXCEPTION 'The external invited-builder cap fixture is not exactly 30.';
  END IF;
END;
$test$;

SET ROLE authenticated;
SET request.jwt.claims = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}';
DO $test$
DECLARE
  compatible_source_run UUID;
BEGIN
  IF (SELECT COUNT(id) FROM public.community_project_submissions) <> 1 THEN
    RAISE EXCEPTION 'The owner cannot read exactly their own submission.';
  END IF;
  IF (SELECT COUNT(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'The owner can read a quarantined artifact through Storage.';
  END IF;
  IF NOT public.community_project_pilot_eligible() THEN
    RAISE EXCEPTION 'The internal acceptance owner is not eligible.';
  END IF;
  BEGIN
    PERFORM public.create_community_project_submission(NULL, '{}'::JSONB, gen_random_uuid());
    RAISE EXCEPTION 'Authenticated role invoked the service-only submission function.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO public.source_run_submissions (
    title, source_url, notes, fork_source_project_id,
    fork_source_project_title, fork_source_step_id, fork_source_step_number,
    prompt_family_id, fork_depth, fork_branch_index, author_id, status
  ) VALUES (
    'Compatible queued source run',
    'https://chatgpt.com/share/compatible-queue',
    'Queue-only compatibility fixture',
    '40000000-0000-4000-8000-000000000010',
    'Prepared source project',
    'prepared-source-project:run:step:2',
    2,
    'prepared-source-family',
    1,
    0,
    '10000000-0000-4000-8000-000000000001',
    'queued'
  ) RETURNING id INTO compatible_source_run;
  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions
    WHERE id = compatible_source_run
      AND author_id = '10000000-0000-4000-8000-000000000001'
      AND status = 'queued'
      AND extracted_prompt_id IS NULL
      AND admin_notes IS NULL
      AND canonical_source_url IS NULL
      AND source_package_file IS NULL
      AND source_package_sha256 IS NULL
      AND intake_evidence IS NULL
  ) THEN
    RAISE EXCEPTION 'Authenticated queue-only source-run compatibility insert was not preserved.';
  END IF;
  BEGIN
    INSERT INTO public.source_run_submissions (
      title, source_url, author_id, status
    ) VALUES (
      'Forged source-run owner',
      'https://chatgpt.com/share/forged-owner',
      '10000000-0000-4000-8000-000000000002',
      'queued'
    );
    RAISE EXCEPTION 'Authenticated source-run intake forged another owner.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Authenticated source-run intake forged another owner.' THEN
        RAISE;
      END IF;
  END;
  BEGIN
    INSERT INTO public.source_run_submissions (
      title, source_url, resubmission_of_id, author_id, status
    ) VALUES (
      'Forged browser repair',
      'https://chatgpt.com/share/forged-browser-repair',
      (SELECT legacy_source FROM test_state),
      '10000000-0000-4000-8000-000000000001',
      'queued'
    );
    RAISE EXCEPTION 'Authenticated source-run intake bypassed the service-only repair boundary.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Authenticated source-run intake bypassed the service-only repair boundary.' THEN
        RAISE;
      END IF;
  END;
  BEGIN
    INSERT INTO public.prompts (title) VALUES ('Forbidden direct project');
    RAISE EXCEPTION 'Authenticated role inserted a legacy prompt directly.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.prompt_steps (prompt_id, step_number, title, content)
    VALUES (gen_random_uuid(), 1, 'Forbidden', 'Forbidden direct step');
    RAISE EXCEPTION 'Authenticated role inserted a legacy prompt step directly.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM review_notes FROM public.community_project_submissions;
    RAISE EXCEPTION 'Owner read internal reviewer notes through the raw table.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM COUNT(*) FROM public.community_project_events;
    RAISE EXCEPTION 'Owner read private lifecycle events through the raw table.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claims = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000002"}';
DO $test$
BEGIN
  IF (SELECT COUNT(id) FROM public.community_project_submissions) <> 0 THEN
    RAISE EXCEPTION 'An unrelated member can read another owner submission.';
  END IF;
  IF public.community_project_pilot_eligible() THEN
    RAISE EXCEPTION 'A member of the locked external cohort became eligible.';
  END IF;
END;
$test$;
RESET ROLE;

SET request.jwt.claims = '{"role":"service_role"}';
UPDATE test_state
SET legacy_repair = public.create_legacy_source_run_repair(
  legacy_source,
  builder,
  'Historical repair replacement',
  'https://chatgpt.com/share/historical-repair-v2',
  'Provider: ChatGPT\nModel used: Not sure',
  gen_random_uuid()
);

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions AS repair
    JOIN public.source_run_submissions AS prior
      ON prior.id = repair.resubmission_of_id
    WHERE repair.id = (SELECT legacy_repair FROM test_state)
      AND repair.author_id = (SELECT builder FROM test_state)
      AND repair.status = 'queued'
      AND ROW(
        repair.fork_source_project_id,
        repair.fork_source_project_title,
        repair.fork_source_step_id,
        repair.fork_source_step_number,
        repair.prompt_family_id,
        repair.fork_depth,
        repair.fork_branch_index
      ) IS NOT DISTINCT FROM ROW(
        prior.fork_source_project_id,
        prior.fork_source_project_title,
        prior.fork_source_step_id,
        prior.fork_source_step_number,
        prior.prompt_family_id,
        prior.fork_depth,
        prior.fork_branch_index
      )
  ) THEN
    RAISE EXCEPTION 'Legacy repair RPC did not preserve the locked prior lineage.';
  END IF;
END;
$test$;

DO $test$
DECLARE
  run_id UUID := gen_random_uuid();
BEGIN
  BEGIN
    PERFORM public.publish_community_project_submission(
      (SELECT submission FROM test_state),
      (SELECT administrator FROM test_state),
      FALSE,
      '{"artifact_reviewed":true,"evidence_reviewed":true,"privacy_rights_reviewed":true,"public_truth_reviewed":true,"moderation_reviewed":true}'::JSONB,
      'This complete review must still fail while publication readiness is closed.',
      gen_random_uuid()
    );
    RAISE EXCEPTION 'Publication bypassed the default-closed readiness control.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Publication bypassed the default-closed readiness control.'
        OR SQLERRM <> 'Community project publication is paused until fresh reconciliation and report-intake proofs pass.' THEN
        RAISE;
      END IF;
  END;

  IF NOT public.begin_community_project_reconciliation(run_id, 55) THEN
    RAISE EXCEPTION 'Readiness reconciliation lease was not acquired.';
  END IF;
  PERFORM public.finish_community_project_reconciliation(
    run_id, TRUE, NULL, '{"driftCount":0,"readinessProbe":true}'::JSONB
  );

  BEGIN
    PERFORM public.set_community_project_publication_control(
      (SELECT administrator FROM test_state), TRUE
    );
    RAISE EXCEPTION 'Publication enabled without a report-intake proof.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Publication enabled without a report-intake proof.'
        OR SQLERRM <> 'Publication requires fresh successful reconciliation and report-intake readiness proofs.' THEN
        RAISE;
      END IF;
  END;

  PERFORM public.record_community_project_report_readiness(
    (SELECT administrator FROM test_state),
    repeat('e', 64),
    gen_random_uuid()
  );
  PERFORM public.set_community_project_publication_control(
    (SELECT administrator FROM test_state), TRUE
  );
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_pilot_controls
    WHERE singleton AND allow_publication
  ) THEN
    RAISE EXCEPTION 'Publication did not enable after both readiness proofs.';
  END IF;
END;
$test$;

DO $test$
BEGIN
  BEGIN
    PERFORM public.publish_community_project_submission(
      (SELECT submission FROM test_state),
      (SELECT administrator FROM test_state),
      FALSE,
      '{}'::JSONB,
      'This deliberately incomplete review must fail closed.',
      gen_random_uuid()
    );
    RAISE EXCEPTION 'Publication accepted an incomplete human review checklist.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Publication accepted an incomplete human review checklist.'
        OR SQLERRM <> 'Complete every required human review check before publication.' THEN
        RAISE;
      END IF;
  END;
END;
$test$;

UPDATE test_state
SET prompt = public.publish_community_project_submission(
  submission,
  administrator,
  FALSE,
  '{"artifact_reviewed":true,"evidence_reviewed":true,"privacy_rights_reviewed":true,"public_truth_reviewed":true,"moderation_reviewed":true}'::JSONB,
  'Fixture artifact, scoped evidence, consent, public claims, and moderation rules reviewed.',
  gen_random_uuid()
);

DO $test$
BEGIN
  IF (SELECT COUNT(*) FROM public.community_project_publication_drift()) <> 0 THEN
    RAISE EXCEPTION 'Publication drift exists immediately after publish.';
  END IF;
  IF (SELECT COUNT(*) FROM public.prompt_steps) <> 1 THEN
    RAISE EXCEPTION 'Publication did not atomically create the evidence checkpoint.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_submissions
    WHERE review_checklist_version = '2026-07-22-pilot-review-v1'
      AND review_checklist->'artifact_reviewed' = 'true'::JSONB
      AND LENGTH(review_notes) >= 20
  ) THEN
    RAISE EXCEPTION 'Publication did not persist the human review proof.';
  END IF;
END;
$test$;

SET ROLE authenticated;
SET request.jwt.claims = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000003"}';
DO $test$
DECLARE
  protected_field TEXT;
BEGIN
  FOREACH protected_field IN ARRAY ARRAY[
    'status', 'title', 'tags', 'content', 'category_id', 'difficulty', 'model_used'
  ] LOOP
    BEGIN
      CASE protected_field
        WHEN 'status' THEN
          UPDATE public.prompts SET status = 'rejected'
          WHERE id = (SELECT prompt FROM test_state);
        WHEN 'title' THEN
          UPDATE public.prompts SET title = 'Unreviewed replacement title'
          WHERE id = (SELECT prompt FROM test_state);
        WHEN 'tags' THEN
          UPDATE public.prompts SET tags = ARRAY['rewritten']::TEXT[]
          WHERE id = (SELECT prompt FROM test_state);
        WHEN 'content' THEN
          UPDATE public.prompts SET content = 'Unreviewed replacement content'
          WHERE id = (SELECT prompt FROM test_state);
        WHEN 'category_id' THEN
          UPDATE public.prompts SET category_id = NULL
          WHERE id = (SELECT prompt FROM test_state);
        WHEN 'difficulty' THEN
          UPDATE public.prompts SET difficulty = 'advanced'
          WHERE id = (SELECT prompt FROM test_state);
        WHEN 'model_used' THEN
          UPDATE public.prompts SET model_used = 'Unreviewed replacement model'
          WHERE id = (SELECT prompt FROM test_state);
      END CASE;
      RAISE EXCEPTION 'Generic admin mutation changed reviewed community field %.', protected_field;
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM = format('Generic admin mutation changed reviewed community field %s.', protected_field)
          OR SQLERRM <> 'Community project reviewed fields must use the community review, publication, or removal workflow.' THEN
          RAISE;
        END IF;
    END;
  END LOOP;
END;
$test$;
RESET ROLE;
SET request.jwt.claims = '{"role":"service_role"}';

DO $test$
DECLARE
  builder UUID := (SELECT test_state.builder FROM test_state);
  source_prompt UUID := (SELECT test_state.prompt FROM test_state);
  source_step UUID;
  fork_artifact TEXT := builder::TEXT || '/20000000-0000-4000-8000-000000000002.html.txt';
  fork_payload JSONB;
  created_fork UUID;
BEGIN
  SELECT id INTO source_step
  FROM public.prompt_steps
  WHERE prompt_id = source_prompt AND step_number = 1;

  INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES ('community-project-quarantine', fork_artifact, '{"mimetype":"text/plain"}');

  fork_payload := jsonb_build_object(
    'title', 'Disposable verified fork',
    'summary', 'A second safe disposable project used to prove authoritative fork resolution.',
    'category_slug', 'personal',
    'difficulty', 'beginner',
    'provider', 'Claude',
    'model', 'Builder reported fork model',
    'model_settings', '',
    'evidence_scope', 'selected_excerpts',
    'source_url', '',
    'source_visibility', 'review_only',
    'build_steps', jsonb_build_array(jsonb_build_object(
      'title', 'Fork checkpoint',
      'prompt', 'Adapt the published community counter.',
      'response', 'Adapted it without any external dependency.'
    )),
    'artifact_path', fork_artifact,
    'artifact_original_name', 'safe-fork.html',
    'artifact_sha256', repeat('c', 64),
    'artifact_size_bytes', 384,
    'artifact_scan', jsonb_build_object(
      'passed', TRUE,
      'scanner_version', 'html-static-v2',
      'scanned_at', NOW(),
      'sha256', repeat('c', 64),
      'byte_length', 384,
      'findings', '[]'::JSONB
    ),
    'submitter_role', 'builder',
    'reuse_permission', 'view_only',
    'terms_version', '2026-07-22-pilot-v1',
    'privacy_version', '2026-07-22-pilot-v1',
    'builder_attested_at', NOW(),
    'profile_attribution_attested_at', NOW(),
    'rights_attested_at', NOW(),
    'privacy_attested_at', NOW(),
    'publication_consent_at', NOW(),
    'fork', jsonb_build_object(
      'source_project_id', source_prompt,
      'source_step_id', source_step,
      'source_step_number', 1
    )
  );

  UPDATE public.community_project_submissions
  SET reuse_permission = 'view_only'
  WHERE id = (SELECT submission FROM test_state);
  BEGIN
    PERFORM public.create_community_project_submission(builder, fork_payload, gen_random_uuid());
    RAISE EXCEPTION 'Fork creation ignored the source builder reuse choice.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Fork creation ignored the source builder reuse choice.'
        OR SQLERRM <> 'The pilot accepts forks only from a published community project whose builder enabled PathForge remixing.' THEN
        RAISE;
      END IF;
  END;
  UPDATE public.community_project_submissions
  SET reuse_permission = 'allow_pathforge_remix'
  WHERE id = (SELECT submission FROM test_state);

  created_fork := public.create_community_project_submission(
    builder, fork_payload, gen_random_uuid()
  );
  UPDATE test_state
  SET fork_submission = created_fork,
      fork_artifact_path = fork_artifact;

  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_submissions AS fork
    JOIN public.prompts AS source ON source.id::TEXT = fork.fork_source_project_id
    WHERE fork.id = created_fork
      AND fork.fork_source_project_title = source.title
      AND fork.fork_source_step_id = source_step::TEXT
      AND fork.fork_source_step_number = 1
      AND fork.fork_source_model_variant_id IS NULL
      AND fork.fork_source_run_id IS NULL
      AND fork.fork_source_artifact_path IS NULL
      AND fork.fork_source_artifact_sha256 IS NULL
  ) THEN
    RAISE EXCEPTION 'Community fork lineage was not resolved from authoritative database records.';
  END IF;
END;
$test$;

UPDATE test_state
SET fork_prompt = public.publish_community_project_submission(
  fork_submission,
  administrator,
  FALSE,
  '{"artifact_reviewed":true,"evidence_reviewed":true,"privacy_rights_reviewed":true,"public_truth_reviewed":true,"moderation_reviewed":true}'::JSONB,
  'Verified fork source, inert artifact source, scoped evidence, consent, and public claims.',
  gen_random_uuid()
);

DO $test$
DECLARE
  result TEXT;
BEGIN
  result := public.record_community_project_artifact_integrity(
    (SELECT fork_submission FROM test_state),
    repeat('d', 64),
    384,
    gen_random_uuid()
  );
  IF result <> 'removed' OR NOT EXISTS (
    SELECT 1
    FROM public.community_project_submissions AS submission
    JOIN public.prompts AS project
      ON project.id = (SELECT fork_prompt FROM test_state)
    WHERE submission.id = (SELECT fork_submission FROM test_state)
      AND submission.status = 'removed'
      AND submission.artifact_integrity_status = 'failed'
      AND project.status = 'rejected'
  ) THEN
    RAISE EXCEPTION 'Artifact integrity mismatch did not revoke every public authority.';
  END IF;
END;
$test$;

SET ROLE anon;
SET request.jwt.claims = '{"role":"anon"}';
DO $test$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.get_public_community_project(
      (SELECT prompt FROM test_state)
    )
  ) <> 1 THEN
    RAISE EXCEPTION 'Anonymous capsule is unavailable after publication.';
  END IF;
  IF (
    SELECT COUNT(*) FROM public.get_public_community_projects(ARRAY[
      (SELECT prompt FROM test_state),
      (SELECT fork_prompt FROM test_state)
    ])
  ) <> 1 THEN
    RAISE EXCEPTION 'Bounded discovery capsule did not return only the still-public project.';
  END IF;
  IF (SELECT COUNT(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'Anonymous Storage access bypassed the server hash-verification route.';
  END IF;
  BEGIN
    PERFORM public.get_public_community_project_artifact_path(
      (SELECT prompt FROM test_state)
    );
    RAISE EXCEPTION 'Anonymous role resolved a private artifact object path.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
RESET ROLE;

SET request.jwt.claims = '{"role":"service_role"}';
UPDATE test_state
SET report = public.create_community_project_report(
  prompt,
  NULL,
  'reporter@example.com',
  'privacy',
  'This is a disposable report used to prove the moderation lifecycle.',
  repeat('b', 64),
  gen_random_uuid()
);
SELECT public.set_community_project_report_status(
  report,
  administrator,
  'resolved',
  'Reviewed and resolved in the disposable transaction test.',
  gen_random_uuid()
) FROM test_state;

INSERT INTO public.project_model_variants (id, project_id, source_run_id)
SELECT gen_random_uuid(), prompt, 'dependent-variant'
FROM test_state;

SELECT public.withdraw_community_project_submission(
  submission,
  builder,
  'withdrawn',
  'Disposable owner withdrawal',
  gen_random_uuid()
) FROM test_state;

DO $test$
BEGIN
  IF (SELECT COUNT(*) FROM public.community_project_cleanup_candidates()) <> 2 THEN
    RAISE EXCEPTION 'Withdrawn and integrity-failed artifacts were not queued for physical cleanup.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.project_model_variants AS variant
    JOIN public.prompts AS project ON project.id = variant.project_id
    WHERE variant.project_id = (SELECT prompt FROM test_state)
      AND project.status = 'rejected'
  ) THEN
    RAISE EXCEPTION 'Withdrawal did not preserve dependent records behind a rejected prompt tombstone.';
  END IF;
END;
$test$;

SET ROLE anon;
SET request.jwt.claims = '{"role":"anon"}';
DO $test$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.get_public_community_project(
      (SELECT prompt FROM test_state)
    )
  ) <> 0 THEN
    RAISE EXCEPTION 'Anonymous capsule remained available after withdrawal.';
  END IF;
  IF (
    SELECT COUNT(*) FROM public.get_public_community_projects(ARRAY[
      (SELECT prompt FROM test_state),
      (SELECT fork_prompt FROM test_state)
    ])
  ) <> 0 THEN
    RAISE EXCEPTION 'Discovery capsules remained available after every project was revoked.';
  END IF;
  IF (SELECT COUNT(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'Anonymous artifact access remained available after withdrawal.';
  END IF;
END;
$test$;
RESET ROLE;

SET request.jwt.claims = '{"role":"service_role"}';
DO $test$
DECLARE
  failed_closed BOOLEAN := FALSE;
BEGIN
  BEGIN
    PERFORM public.confirm_community_project_artifact_purged(
      (SELECT submission FROM test_state),
      (SELECT builder FROM test_state),
      gen_random_uuid()
    );
  EXCEPTION WHEN OTHERS THEN
    failed_closed := SQLERRM = 'The private artifact still exists and cannot be marked purged.';
  END;

  IF NOT failed_closed THEN
    RAISE EXCEPTION 'Immediate artifact cleanup was marked complete before Storage deletion was confirmed.';
  END IF;
END;
$test$;

DELETE FROM storage.objects
WHERE name IN (
  (SELECT artifact_path FROM test_state),
  (SELECT fork_artifact_path FROM test_state)
);
SELECT public.finalize_community_project_artifact_cleanup(
  submission, gen_random_uuid()
) FROM test_state;
SELECT public.finalize_community_project_artifact_cleanup(
  fork_submission, gen_random_uuid()
) FROM test_state;
SELECT public.set_community_project_pilot_member(
  builder, administrator, FALSE, 'internal_acceptance', 'Disposable test complete'
) FROM test_state;
SELECT public.set_community_project_pilot_member(
  stranger, administrator, FALSE, 'invited_builder', 'Disposable test complete'
) FROM test_state;

UPDATE public.community_project_reports
SET resolved_at = NOW() - INTERVAL '91 days',
    updated_at = NOW() - INTERVAL '91 days'
WHERE id = (SELECT report FROM test_state);
UPDATE public.community_project_submissions
SET withdrawn_at = NOW() - INTERVAL '401 days',
    updated_at = NOW() - INTERVAL '401 days'
WHERE id = (SELECT submission FROM test_state);
UPDATE public.community_project_submissions
SET removed_at = NOW() - INTERVAL '401 days',
    updated_at = NOW() - INTERVAL '401 days'
WHERE id = (SELECT fork_submission FROM test_state);

DO $test$
DECLARE
  first_run UUID := gen_random_uuid();
  overlapping_run UUID := gen_random_uuid();
BEGIN
  IF NOT public.begin_community_project_reconciliation(first_run, 55) THEN
    RAISE EXCEPTION 'Reconciliation lease was not acquired.';
  END IF;
  IF public.begin_community_project_reconciliation(overlapping_run, 55) THEN
    RAISE EXCEPTION 'Overlapping reconciliation acquired an active lease.';
  END IF;
  PERFORM public.finish_community_project_reconciliation(
    first_run,
    TRUE,
    NULL,
    '{"driftCount":0}'::JSONB
  );
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_operations
    WHERE operation = 'reconciliation'
      AND last_status = 'succeeded'
      AND last_success_at IS NOT NULL
      AND lease_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Reconciliation success and lease release were not persisted.';
  END IF;
END;
$test$;

DO $test$
DECLARE
  retention JSONB;
BEGIN
  retention := public.purge_community_project_retention();
  IF (retention->>'reportsPurged')::INT <> 1
    OR (retention->>'promptTombstonesDeidentified')::INT <> 2
    OR (retention->>'promptStepsPurged')::INT <> 2
    OR (retention->>'submissionTombstonesPurged')::INT <> 2 THEN
    RAISE EXCEPTION 'Retention purge did not enforce the documented 90-day and 400-day windows: %', retention;
  END IF;
  IF EXISTS (SELECT 1 FROM public.community_project_submissions)
    OR EXISTS (SELECT 1 FROM public.community_project_reports) THEN
    RAISE EXCEPTION 'Expired community project private records survived retention purge.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.prompts
    WHERE id IN (
      (SELECT prompt FROM test_state),
      (SELECT fork_prompt FROM test_state)
    )
      AND author_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Expired rejected prompt tombstones retained contributor attribution.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.prompt_steps
    WHERE prompt_id IN (
      (SELECT prompt FROM test_state),
      (SELECT fork_prompt FROM test_state)
    )
  ) THEN
    RAISE EXCEPTION 'Expired community prompt or response evidence survived retention purge.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.prompts
    WHERE id IN (
      (SELECT prompt FROM test_state),
      (SELECT fork_prompt FROM test_state)
    )
      AND (
        title <> 'Unavailable project'
        OR description <> 'This project is no longer available.'
        OR content <> 'No public project content remains.'
        OR result_content IS NOT NULL
        OR model_used IS NOT NULL
        OR model_recommendation IS NOT NULL
        OR tools_used <> '{}'::TEXT[]
        OR tags <> '{}'::TEXT[]
      )
  ) THEN
    RAISE EXCEPTION 'Expired prompt tombstones retained project, model, prompt, response, PII, or secret-bearing fields.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.project_model_variants
    WHERE project_id = (SELECT prompt FROM test_state)
  ) THEN
    RAISE EXCEPTION 'Retention purge broke a dependent model-variant record.';
  END IF;
END;
$test$;

DO $test$
BEGIN
  IF (SELECT COUNT(*) FROM public.community_project_publication_drift()) <> 0 THEN
    RAISE EXCEPTION 'Publication drift exists after withdrawal and cleanup.';
  END IF;
  IF (SELECT COUNT(*) FROM public.community_project_cleanup_candidates()) <> 0 THEN
    RAISE EXCEPTION 'Cleanup candidate remained after finalization.';
  END IF;
  IF (SELECT COUNT(*) FROM public.community_project_storage_orphans()) <> 0 THEN
    RAISE EXCEPTION 'Storage orphan remained after finalization.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.community_project_submissions
    WHERE id = (SELECT submission FROM test_state)
      AND (artifact_path IS NOT NULL OR source_url IS NOT NULL OR prompt_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Withdrawal retained public or private artifact authority.';
  END IF;
END;
$test$;

SELECT 'community project migration transaction passed' AS result;
