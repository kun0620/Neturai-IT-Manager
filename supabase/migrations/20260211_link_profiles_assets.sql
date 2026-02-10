/*
  # Link profiles to assigned assets

  Track which asset each user currently uses and mirror asset assignment changes.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_asset_id uuid REFERENCES public.assets(id);

COMMENT ON COLUMN public.profiles.assigned_asset_id IS 'Current asset assigned to the user';

UPDATE public.profiles
SET assigned_asset_id = assets.id
FROM public.assets AS assets
WHERE assets.assigned_to = public.profiles.id;

CREATE OR REPLACE FUNCTION public.sync_profile_assigned_asset()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL THEN
      UPDATE public.profiles
      SET assigned_asset_id = NEW.id
      WHERE id = NEW.assigned_to;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      IF OLD.assigned_to IS NOT NULL THEN
        UPDATE public.profiles
        SET assigned_asset_id = NULL
        WHERE id = OLD.assigned_to;
      END IF;
      IF NEW.assigned_to IS NOT NULL THEN
        UPDATE public.profiles
        SET assigned_asset_id = NEW.id
        WHERE id = NEW.assigned_to;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.assigned_to IS NOT NULL THEN
      UPDATE public.profiles
      SET assigned_asset_id = NULL
      WHERE id = OLD.assigned_to;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_profile_assigned_asset ON public.assets;

CREATE TRIGGER sync_profile_assigned_asset
AFTER INSERT OR UPDATE OR DELETE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_assigned_asset();
