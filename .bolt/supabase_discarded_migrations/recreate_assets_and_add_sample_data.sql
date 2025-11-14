/*
  # Recreate Assets Table and Add Sample Data

  This migration ensures the `assets` table is correctly structured with the `asset_code` column
  before inserting sample data. It performs the following steps:

  1. Drop existing `assets` table and associated `ENUM` types (if they exist) to ensure a clean state.
  2. Recreate `asset_category` and `asset_status` ENUM types.
  3. Recreate the `assets` table with all necessary columns, including `asset_code`.
  4. Enable Row Level Security (RLS) on the `assets` table.
  5. Add RLS policies for authenticated users to read, create, and update assets.
  6. Recreate the `update_updated_at_column` function (if not already present) and the trigger for `assets`.
  7. Insert sample roles, users, assets, tickets, and ticket comments.

  1. New Tables
    - `assets` (recreated)
      - `id` (uuid, primary key, default gen_random_uuid())
      - `name` (text, not null)
      - `asset_code` (text, unique, not null)
      - `serial_number` (text, nullable)
      - `category` (enum: 'Laptop', 'Desktop', 'Monitor', 'Printer', 'Network Device', 'Software License', 'Other', default 'Other')
      - `location` (text, nullable)
      - `status` (enum: 'Available', 'Assigned', 'In Repair', 'Retired', 'Lost', default 'Available')
      - `assigned_to` (uuid, foreign key to auth.users.id, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  2. Security
    - Enable RLS on `assets` table
    - Add policy for authenticated users to read all assets
    - Add policy for authenticated users to create assets
    - Add policy for authenticated users to update assets
  3. Sample Data
    - Inserts sample roles, users, assets, tickets, and ticket comments.
*/

-- Drop existing assets table and types to ensure a clean slate
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TYPE IF EXISTS public.asset_category CASCADE;
DROP TYPE IF EXISTS public.asset_status CASCADE;

-- Recreate ENUM types
CREATE TYPE public.asset_category AS ENUM ('Laptop', 'Desktop', 'Monitor', 'Printer', 'Network Device', 'Software License', 'Other');
CREATE TYPE public.asset_status AS ENUM ('Available', 'Assigned', 'In Repair', 'Retired', 'Lost');

-- Recreate assets table
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_code text UNIQUE NOT NULL,
  serial_number text,
  category public.asset_category DEFAULT 'Other'::public.asset_category,
  location text,
  status public.asset_status DEFAULT 'Available'::public.asset_status,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS and add policies for assets table
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read assets"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create assets"
  ON public.assets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assets"
  ON public.assets
  FOR UPDATE
  TO authenticated
  USING (true);

-- Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at column for assets
DROP TRIGGER IF EXISTS set_assets_updated_at ON public.assets;
CREATE TRIGGER set_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default roles if they don't already exist
INSERT INTO public.roles (name) VALUES
('Admin'),
('Editor'),
('Viewer')
ON CONFLICT (name) DO NOTHING;

-- Get role IDs and insert sample users and assets
DO $$
DECLARE
  admin_role_id uuid;
  viewer_role_id uuid;
  sample_admin_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; -- Consistent UUID for sample admin
  sample_viewer_id uuid := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'; -- Consistent UUID for sample viewer
