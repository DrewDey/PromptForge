\set ON_ERROR_STOP on

-- Supabase owns auth.users in production. The disposable fixture only needs
-- the columns read by the narrow prepared seed-profile binding function.
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email_confirmed_at TIMESTAMPTZ,
  raw_app_meta_data JSONB NOT NULL DEFAULT '{}'::JSONB
);

-- Earlier production migrations already own this private allowlist. Recreate
-- its relevant shape in the isolated migration harness.
CREATE TABLE private.pathforge_profile_operators (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL
);

REVOKE ALL ON TABLE auth.users, private.pathforge_profile_operators
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE auth.users, private.pathforge_profile_operators
  TO service_role;
