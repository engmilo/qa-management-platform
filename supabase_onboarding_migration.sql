-- Run this once in the Supabase SQL Editor after deploying the profile/onboarding changes.

-- Backfill profiles for Auth users created before profile synchronization was installed.
INSERT INTO public.profiles (id, email, full_name)
SELECT
  users.id,
  users.email,
  COALESCE(
    NULLIF(BTRIM(COALESCE(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name')), ''),
    NULLIF(SPLIT_PART(users.email, '@', 1), ''),
    'QA User'
  )
FROM auth.users AS users
WHERE users.email IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = CASE
    WHEN NULLIF(BTRIM(public.profiles.full_name), '') IS NULL THEN EXCLUDED.full_name
    ELSE public.profiles.full_name
  END;

-- Keep the application profile in sync with Auth sign-ups and profile/email changes.
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_email text;
  profile_name text;
  auth_name text;
BEGIN
  profile_email := NULLIF(BTRIM(NEW.email), '');
  IF profile_email IS NULL THEN
    RETURN NEW;
  END IF;

  auth_name := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')), '');
  profile_name := COALESCE(auth_name, NULLIF(SPLIT_PART(profile_email, '@', 1), ''), 'QA User');

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, profile_email, profile_name)
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN auth_name IS NOT NULL THEN EXCLUDED.full_name
      WHEN NULLIF(BTRIM(public.profiles.full_name), '') IS NULL THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_from_auth_user ON auth.users;
CREATE TRIGGER sync_profile_from_auth_user
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_from_auth_user();

-- Users can read and edit only their own profile. New profile rows are created by the Auth trigger.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_read_self ON public.profiles;
CREATE POLICY profiles_read_self ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
