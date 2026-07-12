-- Repair the historical public-signup importer bug that copied the default
-- display name "Jordan Lee" onto otherwise distinct PathForge seed profiles.
--
-- This intentionally does not invent biographies, avatars, activity, or
-- engagement. The replacement display name is derived only from the profile's
-- existing username, and the update is limited to PathForge-operated seed
-- accounts whose email local-part matches that username.

DO $$
DECLARE
  unsafe_candidate_count INTEGER;
  repaired_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unsafe_candidate_count
  FROM public.profiles AS profile
  JOIN auth.users AS auth_user ON auth_user.id = profile.id
  WHERE profile.display_name = 'Jordan Lee'
    AND LOWER(COALESCE(profile.username, '')) <> 'jordanlee'
    AND LOWER(COALESCE(auth_user.email, '')) LIKE '%@pathforge-seed.example.com'
    AND (
      NULLIF(BTRIM(COALESCE(profile.username, '')), '') IS NULL
      OR SPLIT_PART(LOWER(auth_user.email), '@', 1)
        NOT LIKE LOWER(profile.username) || '.%'
      OR NULLIF(
        BTRIM(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              profile.username,
              '([a-z0-9])([A-Z])',
              '\1 \2',
              'g'
            ),
            '([A-Za-z])([0-9]+)',
            '\1 \2',
            'g'
          )
        ),
        ''
      ) IS NULL
    );

  IF unsafe_candidate_count <> 0 THEN
    RAISE EXCEPTION
      'Seed display-name backfill found % candidate(s) without a safe username/email identity match.',
      unsafe_candidate_count;
  END IF;

  UPDATE public.profiles AS profile
  SET display_name = BTRIM(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            profile.username,
            '([a-z0-9])([A-Z])',
            '\1 \2',
            'g'
          ),
          '([A-Za-z])([0-9]+)',
          '\1 \2',
          'g'
        )
      ),
      updated_at = NOW()
  FROM auth.users AS auth_user
  WHERE auth_user.id = profile.id
    AND profile.display_name = 'Jordan Lee'
    AND LOWER(profile.username) <> 'jordanlee'
    AND LOWER(auth_user.email) LIKE '%@pathforge-seed.example.com'
    AND SPLIT_PART(LOWER(auth_user.email), '@', 1)
      LIKE LOWER(profile.username) || '.%';

  GET DIAGNOSTICS repaired_count = ROW_COUNT;
  RAISE NOTICE 'Repaired % PathForge seed profile display name(s).', repaired_count;
END;
$$;
