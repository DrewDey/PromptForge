-- Add privacy-bounded Request a Build diagnostics to the existing first-party
-- product event stream. Transactional Request events remain authoritative.

ALTER TABLE public.product_events
  DROP CONSTRAINT product_events_event_name_check,
  DROP CONSTRAINT product_events_action_check,
  ADD CONSTRAINT product_events_event_name_check CHECK (event_name IN (
    'discovery_viewed',
    'discovery_searched',
    'project_opened',
    'build_path_reached',
    'artifact_opened',
    'model_run_compared',
    'builder_action_started',
    'account_created',
    'source_run_submitted',
    'community_project_submitted',
    'my_forge_returned',
    'intake_started',
    'submitted',
    'intake_failed',
    'status_viewed',
    'clarification_submitted',
    'delivery_opened',
    'usefulness_recorded'
  )),
  ADD CONSTRAINT product_events_action_check CHECK (action IS NULL OR action IN (
    'search',
    'fork',
    'share',
    'email',
    'artifact',
    'model_compare',
    'client_validation',
    'auth_required',
    'controls_closed',
    'capacity_full',
    'rate_limited',
    'duplicate',
    'stale_version',
    'forbidden_input',
    'invalid_reference',
    'service_unavailable',
    'unknown',
    'submitted',
    'triage',
    'clarification_requested',
    'accepted',
    'building',
    'review_pending',
    'repair_required',
    'delivery_ready',
    'delivered',
    'completed',
    'closed',
    'helpful',
    'not_helpful'
  ));

COMMENT ON CONSTRAINT product_events_event_name_check ON public.product_events IS
  'Allowlisted product diagnostics only; Request events contain no case ids or user text.';
