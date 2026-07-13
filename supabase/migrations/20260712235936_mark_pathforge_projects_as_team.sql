-- The existing PathForge Projects house account predates protected profile
-- provenance. Establish the protected operator record first, then mirror that
-- truth to its public presentation row. Both statements are idempotent and
-- guard the exact known account; ordinary member and seed profiles are untouched.
INSERT INTO private.pathforge_profile_operators (profile_id, kind)
SELECT profile.id, 'pathforge_team'
FROM public.profiles AS profile
WHERE profile.username = 'pathforge_projects'
  AND profile.display_name = 'PathForge Projects'
  AND profile.role = 'user'
ON CONFLICT (profile_id) DO UPDATE
SET kind = EXCLUDED.kind;

INSERT INTO public.profile_provenance (profile_id, kind)
SELECT operator.profile_id, operator.kind
FROM private.pathforge_profile_operators AS operator
JOIN public.profiles AS profile ON profile.id = operator.profile_id
WHERE operator.kind = 'pathforge_team'
  AND profile.username = 'pathforge_projects'
  AND profile.display_name = 'PathForge Projects'
  AND profile.role = 'user'
ON CONFLICT (profile_id) DO UPDATE
SET kind = EXCLUDED.kind,
    updated_at = NOW();
