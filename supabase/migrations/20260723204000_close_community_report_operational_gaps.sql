-- Close the final community-project moderation gaps before release. Report
-- notifications have a dedicated, leased retry lane; the administrator queue
-- is keyset-paginated with exact counts; and foreign-key maintenance paths
-- have covering indexes before pilot data grows.

ALTER TABLE public.community_project_operations
  DROP CONSTRAINT IF EXISTS community_project_operations_operation_check;
ALTER TABLE public.community_project_operations
  ADD CONSTRAINT community_project_operations_operation_check CHECK (
    operation IN (
      'reconciliation',
      'report_intake',
      'invitation_expansion',
      'report_alerts'
    )
  );
INSERT INTO public.community_project_operations (operation)
VALUES ('report_alerts')
ON CONFLICT (operation) DO NOTHING;

CREATE INDEX IF NOT EXISTS community_project_reports_moderation_queue_idx
  ON public.community_project_reports (
    (
      CASE
        WHEN reason IN (
          'privacy',
          'malware',
          'exploitation',
          'credentials',
          'imminent_harm'
        ) THEN 1
        ELSE 0
      END
    ) DESC,
    created_at,
    id
  )
  WHERE status IN ('open', 'reviewing');

CREATE INDEX IF NOT EXISTS community_project_pilot_members_invited_by_idx
  ON public.community_project_pilot_members(invited_by)
  WHERE invited_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_project_submissions_category_idx
  ON public.community_project_submissions(category_slug);
CREATE INDEX IF NOT EXISTS community_project_submissions_source_checked_by_idx
  ON public.community_project_submissions(source_checked_by)
  WHERE source_checked_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_project_submissions_former_prompt_idx
  ON public.community_project_submissions(former_prompt_id)
  WHERE former_prompt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_project_submissions_reviewed_by_idx
  ON public.community_project_submissions(reviewed_by)
  WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_project_submissions_fork_variant_idx
  ON public.community_project_submissions(fork_source_model_variant_id)
  WHERE fork_source_model_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_project_events_actor_idx
  ON public.community_project_events(actor_id)
  WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_project_reports_prompt_idx
  ON public.community_project_reports(prompt_id)
  WHERE prompt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_project_reports_reporter_idx
  ON public.community_project_reports(reporter_id)
  WHERE reporter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_project_reports_resolved_by_idx
  ON public.community_project_reports(resolved_by)
  WHERE resolved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_project_pilot_controls_updated_by_idx
  ON public.community_project_pilot_controls(updated_by)
  WHERE updated_by IS NOT NULL;

