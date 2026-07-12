-- Public email and user_metadata are not authorization boundaries. Move
-- PathForge-operated profile trust into a private allowlist that future
-- service-created users enter through protected auth app_metadata.

CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.pathforge_profile_operators (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('pathforge_seed', 'pathforge_team')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
REVOKE ALL ON TABLE private.pathforge_profile_operators
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE private.pathforge_profile_operators TO service_role;

-- One-time adoption of the confirmed historical seed fleet. The shape was
-- audited before this migration: all 376 rows match the provisioner's exact
-- username/email convention and none are unconfirmed. Future rows do not use
-- this rule and must carry protected app_metadata.
INSERT INTO private.pathforge_profile_operators (profile_id, kind)
SELECT profiles.id, 'pathforge_seed'
FROM public.profiles AS profiles
JOIN auth.users AS auth_users ON auth_users.id = profiles.id
WHERE auth_users.email_confirmed_at IS NOT NULL
  AND LOWER(COALESCE(auth_users.email, '')) LIKE '%@pathforge-seed.example.com'
  AND SPLIT_PART(LOWER(auth_users.email), '@', 1)
    LIKE LOWER(profiles.username) || '.%'
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO private.pathforge_profile_operators (profile_id, kind)
SELECT id, 'pathforge_team'
FROM public.profiles
WHERE role = 'admin'
ON CONFLICT (profile_id) DO UPDATE SET kind = EXCLUDED.kind;

INSERT INTO public.profile_provenance (profile_id, kind)
SELECT
  profiles.id,
  COALESCE(operators.kind, 'member')
FROM public.profiles
LEFT JOIN private.pathforge_profile_operators AS operators
  ON operators.profile_id = profiles.id
ON CONFLICT (profile_id) DO UPDATE
SET kind = EXCLUDED.kind,
    updated_at = NOW();

CREATE OR REPLACE FUNCTION private.create_profile_provenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  operator_kind TEXT;
  app_metadata JSONB;
BEGIN
  SELECT auth_users.raw_app_meta_data
  INTO app_metadata
  FROM auth.users AS auth_users
  WHERE auth_users.id = NEW.id;

  IF COALESCE(app_metadata->>'pathforge_seed', 'false') = 'true' THEN
    INSERT INTO private.pathforge_profile_operators (profile_id, kind)
    VALUES (NEW.id, 'pathforge_seed')
    ON CONFLICT (profile_id) DO UPDATE SET kind = EXCLUDED.kind;
  END IF;

  SELECT kind
  INTO operator_kind
  FROM private.pathforge_profile_operators
  WHERE profile_id = NEW.id;

  INSERT INTO public.profile_provenance (profile_id, kind)
  VALUES (
    NEW.id,
    CASE
      WHEN operator_kind IS NOT NULL THEN operator_kind
      WHEN NEW.role = 'admin' THEN 'pathforge_team'
      ELSE 'member'
    END
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET kind = EXCLUDED.kind,
      updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.create_profile_provenance()
  FROM PUBLIC, anon, authenticated;

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

NOTIFY pgrst, 'reload schema';
