-- Keep the service-only ingestion RPC honest even when it is invoked outside
-- the application route. These constraints prevent protocol-relative paths
-- and incomplete event classifications from entering the measurement layer.

ALTER TABLE public.product_events
  ADD CONSTRAINT product_events_safe_path CHECK (
    left(path, 2) <> '//'
    AND position(E'\\' IN path) = 0
  ) NOT VALID,
  ADD CONSTRAINT product_events_discovery_surface CHECK (
    event_name NOT IN ('discovery_viewed', 'discovery_searched')
    OR surface IS NOT NULL
  ) NOT VALID,
  ADD CONSTRAINT product_events_project_identity CHECK (
    event_name NOT IN ('project_opened', 'build_path_reached', 'artifact_opened', 'model_run_compared')
    OR project_id IS NOT NULL
  ) NOT VALID,
  ADD CONSTRAINT product_events_builder_action CHECK (
    event_name NOT IN ('builder_action_started', 'source_run_submitted')
    OR action IN ('fork', 'share')
  ) NOT VALID;

ALTER TABLE public.product_events
  VALIDATE CONSTRAINT product_events_safe_path,
  VALIDATE CONSTRAINT product_events_discovery_surface,
  VALIDATE CONSTRAINT product_events_project_identity,
  VALIDATE CONSTRAINT product_events_builder_action;

NOTIFY pgrst, 'reload schema';
