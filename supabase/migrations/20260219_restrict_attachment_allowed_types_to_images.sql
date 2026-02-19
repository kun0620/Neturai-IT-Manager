/*
  # Restrict attachment types to images only

  - Set attachment_allowed_types to image wildcard
*/

INSERT INTO public.settings (key, value)
VALUES ('attachment_allowed_types', 'image/*')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;
