\set ON_ERROR_STOP on

DO $test$
DECLARE
  operator_id UUID := '84000000-0000-4000-8000-000000000001';
  target_id UUID := '84000000-0000-4000-8000-000000000002';
  plain_digest TEXT;
  keyed_digest TEXT;
  request_count_before BIGINT;
  assignment_count_before BIGINT;
  error_detail TEXT;
  candidate_result JSONB;
BEGIN
  keyed_digest := private.request_account_pseudonym_v1(target_id);
  plain_digest := encode(extensions.digest(
    convert_to(target_id::TEXT, 'UTF8'),
    'sha256'
  ), 'hex');
  IF keyed_digest = plain_digest
    OR keyed_digest <> private.request_account_pseudonym_v1(target_id)
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_deidentified_accounts AS tombstone
      WHERE tombstone.subject_digest = keyed_digest
    ) THEN
    RAISE EXCEPTION
      'Persistent deidentification tombstone is not a deterministic keyed digest.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_pilot_admissions AS admission
    WHERE admission.account_id = target_id
  ) THEN
    RAISE EXCEPTION 'Deidentified subject retained pilot admission.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_assignments AS assignment
    WHERE assignment.account_id = target_id
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_participants AS participant
    WHERE participant.account_id = target_id
  ) THEN
    RAISE EXCEPTION 'A subject-fence race installed the deidentified target.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_command_receipts AS receipt
    WHERE receipt.idempotency_key LIKE 'subject-fence-race-%'
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_pilot_admission_receipts AS receipt
    WHERE receipt.idempotency_key IN (
      'subject-fence-race-admission',
      'subject-fence-admission-actor-0001'
    )
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_controls_receipts AS receipt
    WHERE receipt.idempotency_key = 'subject-fence-controls-actor-0001'
  ) OR EXISTS (
    SELECT 1
    FROM public.build_request_update_acknowledgements AS acknowledgement
    WHERE acknowledgement.idempotency_key =
      'subject-fence-ack-actor-0001'
  ) THEN
    RAISE EXCEPTION 'A rejected subject-fence race persisted a receipt.';
  END IF;

  SELECT count(*) INTO request_count_before
  FROM public.build_requests;
  SELECT count(*) INTO assignment_count_before
  FROM public.build_request_assignments;
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', operator_id, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  candidate_result := public.list_build_request_pilot_admissions_v1(
    1, 'Subject Fence Target', NULL, 50
  );
  IF candidate_result::TEXT LIKE '%' || target_id::TEXT || '%' THEN
    RAISE EXCEPTION
      'Persistent tombstone remained visible in the pilot admission directory.';
  END IF;
  candidate_result := public.list_build_request_eligible_assignees_v1(
    1,
    (
      SELECT accept_request_id
      FROM public.test_request_subject_fence_state
      WHERE singleton
    ),
    'builder',
    'Subject Fence Target',
    NULL,
    50
  );
  IF candidate_result::TEXT LIKE '%' || target_id::TEXT || '%' THEN
    RAISE EXCEPTION
      'Persistent tombstone remained visible as an assignment candidate.';
  END IF;
  BEGIN
    PERFORM public.set_build_request_pilot_admission_v1(
      1,
      target_id,
      0,
      'subject-fence-persistent-admit',
      TRUE,
      'This persistent tombstone must reject readmission.',
      NULL
    );
    RAISE EXCEPTION 'Persistent tombstone allowed readmission.';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_detail = PG_EXCEPTION_DETAIL;
    IF SQLERRM = 'Persistent tombstone allowed readmission.'
      OR SQLSTATE <> '42501' THEN
      RAISE;
    END IF;
  END;
  BEGIN
    PERFORM public.build_request_command_v1(
      1,
      (
        SELECT accept_request_id
        FROM public.test_request_subject_fence_state
        WHERE singleton
      ),
      1,
      'subject-fence-persistent-assign',
      'accept',
      jsonb_build_object(
        'builderId', target_id,
        'targetDate', '2026-08-31'
      )
    );
    RAISE EXCEPTION 'Persistent tombstone allowed assignment.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Persistent tombstone allowed assignment.'
      OR SQLSTATE <> '42501' THEN
      RAISE;
    END IF;
  END;
  IF request_count_before <> (SELECT count(*) FROM public.build_requests)
    OR assignment_count_before <>
      (SELECT count(*) FROM public.build_request_assignments) THEN
    RAISE EXCEPTION 'Persistent tombstone rejection mutated case authority.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_request_delivery_revisions AS revision
    JOIN public.test_request_subject_fence_state AS state
      ON state.stage_request_id = revision.request_id
    WHERE state.singleton
      AND revision.revision_state IN ('staging', 'prepared', 'sealed')
  ) THEN
    RAISE EXCEPTION
      'Deidentification-first race left an orphan active workspace.';
  END IF;
END;
$test$;
