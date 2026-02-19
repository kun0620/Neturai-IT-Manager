/*
  # Add default ticket workflow settings

  - default_ticket_priority
  - default_ticket_status
  - default_ticket_category_id
*/

INSERT INTO public.settings (key, value)
VALUES
  ('default_ticket_priority', 'Low'),
  ('default_ticket_status', 'open'),
  ('default_ticket_category_id', '')
ON CONFLICT (key) DO NOTHING;

