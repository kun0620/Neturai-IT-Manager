/*
  # Drop Supabase Profiles Trigger and Function

  1. Security
    - Drop the `handle_new_user` function if it exists.
    - Drop the `on_auth_user_created` trigger on `auth.users` if it exists.
  2. Important Notes
    - This migration addresses the "relation public.profiles does not exist" error.
    - Supabase often creates a default trigger/function to insert into a `public.profiles` table when a new user signs up.
    - Since we are managing user profiles in our `public.users` table, this default behavior is conflicting.
    - Removing this trigger/function ensures that our application's logic for inserting into `public.users` can proceed without interference.
*/

-- Drop the trigger on auth.users that might be calling handle_new_user
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
END $$;

-- Drop the function that might be inserting into public.profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    DROP FUNCTION public.handle_new_user();
  END IF;
END $$;