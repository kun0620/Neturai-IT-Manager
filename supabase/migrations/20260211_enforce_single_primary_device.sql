/*
  # Enforce one laptop/desktop per user

  Prevent assigning more than one laptop/desktop to the same user.
*/

CREATE OR REPLACE FUNCTION public.enforce_single_primary_device()
RETURNS trigger AS $$
DECLARE
  type_key text;
  type_name text;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT key, name
  INTO type_key, type_name
  FROM public.asset_types
  WHERE id = NEW.asset_type_id;

  IF type_key IS NULL AND type_name IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(type_key) IN ('laptop', 'desktop')
     OR lower(type_name) IN ('laptop', 'desktop') THEN
    IF EXISTS (
      SELECT 1
      FROM public.assets a
      JOIN public.asset_types t ON t.id = a.asset_type_id
      WHERE a.assigned_to = NEW.assigned_to
        AND a.id <> NEW.id
        AND (
          lower(t.key) IN ('laptop', 'desktop')
          OR lower(t.name) IN ('laptop', 'desktop')
        )
    ) THEN
      RAISE EXCEPTION 'User already has a laptop/desktop assigned';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_primary_device ON public.assets;

CREATE TRIGGER enforce_single_primary_device
BEFORE INSERT OR UPDATE OF assigned_to, asset_type_id ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_primary_device();
