/*
  # Add profile metadata fields

  Add department/location/device metadata so users can document their workspace.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS device_details text,
  ADD COLUMN IF NOT EXISTS preferred_contact text;

COMMENT ON COLUMN public.profiles.full_name IS 'Display name used across the portal';
COMMENT ON COLUMN public.profiles.department IS 'Business unit or team';
COMMENT ON COLUMN public.profiles.location IS 'Physical location or site';
COMMENT ON COLUMN public.profiles.device_type IS 'General device category (Laptop/Desktop/Phone/Other)';
COMMENT ON COLUMN public.profiles.device_details IS 'Detailed device model/serial';
COMMENT ON COLUMN public.profiles.preferred_contact IS 'Preferred channel for IT follow-up';
