/*
  # Seed Default Statuses and Categories

  1. Data Insertion
    - Insert default statuses into `statuses` table: 'Open', 'In Progress', 'Closed', 'Pending'.
    - Insert default categories into `categories` table: 'Bug', 'Feature Request', 'Support', 'Maintenance'.
  2. Important Notes
    - Uses `ON CONFLICT (name) DO NOTHING` to prevent errors if data already exists.
*/

-- Insert default statuses
INSERT INTO public.statuses (name)
VALUES
  ('Open'),
  ('In Progress'),
  ('Closed'),
  ('Pending')
ON CONFLICT (name) DO NOTHING;

-- Insert default categories
INSERT INTO public.categories (name)
VALUES
  ('Bug'),
  ('Feature Request'),
  ('Support'),
  ('Maintenance')
ON CONFLICT (name) DO NOTHING;
