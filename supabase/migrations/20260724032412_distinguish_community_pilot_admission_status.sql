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

-- Repairs remain private and return to manual review. They may continue for an
-- active admitted account while operational gates are temporarily paused, but
-- revocation, expiry, loss of admission, or a missing actor closes the write.
CREATE OR REPLACE FUNCTION private.pathforge_actor_can_repair_community_project(actor UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.pathforge_community_project_pilot_status(actor)
    IN ('eligible', 'temporarily_paused');
$$;

CREATE OR REPLACE FUNCTION public.replace_community_project_submission(
  target_submission UUID,
  actor UUID,
  payload JSONB,
  correlation UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.pathforge_actor_can_repair_community_project(actor) THEN
    RAISE EXCEPTION 'Current pilot admission is required to repair this community project.';
  END IF;
  RETURN private.replace_community_project_submission(
    target_submission, actor, payload, correlation
  );
END;
$$;

REVOKE ALL ON FUNCTION private.pathforge_community_project_pilot_status(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.pathforge_community_project_pilot_status(UUID)
  TO service_role;

REVOKE ALL ON FUNCTION private.pathforge_actor_can_repair_community_project(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.pathforge_actor_can_repair_community_project(UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.community_project_pilot_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_project_pilot_status()
  TO authenticated;

-- The checked public wrapper is the only service-role repair entrypoint.
REVOKE EXECUTE ON FUNCTION private.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  FROM service_role;
REVOKE ALL ON FUNCTION public.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_community_project_submission(UUID, UUID, JSONB, UUID)
  TO service_role;
