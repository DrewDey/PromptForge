\set ON_ERROR_STOP on

ALTER TABLE auth.users ADD COLUMN email TEXT;

CREATE TABLE public.community_project_pilot_controls (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE,
  allow_publication BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO public.community_project_pilot_controls (
  singleton, allow_publication
) VALUES (TRUE, FALSE);

CREATE TABLE public.community_project_operations (
  operation TEXT PRIMARY KEY,
  last_status TEXT NOT NULL,
  last_success_at TIMESTAMPTZ,
  last_metrics JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE public.community_project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  alert_status TEXT NOT NULL
);
