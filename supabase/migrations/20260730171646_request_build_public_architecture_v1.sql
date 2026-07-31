-- Request a Build public-ready managed-service architecture.
--
-- This migration is additive. It keeps the reviewed private case, delivery,
-- review, moderation, and retention authority intact while installing the
-- independent intake, operator, abuse, notification, reporting, readiness,
-- and publication control planes needed for a future broad signed-in launch.
--
-- Every expansion control defaults off. Applying this migration does not open
-- intake, enable assignment, send a notification, or publish an outcome.

DO $request_public_preflight$
BEGIN
  IF to_regclass('public.build_requests') IS NULL
    OR to_regclass('public.build_request_controls') IS NULL
    OR to_regclass('public.build_request_events') IS NULL
    OR to_regprocedure(
      'public.submit_build_request_v1(integer,text,jsonb)'
    ) IS NULL
    OR to_regprocedure(
      'public.resolve_build_request_delivery_preparation_replay_v1(integer,uuid,uuid,uuid)'
    ) IS NULL
  THEN
    RAISE EXCEPTION
      'Request public architecture requires the complete private V1 authority and preparation replay binding.';
  END IF;
END;
$request_public_preflight$;

-- The original four-case check represented pilot operating capacity. Public
-- readiness separates the total private demand queue from the much smaller
-- fulfillment work-in-progress cap.
ALTER TABLE public.build_request_controls
  DROP CONSTRAINT IF EXISTS build_request_controls_active_case_capacity_check;

ALTER TABLE public.build_request_controls
  ADD CONSTRAINT build_request_controls_active_case_capacity_check
    CHECK (active_case_capacity BETWEEN 1 AND 5000),
  ADD COLUMN intake_audience TEXT NOT NULL DEFAULT 'invited'
    CHECK (intake_audience IN ('invited', 'authenticated')),
  ADD COLUMN fulfillment_case_capacity INTEGER NOT NULL DEFAULT 4
    CHECK (fulfillment_case_capacity BETWEEN 1 AND 50),
  ADD COLUMN operator_roster_required BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN public_intake_risk_screening BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN transactional_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN publication_consent_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN publication_airlock_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN public_outcomes_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN actor_hourly_intake_limit INTEGER NOT NULL DEFAULT 5
    CHECK (actor_hourly_intake_limit BETWEEN 1 AND 25),
  ADD COLUMN network_hourly_intake_limit INTEGER NOT NULL DEFAULT 12
    CHECK (network_hourly_intake_limit BETWEEN 1 AND 100),
  ADD COLUMN global_daily_intake_limit INTEGER NOT NULL DEFAULT 250
    CHECK (global_daily_intake_limit BETWEEN 1 AND 10000),
  ADD COLUMN terms_version TEXT NOT NULL DEFAULT 'request-terms-v1'
    CHECK (terms_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),
  ADD COLUMN privacy_version TEXT NOT NULL DEFAULT 'request-privacy-v1'
    CHECK (privacy_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),
  ADD COLUMN acceptable_use_version TEXT NOT NULL DEFAULT 'request-aup-v1'
    CHECK (acceptable_use_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),
  ADD COLUMN requester_rights_version TEXT NOT NULL DEFAULT 'request-rights-v1'
    CHECK (requester_rights_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),
  ADD COLUMN publication_terms_version TEXT NOT NULL
    DEFAULT 'request-publication-v1'
    CHECK (
      publication_terms_version
        ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
    ),
  ADD CONSTRAINT build_request_controls_capacity_order_check
    CHECK (fulfillment_case_capacity <= active_case_capacity),
  ADD CONSTRAINT build_request_controls_public_gate_order_check
    CHECK (
      NOT public_outcomes_enabled
      OR (
        publication_airlock_enabled
        AND publication_consent_enabled
      )
    ),
  ADD CONSTRAINT build_request_controls_public_intake_safety_check
    CHECK (
      intake_audience <> 'authenticated'
      OR (
        public_intake_risk_screening
        AND operator_roster_required
      )
    );

COMMENT ON COLUMN public.build_request_controls.active_case_capacity IS
  'Maximum nonterminal private demand cases, independent of fulfillment WIP.';
COMMENT ON COLUMN public.build_request_controls.fulfillment_case_capacity IS
  'Maximum clear cases from accepted through delivered.';

CREATE TABLE public.build_request_operator_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  account_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  operator_role TEXT NOT NULL
    CHECK (operator_role IN ('triager', 'builder', 'reviewer')),
  membership_version INTEGER NOT NULL DEFAULT 1
    CHECK (membership_version > 0),
  membership_state TEXT NOT NULL DEFAULT 'paused'
    CHECK (membership_state IN ('active', 'paused', 'revoked')),
  max_active_cases INTEGER NOT NULL DEFAULT 1
    CHECK (max_active_cases BETWEEN 1 AND 50),
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_by_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT NOT NULL
    CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    available_until IS NULL
    OR (
      available_from IS NOT NULL
      AND available_until > available_from
    )
  ),
  CHECK (
    (account_id IS NOT NULL AND NOT account_deidentified)
    OR (account_id IS NULL AND account_deidentified)
  ),
  CHECK (
    (changed_by IS NOT NULL AND NOT changed_by_deidentified)
    OR (changed_by IS NULL AND changed_by_deidentified)
  )
);

CREATE UNIQUE INDEX build_request_operator_one_live_membership
  ON public.build_request_operator_memberships (
    account_id, operator_role
  )
  WHERE account_id IS NOT NULL;

CREATE TABLE public.build_request_operator_membership_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  membership_id UUID NOT NULL,
  account_id UUID,
  account_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  operator_role TEXT NOT NULL,
  membership_version INTEGER NOT NULL CHECK (membership_version > 0),
  membership_state TEXT NOT NULL,
  max_active_cases INTEGER NOT NULL,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  reason_digest TEXT NOT NULL CHECK (reason_digest ~ '^[0-9a-f]{64}$'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (membership_id)
    REFERENCES public.build_request_operator_memberships(id)
    ON DELETE RESTRICT,
  CHECK (
    (actor_id IS NOT NULL AND NOT actor_deidentified)
    OR (actor_id IS NULL AND actor_deidentified)
  ),
  CHECK (
    (account_id IS NOT NULL AND NOT account_deidentified)
    OR (account_id IS NULL AND account_deidentified)
  ),
  UNIQUE (actor_id, idempotency_key)
);

-- Only an application-server HMAC of the canonical source network reaches
-- Supabase. The raw source address never crosses the application boundary.
CREATE TABLE public.build_request_intake_risk_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  intake_idempotency_key TEXT NOT NULL CHECK (
    intake_idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  network_digest TEXT NOT NULL CHECK (network_digest ~ '^[0-9a-f]{64}$'),
  risk_engine_version TEXT NOT NULL CHECK (
    risk_engine_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  decision TEXT NOT NULL CHECK (decision IN ('clear', 'denied')),
  denial_reason TEXT CHECK (
    denial_reason IN ('actor_limit', 'network_limit', 'global_limit')
  ),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  consumed_request_id UUID
    REFERENCES public.build_requests(id) ON DELETE SET NULL,
  CHECK (expires_at > issued_at AND expires_at <= issued_at + INTERVAL '15 minutes'),
  CHECK (
    (decision = 'clear' AND denial_reason IS NULL)
    OR (decision = 'denied' AND denial_reason IS NOT NULL)
  ),
  CHECK (
    (consumed_at IS NULL AND consumed_request_id IS NULL)
    OR (decision = 'clear' AND consumed_at IS NOT NULL)
  ),
  CHECK (
    (actor_id IS NOT NULL AND NOT actor_deidentified)
    OR (actor_id IS NULL AND actor_deidentified)
  ),
  UNIQUE (actor_id, intake_idempotency_key)
);

CREATE INDEX build_request_risk_grants_network_recent
  ON public.build_request_intake_risk_grants (
    network_digest, issued_at DESC
  );
CREATE INDEX build_request_risk_grants_issued_recent
  ON public.build_request_intake_risk_grants (issued_at DESC);

CREATE TABLE public.build_request_intake_attestations (
  request_id UUID PRIMARY KEY
    REFERENCES public.build_requests(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requester_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  intake_audience TEXT NOT NULL
    CHECK (intake_audience IN ('invited', 'authenticated')),
  -- This is an immutable audit identifier, not a lasting foreign key. The
  -- verified grant row contains the network digest and is deleted after
  -- 30 days without rewriting this append-only attestation.
  risk_grant_id UUID,
  risk_screening_verified_at TIMESTAMPTZ,
  risk_engine_version TEXT CHECK (
    risk_engine_version IS NULL
    OR risk_engine_version
      ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  acceptable_use_version TEXT NOT NULL,
  requester_rights_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (
      intake_audience = 'invited'
      AND risk_grant_id IS NULL
      AND risk_screening_verified_at IS NULL
      AND risk_engine_version IS NULL
    )
    OR (
      intake_audience = 'authenticated'
      AND risk_screening_verified_at IS NOT NULL
      AND risk_engine_version IS NOT NULL
    )
  ),
  CHECK (terms_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),
  CHECK (privacy_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),
  CHECK (
    acceptable_use_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  CHECK (
    requester_rights_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  CHECK (
    (requester_id IS NOT NULL AND NOT requester_deidentified)
    OR (requester_id IS NULL AND requester_deidentified)
  ),
  UNIQUE (risk_grant_id)
);

CREATE TABLE public.build_request_readiness_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_kind TEXT NOT NULL CHECK (
    gate_kind IN (
      'legal', 'incident_owner', 'waf', 'responsive_qa',
      'attended_lifecycle', 'notification_transport'
    )
  ),
  evidence_version INTEGER NOT NULL DEFAULT 1 CHECK (evidence_version > 0),
  evidence_state TEXT NOT NULL CHECK (
    evidence_state IN ('confirmed', 'revoked')
  ),
  evidence_reference_digest TEXT NOT NULL
    CHECK (evidence_reference_digest ~ '^[0-9a-f]{64}$'),
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  confirmed_by_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  valid_until TIMESTAMPTZ,
  policy_snapshot JSONB,
  note TEXT NOT NULL CHECK (char_length(btrim(note)) BETWEEN 1 AND 500),
  CHECK (valid_until IS NULL OR valid_until > confirmed_at),
  CHECK (
    (
      gate_kind = 'legal'
      AND jsonb_typeof(policy_snapshot) = 'object'
      AND octet_length(policy_snapshot::TEXT) <= 1000
    )
    OR (gate_kind <> 'legal' AND policy_snapshot IS NULL)
  ),
  CHECK (
    (confirmed_by IS NOT NULL AND NOT confirmed_by_deidentified)
    OR (confirmed_by IS NULL AND confirmed_by_deidentified)
  ),
  UNIQUE (gate_kind, evidence_version)
);

CREATE UNIQUE INDEX build_request_one_current_readiness_gate
  ON public.build_request_readiness_evidence (gate_kind)
  WHERE evidence_state = 'confirmed';

CREATE TABLE public.build_request_readiness_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  gate_kind TEXT NOT NULL,
  evidence_version INTEGER NOT NULL,
  evidence_state TEXT NOT NULL,
  valid_until TIMESTAMPTZ,
  policy_snapshot JSONB,
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (
      gate_kind = 'legal'
      AND jsonb_typeof(policy_snapshot) = 'object'
      AND octet_length(policy_snapshot::TEXT) <= 1000
    )
    OR (gate_kind <> 'legal' AND policy_snapshot IS NULL)
  ),
  CHECK (
    (actor_id IS NOT NULL AND NOT actor_deidentified)
    OR (actor_id IS NULL AND actor_deidentified)
  ),
  UNIQUE (actor_id, idempotency_key)
);

CREATE TABLE public.build_request_public_control_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  controls_version INTEGER NOT NULL CHECK (controls_version > 0),
  controls_snapshot JSONB NOT NULL CHECK (
    jsonb_typeof(controls_snapshot) = 'object'
    AND octet_length(controls_snapshot::TEXT) <= 10000
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (actor_id IS NOT NULL AND NOT actor_deidentified)
    OR (actor_id IS NULL AND actor_deidentified)
  ),
  UNIQUE (actor_id, idempotency_key)
);

CREATE TABLE public.build_request_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL
    REFERENCES public.build_requests(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reporter_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT NOT NULL CHECK (
    category IN ('safety', 'privacy', 'integrity', 'rights', 'service')
  ),
  priority INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN category IN ('safety', 'privacy', 'rights') THEN 1
      ELSE 0
    END
  ) STORED,
  details TEXT NOT NULL
    CHECK (char_length(btrim(details)) BETWEEN 20 AND 2000),
  details_digest TEXT NOT NULL CHECK (details_digest ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note TEXT CHECK (
    resolution_note IS NULL
    OR char_length(btrim(resolution_note)) BETWEEN 10 AND 1000
  ),
  resolution_note_digest TEXT CHECK (
    resolution_note_digest IS NULL
    OR resolution_note_digest ~ '^[0-9a-f]{64}$'
  ),
  alert_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (alert_status IN ('pending', 'delivered', 'failed', 'suppressed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  resolved_at TIMESTAMPTZ,
  details_purged_at TIMESTAMPTZ,
  CHECK (
    (status IN ('open', 'reviewing') AND resolved_at IS NULL)
    OR (status IN ('resolved', 'dismissed') AND resolved_at IS NOT NULL)
  ),
  CHECK (
    (
      status IN ('open', 'reviewing')
      AND resolution_note IS NULL
      AND resolution_note_digest IS NULL
    )
    OR (
      status IN ('resolved', 'dismissed')
      AND resolution_note IS NOT NULL
      AND resolution_note_digest IS NOT NULL
    )
  ),
  CHECK (
    (reporter_id IS NOT NULL AND NOT reporter_deidentified)
    OR (reporter_id IS NULL AND reporter_deidentified)
  ),
  UNIQUE (request_id, id)
);

CREATE TABLE public.build_request_report_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.build_request_reports(id)
    ON DELETE CASCADE,
  request_id UUID NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  action TEXT NOT NULL CHECK (
    action IN ('create', 'review', 'resolve', 'dismiss')
  ),
  resulting_status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (request_id, report_id)
    REFERENCES public.build_request_reports(request_id, id)
    ON DELETE CASCADE,
  CHECK (
    (actor_id IS NOT NULL AND NOT actor_deidentified)
    OR (actor_id IS NULL AND actor_deidentified)
  ),
  UNIQUE (actor_id, idempotency_key)
);

CREATE INDEX build_request_reports_operator_queue
  ON public.build_request_reports (
    priority DESC, created_at, id
  ) WHERE status IN ('open', 'reviewing');

CREATE TABLE public.build_request_notification_preferences (
  account_id UUID PRIMARY KEY
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  preference_version INTEGER NOT NULL DEFAULT 1 CHECK (preference_version > 0),
  transactional_email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.build_request_notification_preference_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  account_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  preference_version INTEGER NOT NULL,
  transactional_email_enabled BOOLEAN NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (account_id IS NOT NULL AND NOT account_deidentified)
    OR (account_id IS NULL AND account_deidentified)
  ),
  UNIQUE (account_id, idempotency_key)
);

CREATE TABLE public.build_request_notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL
    REFERENCES public.build_requests(id) ON DELETE CASCADE,
  event_id UUID,
  report_id UUID
    REFERENCES public.build_request_reports(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recipient_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  channel TEXT NOT NULL CHECK (channel = 'transactional_email'),
  template_key TEXT NOT NULL CHECK (
    template_key IN (
      'request_submitted', 'request_action_needed',
      'request_status_changed', 'request_delivery_ready',
      'request_report_received'
    )
  ),
  delivery_state TEXT NOT NULL DEFAULT 'pending' CHECK (
    delivery_state IN (
      'pending', 'claimed', 'retry', 'delivered', 'suppressed', 'dead'
    )
  ),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  claim_token UUID,
  claim_expires_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  suppression_reason TEXT CHECK (
    suppression_reason IN (
      'control_off', 'preference_off', 'identity_unavailable',
      'authorization_ended', 'attempts_exhausted'
    )
  ),
  last_error_code TEXT CHECK (
    last_error_code IS NULL
    OR last_error_code ~ '^[a-z][a-z0-9_]{0,63}$'
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (request_id, event_id)
    REFERENCES public.build_request_events(request_id, id)
    ON DELETE CASCADE,
  UNIQUE NULLS NOT DISTINCT (
    event_id, report_id, recipient_id, channel
  ),
  CHECK ((event_id IS NOT NULL) <> (report_id IS NOT NULL)),
  CHECK (
    (delivery_state = 'claimed'
      AND claim_token IS NOT NULL
      AND claim_expires_at IS NOT NULL)
    OR (
      delivery_state <> 'claimed'
      AND claim_token IS NULL
      AND claim_expires_at IS NULL
    )
  ),
  CHECK (
    (delivery_state = 'delivered' AND delivered_at IS NOT NULL)
    OR (delivery_state <> 'delivered' AND delivered_at IS NULL)
  ),
  CHECK (
    (recipient_id IS NOT NULL AND NOT recipient_deidentified)
    OR (recipient_id IS NULL AND recipient_deidentified)
  )
);

CREATE INDEX build_request_notification_work
  ON public.build_request_notification_deliveries (
    next_attempt_at, created_at, id
  ) WHERE delivery_state IN ('pending', 'retry', 'claimed');

CREATE INDEX build_request_events_notification_projection
  ON public.build_request_events (occurred_at, id)
  WHERE participant_visible;

ALTER TABLE public.build_request_delivery_revisions
  ADD CONSTRAINT build_request_delivery_revision_manifest_binding_unique
  UNIQUE NULLS NOT DISTINCT (
    request_id, id, artifact_manifest_digest
  );

CREATE TABLE public.build_request_publication_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL
    REFERENCES public.build_requests(id) ON DELETE CASCADE,
  proposal_version INTEGER NOT NULL DEFAULT 1 CHECK (proposal_version > 0),
  proposal_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    proposal_status IN (
      'draft', 'consent_pending', 'fully_consented',
      'in_airlock', 'published', 'declined', 'withdrawn', 'removed'
    )
  ),
  delivery_revision_id UUID NOT NULL,
  manifest_digest TEXT NOT NULL CHECK (manifest_digest ~ '^[0-9a-f]{64}$'),
  safe_title TEXT NOT NULL
    CHECK (char_length(btrim(safe_title)) BETWEEN 4 AND 120),
  safe_summary TEXT NOT NULL
    CHECK (char_length(btrim(safe_summary)) BETWEEN 40 AND 1000),
  content_digest TEXT NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requester_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  builder_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  builder_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  requester_attribution TEXT NOT NULL DEFAULT 'anonymous'
    CHECK (requester_attribution IN ('anonymous', 'credited')),
  reuse_permission TEXT NOT NULL DEFAULT 'view_only'
    CHECK (reuse_permission IN ('view_only', 'adapt_with_credit')),
  requester_consented_at TIMESTAMPTZ,
  builder_consented_at TIMESTAMPTZ,
  submitted_to_airlock_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  content_purged_at TIMESTAMPTZ,
  FOREIGN KEY (
    request_id, delivery_revision_id, manifest_digest
  ) REFERENCES public.build_request_delivery_revisions(
    request_id, id, artifact_manifest_digest
  ) ON DELETE RESTRICT,
  CHECK (
    requester_id IS NULL
    OR builder_id IS NULL
    OR requester_id <> builder_id
  ),
  CHECK (
    (requester_id IS NOT NULL AND NOT requester_deidentified)
    OR (requester_id IS NULL AND requester_deidentified)
  ),
  CHECK (
    (builder_id IS NOT NULL AND NOT builder_deidentified)
    OR (builder_id IS NULL AND builder_deidentified)
  ),
  CHECK (
    proposal_status NOT IN ('fully_consented', 'in_airlock', 'published')
    OR (
      requester_consented_at IS NOT NULL
      AND builder_consented_at IS NOT NULL
    )
  ),
  CHECK (
    (proposal_status = 'published' AND published_at IS NOT NULL)
    OR proposal_status IN ('withdrawn', 'removed')
    OR (
      proposal_status NOT IN ('published', 'withdrawn', 'removed')
      AND published_at IS NULL
    )
  ),
  CHECK (
    (proposal_status IN ('declined', 'withdrawn', 'removed')
      AND ended_at IS NOT NULL)
    OR (
      proposal_status NOT IN ('declined', 'withdrawn', 'removed')
      AND ended_at IS NULL
    )
  ),
  UNIQUE (request_id, id),
  UNIQUE (request_id, proposal_version)
);

CREATE UNIQUE INDEX build_request_one_open_publication_proposal
  ON public.build_request_publication_proposals (request_id)
  WHERE proposal_status NOT IN ('declined', 'withdrawn', 'removed');

CREATE TABLE public.build_request_publication_consent_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL
    REFERENCES public.build_request_publication_proposals(id)
    ON DELETE CASCADE,
  request_id UUID NOT NULL,
  proposal_version INTEGER NOT NULL,
  content_digest TEXT NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  safe_title_snapshot TEXT NOT NULL
    CHECK (char_length(btrim(safe_title_snapshot)) BETWEEN 4 AND 120),
  safe_summary_snapshot TEXT NOT NULL
    CHECK (char_length(btrim(safe_summary_snapshot)) BETWEEN 40 AND 1000),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('requester', 'builder')),
  decision TEXT NOT NULL CHECK (
    decision IN ('consent', 'decline', 'withdraw')
  ),
  attribution_choice TEXT CHECK (
    attribution_choice IS NULL
    OR attribution_choice IN ('anonymous', 'credited')
  ),
  reuse_permission TEXT CHECK (
    reuse_permission IS NULL
    OR reuse_permission IN ('view_only', 'adapt_with_credit')
  ),
  publication_terms_version TEXT NOT NULL CHECK (
    publication_terms_version
      ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  idempotency_key TEXT NOT NULL CHECK (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (request_id, proposal_id)
    REFERENCES public.build_request_publication_proposals(request_id, id)
    ON DELETE CASCADE,
  CHECK (
    (
      decision = 'consent'
      AND actor_role = 'requester'
      AND attribution_choice IS NOT NULL
      AND reuse_permission IS NULL
    )
    OR (
      decision = 'consent'
      AND actor_role = 'builder'
      AND attribution_choice IS NULL
      AND reuse_permission IS NOT NULL
    )
    OR (
      decision IN ('decline', 'withdraw')
      AND attribution_choice IS NULL
      AND reuse_permission IS NULL
    )
  ),
  CHECK (
    (actor_id IS NOT NULL AND NOT actor_deidentified)
    OR (actor_id IS NULL AND actor_deidentified)
  ),
  UNIQUE (actor_id, idempotency_key)
);

CREATE TABLE public.build_request_publication_bridge_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL UNIQUE
    REFERENCES public.build_request_publication_proposals(id)
    ON DELETE CASCADE,
  request_id UUID NOT NULL,
  published_project_id UUID NOT NULL
    REFERENCES public.prompts(id) ON DELETE RESTRICT,
  service_idempotency_key TEXT NOT NULL UNIQUE CHECK (
    service_idempotency_key
      ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  ),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (request_id, proposal_id)
    REFERENCES public.build_request_publication_proposals(request_id, id)
    ON DELETE CASCADE
);

CREATE TABLE public.build_request_public_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_slug TEXT NOT NULL UNIQUE CHECK (
    public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{12}$'
  ),
  proposal_id UUID NOT NULL UNIQUE
    REFERENCES public.build_request_publication_proposals(id)
    ON DELETE CASCADE,
  request_id UUID NOT NULL,
  safe_title TEXT NOT NULL
    CHECK (char_length(btrim(safe_title)) BETWEEN 4 AND 120),
  safe_summary TEXT NOT NULL
    CHECK (char_length(btrim(safe_summary)) BETWEEN 40 AND 1000),
  builder_display_name TEXT NOT NULL
    CHECK (char_length(btrim(builder_display_name)) BETWEEN 1 AND 120),
  builder_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  requester_display_name TEXT CHECK (
    requester_display_name IS NULL
    OR char_length(btrim(requester_display_name)) BETWEEN 1 AND 120
  ),
  requester_deidentified BOOLEAN NOT NULL DEFAULT FALSE,
  reuse_permission TEXT NOT NULL CHECK (
    reuse_permission IN ('view_only', 'adapt_with_credit')
  ),
  published_project_id UUID NOT NULL
    REFERENCES public.prompts(id) ON DELETE RESTRICT,
  public_version INTEGER NOT NULL DEFAULT 1 CHECK (public_version > 0),
  published_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  withdrawn_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  FOREIGN KEY (request_id, proposal_id)
    REFERENCES public.build_request_publication_proposals(request_id, id)
    ON DELETE CASCADE,
  CHECK (NOT (withdrawn_at IS NOT NULL AND removed_at IS NOT NULL))
);

CREATE INDEX build_request_public_outcomes_discovery
  ON public.build_request_public_outcomes (
    published_at DESC, public_slug DESC
  )
  WHERE withdrawn_at IS NULL AND removed_at IS NULL;

