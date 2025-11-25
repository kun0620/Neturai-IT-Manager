/*
  # Add Sample Data

  1. Insert Sample Roles:
    - 'Admin', 'Editor', 'Viewer' (if not already present).
  2. Insert Sample Users:
    - An 'Admin' user.
    - A 'Viewer' user.
    - Note: Passwords for sample users are 'password123'.
  3. Insert Sample Assets:
    - Various assets with different categories and statuses.
  4. Insert Sample Tickets:
    - Various tickets with different categories, priorities, and statuses.
  5. Insert Sample Ticket Comments:
    - Comments for the sample tickets.
  6. Important Notes:
    - This migration is for development/testing purposes only.
    - It uses `ON CONFLICT DO NOTHING` for roles to prevent errors if they already exist.
    - It uses `auth.users` for user creation, which requires a `SECURITY DEFINER` function or direct SQL execution. For simplicity in a migration, we'll use `INSERT` into `auth.users` directly, which is typically done via the Supabase Auth API. However, for a migration, we can simulate it.
    - The `auth.users` table cannot be directly inserted into with `gen_random_uuid()` for `id` if `auth.uid()` is expected to match. We will create a user via `auth.signup` in the application, and then insert into `public.users`. For sample data, we'll create a user directly in `auth.users` and `public.users` with a known ID.
    - For `auth.users` insertion, we need to ensure the `id` matches the `public.users` table.
    - CRITICAL FIX: Removed `confirmed_at` and `email_confirmed_at` from `auth.users` INSERT statements as they are generated columns.
*/

-- Insert default roles if they don't already exist
INSERT INTO public.roles (name) VALUES
('Admin'),
('Editor'),
('Viewer')
ON CONFLICT (name) DO NOTHING;

-- Get role IDs
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
  -- Note: In a real app, users are created via auth.signUp. This is for sample data only.
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
