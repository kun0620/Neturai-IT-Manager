/*
      # Create Report RPC Functions

      1. New Functions
        - `get_tickets_created_per_month(start_date, end_date)`: Returns tickets created per month within a date range.
        - `get_average_resolution_time(start_date, end_date)`: Returns the average resolution time in hours for tickets within a date range.
        - `get_issue_categories_distribution(start_date, end_date)`: Returns the distribution of issue categories for tickets within a date range.
        - `get_top_repaired_assets(start_date, end_date)`: Returns the top repaired assets within a date range.
      2. Security
        - Grant `EXECUTE` permissions to `authenticated` role for all new RPC functions.
    */

    -- Function to get tickets created per month
    CREATE OR REPLACE FUNCTION get_tickets_created_per_month(start_date timestamptz, end_date timestamptz)
    RETURNS TABLE (month text, tickets bigint)
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        TO_CHAR(date_trunc('month', created_at), 'Mon YYYY') AS month,
        COUNT(id) AS tickets
      FROM tickets
      WHERE created_at >= start_date AND created_at <= end_date
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at);
    END;
    $$;

    -- Function to get average resolution time
    CREATE OR REPLACE FUNCTION get_average_resolution_time(start_date timestamptz, end_date timestamptz)
    RETURNS TABLE (avg_time_hours numeric)
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) / 3600 AS avg_time_hours
      FROM tickets
      WHERE created_at >= start_date AND created_at <= end_date AND resolved_at IS NOT NULL;
    END;
    $$;

    -- Function to get issue categories distribution
    CREATE OR REPLACE FUNCTION get_issue_categories_distribution(start_date timestamptz, end_date timestamptz)
    RETURNS TABLE (category_name text, count bigint)
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        category AS category_name,
        COUNT(id) AS count
      FROM tickets
      WHERE created_at >= start_date AND created_at <= end_date
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5; -- Top 5 categories
    END;
    $$;

    -- Function to get top repaired assets
    CREATE OR REPLACE FUNCTION get_top_repaired_assets(start_date timestamptz, end_date timestamptz)
    RETURNS TABLE (asset_name text, asset_code text, repairs_count bigint)
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        a.name AS asset_name,
        a.asset_code AS asset_code,
        COUNT(r.id) AS repairs_count
      FROM assets a
      JOIN repairs r ON a.id = r.asset_id
      WHERE r.created_at >= start_date AND r.created_at <= end_date
      GROUP BY a.id, a.name, a.asset_code
      ORDER BY repairs_count DESC
      LIMIT 5; -- Top 5 repaired assets
    END;
    $$;

    -- Grant execute permissions to authenticated users
    GRANT EXECUTE ON FUNCTION get_tickets_created_per_month(timestamptz, timestamptz) TO authenticated;
    GRANT EXECUTE ON FUNCTION get_average_resolution_time(timestamptz, timestamptz) TO authenticated;
    GRANT EXECUTE ON FUNCTION get_issue_categories_distribution(timestamptz, timestamptz) TO authenticated;
    GRANT EXECUTE ON FUNCTION get_top_repaired_assets(timestamptz, timestamptz) TO authenticated;
