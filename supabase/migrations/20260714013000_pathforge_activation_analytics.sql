-- Measure PathForge's launch activation loop without storing prompt text,
-- artifact contents, search queries, IP addresses, user agents, or referrers.
-- The exposed table is service-only; browser traffic reaches the checked RPC
-- through the same-origin application endpoint.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE public.product_events (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('anonymous', 'member', 'seed', 'team', 'admin')),
  event_name TEXT NOT NULL CHECK (event_name IN (
    'discovery_viewed',
    'discovery_searched',
    'project_opened',
    'build_path_reached',
    'artifact_opened',
    'model_run_compared',
    'builder_action_started',
    'account_created',
    'source_run_submitted',
    'my_forge_returned'
  )),
  environment TEXT NOT NULL CHECK (environment IN ('production', 'preview', 'development')),
  path TEXT NOT NULL CHECK (
    char_length(path) BETWEEN 1 AND 240
    AND left(path, 1) = '/'
    AND position('?' IN path) = 0
    AND position('#' IN path) = 0
    AND path !~ '[[:cntrl:]]'
  ),
  surface TEXT CHECK (surface IS NULL OR surface IN (
    'home', 'explore', 'ideas', 'requests', 'guide', 'project', 'build', 'signup', 'my_forge'
  )),
  action TEXT CHECK (action IS NULL OR action IN (
    'search', 'fork', 'share', 'email', 'artifact', 'model_compare'
  )),
  project_id TEXT CHECK (
    project_id IS NULL OR (
      char_length(project_id) BETWEEN 1 AND 200
      AND project_id !~ '[[:cntrl:]]'
    )
  ),
  project_title TEXT CHECK (
    project_title IS NULL OR (
      char_length(project_title) BETWEEN 1 AND 180
      AND project_title !~ '[[:cntrl:]]'
    )
  ),
  source_run_id TEXT CHECK (
    source_run_id IS NULL OR (
      char_length(source_run_id) BETWEEN 1 AND 200
      AND source_run_id !~ '[[:cntrl:]]'
    )
  ),
  metric_value INTEGER CHECK (metric_value IS NULL OR metric_value BETWEEN 0 AND 10000),
  schema_version SMALLINT NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE public.product_events IS
  'Privacy-conscious, append-only product events for PathForge launch activation. Service-only; no prompt/search/referrer/IP/user-agent content.';
COMMENT ON COLUMN public.product_events.session_id IS
  'Short-lived, signed first-party session identifier. It is not shared with the browser as a readable value.';
COMMENT ON COLUMN public.product_events.actor_type IS
  'Separates real anonymous/member behavior from seed, team, and admin traffic.';

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.product_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.product_events TO service_role;

CREATE POLICY "Service role reads activation events"
  ON public.product_events FOR SELECT TO service_role
  USING (true);

CREATE INDEX product_events_occurred_at_idx
  ON public.product_events (occurred_at DESC);
CREATE INDEX product_events_event_time_idx
  ON public.product_events (event_name, occurred_at DESC);
CREATE INDEX product_events_session_time_idx
  ON public.product_events (session_id, occurred_at);
CREATE INDEX product_events_user_time_idx
  ON public.product_events (user_id, occurred_at)
  WHERE user_id IS NOT NULL;
CREATE INDEX product_events_project_time_idx
  ON public.product_events (project_id, occurred_at DESC)
  WHERE project_id IS NOT NULL;

CREATE TABLE private.product_event_rate_windows (
  session_id UUID PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0)
);

CREATE INDEX product_event_rate_windows_started_idx
  ON private.product_event_rate_windows (window_started_at);

CREATE TABLE private.product_analytics_maintenance (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  last_cleanup_at TIMESTAMPTZ NOT NULL DEFAULT '-infinity'::TIMESTAMPTZ
);

