-- Keep durable pilot admission separate from the operational gates that can
-- temporarily pause new submissions. Authorization remains fail-closed in
-- pathforge_actor_can_submit_community_project; this projection only explains
-- the current state to the signed-in account.
CREATE OR REPLACE FUNCTION private.pathforge_community_project_pilot_status(actor UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN actor IS NULL THEN 'signed_out'
    WHEN private.pathforge_actor_can_submit_community_project(actor) THEN 'eligible'
    WHEN private.pathforge_actor_is_admin(actor) THEN 'temporarily_paused'
    WHEN member.user_id IS NULL THEN 'not_admitted'
    WHEN NOT member.active THEN 'revoked'
    WHEN member.member_kind = 'internal_acceptance'
      AND (member.expires_at IS NULL OR member.expires_at <= NOW()) THEN 'expired'
    ELSE 'temporarily_paused'
  END
  FROM (SELECT actor AS user_id) AS requested
  LEFT JOIN public.community_project_pilot_members AS member
    ON member.user_id = requested.user_id;
$$;

CREATE OR REPLACE FUNCTION public.community_project_pilot_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.pathforge_community_project_pilot_status((SELECT auth.uid()));
$$;

REVOKE ALL ON FUNCTION private.pathforge_community_project_pilot_status(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.pathforge_community_project_pilot_status(UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.community_project_pilot_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_project_pilot_status()
  TO authenticated;
