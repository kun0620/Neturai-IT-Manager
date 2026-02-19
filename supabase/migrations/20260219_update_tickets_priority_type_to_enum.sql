/*
  # Normalize tickets.priority type to enum

  - Ensures public.ticket_priority_enum exists
  - Converts public.tickets.priority to enum when it is text/varchar
  - Maps legacy values safely to Low/Medium/High/Critical
*/

DO $$
DECLARE
  v_udt_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'ticket_priority_enum'
  ) THEN
    CREATE TYPE public.ticket_priority_enum AS ENUM ('Low', 'Medium', 'High', 'Critical');
  END IF;

  SELECT c.udt_name
    INTO v_udt_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'tickets'
    AND c.column_name = 'priority'
  LIMIT 1;

  IF v_udt_name IS NULL THEN
    RAISE EXCEPTION 'public.tickets.priority column not found';
  END IF;

  IF v_udt_name = 'ticket_priority_enum' THEN
    RETURN;
  END IF;

  IF v_udt_name NOT IN ('text', 'varchar', 'bpchar') THEN
    RAISE EXCEPTION 'Unsupported tickets.priority type: %', v_udt_name;
  END IF;

  ALTER TABLE public.tickets
    ALTER COLUMN priority DROP DEFAULT;

  ALTER TABLE public.tickets
    ALTER COLUMN priority TYPE public.ticket_priority_enum
    USING (
      CASE lower(trim(coalesce(priority::text, '')))
        WHEN 'critical' THEN 'Critical'::public.ticket_priority_enum
        WHEN 'high' THEN 'High'::public.ticket_priority_enum
        WHEN 'medium' THEN 'Medium'::public.ticket_priority_enum
        WHEN 'low' THEN 'Low'::public.ticket_priority_enum
        ELSE 'Low'::public.ticket_priority_enum
      END
    );

  ALTER TABLE public.tickets
    ALTER COLUMN priority SET DEFAULT 'Low'::public.ticket_priority_enum;
END $$;
