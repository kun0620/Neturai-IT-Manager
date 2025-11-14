/*
  # Add RPC Functions for Dashboard Data

  1. New Functions
    - `get_tickets_created_per_month()`: Returns the count of tickets created per month for the current year.
    - `get_issue_categories_distribution()`: Returns the distribution of tickets by category.
*/

CREATE OR REPLACE FUNCTION get_tickets_created_per_month()
RETURNS TABLE(month int, count bigint) AS $$
SELECT
    EXTRACT(MONTH FROM created_at)::int AS month,
    COUNT(*)::bigint AS count
FROM
    tickets
WHERE
    created_at >= date_trunc('year', now()) -- Only current year's data
GROUP BY
    month
ORDER BY
    month;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_issue_categories_distribution()
RETURNS TABLE(category text, count bigint) AS $$
SELECT
    category,
    COUNT(*)::bigint AS count
FROM
    tickets
GROUP BY
    category
ORDER BY
    count DESC;
$$ LANGUAGE sql;
