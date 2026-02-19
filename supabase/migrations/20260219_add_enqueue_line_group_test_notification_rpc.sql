/*
  # Add RPC to enqueue LINE group test notification

  - Allows admin/IT users to enqueue a manual test message
  - Bypasses event filter settings so connectivity can be verified quickly
*/

DROP FUNCTION IF EXISTS public.enqueue_line_group_test_notification(text);

CREATE FUNCTION public.enqueue_line_group_test_notification(
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_job_id uuid;
  v_title text := 'LINE test notification';
  v_body text := coalesce(nullif(trim(p_message), ''), 'Manual test from Settings.');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.notification_jobs (
    channel,
    event_type,
    dedupe_key,
    dedupe_bucket,
    payload,
    status,
    scheduled_at
  ) VALUES (
    'line_group',
    'test_manual',
    'test_manual:' || v_uid::text || ':' || extract(epoch from now())::bigint::text,
    now(),
    jsonb_build_object(
      'title', v_title,
      'body', v_body,
      'priority', 'high'
    ),
    'pending',
    now()
  )
  RETURNING id INTO v_job_id;

  IF to_regprocedure('public.run_line_group_notify_worker()') IS NOT NULL THEN
    PERFORM public.run_line_group_notify_worker();
  END IF;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_line_group_test_notification(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_line_group_test_notification(text) TO service_role;
