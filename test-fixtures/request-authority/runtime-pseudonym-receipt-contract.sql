\set ON_ERROR_STOP on

DO $test$
DECLARE
  administrator UUID := '82000000-0000-4000-8000-000000000007';
  subject_id UUID := '82000000-0000-4000-8000-000000000006';
  keyed_digest TEXT;
  plain_digest TEXT;
  deidentification_result JSONB;
  expiry_result JSONB;
  receipt_id UUID;
BEGIN
  IF (
    SELECT count(*)
    FROM private.request_pseudonym_keys
  ) <> 1 OR (
    SELECT octet_length(secret)
    FROM private.request_pseudonym_keys
    WHERE singleton
  ) < 32 THEN
    RAISE EXCEPTION 'Pseudonym HMAC key authority is missing or undersized.';
  END IF;
  FOREACH keyed_digest IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF has_table_privilege(
      keyed_digest,
      'private.request_pseudonym_keys',
      'SELECT'
    ) OR has_function_privilege(
      keyed_digest,
      'private.request_account_pseudonym_v1(uuid)',
      'EXECUTE'
    ) THEN
      RAISE EXCEPTION
        'Role % can read or compute private pseudonym authority.',
        keyed_digest;
    END IF;
  END LOOP;

  keyed_digest := private.request_account_pseudonym_v1(subject_id);
  plain_digest := encode(extensions.digest(
    convert_to(subject_id::TEXT, 'UTF8'),
    'sha256'
  ), 'hex');
  IF keyed_digest = plain_digest
    OR keyed_digest <> private.request_account_pseudonym_v1(subject_id)
    OR keyed_digest =
      private.request_account_pseudonym_v1(administrator) THEN
    RAISE EXCEPTION
      'Pseudonym is unkeyed, nondeterministic, or not subject-specific.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', administrator, 'role', 'authenticated'
    )::TEXT,
    TRUE
  );
  deidentification_result :=
    public.deidentify_build_request_account_v1(
      1,
      subject_id,
      'pseudonym-receipt-deidentify-0001'
    );
  SELECT receipt.id INTO STRICT receipt_id
  FROM public.build_request_account_deidentification_receipts AS receipt
  WHERE receipt.idempotency_key = 'pseudonym-receipt-deidentify-0001';
  IF (
    SELECT receipt.subject_digest
    FROM public.build_request_account_deidentification_receipts AS receipt
    WHERE receipt.id = receipt_id
  ) <> keyed_digest THEN
    RAISE EXCEPTION
      'Deidentification receipt did not bind the private HMAC pseudonym.';
  END IF;
  IF has_table_privilege(
    'authenticated',
    'public.build_request_account_deidentification_receipts',
    'SELECT'
  ) OR has_table_privilege(
    'service_role',
    'public.build_request_account_deidentification_receipts',
    'SELECT'
  ) THEN
    RAISE EXCEPTION
      'Deidentification receipt table is directly readable.';
  END IF;
  IF has_function_privilege(
    'anon',
    'public.expire_build_request_account_deidentification_receipt_v1(integer,uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.expire_build_request_account_deidentification_receipt_v1(integer,uuid)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.expire_build_request_account_deidentification_receipt_v1(integer,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'Deidentification receipt expiry grants are not service-only.';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    '{"role":"service_role"}',
    TRUE
  );
  expiry_result :=
    public.expire_build_request_account_deidentification_receipt_v1(
      1,
      receipt_id
    );
  IF expiry_result <> jsonb_build_object(
      'contractVersion', 1,
      'receiptId', receipt_id,
      'expired', FALSE,
      'occurredAt', expiry_result->'occurredAt'
    ) OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_account_deidentification_receipts AS receipt
      WHERE receipt.id = receipt_id
    ) THEN
    RAISE EXCEPTION
      'Receipt expiry bypassed the exact 400-day retention boundary.';
  END IF;

  UPDATE public.build_request_account_deidentification_receipts
  SET occurred_at = occurred_at - INTERVAL '401 days',
      expires_at = expires_at - INTERVAL '401 days'
  WHERE id = receipt_id;
  expiry_result :=
    public.expire_build_request_account_deidentification_receipt_v1(
      1,
      receipt_id
    );
  IF expiry_result <> jsonb_build_object(
      'contractVersion', 1,
      'receiptId', receipt_id,
      'expired', TRUE,
      'occurredAt', expiry_result->'occurredAt'
    ) OR EXISTS (
      SELECT 1
      FROM public.build_request_account_deidentification_receipts AS receipt
      WHERE receipt.id = receipt_id
    ) OR expiry_result ?| ARRAY[
      'accountId', 'actorDigest', 'subjectDigest', 'reason', 'replayed'
    ] THEN
    RAISE EXCEPTION
      'Service receipt expiry leaked identity data or failed exact cleanup.';
  END IF;
END;
$test$;
