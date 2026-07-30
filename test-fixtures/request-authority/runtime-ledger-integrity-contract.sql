\set ON_ERROR_STOP on

DO $test$
<<ledger_integrity>>
DECLARE
  request_a UUID;
  request_b UUID;
  event_a UUID;
  request_b_row public.build_requests%ROWTYPE;
BEGIN
  SELECT id INTO request_a
  FROM public.build_requests
  ORDER BY submitted_at
  LIMIT 1;
  SELECT * INTO request_b_row
  FROM public.build_requests
  ORDER BY submitted_at
  OFFSET 1
  LIMIT 1;
  request_b := request_b_row.id;
  SELECT id INTO event_a
  FROM public.build_request_events
  WHERE request_id = request_a
  ORDER BY sequence
  LIMIT 1;
  IF request_a IS NULL OR request_b IS NULL OR event_a IS NULL
    OR request_a = request_b THEN
    RAISE EXCEPTION 'Ledger integrity fixture prerequisites were not created.';
  END IF;

  BEGIN
    INSERT INTO public.build_request_command_receipts (
      id, actor_id, idempotency_key, request_id, command_kind,
      request_hash, request_version, lifecycle_state, moderation_state,
      publication_state, close_reason, event_id, receipt
    ) VALUES (
      '88000000-0000-4000-8000-000000000001',
      NULL,
      'cross-request-receipt-0001',
      request_b,
      'fixture_cross_request',
      repeat('a', 64),
      request_b_row.version,
      request_b_row.lifecycle_state,
      request_b_row.moderation_state,
      request_b_row.publication_state,
      request_b_row.close_reason,
      event_a,
      '{}'::JSONB
    );
    RAISE EXCEPTION 'A command receipt linked another request event.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A command receipt linked another request event.' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.build_request_outbox (
      id, request_id, event_id, topic, payload
    ) VALUES (
      '88000000-0000-4000-8000-000000000002',
      request_b,
      event_a,
      'request_event_v1',
      jsonb_build_object(
        'request_id', request_b,
        'event_id', event_a,
        'kind', 'fixture_cross_request'
      )
    );
    RAISE EXCEPTION 'An outbox row linked another request event.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'An outbox row linked another request event.' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.build_request_command_receipts (
      id, actor_id, idempotency_key, request_id, command_kind,
      request_hash, request_version, lifecycle_state, moderation_state,
      publication_state, close_reason, event_id, receipt
    ) SELECT
      '88000000-0000-4000-8000-000000000003',
      NULL,
      'duplicate-event-receipt-0001',
      existing.request_id,
      'fixture_duplicate_event',
      repeat('b', 64),
      existing.request_version,
      existing.lifecycle_state,
      existing.moderation_state,
      existing.publication_state,
      existing.close_reason,
      existing.event_id,
      '{}'::JSONB
    FROM public.build_request_command_receipts AS existing
    WHERE existing.event_id = event_a
    ORDER BY existing.created_at
    LIMIT 1;
    RAISE EXCEPTION 'A second command receipt linked the same event.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'A second command receipt linked the same event.' THEN RAISE; END IF;
  END;
END;
$test$;
