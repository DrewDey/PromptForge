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
  rollback_repair UUID,
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
  IF private.pathforge_community_project_pilot_status(builder) <> 'not_admitted' THEN
    RAISE EXCEPTION 'A fresh non-admin did not receive the not-admitted status.';
  END IF;

  PERFORM public.set_community_project_pilot_member(
    stranger, administrator, TRUE, 'invited_builder', 'External cohort remains locked'
  );
  IF private.pathforge_actor_can_submit_community_project(stranger) THEN
    RAISE EXCEPTION 'An invited builder bypassed the locked external invitation control.';
  END IF;
  IF private.pathforge_community_project_pilot_status(stranger) <> 'temporarily_paused' THEN
    RAISE EXCEPTION 'An admitted invited builder was mislabeled while the external lane was paused.';
  END IF;
  PERFORM public.set_community_project_pilot_member(
    stranger, administrator, FALSE, 'invited_builder', 'Revoked status transaction check'
  );
  IF private.pathforge_community_project_pilot_status(stranger) <> 'revoked' THEN
    RAISE EXCEPTION 'A revoked pilot member did not receive the revoked status.';
  END IF;
  PERFORM public.set_community_project_pilot_member(
    stranger, administrator, TRUE, 'invited_builder', 'External cohort remains locked'
  );
  BEGIN
    PERFORM public.set_community_project_invitation_control(administrator, TRUE);
    RAISE EXCEPTION 'External invitations enabled without authoritative readiness.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'External invitations enabled without authoritative readiness.'
        OR SQLERRM <> 'External invitations require a fresh database-verified expansion record and healthy dual-channel operational gates.' THEN
        RAISE;
      END IF;
  END;

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
  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions
    WHERE id = legacy_source
      AND source_visibility = 'review_only'
      AND source_publication_consent_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Historical source-run rows did not default to review-only publication authority.';
  END IF;

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
  IF private.pathforge_community_project_pilot_status(builder) <> 'eligible' THEN
    RAISE EXCEPTION 'The admitted internal acceptance account did not receive eligible status.';
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
  IF private.pathforge_community_project_pilot_status(builder) <> 'expired' THEN
    RAISE EXCEPTION 'Expired internal acceptance was not distinguished from non-admission.';
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
      'scanner_version', 'html-static-v3',
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
  BEGIN
    DELETE FROM public.profiles WHERE id = builder;
    RAISE EXCEPTION 'Profile deletion cascaded ahead of the community retention contract.';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_project_submissions
    WHERE id = submission AND author_id = builder
  ) OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = builder
  ) THEN
    RAISE EXCEPTION 'The community submission or contributor profile disappeared after blocked deletion.';
  END IF;
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

DO $test$
DECLARE
  seed public.community_project_submissions%ROWTYPE;
  terminal_fixture public.community_project_submissions%ROWTYPE;
  builder UUID := (SELECT test_state.builder FROM test_state);
  probe_artifact TEXT := builder::TEXT || '/20000000-0000-4000-8000-000000000099.html.txt';
  probe_payload JSONB;
  probe_submission UUID;
