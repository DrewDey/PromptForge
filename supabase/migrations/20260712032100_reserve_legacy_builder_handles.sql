-- Code-owned legacy prepared projects still need stable public builder routes
-- while exact source evidence blocks canonical prompt publication. Reserve
-- those handles for future PathForge seed accounts so a member cannot claim
-- the visible ownership of an existing prepared project.

CREATE OR REPLACE FUNCTION private.enforce_pathforge_reserved_profile_handles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  app_metadata JSONB;
  is_operator BOOLEAN;
BEGIN
  IF LOWER(COALESCE(NEW.username, '')) NOT IN ('jordanwells', 'rowanpierce') THEN
    RETURN NEW;
  END IF;

  SELECT raw_app_meta_data
  INTO app_metadata
  FROM auth.users
  WHERE id = NEW.id;

  SELECT EXISTS (
    SELECT 1
    FROM private.pathforge_profile_operators
    WHERE profile_id = NEW.id
      AND kind = 'pathforge_seed'
  ) INTO is_operator;

  IF NOT (
    COALESCE(app_metadata->>'pathforge_seed', 'false') = 'true'
    OR is_operator
  ) THEN
    RAISE EXCEPTION 'This profile handle is reserved for a PathForge-operated legacy builder profile.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_pathforge_reserved_profile_handles()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_pathforge_reserved_profile_handles
  ON public.profiles;
CREATE TRIGGER enforce_pathforge_reserved_profile_handles
  BEFORE INSERT OR UPDATE OF username
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.enforce_pathforge_reserved_profile_handles();
