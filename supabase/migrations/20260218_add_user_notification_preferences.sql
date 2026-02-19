/*
  # Add per-user notification preferences

  - Store per-user toggles for ticket notification types
  - Default behavior remains enabled for all types when no row exists
*/

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  receive_new_ticket boolean NOT NULL DEFAULT true,
  receive_status_change boolean NOT NULL DEFAULT true,
  receive_priority_change boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_prefs_select_own" ON public.user_notification_preferences;
CREATE POLICY "notification_prefs_select_own"
  ON public.user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_prefs_insert_own" ON public.user_notification_preferences;
CREATE POLICY "notification_prefs_insert_own"
  ON public.user_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_prefs_update_own" ON public.user_notification_preferences;
CREATE POLICY "notification_prefs_update_own"
  ON public.user_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP FUNCTION IF EXISTS public.notification_enabled_for_user(uuid, text);

CREATE FUNCTION public.notification_enabled_for_user(p_user_id uuid, p_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE p_type
      WHEN 'new_ticket' THEN p.receive_new_ticket
      WHEN 'status_change' THEN p.receive_status_change
      WHEN 'priority_change' THEN p.receive_priority_change
      ELSE true
    END
    FROM public.user_notification_preferences p
    WHERE p.user_id = p_user_id
    LIMIT 1
  ), true);
$$;

GRANT EXECUTE ON FUNCTION public.notification_enabled_for_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notification_enabled_for_user(uuid, text) TO service_role;

