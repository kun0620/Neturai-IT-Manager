/*
      # Create RPC functions for ticket analytics

      1. New Functions
        - `get_tickets_created_per_month()`: Returns month and count of tickets created per month.
        - `get_issue_categories_distribution()`: Returns category and count of tickets per category.
      2. Security
        - Grant `EXECUTE` permission on both functions to `anon` and `authenticated` roles.
    */

    CREATE OR REPLACE FUNCTION get_tickets_created_per_month()
    RETURNS TABLE(month int, count bigint)
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        EXTRACT(MONTH FROM created_at)::int AS month,
        COUNT(*)::bigint AS count
      FROM
        tickets
      WHERE
        EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND user_id = auth.uid() -- Ensure RLS for RPC
      GROUP BY
        1
      ORDER BY
        1;
    END;
    $$;

    CREATE OR REPLACE FUNCTION get_issue_categories_distribution()
    RETURNS TABLE(category text, count bigint)
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        t.category::text AS category,
        COUNT(*)::bigint AS count
      FROM
        tickets t
      WHERE
        t.user_id = auth.uid() -- Ensure RLS for RPC
      GROUP BY
        t.category
      ORDER BY
        count DESC;
    END;
    $$;

    -- Grant execute permissions to anon and authenticated roles
    GRANT EXECUTE ON FUNCTION public.get_tickets_created_per_month() TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_issue_categories_distribution() TO anon, authenticated;
