/*
  # Create settings, ticket_categories, sla_policies tables and update tickets table

  1. New Tables
    - `settings`
      - `key` (text, primary key)
      - `value` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `ticket_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
    - `sla_policies`
      - `id` (uuid, primary key)
      - `priority` (text, unique, enum: 'Low', 'Medium', 'High', 'Critical')
      - `response_time_hours` (integer)
      - `resolution_time_hours` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Modified Tables
    - `tickets`
      - Add `resolved_at` (timestamptz) column

  3. Security
    - Enable RLS on `settings`, `ticket_categories`, `sla_policies` tables
    - Add RLS policies for `settings`:
      - `SELECT` for authenticated users
      - `INSERT`, `UPDATE`, `DELETE` for admin users
    - Add RLS policies for `ticket_categories`:
      - `SELECT` for authenticated users
      - `INSERT`, `UPDATE`, `DELETE` for admin users
    - Add RLS policies for `sla_policies`:
      - `SELECT` for authenticated users
      - `UPDATE` for admin users

  4. Data Seeding
    - Insert default settings
    - Insert default ticket categories
    - Insert default SLA policies for 'Low', 'Medium', 'High', 'Critical' priorities
*/

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name = 'Admin'
  );
END;
$$;

-- Add resolved_at to tickets table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE tickets ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings table
DROP POLICY IF EXISTS "Allow authenticated read settings" ON public.settings;
CREATE POLICY "Allow authenticated read settings"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow admin manage settings" ON public.settings;
CREATE POLICY "Allow admin manage settings"
  ON public.settings
  FOR ALL
  TO authenticated
  USING (public.is_admin()) -- Corrected order: USING before WITH CHECK
  WITH CHECK (public.is_admin());

-- Create ticket_categories table
CREATE TABLE IF NOT EXISTS public.ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for ticket_categories
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

-- Policies for ticket_categories table
DROP POLICY IF EXISTS "Allow authenticated read ticket_categories" ON public.ticket_categories;
CREATE POLICY "Allow authenticated read ticket_categories"
  ON public.ticket_categories
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow admin manage ticket_categories" ON public.ticket_categories;
CREATE POLICY "Allow admin manage ticket_categories"
  ON public.ticket_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin()) -- Corrected order: USING before WITH CHECK
  WITH CHECK (public.is_admin());

-- Create sla_policies table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority_enum') THEN
    CREATE TYPE public.ticket_priority_enum AS ENUM ('Low', 'Medium', 'High', 'Critical');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority public.ticket_priority_enum UNIQUE NOT NULL,
  response_time_hours integer NOT NULL DEFAULT 0,
  resolution_time_hours integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for sla_policies
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

-- Policies for sla_policies table
DROP POLICY IF EXISTS "Allow authenticated read sla_policies" ON public.sla_policies;
CREATE POLICY "Allow authenticated read sla_policies"
  ON public.sla_policies
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow admin update sla_policies" ON public.sla_policies;
CREATE POLICY "Allow admin update sla_policies"
  ON public.sla_policies
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Insert default settings if they don't exist
INSERT INTO public.settings (key, value)
VALUES
  ('email_notifications_enabled', 'false'),
  ('default_assignee_id', ''), -- Will be updated by admin
  ('theme_default', 'system')
ON CONFLICT (key) DO NOTHING;

-- Insert default ticket categories if they don't exist
INSERT INTO public.ticket_categories (name)
VALUES
  ('Software Issue'),
  ('Hardware Issue'),
  ('Network Issue'),
  ('Account Issue'),
  ('Request')
ON CONFLICT (name) DO NOTHING;

-- Insert default SLA policies if they don't exist
INSERT INTO public.sla_policies (priority, response_time_hours, resolution_time_hours)
VALUES
  ('Low', 48, 168),      -- 2 days response, 7 days resolution
  ('Medium', 24, 72),    -- 1 day response, 3 days resolution
  ('High', 8, 24),       -- 8 hours response, 1 day resolution
  ('Critical', 1, 4)     -- 1 hour response, 4 hours resolution
ON CONFLICT (priority) DO NOTHING;
