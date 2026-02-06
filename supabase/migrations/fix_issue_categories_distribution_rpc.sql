/*
  # Fix issue categories distribution RPCs

  - Use ticket_categories + tickets.category_id (not tickets.category)
  - Return counts per category (including zero)
*/

-- No-args version
CREATE OR REPLACE FUNCTION public.get_issue_categories_distribution()
RETURNS TABLE (category text, count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name AS category,
    COUNT(t.id)::bigint AS count
  FROM public.ticket_categories c
  LEFT JOIN public.tickets t
    ON t.category_id = c.id
  GROUP BY c.name
  ORDER BY count DESC;
END;
$$;

-- Date-range version
CREATE OR REPLACE FUNCTION public.get_issue_categories_distribution(start_date timestamptz, end_date timestamptz)
RETURNS TABLE (category_name text, count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name AS category_name,
    COUNT(t.id)::bigint AS count
  FROM public.ticket_categories c
  LEFT JOIN public.tickets t
    ON t.category_id = c.id
    AND t.created_at >= start_date
    AND t.created_at <= end_date
  GROUP BY c.name
  ORDER BY count DESC
  LIMIT 5;
END;
$$;
