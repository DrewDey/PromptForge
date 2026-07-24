-- Close the release-review gaps around external-invitation readiness and
-- operator notification delivery. Public reports are accepted durably before
-- notification, failed notifications remain retryable database state, and
-- neither publication nor invited-builder intake can rely on a browser-only
-- confirmation.

ALTER TABLE public.community_project_reports
  DROP CONSTRAINT IF EXISTS community_project_reports_reason_check;
ALTER TABLE public.community_project_reports
  ADD CONSTRAINT community_project_reports_reason_check CHECK (
    reason IN (
      'privacy',
      'copyright',
      'malware',
      'exploitation',
      'credentials',
      'imminent_harm',
      'abuse',
      'misleading',
      'other'
    )
  );

ALTER TABLE public.community_project_reports
  ADD COLUMN alert_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN alert_attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN alert_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN alert_delivered_at TIMESTAMPTZ,
  ADD COLUMN alert_failure_code TEXT;

ALTER TABLE public.community_project_reports
  ADD CONSTRAINT community_project_reports_alert_status_check CHECK (
    alert_status IN ('pending', 'delivered', 'failed')
  ),
  ADD CONSTRAINT community_project_reports_alert_attempt_count_check CHECK (
    alert_attempt_count BETWEEN 0 AND 10000
  ),
  ADD CONSTRAINT community_project_reports_alert_failure_code_check CHECK (
    alert_failure_code IS NULL
    OR (
      LENGTH(alert_failure_code) BETWEEN 1 AND 120
      AND alert_failure_code !~ '[[:cntrl:]]'
    )
  ),
  ADD CONSTRAINT community_project_reports_alert_state_check CHECK (
    (
      alert_status = 'delivered'
      AND alert_delivered_at IS NOT NULL
      AND alert_failure_code IS NULL
    )
    OR (
      alert_status IN ('pending', 'failed')
      AND alert_delivered_at IS NULL
    )
  );

CREATE INDEX community_project_reports_alert_retry_idx
  ON public.community_project_reports(alert_status, alert_last_attempt_at, created_at)
  WHERE status IN ('open', 'reviewing')
    AND alert_status IN ('pending', 'failed');

ALTER TABLE public.community_project_operations
  DROP CONSTRAINT IF EXISTS community_project_operations_operation_check;
ALTER TABLE public.community_project_operations
  ADD CONSTRAINT community_project_operations_operation_check CHECK (
    operation IN ('reconciliation', 'report_intake', 'invitation_expansion')
  );
INSERT INTO public.community_project_operations (operation)
VALUES ('invitation_expansion')
ON CONFLICT (operation) DO NOTHING;

-- Invited builders are evaluated against current operational state on every
-- eligibility check. A control flag can remain visible for incident review,
-- but stale reconciliation, unverified alert delivery, or a pending report
-- notification blocks new uploads automatically.
CREATE OR REPLACE FUNCTION private.pathforge_actor_can_submit_community_project(actor UUID)
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
      AND (
        (control.allow_admin_submissions AND private.pathforge_actor_is_admin(actor))
        OR EXISTS (
          SELECT 1
          FROM public.community_project_pilot_members AS member
          WHERE member.user_id = actor
            AND member.active
            AND (
              (
                member.member_kind = 'internal_acceptance'
                AND control.allow_internal_acceptance_submissions
                AND member.expires_at > NOW()
              )
              OR (
                member.member_kind = 'invited_builder'
                AND control.allow_invited_submissions
                AND EXISTS (
                  SELECT 1
                  FROM public.community_project_operations AS operation
                  WHERE operation.operation = 'reconciliation'
                    AND operation.last_status = 'succeeded'
                    AND operation.last_success_at > NOW() - INTERVAL '26 hours'
                )
                AND EXISTS (
                  SELECT 1
                  FROM public.community_project_operations AS operation
                  WHERE operation.operation = 'report_intake'
                    AND operation.last_status = 'succeeded'
                    AND operation.last_success_at > NOW() - INTERVAL '26 hours'
                    AND operation.last_metrics->>'operator_alert_delivery' = 'verified'
                )
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.community_project_reports AS report
                  WHERE report.status IN ('open', 'reviewing')
                    AND report.alert_status <> 'delivered'
                )
              )
            )
        )
      )
  );