BEGIN
  SELECT submission.* INTO seed
  FROM public.community_project_submissions AS submission
  WHERE submission.id = (SELECT test_state.submission FROM test_state);

  FOR fixture_index IN 1..50 LOOP
    terminal_fixture := jsonb_populate_record(
      NULL::public.community_project_submissions,
      to_jsonb(seed) || jsonb_build_object(
        'id', gen_random_uuid(),
        'title', 'Terminal cap fixture ' || LPAD(fixture_index::TEXT, 2, '0'),
        'status', 'withdrawn',
        'prompt_id', NULL,
        'artifact_path', NULL,
        'artifact_original_name', NULL,
        'artifact_sha256', NULL,
        'artifact_size_bytes', NULL,
        'artifact_scan', NULL,
        'artifact_integrity_status', 'purged',
        'artifact_integrity_checked_at', NOW(),
        'withdrawn_at', NOW(),
        'updated_at', NOW()
      )
    );
    INSERT INTO public.community_project_submissions
    SELECT terminal_fixture.*;
  END LOOP;

  IF (
    SELECT COUNT(*)
    FROM public.community_project_submissions
    WHERE title LIKE 'Terminal cap fixture %'
      AND status = 'withdrawn'
  ) <> 50 THEN
    RAISE EXCEPTION 'The terminal submission cap fixture is incomplete.';
  END IF;

  INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES ('community-project-quarantine', probe_artifact, '{"mimetype":"text/plain"}');
  probe_payload := jsonb_build_object(
    'title', 'Active-cap probe project',
    'summary', 'A disposable project proving terminal audit rows do not consume live pilot capacity.',
    'category_slug', 'personal',
    'difficulty', 'beginner',
    'provider', 'Gemini',
    'model', 'Builder reported probe model',
    'model_settings', '',
    'evidence_scope', 'selected_excerpts',
    'source_url', '',
    'source_visibility', 'review_only',
    'build_steps', jsonb_build_array(jsonb_build_object(
      'title', 'Capacity checkpoint',
      'prompt', 'Prove that terminal records do not consume the active pilot cap.',
      'response', 'Created a disposable capacity probe.'
    )),
    'artifact_path', probe_artifact,
    'artifact_original_name', 'capacity-probe.html',
    'artifact_sha256', repeat('f', 64),
    'artifact_size_bytes', 256,
    'artifact_scan', jsonb_build_object(
      'passed', TRUE,
      'scanner_version', 'html-static-v3',
      'scanned_at', NOW(),
      'sha256', repeat('f', 64),
      'byte_length', 256,
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
    'fork', NULL
  );
  probe_submission := public.create_community_project_submission(
    builder, probe_payload, gen_random_uuid()
  );
  IF probe_submission IS NULL THEN
    RAISE EXCEPTION 'Terminal audit rows still consumed the 50-active-submission cap.';
  END IF;

  DELETE FROM public.community_project_events
  WHERE submission_id = probe_submission;
  DELETE FROM public.community_project_submissions
  WHERE id = probe_submission
    OR title LIKE 'Terminal cap fixture %';
  DELETE FROM storage.objects
  WHERE bucket_id = 'community-project-quarantine'
    AND name = probe_artifact;
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
  IF public.community_project_pilot_status() <> 'eligible' THEN
    RAISE EXCEPTION 'The public pilot status did not report the eligible owner.';
  END IF;
  BEGIN
    PERFORM public.create_community_project_submission(NULL, '{}'::JSONB, gen_random_uuid());
    RAISE EXCEPTION 'Authenticated role invoked the service-only submission function.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.record_community_project_report_alert_delivery(
      gen_random_uuid(), TRUE, NULL, gen_random_uuid()
    );
    RAISE EXCEPTION 'Authenticated role invoked the service-only alert receipt function.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO public.source_run_submissions (
    title, source_url, source_visibility, source_publication_consent_at,
    notes, fork_source_project_id,
    fork_source_project_title, fork_source_step_id, fork_source_step_number,
    prompt_family_id, fork_depth, fork_branch_index, author_id, status
  ) VALUES (
    'Compatible queued source run',
    'https://chatgpt.com/share/compatible-queue',
    'public',
    NOW(),
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
      AND source_visibility = 'public'
      AND source_publication_consent_at IS NOT NULL
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
      title, source_url, source_visibility, source_publication_consent_at,
      author_id, status
    ) VALUES (
      'Private conversation URL',
      'https://chatgpt.com/c/private-account-conversation',
      'public',
      NOW(),
      '10000000-0000-4000-8000-000000000001',
      'queued'
    );
    RAISE EXCEPTION 'Authenticated intake accepted a private provider conversation URL.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Authenticated intake accepted a private provider conversation URL.'
        OR SQLERRM <> 'Use a public ChatGPT, Claude, or Gemini share link without a query string or fragment. Private conversation URLs are not accepted.' THEN
        RAISE;
      END IF;
  END;
  BEGIN
    INSERT INTO public.source_run_submissions (
      title, source_url, source_visibility, author_id, status
    ) VALUES (
      'Missing publication consent',
      'https://chatgpt.com/share/missing-publication-consent',
      'public',
      '10000000-0000-4000-8000-000000000001',
      'queued'
    );
    RAISE EXCEPTION 'Authenticated intake accepted a public link without consent.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Authenticated intake accepted a public link without consent.'
        OR SQLERRM <> 'Public source links require explicit contributor consent.' THEN
        RAISE;
      END IF;
  END;
  INSERT INTO public.source_run_submissions (
    title,
    source_url,
    source_visibility,
    source_publication_consent_at,
    notes,
    fork_source_project_id,
    fork_source_project_title,
    fork_source_model_variant_id,
    fork_source_run_id,
    fork_source_step_id,
    fork_source_step_number,
    fork_source_artifact_path,
    fork_source_artifact_sha256,
    fork_parent_submission_id,
    prompt_family_id,
    fork_depth,
    fork_branch_index,
    resubmission_of_id,
    author_id,
    status
  )
  SELECT
    'Safe browser rollback repair',
    'https://chatgpt.com/share/safe-browser-rollback-repair',
    'public',
    NOW(),
    'Exact predecessor lineage copied by the rollback client.',
    prior.fork_source_project_id,
    prior.fork_source_project_title,
    prior.fork_source_model_variant_id,
    prior.fork_source_run_id,
    prior.fork_source_step_id,
    prior.fork_source_step_number,
    prior.fork_source_artifact_path,
    prior.fork_source_artifact_sha256,
    prior.fork_parent_submission_id,
    prior.prompt_family_id,
    prior.fork_depth,
    prior.fork_branch_index,
    prior.id,
    prior.author_id,
    'queued'
  FROM public.source_run_submissions AS prior
  WHERE prior.id = (SELECT legacy_source FROM test_state)
  RETURNING id INTO compatible_source_run;
  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions AS repair
    JOIN public.source_run_submissions AS prior
      ON prior.id = repair.resubmission_of_id
    WHERE repair.id = compatible_source_run
      AND repair.source_visibility = 'public'
      AND repair.source_publication_consent_at IS NOT NULL
      AND ROW(
        repair.fork_source_project_id,
        repair.fork_source_project_title,
        repair.fork_source_model_variant_id,
        repair.fork_source_run_id,
        repair.fork_source_step_id,
        repair.fork_source_step_number,
        repair.fork_source_artifact_path,
        repair.fork_source_artifact_sha256,
        repair.fork_parent_submission_id,
        repair.prompt_family_id,
        repair.fork_depth,
        repair.fork_branch_index
      ) IS NOT DISTINCT FROM ROW(
        prior.fork_source_project_id,
        prior.fork_source_project_title,
        prior.fork_source_model_variant_id,
        prior.fork_source_run_id,
        prior.fork_source_step_id,
        prior.fork_source_step_number,
        prior.fork_source_artifact_path,
        prior.fork_source_artifact_sha256,
        prior.fork_parent_submission_id,
        prior.prompt_family_id,
        prior.fork_depth,
        prior.fork_branch_index
      )
  ) THEN
    RAISE EXCEPTION 'Safe rollback repair did not preserve exact owned predecessor lineage.';
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
  IF public.community_project_pilot_status() <> 'temporarily_paused' THEN
    RAISE EXCEPTION 'The public pilot status mislabeled an admitted but paused builder.';
  END IF;
