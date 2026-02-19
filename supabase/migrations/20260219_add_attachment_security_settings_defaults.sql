/*
  # Add attachment security setting defaults

  - attachment_max_size_mb
  - attachment_allowed_types
*/

INSERT INTO public.settings (key, value)
VALUES
  ('attachment_max_size_mb', '10'),
  ('attachment_allowed_types', 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip')
ON CONFLICT (key) DO NOTHING;
