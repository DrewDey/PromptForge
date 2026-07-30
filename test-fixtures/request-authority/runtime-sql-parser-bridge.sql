\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

SELECT request_case.id AS request_id
FROM public.build_requests AS request_case
WHERE request_case.current_delivery_revision_id IS NOT NULL
ORDER BY request_case.submitted_at
LIMIT 1
\gset

SELECT artifact.id AS artifact_id
FROM public.build_request_delivery_artifacts AS artifact
JOIN public.build_requests AS request_case
  ON request_case.current_delivery_revision_id = artifact.delivery_revision_id
WHERE request_case.id = :'request_id'::UUID
  AND artifact.abandoned_at IS NULL
ORDER BY artifact.artifact_ordinal
LIMIT 1
\gset

UPDATE public.build_requests
SET moderation_state = 'clear',
    publication_state = 'private',
    lifecycle_state = 'completed',
    close_reason = NULL,
    close_explanation = NULL,
    terminal_at = clock_timestamp() - INTERVAL '1 day'
WHERE id = :'request_id'::UUID;

SELECT set_config('request.jwt.claims', '{}', FALSE) AS ignored \gset
SELECT public.get_build_request_availability_v1(1)::TEXT AS availability \gset

SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '82000000-0000-4000-8000-000000000007'::UUID,
    'role', 'authenticated'
  )::TEXT,
  FALSE
) AS ignored \gset
SELECT public.get_build_request_v1(1, :'request_id'::UUID)::TEXT AS admin_detail \gset
SELECT public.list_build_request_queue_v1(1, 'admin', NULL, 50)::TEXT AS admin_queue \gset
SELECT public.list_build_request_events_v1(
  1, :'request_id'::UUID, NULL, 50
)::TEXT AS events \gset
SELECT public.list_build_request_events_v1(
  1, :'request_id'::UUID, NULL, 1
)::TEXT AS event_first_page \gset
SELECT (:'event_first_page'::JSONB->>'nextCursor') AS event_cursor \gset
SELECT public.list_build_request_events_v1(
  1, :'request_id'::UUID, :'event_cursor', 1
)::TEXT AS event_second_page \gset
SELECT public.resolve_build_request_delivery_artifact_v1(
  1, :'artifact_id'::UUID
)::TEXT AS reader \gset
SELECT public.list_build_request_pilot_admissions_v1(
  1, 'Admission Fixture', NULL, 50
)::TEXT AS admissions \gset

UPDATE public.build_requests
SET moderation_state = 'held'
WHERE id = :'request_id'::UUID;
SELECT public.get_build_request_v1(
  1, :'request_id'::UUID
)::TEXT AS restricted_detail \gset
UPDATE public.build_requests
SET moderation_state = 'clear'
WHERE id = :'request_id'::UUID;

SELECT request_case.id AS requester_case_id
FROM public.build_requests AS request_case
WHERE EXISTS (
  SELECT 1
  FROM public.build_request_participants AS participant
  WHERE participant.request_id = request_case.id
    AND participant.account_id =
      '82000000-0000-4000-8000-000000000002'::UUID
    AND participant.actor_role = 'requester'
)
LIMIT 1
\gset
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '82000000-0000-4000-8000-000000000002'::UUID,
    'role', 'authenticated'
  )::TEXT,
  FALSE
) AS ignored \gset
SELECT public.get_build_request_v1(
  1, :'requester_case_id'::UUID
)::TEXT AS requester_detail \gset

SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '89000000-0000-4000-8000-000000000003'::UUID,
    'role', 'authenticated'
  )::TEXT,
  FALSE
) AS ignored \gset
SELECT public.get_build_request_v1(
  1, :'request_id'::UUID
)::TEXT AS second_admin_detail \gset

SELECT request_case.id AS triager_case_id
FROM public.build_requests AS request_case
JOIN public.build_request_brief_revisions AS brief
  ON brief.id = request_case.current_brief_revision_id
WHERE brief.title = 'Triager accountability contract'
LIMIT 1
\gset
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '89000000-0000-4000-8000-000000000002'::UUID,
    'role', 'authenticated'
  )::TEXT,
  FALSE
) AS ignored \gset
SELECT public.get_build_request_v1(
  1, :'triager_case_id'::UUID
)::TEXT AS triager_detail \gset
SELECT public.list_build_request_events_v1(
  1, :'triager_case_id'::UUID, NULL, 50
)::TEXT AS reassignment_events \gset
SELECT jsonb_build_object(
  'contract_version', 1,
  'command_id', receipt.id,
  'request_id', receipt.request_id,
  'request_version', receipt.request_version,
  'event_id', receipt.event_id,
  'lifecycle_state', receipt.lifecycle_state,
  'moderation_state', receipt.moderation_state,
  'publication_state', receipt.publication_state,
  'close_reason', receipt.close_reason,
  'replayed', FALSE,
  'occurred_at', receipt.created_at,
  'authority_result', receipt.receipt->'authority_result'
)::TEXT AS reassignment_receipt
FROM public.build_request_command_receipts AS receipt
WHERE receipt.idempotency_key = 'triager-account-reassign-0001'
\gset

SELECT request_case.id AS removed_case_id
FROM public.build_requests AS request_case
WHERE request_case.moderation_state = 'removed'
ORDER BY request_case.updated_at DESC
LIMIT 1
\gset
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '87000000-0000-4000-8000-000000000002'::UUID,
    'role', 'authenticated'
  )::TEXT,
  FALSE
) AS ignored \gset
SELECT public.get_build_request_v1(
  1, :'removed_case_id'::UUID
)::TEXT AS removed_detail \gset
SELECT public.list_build_request_events_v1(
  1, :'removed_case_id'::UUID, NULL, 50
)::TEXT AS removed_events \gset

SELECT terminal_detail::TEXT AS terminal_wip_detail,
  retirement_events::TEXT AS terminal_wip_events
FROM public.test_request_terminal_wip_state
WHERE singleton
\gset

SELECT jsonb_object_agg(snapshot_kind, payload)::TEXT
  AS lifecycle_snapshots
FROM public.test_request_lifecycle_detail_snapshots
\gset

SELECT jsonb_build_object(
  'availability', :'availability'::JSONB,
  'adminDetail', :'admin_detail'::JSONB,
  'adminQueue', :'admin_queue'::JSONB,
  'events', :'events'::JSONB,
  'eventFirstPage', :'event_first_page'::JSONB,
  'eventSecondPage', :'event_second_page'::JSONB,
  'reader', :'reader'::JSONB,
  'admissions', :'admissions'::JSONB,
  'restrictedDetail', :'restricted_detail'::JSONB,
  'requesterDetail', :'requester_detail'::JSONB,
  'secondAdminDetail', :'second_admin_detail'::JSONB,
  'triagerDetail', :'triager_detail'::JSONB,
  'reassignmentEvents', :'reassignment_events'::JSONB,
  'reassignmentReceipt', :'reassignment_receipt'::JSONB,
  'removedDetail', :'removed_detail'::JSONB,
  'removedEvents', :'removed_events'::JSONB,
  'terminalWipDetail', :'terminal_wip_detail'::JSONB,
  'terminalWipEvents', :'terminal_wip_events'::JSONB,
  'lifecycleSnapshots', :'lifecycle_snapshots'::JSONB
)::TEXT;
