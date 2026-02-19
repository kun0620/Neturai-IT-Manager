/*
  # Add business hours + SLA calendar helpers

  - Settings keys for timezone/workday window/business days
  - Helper to add business hours on top of a timestamp
  - Helper to calculate ticket SLA deadlines from policy + business calendar
*/

INSERT INTO public.settings (key, value)
VALUES
  ('business_timezone', 'UTC'),
  ('business_hours_start', '09:00'),
  ('business_hours_end', '18:00'),
  ('business_days', '1,2,3,4,5')
ON CONFLICT (key) DO NOTHING;

DROP FUNCTION IF EXISTS public.add_business_hours(timestamptz, numeric, text, time, time, int[]);

CREATE FUNCTION public.add_business_hours(
  p_start timestamptz,
  p_duration_hours numeric,
  p_timezone text DEFAULT NULL,
  p_day_start time DEFAULT NULL,
  p_day_end time DEFAULT NULL,
  p_business_days int[] DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_timezone text;
  v_day_start time;
  v_day_end time;
  v_business_days int[];
  v_current timestamptz;
  v_local_ts timestamp;
  v_local_time time;
  v_local_dow int;
  v_remaining_minutes bigint;
  v_guard bigint := 0;
BEGIN
  IF p_start IS NULL OR p_duration_hours IS NULL THEN
    RETURN NULL;
  END IF;

  v_timezone := COALESCE(
    p_timezone,
    (SELECT value FROM public.settings WHERE key = 'business_timezone' LIMIT 1),
    'UTC'
  );
  v_day_start := COALESCE(
    p_day_start,
    ((SELECT value FROM public.settings WHERE key = 'business_hours_start' LIMIT 1))::time,
    '09:00'::time
  );
  v_day_end := COALESCE(
    p_day_end,
    ((SELECT value FROM public.settings WHERE key = 'business_hours_end' LIMIT 1))::time,
    '18:00'::time
  );
  v_business_days := COALESCE(
    p_business_days,
    (
      SELECT COALESCE(array_agg(trim(d)::int), ARRAY[1,2,3,4,5]::int[])
      FROM regexp_split_to_table(
        COALESCE((SELECT value FROM public.settings WHERE key = 'business_days' LIMIT 1), '1,2,3,4,5'),
        ','
      ) AS d
      WHERE trim(d) <> ''
    ),
    ARRAY[1,2,3,4,5]::int[]
  );

  IF v_day_end <= v_day_start THEN
    RAISE EXCEPTION 'business_hours_end must be later than business_hours_start';
  END IF;

  v_remaining_minutes := GREATEST(CEIL(p_duration_hours * 60), 0)::bigint;
  IF v_remaining_minutes = 0 THEN
    RETURN p_start;
  END IF;

  v_current := p_start;

  WHILE v_remaining_minutes > 0 LOOP
    v_guard := v_guard + 1;
    IF v_guard > 6000000 THEN
      RAISE EXCEPTION 'add_business_hours guard exceeded';
    END IF;

    v_local_ts := v_current AT TIME ZONE v_timezone;
    v_local_time := v_local_ts::time;
    v_local_dow := EXTRACT(ISODOW FROM v_local_ts)::int;

    IF v_local_dow = ANY(v_business_days)
      AND v_local_time >= v_day_start
      AND v_local_time < v_day_end THEN
      v_remaining_minutes := v_remaining_minutes - 1;
      IF v_remaining_minutes = 0 THEN
        RETURN v_current;
      END IF;
    END IF;

    v_current := v_current + INTERVAL '1 minute';
  END LOOP;

  RETURN v_current;
END;
$$;

DROP FUNCTION IF EXISTS public.calculate_ticket_sla_deadlines(uuid);

CREATE FUNCTION public.calculate_ticket_sla_deadlines(p_ticket_id uuid)
RETURNS TABLE (
  response_due_at timestamptz,
  resolution_due_at timestamptz
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_created_at timestamptz;
  v_priority text;
  v_response_hours numeric;
  v_resolution_hours numeric;
BEGIN
  SELECT t.created_at, t.priority
  INTO v_created_at, v_priority
  FROM public.tickets t
  WHERE t.id = p_ticket_id
  LIMIT 1;

  IF v_created_at IS NULL THEN
    RETURN;
  END IF;

  SELECT sp.response_time_hours, sp.resolution_time_hours
  INTO v_response_hours, v_resolution_hours
  FROM public.sla_policies sp
  WHERE lower(sp.priority::text) = lower(COALESCE(v_priority, ''))
  LIMIT 1;

  response_due_at := public.add_business_hours(v_created_at, COALESCE(v_response_hours, 0));
  resolution_due_at := public.add_business_hours(v_created_at, COALESCE(v_resolution_hours, 0));

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_business_hours(timestamptz, numeric, text, time, time, int[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_business_hours(timestamptz, numeric, text, time, time, int[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_ticket_sla_deadlines(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_ticket_sla_deadlines(uuid) TO service_role;