-- All new relations are RPC-only. RLS plus the absence of direct policies is
-- deliberate defense in depth; service_role also uses narrowly granted RPCs.
ALTER TABLE public.build_request_operator_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_operator_membership_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_intake_risk_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_intake_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_readiness_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_readiness_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_public_control_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_report_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_notification_preference_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_publication_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_publication_consent_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_publication_bridge_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_request_public_outcomes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.build_request_operator_memberships,
  public.build_request_operator_membership_receipts,
  public.build_request_intake_risk_grants,
  public.build_request_intake_attestations,
  public.build_request_readiness_evidence,
  public.build_request_readiness_receipts,
  public.build_request_public_control_receipts,
  public.build_request_reports,
  public.build_request_report_receipts,
  public.build_request_notification_preferences,
  public.build_request_notification_preference_receipts,
  public.build_request_notification_deliveries,
  public.build_request_publication_proposals,
  public.build_request_publication_consent_receipts,
  public.build_request_publication_bridge_receipts,
  public.build_request_public_outcomes
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.request_public_append_only_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_old JSONB := to_jsonb(OLD);
  v_new JSONB := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) END;
  v_request_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    BEGIN
      v_request_id := NULLIF(v_old->>'request_id', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_request_id := NULL;
    END;
    IF v_request_id IS NOT NULL
      AND private.request_audit_cleanup_delete_allowed_v1(v_request_id)
    THEN
      RETURN OLD;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME IN (
      'build_request_readiness_receipts',
      'build_request_public_control_receipts',
      'build_request_report_receipts',
      'build_request_publication_consent_receipts'
    )
      AND v_old->>'actor_id' IS NOT NULL
      AND v_new->>'actor_id' IS NULL
      AND COALESCE((v_old->>'actor_deidentified')::BOOLEAN, FALSE) = FALSE
      AND COALESCE((v_new->>'actor_deidentified')::BOOLEAN, FALSE) = TRUE
      AND (v_old - ARRAY['actor_id', 'actor_deidentified'])
        = (v_new - ARRAY['actor_id', 'actor_deidentified'])
    THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME =
        'build_request_notification_preference_receipts'
      AND v_old->>'account_id' IS NOT NULL
      AND v_new->>'account_id' IS NULL
      AND COALESCE((v_old->>'account_deidentified')::BOOLEAN, FALSE)
        = FALSE
      AND COALESCE((v_new->>'account_deidentified')::BOOLEAN, FALSE)
        = TRUE
      AND (v_old - ARRAY['account_id', 'account_deidentified'])
        = (v_new - ARRAY['account_id', 'account_deidentified'])
    THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME =
        'build_request_operator_membership_receipts'
      AND (
        v_new->>'actor_id' IS NOT DISTINCT FROM v_old->>'actor_id'
        OR (v_old->>'actor_id' IS NOT NULL AND v_new->>'actor_id' IS NULL)
      )
      AND (
        v_new->>'account_id' IS NOT DISTINCT FROM v_old->>'account_id'
        OR (
          v_old->>'account_id' IS NOT NULL
          AND v_new->>'account_id' IS NULL
        )
      )
      AND COALESCE(
        (v_new->>'actor_deidentified')::BOOLEAN,
        FALSE
      ) = (
        COALESCE((v_old->>'actor_deidentified')::BOOLEAN, FALSE)
        OR (
          v_old->>'actor_id' IS NOT NULL
          AND v_new->>'actor_id' IS NULL
        )
      )
      AND COALESCE(
        (v_new->>'account_deidentified')::BOOLEAN,
        FALSE
      ) = (
        COALESCE((v_old->>'account_deidentified')::BOOLEAN, FALSE)
        OR (
          v_old->>'account_id' IS NOT NULL
          AND v_new->>'account_id' IS NULL
        )
      )
      AND (v_old - ARRAY[
        'actor_id', 'actor_deidentified',
        'account_id', 'account_deidentified'
      ]) = (v_new - ARRAY[
        'actor_id', 'actor_deidentified',
        'account_id', 'account_deidentified'
      ])
    THEN
      RETURN NEW;
    ELSIF TG_TABLE_NAME = 'build_request_intake_attestations'
      AND v_old->>'requester_id' IS NOT NULL
      AND v_new->>'requester_id' IS NULL
      AND COALESCE((v_old->>'requester_deidentified')::BOOLEAN, FALSE)
        = FALSE
      AND COALESCE((v_new->>'requester_deidentified')::BOOLEAN, FALSE)
        = TRUE
      AND (v_old - ARRAY['requester_id', 'requester_deidentified'])
        = (v_new - ARRAY['requester_id', 'requester_deidentified'])
    THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION USING ERRCODE = '55000',
    MESSAGE = format('%I is append-only.', TG_TABLE_NAME);
END;
$$;

CREATE TRIGGER build_request_operator_receipts_append_only
  BEFORE UPDATE OR DELETE
  ON public.build_request_operator_membership_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_public_append_only_v1();
CREATE TRIGGER build_request_intake_attestations_append_only
  BEFORE UPDATE OR DELETE
  ON public.build_request_intake_attestations
  FOR EACH ROW EXECUTE FUNCTION private.request_public_append_only_v1();
CREATE TRIGGER build_request_readiness_receipts_append_only
  BEFORE UPDATE OR DELETE
  ON public.build_request_readiness_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_public_append_only_v1();
CREATE TRIGGER build_request_public_control_receipts_append_only
  BEFORE UPDATE OR DELETE
  ON public.build_request_public_control_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_public_append_only_v1();
CREATE TRIGGER build_request_report_receipts_append_only
  BEFORE UPDATE OR DELETE
  ON public.build_request_report_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_public_append_only_v1();
CREATE TRIGGER build_request_notification_preference_receipts_append_only
  BEFORE UPDATE OR DELETE
  ON public.build_request_notification_preference_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_public_append_only_v1();
CREATE TRIGGER build_request_publication_consent_append_only
  BEFORE UPDATE OR DELETE
  ON public.build_request_publication_consent_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_public_append_only_v1();
CREATE TRIGGER build_request_publication_bridge_append_only
  BEFORE UPDATE OR DELETE
  ON public.build_request_publication_bridge_receipts
  FOR EACH ROW EXECUTE FUNCTION private.request_public_append_only_v1();

CREATE OR REPLACE FUNCTION private.request_public_actor_is_confirmed_v1(
  p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_actor_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      JOIN auth.users AS auth_user
        ON auth_user.id = profile.id
      WHERE profile.id = p_actor_id
        AND auth_user.email_confirmed_at IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.build_request_deidentified_accounts AS deidentified
      WHERE deidentified.subject_digest =
        private.request_account_pseudonym_v1(p_actor_id)
    );
$$;

CREATE OR REPLACE FUNCTION private.request_public_operator_is_available_v1(
  p_actor_id UUID,
  p_operator_role TEXT,
  p_excluding_request_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_membership public.build_request_operator_memberships%ROWTYPE;
  v_active_count INTEGER;
BEGIN
  IF p_actor_id IS NULL
    OR p_operator_role NOT IN ('triager', 'builder', 'reviewer')
    OR NOT private.request_public_actor_is_confirmed_v1(p_actor_id)
  THEN
    RETURN FALSE;
  END IF;

  SELECT membership.* INTO v_membership
  FROM public.build_request_operator_memberships AS membership
  WHERE membership.account_id = p_actor_id
    AND membership.operator_role = p_operator_role
    AND membership.membership_state = 'active'
    AND (
      membership.available_from IS NULL
      OR membership.available_from <= clock_timestamp()
    )
    AND (
      membership.available_until IS NULL
      OR membership.available_until > clock_timestamp()
    );
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF p_operator_role = 'triager' THEN
    IF private.request_actor_role_v1(p_actor_id) <> 'admin' THEN
      RETURN FALSE;
    END IF;
    SELECT count(*) INTO v_active_count
    FROM public.build_request_participants AS participant
    JOIN public.build_requests AS request_case
      ON request_case.id = participant.request_id
    WHERE participant.account_id = p_actor_id
      AND participant.actor_role = 'triager'
      AND participant.active
      AND request_case.moderation_state <> 'removed'
      AND request_case.lifecycle_state NOT IN ('completed', 'closed')
      AND (
        p_excluding_request_id IS NULL
        OR participant.request_id <> p_excluding_request_id
      );
  ELSE
    SELECT count(*) INTO v_active_count
    FROM public.build_request_assignments AS assignment
    JOIN public.build_requests AS request_case
      ON request_case.id = assignment.request_id
    WHERE assignment.account_id = p_actor_id
      AND assignment.assignment_role = p_operator_role
      AND assignment.active
      AND request_case.moderation_state <> 'removed'
      AND request_case.lifecycle_state NOT IN ('completed', 'closed')
      AND (
        p_excluding_request_id IS NULL
        OR assignment.request_id <> p_excluding_request_id
      );
  END IF;

  RETURN v_active_count < v_membership.max_active_cases;
END;
$$;

CREATE OR REPLACE FUNCTION private.request_public_operator_is_rostered_v1(
  p_actor_id UUID,
  p_operator_role TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_actor_id IS NOT NULL
    AND p_operator_role IN ('triager', 'builder', 'reviewer')
    AND private.request_public_actor_is_confirmed_v1(p_actor_id)
    AND (
      p_operator_role <> 'triager'
      OR private.request_actor_role_v1(p_actor_id) = 'admin'
    )
    AND EXISTS (
      SELECT 1
      FROM public.build_request_operator_memberships AS membership
      WHERE membership.account_id = p_actor_id
        AND membership.operator_role = p_operator_role
        AND membership.membership_state = 'active'
        AND (
          membership.available_from IS NULL
          OR membership.available_from <= clock_timestamp()
        )
        AND (
          membership.available_until IS NULL
          OR membership.available_until > clock_timestamp()
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.request_public_roster_ready_v1()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.build_request_operator_memberships AS triager
      WHERE triager.operator_role = 'triager'
        AND private.request_public_operator_is_rostered_v1(
          triager.account_id, 'triager'
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.build_request_operator_memberships AS builder
      JOIN public.build_request_operator_memberships AS reviewer
        ON reviewer.operator_role = 'reviewer'
        AND reviewer.account_id IS DISTINCT FROM builder.account_id
      WHERE builder.operator_role = 'builder'
        AND private.request_public_operator_is_rostered_v1(
          builder.account_id, 'builder'
        )
        AND private.request_public_operator_is_rostered_v1(
          reviewer.account_id, 'reviewer'
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.request_public_readiness_gate_v1(
  p_gate_kind TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.build_request_readiness_evidence AS evidence
    CROSS JOIN public.build_request_controls AS control
    WHERE evidence.gate_kind = p_gate_kind
      AND evidence.evidence_state = 'confirmed'
      AND control.singleton
      AND (
        evidence.valid_until IS NULL
        OR evidence.valid_until > clock_timestamp()
      )
      AND (
        p_gate_kind <> 'legal'
        OR evidence.policy_snapshot = jsonb_build_object(
          'acceptableUse', control.acceptable_use_version,
          'privacy', control.privacy_version,
          'publicationTerms', control.publication_terms_version,
          'requesterRights', control.requester_rights_version,
          'terms', control.terms_version
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.request_public_community_airlock_ready_v1()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
      SELECT 1
      FROM public.community_project_pilot_controls AS control
      WHERE control.singleton
        AND control.allow_publication
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'reconciliation'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > clock_timestamp() - INTERVAL '26 hours'
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'report_intake'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > clock_timestamp() - INTERVAL '26 hours'
        AND operation.last_metrics->>'operator_alert_delivery' = 'verified'
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'report_alerts'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > clock_timestamp() - INTERVAL '1 hour'
        AND operation.last_metrics->>'independentAlertChannels' = '2'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.community_project_reports AS report
      WHERE report.status IN ('open', 'reviewing')
        AND report.alert_status <> 'delivered'
    );
$$;

CREATE OR REPLACE FUNCTION private.request_enforce_operator_roster_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_required BOOLEAN;
  v_role TEXT;
  v_requester_id UUID;
  v_other_actor UUID;
BEGIN
  SELECT control.operator_roster_required INTO STRICT v_required
  FROM public.build_request_controls AS control
  WHERE control.singleton;
  IF NOT v_required OR NOT NEW.active THEN
    RETURN NEW;
  END IF;

  v_role := CASE
    WHEN TG_TABLE_NAME = 'build_request_participants'
      THEN to_jsonb(NEW)->>'actor_role'
    ELSE to_jsonb(NEW)->>'assignment_role'
  END;
  IF v_role NOT IN ('triager', 'builder', 'reviewer') THEN
    RETURN NEW;
  END IF;
  IF NEW.account_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request operator is not available.',
      DETAIL = 'request_authority:operator_unavailable';
  END IF;
  IF v_role IN ('builder', 'reviewer') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'request-assignment-identity:' || NEW.request_id::TEXT,
      0
    ));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-operator:' || NEW.account_id::TEXT || ':' || v_role,
    0
  ));
  IF NOT private.request_public_operator_is_available_v1(
      NEW.account_id, v_role, NEW.request_id
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request operator is not available.',
      DETAIL = 'request_authority:operator_unavailable';
  END IF;

  SELECT request_case.requester_id INTO v_requester_id
  FROM public.build_requests AS request_case
  WHERE request_case.id = NEW.request_id;
  IF v_role IN ('builder', 'reviewer')
    AND NEW.account_id = v_requester_id
  THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Request assignment roles must remain independent.',
        DETAIL = 'request_authority:operator_unavailable';
  END IF;

  IF v_role = 'builder' THEN
    SELECT assignment.account_id INTO v_other_actor
    FROM public.build_request_assignments AS assignment
    WHERE assignment.request_id = NEW.request_id
      AND assignment.assignment_role = 'reviewer'
      AND assignment.active
    LIMIT 1;
  ELSIF v_role = 'reviewer' THEN
    SELECT assignment.account_id INTO v_other_actor
    FROM public.build_request_assignments AS assignment
    WHERE assignment.request_id = NEW.request_id
      AND assignment.assignment_role = 'builder'
      AND assignment.active
    LIMIT 1;
  END IF;
  IF v_other_actor IS NOT NULL AND v_other_actor = NEW.account_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request assignment roles must remain independent.',
      DETAIL = 'request_authority:operator_unavailable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_participant_operator_roster
  BEFORE INSERT OR UPDATE OF account_id, actor_role, active
  ON public.build_request_participants
  FOR EACH ROW EXECUTE FUNCTION private.request_enforce_operator_roster_v1();

CREATE TRIGGER build_request_assignment_operator_roster
  BEFORE INSERT OR UPDATE OF account_id, assignment_role, active
  ON public.build_request_assignments
  FOR EACH ROW EXECUTE FUNCTION private.request_enforce_operator_roster_v1();

CREATE OR REPLACE FUNCTION private.request_enforce_fulfillment_capacity_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_controls public.build_request_controls%ROWTYPE;
  v_fulfillment_states CONSTANT TEXT[] := ARRAY[
    'accepted', 'building', 'review_pending', 'repair_required',
    'delivery_ready', 'delivered'
  ]::TEXT[];
  v_active INTEGER;
BEGIN
  IF NEW.lifecycle_state <> ALL(v_fulfillment_states)
    OR NEW.moderation_state = 'removed'
    OR (
      OLD.lifecycle_state = ANY(v_fulfillment_states)
      AND OLD.moderation_state <> 'removed'
    )
  THEN
    RETURN NEW;
  END IF;
  SELECT * INTO STRICT v_controls
  FROM public.build_request_controls
  WHERE singleton
  FOR UPDATE;
  SELECT count(*) INTO v_active
  FROM public.build_requests AS request_case
  WHERE request_case.id <> NEW.id
    AND request_case.moderation_state <> 'removed'
    AND request_case.lifecycle_state = ANY(v_fulfillment_states);
  IF v_active >= v_controls.fulfillment_case_capacity THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request fulfillment capacity is full.',
      DETAIL = 'request_authority:capacity_full';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_fulfillment_capacity
  BEFORE UPDATE OF lifecycle_state, moderation_state
  ON public.build_requests
  FOR EACH ROW EXECUTE FUNCTION private.request_enforce_fulfillment_capacity_v1();

CREATE OR REPLACE FUNCTION private.request_enforce_public_controls_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_active INTEGER;
  v_fulfillment INTEGER;
BEGIN
  IF (
      NEW.terms_version,
      NEW.privacy_version,
      NEW.acceptable_use_version,
      NEW.requester_rights_version,
      NEW.publication_terms_version
    ) IS DISTINCT FROM (
      OLD.terms_version,
      OLD.privacy_version,
      OLD.acceptable_use_version,
      OLD.requester_rights_version,
      OLD.publication_terms_version
    )
    AND (
      NEW.accepting_requests
      OR NEW.publication_consent_enabled
      OR NEW.publication_airlock_enabled
      OR NEW.public_outcomes_enabled
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request policies can rotate only while public gates are off.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  SELECT count(*) INTO v_active
  FROM public.build_requests AS request_case
  WHERE request_case.moderation_state <> 'removed'
    AND request_case.lifecycle_state NOT IN ('completed', 'closed');
  SELECT count(*) INTO v_fulfillment
  FROM public.build_requests AS request_case
  WHERE request_case.moderation_state <> 'removed'
    AND request_case.lifecycle_state IN (
      'accepted', 'building', 'review_pending', 'repair_required',
      'delivery_ready', 'delivered'
    );
  IF NEW.active_case_capacity < v_active
    OR NEW.fulfillment_case_capacity < v_fulfillment
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request controls cannot strand active work.',
      DETAIL = 'request_authority:capacity_full';
  END IF;
  IF NEW.assigning_requests
    AND (
      NOT NEW.operator_roster_required
      OR NOT private.request_public_roster_ready_v1()
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request operator roster is not ready.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF NEW.accepting_requests
    AND (
      NOT NEW.operator_roster_required
      OR NOT private.request_public_roster_ready_v1()
      OR NOT private.request_public_readiness_gate_v1('legal')
      OR NOT private.request_public_readiness_gate_v1('incident_owner')
      OR NOT private.request_public_readiness_gate_v1('responsive_qa')
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request intake readiness is incomplete.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF NEW.accepting_requests
    AND NEW.intake_audience = 'authenticated'
    AND (
      NOT NEW.public_intake_risk_screening
      OR NOT private.request_public_readiness_gate_v1('waf')
      OR NOT private.request_public_readiness_gate_v1(
        'attended_lifecycle'
      )
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Public Request intake readiness is incomplete.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF NEW.transactional_notifications_enabled
    AND NOT private.request_public_readiness_gate_v1(
      'notification_transport'
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request notification readiness is incomplete.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF NEW.publication_consent_enabled
    AND NOT private.request_public_readiness_gate_v1('legal')
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request publication terms are not ready.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF (
      NEW.publication_airlock_enabled
      OR NEW.public_outcomes_enabled
    )
    AND NOT private.request_public_community_airlock_ready_v1()
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request publication airlock is not ready.',
      DETAIL = 'request_authority:publication_blocked';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_public_controls_authority
  BEFORE UPDATE ON public.build_request_controls
  FOR EACH ROW EXECUTE FUNCTION private.request_enforce_public_controls_v1();

CREATE OR REPLACE FUNCTION private.request_hide_public_outcome_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.moderation_state = 'removed'
    AND OLD.moderation_state IS DISTINCT FROM NEW.moderation_state
  THEN
    UPDATE public.build_request_public_outcomes
    SET removed_at = COALESCE(removed_at, clock_timestamp()),
        withdrawn_at = NULL
    WHERE request_id = NEW.id
      AND removed_at IS NULL;
    UPDATE public.build_request_publication_proposals
    SET proposal_status = 'removed',
        ended_at = COALESCE(ended_at, clock_timestamp()),
        updated_at = clock_timestamp()
    WHERE request_id = NEW.id
      AND proposal_status NOT IN ('declined', 'withdrawn', 'removed');
  ELSIF NEW.publication_state = 'withdrawn'
    AND OLD.publication_state IS DISTINCT FROM NEW.publication_state
  THEN
    UPDATE public.build_request_public_outcomes
    SET withdrawn_at = COALESCE(withdrawn_at, clock_timestamp())
    WHERE request_id = NEW.id
      AND removed_at IS NULL
      AND withdrawn_at IS NULL;
    UPDATE public.build_request_publication_proposals
    SET proposal_status = 'withdrawn',
        ended_at = COALESCE(ended_at, clock_timestamp()),
        updated_at = clock_timestamp()
    WHERE request_id = NEW.id
      AND proposal_status NOT IN ('declined', 'withdrawn', 'removed');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_hide_public_outcome
  AFTER UPDATE OF moderation_state, publication_state
  ON public.build_requests
  FOR EACH ROW EXECUTE FUNCTION private.request_hide_public_outcome_v1();

-- The private V1 account-deidentification RPC inserts this tombstone before it
-- clears Request identities. Extending that durable hook keeps the public-ready
-- layer compatible without replacing the already-reviewed core procedure.
CREATE OR REPLACE FUNCTION private.request_deidentify_public_architecture_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_at TIMESTAMPTZ := COALESCE(NEW.deidentified_at, clock_timestamp());
BEGIN
  UPDATE public.build_request_public_outcomes AS outcome
  SET withdrawn_at = COALESCE(outcome.withdrawn_at, v_at),
      builder_display_name = CASE
        WHEN proposal.builder_id IS NOT NULL
          AND private.request_account_pseudonym_v1(proposal.builder_id)
            = NEW.subject_digest
          THEN 'Former participant'
        ELSE outcome.builder_display_name
      END,
      builder_deidentified = outcome.builder_deidentified
        OR (
          proposal.builder_id IS NOT NULL
          AND private.request_account_pseudonym_v1(proposal.builder_id)
            = NEW.subject_digest
        ),
      requester_display_name = CASE
        WHEN proposal.requester_id IS NOT NULL
          AND private.request_account_pseudonym_v1(proposal.requester_id)
            = NEW.subject_digest
          THEN NULL
        ELSE outcome.requester_display_name
      END,
      requester_deidentified = outcome.requester_deidentified
        OR (
          proposal.requester_id IS NOT NULL
          AND private.request_account_pseudonym_v1(proposal.requester_id)
            = NEW.subject_digest
        )
  FROM public.build_request_publication_proposals AS proposal
  WHERE proposal.id = outcome.proposal_id
    AND (
      (
        proposal.requester_id IS NOT NULL
        AND private.request_account_pseudonym_v1(proposal.requester_id)
          = NEW.subject_digest
      )
      OR (
        proposal.builder_id IS NOT NULL
        AND private.request_account_pseudonym_v1(proposal.builder_id)
          = NEW.subject_digest
      )
    );

  -- The private authority already changes publication_state when the
  -- requester is deidentified. A builder is also a consent principal, so
  -- align the case root before that authority records its account-
  -- deidentification event and version increment.
  UPDATE public.build_requests AS request_case
  SET publication_state = 'withdrawn',
      updated_at = v_at
  WHERE request_case.publication_state IN (
      'consent_pending', 'consented_pending_airlock', 'published'
    )
    AND EXISTS (
      SELECT 1
      FROM public.build_request_publication_proposals AS proposal
      WHERE proposal.request_id = request_case.id
        AND proposal.builder_id IS NOT NULL
        AND private.request_account_pseudonym_v1(proposal.builder_id)
          = NEW.subject_digest
        AND (
          request_case.requester_id IS NULL
          OR private.request_account_pseudonym_v1(
            request_case.requester_id
          ) <> NEW.subject_digest
        )
    );

  UPDATE public.build_request_operator_memberships
  SET account_id = NULL,
      account_deidentified = TRUE,
      membership_state = 'revoked',
      available_from = NULL,
      available_until = NULL,
      changed_at = v_at
  WHERE account_id IS NOT NULL
    AND private.request_account_pseudonym_v1(account_id) = NEW.subject_digest;
  UPDATE public.build_request_operator_memberships
  SET changed_by = NULL, changed_by_deidentified = TRUE
  WHERE changed_by IS NOT NULL
    AND private.request_account_pseudonym_v1(changed_by) = NEW.subject_digest;
  UPDATE public.build_request_operator_membership_receipts
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id IS NOT NULL
    AND private.request_account_pseudonym_v1(actor_id) = NEW.subject_digest;
  UPDATE public.build_request_operator_membership_receipts
  SET account_id = NULL, account_deidentified = TRUE
  WHERE account_id IS NOT NULL
    AND private.request_account_pseudonym_v1(account_id) = NEW.subject_digest;
  UPDATE public.build_request_intake_risk_grants
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id IS NOT NULL
    AND private.request_account_pseudonym_v1(actor_id) = NEW.subject_digest;
  UPDATE public.build_request_intake_attestations
  SET requester_id = NULL, requester_deidentified = TRUE
  WHERE requester_id IS NOT NULL
    AND private.request_account_pseudonym_v1(requester_id) = NEW.subject_digest;
  UPDATE public.build_request_readiness_evidence
  SET confirmed_by = NULL, confirmed_by_deidentified = TRUE
  WHERE confirmed_by IS NOT NULL
    AND private.request_account_pseudonym_v1(confirmed_by) = NEW.subject_digest;
  UPDATE public.build_request_readiness_receipts
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id IS NOT NULL
    AND private.request_account_pseudonym_v1(actor_id) = NEW.subject_digest;
  UPDATE public.build_request_public_control_receipts
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id IS NOT NULL
    AND private.request_account_pseudonym_v1(actor_id) = NEW.subject_digest;
  UPDATE public.build_request_reports
  SET reporter_id = NULL, reporter_deidentified = TRUE
  WHERE reporter_id IS NOT NULL
    AND private.request_account_pseudonym_v1(reporter_id) = NEW.subject_digest;
  UPDATE public.build_request_report_receipts
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id IS NOT NULL
    AND private.request_account_pseudonym_v1(actor_id) = NEW.subject_digest;
  DELETE FROM public.build_request_notification_preferences
  WHERE account_id IS NOT NULL
    AND private.request_account_pseudonym_v1(account_id) = NEW.subject_digest;
  UPDATE public.build_request_notification_preference_receipts
  SET account_id = NULL, account_deidentified = TRUE
  WHERE account_id IS NOT NULL
    AND private.request_account_pseudonym_v1(account_id) = NEW.subject_digest;
  UPDATE public.build_request_notification_deliveries
  SET recipient_id = NULL,
      recipient_deidentified = TRUE,
      delivery_state = CASE
        WHEN delivery_state = 'delivered' THEN delivery_state
        ELSE 'suppressed'
      END,
      suppression_reason = CASE
        WHEN delivery_state = 'delivered' THEN suppression_reason
        ELSE 'identity_unavailable'
      END,
      claim_token = NULL,
      claim_expires_at = NULL,
      updated_at = v_at
  WHERE recipient_id IS NOT NULL
    AND private.request_account_pseudonym_v1(recipient_id) = NEW.subject_digest;
  UPDATE public.build_request_publication_consent_receipts
  SET actor_id = NULL, actor_deidentified = TRUE
  WHERE actor_id IS NOT NULL
    AND private.request_account_pseudonym_v1(actor_id) = NEW.subject_digest;
  UPDATE public.build_request_retention_holds AS publication_hold
  SET released_at = v_at,
      release_resolution =
        'Public outcome consent ended when a participant account was deidentified.'
  WHERE publication_hold.hold_kind = 'legal'
    AND publication_hold.reason =
      'Active public outcome consent and publication evidence.'
    AND publication_hold.released_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.build_request_publication_proposals AS proposal
      WHERE proposal.request_id = publication_hold.request_id
        AND (
          (
            proposal.requester_id IS NOT NULL
            AND private.request_account_pseudonym_v1(
              proposal.requester_id
            ) = NEW.subject_digest
          )
          OR (
            proposal.builder_id IS NOT NULL
            AND private.request_account_pseudonym_v1(
              proposal.builder_id
            ) = NEW.subject_digest
          )
        )
    );
  UPDATE public.build_request_publication_proposals
  SET requester_id = CASE
        WHEN requester_id IS NOT NULL
          AND private.request_account_pseudonym_v1(requester_id)
            = NEW.subject_digest
          THEN NULL
        ELSE requester_id
      END,
      requester_deidentified = requester_deidentified
        OR (
          requester_id IS NOT NULL
          AND private.request_account_pseudonym_v1(requester_id)
            = NEW.subject_digest
        ),
      builder_id = CASE
        WHEN builder_id IS NOT NULL
          AND private.request_account_pseudonym_v1(builder_id)
            = NEW.subject_digest
          THEN NULL
        ELSE builder_id
      END,
      builder_deidentified = builder_deidentified
        OR (
          builder_id IS NOT NULL
          AND private.request_account_pseudonym_v1(builder_id)
            = NEW.subject_digest
        ),
      proposal_status = CASE
        WHEN (
          requester_id IS NOT NULL
          AND private.request_account_pseudonym_v1(requester_id)
            = NEW.subject_digest
        ) OR (
          builder_id IS NOT NULL
          AND private.request_account_pseudonym_v1(builder_id)
            = NEW.subject_digest
        ) THEN 'withdrawn'
        ELSE proposal_status
      END,
      ended_at = CASE
        WHEN (
          requester_id IS NOT NULL
          AND private.request_account_pseudonym_v1(requester_id)
            = NEW.subject_digest
        ) OR (
          builder_id IS NOT NULL
          AND private.request_account_pseudonym_v1(builder_id)
            = NEW.subject_digest
        ) THEN COALESCE(ended_at, v_at)
        ELSE ended_at
      END,
      updated_at = v_at
  WHERE (
    requester_id IS NOT NULL
    AND private.request_account_pseudonym_v1(requester_id)
      = NEW.subject_digest
  ) OR (
    builder_id IS NOT NULL
    AND private.request_account_pseudonym_v1(builder_id)
      = NEW.subject_digest
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_request_deidentify_public_architecture
  AFTER INSERT ON public.build_request_deidentified_accounts
  FOR EACH ROW
  EXECUTE FUNCTION private.request_deidentify_public_architecture_v1();

CREATE OR REPLACE FUNCTION private.request_public_controls_json_v1()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_controls public.build_request_controls%ROWTYPE;
  v_active INTEGER;
  v_fulfillment INTEGER;
BEGIN
  SELECT * INTO STRICT v_controls
  FROM public.build_request_controls
  WHERE singleton;
  SELECT count(*) INTO v_active
  FROM public.build_requests AS request_case
  WHERE request_case.moderation_state <> 'removed'
    AND request_case.lifecycle_state NOT IN ('completed', 'closed');
  SELECT count(*) INTO v_fulfillment
  FROM public.build_requests AS request_case
  WHERE request_case.moderation_state <> 'removed'
    AND request_case.lifecycle_state IN (
      'accepted', 'building', 'review_pending', 'repair_required',
      'delivery_ready', 'delivered'
    );
  RETURN jsonb_build_object(
    'contractVersion', 1,
    'controlsVersion', v_controls.controls_version,
    'acceptingRequests', v_controls.accepting_requests,
    'assigningRequests', v_controls.assigning_requests,
    'intakeAudience', v_controls.intake_audience,
    'activeCaseCount', v_active,
    'activeCaseCapacity', v_controls.active_case_capacity,
    'remainingQueueCapacity',
      GREATEST(v_controls.active_case_capacity - v_active, 0),
    'fulfillmentCaseCount', v_fulfillment,
    'fulfillmentCaseCapacity', v_controls.fulfillment_case_capacity,
    'remainingFulfillmentCapacity',
      GREATEST(v_controls.fulfillment_case_capacity - v_fulfillment, 0),
    'operatorRosterRequired', v_controls.operator_roster_required,
    'operatorRosterReady', private.request_public_roster_ready_v1(),
    'publicIntakeRiskScreening',
      v_controls.public_intake_risk_screening,
    'transactionalNotificationsEnabled',
      v_controls.transactional_notifications_enabled,
    'publicationConsentEnabled',
      v_controls.publication_consent_enabled,
    'publicationAirlockEnabled',
      v_controls.publication_airlock_enabled,
    'publicOutcomesEnabled', v_controls.public_outcomes_enabled,
    'actorHourlyIntakeLimit', v_controls.actor_hourly_intake_limit,
    'networkHourlyIntakeLimit', v_controls.network_hourly_intake_limit,
    'globalDailyIntakeLimit', v_controls.global_daily_intake_limit,
    'policyVersions', jsonb_build_object(
      'terms', v_controls.terms_version,
      'privacy', v_controls.privacy_version,
      'acceptableUse', v_controls.acceptable_use_version,
      'requesterRights', v_controls.requester_rights_version,
      'publicationTerms', v_controls.publication_terms_version
    ),
    'readiness', jsonb_build_object(
      'legal', private.request_public_readiness_gate_v1('legal'),
      'incidentOwner',
        private.request_public_readiness_gate_v1('incident_owner'),
      'waf', private.request_public_readiness_gate_v1('waf'),
      'responsiveQa',
        private.request_public_readiness_gate_v1('responsive_qa'),
      'attendedLifecycle',
        private.request_public_readiness_gate_v1('attended_lifecycle'),
      'notificationTransport',
        private.request_public_readiness_gate_v1(
          'notification_transport'
        ),
      'communityAirlock',
        private.request_public_community_airlock_ready_v1()
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_build_request_public_availability_v1(
  p_contract_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_controls public.build_request_controls%ROWTYPE;
  v_snapshot JSONB;
  v_eligibility TEXT;
  v_unavailable TEXT;
  v_active INTEGER;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  SELECT * INTO STRICT v_controls
  FROM public.build_request_controls
  WHERE singleton;
  v_snapshot := private.request_public_controls_json_v1();
  v_active := (v_snapshot->>'activeCaseCount')::INTEGER;
  v_unavailable := CASE
    WHEN NOT v_controls.accepting_requests THEN 'controls_off'
    WHEN v_active >= v_controls.active_case_capacity THEN 'capacity_full'
    WHEN (
        NOT v_controls.operator_roster_required
        OR NOT private.request_public_roster_ready_v1()
        OR NOT private.request_public_readiness_gate_v1('legal')
        OR NOT private.request_public_readiness_gate_v1('incident_owner')
        OR NOT private.request_public_readiness_gate_v1('responsive_qa')
      ) THEN 'readiness_incomplete'
    WHEN v_controls.intake_audience = 'authenticated'
      AND (
        NOT v_controls.public_intake_risk_screening
        OR NOT private.request_public_readiness_gate_v1('waf')
        OR NOT private.request_public_readiness_gate_v1(
          'attended_lifecycle'
        )
      ) THEN 'readiness_incomplete'
    ELSE NULL
  END;
  IF NOT private.request_public_actor_is_confirmed_v1(v_actor_id) THEN
    v_eligibility := 'sign_in_required';
  ELSIF EXISTS (
    SELECT 1
    FROM public.build_requests AS own_case
    WHERE own_case.requester_id = v_actor_id
      AND own_case.moderation_state <> 'removed'
      AND own_case.lifecycle_state NOT IN ('completed', 'closed')
  ) THEN
    v_eligibility := 'already_active';
  ELSIF NOT v_controls.accepting_requests THEN
    v_eligibility := 'controls_off';
  ELSIF v_active >= v_controls.active_case_capacity THEN
    v_eligibility := 'capacity_full';
  ELSIF v_unavailable = 'readiness_incomplete' THEN
    v_eligibility := 'readiness_incomplete';
  ELSIF v_controls.intake_audience = 'invited'
    AND NOT EXISTS (
      SELECT 1
      FROM public.build_request_pilot_admissions AS admission
      WHERE admission.account_id = v_actor_id
        AND admission.admitted
        AND (
          admission.expires_at IS NULL
          OR admission.expires_at > clock_timestamp()
        )
    )
  THEN
    v_eligibility := 'not_admitted';
  ELSE
    v_eligibility := 'available';
  END IF;
  RETURN v_snapshot || jsonb_build_object(
    'intakeEligibility', v_eligibility,
    'unavailableReason', v_unavailable,
    'riskScreeningRequired',
      v_controls.intake_audience = 'authenticated'
      AND v_controls.public_intake_risk_screening
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_build_request_public_operations_v1(
  p_contract_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR private.request_actor_role_v1(v_actor_id) <> 'admin'
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request operations are not available.';
  END IF;
  RETURN private.request_public_controls_json_v1() || jsonb_build_object(
    'readinessVersions', jsonb_build_object(
      'legal', COALESCE((
        SELECT max(receipt.evidence_version)
        FROM public.build_request_readiness_receipts AS receipt
        WHERE receipt.gate_kind = 'legal'
      ), 0),
      'incident_owner', COALESCE((
        SELECT max(receipt.evidence_version)
        FROM public.build_request_readiness_receipts AS receipt
        WHERE receipt.gate_kind = 'incident_owner'
      ), 0),
      'waf', COALESCE((
        SELECT max(receipt.evidence_version)
        FROM public.build_request_readiness_receipts AS receipt
        WHERE receipt.gate_kind = 'waf'
      ), 0),
      'responsive_qa', COALESCE((
        SELECT max(receipt.evidence_version)
        FROM public.build_request_readiness_receipts AS receipt
        WHERE receipt.gate_kind = 'responsive_qa'
      ), 0),
      'attended_lifecycle', COALESCE((
        SELECT max(receipt.evidence_version)
        FROM public.build_request_readiness_receipts AS receipt
        WHERE receipt.gate_kind = 'attended_lifecycle'
      ), 0),
      'notification_transport', COALESCE((
        SELECT max(receipt.evidence_version)
        FROM public.build_request_readiness_receipts AS receipt
        WHERE receipt.gate_kind = 'notification_transport'
      ), 0)
    ),
    'operatorCounts', jsonb_build_object(
      'triager', (
        SELECT count(*)
        FROM public.build_request_operator_memberships AS membership
        WHERE membership.operator_role = 'triager'
          AND private.request_public_operator_is_rostered_v1(
            membership.account_id, 'triager'
          )
      ),
      'builder', (
        SELECT count(*)
        FROM public.build_request_operator_memberships AS membership
        WHERE membership.operator_role = 'builder'
          AND private.request_public_operator_is_rostered_v1(
            membership.account_id, 'builder'
          )
      ),
      'reviewer', (
        SELECT count(*)
        FROM public.build_request_operator_memberships AS membership
        WHERE membership.operator_role = 'reviewer'
          AND private.request_public_operator_is_rostered_v1(
            membership.account_id, 'reviewer'
          )
      )
    ),
    'reportCounts', jsonb_build_object(
      'open', (
        SELECT count(*) FROM public.build_request_reports
        WHERE status = 'open'
      ),
      'reviewing', (
        SELECT count(*) FROM public.build_request_reports
        WHERE status = 'reviewing'
      ),
      'pendingAlerts', (
        SELECT count(*) FROM public.build_request_reports
        WHERE status IN ('open', 'reviewing')
          AND alert_status IN ('pending', 'failed')
      )
    ),
    'publicationCounts', jsonb_build_object(
      'consentPending', (
        SELECT count(*)
        FROM public.build_request_publication_proposals
        WHERE proposal_status IN ('draft', 'consent_pending')
      ),
      'airlockReady', (
        SELECT count(*)
        FROM public.build_request_publication_proposals
        WHERE proposal_status = 'fully_consented'
      ),
      'published', (
        SELECT count(*)
        FROM public.build_request_public_outcomes
        WHERE withdrawn_at IS NULL AND removed_at IS NULL
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_build_request_operator_membership_v1(
  p_contract_version INTEGER,
  p_account_id UUID,
  p_operator_role TEXT,
  p_expected_membership_version INTEGER,
  p_membership_state TEXT,
  p_max_active_cases INTEGER,
  p_available_from TIMESTAMPTZ,
  p_available_until TIMESTAMPTZ,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_existing public.build_request_operator_membership_receipts%ROWTYPE;
  v_membership public.build_request_operator_memberships%ROWTYPE;
  v_hash TEXT;
  v_reason TEXT;
  v_at TIMESTAMPTZ := clock_timestamp();
  v_next_version INTEGER;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR private.request_actor_role_v1(v_actor_id) <> 'admin'
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Operator membership is not available.';
  END IF;
  IF p_account_id IS NULL
    OR p_operator_role NOT IN ('triager', 'builder', 'reviewer')
    OR p_expected_membership_version IS NULL
    OR p_expected_membership_version < 0
    OR p_membership_state NOT IN ('active', 'paused', 'revoked')
    OR p_max_active_cases NOT BETWEEN 1 AND 50
    OR (
      p_available_until IS NOT NULL
      AND (
        p_available_from IS NULL
        OR p_available_until <= p_available_from
      )
    )
    OR p_idempotency_key IS NULL
    OR p_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Operator membership input is invalid.';
  END IF;
  v_reason := private.request_assert_safe_text_v1(
    p_reason, 'operatorMembershipReason', 1, 500, TRUE
  );
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'accountId', p_account_id,
    'operatorRole', p_operator_role,
    'expectedVersion', p_expected_membership_version,
    'membershipState', p_membership_state,
    'maxActiveCases', p_max_active_cases,
    'availableFrom', p_available_from,
    'availableUntil', p_available_until,
    'reason', v_reason
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor_id::TEXT || ':' || p_idempotency_key, 0
  ));
  SELECT receipt.* INTO v_existing
  FROM public.build_request_operator_membership_receipts AS receipt
  WHERE receipt.actor_id = v_actor_id
    AND receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'membershipId', v_existing.membership_id,
      'accountId', v_existing.account_id,
      'accountDeidentified', v_existing.account_deidentified,
      'operatorRole', v_existing.operator_role,
      'membershipVersion', v_existing.membership_version,
      'membershipState', v_existing.membership_state,
      'maxActiveCases', v_existing.max_active_cases,
      'availableFrom', v_existing.available_from,
      'availableUntil', v_existing.available_until,
      'replayed', TRUE,
      'occurredAt', v_existing.occurred_at
    );
  END IF;
  IF NOT private.request_public_actor_is_confirmed_v1(p_account_id)
    OR (
      p_operator_role = 'triager'
      AND private.request_actor_role_v1(p_account_id) <> 'admin'
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Operator candidate is not eligible.',
      DETAIL = 'request_authority:operator_unavailable';
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-operator:' || p_account_id::TEXT || ':' || p_operator_role,
    0
  ));
  SELECT membership.* INTO v_membership
  FROM public.build_request_operator_memberships AS membership
  WHERE membership.account_id = p_account_id
    AND membership.operator_role = p_operator_role
  FOR UPDATE;
  IF FOUND THEN
    IF v_membership.membership_version <> p_expected_membership_version THEN
      RAISE EXCEPTION USING ERRCODE = '40001',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:stale_version';
    END IF;
    v_next_version := v_membership.membership_version + 1;
    UPDATE public.build_request_operator_memberships
    SET membership_version = v_next_version,
        membership_state = p_membership_state,
        max_active_cases = p_max_active_cases,
        available_from = p_available_from,
        available_until = p_available_until,
        changed_by = v_actor_id,
        changed_by_deidentified = FALSE,
        reason = v_reason,
        changed_at = v_at
    WHERE id = v_membership.id
    RETURNING * INTO v_membership;
  ELSE
    IF p_expected_membership_version <> 0 THEN
      RAISE EXCEPTION USING ERRCODE = '40001',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:stale_version';
    END IF;
    INSERT INTO public.build_request_operator_memberships (
      account_id, operator_role, membership_version, membership_state,
      max_active_cases, available_from, available_until, changed_by,
      reason, changed_at
    ) VALUES (
      p_account_id, p_operator_role, 1, p_membership_state,
      p_max_active_cases, p_available_from, p_available_until, v_actor_id,
      v_reason, v_at
    ) RETURNING * INTO v_membership;
  END IF;
  INSERT INTO public.build_request_operator_membership_receipts (
    actor_id, membership_id, account_id, operator_role,
    membership_version, membership_state, max_active_cases,
    available_from, available_until, idempotency_key, request_hash,
    reason_digest, occurred_at
  ) VALUES (
    v_actor_id, v_membership.id, v_membership.account_id,
    v_membership.operator_role, v_membership.membership_version,
    v_membership.membership_state, v_membership.max_active_cases,
    v_membership.available_from, v_membership.available_until,
    p_idempotency_key, v_hash,
    private.request_pseudonym_text_v1(v_reason), v_at
  );
  RETURN jsonb_build_object(
    'membershipId', v_membership.id,
    'accountId', v_membership.account_id,
    'accountDeidentified', v_membership.account_deidentified,
    'operatorRole', v_membership.operator_role,
    'membershipVersion', v_membership.membership_version,
    'membershipState', v_membership.membership_state,
    'maxActiveCases', v_membership.max_active_cases,
    'availableFrom', v_membership.available_from,
    'availableUntil', v_membership.available_until,
    'replayed', FALSE,
    'occurredAt', v_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_build_request_operator_directory_v1(
  p_contract_version INTEGER,
  p_query TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_query TEXT := NULLIF(btrim(COALESCE(p_query, '')), '');
  v_items JSONB;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR private.request_actor_role_v1(v_actor_id) <> 'admin'
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Operator directory is not available.';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100
    OR char_length(COALESCE(v_query, '')) > 80
    OR COALESCE(v_query, '') ~ '[[:cntrl:]]'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Operator directory query is invalid.';
  END IF;
  SELECT COALESCE(jsonb_agg(candidate.item ORDER BY candidate.label), '[]')
  INTO v_items
  FROM (
    SELECT lower(COALESCE(NULLIF(btrim(profile.display_name), ''),
      NULLIF(btrim(profile.username), ''), 'PathForge member')) AS label,
      jsonb_build_object(
        'accountId', profile.id,
        'displayName', private.request_display_name_v1(profile.id),
        'isAdmin', profile.role = 'admin',
        'memberships', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'membershipId', membership.id,
            'role', membership.operator_role,
            'version', membership.membership_version,
            'state', membership.membership_state,
            'maxActiveCases', membership.max_active_cases,
            'availableFrom', membership.available_from,
            'availableUntil', membership.available_until,
            'currentlyAvailable',
              private.request_public_operator_is_available_v1(
                membership.account_id, membership.operator_role, NULL
              )
          ) ORDER BY membership.operator_role)
          FROM public.build_request_operator_memberships AS membership
          WHERE membership.account_id = profile.id
        ), '[]'::JSONB)
      ) AS item
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    WHERE auth_user.email_confirmed_at IS NOT NULL
      AND (
        v_query IS NULL
        OR lower(COALESCE(profile.display_name, ''))
          LIKE '%' || lower(v_query) || '%'
        OR lower(COALESCE(profile.username, ''))
          LIKE '%' || lower(v_query) || '%'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_deidentified_accounts AS deidentified
        WHERE deidentified.subject_digest =
          private.request_account_pseudonym_v1(profile.id)
      )
    ORDER BY label, profile.id
    LIMIT p_limit
  ) AS candidate;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_build_request_readiness_v1(
  p_contract_version INTEGER,
  p_gate_kind TEXT,
  p_expected_evidence_version INTEGER,
  p_evidence_state TEXT,
  p_evidence_reference TEXT,
  p_valid_until TIMESTAMPTZ,
  p_note TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_prior public.build_request_readiness_receipts%ROWTYPE;
  v_current_version INTEGER;
  v_reference TEXT;
  v_note TEXT;
  v_hash TEXT;
  v_version INTEGER;
  v_policy_snapshot JSONB;
  v_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR private.request_actor_role_v1(v_actor_id) <> 'admin'
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Readiness evidence is not available.';
  END IF;
  IF p_gate_kind NOT IN (
      'legal', 'incident_owner', 'waf', 'responsive_qa',
      'attended_lifecycle', 'notification_transport'
    )
    OR p_expected_evidence_version IS NULL
    OR p_expected_evidence_version < 0
    OR p_evidence_state NOT IN ('confirmed', 'revoked')
    OR (
      p_evidence_state = 'confirmed'
      AND p_valid_until IS NOT NULL
      AND p_valid_until <= v_at
    )
    OR p_idempotency_key IS NULL
    OR p_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Readiness evidence input is invalid.';
  END IF;
  v_reference := private.request_assert_safe_text_v1(
    p_evidence_reference, 'readinessReference', 8, 200, TRUE
  );
  v_note := private.request_assert_safe_text_v1(
    p_note, 'readinessNote', 1, 500, TRUE
  );
  SELECT jsonb_build_object(
    'acceptableUse', control.acceptable_use_version,
    'privacy', control.privacy_version,
    'publicationTerms', control.publication_terms_version,
    'requesterRights', control.requester_rights_version,
    'terms', control.terms_version
  )
  INTO STRICT v_policy_snapshot
  FROM public.build_request_controls AS control
  WHERE control.singleton;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'gate', p_gate_kind,
    'expectedVersion', p_expected_evidence_version,
    'state', p_evidence_state,
    'reference', v_reference,
    'validUntil', p_valid_until,
    'note', v_note,
    'policySnapshot', CASE
      WHEN p_gate_kind = 'legal' THEN v_policy_snapshot
    END
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor_id::TEXT || ':' || p_idempotency_key, 0
  ));
  SELECT receipt.* INTO v_prior
  FROM public.build_request_readiness_receipts AS receipt
  WHERE receipt.actor_id = v_actor_id
    AND receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_prior.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'gate', v_prior.gate_kind,
      'evidenceVersion', v_prior.evidence_version,
      'state', v_prior.evidence_state,
      'validUntil', v_prior.valid_until,
      'replayed', TRUE,
      'occurredAt', v_prior.occurred_at
    );
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-readiness:' || p_gate_kind, 0
  ));
  SELECT COALESCE(max(receipt.evidence_version), 0)
  INTO v_current_version
  FROM public.build_request_readiness_receipts AS receipt
  WHERE receipt.gate_kind = p_gate_kind;
  IF v_current_version <> p_expected_evidence_version
  THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  UPDATE public.build_request_readiness_evidence
  SET evidence_state = 'revoked'
  WHERE gate_kind = p_gate_kind
    AND evidence_state = 'confirmed';
  v_version := p_expected_evidence_version + 1;
  INSERT INTO public.build_request_readiness_evidence (
    gate_kind, evidence_version, evidence_state,
    evidence_reference_digest, confirmed_by, confirmed_at,
    valid_until, policy_snapshot, note
  ) VALUES (
    p_gate_kind, v_version, p_evidence_state,
    private.request_pseudonym_text_v1(v_reference), v_actor_id, v_at,
    CASE WHEN p_evidence_state = 'confirmed' THEN p_valid_until END,
    CASE WHEN p_gate_kind = 'legal' THEN v_policy_snapshot END,
    v_note
  );
  INSERT INTO public.build_request_readiness_receipts (
    actor_id, gate_kind, evidence_version, evidence_state, valid_until,
    policy_snapshot, idempotency_key, request_hash, occurred_at
  ) VALUES (
    v_actor_id, p_gate_kind, v_version, p_evidence_state,
    CASE WHEN p_evidence_state = 'confirmed' THEN p_valid_until END,
    CASE WHEN p_gate_kind = 'legal' THEN v_policy_snapshot END,
    p_idempotency_key, v_hash, v_at
  );
  RETURN jsonb_build_object(
    'gate', p_gate_kind,
    'evidenceVersion', v_version,
    'state', p_evidence_state,
    'validUntil',
      CASE WHEN p_evidence_state = 'confirmed' THEN p_valid_until END,
    'replayed', FALSE,
    'occurredAt', v_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_build_request_public_controls_v1(
  p_contract_version INTEGER,
  p_expected_controls_version INTEGER,
  p_idempotency_key TEXT,
  p_controls JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_controls public.build_request_controls%ROWTYPE;
  v_existing public.build_request_public_control_receipts%ROWTYPE;
  v_hash TEXT;
  v_snapshot JSONB;
  v_at TIMESTAMPTZ := clock_timestamp();
  v_active INTEGER;
  v_fulfillment INTEGER;
  v_accepting BOOLEAN;
  v_assigning BOOLEAN;
  v_audience TEXT;
  v_active_capacity INTEGER;
  v_fulfillment_capacity INTEGER;
  v_roster_required BOOLEAN;
  v_risk_screening BOOLEAN;
  v_notifications BOOLEAN;
  v_consent BOOLEAN;
  v_airlock BOOLEAN;
  v_public_outcomes BOOLEAN;
  v_actor_limit INTEGER;
  v_network_limit INTEGER;
  v_global_limit INTEGER;
  v_terms TEXT;
  v_privacy TEXT;
  v_aup TEXT;
  v_rights TEXT;
  v_publication_terms TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR private.request_actor_role_v1(v_actor_id) <> 'admin'
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request controls are not available.';
  END IF;
  IF p_expected_controls_version IS NULL
    OR p_expected_controls_version < 1
    OR p_idempotency_key IS NULL
    OR p_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_controls IS NULL
    OR jsonb_typeof(p_controls) <> 'object'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request controls input is invalid.';
  END IF;
  PERFORM private.request_assert_json_keys_v1(
    p_controls,
    ARRAY[
      'acceptable_use_version',
      'accepting_requests',
      'active_case_capacity',
      'actor_hourly_intake_limit',
      'assigning_requests',
      'fulfillment_case_capacity',
      'global_daily_intake_limit',
      'intake_audience',
      'network_hourly_intake_limit',
      'operator_roster_required',
      'privacy_version',
      'public_intake_risk_screening',
      'public_outcomes_enabled',
      'publication_airlock_enabled',
      'publication_consent_enabled',
      'publication_terms_version',
      'requester_rights_version',
      'terms_version',
      'transactional_notifications_enabled'
    ],
    'Public Request controls'
  );
  BEGIN
    v_accepting := (p_controls->>'accepting_requests')::BOOLEAN;
    v_assigning := (p_controls->>'assigning_requests')::BOOLEAN;
    v_audience := p_controls->>'intake_audience';
    v_active_capacity := (p_controls->>'active_case_capacity')::INTEGER;
    v_fulfillment_capacity :=
      (p_controls->>'fulfillment_case_capacity')::INTEGER;
    v_roster_required :=
      (p_controls->>'operator_roster_required')::BOOLEAN;
    v_risk_screening :=
      (p_controls->>'public_intake_risk_screening')::BOOLEAN;
    v_notifications :=
      (p_controls->>'transactional_notifications_enabled')::BOOLEAN;
    v_consent :=
      (p_controls->>'publication_consent_enabled')::BOOLEAN;
    v_airlock :=
      (p_controls->>'publication_airlock_enabled')::BOOLEAN;
    v_public_outcomes :=
      (p_controls->>'public_outcomes_enabled')::BOOLEAN;
    v_actor_limit :=
      (p_controls->>'actor_hourly_intake_limit')::INTEGER;
    v_network_limit :=
      (p_controls->>'network_hourly_intake_limit')::INTEGER;
    v_global_limit :=
      (p_controls->>'global_daily_intake_limit')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request controls input is invalid.';
  END;
  v_terms := p_controls->>'terms_version';
  v_privacy := p_controls->>'privacy_version';
  v_aup := p_controls->>'acceptable_use_version';
  v_rights := p_controls->>'requester_rights_version';
  v_publication_terms := p_controls->>'publication_terms_version';
  IF v_audience NOT IN ('invited', 'authenticated')
    OR v_active_capacity NOT BETWEEN 1 AND 5000
    OR v_fulfillment_capacity NOT BETWEEN 1 AND 50
    OR v_fulfillment_capacity > v_active_capacity
    OR v_actor_limit NOT BETWEEN 1 AND 25
    OR v_network_limit NOT BETWEEN 1 AND 100
    OR v_global_limit NOT BETWEEN 1 AND 10000
    OR v_terms !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
    OR v_privacy !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
    OR v_aup !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
    OR v_rights !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
    OR v_publication_terms
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
    OR (
      v_audience = 'authenticated'
      AND (NOT v_risk_screening OR NOT v_roster_required)
    )
    OR (
      v_public_outcomes
      AND (NOT v_airlock OR NOT v_consent)
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request controls input is invalid.';
  END IF;

  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'expectedVersion', p_expected_controls_version,
    'controls', p_controls
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor_id::TEXT || ':' || p_idempotency_key, 0
  ));
  SELECT receipt.* INTO v_existing
  FROM public.build_request_public_control_receipts AS receipt
  WHERE receipt.actor_id = v_actor_id
    AND receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN v_existing.controls_snapshot || jsonb_build_object(
      'replayed', TRUE,
      'occurredAt', v_existing.occurred_at
    );
  END IF;

  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  SELECT * INTO STRICT v_controls
  FROM public.build_request_controls
  WHERE singleton
  FOR UPDATE;
  IF v_controls.controls_version <> p_expected_controls_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  IF v_terms <> v_controls.terms_version
    OR v_privacy <> v_controls.privacy_version
    OR v_aup <> v_controls.acceptable_use_version
    OR v_rights <> v_controls.requester_rights_version
    OR v_publication_terms <> v_controls.publication_terms_version
  THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request policy versions require a gated release.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  SELECT count(*) INTO v_active
  FROM public.build_requests AS request_case
  WHERE request_case.moderation_state <> 'removed'
    AND request_case.lifecycle_state NOT IN ('completed', 'closed');
  SELECT count(*) INTO v_fulfillment
  FROM public.build_requests AS request_case
  WHERE request_case.moderation_state <> 'removed'
    AND request_case.lifecycle_state IN (
      'accepted', 'building', 'review_pending', 'repair_required',
      'delivery_ready', 'delivered'
    );
  IF v_active > v_active_capacity
    OR v_fulfillment > v_fulfillment_capacity
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request capacity cannot be set below active work.',
      DETAIL = 'request_authority:capacity_full';
  END IF;

  IF v_assigning
    AND (
      NOT v_roster_required
      OR NOT private.request_public_roster_ready_v1()
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request operator roster is not ready.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF v_accepting
    AND (
      NOT v_roster_required
      OR NOT private.request_public_roster_ready_v1()
      OR NOT private.request_public_readiness_gate_v1('legal')
      OR NOT private.request_public_readiness_gate_v1('incident_owner')
      OR NOT private.request_public_readiness_gate_v1('responsive_qa')
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request intake readiness is incomplete.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF v_accepting
    AND v_audience = 'authenticated'
    AND (
      NOT v_risk_screening
      OR NOT private.request_public_readiness_gate_v1('waf')
      OR NOT private.request_public_readiness_gate_v1(
        'attended_lifecycle'
      )
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Public Request intake readiness is incomplete.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF v_notifications
    AND NOT private.request_public_readiness_gate_v1(
      'notification_transport'
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request notification readiness is incomplete.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF v_consent
    AND NOT private.request_public_readiness_gate_v1('legal')
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request publication terms are not ready.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF (v_airlock OR v_public_outcomes)
    AND NOT private.request_public_community_airlock_ready_v1()
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request publication airlock is not ready.',
      DETAIL = 'request_authority:publication_blocked';
  END IF;

  UPDATE public.build_request_controls
  SET controls_version = controls_version + 1,
      accepting_requests = v_accepting,
      assigning_requests = v_assigning,
      intake_audience = v_audience,
      active_case_capacity = v_active_capacity,
      fulfillment_case_capacity = v_fulfillment_capacity,
      operator_roster_required = v_roster_required,
      public_intake_risk_screening = v_risk_screening,
      transactional_notifications_enabled = v_notifications,
      publication_consent_enabled = v_consent,
      publication_airlock_enabled = v_airlock,
      public_outcomes_enabled = v_public_outcomes,
      actor_hourly_intake_limit = v_actor_limit,
      network_hourly_intake_limit = v_network_limit,
      global_daily_intake_limit = v_global_limit,
      terms_version = v_terms,
      privacy_version = v_privacy,
      acceptable_use_version = v_aup,
      requester_rights_version = v_rights,
      publication_terms_version = v_publication_terms,
      updated_at = v_at
  WHERE singleton;
  v_snapshot := private.request_public_controls_json_v1();
  INSERT INTO public.build_request_public_control_receipts (
    actor_id, idempotency_key, request_hash, controls_version,
    controls_snapshot, occurred_at
  ) VALUES (
    v_actor_id, p_idempotency_key, v_hash,
    (v_snapshot->>'controlsVersion')::INTEGER,
    v_snapshot, v_at
  );
  RETURN v_snapshot || jsonb_build_object(
    'replayed', FALSE,
    'occurredAt', v_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_build_request_intake_risk_grant_v1(
  p_contract_version INTEGER,
  p_actor_id UUID,
  p_intake_idempotency_key TEXT,
  p_network_digest TEXT,
  p_risk_engine_version TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_service BOOLEAN :=
    COALESCE(auth.jwt()->>'role', '') = 'service_role';
  v_controls public.build_request_controls%ROWTYPE;
  v_existing public.build_request_intake_risk_grants%ROWTYPE;
  v_network_digest TEXT;
  v_decision TEXT := 'clear';
  v_denial TEXT;
  v_at TIMESTAMPTZ := clock_timestamp();
  v_grant public.build_request_intake_risk_grants%ROWTYPE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF NOT v_service
    OR p_actor_id IS NULL
    OR p_intake_idempotency_key IS NULL
    OR p_intake_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_network_digest IS NULL
    OR p_network_digest !~ '^[0-9a-f]{64}$'
    OR p_risk_engine_version IS NULL
    OR p_risk_engine_version
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request intake risk screening is not available.';
  END IF;
  IF NOT private.request_public_actor_is_confirmed_v1(p_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '28000',
      MESSAGE = 'Authentication is required.';
  END IF;
  PERFORM private.request_lock_available_actor_v1(p_actor_id);
  v_network_digest := p_network_digest;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-risk-actor:' || p_actor_id::TEXT, 0
  ));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-risk-network:' || v_network_digest, 0
  ));
  SELECT * INTO STRICT v_controls
  FROM public.build_request_controls
  WHERE singleton
  FOR UPDATE;
  IF NOT v_controls.accepting_requests
    OR v_controls.intake_audience <> 'authenticated'
    OR NOT v_controls.public_intake_risk_screening
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request intake is not available.',
      DETAIL = 'request_authority:controls_off';
  END IF;
  IF NOT private.request_public_roster_ready_v1()
    OR NOT private.request_public_readiness_gate_v1('legal')
    OR NOT private.request_public_readiness_gate_v1('incident_owner')
    OR NOT private.request_public_readiness_gate_v1('waf')
    OR NOT private.request_public_readiness_gate_v1('responsive_qa')
    OR NOT private.request_public_readiness_gate_v1(
      'attended_lifecycle'
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Public Request intake readiness is incomplete.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  SELECT grant_row.* INTO v_existing
  FROM public.build_request_intake_risk_grants AS grant_row
  WHERE grant_row.actor_id = p_actor_id
    AND grant_row.intake_idempotency_key = p_intake_idempotency_key;
  IF FOUND THEN
    IF v_existing.network_digest <> v_network_digest
      OR v_existing.risk_engine_version <> p_risk_engine_version
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'status', CASE
        WHEN v_existing.decision = 'clear' THEN 'clear'
        ELSE 'denied'
      END,
      'grantId', CASE
        WHEN v_existing.decision = 'clear' THEN v_existing.id
      END,
      'expiresAt', CASE
        WHEN v_existing.decision = 'clear' THEN v_existing.expires_at
      END,
      'reason', v_existing.denial_reason,
      'replayed', TRUE
    );
  END IF;

  IF (
    SELECT count(*)
    FROM public.build_request_intake_risk_grants AS actor_grant
    WHERE actor_grant.actor_id = p_actor_id
      AND actor_grant.issued_at > v_at - INTERVAL '1 hour'
      AND actor_grant.decision = 'clear'
  ) >= v_controls.actor_hourly_intake_limit THEN
    v_decision := 'denied';
    v_denial := 'actor_limit';
  ELSIF (
    SELECT count(*)
    FROM public.build_request_intake_risk_grants AS network_grant
    WHERE network_grant.network_digest = v_network_digest
      AND network_grant.issued_at > v_at - INTERVAL '1 hour'
      AND network_grant.decision = 'clear'
  ) >= v_controls.network_hourly_intake_limit THEN
    v_decision := 'denied';
    v_denial := 'network_limit';
  ELSIF (
    SELECT count(*)
    FROM public.build_request_command_receipts AS receipt
    WHERE receipt.command_kind = 'submit_public_ready'
      AND receipt.created_at > v_at - INTERVAL '24 hours'
  ) >= v_controls.global_daily_intake_limit THEN
    v_decision := 'denied';
    v_denial := 'global_limit';
  END IF;
  IF v_decision = 'denied' THEN
    RETURN jsonb_build_object(
      'status', 'denied',
      'grantId', NULL,
      'expiresAt', NULL,
      'reason', v_denial,
      'replayed', FALSE
    );
  END IF;
  INSERT INTO public.build_request_intake_risk_grants (
    actor_id, intake_idempotency_key, network_digest,
    risk_engine_version, decision, denial_reason, issued_at, expires_at
  ) VALUES (
    p_actor_id, p_intake_idempotency_key, v_network_digest,
    p_risk_engine_version, v_decision, v_denial, v_at,
    v_at + INTERVAL '10 minutes'
  ) RETURNING * INTO v_grant;
  RETURN jsonb_build_object(
    'status', CASE WHEN v_decision = 'clear' THEN 'clear' ELSE 'denied' END,
    'grantId', CASE WHEN v_decision = 'clear' THEN v_grant.id END,
    'expiresAt', CASE WHEN v_decision = 'clear' THEN v_grant.expires_at END,
    'reason', v_denial,
    'replayed', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_build_request_public_v1(
  p_contract_version INTEGER,
  p_idempotency_key TEXT,
  p_risk_grant_id UUID,
  p_brief JSONB,
  p_attestation JSONB
)
RETURNS TABLE (
  contract_version INTEGER,
  command_id UUID,
  request_id UUID,
  request_version INTEGER,
  event_id UUID,
  lifecycle_state TEXT,
  moderation_state TEXT,
  publication_state TEXT,
  close_reason TEXT,
  replayed BOOLEAN,
  occurred_at TIMESTAMPTZ,
  authority_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_controls public.build_request_controls%ROWTYPE;
  v_existing public.build_request_command_receipts%ROWTYPE;
  v_risk_grant public.build_request_intake_risk_grants%ROWTYPE;
  v_request public.build_requests%ROWTYPE;
  v_brief_id UUID := gen_random_uuid();
  v_event_id UUID := gen_random_uuid();
  v_command_id UUID := gen_random_uuid();
  v_at TIMESTAMPTZ := clock_timestamp();
  v_hash TEXT;
  v_reference JSONB;
  v_checks JSONB;
  v_check_value JSONB;
  v_check_text TEXT;
  v_normalized_check TEXT;
  v_check_ordinal INTEGER := 0;
  v_title TEXT;
  v_outcome TEXT;
  v_intended_user TEXT;
  v_scenario TEXT;
  v_constraints TEXT;
  v_display TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000',
      MESSAGE = 'Authentication is required.';
  END IF;
  IF p_idempotency_key IS NULL
    OR p_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    OR p_brief IS NULL
    OR jsonb_typeof(p_brief) <> 'object'
    OR p_attestation IS NULL
    OR jsonb_typeof(p_attestation) <> 'object'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Public Request submission is invalid.';
  END IF;
  PERFORM private.request_assert_json_keys_v1(
    p_brief,
    ARRAY[
      'acceptance_checks', 'constraints', 'intended_user',
      'must_work_scenario', 'outcome', 'pathforge_reference', 'title'
    ],
    'Request brief'
  );
  PERFORM private.request_assert_json_keys_v1(
    p_attestation,
    ARRAY[
      'acceptable_use_accepted', 'acceptable_use_version',
      'privacy_acknowledged', 'privacy_version',
      'requester_rights_accepted', 'requester_rights_version',
      'terms_accepted', 'terms_version'
    ],
    'Request intake attestation'
  );
  v_title := private.request_assert_safe_text_v1(
    p_brief->>'title', 'title', 4, 120, TRUE
  );
  v_outcome := private.request_assert_safe_text_v1(
    p_brief->>'outcome', 'outcome', 20, 4000, TRUE
  );
  v_intended_user := private.request_assert_safe_text_v1(
    p_brief->>'intended_user', 'intendedUser', 2, 1000, TRUE
  );
  v_scenario := private.request_assert_safe_text_v1(
    p_brief->>'must_work_scenario', 'mustWorkScenario', 10, 1000, TRUE
  );
  v_constraints := private.request_assert_safe_text_v1(
    COALESCE(p_brief->>'constraints', ''),
    'constraints',
    0,
    2000,
    TRUE
  );
  v_reference := private.request_validate_pathforge_reference_v1(
    p_brief->'pathforge_reference'
  );
  v_checks := p_brief->'acceptance_checks';
  IF jsonb_typeof(v_checks) <> 'array'
    OR jsonb_array_length(v_checks) NOT BETWEEN 1 AND 3
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'acceptanceChecks must contain 1-3 checks.';
  END IF;
  IF p_attestation->>'terms_accepted' <> 'true'
    OR p_attestation->>'privacy_acknowledged' <> 'true'
    OR p_attestation->>'acceptable_use_accepted' <> 'true'
    OR p_attestation->>'requester_rights_accepted' <> 'true'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Every Request intake attestation must be accepted.';
  END IF;

  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'contract', p_contract_version,
    'riskGrantId', p_risk_grant_id,
    'brief', p_brief,
    'attestation', p_attestation
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor_id::TEXT || ':' || p_idempotency_key, 0
  ));
  SELECT receipt.* INTO v_existing
  FROM public.build_request_command_receipts AS receipt
  WHERE receipt.actor_id = v_actor_id
    AND receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.command_kind <> 'submit_public_ready'
      OR v_existing.request_hash <> v_hash
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN QUERY
      SELECT * FROM private.request_receipt_v1(
        v_existing.id,
        v_existing.request_id,
        v_existing.event_id,
        TRUE,
        v_existing.created_at,
        COALESCE(
          v_existing.receipt->'authority_result',
          '{}'::JSONB
        )
      );
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-subject:' || private.request_account_pseudonym_v1(v_actor_id),
    0
  ));
  IF NOT private.request_public_actor_is_confirmed_v1(v_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '28000',
      MESSAGE = 'Authentication is required.';
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  SELECT * INTO STRICT v_controls
  FROM public.build_request_controls
  WHERE singleton
  FOR UPDATE;
  IF NOT v_controls.accepting_requests THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request intake is not available.',
      DETAIL = 'request_authority:controls_off';
  END IF;
  IF p_attestation->>'terms_version' <> v_controls.terms_version
    OR p_attestation->>'privacy_version' <> v_controls.privacy_version
    OR p_attestation->>'acceptable_use_version'
      <> v_controls.acceptable_use_version
    OR p_attestation->>'requester_rights_version'
      <> v_controls.requester_rights_version
  THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request policy versions changed.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  IF NOT v_controls.operator_roster_required
    OR NOT private.request_public_roster_ready_v1()
    OR NOT private.request_public_readiness_gate_v1('legal')
    OR NOT private.request_public_readiness_gate_v1('incident_owner')
    OR NOT private.request_public_readiness_gate_v1('responsive_qa')
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request intake readiness is incomplete.',
      DETAIL = 'request_authority:readiness_incomplete';
  END IF;
  IF v_controls.intake_audience = 'invited' THEN
    IF p_risk_grant_id IS NOT NULL
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_pilot_admissions AS admission
        WHERE admission.account_id = v_actor_id
          AND admission.admitted
          AND (
            admission.expires_at IS NULL
            OR admission.expires_at > v_at
          )
      )
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Request actor is not admitted.',
        DETAIL = 'request_authority:not_admitted';
    END IF;
  ELSE
    IF NOT v_controls.public_intake_risk_screening
      OR NOT private.request_public_readiness_gate_v1('waf')
      OR NOT private.request_public_readiness_gate_v1(
        'attended_lifecycle'
      )
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Public Request intake readiness is incomplete.',
        DETAIL = 'request_authority:readiness_incomplete';
    END IF;
    IF p_risk_grant_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Request intake risk screening is required.',
        DETAIL = 'request_authority:risk_grant_required';
    END IF;
    SELECT grant_row.* INTO v_risk_grant
    FROM public.build_request_intake_risk_grants AS grant_row
    WHERE grant_row.id = p_risk_grant_id
      AND grant_row.actor_id = v_actor_id
      AND grant_row.intake_idempotency_key = p_idempotency_key
    FOR UPDATE;
    IF NOT FOUND
      OR v_risk_grant.decision <> 'clear'
      OR v_risk_grant.expires_at <= v_at
      OR v_risk_grant.consumed_at IS NOT NULL
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Request intake risk grant is unavailable.',
        DETAIL = 'request_authority:risk_grant_required';
    END IF;
  END IF;

  IF (
    SELECT count(*)
    FROM public.build_requests AS active_request
    WHERE active_request.moderation_state <> 'removed'
      AND active_request.lifecycle_state NOT IN ('completed', 'closed')
  ) >= v_controls.active_case_capacity THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request queue capacity is full.',
      DETAIL = 'request_authority:capacity_full';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.build_requests AS own_case
    WHERE own_case.requester_id = v_actor_id
      AND own_case.moderation_state <> 'removed'
      AND own_case.lifecycle_state NOT IN ('completed', 'closed')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505',
      MESSAGE = 'Request actor already has an active case.',
      DETAIL = 'request_authority:duplicate';
  END IF;
  IF (
    SELECT count(*)
    FROM public.build_request_command_receipts AS recent_receipt
    WHERE recent_receipt.actor_id = v_actor_id
      AND recent_receipt.command_kind IN ('submit', 'submit_public_ready')
      AND recent_receipt.created_at > v_at - INTERVAL '1 hour'
  ) >= v_controls.actor_hourly_intake_limit THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request intake is temporarily limited.',
      DETAIL = 'request_authority:rate_limited';
  END IF;

  v_display := private.request_display_name_v1(v_actor_id);
  BEGIN
    INSERT INTO public.build_requests (
      id, requester_id, requester_display_name, submitted_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_actor_id, v_display, v_at, v_at
    ) RETURNING * INTO v_request;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION USING ERRCODE = '23505',
      MESSAGE = 'Request actor already has an active case.',
      DETAIL = 'request_authority:duplicate';
  END;

  INSERT INTO public.build_request_brief_revisions (
    id, request_id, revision_number, title, outcome, intended_user,
    must_work_scenario, constraints, pathforge_reference,
    authored_by, created_at
  ) VALUES (
    v_brief_id, v_request.id, 1, v_title, v_outcome, v_intended_user,
    v_scenario, v_constraints, v_reference, v_actor_id, v_at
  );
  FOR v_check_value IN SELECT value FROM jsonb_array_elements(v_checks)
  LOOP
    IF jsonb_typeof(v_check_value) <> 'string' THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Each acceptance check must be a string.';
    END IF;
    v_check_ordinal := v_check_ordinal + 1;
    v_check_text := private.request_assert_safe_text_v1(
      v_check_value #>> '{}',
      'acceptanceCheck',
      4,
      500,
      TRUE
    );
    v_normalized_check := lower(btrim(v_check_text));
    IF lower(btrim(v_check_text)) = lower(btrim(v_scenario))
      OR EXISTS (
        SELECT 1
        FROM public.build_request_acceptance_checks AS stored_check
        WHERE stored_check.brief_revision_id = v_brief_id
          AND lower(btrim(stored_check.check_text)) = v_normalized_check
      )
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE =
          'Acceptance checks and must-work scenario must be distinct.';
    END IF;
    INSERT INTO public.build_request_acceptance_checks (
      request_id, brief_revision_id, ordinal, check_text
    ) VALUES (
      v_request.id, v_brief_id, v_check_ordinal, v_check_text
    );
  END LOOP;
  UPDATE public.build_requests
  SET current_brief_revision_id = v_brief_id
  WHERE id = v_request.id;
  INSERT INTO public.build_request_participants (
    request_id, actor_role, account_id, display_name, joined_at
  ) VALUES (
    v_request.id, 'requester', v_actor_id, v_display, v_at
  );
  INSERT INTO public.build_request_intake_attestations (
    request_id, requester_id, intake_audience, risk_grant_id,
    risk_screening_verified_at, risk_engine_version,
    terms_version, privacy_version, acceptable_use_version,
    requester_rights_version, accepted_at
  ) VALUES (
    v_request.id, v_actor_id, v_controls.intake_audience,
    CASE
      WHEN v_controls.intake_audience = 'authenticated'
        THEN p_risk_grant_id
    END,
    CASE
      WHEN v_controls.intake_audience = 'authenticated' THEN v_at
    END,
    CASE
      WHEN v_controls.intake_audience = 'authenticated'
        THEN v_risk_grant.risk_engine_version
    END,
    v_controls.terms_version, v_controls.privacy_version,
    v_controls.acceptable_use_version,
    v_controls.requester_rights_version, v_at
  );
  IF v_controls.intake_audience = 'authenticated' THEN
    UPDATE public.build_request_intake_risk_grants
    SET consumed_at = v_at, consumed_request_id = v_request.id
    WHERE id = p_risk_grant_id
      AND consumed_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Request intake risk grant is unavailable.',
        DETAIL = 'request_authority:risk_grant_required';
    END IF;
  END IF;

  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_id, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, command_receipt_id, outbox_id,
    participant_visible, safe_metadata, occurred_at
  ) VALUES (
    v_event_id, v_request.id, 1, 'submitted', v_actor_id, 'requester',
    NULL, NULL, NULL, NULL,
    v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason, 0,
    p_idempotency_key, v_command_id, v_command_id, v_command_id,
    TRUE,
    jsonb_build_object(
      'brief_revision_id', v_brief_id,
      'intake_audience', v_controls.intake_audience,
      'policy_attested', TRUE
    ),
    v_at
  );
  INSERT INTO public.build_request_command_receipts (
    id, actor_id, idempotency_key, request_id, command_kind,
    request_hash, request_version, lifecycle_state, moderation_state,
    publication_state, close_reason, event_id, receipt, created_at
  ) VALUES (
    v_command_id, v_actor_id, p_idempotency_key, v_request.id,
    'submit_public_ready', v_hash, 0, v_request.lifecycle_state,
    v_request.moderation_state, v_request.publication_state,
    v_request.close_reason, v_event_id, '{"authority_result":{}}', v_at
  );
  INSERT INTO public.build_request_outbox (
    id, request_id, event_id, topic, payload, available_at
  ) VALUES (
    v_command_id, v_request.id, v_event_id, 'request_event_v1',
    jsonb_build_object(
      'request_id', v_request.id,
      'event_id', v_event_id,
      'kind', 'submitted'
    ),
    v_at
  );
  RETURN QUERY
    SELECT * FROM private.request_receipt_v1(
      v_command_id,
      v_request.id,
      v_event_id,
      FALSE,
      v_at,
      '{}'::JSONB
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.report_build_request_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_category TEXT,
  p_details TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_existing public.build_request_report_receipts%ROWTYPE;
  v_report public.build_request_reports%ROWTYPE;
  v_details TEXT;
  v_hash TEXT;
  v_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR p_request_id IS NULL
    OR p_category NOT IN (
      'safety', 'privacy', 'integrity', 'rights', 'service'
    )
    OR p_idempotency_key IS NULL
    OR p_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request report input is invalid.';
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  IF NOT private.request_has_scope_v1(p_request_id, v_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Request was not found.',
      DETAIL = 'request_authority:not_found';
  END IF;
  v_details := private.request_assert_safe_text_v1(
    p_details, 'reportDetails', 20, 2000, TRUE
  );
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'requestId', p_request_id,
    'category', p_category,
    'details', v_details
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor_id::TEXT || ':' || p_idempotency_key, 0
  ));
  SELECT receipt.* INTO v_existing
  FROM public.build_request_report_receipts AS receipt
  WHERE receipt.actor_id = v_actor_id
    AND receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.action <> 'create'
      OR v_existing.request_hash <> v_hash
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'reportId', v_existing.report_id,
      'requestId', v_existing.request_id,
      'status', v_existing.resulting_status,
      'replayed', TRUE,
      'occurredAt', v_existing.occurred_at
    );
  END IF;
  IF (
    SELECT count(*)
    FROM public.build_request_report_receipts AS receipt
    WHERE receipt.actor_id = v_actor_id
      AND receipt.action = 'create'
      AND receipt.occurred_at > v_at - INTERVAL '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Request reporting is temporarily limited.',
      DETAIL = 'request_authority:rate_limited';
  END IF;
  INSERT INTO public.build_request_reports (
    request_id, reporter_id, category, details, details_digest,
    status, alert_status, created_at, updated_at
  ) VALUES (
    p_request_id, v_actor_id, p_category, v_details,
    private.request_pseudonym_text_v1(v_details),
    'open', 'pending', v_at, v_at
  ) RETURNING * INTO v_report;
  INSERT INTO public.build_request_report_receipts (
    report_id, request_id, actor_id, action, resulting_status,
    idempotency_key, request_hash, occurred_at
  ) VALUES (
    v_report.id, p_request_id, v_actor_id, 'create', 'open',
    p_idempotency_key, v_hash, v_at
  );
  RETURN jsonb_build_object(
    'reportId', v_report.id,
    'requestId', p_request_id,
    'status', 'open',
    'replayed', FALSE,
    'occurredAt', v_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_build_request_reports_v1(
  p_contract_version INTEGER,
  p_scope TEXT,
  p_cursor_priority INTEGER DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_admin BOOLEAN;
  v_items JSONB;
  v_next_created TIMESTAMPTZ;
  v_next_id UUID;
  v_next_priority INTEGER;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  v_admin := private.request_actor_role_v1(v_actor_id) = 'admin';
  IF v_actor_id IS NULL
    OR p_scope NOT IN ('mine', 'admin')
    OR (p_scope = 'admin' AND NOT v_admin)
    OR p_limit NOT BETWEEN 1 AND 50
    OR (
      (p_cursor_priority IS NULL)
        <> (p_cursor_created_at IS NULL)
    )
    OR (
      (p_cursor_created_at IS NULL) <> (p_cursor_id IS NULL)
    )
    OR p_cursor_priority NOT IN (0, 1)
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request report queue is not available.';
  END IF;
  WITH eligible AS (
    SELECT report.*,
      row_number() OVER (
        ORDER BY
          CASE WHEN p_scope = 'admin' THEN report.priority ELSE 0 END DESC,
          report.created_at,
          report.id
      ) AS row_number
    FROM public.build_request_reports AS report
    WHERE (
        (p_scope = 'mine' AND report.reporter_id = v_actor_id)
        OR (
          p_scope = 'admin'
          AND (
            p_request_id IS NOT NULL
            OR report.status IN ('open', 'reviewing')
          )
        )
      )
      AND (
        p_request_id IS NULL
        OR report.request_id = p_request_id
      )
      AND (
        p_cursor_created_at IS NULL
        OR (
          p_scope = 'admin'
          AND (
            report.priority < p_cursor_priority
            OR (
              report.priority = p_cursor_priority
              AND (report.created_at, report.id)
                > (p_cursor_created_at, p_cursor_id)
            )
          )
        )
        OR (
          p_scope = 'mine'
          AND (report.created_at, report.id)
            > (p_cursor_created_at, p_cursor_id)
        )
      )
    ORDER BY
      CASE WHEN p_scope = 'admin' THEN report.priority ELSE 0 END DESC,
      report.created_at,
      report.id
    LIMIT p_limit + 1
  ),
  page AS (
    SELECT * FROM eligible WHERE row_number <= p_limit
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
        'reportId', report.id,
        'requestId', report.request_id,
        'category', report.category,
        'priority', report.priority,
        'details', report.details,
        'status', report.status,
        'resolutionNote', report.resolution_note,
        'alertStatus', CASE
          WHEN p_scope = 'admin' THEN report.alert_status
          ELSE NULL
        END,
        'createdAt', report.created_at,
        'updatedAt', report.updated_at
      ) ORDER BY
        CASE WHEN p_scope = 'admin' THEN report.priority ELSE 0 END DESC,
        report.created_at,
        report.id
      ), '[]'::JSONB),
    (
      SELECT boundary.priority
      FROM eligible AS boundary
      WHERE boundary.row_number = p_limit
        AND EXISTS (
          SELECT 1
          FROM eligible AS extra
          WHERE extra.row_number = p_limit + 1
        )
    ),
    (
      SELECT boundary.created_at
      FROM eligible AS boundary
      WHERE boundary.row_number = p_limit
        AND EXISTS (
          SELECT 1
          FROM eligible AS extra
          WHERE extra.row_number = p_limit + 1
        )
    ),
    (
      SELECT boundary.id
      FROM eligible AS boundary
      WHERE boundary.row_number = p_limit
        AND EXISTS (
          SELECT 1
          FROM eligible AS extra
          WHERE extra.row_number = p_limit + 1
        )
    )
  INTO v_items, v_next_priority, v_next_created, v_next_id
  FROM page AS report;
  RETURN jsonb_build_object(
    'items', v_items,
    'nextCursor', CASE
      WHEN v_next_id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'priority', CASE
          WHEN p_scope = 'admin' THEN v_next_priority
          ELSE 0
        END,
        'createdAt', v_next_created,
        'reportId', v_next_id
      )
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_build_request_report_status_v1(
  p_contract_version INTEGER,
  p_report_id UUID,
  p_expected_status TEXT,
  p_next_status TEXT,
  p_resolution_note TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_report public.build_request_reports%ROWTYPE;
  v_existing public.build_request_report_receipts%ROWTYPE;
  v_action TEXT;
  v_resolution_note TEXT;
  v_hash TEXT;
  v_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR private.request_actor_role_v1(v_actor_id) <> 'admin'
    OR p_report_id IS NULL
    OR p_expected_status NOT IN ('open', 'reviewing')
    OR p_next_status NOT IN ('reviewing', 'resolved', 'dismissed')
    OR NOT (
      (
        p_expected_status = 'open'
        AND p_next_status = 'reviewing'
      )
      OR (
        p_expected_status = 'reviewing'
        AND p_next_status IN ('resolved', 'dismissed')
      )
    )
    OR p_idempotency_key IS NULL
    OR p_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request report action is not available.';
  END IF;
  IF p_next_status = 'reviewing' THEN
    IF p_resolution_note IS NOT NULL
      AND btrim(p_resolution_note) <> ''
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'A report under review cannot include a resolution note.';
    END IF;
    v_resolution_note := NULL;
  ELSE
    v_resolution_note := private.request_assert_safe_text_v1(
      p_resolution_note, 'reportResolutionNote', 10, 1000, TRUE
    );
  END IF;
  v_action := CASE p_next_status
    WHEN 'reviewing' THEN 'review'
    WHEN 'resolved' THEN 'resolve'
    ELSE 'dismiss'
  END;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'reportId', p_report_id,
    'expectedStatus', p_expected_status,
    'nextStatus', p_next_status,
    'resolutionNote', v_resolution_note
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor_id::TEXT || ':' || p_idempotency_key, 0
  ));
  SELECT receipt.* INTO v_existing
  FROM public.build_request_report_receipts AS receipt
  WHERE receipt.actor_id = v_actor_id
    AND receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_hash <> v_hash
      OR v_existing.action <> v_action
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'reportId', v_existing.report_id,
      'requestId', v_existing.request_id,
      'status', v_existing.resulting_status,
      'replayed', TRUE,
      'occurredAt', v_existing.occurred_at
    );
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  SELECT report.* INTO v_report
  FROM public.build_request_reports AS report
  WHERE report.id = p_report_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Request report was not found.',
      DETAIL = 'request_authority:not_found';
  END IF;
  IF v_report.status <> p_expected_status THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  UPDATE public.build_request_reports
  SET status = p_next_status,
      resolution_note = v_resolution_note,
      resolution_note_digest = CASE
        WHEN v_resolution_note IS NULL THEN NULL
        ELSE private.request_pseudonym_text_v1(v_resolution_note)
      END,
      resolved_at = CASE
        WHEN p_next_status IN ('resolved', 'dismissed') THEN v_at
      END,
      updated_at = v_at
  WHERE id = v_report.id;
  INSERT INTO public.build_request_report_receipts (
    report_id, request_id, actor_id, action, resulting_status,
    idempotency_key, request_hash, occurred_at
  ) VALUES (
    v_report.id, v_report.request_id, v_actor_id, v_action,
    p_next_status, p_idempotency_key, v_hash, v_at
  );
  RETURN jsonb_build_object(
    'reportId', v_report.id,
    'requestId', v_report.request_id,
    'status', p_next_status,
    'replayed', FALSE,
    'occurredAt', v_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_build_request_notification_preference_v1(
  p_contract_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_preference public.build_request_notification_preferences%ROWTYPE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR NOT private.request_public_actor_is_confirmed_v1(v_actor_id)
  THEN
    RAISE EXCEPTION USING ERRCODE = '28000',
      MESSAGE = 'Authentication is required.';
  END IF;
  SELECT preference.* INTO v_preference
  FROM public.build_request_notification_preferences AS preference
  WHERE preference.account_id = v_actor_id;
  RETURN jsonb_build_object(
    'preferenceVersion', COALESCE(v_preference.preference_version, 0),
    'transactionalEmailEnabled',
      COALESCE(v_preference.transactional_email_enabled, FALSE),
    'changedAt', v_preference.changed_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_build_request_notification_preference_v1(
  p_contract_version INTEGER,
  p_expected_preference_version INTEGER,
  p_transactional_email_enabled BOOLEAN,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_preference public.build_request_notification_preferences%ROWTYPE;
  v_existing
    public.build_request_notification_preference_receipts%ROWTYPE;
  v_hash TEXT;
  v_version INTEGER;
  v_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR NOT private.request_public_actor_is_confirmed_v1(v_actor_id)
    OR p_expected_preference_version IS NULL
    OR p_expected_preference_version < 0
    OR p_transactional_email_enabled IS NULL
    OR p_idempotency_key IS NULL
    OR p_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request notification preference is invalid.';
  END IF;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'expectedVersion', p_expected_preference_version,
    'transactionalEmailEnabled', p_transactional_email_enabled
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor_id::TEXT || ':' || p_idempotency_key, 0
  ));
  SELECT receipt.* INTO v_existing
  FROM public.build_request_notification_preference_receipts AS receipt
  WHERE receipt.account_id = v_actor_id
    AND receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_hash <> v_hash THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN jsonb_build_object(
      'preferenceVersion', v_existing.preference_version,
      'transactionalEmailEnabled',
        v_existing.transactional_email_enabled,
      'replayed', TRUE,
      'occurredAt', v_existing.occurred_at
    );
  END IF;
  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  SELECT preference.* INTO v_preference
  FROM public.build_request_notification_preferences AS preference
  WHERE preference.account_id = v_actor_id
  FOR UPDATE;
  IF COALESCE(v_preference.preference_version, 0)
      <> p_expected_preference_version
  THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  v_version := p_expected_preference_version + 1;
  INSERT INTO public.build_request_notification_preferences (
    account_id, preference_version, transactional_email_enabled,
    changed_at
  ) VALUES (
    v_actor_id, v_version, p_transactional_email_enabled, v_at
  )
  ON CONFLICT (account_id) DO UPDATE
  SET preference_version = EXCLUDED.preference_version,
      transactional_email_enabled =
        EXCLUDED.transactional_email_enabled,
      changed_at = EXCLUDED.changed_at;
  INSERT INTO public.build_request_notification_preference_receipts (
    account_id, preference_version, transactional_email_enabled,
    idempotency_key, request_hash, occurred_at
  ) VALUES (
    v_actor_id, v_version, p_transactional_email_enabled,
    p_idempotency_key, v_hash, v_at
  );
  RETURN jsonb_build_object(
    'preferenceVersion', v_version,
    'transactionalEmailEnabled', p_transactional_email_enabled,
    'replayed', FALSE,
    'occurredAt', v_at
  );
END;
$$;

-- Projection and claim both reauthorize a recipient against current case
-- authority. Terminal work is intentionally narrower than historical case
-- participation: only the requester and the exact final delivery author and
-- approving reviewer remain eligible, and only for terminal-time-or-later
-- events within their existing retention-scoped case access.
CREATE OR REPLACE FUNCTION private.request_notification_event_recipient_v1(
  p_request_id UUID,
  p_event_id UUID,
  p_recipient_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.build_request_events AS event_value
    JOIN public.build_requests AS request_case
      ON request_case.id = event_value.request_id
    WHERE event_value.id = p_event_id
      AND event_value.request_id = p_request_id
      AND event_value.participant_visible
      AND p_recipient_id IS NOT NULL
      AND private.request_has_scope_v1(
        event_value.request_id, p_recipient_id
      )
      AND (
        request_case.moderation_state <> 'removed'
        OR request_case.requester_id = p_recipient_id
        OR private.request_actor_role_v1(p_recipient_id) = 'admin'
      )
      AND (
        (
          request_case.requester_id = p_recipient_id
          AND (
            request_case.lifecycle_state NOT IN ('completed', 'closed')
            OR event_value.occurred_at >= request_case.terminal_at
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.build_request_participants AS participant
          WHERE participant.request_id = event_value.request_id
            AND participant.account_id = p_recipient_id
            AND participant.active
            AND participant.joined_at <= event_value.occurred_at
        )
        OR EXISTS (
          SELECT 1
          FROM public.build_request_assignments AS assignment
          WHERE assignment.request_id = event_value.request_id
            AND assignment.account_id = p_recipient_id
            AND assignment.active
            AND assignment.assigned_at <= event_value.occurred_at
        )
        OR (
          event_value.event_kind LIKE 'publication_%'
          AND EXISTS (
            SELECT 1
            FROM public.build_request_publication_proposals AS proposal
            WHERE proposal.request_id = event_value.request_id
              AND proposal.proposal_version::TEXT =
                event_value.safe_metadata->>'proposalVersion'
              AND p_recipient_id IN (
                proposal.requester_id, proposal.builder_id
              )
          )
        )
        OR (
          request_case.lifecycle_state IN ('completed', 'closed')
          AND event_value.occurred_at >= request_case.terminal_at
          AND EXISTS (
            SELECT 1
            FROM public.build_request_delivery_revisions AS final_revision
            WHERE final_revision.id =
                request_case.current_delivery_revision_id
              AND final_revision.request_id = request_case.id
              AND (
                (
                  final_revision.authored_by = p_recipient_id
                  AND EXISTS (
                    SELECT 1
                    FROM public.build_request_assignments
                      AS final_builder_assignment
                    WHERE final_builder_assignment.id =
                        final_revision.builder_assignment_id
                      AND final_builder_assignment.request_id =
                        final_revision.request_id
                      AND final_builder_assignment.assignment_role =
                        'builder'
                      AND final_builder_assignment.account_id =
                        p_recipient_id
                      AND final_builder_assignment.assigned_at <=
                        event_value.occurred_at
                  )
                )
                OR EXISTS (
                  SELECT 1
                  FROM public.build_request_delivery_reviews AS final_review
                  JOIN public.build_request_assignments
                    AS final_reviewer_assignment
                    ON final_reviewer_assignment.id =
                      final_review.reviewer_assignment_id
                    AND final_reviewer_assignment.request_id =
                      final_review.request_id
                    AND final_reviewer_assignment.assignment_role =
                      'reviewer'
                    AND final_reviewer_assignment.account_id =
                      final_review.reviewer_id
                  WHERE final_review.request_id = final_revision.request_id
                    AND final_review.delivery_revision_id =
                      final_revision.id
                    AND final_review.manifest_digest =
                      final_revision.artifact_manifest_digest
                    AND final_review.reviewer_id = p_recipient_id
                    AND final_review.verdict = 'approve'
                    AND final_review.safety_integrity_result = 'pass'
                    AND final_reviewer_assignment.assigned_at <=
                      event_value.occurred_at
                )
              )
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.project_build_request_notifications_v1(
  p_contract_version INTEGER,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_service BOOLEAN :=
    COALESCE(auth.jwt()->>'role', '') = 'service_role';
  v_enabled BOOLEAN;
  v_events INTEGER := 0;
  v_reports INTEGER := 0;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF NOT v_service OR p_limit NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request notification projection is not available.';
  END IF;
  SELECT control.transactional_notifications_enabled
    AND private.request_public_readiness_gate_v1(
      'notification_transport'
    )
  INTO STRICT v_enabled
  FROM public.build_request_controls AS control
  WHERE control.singleton;
  IF NOT v_enabled THEN
    RETURN jsonb_build_object(
      'eventsProjected', 0,
      'reportsProjected', 0,
      'controlEnabled', FALSE
    );
  END IF;

  WITH candidate_events AS (
    SELECT outbox.request_id, outbox.event_id,
      outbox.payload->>'kind' AS event_kind,
      event_value.safe_metadata->>'proposalVersion' AS proposal_version,
      event_value.actor_id,
      event_value.occurred_at
    FROM public.build_request_outbox AS outbox
    JOIN public.build_request_events AS event_value
      ON event_value.id = outbox.event_id
      AND event_value.request_id = outbox.request_id
    WHERE event_value.participant_visible
      AND event_value.occurred_at > clock_timestamp() - INTERVAL '7 days'
  ),
  recipients AS (
    SELECT DISTINCT event_value.request_id, event_value.event_id,
      participant.account_id AS recipient_id,
      event_value.event_kind, event_value.occurred_at
    FROM candidate_events AS event_value
    JOIN public.build_request_participants AS participant
      ON participant.request_id = event_value.request_id
      AND participant.account_id IS NOT NULL
      AND participant.active
      AND participant.joined_at <= event_value.occurred_at
    JOIN public.build_request_notification_preferences AS preference
      ON preference.account_id = participant.account_id
      AND preference.transactional_email_enabled
      AND preference.changed_at <= event_value.occurred_at
    WHERE participant.account_id IS DISTINCT FROM event_value.actor_id
    UNION
    SELECT DISTINCT event_value.request_id, event_value.event_id,
      assignment.account_id, event_value.event_kind,
      event_value.occurred_at
    FROM candidate_events AS event_value
    JOIN public.build_request_assignments AS assignment
      ON assignment.request_id = event_value.request_id
      AND assignment.account_id IS NOT NULL
      AND assignment.active
      AND assignment.assigned_at <= event_value.occurred_at
    JOIN public.build_request_notification_preferences AS preference
      ON preference.account_id = assignment.account_id
      AND preference.transactional_email_enabled
      AND preference.changed_at <= event_value.occurred_at
    WHERE assignment.account_id IS DISTINCT FROM event_value.actor_id
    UNION
    SELECT DISTINCT event_value.request_id, event_value.event_id,
      request_case.requester_id, event_value.event_kind,
      event_value.occurred_at
    FROM candidate_events AS event_value
    JOIN public.build_requests AS request_case
      ON request_case.id = event_value.request_id
      AND request_case.requester_id IS NOT NULL
    JOIN public.build_request_notification_preferences AS preference
      ON preference.account_id = request_case.requester_id
      AND preference.transactional_email_enabled
      AND preference.changed_at <= event_value.occurred_at
    WHERE request_case.requester_id IS DISTINCT FROM event_value.actor_id
    UNION
    SELECT DISTINCT event_value.request_id, event_value.event_id,
      final_revision.authored_by, event_value.event_kind,
      event_value.occurred_at
    FROM candidate_events AS event_value
    JOIN public.build_requests AS request_case
      ON request_case.id = event_value.request_id
      AND request_case.lifecycle_state IN ('completed', 'closed')
      AND event_value.occurred_at >= request_case.terminal_at
    JOIN public.build_request_delivery_revisions AS final_revision
      ON final_revision.id = request_case.current_delivery_revision_id
      AND final_revision.request_id = request_case.id
      AND final_revision.authored_by IS NOT NULL
    JOIN public.build_request_notification_preferences AS preference
      ON preference.account_id = final_revision.authored_by
      AND preference.transactional_email_enabled
      AND preference.changed_at <= event_value.occurred_at
    WHERE final_revision.authored_by IS DISTINCT FROM event_value.actor_id
    UNION
    SELECT DISTINCT event_value.request_id, event_value.event_id,
      final_review.reviewer_id, event_value.event_kind,
      event_value.occurred_at
    FROM candidate_events AS event_value
    JOIN public.build_requests AS request_case
      ON request_case.id = event_value.request_id
      AND request_case.lifecycle_state IN ('completed', 'closed')
      AND event_value.occurred_at >= request_case.terminal_at
    JOIN public.build_request_delivery_revisions AS final_revision
      ON final_revision.id = request_case.current_delivery_revision_id
      AND final_revision.request_id = request_case.id
    JOIN public.build_request_delivery_reviews AS final_review
      ON final_review.request_id = final_revision.request_id
      AND final_review.delivery_revision_id = final_revision.id
      AND final_review.manifest_digest =
        final_revision.artifact_manifest_digest
      AND final_review.verdict = 'approve'
      AND final_review.safety_integrity_result = 'pass'
      AND final_review.reviewer_id IS NOT NULL
    JOIN public.build_request_notification_preferences AS preference
      ON preference.account_id = final_review.reviewer_id
      AND preference.transactional_email_enabled
      AND preference.changed_at <= event_value.occurred_at
    WHERE final_review.reviewer_id IS DISTINCT FROM event_value.actor_id
    UNION
    SELECT DISTINCT event_value.request_id, event_value.event_id,
      publication_actor.account_id, event_value.event_kind,
      event_value.occurred_at
    FROM candidate_events AS event_value
    JOIN public.build_request_publication_proposals AS proposal
      ON proposal.request_id = event_value.request_id
      AND proposal.proposal_version::TEXT = event_value.proposal_version
    CROSS JOIN LATERAL (
      VALUES (proposal.requester_id), (proposal.builder_id)
    ) AS publication_actor(account_id)
    JOIN public.build_request_notification_preferences AS preference
      ON preference.account_id = publication_actor.account_id
      AND preference.transactional_email_enabled
      AND preference.changed_at <= event_value.occurred_at
    WHERE event_value.event_kind LIKE 'publication_%'
      AND publication_actor.account_id IS NOT NULL
      AND publication_actor.account_id IS DISTINCT FROM event_value.actor_id
  ),
  new_recipients AS (
    SELECT recipient.*
    FROM recipients AS recipient
    WHERE private.request_notification_event_recipient_v1(
        recipient.request_id,
        recipient.event_id,
        recipient.recipient_id
      )
      AND NOT EXISTS (
      SELECT 1
      FROM public.build_request_notification_deliveries AS delivery
      WHERE delivery.event_id = recipient.event_id
        AND delivery.report_id IS NULL
        AND delivery.recipient_id = recipient.recipient_id
        AND delivery.channel = 'transactional_email'
    )
    ORDER BY
      recipient.occurred_at,
      recipient.event_id,
      recipient.recipient_id
    LIMIT p_limit
  )
  INSERT INTO public.build_request_notification_deliveries (
    request_id, event_id, recipient_id, channel, template_key,
    delivery_state, next_attempt_at
  )
  SELECT recipient.request_id, recipient.event_id,
    recipient.recipient_id, 'transactional_email',
    CASE
      WHEN recipient.event_kind = 'submitted'
        THEN 'request_submitted'
      WHEN recipient.event_kind IN (
        'clarification_requested', 'repair_required'
      ) THEN 'request_action_needed'
      WHEN recipient.event_kind IN (
        'delivery_approved', 'delivery_ready', 'delivered'
      ) THEN 'request_delivery_ready'
      ELSE 'request_status_changed'
    END,
    'pending', clock_timestamp()
  FROM new_recipients AS recipient
  ON CONFLICT (
    event_id, report_id, recipient_id, channel
  ) DO NOTHING;
  GET DIAGNOSTICS v_events = ROW_COUNT;

  WITH candidate_reports AS (
    SELECT report.id, report.request_id, report.priority, report.created_at
    FROM public.build_request_reports AS report
    WHERE report.status IN ('open', 'reviewing')
      AND report.alert_status IN ('pending', 'failed')
      AND report.created_at > clock_timestamp() - INTERVAL '7 days'
  ),
  new_report_recipients AS (
    SELECT report.request_id, report.id, report.priority, report.created_at,
      profile.id AS recipient_id
    FROM candidate_reports AS report
    JOIN public.profiles AS profile ON profile.role = 'admin'
    JOIN auth.users AS auth_user
      ON auth_user.id = profile.id
      AND auth_user.email_confirmed_at IS NOT NULL
    JOIN public.build_request_notification_preferences AS preference
      ON preference.account_id = profile.id
      AND preference.transactional_email_enabled
      AND preference.changed_at <= report.created_at
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.build_request_notification_deliveries AS delivery
      WHERE delivery.event_id IS NULL
        AND delivery.report_id = report.id
        AND delivery.recipient_id = profile.id
        AND delivery.channel = 'transactional_email'
    )
    ORDER BY report.priority DESC, report.created_at, report.id, profile.id
    LIMIT p_limit
  )
  INSERT INTO public.build_request_notification_deliveries (
    request_id, report_id, recipient_id, channel, template_key,
    delivery_state, next_attempt_at
  )
  SELECT report.request_id, report.id, report.recipient_id,
    'transactional_email', 'request_report_received',
    'pending', clock_timestamp()
  FROM new_report_recipients AS report
  ON CONFLICT (
    event_id, report_id, recipient_id, channel
  ) DO NOTHING;
  GET DIAGNOSTICS v_reports = ROW_COUNT;
  RETURN jsonb_build_object(
    'eventsProjected', v_events,
    'reportsProjected', v_reports,
    'controlEnabled', TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_build_request_notifications_v1(
  p_contract_version INTEGER,
  p_limit INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_service BOOLEAN :=
    COALESCE(auth.jwt()->>'role', '') = 'service_role';
  v_enabled BOOLEAN;
  v_items JSONB;
  v_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF NOT v_service OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request notification delivery is not available.';
  END IF;
  SELECT control.transactional_notifications_enabled
    AND private.request_public_readiness_gate_v1(
      'notification_transport'
    )
  INTO STRICT v_enabled
  FROM public.build_request_controls AS control
  WHERE control.singleton
  FOR UPDATE;
  IF NOT v_enabled THEN
    UPDATE public.build_request_notification_deliveries
    SET delivery_state = 'suppressed',
        suppression_reason = 'control_off',
        claim_token = NULL,
        claim_expires_at = NULL,
        updated_at = v_at
    WHERE delivery_state IN ('pending', 'retry')
      OR (
        delivery_state = 'claimed'
        AND claim_expires_at <= v_at
      );
    RETURN jsonb_build_object('items', '[]'::JSONB);
  END IF;

  UPDATE public.build_request_notification_deliveries
  SET delivery_state = CASE
        WHEN attempts >= 5 THEN 'dead'
        ELSE 'retry'
      END,
      suppression_reason = CASE
        WHEN attempts >= 5 THEN 'attempts_exhausted'
      END,
      claim_token = NULL,
      claim_expires_at = NULL,
      next_attempt_at = v_at,
      updated_at = v_at
  WHERE delivery_state = 'claimed'
    AND claim_expires_at <= v_at;

  UPDATE public.build_request_notification_deliveries AS delivery
  SET delivery_state = 'suppressed',
      suppression_reason = 'authorization_ended',
      updated_at = v_at
  WHERE delivery.delivery_state IN ('pending', 'retry')
    AND (
      (
        delivery.event_id IS NOT NULL
        AND NOT private.request_notification_event_recipient_v1(
          delivery.request_id,
          delivery.event_id,
          delivery.recipient_id
        )
      )
      OR (
        delivery.report_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.profiles AS profile
          WHERE profile.id = delivery.recipient_id
            AND profile.role = 'admin'
        )
      )
    );

  UPDATE public.build_request_notification_deliveries AS delivery
  SET delivery_state = 'suppressed',
      suppression_reason = 'preference_off',
      updated_at = v_at
  WHERE delivery.delivery_state IN ('pending', 'retry')
    AND NOT EXISTS (
      SELECT 1
      FROM public.build_request_notification_preferences AS preference
      WHERE preference.account_id = delivery.recipient_id
        AND preference.transactional_email_enabled
    );

  UPDATE public.build_request_notification_deliveries AS delivery
  SET delivery_state = 'suppressed',
      suppression_reason = 'identity_unavailable',
      updated_at = v_at
  WHERE delivery.delivery_state IN ('pending', 'retry')
    AND NOT EXISTS (
      SELECT 1
      FROM auth.users AS auth_user
      WHERE auth_user.id = delivery.recipient_id
        AND auth_user.email_confirmed_at IS NOT NULL
        AND auth_user.email IS NOT NULL
    );

  WITH candidates AS (
    SELECT delivery.id
    FROM public.build_request_notification_deliveries AS delivery
    JOIN public.build_request_notification_preferences AS preference
      ON preference.account_id = delivery.recipient_id
      AND preference.transactional_email_enabled
    JOIN auth.users AS auth_user
      ON auth_user.id = delivery.recipient_id
      AND auth_user.email_confirmed_at IS NOT NULL
    WHERE delivery.delivery_state IN ('pending', 'retry')
      AND delivery.next_attempt_at <= v_at
      AND delivery.attempts < 5
      AND (
        (
          delivery.event_id IS NOT NULL
          AND private.request_notification_event_recipient_v1(
            delivery.request_id,
            delivery.event_id,
            delivery.recipient_id
          )
        )
        OR (
          delivery.report_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = delivery.recipient_id
              AND profile.role = 'admin'
          )
        )
      )
    ORDER BY delivery.next_attempt_at, delivery.created_at, delivery.id
    FOR UPDATE OF delivery SKIP LOCKED
    LIMIT p_limit
  ),
  claimed AS (
    UPDATE public.build_request_notification_deliveries AS delivery
    SET delivery_state = 'claimed',
        attempts = attempts + 1,
        claim_token = gen_random_uuid(),
        claim_expires_at = v_at + INTERVAL '5 minutes',
        updated_at = v_at
    FROM candidates
    WHERE delivery.id = candidates.id
    RETURNING delivery.*
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'deliveryId', claimed.id,
    'claimToken', claimed.claim_token,
    'recipient', auth_user.email,
    'templateKey', claimed.template_key,
    'requestPath', '/requests/' || claimed.request_id::TEXT,
    'attempt', claimed.attempts
  ) ORDER BY claimed.created_at, claimed.id), '[]'::JSONB)
  INTO v_items
  FROM claimed
  JOIN auth.users AS auth_user ON auth_user.id = claimed.recipient_id;
  RETURN jsonb_build_object('items', v_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_build_request_notification_v1(
  p_contract_version INTEGER,
  p_delivery_id UUID,
  p_claim_token UUID,
  p_succeeded BOOLEAN,
  p_error_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_service BOOLEAN :=
    COALESCE(auth.jwt()->>'role', '') = 'service_role';
  v_delivery public.build_request_notification_deliveries%ROWTYPE;
  v_at TIMESTAMPTZ := clock_timestamp();
  v_next_state TEXT;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF NOT v_service
    OR p_delivery_id IS NULL
    OR p_claim_token IS NULL
    OR p_succeeded IS NULL
    OR (
      p_error_code IS NOT NULL
      AND p_error_code !~ '^[a-z][a-z0-9_]{0,63}$'
    )
    OR (p_succeeded AND p_error_code IS NOT NULL)
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request notification result is not available.';
  END IF;
  SELECT delivery.* INTO v_delivery
  FROM public.build_request_notification_deliveries AS delivery
  WHERE delivery.id = p_delivery_id
  FOR UPDATE;
  IF NOT FOUND
    OR v_delivery.delivery_state <> 'claimed'
    OR v_delivery.claim_token <> p_claim_token
    OR v_delivery.claim_expires_at <= v_at
  THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request notification claim changed.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  v_next_state := CASE
    WHEN p_succeeded THEN 'delivered'
    WHEN v_delivery.attempts >= 5 THEN 'dead'
    ELSE 'retry'
  END;
  UPDATE public.build_request_notification_deliveries
  SET delivery_state = v_next_state,
      delivered_at = CASE WHEN p_succeeded THEN v_at END,
      suppression_reason = CASE
        WHEN v_next_state = 'dead' THEN 'attempts_exhausted'
      END,
      last_error_code = p_error_code,
      next_attempt_at = CASE
        WHEN v_next_state = 'retry'
          THEN v_at + make_interval(
            mins => LEAST(240, 5 * (2 ^ (v_delivery.attempts - 1)))::INTEGER
          )
        ELSE v_at
      END,
      claim_token = NULL,
      claim_expires_at = NULL,
      updated_at = v_at
  WHERE id = v_delivery.id;
  IF v_delivery.report_id IS NOT NULL AND p_succeeded THEN
    UPDATE public.build_request_reports
    SET alert_status = 'delivered', updated_at = v_at
    WHERE id = v_delivery.report_id
      AND alert_status <> 'delivered';
  ELSIF v_delivery.report_id IS NOT NULL
    AND v_next_state = 'dead'
  THEN
    UPDATE public.build_request_reports
    SET alert_status = 'failed', updated_at = v_at
    WHERE id = v_delivery.report_id
      AND alert_status <> 'delivered';
  END IF;
  RETURN jsonb_build_object(
    'deliveryState', v_next_state,
    'attempts', v_delivery.attempts
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_build_request_publication_v1(
  p_contract_version INTEGER,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_request public.build_requests%ROWTYPE;
  v_proposal public.build_request_publication_proposals%ROWTYPE;
  v_is_requester BOOLEAN;
  v_is_builder BOOLEAN;
  v_is_admin BOOLEAN;
  v_controls public.build_request_controls%ROWTYPE;
  v_consent_ready BOOLEAN;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR p_request_id IS NULL
    OR NOT private.request_has_scope_v1(p_request_id, v_actor_id)
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Request was not found.',
      DETAIL = 'request_authority:not_found';
  END IF;
  SELECT request_case.* INTO STRICT v_request
  FROM public.build_requests AS request_case
  WHERE request_case.id = p_request_id;
  SELECT control.* INTO STRICT v_controls
  FROM public.build_request_controls AS control
  WHERE control.singleton;
  v_consent_ready :=
    v_controls.publication_consent_enabled
    AND private.request_public_readiness_gate_v1('legal');
  v_is_requester := v_request.requester_id = v_actor_id;
  v_is_admin := private.request_actor_role_v1(v_actor_id) = 'admin';
  SELECT proposal.* INTO v_proposal
  FROM public.build_request_publication_proposals AS proposal
  WHERE proposal.request_id = p_request_id
  ORDER BY proposal.proposal_version DESC
  LIMIT 1;
  v_is_builder := FOUND AND v_proposal.builder_id = v_actor_id;
  IF v_request.moderation_state <> 'clear' THEN
    RETURN jsonb_build_object(
      'visibility', 'restricted',
      'publicationState', v_request.publication_state,
      'status', CASE
        WHEN v_request.moderation_state = 'removed'
          THEN 'removed'
        ELSE 'held'
      END,
      'capabilities', '[]'::JSONB
    );
  END IF;
  RETURN jsonb_build_object(
    'visibility', 'full',
    'publicationState', v_request.publication_state,
    'consentEnabled', v_consent_ready,
    'proposal', CASE WHEN v_proposal.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'proposalId', v_proposal.id,
        'proposalVersion', v_proposal.proposal_version,
        'status', v_proposal.proposal_status,
        'safeTitle', v_proposal.safe_title,
        'safeSummary', v_proposal.safe_summary,
        'requesterAttribution', v_proposal.requester_attribution,
        'reusePermission', v_proposal.reuse_permission,
        'requesterConsented',
          v_proposal.requester_consented_at IS NOT NULL,
        'builderConsented',
          v_proposal.builder_consented_at IS NOT NULL,
        'publishedAt', v_proposal.published_at,
        'updatedAt', v_proposal.updated_at
      )
    END,
    'capabilities', to_jsonb(array_remove(ARRAY[
      CASE
        WHEN v_consent_ready
          AND v_is_requester
          AND v_request.lifecycle_state = 'completed'
          AND v_request.publication_state = 'private'
          AND (
            v_proposal.id IS NULL
            OR v_proposal.proposal_status IN (
              'declined', 'withdrawn', 'removed'
            )
          )
          THEN 'propose'
      END,
      CASE
        WHEN v_consent_ready AND v_is_requester
          AND v_proposal.proposal_status IN ('draft', 'consent_pending')
          THEN 'replace_proposal'
      END,
      CASE
        WHEN v_consent_ready AND v_is_requester
          AND v_proposal.proposal_status IN ('draft', 'consent_pending')
          AND v_proposal.requester_consented_at IS NULL
          THEN 'requester_consent'
      END,
      CASE
        WHEN v_consent_ready AND v_is_builder
          AND v_proposal.proposal_status IN ('draft', 'consent_pending')
          AND v_proposal.builder_consented_at IS NULL
          THEN 'builder_consent'
      END,
      CASE
        WHEN v_consent_ready
          AND (v_is_requester OR v_is_builder)
          AND v_proposal.proposal_status IN ('draft', 'consent_pending')
          THEN 'decline'
      END,
      CASE
        WHEN (v_is_requester OR v_is_builder)
          AND v_proposal.proposal_status IN (
            'fully_consented', 'in_airlock', 'published'
          )
          THEN 'withdraw'
      END,
      CASE
        WHEN v_is_admin
          AND v_consent_ready
          AND v_controls.publication_airlock_enabled
          AND v_proposal.proposal_status = 'fully_consented'
          AND private.request_public_community_airlock_ready_v1()
          THEN 'submit_airlock'
      END,
      CASE
        WHEN v_is_admin
          AND v_consent_ready
          AND v_controls.public_outcomes_enabled
          AND v_controls.publication_airlock_enabled
          AND v_proposal.proposal_status = 'in_airlock'
          AND private.request_public_community_airlock_ready_v1()
          THEN 'publish_outcome'
      END
    ]::TEXT[], NULL))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.build_request_publication_command_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_expected_request_version INTEGER,
  p_expected_proposal_version INTEGER,
  p_idempotency_key TEXT,
  p_command TEXT,
  p_payload JSONB
)
RETURNS TABLE (
  contract_version INTEGER,
  command_id UUID,
  request_id UUID,
  request_version INTEGER,
  event_id UUID,
  lifecycle_state TEXT,
  moderation_state TEXT,
  publication_state TEXT,
  close_reason TEXT,
  replayed BOOLEAN,
  occurred_at TIMESTAMPTZ,
  authority_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_request public.build_requests%ROWTYPE;
  v_before public.build_requests%ROWTYPE;
  v_existing public.build_request_command_receipts%ROWTYPE;
  v_proposal public.build_request_publication_proposals%ROWTYPE;
  v_revision public.build_request_delivery_revisions%ROWTYPE;
  v_controls public.build_request_controls%ROWTYPE;
  v_command_id UUID := gen_random_uuid();
  v_event_id UUID := gen_random_uuid();
  v_at TIMESTAMPTZ := clock_timestamp();
  v_hash TEXT;
  v_title TEXT;
  v_summary TEXT;
  v_digest TEXT;
  v_status TEXT;
  v_sequence INTEGER;
  v_actor_role TEXT;
  v_proposal_version INTEGER;
  v_authority JSONB;
  v_requester_consent BOOLEAN;
  v_builder_consent BOOLEAN;
  v_consent_ready BOOLEAN;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR p_request_id IS NULL
    OR p_expected_request_version IS NULL
    OR p_expected_request_version < 0
    OR p_command NOT IN (
      'propose', 'replace_proposal', 'requester_consent',
      'builder_consent', 'decline', 'withdraw', 'submit_airlock'
    )
    OR p_payload IS NULL
    OR jsonb_typeof(p_payload) <> 'object'
    OR p_idempotency_key IS NULL
    OR p_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request publication command is invalid.';
  END IF;
  IF p_command IN ('propose', 'replace_proposal') THEN
    PERFORM private.request_assert_json_keys_v1(
      p_payload,
      ARRAY['safe_summary', 'safe_title'],
      'Request publication proposal'
    );
    v_title := private.request_assert_safe_text_v1(
      p_payload->>'safe_title', 'publicOutcomeTitle', 4, 120, TRUE
    );
    v_summary := private.request_assert_safe_text_v1(
      p_payload->>'safe_summary', 'publicOutcomeSummary', 40, 1000, TRUE
    );
  ELSIF p_command = 'requester_consent' THEN
    PERFORM private.request_assert_json_keys_v1(
      p_payload,
      ARRAY['publication_terms_version', 'requester_attribution'],
      'Requester publication consent'
    );
    IF p_payload->>'requester_attribution'
        NOT IN ('anonymous', 'credited')
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Requester attribution choice is invalid.';
    END IF;
  ELSIF p_command = 'builder_consent' THEN
    PERFORM private.request_assert_json_keys_v1(
      p_payload,
      ARRAY['publication_terms_version', 'reuse_permission'],
      'Builder publication consent'
    );
    IF p_payload->>'reuse_permission'
        NOT IN ('view_only', 'adapt_with_credit')
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Builder reuse permission is invalid.';
    END IF;
  ELSE
    PERFORM private.request_assert_json_keys_v1(
      p_payload, ARRAY[]::TEXT[], 'Request publication command'
    );
  END IF;
  IF p_command <> 'propose'
    AND (
      p_expected_proposal_version IS NULL
      OR p_expected_proposal_version < 1
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Expected publication proposal version is required.';
  END IF;
  IF p_command = 'propose'
    AND p_expected_proposal_version IS NOT NULL
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'A new publication proposal cannot name a prior version.';
  END IF;

  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'requestId', p_request_id,
    'expectedRequestVersion', p_expected_request_version,
    'expectedProposalVersion', p_expected_proposal_version,
    'command', p_command,
    'payload', p_payload
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor_id::TEXT || ':' || p_idempotency_key, 0
  ));
  SELECT receipt.* INTO v_existing
  FROM public.build_request_command_receipts AS receipt
  WHERE receipt.actor_id = v_actor_id
    AND receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.command_kind <> ('publication_' || p_command)
      OR v_existing.request_hash <> v_hash
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    RETURN QUERY
      SELECT * FROM private.request_receipt_v1(
        v_existing.id, v_existing.request_id, v_existing.event_id,
        TRUE, v_existing.created_at,
        COALESCE(
          v_existing.receipt->'authority_result',
          '{}'::JSONB
        )
      );
    RETURN;
  END IF;

  PERFORM private.request_lock_available_actor_v1(v_actor_id);
  SELECT * INTO STRICT v_controls
  FROM public.build_request_controls
  WHERE singleton
  FOR UPDATE;
  v_consent_ready :=
    v_controls.publication_consent_enabled
    AND private.request_public_readiness_gate_v1('legal');
  SELECT request_case.* INTO v_request
  FROM public.build_requests AS request_case
  WHERE request_case.id = p_request_id
  FOR UPDATE;
  IF NOT FOUND
    OR NOT private.request_has_scope_v1(p_request_id, v_actor_id)
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Request was not found.',
      DETAIL = 'request_authority:not_found';
  END IF;
  IF v_request.version <> p_expected_request_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;
  IF v_request.moderation_state <> 'clear' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request publication is unavailable while restricted.',
      DETAIL = CASE v_request.moderation_state
        WHEN 'held' THEN 'request_authority:held'
        ELSE 'request_authority:removed'
      END;
  END IF;
  v_before := v_request;
  SELECT proposal.* INTO v_proposal
  FROM public.build_request_publication_proposals AS proposal
  WHERE proposal.request_id = p_request_id
  ORDER BY proposal.proposal_version DESC
  LIMIT 1
  FOR UPDATE;
  IF p_command <> 'propose'
    AND (
      NOT FOUND
      OR v_proposal.proposal_version <> p_expected_proposal_version
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'Request authority rejected the operation.',
      DETAIL = 'request_authority:stale_version';
  END IF;

  IF p_command = 'propose' THEN
    IF NOT v_consent_ready
      OR v_request.requester_id <> v_actor_id
      OR v_request.lifecycle_state <> 'completed'
      OR v_request.publication_state <> 'private'
      OR (
        v_proposal.id IS NOT NULL
        AND v_proposal.proposal_status NOT IN (
          'declined', 'withdrawn', 'removed'
        )
      )
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Request publication proposal is not available.',
        DETAIL = 'request_authority:publication_blocked';
    END IF;
    SELECT revision.* INTO v_revision
    FROM public.build_request_delivery_revisions AS revision
    WHERE revision.id = v_request.current_delivery_revision_id
      AND revision.request_id = v_request.id
      AND revision.revision_state = 'submitted'
      AND revision.artifact_manifest_digest ~ '^[0-9a-f]{64}$';
    IF NOT FOUND
      OR v_revision.authored_by IS NULL
      OR v_revision.authored_by = v_request.requester_id
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_delivery_reviews AS review
        WHERE review.request_id = v_request.id
          AND review.delivery_revision_id = v_revision.id
          AND review.manifest_digest = v_revision.artifact_manifest_digest
          AND review.verdict = 'approve'
          AND review.safety_integrity_result = 'pass'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.build_request_requester_outcomes AS outcome
        WHERE outcome.request_id = v_request.id
          AND outcome.delivery_revision_id = v_revision.id
          AND outcome.manifest_digest = v_revision.artifact_manifest_digest
          AND outcome.outcome = 'useful'
      )
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Only a useful independently approved delivery can be proposed.',
        DETAIL = 'request_authority:publication_blocked';
    END IF;
    SELECT COALESCE(max(proposal.proposal_version), 0) + 1
    INTO v_proposal_version
    FROM public.build_request_publication_proposals AS proposal
    WHERE proposal.request_id = v_request.id;
    v_digest := private.request_pseudonym_text_v1(jsonb_build_object(
      'requestId', v_request.id,
      'deliveryRevisionId', v_revision.id,
      'manifestDigest', v_revision.artifact_manifest_digest,
      'proposalVersion', v_proposal_version,
      'safeTitle', v_title,
      'safeSummary', v_summary
    )::TEXT);
    INSERT INTO public.build_request_publication_proposals (
      request_id, proposal_version, proposal_status,
      delivery_revision_id, manifest_digest, safe_title, safe_summary,
      content_digest, requester_id, builder_id, created_at, updated_at
    ) VALUES (
      v_request.id, v_proposal_version, 'consent_pending',
      v_revision.id, v_revision.artifact_manifest_digest,
      v_title, v_summary, v_digest, v_request.requester_id,
      v_revision.authored_by, v_at, v_at
    ) RETURNING * INTO v_proposal;
    v_status := 'consent_pending';
    v_actor_role := 'requester';
  ELSIF p_command = 'replace_proposal' THEN
    IF NOT v_consent_ready
      OR v_request.requester_id <> v_actor_id
      OR v_proposal.proposal_status NOT IN ('draft', 'consent_pending')
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Request publication proposal cannot be replaced.',
        DETAIL = 'request_authority:publication_blocked';
    END IF;
    v_proposal_version := v_proposal.proposal_version + 1;
    v_digest := private.request_pseudonym_text_v1(jsonb_build_object(
      'requestId', v_request.id,
      'deliveryRevisionId', v_proposal.delivery_revision_id,
      'manifestDigest', v_proposal.manifest_digest,
      'proposalVersion', v_proposal_version,
      'safeTitle', v_title,
      'safeSummary', v_summary
    )::TEXT);
    UPDATE public.build_request_publication_proposals
    SET proposal_version = v_proposal_version,
        proposal_status = 'consent_pending',
        safe_title = v_title,
        safe_summary = v_summary,
        content_digest = v_digest,
        requester_attribution = 'anonymous',
        reuse_permission = 'view_only',
        requester_consented_at = NULL,
        builder_consented_at = NULL,
        updated_at = v_at
    WHERE id = v_proposal.id
    RETURNING * INTO v_proposal;
    v_status := 'consent_pending';
    v_actor_role := 'requester';
  ELSIF p_command = 'requester_consent' THEN
    IF NOT v_consent_ready
      OR v_request.requester_id <> v_actor_id
      OR v_proposal.proposal_status NOT IN ('draft', 'consent_pending')
      OR v_proposal.requester_consented_at IS NOT NULL
      OR p_payload->>'publication_terms_version'
        <> v_controls.publication_terms_version
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Requester publication consent is not available.',
        DETAIL = 'request_authority:publication_blocked';
    END IF;
    INSERT INTO public.build_request_publication_consent_receipts (
      proposal_id, request_id, proposal_version, content_digest,
      safe_title_snapshot, safe_summary_snapshot,
      actor_id, actor_role, decision, attribution_choice,
      publication_terms_version, idempotency_key, request_hash,
      occurred_at
    ) VALUES (
      v_proposal.id, v_request.id, v_proposal.proposal_version,
      v_proposal.content_digest, v_proposal.safe_title,
      v_proposal.safe_summary, v_actor_id, 'requester', 'consent',
      p_payload->>'requester_attribution',
      v_controls.publication_terms_version, p_idempotency_key,
      v_hash, v_at
    );
    UPDATE public.build_request_publication_proposals
    SET requester_attribution = p_payload->>'requester_attribution',
        requester_consented_at = v_at,
        proposal_status = CASE
          WHEN builder_consented_at IS NOT NULL
            THEN 'fully_consented'
          ELSE 'consent_pending'
        END,
        updated_at = v_at
    WHERE id = v_proposal.id
    RETURNING * INTO v_proposal;
    v_status := v_proposal.proposal_status;
    v_actor_role := 'requester';
  ELSIF p_command = 'builder_consent' THEN
    IF NOT v_consent_ready
      OR v_proposal.builder_id <> v_actor_id
      OR v_proposal.proposal_status NOT IN ('draft', 'consent_pending')
      OR v_proposal.builder_consented_at IS NOT NULL
      OR p_payload->>'publication_terms_version'
        <> v_controls.publication_terms_version
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Builder publication consent is not available.',
        DETAIL = 'request_authority:publication_blocked';
    END IF;
    INSERT INTO public.build_request_publication_consent_receipts (
      proposal_id, request_id, proposal_version, content_digest,
      safe_title_snapshot, safe_summary_snapshot,
      actor_id, actor_role, decision, reuse_permission,
      publication_terms_version, idempotency_key, request_hash,
      occurred_at
    ) VALUES (
      v_proposal.id, v_request.id, v_proposal.proposal_version,
      v_proposal.content_digest, v_proposal.safe_title,
      v_proposal.safe_summary, v_actor_id, 'builder', 'consent',
      p_payload->>'reuse_permission',
      v_controls.publication_terms_version, p_idempotency_key,
      v_hash, v_at
    );
    UPDATE public.build_request_publication_proposals
    SET reuse_permission = p_payload->>'reuse_permission',
        builder_consented_at = v_at,
        proposal_status = CASE
          WHEN requester_consented_at IS NOT NULL
            THEN 'fully_consented'
          ELSE 'consent_pending'
        END,
        updated_at = v_at
    WHERE id = v_proposal.id
    RETURNING * INTO v_proposal;
    v_status := v_proposal.proposal_status;
    v_actor_role := 'builder';
  ELSIF p_command = 'decline' THEN
    IF v_proposal.proposal_status NOT IN ('draft', 'consent_pending')
      OR (
        v_request.requester_id <> v_actor_id
        AND v_proposal.builder_id <> v_actor_id
      )
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Publication decline is not available.',
        DETAIL = 'request_authority:publication_blocked';
    END IF;
    v_actor_role := CASE
      WHEN v_request.requester_id = v_actor_id THEN 'requester'
      ELSE 'builder'
    END;
    INSERT INTO public.build_request_publication_consent_receipts (
      proposal_id, request_id, proposal_version, content_digest,
      safe_title_snapshot, safe_summary_snapshot,
      actor_id, actor_role, decision, publication_terms_version,
      idempotency_key, request_hash, occurred_at
    ) VALUES (
      v_proposal.id, v_request.id, v_proposal.proposal_version,
      v_proposal.content_digest, v_proposal.safe_title,
      v_proposal.safe_summary, v_actor_id, v_actor_role, 'decline',
      v_controls.publication_terms_version, p_idempotency_key,
      v_hash, v_at
    );
    UPDATE public.build_request_publication_proposals
    SET proposal_status = 'declined', ended_at = v_at, updated_at = v_at
    WHERE id = v_proposal.id
    RETURNING * INTO v_proposal;
    v_status := 'declined';
  ELSIF p_command = 'withdraw' THEN
    IF v_proposal.proposal_status NOT IN (
        'fully_consented', 'in_airlock', 'published'
      )
      OR (
        v_request.requester_id <> v_actor_id
        AND v_proposal.builder_id <> v_actor_id
      )
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Publication withdrawal is not available.',
        DETAIL = 'request_authority:publication_blocked';
    END IF;
    v_actor_role := CASE
      WHEN v_request.requester_id = v_actor_id THEN 'requester'
      ELSE 'builder'
    END;
    INSERT INTO public.build_request_publication_consent_receipts (
      proposal_id, request_id, proposal_version, content_digest,
      safe_title_snapshot, safe_summary_snapshot,
      actor_id, actor_role, decision, publication_terms_version,
      idempotency_key, request_hash, occurred_at
    ) VALUES (
      v_proposal.id, v_request.id, v_proposal.proposal_version,
      v_proposal.content_digest, v_proposal.safe_title,
      v_proposal.safe_summary, v_actor_id, v_actor_role, 'withdraw',
      v_controls.publication_terms_version, p_idempotency_key,
      v_hash, v_at
    );
    UPDATE public.build_request_publication_proposals
    SET proposal_status = 'withdrawn',
        ended_at = v_at,
        updated_at = v_at
    WHERE id = v_proposal.id
    RETURNING * INTO v_proposal;
    UPDATE public.build_request_public_outcomes
    SET withdrawn_at = COALESCE(withdrawn_at, v_at)
    WHERE proposal_id = v_proposal.id
      AND removed_at IS NULL;
    UPDATE public.build_request_retention_holds AS publication_hold
    SET released_by = v_actor_id,
        released_at = v_at,
        release_resolution =
          'Public outcome consent was withdrawn; standard retention resumes.'
    WHERE publication_hold.request_id = v_request.id
      AND publication_hold.hold_kind = 'legal'
      AND publication_hold.reason =
        'Active public outcome consent and publication evidence.'
      AND publication_hold.released_at IS NULL;
    v_status := 'withdrawn';
  ELSE
    IF private.request_actor_role_v1(v_actor_id) <> 'admin'
      OR NOT v_consent_ready
      OR NOT v_controls.publication_airlock_enabled
      OR v_proposal.proposal_status <> 'fully_consented'
      OR NOT private.request_public_community_airlock_ready_v1()
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Request publication airlock is not available.',
        DETAIL = 'request_authority:publication_blocked';
    END IF;
    UPDATE public.build_request_publication_proposals
    SET proposal_status = 'in_airlock',
        submitted_to_airlock_at = v_at,
        updated_at = v_at
    WHERE id = v_proposal.id
    RETURNING * INTO v_proposal;
    v_status := 'in_airlock';
    v_actor_role := 'operator';
  END IF;

  v_requester_consent := v_proposal.requester_consented_at IS NOT NULL;
  v_builder_consent := v_proposal.builder_consented_at IS NOT NULL;
  UPDATE public.build_requests
  SET publication_state = CASE
        WHEN p_command = 'withdraw' THEN 'withdrawn'
        WHEN p_command = 'decline' THEN 'private'
        WHEN v_requester_consent AND v_builder_consent
          THEN 'consented_pending_airlock'
        ELSE 'consent_pending'
      END,
      version = version + 1,
      updated_at = v_at
  WHERE id = v_request.id
  RETURNING * INTO v_request;
  SELECT COALESCE(max(event_value.sequence) + 1, 1)
  INTO v_sequence
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = v_request.id;
  v_authority := jsonb_build_object(
    'proposalVersion', v_proposal.proposal_version,
    'proposalStatus', v_status
  );
  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_id, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, command_receipt_id, outbox_id,
    participant_visible, safe_metadata, occurred_at
  ) VALUES (
    v_event_id, v_request.id, v_sequence,
    'publication_' || p_command, v_actor_id, v_actor_role,
    v_before.lifecycle_state, v_before.moderation_state,
    v_before.publication_state, v_before.close_reason,
    v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason,
    v_request.version, p_idempotency_key, v_command_id,
    v_command_id, v_command_id, TRUE,
    v_authority, v_at
  );
  INSERT INTO public.build_request_command_receipts (
    id, actor_id, idempotency_key, request_id, command_kind,
    request_hash, request_version, lifecycle_state, moderation_state,
    publication_state, close_reason, event_id, receipt, created_at
  ) VALUES (
    v_command_id, v_actor_id, p_idempotency_key, v_request.id,
    'publication_' || p_command, v_hash, v_request.version,
    v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason,
    v_event_id, jsonb_build_object('authority_result', v_authority), v_at
  );
  INSERT INTO public.build_request_outbox (
    id, request_id, event_id, topic, payload, available_at
  ) VALUES (
    v_command_id, v_request.id, v_event_id, 'request_event_v1',
    jsonb_build_object(
      'request_id', v_request.id,
      'event_id', v_event_id,
      'kind', 'publication_' || p_command
    ),
    v_at
  );
  RETURN QUERY
    SELECT * FROM private.request_receipt_v1(
      v_command_id, v_request.id, v_event_id, FALSE, v_at, v_authority
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_build_request_outcome_v1(
  p_contract_version INTEGER,
  p_proposal_id UUID,
  p_published_project_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_service BOOLEAN :=
    COALESCE(auth.jwt()->>'role', '') = 'service_role';
  v_controls public.build_request_controls%ROWTYPE;
  v_proposal public.build_request_publication_proposals%ROWTYPE;
  v_request public.build_requests%ROWTYPE;
  v_revision public.build_request_delivery_revisions%ROWTYPE;
  v_existing public.build_request_publication_bridge_receipts%ROWTYPE;
  v_outcome public.build_request_public_outcomes%ROWTYPE;
  v_hash TEXT;
  v_slug_base TEXT;
  v_slug TEXT;
  v_event_id UUID := gen_random_uuid();
  v_command_id UUID := gen_random_uuid();
  v_sequence INTEGER;
  v_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF NOT v_service
    OR p_proposal_id IS NULL
    OR p_published_project_id IS NULL
    OR p_idempotency_key IS NULL
    OR p_idempotency_key
      !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request outcome publication is not available.';
  END IF;
  v_hash := private.request_pseudonym_text_v1(jsonb_build_object(
    'proposalId', p_proposal_id,
    'publishedProjectId', p_published_project_id
  )::TEXT);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'request-publication:' || p_proposal_id::TEXT, 0
  ));
  SELECT receipt.* INTO v_existing
  FROM public.build_request_publication_bridge_receipts AS receipt
  WHERE receipt.service_idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.request_hash <> v_hash
      OR v_existing.proposal_id <> p_proposal_id
      OR v_existing.published_project_id <> p_published_project_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505',
        MESSAGE = 'Request authority rejected the operation.',
        DETAIL = 'request_authority:duplicate';
    END IF;
    SELECT outcome.* INTO STRICT v_outcome
    FROM public.build_request_public_outcomes AS outcome
    WHERE outcome.proposal_id = p_proposal_id;
    RETURN jsonb_build_object(
      'publicSlug', v_outcome.public_slug,
      'publishedProjectId', v_outcome.published_project_id,
      'publishedAt', v_outcome.published_at,
      'replayed', TRUE
    );
  END IF;
  SELECT * INTO STRICT v_controls
  FROM public.build_request_controls
  WHERE singleton
  FOR UPDATE;
  IF NOT v_controls.publication_consent_enabled
    OR NOT private.request_public_readiness_gate_v1('legal')
    OR NOT v_controls.publication_airlock_enabled
    OR NOT v_controls.public_outcomes_enabled
    OR NOT private.request_public_community_airlock_ready_v1()
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request outcome publication is blocked.',
      DETAIL = 'request_authority:publication_blocked';
  END IF;
  SELECT proposal.* INTO v_proposal
  FROM public.build_request_publication_proposals AS proposal
  WHERE proposal.id = p_proposal_id
  FOR UPDATE;
  IF NOT FOUND
    OR v_proposal.proposal_status <> 'in_airlock'
    OR v_proposal.requester_consented_at IS NULL
    OR v_proposal.builder_consented_at IS NULL
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request outcome is not airlock-ready.',
      DETAIL = 'request_authority:publication_blocked';
  END IF;
  SELECT request_case.* INTO STRICT v_request
  FROM public.build_requests AS request_case
  WHERE request_case.id = v_proposal.request_id
  FOR UPDATE;
  SELECT revision.* INTO STRICT v_revision
  FROM public.build_request_delivery_revisions AS revision
  WHERE revision.id = v_proposal.delivery_revision_id
    AND revision.request_id = v_proposal.request_id
    AND revision.artifact_manifest_digest = v_proposal.manifest_digest;
  IF v_request.lifecycle_state <> 'completed'
    OR v_request.moderation_state <> 'clear'
    OR v_request.publication_state <> 'consented_pending_airlock'
    OR NOT EXISTS (
      SELECT 1
      FROM public.prompts AS project
      WHERE project.id = p_published_project_id
        AND project.status = 'approved'
    )
    OR NOT (
      (
        v_revision.approved_pathforge_reference->>'kind' = 'project'
        AND v_revision.approved_pathforge_reference->>'project_id'
          = p_published_project_id::TEXT
      )
      OR (
        v_revision.approved_pathforge_reference->>'kind' = 'response'
        AND v_revision.approved_pathforge_reference->>'project_id'
          = p_published_project_id::TEXT
      )
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_requester_outcomes AS outcome
      WHERE outcome.request_id = v_request.id
        AND outcome.delivery_revision_id = v_revision.id
        AND outcome.manifest_digest = v_proposal.manifest_digest
        AND outcome.outcome = 'useful'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_request_delivery_reviews AS review
      WHERE review.request_id = v_request.id
        AND review.delivery_revision_id = v_revision.id
        AND review.manifest_digest = v_proposal.manifest_digest
        AND review.verdict = 'approve'
        AND review.safety_integrity_result = 'pass'
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request outcome public truth no longer matches.',
      DETAIL = 'request_authority:publication_blocked';
  END IF;

  v_slug_base := trim(BOTH '-' FROM regexp_replace(
    lower(v_proposal.safe_title), '[^a-z0-9]+', '-', 'g'
  ));
  IF char_length(v_slug_base) < 1 THEN
    v_slug_base := 'outcome';
  END IF;
  v_slug_base := left(v_slug_base, 70);
  v_slug := v_slug_base || '-' || left(v_proposal.content_digest, 12);
  INSERT INTO public.build_request_publication_bridge_receipts (
    proposal_id, request_id, published_project_id,
    service_idempotency_key, request_hash, occurred_at
  ) VALUES (
    v_proposal.id, v_request.id, p_published_project_id,
    p_idempotency_key, v_hash, v_at
  );
  INSERT INTO public.build_request_public_outcomes (
    public_slug, proposal_id, request_id, safe_title, safe_summary,
    builder_display_name, builder_deidentified,
    requester_display_name, requester_deidentified,
    reuse_permission, published_project_id, published_at
  ) VALUES (
    v_slug, v_proposal.id, v_request.id,
    v_proposal.safe_title, v_proposal.safe_summary,
    v_revision.authored_by_display_name, v_revision.authored_by_deidentified,
    CASE
      WHEN v_proposal.requester_attribution = 'credited'
        THEN v_request.requester_display_name
    END,
    CASE
      WHEN v_proposal.requester_attribution = 'credited'
        THEN v_request.requester_deidentified
      ELSE FALSE
    END,
    v_proposal.reuse_permission, p_published_project_id, v_at
  ) RETURNING * INTO v_outcome;
  INSERT INTO public.build_request_retention_holds (
    request_id, hold_kind, reason, placed_at
  )
  SELECT v_request.id, 'legal',
    'Active public outcome consent and publication evidence.', v_at
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.build_request_retention_holds AS active_hold
    WHERE active_hold.request_id = v_request.id
      AND active_hold.hold_kind = 'legal'
      AND active_hold.reason =
        'Active public outcome consent and publication evidence.'
      AND active_hold.released_at IS NULL
  );
  UPDATE public.build_request_publication_proposals
  SET proposal_status = 'published',
      published_at = v_at,
      updated_at = v_at
  WHERE id = v_proposal.id;
  UPDATE public.build_requests
  SET publication_state = 'published',
      version = version + 1,
      updated_at = v_at
  WHERE id = v_request.id
  RETURNING * INTO v_request;
  SELECT COALESCE(max(event_value.sequence) + 1, 1)
  INTO v_sequence
  FROM public.build_request_events AS event_value
  WHERE event_value.request_id = v_request.id;
  INSERT INTO public.build_request_events (
    id, request_id, sequence, event_kind, actor_role,
    old_lifecycle_state, old_moderation_state, old_publication_state,
    old_close_reason, new_lifecycle_state, new_moderation_state,
    new_publication_state, new_close_reason, resulting_request_version,
    correlation_id, command_id, command_receipt_id, outbox_id,
    participant_visible, safe_metadata, occurred_at
  ) VALUES (
    v_event_id, v_request.id, v_sequence, 'publication_published', 'system',
    v_request.lifecycle_state, v_request.moderation_state,
    'consented_pending_airlock', v_request.close_reason,
    v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason,
    v_request.version, p_idempotency_key, v_command_id,
    v_command_id, v_command_id, TRUE,
    jsonb_build_object(
      'proposalVersion', v_proposal.proposal_version,
      'proposalStatus', 'published',
      'publicSlug', v_slug
    ),
    v_at
  );
  INSERT INTO public.build_request_command_receipts (
    id, actor_id, idempotency_key, request_id, command_kind,
    request_hash, request_version, lifecycle_state, moderation_state,
    publication_state, close_reason, event_id, receipt, created_at
  ) VALUES (
    v_command_id, NULL, p_idempotency_key, v_request.id,
    'publication_published', v_hash, v_request.version,
    v_request.lifecycle_state, v_request.moderation_state,
    v_request.publication_state, v_request.close_reason,
    v_event_id, jsonb_build_object(
      'authority_result', jsonb_build_object('publicSlug', v_slug)
    ), v_at
  );
  INSERT INTO public.build_request_outbox (
    id, request_id, event_id, topic, payload, available_at
  ) VALUES (
    v_command_id, v_request.id, v_event_id, 'request_event_v1',
    jsonb_build_object(
      'request_id', v_request.id,
      'event_id', v_event_id,
      'kind', 'publication_published'
    ),
    v_at
  );
  RETURN jsonb_build_object(
    'publicSlug', v_slug,
    'publishedProjectId', p_published_project_id,
    'publishedAt', v_at,
    'replayed', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_build_request_outcomes_v1(
  p_contract_version INTEGER,
  p_limit INTEGER DEFAULT 24,
  p_cursor_published_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_items JSONB;
  v_next JSONB;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  SELECT control.public_outcomes_enabled INTO STRICT v_enabled
  FROM public.build_request_controls AS control
  WHERE control.singleton;
  IF p_limit NOT BETWEEN 1 AND 50
    OR (p_cursor_published_at IS NULL) <> (p_cursor_slug IS NULL)
    OR (
      p_cursor_slug IS NOT NULL
      AND p_cursor_slug
        !~ '^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{12}$'
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Public Request outcome query is invalid.';
  END IF;
  IF NOT v_enabled THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'items', '[]'::JSONB,
      'nextCursor', NULL
    );
  END IF;
  WITH eligible AS (
    SELECT public_outcome.*,
      row_number() OVER (
        ORDER BY
          public_outcome.published_at DESC,
          public_outcome.public_slug DESC
      ) AS row_number
    FROM public.build_request_public_outcomes AS public_outcome
    JOIN public.build_requests AS request_case
      ON request_case.id = public_outcome.request_id
      AND request_case.moderation_state = 'clear'
      AND request_case.publication_state = 'published'
    JOIN public.prompts AS project
      ON project.id = public_outcome.published_project_id
      AND project.status = 'approved'
    WHERE public_outcome.withdrawn_at IS NULL
      AND public_outcome.removed_at IS NULL
      AND (
        p_cursor_published_at IS NULL
        OR (
          public_outcome.published_at,
          public_outcome.public_slug
        ) < (p_cursor_published_at, p_cursor_slug)
      )
    ORDER BY
      public_outcome.published_at DESC,
      public_outcome.public_slug DESC
    LIMIT p_limit + 1
  ),
  page AS (
    SELECT * FROM eligible WHERE row_number <= p_limit
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'slug', outcome.public_slug,
    'title', outcome.safe_title,
    'summary', outcome.safe_summary,
    'builder', jsonb_build_object(
      'displayName', outcome.builder_display_name,
      'deidentified', outcome.builder_deidentified
    ),
    'requester', CASE
      WHEN outcome.requester_display_name IS NULL THEN NULL
      ELSE jsonb_build_object(
        'displayName', outcome.requester_display_name,
        'deidentified', outcome.requester_deidentified
      )
    END,
    'reusePermission', outcome.reuse_permission,
    'projectId', outcome.published_project_id,
    'projectHref', '/prompt/' || outcome.published_project_id::TEXT,
    'publishedAt', outcome.published_at
  ) ORDER BY
    outcome.published_at DESC,
    outcome.public_slug DESC
  ), '[]'::JSONB),
  CASE WHEN EXISTS (
      SELECT 1 FROM eligible AS extra
      WHERE extra.row_number = p_limit + 1
    )
    THEN (
      SELECT jsonb_build_object(
        'publishedAt', boundary.published_at,
        'slug', boundary.public_slug
      )
      FROM eligible AS boundary
      WHERE boundary.row_number = p_limit
    )
    ELSE NULL
  END
  INTO v_items, v_next
  FROM page AS outcome;
  RETURN jsonb_build_object(
    'available', TRUE,
    'items', v_items,
    'nextCursor', v_next
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_build_request_outcome_v1(
  p_contract_version INTEGER,
  p_public_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_outcome public.build_request_public_outcomes%ROWTYPE;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  SELECT control.public_outcomes_enabled INTO STRICT v_enabled
  FROM public.build_request_controls AS control
  WHERE control.singleton;
  IF NOT v_enabled
    OR p_public_slug IS NULL
    OR p_public_slug
      !~ '^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{12}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Public Request outcome was not found.',
      DETAIL = 'request_authority:not_found';
  END IF;
  SELECT outcome.* INTO v_outcome
  FROM public.build_request_public_outcomes AS outcome
  JOIN public.build_requests AS request_case
    ON request_case.id = outcome.request_id
    AND request_case.moderation_state = 'clear'
    AND request_case.publication_state = 'published'
  JOIN public.prompts AS project
    ON project.id = outcome.published_project_id
    AND project.status = 'approved'
  WHERE outcome.public_slug = p_public_slug
    AND outcome.withdrawn_at IS NULL
    AND outcome.removed_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Public Request outcome was not found.',
      DETAIL = 'request_authority:not_found';
  END IF;
  RETURN jsonb_build_object(
    'slug', v_outcome.public_slug,
    'title', v_outcome.safe_title,
    'summary', v_outcome.safe_summary,
    'builder', jsonb_build_object(
      'displayName', v_outcome.builder_display_name,
      'deidentified', v_outcome.builder_deidentified
    ),
    'requester', CASE
      WHEN v_outcome.requester_display_name IS NULL THEN NULL
      ELSE jsonb_build_object(
        'displayName', v_outcome.requester_display_name,
        'deidentified', v_outcome.requester_deidentified
      )
    END,
    'reusePermission', v_outcome.reuse_permission,
    'projectId', v_outcome.published_project_id,
    'projectHref', '/prompt/' || v_outcome.published_project_id::TEXT,
    'publishedAt', v_outcome.published_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_build_request_publication_queue_v1(
  p_contract_version INTEGER,
  p_status TEXT DEFAULT 'active',
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_items JSONB;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF v_actor_id IS NULL
    OR private.request_actor_role_v1(v_actor_id) <> 'admin'
    OR p_status NOT IN (
      'active', 'consent_pending', 'fully_consented',
      'in_airlock', 'published'
    )
    OR p_limit NOT BETWEEN 1 AND 100
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request publication queue is not available.';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'proposalId', proposal.id,
    'requestId', proposal.request_id,
    'proposalVersion', proposal.proposal_version,
    'status', proposal.proposal_status,
    'safeTitle', proposal.safe_title,
    'safeSummary', proposal.safe_summary,
    'requesterConsented', proposal.requester_consented_at IS NOT NULL,
    'builderConsented', proposal.builder_consented_at IS NOT NULL,
    'requesterAttribution', proposal.requester_attribution,
    'reusePermission', proposal.reuse_permission,
    'updatedAt', proposal.updated_at,
    'publishedAt', proposal.published_at
  ) ORDER BY proposal.updated_at, proposal.id), '[]'::JSONB)
  INTO v_items
  FROM (
    SELECT queued.*
    FROM public.build_request_publication_proposals AS queued
    JOIN public.build_requests AS request_case
      ON request_case.id = queued.request_id
    WHERE request_case.moderation_state = 'clear'
      AND (
        (p_status = 'active' AND queued.proposal_status IN (
          'consent_pending', 'fully_consented', 'in_airlock'
        ))
        OR queued.proposal_status = p_status
      )
    ORDER BY queued.updated_at, queued.id
    LIMIT p_limit
  ) AS proposal;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', NULL);
END;
$$;

-- Terminal assignments become inactive in the private authority. Preserve a
-- bounded durable continuation only for the author and approving reviewer of
-- the exact final delivery, so they can inspect their record and act on a
-- separately consented publication proposal without restoring stale roles.
CREATE OR REPLACE FUNCTION private.request_has_scope_v1(
  p_request_id UUID,
  p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.build_requests AS request_case
    WHERE request_case.id = p_request_id
      AND (
        request_case.lifecycle_state NOT IN ('completed', 'closed')
        OR (
          COALESCE(
            request_case.audit_tombstone_until,
            request_case.terminal_at + INTERVAL '400 days'
          ) > clock_timestamp()
        )
        OR (
          private.request_actor_role_v1(p_actor_id) = 'admin'
          AND EXISTS (
            SELECT 1
            FROM public.build_request_retention_holds AS preserved_hold
            WHERE preserved_hold.request_id = request_case.id
              AND preserved_hold.released_at IS NULL
          )
        )
      )
      AND (
        request_case.requester_id = p_actor_id
        OR EXISTS (
          SELECT 1
          FROM public.build_request_assignments AS assignment
          WHERE assignment.request_id = request_case.id
            AND assignment.account_id = p_actor_id
            AND assignment.active
        )
        OR EXISTS (
          SELECT 1
          FROM public.build_request_participants AS participant
          WHERE participant.request_id = request_case.id
            AND participant.account_id = p_actor_id
            AND participant.active
        )
        OR private.request_actor_role_v1(p_actor_id) = 'admin'
        OR (
          request_case.lifecycle_state IN ('completed', 'closed')
          AND EXISTS (
            SELECT 1
            FROM public.build_request_delivery_revisions AS final_revision
            WHERE final_revision.id =
                request_case.current_delivery_revision_id
              AND final_revision.request_id = request_case.id
              AND (
                final_revision.authored_by = p_actor_id
                OR EXISTS (
                  SELECT 1
                  FROM public.build_request_delivery_reviews AS final_review
                  WHERE final_review.request_id = request_case.id
                    AND final_review.delivery_revision_id =
                      final_revision.id
                    AND final_review.manifest_digest =
                      final_revision.artifact_manifest_digest
                    AND final_review.reviewer_id = p_actor_id
                    AND final_review.verdict = 'approve'
                    AND final_review.safety_integrity_result = 'pass'
                )
              )
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.list_build_request_queue_v1(
  p_contract_version INTEGER,
  p_scope TEXT,
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_role TEXT;
  v_items JSONB;
  v_next TEXT;
  v_cursor JSONB;
  v_cursor_at TIMESTAMPTZ;
  v_cursor_id UUID;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  v_role := private.request_actor_role_v1(v_actor_id);
  IF v_actor_id IS NULL
    OR p_scope IS NULL
    OR p_scope NOT IN ('admin', 'triager', 'builder', 'reviewer')
    OR p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 50
    OR char_length(COALESCE(p_cursor, '')) > 500
    OR (p_scope = 'admin' AND v_role <> 'admin')
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Assigned queue scope is not allowed.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rq1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY[
          'version', 'kind', 'actorId', 'scope', 'updatedAt', 'requestId'
        ],
        'Assigned queue cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'queue'
        OR v_cursor->>'actorId' <> v_actor_id::TEXT
        OR v_cursor->>'scope' <> p_scope
      THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Assigned queue cursor is invalid.';
      END IF;
      v_cursor_at := (v_cursor->>'updatedAt')::TIMESTAMPTZ;
      v_cursor_id := (v_cursor->>'requestId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Assigned queue cursor is invalid.',
        DETAIL = SQLERRM;
    END;
  END IF;
  WITH eligible AS (
    SELECT request_case.id, request_case.updated_at,
      private.request_summary_json_v1(
        request_case.id, v_actor_id
      ) || jsonb_build_object(
        'actorRole', CASE
          WHEN p_scope = 'admin' THEN 'admin'
          WHEN p_scope = 'triager' THEN 'triager'
          ELSE p_scope
        END,
        'targetDate', request_case.target_date
      ) AS item,
      row_number() OVER (
        ORDER BY request_case.updated_at DESC, request_case.id DESC
      ) AS row_number
    FROM public.build_requests AS request_case
    WHERE (
        p_cursor IS NULL
        OR (request_case.updated_at, request_case.id)
          < (v_cursor_at, v_cursor_id)
      )
      AND (
        request_case.lifecycle_state NOT IN ('completed', 'closed')
        OR (
          COALESCE(
            request_case.audit_tombstone_until,
            request_case.terminal_at + INTERVAL '400 days'
          ) > clock_timestamp()
        )
        OR (
          p_scope = 'admin'
          AND EXISTS (
            SELECT 1
            FROM public.build_request_retention_holds AS preserved_hold
            WHERE preserved_hold.request_id = request_case.id
              AND preserved_hold.released_at IS NULL
          )
        )
      )
      AND (
        (p_scope = 'admin' AND v_role = 'admin')
        OR (
          p_scope = 'triager'
          AND EXISTS (
            SELECT 1
            FROM public.build_request_participants AS triager_participant
            WHERE triager_participant.request_id = request_case.id
              AND triager_participant.account_id = v_actor_id
              AND triager_participant.actor_role = 'triager'
              AND triager_participant.active
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.build_request_assignments AS assignment
          WHERE assignment.request_id = request_case.id
            AND assignment.account_id = v_actor_id
            AND assignment.assignment_role = p_scope
            AND assignment.active
        )
        OR (
          p_scope = 'builder'
          AND request_case.lifecycle_state IN ('completed', 'closed')
          AND EXISTS (
            SELECT 1
            FROM public.build_request_delivery_revisions AS final_revision
            WHERE final_revision.id =
                request_case.current_delivery_revision_id
              AND final_revision.request_id = request_case.id
              AND final_revision.authored_by = v_actor_id
          )
        )
        OR (
          p_scope = 'reviewer'
          AND request_case.lifecycle_state IN ('completed', 'closed')
          AND EXISTS (
            SELECT 1
            FROM public.build_request_delivery_revisions AS final_revision
            JOIN public.build_request_delivery_reviews AS final_review
              ON final_review.request_id = final_revision.request_id
              AND final_review.delivery_revision_id = final_revision.id
              AND final_review.manifest_digest =
                final_revision.artifact_manifest_digest
            WHERE final_revision.id =
                request_case.current_delivery_revision_id
              AND final_revision.request_id = request_case.id
              AND final_review.reviewer_id = v_actor_id
              AND final_review.verdict = 'approve'
              AND final_review.safety_integrity_result = 'pass'
          )
        )
      )
    ORDER BY request_case.updated_at DESC, request_case.id DESC
    LIMIT p_limit + 1
  )
  SELECT COALESCE(jsonb_agg(
      page.item ORDER BY page.updated_at DESC, page.id DESC
    ) FILTER (WHERE page.row_number <= p_limit), '[]'::JSONB),
    CASE WHEN max(page.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1(
        'rq1',
        jsonb_build_object(
          'version', 1,
          'kind', 'queue',
          'actorId', v_actor_id,
          'scope', p_scope,
          'updatedAt', boundary.updated_at,
          'requestId', boundary.id
        )
      )
      FROM eligible AS boundary
      WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM eligible AS page;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.maintain_build_request_public_architecture_v1(
  p_contract_version INTEGER,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_service BOOLEAN :=
    COALESCE(auth.jwt()->>'role', '') = 'service_role';
  v_reports INTEGER := 0;
  v_proposals INTEGER := 0;
  v_risk_grants INTEGER := 0;
  v_notifications INTEGER := 0;
  v_readiness INTEGER := 0;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  IF NOT v_service OR p_limit NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request public-architecture maintenance is unavailable.';
  END IF;

  WITH candidates AS (
    SELECT report.id
    FROM public.build_request_reports AS report
    JOIN public.build_requests AS request_case
      ON request_case.id = report.request_id
    WHERE report.status IN ('resolved', 'dismissed')
      AND report.details_purged_at IS NULL
      AND request_case.raw_text_purged_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_retention_holds AS active_hold
        WHERE active_hold.request_id = request_case.id
          AND active_hold.released_at IS NULL
      )
    ORDER BY report.resolved_at, report.id
    LIMIT p_limit
  )
  UPDATE public.build_request_reports AS report
  SET details = '[Private report text removed after retention.]',
      resolution_note = CASE
        WHEN report.resolution_note IS NULL THEN NULL
        ELSE '[Private report resolution removed after retention.]'
      END,
      details_purged_at = clock_timestamp(),
      updated_at = clock_timestamp()
  FROM candidates
  WHERE report.id = candidates.id;
  GET DIAGNOSTICS v_reports = ROW_COUNT;

  WITH candidates AS (
    SELECT proposal.id
    FROM public.build_request_publication_proposals AS proposal
    JOIN public.build_requests AS request_case
      ON request_case.id = proposal.request_id
    WHERE proposal.proposal_status IN ('declined', 'withdrawn', 'removed')
      AND proposal.content_purged_at IS NULL
      AND request_case.raw_text_purged_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_retention_holds AS active_hold
        WHERE active_hold.request_id = request_case.id
          AND active_hold.released_at IS NULL
      )
    ORDER BY proposal.ended_at, proposal.id
    LIMIT p_limit
  )
  UPDATE public.build_request_publication_proposals AS proposal
  SET safe_title = '[Publication proposal removed]',
      safe_summary =
        '[Publication proposal content removed after private retention.]',
      content_purged_at = clock_timestamp(),
      updated_at = clock_timestamp()
  FROM candidates
  WHERE proposal.id = candidates.id;
  GET DIAGNOSTICS v_proposals = ROW_COUNT;

  WITH candidates AS (
    SELECT grant_row.id
    FROM public.build_request_intake_risk_grants AS grant_row
    WHERE grant_row.issued_at
      <= clock_timestamp() - INTERVAL '30 days'
    ORDER BY grant_row.issued_at, grant_row.id
    LIMIT p_limit
  )
  DELETE FROM public.build_request_intake_risk_grants AS grant_row
  USING candidates
  WHERE grant_row.id = candidates.id;
  GET DIAGNOSTICS v_risk_grants = ROW_COUNT;

  WITH candidates AS (
    SELECT delivery.id
    FROM public.build_request_notification_deliveries AS delivery
    WHERE delivery.delivery_state IN ('delivered', 'suppressed', 'dead')
      AND delivery.updated_at
        <= clock_timestamp() - INTERVAL '90 days'
    ORDER BY delivery.updated_at, delivery.id
    LIMIT p_limit
  )
  DELETE FROM public.build_request_notification_deliveries AS delivery
  USING candidates
  WHERE delivery.id = candidates.id;
  GET DIAGNOSTICS v_notifications = ROW_COUNT;

  WITH candidates AS (
    SELECT evidence.id
    FROM public.build_request_readiness_evidence AS evidence
    WHERE (
        evidence.evidence_state = 'revoked'
        OR (
          evidence.valid_until IS NOT NULL
          AND evidence.valid_until <= clock_timestamp()
        )
      )
      AND evidence.confirmed_at
        <= clock_timestamp() - INTERVAL '400 days'
    ORDER BY evidence.confirmed_at, evidence.id
    LIMIT p_limit
  )
  DELETE FROM public.build_request_readiness_evidence AS evidence
  USING candidates
  WHERE evidence.id = candidates.id;
  GET DIAGNOSTICS v_readiness = ROW_COUNT;

  RETURN jsonb_build_object(
    'reportsPurged', v_reports,
    'proposalsPurged', v_proposals,
    'riskGrantsDeleted', v_risk_grants,
    'notificationDeliveriesDeleted', v_notifications,
    'readinessEvidenceDeleted', v_readiness
  );
END;
$$;

REVOKE ALL ON FUNCTION
  private.request_has_scope_v1(UUID, UUID),
  private.request_public_append_only_v1(),
  private.request_public_actor_is_confirmed_v1(UUID),
  private.request_public_operator_is_rostered_v1(UUID, TEXT),
  private.request_public_operator_is_available_v1(UUID, TEXT, UUID),
  private.request_public_roster_ready_v1(),
  private.request_public_readiness_gate_v1(TEXT),
  private.request_public_community_airlock_ready_v1(),
  private.request_notification_event_recipient_v1(UUID, UUID, UUID),
  private.request_enforce_operator_roster_v1(),
  private.request_enforce_fulfillment_capacity_v1(),
  private.request_enforce_public_controls_v1(),
  private.request_hide_public_outcome_v1(),
  private.request_deidentify_public_architecture_v1(),
  private.request_public_controls_json_v1()
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION
  public.submit_build_request_v1(INTEGER, TEXT, JSONB),
  public.set_build_request_controls_v1(
    INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, INTEGER
  ),
  public.list_build_request_queue_v1(INTEGER, TEXT, TEXT, INTEGER),
  public.get_build_request_public_availability_v1(INTEGER),
  public.get_build_request_public_operations_v1(INTEGER),
  public.set_build_request_operator_membership_v1(
    INTEGER, UUID, TEXT, INTEGER, TEXT, INTEGER,
    TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
  ),
  public.list_build_request_operator_directory_v1(
    INTEGER, TEXT, INTEGER
  ),
  public.record_build_request_readiness_v1(
    INTEGER, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT
  ),
  public.set_build_request_public_controls_v1(
    INTEGER, INTEGER, TEXT, JSONB
  ),
  public.issue_build_request_intake_risk_grant_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT
  ),
  public.submit_build_request_public_v1(
    INTEGER, TEXT, UUID, JSONB, JSONB
  ),
  public.report_build_request_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT
  ),
  public.list_build_request_reports_v1(
    INTEGER, TEXT, INTEGER, TIMESTAMPTZ, UUID, INTEGER, UUID
  ),
  public.set_build_request_report_status_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT, TEXT
  ),
  public.get_build_request_notification_preference_v1(INTEGER),
  public.set_build_request_notification_preference_v1(
    INTEGER, INTEGER, BOOLEAN, TEXT
  ),
  public.project_build_request_notifications_v1(INTEGER, INTEGER),
  public.claim_build_request_notifications_v1(INTEGER, INTEGER),
  public.finish_build_request_notification_v1(
    INTEGER, UUID, UUID, BOOLEAN, TEXT
  ),
  public.get_build_request_publication_v1(INTEGER, UUID),
  public.build_request_publication_command_v1(
    INTEGER, UUID, INTEGER, INTEGER, TEXT, TEXT, JSONB
  ),
  public.publish_build_request_outcome_v1(
    INTEGER, UUID, UUID, TEXT
  ),
  public.list_public_build_request_outcomes_v1(
    INTEGER, INTEGER, TIMESTAMPTZ, TEXT
  ),
  public.get_public_build_request_outcome_v1(INTEGER, TEXT),
  public.list_build_request_publication_queue_v1(
    INTEGER, TEXT, INTEGER
  ),
  public.maintain_build_request_public_architecture_v1(
    INTEGER, INTEGER
  ),
  public.list_build_request_eligible_assignees_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT, INTEGER
  )
FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.submit_build_request_v1(
  INTEGER, TEXT, JSONB
) IS
  'Retired by the public-ready architecture; intake must use submit_build_request_public_v1 so policy and risk authority cannot be bypassed.';
COMMENT ON FUNCTION public.set_build_request_controls_v1(
  INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, INTEGER
) IS
  'Retired by the public-ready architecture; control changes must use set_build_request_public_controls_v1 so readiness and independent gate ordering remain canonical.';

GRANT EXECUTE ON FUNCTION
  public.get_build_request_public_availability_v1(INTEGER),
  public.list_public_build_request_outcomes_v1(
    INTEGER, INTEGER, TIMESTAMPTZ, TEXT
  ),
  public.get_public_build_request_outcome_v1(INTEGER, TEXT)
TO anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.list_build_request_queue_v1(INTEGER, TEXT, TEXT, INTEGER),
  public.get_build_request_public_operations_v1(INTEGER),
  public.set_build_request_operator_membership_v1(
    INTEGER, UUID, TEXT, INTEGER, TEXT, INTEGER,
    TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
  ),
  public.list_build_request_operator_directory_v1(
    INTEGER, TEXT, INTEGER
  ),
  public.record_build_request_readiness_v1(
    INTEGER, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT
  ),
  public.set_build_request_public_controls_v1(
    INTEGER, INTEGER, TEXT, JSONB
  ),
  public.submit_build_request_public_v1(
    INTEGER, TEXT, UUID, JSONB, JSONB
  ),
  public.report_build_request_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT
  ),
  public.list_build_request_reports_v1(
    INTEGER, TEXT, INTEGER, TIMESTAMPTZ, UUID, INTEGER, UUID
  ),
  public.set_build_request_report_status_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT, TEXT
  ),
  public.get_build_request_notification_preference_v1(INTEGER),
  public.set_build_request_notification_preference_v1(
    INTEGER, INTEGER, BOOLEAN, TEXT
  ),
  public.get_build_request_publication_v1(INTEGER, UUID),
  public.build_request_publication_command_v1(
    INTEGER, UUID, INTEGER, INTEGER, TEXT, TEXT, JSONB
  ),
  public.list_build_request_publication_queue_v1(
    INTEGER, TEXT, INTEGER
  ),
  public.list_build_request_eligible_assignees_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT, INTEGER
  )
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.issue_build_request_intake_risk_grant_v1(
    INTEGER, UUID, TEXT, TEXT, TEXT
  ),
  public.project_build_request_notifications_v1(INTEGER, INTEGER),
  public.claim_build_request_notifications_v1(INTEGER, INTEGER),
  public.finish_build_request_notification_v1(
    INTEGER, UUID, UUID, BOOLEAN, TEXT
  ),
  public.publish_build_request_outcome_v1(
    INTEGER, UUID, UUID, TEXT
  ),
  public.maintain_build_request_public_architecture_v1(
    INTEGER, INTEGER
  )
TO service_role;

COMMENT ON FUNCTION public.submit_build_request_public_v1(
  INTEGER, TEXT, UUID, JSONB, JSONB
) IS
  'Actor-derived broad-or-invited private intake with exact policy attestation and optional consumed risk grant.';
COMMENT ON FUNCTION public.publish_build_request_outcome_v1(
  INTEGER, UUID, UUID, TEXT
) IS
  'Service-only bridge from dual-consented Request outcome to an already approved PathForge project.';
COMMENT ON TABLE public.build_request_public_outcomes IS
  'RPC-only safe outcome projection; contains no brief, evidence, object identity, manifest digest, email, or account identifier.';

-- Extend the canonical participant timeline with the separately controlled
-- publication axis. Existing event mappings remain byte-for-byte equivalent.
CREATE OR REPLACE FUNCTION private.request_event_page_json_v1(
  p_request_id UUID,
  p_cursor TEXT,
  p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_cursor JSONB;
  v_cursor_sequence INTEGER;
  v_items JSONB;
  v_next TEXT;
BEGIN
  IF p_request_id IS NULL
    OR p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 50
    OR char_length(COALESCE(p_cursor, '')) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Request event cursor is invalid.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rqe1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY[
          'version', 'kind', 'requestId', 'actorId', 'lastSequence'
        ],
        'Request event cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'events'
        OR v_cursor->>'requestId' <> p_request_id::TEXT
        OR v_cursor->>'actorId' <> v_actor_id::TEXT
        OR v_cursor->>'lastSequence' IS NULL
      THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = 'Request event cursor is invalid.';
      END IF;
      v_cursor_sequence := (v_cursor->>'lastSequence')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Request event cursor is invalid.';
    END;
  END IF;
  WITH eligible AS (
    SELECT event_value.id, event_value.sequence, event_value.event_kind,
      event_value.actor_id, event_value.actor_deidentified,
      event_value.actor_role, event_value.safe_metadata,
      event_value.redactable_reason, event_value.occurred_at,
      event_value.old_lifecycle_state, event_value.old_moderation_state,
      event_value.old_publication_state, event_value.old_close_reason,
      event_value.new_lifecycle_state, event_value.new_moderation_state,
      event_value.new_publication_state, event_value.new_close_reason,
      event_value.resulting_request_version, event_value.correlation_id,
      event_value.command_id,
      row_number() OVER (
        ORDER BY event_value.sequence DESC
      ) AS row_number
    FROM public.build_request_events AS event_value
    WHERE event_value.request_id = p_request_id
      AND event_value.participant_visible
      AND (
        p_cursor IS NULL
        OR event_value.sequence < v_cursor_sequence
      )
    ORDER BY event_value.sequence DESC
    LIMIT p_limit + 1
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'eventId', visible.id,
      'sequence', visible.sequence,
      'kind', CASE visible.event_kind
        WHEN 'submitted' THEN 'request_submitted'
        WHEN 'begin_triage' THEN 'triage_started'
        WHEN 'request_clarification' THEN 'clarification_requested'
        WHEN 'submit_clarification' THEN 'clarification_submitted'
        WHEN 'accept' THEN 'request_accepted'
        WHEN 'assign_reviewer' THEN 'reviewer_assigned'
        WHEN 'reassign_triager' THEN 'triager_reassigned'
        WHEN 'reassign_builder' THEN 'builder_reassigned'
        WHEN 'reassign_reviewer' THEN 'reviewer_reassigned'
        WHEN 'start_build' THEN 'build_started'
        WHEN 'prepare_delivery_revision'
          THEN 'delivery_revision_prepared'
        WHEN 'stage_delivery_artifact' THEN 'delivery_artifact_staged'
        WHEN 'abandon_delivery_artifact'
          THEN 'delivery_artifact_abandoned'
        WHEN 'submit_delivery' THEN 'delivery_submitted'
        WHEN 'resubmit_delivery' THEN 'delivery_resubmitted'
        WHEN 'approve_delivery' THEN 'delivery_approved'
        WHEN 'request_repair' THEN 'delivery_repair_requested'
        WHEN 'acknowledge_delivery' THEN 'delivery_acknowledged'
        WHEN 'requester_delivery_outcome'
          THEN 'requester_outcome_recorded'
        WHEN 'close' THEN 'request_closed'
        WHEN 'close_no_response' THEN 'request_closed'
        WHEN 'withdraw' THEN 'request_withdrawn'
        WHEN 'place_moderation_hold' THEN 'moderation_hold_placed'
        WHEN 'release_moderation_hold' THEN 'moderation_hold_released'
        WHEN 'remove_for_moderation' THEN 'moderation_removed'
        WHEN 'account_deidentified' THEN 'account_deidentified'
        WHEN 'delivery_revision_retired'
          THEN 'delivery_revision_retired'
        WHEN 'publication_propose' THEN 'publication_proposed'
        WHEN 'publication_replace_proposal'
          THEN 'publication_proposal_updated'
        WHEN 'publication_requester_consent'
          THEN 'publication_consent_recorded'
        WHEN 'publication_builder_consent'
          THEN 'publication_consent_recorded'
        WHEN 'publication_decline' THEN 'publication_declined'
        WHEN 'publication_withdraw' THEN 'publication_withdrawn'
        WHEN 'publication_submit_airlock'
          THEN 'publication_airlock_submitted'
        WHEN 'publication_published' THEN 'publication_published'
      END,
      'label', replace(
        initcap(replace(visible.event_kind, '_', ' ')),
        ' No ',
        ' no '
      ),
      'actorRole', visible.actor_role,
      'actor', CASE
        WHEN visible.actor_role = 'system' THEN NULL
        ELSE jsonb_build_object(
          'displayName', CASE
            WHEN visible.actor_deidentified THEN 'Former participant'
            ELSE COALESCE(
              private.request_display_name_v1(visible.actor_id),
              'PathForge participant'
            )
          END,
          'deidentified', visible.actor_deidentified
        )
      END,
      'occurredAt', visible.occurred_at,
      'oldAxes', CASE
        WHEN visible.old_lifecycle_state IS NULL THEN NULL
        ELSE jsonb_build_object(
          'lifecycleState', visible.old_lifecycle_state,
          'moderationState', visible.old_moderation_state,
          'publicationState', visible.old_publication_state,
          'closeReason', visible.old_close_reason
        )
      END,
      'newAxes', jsonb_build_object(
        'lifecycleState', visible.new_lifecycle_state,
        'moderationState', visible.new_moderation_state,
        'publicationState', visible.new_publication_state,
        'closeReason', visible.new_close_reason
      ),
      'reason', COALESCE(
        visible.redactable_reason,
        visible.safe_metadata->>'reason'
      ),
      'reference', visible.safe_metadata->'resolutionReference'
    ) ORDER BY visible.sequence DESC)
      FILTER (WHERE visible.row_number <= p_limit),
      '[]'::JSONB
    ),
    CASE WHEN max(visible.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1(
        'rqe1',
        jsonb_build_object(
          'version', 1,
          'kind', 'events',
          'requestId', p_request_id,
          'actorId', v_actor_id,
          'lastSequence', boundary.sequence
        )
      )
      FROM eligible AS boundary
      WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM eligible AS visible;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;

-- Preserve the V1 assignee read signature while making its results agree with
-- the new roster/workload authority. Existing admin UI therefore cannot offer
-- an account that the assignment trigger will reject.
CREATE OR REPLACE FUNCTION public.list_build_request_eligible_assignees_v1(
  p_contract_version INTEGER,
  p_request_id UUID,
  p_assignment_role TEXT,
  p_query TEXT DEFAULT '',
  p_cursor TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_query TEXT := btrim(COALESCE(p_query, ''));
  v_cursor JSONB;
  v_cursor_name TEXT;
  v_cursor_id UUID;
  v_items JSONB;
  v_next TEXT;
  v_roster_required BOOLEAN;
BEGIN
  PERFORM private.request_assert_contract_v1(p_contract_version);
  SELECT control.operator_roster_required INTO STRICT v_roster_required
  FROM public.build_request_controls AS control
  WHERE control.singleton;
  IF private.request_actor_role_v1(v_actor_id) <> 'admin'
    OR p_request_id IS NULL
    OR p_assignment_role IS NULL
    OR p_assignment_role NOT IN ('triager', 'builder', 'reviewer')
    OR p_query IS NULL
    OR p_limit IS NULL
    OR p_limit NOT BETWEEN 1 AND 50
    OR char_length(v_query) > 80
    OR char_length(COALESCE(p_cursor, '')) > 500
    OR NOT EXISTS (
      SELECT 1
      FROM public.build_requests AS request_case
      WHERE request_case.id = p_request_id
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Eligible assignee list is not available.';
  END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := private.request_cursor_decode_v1('rq1', p_cursor);
      PERFORM private.request_assert_json_keys_v1(
        v_cursor,
        ARRAY[
          'version', 'kind', 'actorId', 'requestId',
          'assignmentRole', 'query', 'displayName', 'accountId'
        ],
        'Eligible assignee cursor'
      );
      IF v_cursor->>'version' <> '1'
        OR v_cursor->>'kind' <> 'eligible-assignees'
        OR v_cursor->>'actorId' <> v_actor_id::TEXT
        OR v_cursor->>'requestId' <> p_request_id::TEXT
        OR v_cursor->>'assignmentRole' <> p_assignment_role
        OR v_cursor->>'query' <> lower(v_query)
      THEN
        RAISE EXCEPTION 'invalid cursor';
      END IF;
      v_cursor_name := v_cursor->>'displayName';
      v_cursor_id := (v_cursor->>'accountId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Eligible assignee cursor is invalid.';
    END;
  END IF;
  WITH candidates AS (
    SELECT profile.id,
      private.request_display_name_v1(profile.id) AS display_name
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.id
    JOIN public.build_requests AS request_case
      ON request_case.id = p_request_id
    WHERE auth_user.email_confirmed_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_deidentified_accounts AS tombstone
        WHERE tombstone.subject_digest =
          private.request_account_pseudonym_v1(profile.id)
      )
      AND (
        p_assignment_role <> 'triager'
        OR profile.role = 'admin'
      )
      AND (
        NOT v_roster_required
        OR private.request_public_operator_is_available_v1(
          profile.id, p_assignment_role, p_request_id
        )
      )
      AND profile.id IS DISTINCT FROM request_case.requester_id
      AND (
        v_query = ''
        OR private.request_display_name_v1(profile.id) ILIKE
          '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%'
            ESCAPE '\'
      )
      AND (
        p_assignment_role = 'triager'
        OR NOT EXISTS (
          SELECT 1
          FROM public.build_request_assignments AS opposite_assignment
          WHERE opposite_assignment.request_id = p_request_id
            AND opposite_assignment.account_id = profile.id
            AND opposite_assignment.active
            AND opposite_assignment.assignment_role
              <> p_assignment_role
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_assignments AS current_assignment
        WHERE p_assignment_role IN ('builder', 'reviewer')
          AND current_assignment.request_id = p_request_id
          AND current_assignment.assignment_role = p_assignment_role
          AND current_assignment.account_id = profile.id
          AND current_assignment.active
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.build_request_participants AS current_triager
        WHERE p_assignment_role = 'triager'
          AND current_triager.request_id = p_request_id
          AND current_triager.actor_role = 'triager'
          AND current_triager.account_id = profile.id
          AND current_triager.active
      )
      AND (
        p_cursor IS NULL
        OR (
          lower(private.request_display_name_v1(profile.id)),
          profile.id
        ) > (lower(v_cursor_name), v_cursor_id)
      )
    ORDER BY
      lower(private.request_display_name_v1(profile.id)),
      profile.id
    LIMIT p_limit + 1
  ),
  numbered AS (
    SELECT candidates.*,
      row_number() OVER (
        ORDER BY lower(display_name), id
      ) AS row_number
    FROM candidates
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'accountId', numbered.id,
      'displayName', numbered.display_name
    ) ORDER BY lower(numbered.display_name), numbered.id)
      FILTER (WHERE numbered.row_number <= p_limit),
      '[]'::JSONB
    ),
    CASE WHEN max(numbered.row_number) > p_limit THEN (
      SELECT private.request_cursor_encode_v1(
        'rq1',
        jsonb_build_object(
          'version', 1,
          'kind', 'eligible-assignees',
          'actorId', v_actor_id,
          'requestId', p_request_id,
          'assignmentRole', p_assignment_role,
          'query', lower(v_query),
          'displayName', boundary.display_name,
          'accountId', boundary.id
        )
      )
      FROM numbered AS boundary
      WHERE boundary.row_number = p_limit
    ) END
  INTO v_items, v_next
  FROM numbered;
  RETURN jsonb_build_object('items', v_items, 'nextCursor', v_next);
END;
$$;
