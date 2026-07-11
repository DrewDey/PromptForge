-- Profile presentation fields are self-service. Authorization state is not.
-- This policy/grant pair prevents a signed-in user from promoting profiles.role.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE (username, display_name, avatar_url, bio, updated_at)
  ON TABLE public.profiles TO authenticated;