$$;

-- Replace the HMAC-only readiness receipt. The application and daily
-- reconciliation may record readiness only after a real non-PII webhook probe
-- succeeds. The service-only boundary is the authority; hashes are retained
-- only as non-secret evidence that both configured secrets participated.
DROP FUNCTION IF EXISTS public.record_community_project_report_readiness(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS private.record_community_project_report_readiness(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION private.record_community_project_report_readiness(
  proof_hash TEXT,
  alert_proof_hash TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF proof_hash IS NULL
    OR proof_hash !~ '^[0-9a-f]{64}$'
    OR alert_proof_hash IS NULL
    OR alert_proof_hash !~ '^[0-9a-f]{64}$'
    OR correlation IS NULL THEN
    RAISE EXCEPTION 'Valid report-intake and operator-alert readiness proofs are required.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.community_project_reports AS report
    WHERE report.status IN ('open', 'reviewing')
      AND report.alert_status <> 'delivered'
  ) THEN
    RAISE EXCEPTION 'Report-intake readiness cannot pass while an operator alert is pending.';
  END IF;

  UPDATE public.community_project_operations
  SET last_started_at = NOW(),
      last_success_at = NOW(),
      last_status = 'succeeded',
      last_error = NULL,
      last_metrics = jsonb_build_object(
        'probe', 'report-rate-limit-hmac',
        'proof_prefix', LEFT(proof_hash, 12),
        'operator_alert_delivery', 'verified',
        'alert_proof_prefix', LEFT(alert_proof_hash, 12),
        'undelivered_open_report_alerts', 0,
        'correlation_id', correlation
      ),
      updated_at = NOW()
  WHERE operation = 'report_intake';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The report-intake readiness operation is unavailable.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_community_project_report_readiness(
  proof_hash TEXT,
  alert_proof_hash TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.record_community_project_report_readiness(
    proof_hash, alert_proof_hash, correlation
  );
$$;

-- Store every notification attempt against the report before returning its
-- public receipt. A failed attempt immediately makes report-intake readiness
-- unhealthy; a later successful retry is at-least-once delivery and does not
-- silently erase the need for a new readiness probe.
CREATE OR REPLACE FUNCTION private.record_community_project_report_alert_delivery(
  target_report UUID,
  delivered BOOLEAN,
  failure_code TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  report public.community_project_reports%ROWTYPE;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF target_report IS NULL OR delivered IS NULL OR correlation IS NULL THEN
    RAISE EXCEPTION 'A complete report-alert delivery result is required.';
  END IF;
  IF NOT delivered AND (
    failure_code IS NULL
    OR LENGTH(failure_code) NOT BETWEEN 1 AND 120
    OR failure_code ~ '[[:cntrl:]]'
  ) THEN
    RAISE EXCEPTION 'A safe failure code is required for an undelivered report alert.';
  END IF;

  SELECT candidate.* INTO report
  FROM public.community_project_reports AS candidate
  WHERE candidate.id = target_report
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That community project report does not exist.';
  END IF;
  IF report.alert_status = 'delivered' THEN
    RETURN;
  END IF;

  UPDATE public.community_project_reports
  SET alert_status = CASE WHEN delivered THEN 'delivered' ELSE 'failed' END,
      alert_attempt_count = alert_attempt_count + 1,
      alert_last_attempt_at = NOW(),
      alert_delivered_at = CASE WHEN delivered THEN NOW() ELSE NULL END,
      alert_failure_code = CASE WHEN delivered THEN NULL ELSE failure_code END,
      updated_at = NOW()
  WHERE id = target_report;

  IF NOT delivered THEN
    UPDATE public.community_project_operations
    SET last_started_at = NOW(),
        last_status = 'failed',
        last_error = 'A public report operator alert is pending retry.',
        last_metrics = jsonb_build_object(
          'operator_alert_delivery', 'failed',
          'report_id', target_report,
          'failure_code', failure_code,
          'correlation_id', correlation
        ),
        updated_at = NOW()
    WHERE operation = 'report_intake';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_community_project_report_alert_delivery(
  target_report UUID,
  delivered BOOLEAN,
  failure_code TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.record_community_project_report_alert_delivery(
    target_report, delivered, failure_code, correlation
  );
$$;

-- The private expansion record remains outside source control. PathForge stores
-- only a short non-secret reference and an authoritative snapshot of the
-- database-known gates, so enabling is auditable without copying incident PII.
CREATE OR REPLACE FUNCTION private.record_community_project_invitation_readiness(
  administrator UUID,
  readiness_reference TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_reference TEXT := BTRIM(COALESCE(readiness_reference, ''));
  reconciliation_success TIMESTAMPTZ;
  report_success TIMESTAMPTZ;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    OR NOT private.pathforge_actor_is_admin(administrator) THEN
    RAISE EXCEPTION 'Admin service access required.';
  END IF;
  IF LENGTH(normalized_reference) NOT BETWEEN 8 AND 200
    OR normalized_reference ~ '[[:cntrl:]]'
    OR correlation IS NULL THEN
    RAISE EXCEPTION 'Enter a non-secret private expansion-record reference between 8 and 200 characters.';
  END IF;

  SELECT operation.last_success_at INTO reconciliation_success
  FROM public.community_project_operations AS operation
  WHERE operation.operation = 'reconciliation'
    AND operation.last_status = 'succeeded'
    AND operation.last_success_at > NOW() - INTERVAL '26 hours';
  SELECT operation.last_success_at INTO report_success
  FROM public.community_project_operations AS operation
  WHERE operation.operation = 'report_intake'
    AND operation.last_status = 'succeeded'
    AND operation.last_success_at > NOW() - INTERVAL '26 hours'
    AND operation.last_metrics->>'operator_alert_delivery' = 'verified';

  IF reconciliation_success IS NULL OR report_success IS NULL OR EXISTS (
    SELECT 1
    FROM public.community_project_reports AS report
    WHERE report.status IN ('open', 'reviewing')
      AND report.alert_status <> 'delivered'
  ) THEN
    RAISE EXCEPTION 'External invitations require fresh reconciliation, verified operator-alert delivery, and no pending report alerts.';
  END IF;

  UPDATE public.community_project_operations
  SET last_started_at = NOW(),
      last_success_at = NOW(),
      last_status = 'succeeded',
      last_error = NULL,
      last_metrics = jsonb_build_object(
        'private_record_reference', normalized_reference,
        'confirmed_by', administrator,
        'reconciliation_success_at', reconciliation_success,
        'report_intake_success_at', report_success,
        'correlation_id', correlation
      ),
      updated_at = NOW()
  WHERE operation = 'invitation_expansion';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The invitation-expansion readiness operation is unavailable.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_community_project_invitation_readiness(
  administrator UUID,
  readiness_reference TEXT,
  correlation UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.record_community_project_invitation_readiness(
    administrator, readiness_reference, correlation
  );
$$;

CREATE OR REPLACE FUNCTION private.set_community_project_invitation_control(
  administrator UUID,
  enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    OR NOT private.pathforge_actor_is_admin(administrator) THEN
    RAISE EXCEPTION 'Admin service access required.';
  END IF;
  IF enabled AND NOT (
    EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'reconciliation'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > NOW() - INTERVAL '26 hours'
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'report_intake'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > NOW() - INTERVAL '26 hours'
        AND operation.last_metrics->>'operator_alert_delivery' = 'verified'
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'invitation_expansion'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > NOW() - INTERVAL '15 minutes'
        AND operation.last_metrics->>'confirmed_by' = administrator::TEXT
        AND LENGTH(operation.last_metrics->>'private_record_reference') BETWEEN 8 AND 200
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.community_project_reports AS report
      WHERE report.status IN ('open', 'reviewing')
        AND report.alert_status <> 'delivered'
    )
  ) THEN
    RAISE EXCEPTION 'External invitations require a fresh database-verified expansion record and healthy operational gates.';
  END IF;

  UPDATE public.community_project_pilot_controls
  SET allow_invited_submissions = enabled,
      updated_by = administrator,
      updated_at = NOW()
  WHERE singleton;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community project pilot controls are unavailable.';
  END IF;
END;
$$;

-- Publication control and the row-level publication trigger independently
-- enforce the alert-delivery proof. A stale application cannot publish merely
-- because an older HMAC-only readiness row survived a rollback.
CREATE OR REPLACE FUNCTION private.set_community_project_publication_control(
  administrator UUID,
  enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role'
    OR NOT private.pathforge_actor_is_admin(administrator) THEN
    RAISE EXCEPTION 'Admin service access required.';
  END IF;
  IF enabled AND NOT (
    EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'reconciliation'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > NOW() - INTERVAL '26 hours'
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'report_intake'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > NOW() - INTERVAL '26 hours'
        AND operation.last_metrics->>'operator_alert_delivery' = 'verified'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.community_project_reports AS report
      WHERE report.status IN ('open', 'reviewing')
        AND report.alert_status <> 'delivered'
    )
  ) THEN
    RAISE EXCEPTION 'Publication requires fresh reconciliation, verified operator-alert delivery, and no pending report alerts.';
  END IF;

  UPDATE public.community_project_pilot_controls
  SET allow_publication = enabled,
      updated_by = administrator,
      updated_at = NOW()
  WHERE singleton;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community project pilot controls are unavailable.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.require_current_community_artifact_scan_for_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published'
    AND (
      jsonb_typeof(NEW.artifact_scan) IS DISTINCT FROM 'object'
      OR NEW.artifact_scan->>'passed' IS DISTINCT FROM 'true'
      OR NEW.artifact_scan->>'scanner_version' IS DISTINCT FROM 'html-static-v3'
      OR CASE
        WHEN jsonb_typeof(NEW.artifact_scan->'findings') = 'array'
          THEN jsonb_array_length(NEW.artifact_scan->'findings') <> 0
        ELSE TRUE
      END
      OR NEW.artifact_integrity_status IS DISTINCT FROM 'verified'
    ) THEN
    RAISE EXCEPTION 'Publication requires a verified html-static-v3 artifact scan.';
  END IF;
  IF NEW.status = 'published' AND NOT (
    EXISTS (
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
        AND operation.last_success_at > NOW() - INTERVAL '26 hours'
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'report_intake'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > NOW() - INTERVAL '26 hours'
        AND operation.last_metrics->>'operator_alert_delivery' = 'verified'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.community_project_reports AS report
      WHERE report.status IN ('open', 'reviewing')
        AND report.alert_status <> 'delivered'
    )
  ) THEN
    RAISE EXCEPTION 'Community project publication is paused until fresh reconciliation and verified report-alert readiness pass.';
  END IF;
  RETURN NEW;
END;
$$;

-- Accept the full urgent-safety taxonomy already promised by the public
-- reporting guidance.
CREATE OR REPLACE FUNCTION private.create_community_project_report(
  target_prompt UUID,
  reporter UUID,
  reporter_email_value TEXT,
  report_reason TEXT,
  report_details TEXT,
  request_fingerprint TEXT,
  correlation UUID DEFAULT gen_random_uuid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submission UUID;
  report_id UUID := gen_random_uuid();
  normalized_email TEXT := LOWER(BTRIM(reporter_email_value));
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  SELECT project.id INTO submission
  FROM public.community_project_submissions AS project
  JOIN public.prompts AS prompt ON prompt.id = project.prompt_id
  WHERE project.prompt_id = target_prompt
    AND project.status = 'published'
    AND prompt.status = 'approved';
  IF submission IS NULL THEN
    RAISE EXCEPTION 'That public community project is unavailable.';
  END IF;
  IF normalized_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR LENGTH(normalized_email) > 254
    OR report_reason NOT IN (
      'privacy',
      'copyright',
      'malware',
      'exploitation',
      'credentials',
      'imminent_harm',
      'abuse',
      'misleading',
      'other'
    )
    OR LENGTH(BTRIM(report_details)) NOT BETWEEN 20 AND 4000
    OR COALESCE(request_fingerprint, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Complete every report field within the stated limits.';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('community-project-report-global', 0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(submission::TEXT || '|community-project-report', 0)
  );
  IF (
    SELECT COUNT(*)
    FROM public.community_project_reports AS existing
    WHERE existing.reporter_fingerprint = request_fingerprint
      AND existing.created_at > NOW() - INTERVAL '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'Report limit reached. An administrator already has the recent reports.';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.community_project_reports AS existing
    WHERE existing.submission_id = submission
      AND LOWER(existing.reporter_email) = normalized_email
      AND existing.created_at > NOW() - INTERVAL '24 hours'
  ) >= 3 THEN
    RAISE EXCEPTION 'Report limit reached. An administrator already has the recent reports.';
  END IF;
  IF (
    SELECT COUNT(*)
    FROM public.community_project_reports AS existing
    WHERE existing.submission_id = submission
      AND existing.created_at > NOW() - INTERVAL '24 hours'
  ) >= 25 OR (
    SELECT COUNT(*)
    FROM public.community_project_reports AS existing
    WHERE existing.created_at > NOW() - INTERVAL '24 hours'
  ) >= 250 THEN
    RAISE EXCEPTION 'Report intake is temporarily at capacity. Retry later.';
  END IF;

  INSERT INTO public.community_project_reports (
    id, submission_id, prompt_id, reporter_id, reporter_fingerprint,
    reporter_email, reason, details
  ) VALUES (
    report_id, submission, target_prompt, reporter, request_fingerprint,
    normalized_email, report_reason, BTRIM(report_details)
  );
  INSERT INTO public.community_project_events (
    submission_id, actor_id, actor_kind, event_type, correlation_id, details
  ) VALUES (
    submission,
    NULL,
    'system',
    'reported',
    correlation,
    jsonb_build_object('report_id', report_id, 'reason', report_reason)
  );
  RETURN report_id;
END;
$$;

REVOKE ALL ON FUNCTION private.record_community_project_report_readiness(TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_community_project_report_readiness(TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_community_project_report_alert_delivery(UUID, BOOLEAN, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_community_project_report_alert_delivery(UUID, BOOLEAN, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_community_project_invitation_readiness(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_community_project_invitation_readiness(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.record_community_project_report_readiness(TEXT, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_community_project_report_readiness(TEXT, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.record_community_project_report_alert_delivery(UUID, BOOLEAN, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_community_project_report_alert_delivery(UUID, BOOLEAN, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.record_community_project_invitation_readiness(UUID, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_community_project_invitation_readiness(UUID, TEXT, UUID)
  TO service_role;

REVOKE ALL ON FUNCTION private.pathforge_actor_can_submit_community_project(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_community_project_invitation_control(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_community_project_publication_control(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.require_current_community_artifact_scan_for_publication()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.create_community_project_report(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.pathforge_actor_can_submit_community_project(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.set_community_project_invitation_control(UUID, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.set_community_project_publication_control(UUID, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.require_current_community_artifact_scan_for_publication()
  TO service_role;
GRANT EXECUTE ON FUNCTION private.create_community_project_report(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID)
  TO service_role;