END;
$test$;
RESET ROLE;

SET request.jwt.claims = '{"role":"service_role"}';
UPDATE test_state
SET rollback_repair = (
  SELECT id
  FROM public.source_run_submissions
  WHERE title = 'Safe browser rollback repair'
    AND resubmission_of_id = test_state.legacy_source
);

DO $test$
BEGIN
  BEGIN
    UPDATE public.source_run_submissions
    SET status = 'draft_created',
        extracted_prompt_id = gen_random_uuid()
    WHERE id = (SELECT legacy_source FROM test_state);
    RAISE EXCEPTION 'Prepared publication bypassed missing public-link consent.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Prepared publication bypassed missing public-link consent.'
        OR SQLERRM <> 'Prepared publication requires explicit consent for the public source link.' THEN
        RAISE;
      END IF;
  END;
END;
$test$;

UPDATE public.source_run_submissions
SET status = 'declined',
    updated_at = NOW()
WHERE id = (SELECT rollback_repair FROM test_state);

UPDATE test_state
SET legacy_repair = public.create_legacy_source_run_repair(
  legacy_source,
  builder,
  'Historical repair replacement',
  'https://chatgpt.com/share/historical-repair-v2',
  'Provider: ChatGPT\nModel used: Not sure',
  'public',
  NOW(),
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
      AND repair.source_visibility = 'public'
      AND repair.source_publication_consent_at IS NOT NULL
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

UPDATE public.source_run_submissions
SET status = 'draft_created',
    updated_at = NOW()
WHERE id = (SELECT legacy_repair FROM test_state);

DO $test$
BEGIN
  BEGIN
    UPDATE public.source_run_submissions
    SET source_visibility = 'review_only',
        source_publication_consent_at = NULL,
        updated_at = NOW()
    WHERE id = (SELECT legacy_repair FROM test_state);
    RAISE EXCEPTION 'A prepared source run shed its public-link consent after preparation.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A prepared source run shed its public-link consent after preparation.'
        OR SQLERRM <> 'Prepared publication requires explicit consent for the public source link.' THEN
        RAISE;
      END IF;
  END;
  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions
    WHERE id = (SELECT legacy_repair FROM test_state)
      AND status = 'draft_created'
      AND source_visibility = 'public'
      AND source_publication_consent_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'The prepared source-run consent invariant did not roll back atomically.';
  END IF;
  BEGIN
    UPDATE public.source_run_submissions
    SET source_url = 'https://chatgpt.com/share/replaced-with-stale-consent',
        updated_at = NOW()
    WHERE id = (SELECT legacy_repair FROM test_state);
    RAISE EXCEPTION 'A replacement public link reused stale contributor consent.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A replacement public link reused stale contributor consent.'
        OR SQLERRM <> 'Changing a public source link requires renewed explicit contributor consent.' THEN
        RAISE;
      END IF;
  END;
  IF NOT EXISTS (
    SELECT 1
    FROM public.source_run_submissions
    WHERE id = (SELECT legacy_repair FROM test_state)
      AND source_url = 'https://chatgpt.com/share/historical-repair-v2'
  ) THEN
    RAISE EXCEPTION 'The stale public-link consent attempt did not roll back atomically.';
  END IF;
END;
$test$;

DO $test$
DECLARE
  run_id UUID := gen_random_uuid();
  alert_run_id UUID := gen_random_uuid();
  overlapping_alert_run_id UUID := gen_random_uuid();
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
        OR SQLERRM <> 'Publication requires fresh reconciliation, dual-channel alert recovery, verified operator-alert delivery, and no pending report alerts.' THEN
        RAISE;
      END IF;
  END;

  PERFORM public.record_community_project_report_readiness(
    repeat('e', 64),
    repeat('d', 64),
    gen_random_uuid()
  );
  BEGIN
    PERFORM public.set_community_project_publication_control(
      (SELECT administrator FROM test_state), TRUE
    );
    RAISE EXCEPTION 'Publication enabled without a fresh alert-recovery heartbeat.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Publication enabled without a fresh alert-recovery heartbeat.'
        OR SQLERRM <> 'Publication requires fresh reconciliation, dual-channel alert recovery, verified operator-alert delivery, and no pending report alerts.' THEN
        RAISE;
      END IF;
  END;
  IF NOT public.begin_community_project_report_alert_delivery(alert_run_id, 55) THEN
    RAISE EXCEPTION 'Report-alert recovery lease was not acquired.';
  END IF;
  IF public.begin_community_project_report_alert_delivery(overlapping_alert_run_id, 55) THEN
    RAISE EXCEPTION 'Overlapping report-alert recovery acquired an active lease.';
  END IF;
  PERFORM public.finish_community_project_report_alert_delivery(
    alert_run_id,
    TRUE,
    NULL,
    '{"remaining":0,"criticalRemaining":0,"independentAlertChannels":2}'::JSONB
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

  BEGIN
    PERFORM public.set_community_project_invitation_control(
      (SELECT administrator FROM test_state), TRUE
    );
    RAISE EXCEPTION 'External invitations enabled without a persisted expansion record.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'External invitations enabled without a persisted expansion record.'
        OR SQLERRM <> 'External invitations require a fresh database-verified expansion record and healthy dual-channel operational gates.' THEN
        RAISE;
      END IF;
  END;
  PERFORM public.record_community_project_invitation_readiness(
    (SELECT administrator FROM test_state),
    'private-launch-record-2026-07-23',
    gen_random_uuid()
  );
  PERFORM public.set_community_project_invitation_control(
    (SELECT administrator FROM test_state), TRUE
  );
  IF NOT private.pathforge_actor_can_submit_community_project(
    (SELECT stranger FROM test_state)
  ) THEN
    RAISE EXCEPTION 'A database-ready invitation control did not admit the named invited builder.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_operations
    WHERE operation = 'invitation_expansion'
      AND last_status = 'succeeded'
      AND last_metrics->>'private_record_reference' = 'private-launch-record-2026-07-23'
  ) THEN
    RAISE EXCEPTION 'The authoritative invitation expansion snapshot was not persisted.';
  END IF;
  UPDATE public.community_project_operations
  SET last_success_at = NOW() - INTERVAL '2 hours'
  WHERE operation = 'report_alerts';
  IF private.pathforge_actor_can_submit_community_project(
    (SELECT stranger FROM test_state)
  ) THEN
    RAISE EXCEPTION 'An invited builder remained eligible after the alert-recovery heartbeat became stale.';
  END IF;
  IF NOT public.begin_community_project_report_alert_delivery(alert_run_id, 55) THEN
    RAISE EXCEPTION 'A stale report-alert recovery lease could not be renewed.';
  END IF;
  PERFORM public.finish_community_project_report_alert_delivery(
    alert_run_id,
    TRUE,
    NULL,
    '{"remaining":0,"criticalRemaining":0,"independentAlertChannels":2}'::JSONB
  );
  IF NOT private.pathforge_actor_can_submit_community_project(
    (SELECT stranger FROM test_state)
  ) THEN
    RAISE EXCEPTION 'A fresh report-alert recovery heartbeat did not restore invited eligibility.';
  END IF;
  PERFORM public.set_community_project_invitation_control(
    (SELECT administrator FROM test_state), FALSE
  );
  IF private.pathforge_actor_can_submit_community_project(
    (SELECT stranger FROM test_state)
  ) THEN
    RAISE EXCEPTION 'The invitation control did not re-lock the external cohort.';
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

UPDATE public.community_project_submissions
SET artifact_scan = jsonb_set(
      artifact_scan,
      '{scanner_version}',
      '"html-static-v2"'::JSONB
    ),
    updated_at = NOW()
WHERE id = (SELECT submission FROM test_state);

DO $test$
BEGIN
  BEGIN
    PERFORM public.publish_community_project_submission(
      (SELECT submission FROM test_state),
      (SELECT administrator FROM test_state),
      FALSE,
      '{"artifact_reviewed":true,"evidence_reviewed":true,"privacy_rights_reviewed":true,"public_truth_reviewed":true,"moderation_reviewed":true}'::JSONB,
      'This complete review must still reject an obsolete scanner record.',
      gen_random_uuid()
    );
    RAISE EXCEPTION 'Publication accepted an obsolete artifact scanner version.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Publication accepted an obsolete artifact scanner version.'
        OR SQLERRM <> 'Publication requires a verified html-static-v3 artifact scan.' THEN
        RAISE;
      END IF;
  END;
  IF EXISTS (
    SELECT 1
    FROM public.community_project_submissions
    WHERE id = (SELECT submission FROM test_state)
      AND (status <> 'queued' OR prompt_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Rejected obsolete-scan publication did not roll back atomically.';
  END IF;
END;
$test$;

UPDATE public.community_project_submissions
SET artifact_scan = jsonb_set(
      artifact_scan,
      '{scanner_version}',
      '"html-static-v3"'::JSONB
    ),
    updated_at = NOW()
WHERE id = (SELECT submission FROM test_state);

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
    FROM public.prompts
    WHERE id = (SELECT prompt FROM test_state)
      AND result_content = 'Script-disabled HTML preview included.'
  ) THEN
    RAISE EXCEPTION 'Published community record still claimed an interactive artifact.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.get_public_community_project_artifact_manifest(
      (SELECT prompt FROM test_state)
    )
    WHERE artifact_path = (SELECT artifact_path FROM test_state)
      AND artifact_sha256 = repeat('a', 64)
      AND artifact_size_bytes = 512
  ) THEN
    RAISE EXCEPTION 'The service-only artifact manifest did not return exact verified identity.';
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