BEGIN
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Admin';
  SELECT id INTO viewer_role_id FROM public.roles WHERE name = 'Viewer';

  -- Insert sample admin user into auth.users (if not exists)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = sample_admin_id) THEN
    INSERT INTO auth.users (id, email, encrypted_password)
    VALUES (sample_admin_id, 'admin@example.com', crypt('password123', gen_salt('bf')));
  END IF;

  -- Insert sample admin user into public.users (if not exists)
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = sample_admin_id) THEN
    INSERT INTO public.users (id, name, email, role_id)
    VALUES (sample_admin_id, 'Admin User', 'admin@example.com', admin_role_id);
  END IF;

  -- Insert sample viewer user into auth.users (if not exists)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = sample_viewer_id) THEN
    INSERT INTO auth.users (id, email, encrypted_password)
    VALUES (sample_viewer_id, 'viewer@example.com', crypt('password123', gen_salt('bf')));
  END IF;

  -- Insert sample viewer user into public.users (if not exists)
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = sample_viewer_id) THEN
    INSERT INTO public.users (id, name, email, role_id)
    VALUES (sample_viewer_id, 'Viewer User', 'viewer@example.com', viewer_role_id);
  END IF;

  -- Insert sample assets
  INSERT INTO public.assets (name, asset_code, serial_number, category, location, status, assigned_to) VALUES
  ('Dell XPS 15', 'LAP-001', 'SN-XPS15-001', 'Laptop', 'Office A', 'Assigned', sample_admin_id),
  ('HP EliteDesk', 'DESK-001', 'SN-HPED-001', 'Desktop', 'Office B', 'Available', NULL),
  ('LG Ultrawide Monitor', 'MON-001', 'SN-LGUW-001', 'Monitor', 'Office A', 'Assigned', sample_admin_id),
  ('Epson Printer', 'PRT-001', 'SN-EPSON-001', 'Printer', 'Office C', 'Available', NULL),
  ('Cisco Router', 'NET-001', 'SN-CISCO-001', 'Network Device', 'Server Room', 'Available', NULL),
  ('Microsoft Office License', 'SW-001', 'LIC-MS-001', 'Software License', 'Cloud', 'Assigned', sample_admin_id),
  ('External Hard Drive', 'OTH-001', 'SN-HDD-001', 'Other', 'Office B', 'In Repair', NULL)
  ON CONFLICT (asset_code) DO NOTHING;

  -- Insert sample tickets
  INSERT INTO public.tickets (user_id, subject, description, category, priority, status, assignee) VALUES
  (sample_admin_id, 'Laptop not booting', 'My Dell XPS 15 is not turning on after a recent update.', 'Hardware', 'High', 'Open', 'John Doe'),
  (sample_viewer_id, 'Software installation issue', 'Cannot install new design software on my desktop.', 'Software', 'Medium', 'In Progress', 'Jane Smith'),
  (sample_admin_id, 'Network connectivity problem', 'Intermittent internet connection in Office A.', 'Network', 'Critical', 'Open', 'Network Team'),
  (sample_viewer_id, 'Password reset request', 'Forgot my password for the internal system.', 'Account', 'Low', 'Resolved', 'IT Support'),
  (sample_admin_id, 'New monitor setup', 'Need assistance setting up a new LG Ultrawide monitor.', 'Hardware', 'Medium', 'Closed', 'IT Support'),
  (sample_viewer_id, 'Printer not responding', 'The Epson printer in Office C is not printing documents.', 'Hardware', 'High', 'Pending', 'Printer Tech')
  ON CONFLICT DO NOTHING;

  -- Insert sample ticket comments
  INSERT INTO public.ticket_comments (ticket_id, user_id, comment_text) VALUES
  ((SELECT id FROM public.tickets WHERE subject = 'Laptop not booting'), sample_admin_id, 'Checked power supply, seems fine. Suspect OS corruption.'),
  ((SELECT id FROM public.tickets WHERE subject = 'Laptop not booting'), NULL, 'Technician dispatched. ETA 30 mins.'),
  ((SELECT id FROM public.tickets WHERE subject = 'Software installation issue'), sample_viewer_id, 'The error message is "Access Denied".'),
  ((SELECT id FROM public.tickets WHERE subject = 'Software installation issue'), NULL, 'Requested admin privileges for installation. Waiting for approval.'),
  ((SELECT id FROM public.tickets WHERE subject = 'Password reset request'), NULL, 'Password reset link sent to registered email.')
  ON CONFLICT DO NOTHING;

END $$;
