-- Ensure avatar_url column exists on profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
