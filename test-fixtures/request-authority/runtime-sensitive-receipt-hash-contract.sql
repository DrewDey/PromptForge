\set ON_ERROR_STOP on

DO $test$
<<receipt_hash>>
DECLARE
  administrator UUID := '82000000-0000-4000-8000-000000000007';
  target UUID := '8e000000-0000-4000-8000-000000000001';
  request_id UUID;
  brief_payload JSONB;
  command_payload JSONB := '{}'::JSONB;
  admission_payload JSONB;
  expected_hash TEXT;
  plain_hash TEXT;
  stored_hash TEXT;
  first_result JSONB;
  replay_result JSONB;
BEGIN
  SELECT receipt.request_id INTO STRICT request_id
  FROM public.build_request_command_receipts AS receipt
  WHERE receipt.idempotency_key = 'valid-submit-0001';
  SELECT jsonb_build_object(
    'title', brief.title,
    'outcome', brief.outcome,
    'intended_user', brief.intended_user,
    'must_work_scenario', brief.must_work_scenario,
    'constraints', brief.constraints,
    'acceptance_checks', (
      SELECT jsonb_agg(check_value.check_text ORDER BY check_value.ordinal)
      FROM public.build_request_acceptance_checks AS check_value
      WHERE check_value.brief_revision_id = brief.id
    ),
    'pathforge_reference', brief.pathforge_reference
  ) INTO STRICT brief_payload
  FROM public.build_request_brief_revisions AS brief
  JOIN public.build_requests AS request_case
    ON request_case.current_brief_revision_id = brief.id
  WHERE request_case.id = receipt_hash.request_id;
  expected_hash := private.request_pseudonym_text_v1(
    jsonb_build_object('contract', 1, 'brief', brief_payload)::TEXT
  );
  plain_hash := encode(extensions.digest(convert_to(
    jsonb_build_object('contract', 1, 'brief', brief_payload)::TEXT,
    'UTF8'
  ), 'sha256'), 'hex');
  SELECT receipt.request_hash INTO STRICT stored_hash
  FROM public.build_request_command_receipts AS receipt
  WHERE receipt.idempotency_key = 'valid-submit-0001';
  IF stored_hash <> expected_hash OR stored_hash = plain_hash THEN
    RAISE EXCEPTION
      'Submit receipt hash is not the private canonical-envelope HMAC.';
  END IF;

  expected_hash := private.request_pseudonym_text_v1(
    jsonb_build_object(
      'contract', 1,
      'request_id', request_id,
      'expected_version', 0,
      'command', 'begin_triage',
      'payload', command_payload
    )::TEXT
  );
  plain_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'contract', 1,
    'request_id', request_id,
    'expected_version', 0,
    'command', 'begin_triage',
    'payload', command_payload
  )::TEXT, 'UTF8'), 'sha256'), 'hex');
  SELECT receipt.request_hash INTO STRICT stored_hash
  FROM public.build_request_command_receipts AS receipt
  WHERE receipt.idempotency_key = 'begin-triage-0001';
  IF stored_hash <> expected_hash OR stored_hash = plain_hash THEN
    RAISE EXCEPTION
      'Command receipt hash is not the private canonical-envelope HMAC.';
  END IF;

  INSERT INTO auth.users (id, email_confirmed_at)
  VALUES (target, clock_timestamp());
  INSERT INTO public.profiles (id, role, username, display_name)
  VALUES (
    target,
    'user',
    'receipt_hash_target',
    'Receipt Hash Target'
  );
  admission_payload := jsonb_build_object(
    'accountId', target,
    'expectedVersion', 0,
    'admitted', TRUE,
    'reason', 'Receipt HMAC fixture admission',
    'expiresAt', NULL
  );
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', administrator, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  first_result := public.set_build_request_pilot_admission_v1(
    1,
    target,
    0,
    'receipt-hash-admission-0001',
    TRUE,
    'Receipt HMAC fixture admission',
    NULL
  );
  replay_result := public.set_build_request_pilot_admission_v1(
    1,
    target,
    0,
    'receipt-hash-admission-0001',
    TRUE,
    'Receipt HMAC fixture admission',
    NULL
  );
  expected_hash :=
    private.request_pseudonym_text_v1(admission_payload::TEXT);
  plain_hash := encode(extensions.digest(
    convert_to(admission_payload::TEXT, 'UTF8'),
    'sha256'
  ), 'hex');
  SELECT receipt.request_hash INTO STRICT stored_hash
  FROM public.build_request_pilot_admission_receipts AS receipt
  WHERE receipt.idempotency_key = 'receipt-hash-admission-0001';
  IF stored_hash <> expected_hash
    OR stored_hash = plain_hash
    OR jsonb_set(first_result, '{replayed}', 'true'::JSONB)
      <> replay_result THEN
    RAISE EXCEPTION
      'Admission receipt HMAC or replay equality drifted.';
  END IF;
END;
$test$;