DO $test$
BEGIN
  BEGIN
    PERFORM public.withdraw_community_project_submission(
      (SELECT submission FROM test_state),
      (SELECT administrator FROM test_state),
      'removed',
      'too short',
      gen_random_uuid()
    );
    RAISE EXCEPTION 'Administrator removal accepted a vague database reason.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Administrator removal accepted a vague database reason.'
        OR SQLERRM <> 'A moderation removal reason between 10 and 2000 characters is required.' THEN
        RAISE;
      END IF;
  END;
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_submissions
    WHERE id = (SELECT submission FROM test_state)
      AND status = 'published'
      AND prompt_id = (SELECT prompt FROM test_state)
  ) THEN
    RAISE EXCEPTION 'Rejected moderation reason did not roll back public state atomically.';
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
      'scanner_version', 'html-static-v3',
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
  IF (
    SELECT COUNT(*)
    FROM public.prompt_steps
    WHERE prompt_id = (SELECT prompt FROM test_state)
  ) <> 1 THEN
    RAISE EXCEPTION 'Anonymous reader cannot see the approved community evidence checkpoint.';
  END IF;
  IF (SELECT COUNT(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'Anonymous Storage access bypassed the server hash-verification route.';
  END IF;
  BEGIN
    PERFORM public.get_public_community_project_artifact_manifest(
      (SELECT prompt FROM test_state)
    );
    RAISE EXCEPTION 'Anonymous role resolved the service-only verified artifact manifest.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
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

SET ROLE authenticated;
SET request.jwt.claims = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000002"}';
DO $test$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.prompt_steps
    WHERE prompt_id = (SELECT prompt FROM test_state)
  ) <> 1 THEN
    RAISE EXCEPTION 'Authenticated reader cannot see the approved community evidence checkpoint.';
  END IF;
  BEGIN
    PERFORM public.get_public_community_project_artifact_manifest(
      (SELECT prompt FROM test_state)
    );
    RAISE EXCEPTION 'Authenticated role resolved the service-only verified artifact manifest.';
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
  'imminent_harm',
  'This is a disposable urgent report used to prove the moderation and alert lifecycle.',
  repeat('b', 64),
  gen_random_uuid()
);
SELECT public.record_community_project_report_alert_delivery(
  report,
  FALSE,
  'webhook_delivery_failed',
  gen_random_uuid()
) FROM test_state;
DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_reports
    WHERE id = (SELECT report FROM test_state)
      AND reason = 'imminent_harm'
      AND alert_status = 'failed'
      AND alert_attempt_count = 1
      AND alert_failure_code = 'webhook_delivery_failed'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.community_project_operations
    WHERE operation = 'report_intake'
      AND last_status = 'failed'
  ) THEN
    RAISE EXCEPTION 'A failed urgent-report notification did not persist unhealthy retry state.';
  END IF;
  BEGIN
    PERFORM public.set_community_project_publication_control(
      (SELECT administrator FROM test_state), TRUE
    );
    RAISE EXCEPTION 'Publication remained enableable after a report-alert failure.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Publication remained enableable after a report-alert failure.'
        OR SQLERRM <> 'Publication requires fresh reconciliation, dual-channel alert recovery, verified operator-alert delivery, and no pending report alerts.' THEN
        RAISE;
      END IF;
  END;
