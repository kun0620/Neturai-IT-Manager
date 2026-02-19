/*
  # Add security setting defaults

  - session_idle_timeout_minutes
    0 = disabled
*/

INSERT INTO public.settings (key, value)
VALUES
  ('session_idle_timeout_minutes', '120')
ON CONFLICT (key) DO NOTHING;