INSERT INTO private.product_analytics_maintenance (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

REVOKE ALL ON TABLE
  private.product_event_rate_windows,
  private.product_analytics_maintenance
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pathforge_record_product_event(
  p_event_id UUID,
  p_session_id UUID,
  p_user_id UUID,
  p_actor_type TEXT,
  p_event_name TEXT,
  p_environment TEXT,
  p_path TEXT,
  p_surface TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL,
  p_project_title TEXT DEFAULT NULL,
  p_source_run_id TEXT DEFAULT NULL,
  p_metric_value INTEGER DEFAULT NULL,
  p_schema_version SMALLINT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  now_at TIMESTAMPTZ := clock_timestamp();
  current_count INTEGER;
  inserted_count INTEGER;
  should_clean BOOLEAN := FALSE;
BEGIN
  INSERT INTO private.product_event_rate_windows AS limits (
    session_id,
    window_started_at,
    request_count
  ) VALUES (
    p_session_id,
    now_at,
    1
  )
  ON CONFLICT (session_id) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at <= now_at - INTERVAL '10 minutes' THEN now_at
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at <= now_at - INTERVAL '10 minutes' THEN 1
      ELSE limits.request_count + 1
    END
  RETURNING request_count INTO current_count;

  IF current_count > 90 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Product event rate limit exceeded.';
  END IF;

  INSERT INTO public.product_events (
    id,
    session_id,
    user_id,
    actor_type,
    event_name,
    environment,
    path,
    surface,
    action,
    project_id,
    project_title,
    source_run_id,
    metric_value,
    schema_version,
    occurred_at
  ) VALUES (
    p_event_id,
    p_session_id,
    p_user_id,
    p_actor_type,
    p_event_name,
    p_environment,
    p_path,
    p_surface,
    p_action,
    p_project_id,
    p_project_title,
    p_source_run_id,
    p_metric_value,
    p_schema_version,
    now_at
  )
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  UPDATE private.product_analytics_maintenance
  SET last_cleanup_at = now_at
  WHERE singleton = TRUE
    AND last_cleanup_at <= now_at - INTERVAL '1 day'
  RETURNING TRUE INTO should_clean;

  IF COALESCE(should_clean, FALSE) THEN
    DELETE FROM private.product_event_rate_windows
    WHERE window_started_at < now_at - INTERVAL '1 day';

    DELETE FROM public.product_events
    WHERE occurred_at < now_at - INTERVAL '400 days';
  END IF;

  RETURN inserted_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.pathforge_record_product_event(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, SMALLINT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pathforge_record_product_event(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, SMALLINT
) TO service_role;

CREATE OR REPLACE FUNCTION public.pathforge_activation_dashboard(
  p_days INTEGER DEFAULT 30,
  p_environment TEXT DEFAULT 'production'
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
WITH bounds AS (
  SELECT
    LEAST(180, GREATEST(1, COALESCE(p_days, 30))) AS days,
    CASE
      WHEN p_environment IN ('production', 'preview', 'development') THEN p_environment
      ELSE 'production'
    END AS environment,
    (
      date_trunc('day', now() AT TIME ZONE 'UTC')
      - (LEAST(180, GREATEST(1, COALESCE(p_days, 30))) - 1) * INTERVAL '1 day'
    ) AT TIME ZONE 'UTC' AS started_at,
    now() AS ended_at
),
all_events AS (
  SELECT events.*
  FROM public.product_events AS events
  CROSS JOIN bounds
  WHERE events.occurred_at >= bounds.started_at
    AND events.occurred_at <= bounds.ended_at
    AND events.environment = bounds.environment
),
external_events AS (
  SELECT *
  FROM all_events
  WHERE actor_type IN ('anonymous', 'member')
),
project_entries AS (
  SELECT DISTINCT ON (session_id)
    session_id,
    occurred_at AS project_at,
    project_id,
    project_title,
    path
  FROM external_events
  WHERE event_name = 'project_opened'
  ORDER BY session_id, occurred_at, id
),
session_stages AS (
  SELECT
    entry.*,
    evidence.evidence_at,
    action_stage.action_at,
    completion.completed_at,
    COALESCE(discovery.surface, 'direct') AS entry_surface
  FROM project_entries AS entry
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS evidence_at
    FROM external_events AS event
    WHERE event.session_id = entry.session_id
      AND event.event_name = 'build_path_reached'
      AND event.occurred_at >= entry.project_at
  ) AS evidence ON TRUE
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS action_at
    FROM external_events AS event
    WHERE event.session_id = entry.session_id
      AND event.event_name = 'builder_action_started'
      AND evidence.evidence_at IS NOT NULL
      AND event.occurred_at >= evidence.evidence_at
  ) AS action_stage ON TRUE
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS completed_at
    FROM external_events AS event
    WHERE event.session_id = entry.session_id
      AND event.event_name = 'source_run_submitted'
      AND action_stage.action_at IS NOT NULL
      AND event.occurred_at >= action_stage.action_at
  ) AS completion ON TRUE
  LEFT JOIN LATERAL (
    SELECT event.surface
    FROM external_events AS event
    WHERE event.session_id = entry.session_id
      AND event.event_name = 'discovery_viewed'
      AND event.occurred_at <= entry.project_at
    ORDER BY event.occurred_at DESC, event.id DESC
    LIMIT 1
  ) AS discovery ON TRUE
),
session_totals AS (
  SELECT
    count(*)::INTEGER AS project_sessions,
    count(*) FILTER (WHERE evidence_at IS NOT NULL)::INTEGER AS evidence_sessions,
    count(*) FILTER (WHERE action_at IS NOT NULL)::INTEGER AS activated_sessions,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::INTEGER AS completed_sessions
  FROM session_stages
),
member_actions AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    session_id,
    occurred_at AS action_at
  FROM external_events
  WHERE actor_type = 'member'
    AND user_id IS NOT NULL
    AND event_name IN ('builder_action_started', 'source_run_submitted')
  ORDER BY user_id, occurred_at, id
),
member_returns AS (
  SELECT action.user_id
  FROM member_actions AS action
  WHERE EXISTS (
    SELECT 1
    FROM external_events AS event
    WHERE event.actor_type = 'member'
      AND event.user_id = action.user_id
      AND event.event_name = 'my_forge_returned'
      AND event.session_id <> action.session_id
      AND event.occurred_at > action.action_at
  )
),
project_visits AS (
  SELECT DISTINCT ON (session_id, COALESCE(project_id, path))
    session_id,
    COALESCE(project_id, path) AS project_key,
    project_id,
    project_title,
    path,
    occurred_at AS project_at
  FROM external_events
  WHERE event_name = 'project_opened'
  ORDER BY session_id, COALESCE(project_id, path), occurred_at, id
),
project_visit_stages AS (
  SELECT
    visit.*,
    evidence.evidence_at,
    action_stage.action_at,
    completion.completed_at
  FROM project_visits AS visit
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS evidence_at
    FROM external_events AS event
    WHERE event.session_id = visit.session_id
      AND event.event_name = 'build_path_reached'
      AND COALESCE(event.project_id, event.path) = visit.project_key
      AND event.occurred_at >= visit.project_at
  ) AS evidence ON TRUE
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS action_at
    FROM external_events AS event
    WHERE event.session_id = visit.session_id
      AND event.event_name = 'builder_action_started'
      AND COALESCE(event.project_id, event.path) = visit.project_key
      AND evidence.evidence_at IS NOT NULL
      AND event.occurred_at >= evidence.evidence_at
  ) AS action_stage ON TRUE
  LEFT JOIN LATERAL (
    SELECT min(event.occurred_at) AS completed_at
    FROM external_events AS event
    WHERE event.session_id = visit.session_id
      AND event.event_name = 'source_run_submitted'
      AND (
        event.project_id IS NULL
        OR COALESCE(event.project_id, event.path) = visit.project_key
      )
      AND action_stage.action_at IS NOT NULL
      AND event.occurred_at >= action_stage.action_at
  ) AS completion ON TRUE
),
project_rollup AS (
  SELECT
    project_key,
    max(project_id) AS project_id,
    max(project_title) AS project_title,
    max(path) AS path,
    count(*)::INTEGER AS opens,
    count(*) FILTER (WHERE evidence_at IS NOT NULL)::INTEGER AS evidence,
    count(*) FILTER (WHERE action_at IS NOT NULL)::INTEGER AS activated,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::INTEGER AS completed
  FROM project_visit_stages
  GROUP BY project_key
),
top_projects AS (
  SELECT *
  FROM project_rollup
  ORDER BY activated DESC, evidence DESC, opens DESC, project_key
  LIMIT 8
),
surface_rollup AS (
  SELECT
    entry_surface AS surface,
    count(*)::INTEGER AS project_sessions,
    count(*) FILTER (WHERE evidence_at IS NOT NULL)::INTEGER AS evidence_sessions,
    count(*) FILTER (WHERE action_at IS NOT NULL)::INTEGER AS activated_sessions
  FROM session_stages
  GROUP BY entry_surface
  ORDER BY activated_sessions DESC, project_sessions DESC, entry_surface
),
calendar_days AS (
  SELECT generate_series(
    bounds.started_at::DATE,
    bounds.ended_at::DATE,
    INTERVAL '1 day'
  )::DATE AS day
  FROM bounds
),
daily_rollup AS (
  SELECT
    (project_at AT TIME ZONE 'UTC')::DATE AS day,
    count(*)::INTEGER AS project_sessions,
    count(*) FILTER (WHERE evidence_at IS NOT NULL)::INTEGER AS evidence_sessions,
    count(*) FILTER (WHERE action_at IS NOT NULL)::INTEGER AS activated_sessions,
    count(*) FILTER (WHERE completed_at IS NOT NULL)::INTEGER AS completed_sessions
  FROM session_stages
  GROUP BY (project_at AT TIME ZONE 'UTC')::DATE
),
daily AS (
  SELECT
    calendar.day,
    COALESCE(rollup.project_sessions, 0)::INTEGER AS project_sessions,
    COALESCE(rollup.evidence_sessions, 0)::INTEGER AS evidence_sessions,
    COALESCE(rollup.activated_sessions, 0)::INTEGER AS activated_sessions,
    COALESCE(rollup.completed_sessions, 0)::INTEGER AS completed_sessions
  FROM calendar_days AS calendar
  LEFT JOIN daily_rollup AS rollup USING (day)
  ORDER BY calendar.day
),
health AS (
  SELECT
    count(*)::INTEGER AS total_events,
    count(*) FILTER (WHERE actor_type IN ('anonymous', 'member'))::INTEGER AS external_events,
    count(*) FILTER (WHERE actor_type IN ('seed', 'team', 'admin'))::INTEGER AS internal_events,
    count(DISTINCT session_id) FILTER (WHERE actor_type IN ('anonymous', 'member'))::INTEGER AS external_sessions,
    max(occurred_at) AS last_event_at
  FROM all_events
),
supporting AS (
  SELECT
    count(DISTINCT session_id) FILTER (WHERE event_name = 'discovery_viewed')::INTEGER AS discovery_sessions,
    count(DISTINCT session_id) FILTER (WHERE event_name = 'discovery_searched')::INTEGER AS search_sessions,
    count(DISTINCT session_id) FILTER (WHERE event_name = 'artifact_opened')::INTEGER AS artifact_sessions,
    count(DISTINCT session_id) FILTER (WHERE event_name = 'model_run_compared')::INTEGER AS comparison_sessions,
    count(DISTINCT session_id) FILTER (WHERE event_name = 'account_created')::INTEGER AS account_sessions
  FROM external_events
)
SELECT jsonb_build_object(
  'window', jsonb_build_object(
    'days', bounds.days,
    'environment', bounds.environment,
    'started_at', bounds.started_at,
    'ended_at', bounds.ended_at
  ),
  'summary', jsonb_build_object(
    'project_sessions', totals.project_sessions,
    'evidence_sessions', totals.evidence_sessions,
    'activated_sessions', totals.activated_sessions,
    'completed_sessions', totals.completed_sessions,
    'activation_rate', COALESCE(round(totals.activated_sessions * 100.0 / NULLIF(totals.project_sessions, 0), 1), 0),
    'evidence_rate', COALESCE(round(totals.evidence_sessions * 100.0 / NULLIF(totals.project_sessions, 0), 1), 0),
    'completion_rate', COALESCE(round(totals.completed_sessions * 100.0 / NULLIF(totals.activated_sessions, 0), 1), 0),
    'member_builders', (SELECT count(*)::INTEGER FROM member_actions),
    'returning_builders', (SELECT count(*)::INTEGER FROM member_returns),
    'return_rate', COALESCE(round(
      (SELECT count(*) FROM member_returns) * 100.0 / NULLIF((SELECT count(*) FROM member_actions), 0),
      1
    ), 0),
    'account_sessions', supporting.account_sessions
  ),
  'funnel', jsonb_build_array(
    jsonb_build_object('key', 'project_opened', 'label', 'Opened a project', 'sessions', totals.project_sessions, 'rate_from_previous', 100),
    jsonb_build_object('key', 'build_path_reached', 'label', 'Reached build evidence', 'sessions', totals.evidence_sessions, 'rate_from_previous', COALESCE(round(totals.evidence_sessions * 100.0 / NULLIF(totals.project_sessions, 0), 1), 0)),
    jsonb_build_object('key', 'builder_action_started', 'label', 'Started a fork or share', 'sessions', totals.activated_sessions, 'rate_from_previous', COALESCE(round(totals.activated_sessions * 100.0 / NULLIF(totals.evidence_sessions, 0), 1), 0)),
    jsonb_build_object('key', 'source_run_submitted', 'label', 'Submitted a source run', 'sessions', totals.completed_sessions, 'rate_from_previous', COALESCE(round(totals.completed_sessions * 100.0 / NULLIF(totals.activated_sessions, 0), 1), 0))
  ),
  'supporting', jsonb_build_object(
    'discovery_sessions', supporting.discovery_sessions,
    'search_sessions', supporting.search_sessions,
    'artifact_sessions', supporting.artifact_sessions,
    'comparison_sessions', supporting.comparison_sessions
  ),
  'daily', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'date', day,
      'project_sessions', project_sessions,
      'evidence_sessions', evidence_sessions,
      'activated_sessions', activated_sessions,
      'completed_sessions', completed_sessions
    ) ORDER BY day)
    FROM daily
  ), '[]'::JSONB),
  'projects', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'project_id', project_id,
      'project_title', COALESCE(project_title, project_id, path),
      'path', path,
      'opens', opens,
      'evidence', evidence,
      'activated', activated,
      'completed', completed,
      'activation_rate', COALESCE(round(activated * 100.0 / NULLIF(opens, 0), 1), 0)
    ) ORDER BY activated DESC, evidence DESC, opens DESC)
    FROM top_projects
  ), '[]'::JSONB),
  'surfaces', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'surface', surface,
      'project_sessions', project_sessions,
      'evidence_sessions', evidence_sessions,
      'activated_sessions', activated_sessions,
      'activation_rate', COALESCE(round(activated_sessions * 100.0 / NULLIF(project_sessions, 0), 1), 0)
    ) ORDER BY activated_sessions DESC, project_sessions DESC)
    FROM surface_rollup
  ), '[]'::JSONB),
  'health', jsonb_build_object(
    'total_events', health.total_events,
    'external_events', health.external_events,
    'internal_events', health.internal_events,
    'external_sessions', health.external_sessions,
    'last_event_at', health.last_event_at
  )
)
FROM bounds
CROSS JOIN session_totals AS totals
CROSS JOIN supporting
CROSS JOIN health;
$$;

REVOKE ALL ON FUNCTION public.pathforge_activation_dashboard(INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pathforge_activation_dashboard(INTEGER, TEXT)
  TO service_role;

NOTIFY pgrst, 'reload schema';