END;
$test$;
SELECT public.record_community_project_report_alert_delivery(
  report,
  TRUE,
  NULL,
  gen_random_uuid()
) FROM test_state;
SELECT public.record_community_project_report_readiness(
  repeat('c', 64),
  repeat('d', 64),
  gen_random_uuid()
);
SELECT public.set_community_project_publication_control(
  administrator,
  TRUE
) FROM test_state;
DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_reports
    WHERE id = (SELECT report FROM test_state)
      AND alert_status = 'delivered'
      AND alert_attempt_count = 2
      AND alert_delivered_at IS NOT NULL
      AND alert_failure_code IS NULL
  ) THEN
    RAISE EXCEPTION 'A successful report-alert retry did not persist its delivery receipt.';
  END IF;
END;
$test$;
SELECT public.set_community_project_report_status(
  report,
  administrator,
  'resolved',
  'Reviewed and resolved in the disposable transaction test.',
  gen_random_uuid()
) FROM test_state;

DO $test$
BEGIN
  IF has_function_privilege(
      'anon',
      'public.get_community_project_report_queue(integer,integer,timestamp with time zone,uuid,text,text,text,text)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.get_community_project_report_queue(integer,integer,timestamp with time zone,uuid,text,text,text,text)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'anon',
      'public.get_community_project_report_queue_counts(text,text,text,text)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.get_community_project_report_queue_counts(text,text,text,text)',
      'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'Moderation report history RPCs are executable outside service_role.';
  END IF;
  IF NOT has_function_privilege(
      'service_role',
      'public.get_community_project_report_queue(integer,integer,timestamp with time zone,uuid,text,text,text,text)',
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'service_role',
      'public.get_community_project_report_queue_counts(text,text,text,text)',
      'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'Moderation report history RPCs are not executable by service_role.';
  END IF;
END;
$test$;

DO $test$
DECLARE
  counts JSONB;
  page_row public.community_project_reports%ROWTYPE;
  cursor_priority INT := NULL;
  cursor_created_at TIMESTAMPTZ := NULL;
  cursor_id UUID := NULL;
  page_count INT;
  traversed INT := 0;
  seen_warning BOOLEAN := FALSE;
  current_priority INT;
  sample_report UUID;
BEGIN
  INSERT INTO public.community_project_reports (
    id,
    submission_id,
    prompt_id,
    reporter_id,
    reporter_fingerprint,
    reporter_email,
    reason,
    details,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    (SELECT submission FROM test_state),
    (SELECT prompt FROM test_state),
    NULL,
    LPAD(to_hex(sequence), 64, '0'),
    format('queue-%s@example.com', sequence),
    CASE WHEN sequence <= 60 THEN 'privacy' ELSE 'other' END,
    format('Disposable moderation queue report number %s proves complete keyset traversal.', sequence),
    NOW() - INTERVAL '3 hours' + sequence * INTERVAL '1 second',
    NOW() - INTERVAL '3 hours' + sequence * INTERVAL '1 second'
  FROM generate_series(1, 101) AS sequence;

  counts := public.get_community_project_report_queue_counts('active', NULL, NULL, NULL);
  IF (counts->>'totalCount')::INT <> 101
    OR (counts->>'retainedCount')::INT <> 102
    OR (counts->>'filteredCount')::INT <> 101
    OR (counts->>'criticalCount')::INT <> 60
    OR (counts->>'undeliveredCount')::INT <> 101 THEN
    RAISE EXCEPTION 'Exact moderation counts did not include all 101 open reports: %', counts;
  END IF;

  LOOP
    page_count := 0;
    FOR page_row IN
      SELECT *
      FROM public.get_community_project_report_queue(
        25,
        cursor_priority,
        cursor_created_at,
        cursor_id,
        'active',
        NULL,
        NULL,
        NULL
      )
    LOOP
      page_count := page_count + 1;
      traversed := traversed + 1;
      current_priority := CASE
        WHEN page_row.reason IN (
          'privacy',
          'malware',
          'exploitation',
          'credentials',
          'imminent_harm'
        ) THEN 1
        ELSE 0
      END;
      IF seen_warning AND current_priority = 1 THEN
        RAISE EXCEPTION 'A critical report appeared after a warning in the moderation queue.';
      END IF;
      IF current_priority = 0 THEN
        seen_warning := TRUE;
      END IF;
      cursor_priority := current_priority;
      cursor_created_at := page_row.created_at;
      cursor_id := page_row.id;
    END LOOP;
    EXIT WHEN page_count < 25;
  END LOOP;

  IF traversed <> 101 THEN
    RAISE EXCEPTION 'Keyset moderation traversal reached % of 101 reports.', traversed;
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.get_community_project_report_alert_batch(50)
  ) <> 50 OR EXISTS (
    SELECT 1
    FROM public.get_community_project_report_alert_batch(50) AS report
    WHERE report.reason <> 'privacy'
  ) THEN
    RAISE EXCEPTION 'The alert-recovery batch did not select 50 critical reports first.';
  END IF;

  SELECT id INTO sample_report
  FROM public.community_project_reports
  WHERE reporter_email = 'queue-1@example.com';

  UPDATE public.community_project_reports
  SET status = 'resolved',
      resolution_notes = 'Resolved to prove retained-history traversal in the disposable transaction test.',
      resolved_by = (SELECT administrator FROM test_state),
      resolved_at = NOW(),
      updated_at = NOW()
  WHERE id IN (
    SELECT report.id
    FROM public.community_project_reports AS report
    WHERE report.reporter_email LIKE 'queue-%@example.com'
    ORDER BY report.created_at, report.id
    LIMIT 40
  );

  counts := public.get_community_project_report_queue_counts('active', NULL, NULL, NULL);
  IF (counts->>'totalCount')::INT <> 61
    OR (counts->>'retainedCount')::INT <> 102
    OR (counts->>'filteredCount')::INT <> 61
    OR (counts->>'criticalCount')::INT <> 20
    OR (counts->>'undeliveredCount')::INT <> 61 THEN
    RAISE EXCEPTION 'Operational counts did not exclude 40 resolved reports: %', counts;
  END IF;

  counts := public.get_community_project_report_queue_counts('all', NULL, NULL, NULL);
  IF (counts->>'totalCount')::INT <> 61
    OR (counts->>'retainedCount')::INT <> 102
    OR (counts->>'filteredCount')::INT <> 102
    OR (counts->>'criticalCount')::INT <> 20
    OR (counts->>'undeliveredCount')::INT <> 61 THEN
    RAISE EXCEPTION 'Retained-history counts did not preserve all 102 transaction reports: %', counts;
  END IF;

  counts := public.get_community_project_report_queue_counts(
    'all',
    NULL,
    NULL,
    sample_report::TEXT
  );
  IF (counts->>'filteredCount')::INT <> 1 THEN
    RAISE EXCEPTION 'All-status report-ID search did not address one resolved report: %', counts;
  END IF;
  counts := public.get_community_project_report_queue_counts(
    'active',
    NULL,
    NULL,
    sample_report::TEXT
  );
  IF (counts->>'filteredCount')::INT <> 0 THEN
    RAISE EXCEPTION 'Active report-ID search unexpectedly returned a resolved report: %', counts;
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.get_community_project_report_queue(
      25,
      NULL,
      NULL,
      NULL,
      'all',
      NULL,
      NULL,
      sample_report::TEXT
    )
  ) <> 1 OR (
    SELECT COUNT(*)
    FROM public.get_community_project_report_queue(
      25,
      NULL,
      NULL,
      NULL,
      'active',
      NULL,
      NULL,
      sample_report::TEXT
    )
  ) <> 0 THEN
    RAISE EXCEPTION 'Retained-history row search did not distinguish all from active status.';
  END IF;

  cursor_priority := NULL;
  cursor_created_at := NULL;
  cursor_id := NULL;
  traversed := 0;
  seen_warning := FALSE;
  LOOP
    page_count := 0;
    FOR page_row IN
      SELECT *
      FROM public.get_community_project_report_queue(
        25,
        cursor_priority,
        cursor_created_at,
        cursor_id,
        'all',
        NULL,
        NULL,
        NULL
      )
    LOOP
      page_count := page_count + 1;
      traversed := traversed + 1;
      current_priority := CASE
        WHEN page_row.reason IN (
          'privacy',
          'malware',
          'exploitation',
          'credentials',
          'imminent_harm'
        ) THEN 1
        ELSE 0
      END;
      IF seen_warning AND current_priority = 1 THEN
        RAISE EXCEPTION 'A critical retained report appeared after a warning.';
      END IF;
      IF current_priority = 0 THEN
        seen_warning := TRUE;
      END IF;
      cursor_priority := current_priority;
      cursor_created_at := page_row.created_at;
      cursor_id := page_row.id;
    END LOOP;
    EXIT WHEN page_count < 25;
  END LOOP;

  IF traversed <> 102 THEN
    RAISE EXCEPTION 'Retained-history keyset traversal reached % of 102 reports.', traversed;
  END IF;

  DELETE FROM public.community_project_reports
  WHERE reporter_email LIKE 'queue-%@example.com';
END;
$test$;

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
  IF (
    SELECT COUNT(*)
    FROM public.prompt_steps
    WHERE prompt_id = (SELECT prompt FROM test_state)
  ) <> 0 THEN
    RAISE EXCEPTION 'Anonymous evidence access remained after project withdrawal.';
  END IF;
  IF (SELECT COUNT(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'Anonymous artifact access remained available after withdrawal.';
  END IF;
END;
$test$;
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claims = '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000002"}';
DO $test$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.prompt_steps
    WHERE prompt_id = (SELECT prompt FROM test_state)
  ) <> 0 THEN
    RAISE EXCEPTION 'Authenticated evidence access remained after project withdrawal.';
  END IF;
END;
$test$;
RESET ROLE;

SET request.jwt.claims = '{"role":"service_role"}';
DO $test$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.get_public_community_project_artifact_manifest(
      (SELECT prompt FROM test_state)
    )
  ) <> 0 THEN
    RAISE EXCEPTION 'Verified artifact manifest remained available after withdrawal.';
  END IF;
END;
$test$;

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
SELECT public.confirm_community_project_artifact_purged(
  submission, builder, gen_random_uuid()
) FROM test_state;
SELECT public.confirm_community_project_artifact_purged(
  submission, builder, gen_random_uuid()
) FROM test_state;
DO $test$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.community_project_events
    WHERE submission_id = (SELECT submission FROM test_state)
      AND event_type = 'artifact_purged'
  ) <> 1 THEN
    RAISE EXCEPTION 'Repeated purge confirmation appended duplicate audit events.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.community_project_submissions
    WHERE id = (SELECT submission FROM test_state)
      AND artifact_integrity_status = 'purged'
      AND artifact_path IS NULL
  ) THEN
    RAISE EXCEPTION 'Purge confirmation did not clear private artifact authority.';
  END IF;
END;
$test$;
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
