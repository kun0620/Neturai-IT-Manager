/*
  # Add logs retention setting and purge RPC

  - Adds a default setting: logs_retention_days
  - Adds RPC to purge old logs based on retention period
*/

INSERT INTO public.settings (key, value)
VALUES ('logs_retention_days', '90')
ON CONFLICT (key) DO NOTHING;

DROP FUNCTION IF EXISTS public.purge_old_logs(integer);

CREATE FUNCTION public.purge_old_logs(p_retention_days integer DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_deleted integer := 0;
BEGIN
  IF NOT public.is_admin_or_it(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_days := COALESCE(
    p_retention_days,
    (
      SELECT NULLIF(value, '')::integer
      FROM public.settings
      WHERE key = 'logs_retention_days'
      LIMIT 1
    ),
    90
  );

  IF v_days < 1 OR v_days > 3650 THEN
    RAISE EXCEPTION 'invalid retention days';
  END IF;

  DELETE FROM public.logs
  WHERE created_at < now() - make_interval(days => v_days);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.logs (user_id, action, details)
  VALUES (
    auth.uid(),
    'settings.logs_purged',
    jsonb_build_object(
      'retention_days', v_days,
      'deleted_count', v_deleted
    )
  );

  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_old_logs(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_logs(integer) TO service_role;