CREATE OR REPLACE FUNCTION private.begin_community_project_report_alert_delivery(
  run_id UUID,
  lease_seconds INT DEFAULT 55
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF run_id IS NULL OR lease_seconds NOT BETWEEN 15 AND 300 THEN
    RAISE EXCEPTION 'Invalid report-alert lease.';
  END IF;

  UPDATE public.community_project_operations
  SET lease_id = run_id,
      lease_expires_at = NOW() + make_interval(secs => lease_seconds),
      last_started_at = NOW(),
      last_status = 'running',
      last_error = NULL,
      updated_at = NOW()
  WHERE operation = 'report_alerts'
    AND (lease_id IS NULL OR lease_expires_at < NOW());
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_community_project_report_alert_delivery(
  run_id UUID,
  lease_seconds INT DEFAULT 55
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.begin_community_project_report_alert_delivery(run_id, lease_seconds);
$$;

CREATE OR REPLACE FUNCTION private.finish_community_project_report_alert_delivery(
  run_id UUID,
  succeeded BOOLEAN,
  error_summary TEXT DEFAULT NULL,
  metrics JSONB DEFAULT '{}'::JSONB
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
  IF jsonb_typeof(metrics) IS DISTINCT FROM 'object'
    OR octet_length(metrics::TEXT) > 20000
    OR LENGTH(COALESCE(error_summary, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid report-alert result.';
  END IF;

  UPDATE public.community_project_operations
  SET lease_id = NULL,
      lease_expires_at = NULL,
      last_success_at = CASE WHEN succeeded THEN NOW() ELSE last_success_at END,
      last_status = CASE WHEN succeeded THEN 'succeeded' ELSE 'failed' END,
      last_error = CASE
        WHEN succeeded THEN NULL
        ELSE NULLIF(BTRIM(COALESCE(error_summary, '')), '')
      END,
      last_metrics = metrics,
      updated_at = NOW()
  WHERE operation = 'report_alerts'
    AND lease_id = run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report-alert lease is missing or expired.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_community_project_report_alert_delivery(
  run_id UUID,
  succeeded BOOLEAN,
  error_summary TEXT DEFAULT NULL,
  metrics JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.finish_community_project_report_alert_delivery(
    run_id,
    succeeded,
    error_summary,
    metrics
  );
$$;

CREATE OR REPLACE FUNCTION private.get_community_project_report_alert_batch(
  batch_size INT DEFAULT 50
)
RETURNS SETOF public.community_project_reports
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF batch_size NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Report-alert batch size must be between 1 and 100.';
  END IF;

  RETURN QUERY
  SELECT report.*
  FROM public.community_project_reports AS report
  WHERE report.status IN ('open', 'reviewing')
    AND report.alert_status IN ('pending', 'failed')
    AND (
      (
        report.alert_last_attempt_at IS NULL
        AND report.created_at <= NOW() - INTERVAL '2 minutes'
      )
      OR report.alert_last_attempt_at <= NOW() - INTERVAL '10 minutes'
    )
  ORDER BY
    CASE
      WHEN report.reason IN (
        'privacy',
        'malware',
        'exploitation',
        'credentials',
        'imminent_harm'
      ) THEN 1
      ELSE 0
    END DESC,
    COALESCE(report.alert_last_attempt_at, report.created_at),
    report.created_at,
    report.id
  LIMIT batch_size;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_community_project_report_alert_batch(
  batch_size INT DEFAULT 50
)
RETURNS SETOF public.community_project_reports
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT *
  FROM private.get_community_project_report_alert_batch(batch_size);
$$;

CREATE OR REPLACE FUNCTION private.get_community_project_report_queue(
  page_size INT DEFAULT 26,
  cursor_priority INT DEFAULT NULL,
  cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  cursor_id UUID DEFAULT NULL,
  reason_filter TEXT DEFAULT NULL,
  alert_filter TEXT DEFAULT NULL,
  query_text TEXT DEFAULT NULL
)
RETURNS SETOF public.community_project_reports
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_query TEXT := NULLIF(BTRIM(COALESCE(query_text, '')), '');
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF page_size NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Moderation page size must be between 1 and 100.';
  END IF;
  IF (cursor_priority IS NULL OR cursor_created_at IS NULL OR cursor_id IS NULL)
    AND NOT (cursor_priority IS NULL AND cursor_created_at IS NULL AND cursor_id IS NULL) THEN
    RAISE EXCEPTION 'A complete moderation cursor is required.';
  END IF;
  IF cursor_priority IS NOT NULL AND cursor_priority NOT IN (0, 1) THEN
    RAISE EXCEPTION 'The moderation cursor is invalid.';
  END IF;
  IF reason_filter IS NOT NULL AND reason_filter NOT IN (
    'privacy',
    'copyright',
    'malware',
    'exploitation',
    'credentials',
    'imminent_harm',
    'abuse',
    'misleading',
    'other'
  ) THEN
    RAISE EXCEPTION 'The report-reason filter is invalid.';
  END IF;
  IF alert_filter IS NOT NULL AND alert_filter NOT IN ('pending', 'delivered', 'failed') THEN
    RAISE EXCEPTION 'The report-alert filter is invalid.';
  END IF;
  IF normalized_query IS NOT NULL AND (
    LENGTH(normalized_query) > 120
    OR normalized_query ~ '[[:cntrl:]]'
  ) THEN
    RAISE EXCEPTION 'The moderation search is invalid.';
  END IF;

  RETURN QUERY
  SELECT report.*
  FROM public.community_project_reports AS report
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN report.reason IN (
        'privacy',
        'malware',
        'exploitation',
        'credentials',
        'imminent_harm'
      ) THEN 1
      ELSE 0
    END AS priority
  ) AS rank
  WHERE report.status IN ('open', 'reviewing')
    AND (reason_filter IS NULL OR report.reason = reason_filter)
    AND (alert_filter IS NULL OR report.alert_status = alert_filter)
    AND (
      normalized_query IS NULL
      OR LOWER(report.id::TEXT) = LOWER(normalized_query)
      OR LOWER(report.submission_id::TEXT) = LOWER(normalized_query)
      OR LOWER(COALESCE(report.prompt_id::TEXT, '')) = LOWER(normalized_query)
      OR STRPOS(LOWER(report.reporter_email), LOWER(normalized_query)) > 0
      OR STRPOS(LOWER(report.details), LOWER(normalized_query)) > 0
    )
    AND (
      cursor_priority IS NULL
      OR rank.priority < cursor_priority
      OR (
        rank.priority = cursor_priority
        AND report.created_at > cursor_created_at
      )
      OR (
        rank.priority = cursor_priority
        AND report.created_at = cursor_created_at
        AND report.id > cursor_id
      )
    )
  ORDER BY rank.priority DESC, report.created_at, report.id
  LIMIT page_size;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_community_project_report_queue(
  page_size INT DEFAULT 26,
  cursor_priority INT DEFAULT NULL,
  cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  cursor_id UUID DEFAULT NULL,
  reason_filter TEXT DEFAULT NULL,
  alert_filter TEXT DEFAULT NULL,
  query_text TEXT DEFAULT NULL
)
RETURNS SETOF public.community_project_reports
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT *
  FROM private.get_community_project_report_queue(
    page_size,
    cursor_priority,
    cursor_created_at,
    cursor_id,
    reason_filter,
    alert_filter,
    query_text
  );
$$;

CREATE OR REPLACE FUNCTION private.get_community_project_report_queue_counts(
  reason_filter TEXT DEFAULT NULL,
  alert_filter TEXT DEFAULT NULL,
  query_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_query TEXT := NULLIF(BTRIM(COALESCE(query_text, '')), '');
  result JSONB;
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required.';
  END IF;
  IF reason_filter IS NOT NULL AND reason_filter NOT IN (
    'privacy',
    'copyright',
    'malware',
    'exploitation',
    'credentials',
    'imminent_harm',
    'abuse',
    'misleading',
    'other'
  ) THEN
    RAISE EXCEPTION 'The report-reason filter is invalid.';
  END IF;
  IF alert_filter IS NOT NULL AND alert_filter NOT IN ('pending', 'delivered', 'failed') THEN
    RAISE EXCEPTION 'The report-alert filter is invalid.';
  END IF;
  IF normalized_query IS NOT NULL AND (
    LENGTH(normalized_query) > 120
    OR normalized_query ~ '[[:cntrl:]]'
  ) THEN
    RAISE EXCEPTION 'The moderation search is invalid.';
  END IF;

  SELECT jsonb_build_object(
    'totalCount',
      COUNT(*),
    'undeliveredCount',
      COUNT(*) FILTER (WHERE report.alert_status <> 'delivered'),
    'criticalCount',
      COUNT(*) FILTER (
        WHERE report.reason IN (
          'privacy',
          'malware',
          'exploitation',
          'credentials',
          'imminent_harm'
        )
      ),
    'oldestOpenAt',
      MIN(report.created_at),
    'oldestCriticalAt',
      MIN(report.created_at) FILTER (
        WHERE report.reason IN (
          'privacy',
          'malware',
          'exploitation',
          'credentials',
          'imminent_harm'
        )
      ),
    'oldestUndeliveredAt',
      MIN(report.created_at) FILTER (WHERE report.alert_status <> 'delivered'),
    'filteredCount',
      COUNT(*) FILTER (
        WHERE (reason_filter IS NULL OR report.reason = reason_filter)
          AND (alert_filter IS NULL OR report.alert_status = alert_filter)
          AND (
            normalized_query IS NULL
            OR LOWER(report.id::TEXT) = LOWER(normalized_query)
            OR LOWER(report.submission_id::TEXT) = LOWER(normalized_query)
            OR LOWER(COALESCE(report.prompt_id::TEXT, '')) = LOWER(normalized_query)
            OR STRPOS(LOWER(report.reporter_email), LOWER(normalized_query)) > 0
            OR STRPOS(LOWER(report.details), LOWER(normalized_query)) > 0
          )
      )
  )
  INTO result
  FROM public.community_project_reports AS report
  WHERE report.status IN ('open', 'reviewing');

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_community_project_report_queue_counts(
  reason_filter TEXT DEFAULT NULL,
  alert_filter TEXT DEFAULT NULL,
  query_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.get_community_project_report_queue_counts(
    reason_filter,
    alert_filter,
    query_text
  );
$$;

-- A successful alert-recovery heartbeat less than one hour old is now part of
-- every invited-upload and publication decision. If the independent scheduler
-- stops, the pilot closes automatically before another external upload or
-- publication can occur.
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
                AND EXISTS (
                  SELECT 1
                  FROM public.community_project_operations AS operation
                  WHERE operation.operation = 'report_alerts'
                    AND operation.last_status = 'succeeded'
                    AND operation.last_success_at > NOW() - INTERVAL '1 hour'
                    AND operation.last_metrics->>'independentAlertChannels' = '2'
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
  alert_recovery_success TIMESTAMPTZ;
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
  SELECT operation.last_success_at INTO alert_recovery_success
  FROM public.community_project_operations AS operation
  WHERE operation.operation = 'report_alerts'
    AND operation.last_status = 'succeeded'
    AND operation.last_success_at > NOW() - INTERVAL '1 hour'
    AND operation.last_metrics->>'independentAlertChannels' = '2';

  IF reconciliation_success IS NULL
    OR report_success IS NULL
    OR alert_recovery_success IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.community_project_reports AS report
      WHERE report.status IN ('open', 'reviewing')
        AND report.alert_status <> 'delivered'
    ) THEN
    RAISE EXCEPTION 'External invitations require fresh reconciliation, dual-channel alert recovery, verified operator-alert delivery, and no pending report alerts.';
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
        'report_alert_recovery_success_at', alert_recovery_success,
        'correlation_id', correlation
      ),
      updated_at = NOW()
  WHERE operation = 'invitation_expansion';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The invitation-expansion readiness operation is unavailable.';
  END IF;
END;
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
      WHERE operation.operation = 'report_alerts'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > NOW() - INTERVAL '1 hour'
        AND operation.last_metrics->>'independentAlertChannels' = '2'
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
    RAISE EXCEPTION 'External invitations require a fresh database-verified expansion record and healthy dual-channel operational gates.';
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
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'report_alerts'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > NOW() - INTERVAL '1 hour'
        AND operation.last_metrics->>'independentAlertChannels' = '2'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.community_project_reports AS report
      WHERE report.status IN ('open', 'reviewing')
        AND report.alert_status <> 'delivered'
    )
  ) THEN
    RAISE EXCEPTION 'Publication requires fresh reconciliation, dual-channel alert recovery, verified operator-alert delivery, and no pending report alerts.';
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
    AND EXISTS (
      SELECT 1
      FROM public.community_project_operations AS operation
      WHERE operation.operation = 'report_alerts'
        AND operation.last_status = 'succeeded'
        AND operation.last_success_at > NOW() - INTERVAL '1 hour'
        AND operation.last_metrics->>'independentAlertChannels' = '2'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.community_project_reports AS report
      WHERE report.status IN ('open', 'reviewing')
        AND report.alert_status <> 'delivered'
    )
  ) THEN
    RAISE EXCEPTION 'Community project publication is paused until fresh reconciliation, dual-channel alert recovery, and verified report-alert readiness pass.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.begin_community_project_report_alert_delivery(UUID, INT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.begin_community_project_report_alert_delivery(UUID, INT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.finish_community_project_report_alert_delivery(UUID, BOOLEAN, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_community_project_report_alert_delivery(UUID, BOOLEAN, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.get_community_project_report_alert_batch(INT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_community_project_report_alert_batch(INT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.get_community_project_report_queue(INT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_community_project_report_queue(INT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.get_community_project_report_queue_counts(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_community_project_report_queue_counts(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.begin_community_project_report_alert_delivery(UUID, INT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_community_project_report_alert_delivery(UUID, INT)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.finish_community_project_report_alert_delivery(UUID, BOOLEAN, TEXT, JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_community_project_report_alert_delivery(UUID, BOOLEAN, TEXT, JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.get_community_project_report_alert_batch(INT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_community_project_report_alert_batch(INT)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.get_community_project_report_queue(INT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_community_project_report_queue(INT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.get_community_project_report_queue_counts(TEXT, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_community_project_report_queue_counts(TEXT, TEXT, TEXT)
  TO service_role;
