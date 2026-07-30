-- Narrow recovery seam for an actor-owned prepared delivery revision.
--
-- The browser projection remains unchanged. A trusted server action first
-- authenticates the cookie/session actor, then passes that actor id to this
-- service-role-only resolver. The returned values are sufficient to replay
-- the original prepare command exactly after unrelated request-version
-- advances, without exposing a manifest digest or storage/custody identity.

CREATE OR REPLACE FUNCTION public.resolve_build_request_delivery_preparation_replay_v1(
  p_contract_version INTEGER,
  p_actor_id UUID,
  p_request_id UUID,
  p_delivery_revision_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_binding RECORD;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF COALESCE(auth.jwt()->>'role', '') <> 'service_role'
    OR p_actor_id IS NULL
    OR p_request_id IS NULL
    OR p_delivery_revision_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Delivery preparation replay is not available.';
  END IF;

  SELECT
    request_case.id AS request_id,
    revision.id AS delivery_revision_id,
    prepare_receipt.id AS preparation_receipt_id,
    prepare_receipt.request_version - 1 AS expected_request_version,
    prepare_receipt.idempotency_key
  INTO v_binding
  FROM public.build_requests AS request_case
  JOIN public.build_request_delivery_revisions AS revision
    ON revision.request_id = request_case.id
    AND revision.id = p_delivery_revision_id
  JOIN public.build_request_assignments AS builder_assignment
    ON builder_assignment.request_id = request_case.id
    AND builder_assignment.id = revision.builder_assignment_id
  JOIN public.build_request_command_receipts AS prepare_receipt
    ON prepare_receipt.request_id = request_case.id
    AND prepare_receipt.actor_id = p_actor_id
    AND prepare_receipt.command_kind = 'prepare_delivery_revision'
    AND prepare_receipt.receipt->'authority_result'
      ->>'deliveryRevisionId' = revision.id::TEXT
  WHERE request_case.id = p_request_id
    AND request_case.lifecycle_state IN ('building', 'repair_required')
    AND request_case.moderation_state = 'clear'
    AND request_case.current_brief_revision_id =
      revision.accepted_brief_revision_id
    AND revision.revision_state = 'prepared'
    AND revision.authored_by = p_actor_id
    AND builder_assignment.assignment_role = 'builder'
    AND builder_assignment.account_id = p_actor_id
    AND builder_assignment.active
    -- Generic actor commands advance the request exactly once before their
    -- immutable durable receipt is inserted. Deriving from that historical
    -- receipt is exact; it never depends on the mutable current case version.
    AND prepare_receipt.request_version > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Delivery preparation replay was not found.',
      DETAIL = 'request_authority:not_found';
  END IF;

  RETURN jsonb_build_object(
    'requestId', v_binding.request_id,
    'deliveryRevisionId', v_binding.delivery_revision_id,
    'preparationReceiptId', v_binding.preparation_receipt_id,
    'expectedRequestVersion', v_binding.expected_request_version,
    'idempotencyKey', v_binding.idempotency_key
  );
END;
$$;

REVOKE ALL ON FUNCTION
  public.resolve_build_request_delivery_preparation_replay_v1(
    INTEGER, UUID, UUID, UUID
  )
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.resolve_build_request_delivery_preparation_replay_v1(
    INTEGER, UUID, UUID, UUID
  )
TO service_role;
