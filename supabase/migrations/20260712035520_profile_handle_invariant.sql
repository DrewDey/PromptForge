-- Public profile handles are route segments and ownership keys. Enforce the
-- same invariant beneath every signup surface, including direct Auth calls.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format_check,
  ADD CONSTRAINT profiles_username_format_check CHECK (
    username IS NULL OR username ~ '^[A-Za-z0-9_]{3,30}$'
  );

NOTIFY pgrst, 'reload schema';
