/*
  # Asset borrow/issue phase 1 (schema + RLS + RPC)

  - Adds request/loan/issue tables
  - Adds RLS policies
  - Adds transactional RPCs for request lifecycle
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'asset_request_type'
  ) THEN
    CREATE TYPE public.asset_request_type AS ENUM ('borrow', 'issue');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'asset_request_status'
  ) THEN
    CREATE TYPE public.asset_request_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'cancelled',
      'fulfilled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.asset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  request_type public.asset_request_type NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status public.asset_request_status NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  decision_note text,
  needed_at timestamptz,
  due_at timestamptz,
  approved_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.asset_requests(id) ON DELETE SET NULL,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  borrower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  issued_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  borrowed_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  returned_at timestamptz,
  return_condition text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_issue_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.asset_requests(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  issued_to uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  issued_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_requests_requested_by_status
  ON public.asset_requests (requested_by, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_requests_status_created_at
  ON public.asset_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_loans_asset_id_returned_at
  ON public.asset_loans (asset_id, returned_at, due_at);

CREATE INDEX IF NOT EXISTS idx_asset_issue_transactions_issued_to_issued_at
  ON public.asset_issue_transactions (issued_to, issued_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS set_asset_requests_updated_at ON public.asset_requests;
    CREATE TRIGGER set_asset_requests_updated_at
      BEFORE UPDATE ON public.asset_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS set_asset_loans_updated_at ON public.asset_loans;
    CREATE TRIGGER set_asset_loans_updated_at
      BEFORE UPDATE ON public.asset_loans
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_issue_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asset_requests_select" ON public.asset_requests;
CREATE POLICY "asset_requests_select"
ON public.asset_requests
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin_or_it(auth.uid())
    OR requested_by = auth.uid()
    OR approved_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "asset_requests_insert_self" ON public.asset_requests;
CREATE POLICY "asset_requests_insert_self"
ON public.asset_requests
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND requested_by = auth.uid()
);

DROP POLICY IF EXISTS "asset_loans_select" ON public.asset_loans;
CREATE POLICY "asset_loans_select"
ON public.asset_loans
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin_or_it(auth.uid())
    OR borrower_id = auth.uid()
    OR issued_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "asset_issue_transactions_select" ON public.asset_issue_transactions;
CREATE POLICY "asset_issue_transactions_select"
ON public.asset_issue_transactions
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    public.is_admin_or_it(auth.uid())
    OR issued_to = auth.uid()
    OR issued_by = auth.uid()
  )
);

GRANT SELECT, INSERT ON public.asset_requests TO authenticated;
GRANT SELECT ON public.asset_loans TO authenticated;
GRANT SELECT ON public.asset_issue_transactions TO authenticated;

DROP FUNCTION IF EXISTS public.create_asset_request(uuid, text, integer, text, timestamptz, timestamptz);

CREATE FUNCTION public.create_asset_request(
  p_asset_id uuid DEFAULT NULL,
  p_request_type text DEFAULT 'borrow',
  p_quantity integer DEFAULT 1,
  p_reason text DEFAULT NULL,
  p_needed_at timestamptz DEFAULT NULL,
  p_due_at timestamptz DEFAULT NULL
)
RETURNS public.asset_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_type public.asset_request_type;
  v_request public.asset_requests;
  v_asset_exists boolean := false;
  v_active_loan_exists boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'invalid quantity';
  END IF;

  BEGIN
    v_type := lower(coalesce(p_request_type, 'borrow'))::public.asset_request_type;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'invalid request type';
  END;

  IF v_type = 'borrow' AND p_asset_id IS NULL THEN
    RAISE EXCEPTION 'asset is required for borrow request';
  END IF;

  IF v_type = 'borrow' AND p_due_at IS NULL THEN
    RAISE EXCEPTION 'due_at is required for borrow request';
  END IF;

  IF v_type = 'borrow' AND p_due_at <= now() THEN
    RAISE EXCEPTION 'due_at must be in the future';
  END IF;

  IF p_asset_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.assets a WHERE a.id = p_asset_id)
      INTO v_asset_exists;
    IF NOT v_asset_exists THEN
      RAISE EXCEPTION 'asset not found';
    END IF;
  END IF;

  IF v_type = 'borrow' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.asset_loans l
      WHERE l.asset_id = p_asset_id
        AND l.returned_at IS NULL
    )
    INTO v_active_loan_exists;

    IF v_active_loan_exists THEN
      RAISE EXCEPTION 'asset already borrowed';
    END IF;
  END IF;

  INSERT INTO public.asset_requests (
    asset_id,
    request_type,
    quantity,
    status,
    requested_by,
    reason,
    needed_at,
    due_at
  ) VALUES (
    p_asset_id,
    v_type,
    p_quantity,
    'pending',
    v_uid,
    nullif(trim(p_reason), ''),
    p_needed_at,
    p_due_at
  )
  RETURNING *
  INTO v_request;

  INSERT INTO public.logs (user_id, action, details)
  VALUES (
    v_uid,
    'asset.request_created',
    jsonb_build_object(
      'request_id', v_request.id,
      'asset_id', v_request.asset_id,
      'request_type', v_request.request_type,
      'quantity', v_request.quantity
    )
  );

  RETURN v_request;
END;
$$;

DROP FUNCTION IF EXISTS public.approve_asset_request(uuid, text);

CREATE FUNCTION public.approve_asset_request(
  p_request_id uuid,
  p_decision_note text DEFAULT NULL
)
RETURNS public.asset_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_request public.asset_requests;
  v_status_in_use_exists boolean := false;
  v_status_assigned_exists boolean := false;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT *
    INTO v_request
  FROM public.asset_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'request is not pending';
  END IF;

  IF v_request.request_type = 'borrow' THEN
    IF v_request.asset_id IS NULL OR v_request.due_at IS NULL THEN
      RAISE EXCEPTION 'borrow request is missing asset or due date';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.asset_loans l
      WHERE l.asset_id = v_request.asset_id
        AND l.returned_at IS NULL
    ) THEN
      RAISE EXCEPTION 'asset already borrowed';
    END IF;

    INSERT INTO public.asset_loans (
      request_id,
      asset_id,
      borrower_id,
      issued_by,
      borrowed_at,
      due_at,
      notes
    ) VALUES (
      v_request.id,
      v_request.asset_id,
      v_request.requested_by,
      v_uid,
      now(),
      v_request.due_at,
      nullif(trim(p_decision_note), '')
    );

    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      WHERE e.enumtypid = 'public.asset_status'::regtype
        AND e.enumlabel = 'In Use'
    )
    INTO v_status_in_use_exists;

    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      WHERE e.enumtypid = 'public.asset_status'::regtype
        AND e.enumlabel = 'Assigned'
    )
    INTO v_status_assigned_exists;

    IF v_status_in_use_exists THEN
      UPDATE public.assets
      SET assigned_to = v_request.requested_by,
          status = 'In Use'::public.asset_status
      WHERE id = v_request.asset_id;
    ELSIF v_status_assigned_exists THEN
      UPDATE public.assets
      SET assigned_to = v_request.requested_by,
          status = 'Assigned'::public.asset_status
      WHERE id = v_request.asset_id;
    ELSE
      UPDATE public.assets
      SET assigned_to = v_request.requested_by
      WHERE id = v_request.asset_id;
    END IF;

    UPDATE public.asset_requests
    SET status = 'approved',
        approved_by = v_uid,
        approved_at = now(),
        decision_note = nullif(trim(p_decision_note), '')
    WHERE id = v_request.id
    RETURNING *
    INTO v_request;
  ELSE
    INSERT INTO public.asset_issue_transactions (
      request_id,
      asset_id,
      quantity,
      issued_to,
      issued_by,
      notes
    ) VALUES (
      v_request.id,
      v_request.asset_id,
      v_request.quantity,
      v_request.requested_by,
      v_uid,
      nullif(trim(p_decision_note), '')
    );

    UPDATE public.asset_requests
    SET status = 'fulfilled',
        approved_by = v_uid,
        approved_at = now(),
        fulfilled_at = now(),
        decision_note = nullif(trim(p_decision_note), '')
    WHERE id = v_request.id
    RETURNING *
    INTO v_request;
  END IF;

  INSERT INTO public.logs (user_id, action, details)
  VALUES (
    v_uid,
    'asset.request_approved',
    jsonb_build_object(
      'request_id', v_request.id,
      'asset_id', v_request.asset_id,
      'request_type', v_request.request_type,
      'status', v_request.status
    )
  );

  RETURN v_request;
END;
$$;

DROP FUNCTION IF EXISTS public.reject_asset_request(uuid, text);

CREATE FUNCTION public.reject_asset_request(
  p_request_id uuid,
  p_decision_note text DEFAULT NULL
)
RETURNS public.asset_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_request public.asset_requests;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.asset_requests
  SET status = 'rejected',
      approved_by = v_uid,
      approved_at = now(),
      decision_note = nullif(trim(p_decision_note), '')
  WHERE id = p_request_id
    AND status = 'pending'
  RETURNING *
  INTO v_request;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'request is not pending or not found';
  END IF;

  INSERT INTO public.logs (user_id, action, details)
  VALUES (
    v_uid,
    'asset.request_rejected',
    jsonb_build_object(
      'request_id', v_request.id,
      'asset_id', v_request.asset_id,
      'request_type', v_request.request_type
    )
  );

  RETURN v_request;
END;
$$;

DROP FUNCTION IF EXISTS public.cancel_asset_request(uuid);

CREATE FUNCTION public.cancel_asset_request(
  p_request_id uuid
)
RETURNS public.asset_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_request public.asset_requests;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.asset_requests
  SET status = 'cancelled'
  WHERE id = p_request_id
    AND requested_by = v_uid
    AND status = 'pending'
  RETURNING *
  INTO v_request;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'request is not pending or not owned by user';
  END IF;

  INSERT INTO public.logs (user_id, action, details)
  VALUES (
    v_uid,
    'asset.request_cancelled',
    jsonb_build_object(
      'request_id', v_request.id,
      'asset_id', v_request.asset_id,
      'request_type', v_request.request_type
    )
  );

  RETURN v_request;
END;
$$;

DROP FUNCTION IF EXISTS public.return_asset_loan(uuid, text, text);

CREATE FUNCTION public.return_asset_loan(
  p_loan_id uuid,
  p_return_condition text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.asset_loans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_loan public.asset_loans;
  v_status_available_exists boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT *
    INTO v_loan
  FROM public.asset_loans
  WHERE id = p_loan_id
  FOR UPDATE;

  IF v_loan.id IS NULL THEN
    RAISE EXCEPTION 'loan not found';
  END IF;

  IF v_loan.returned_at IS NOT NULL THEN
    RAISE EXCEPTION 'loan already returned';
  END IF;

  IF NOT public.is_admin_or_it(v_uid) AND v_loan.borrower_id <> v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.asset_loans
  SET returned_at = now(),
      return_condition = nullif(trim(p_return_condition), ''),
      notes = COALESCE(notes, '') || CASE
        WHEN nullif(trim(p_notes), '') IS NULL THEN ''
        ELSE E'\n' || trim(p_notes)
      END
  WHERE id = v_loan.id
  RETURNING *
  INTO v_loan;

  IF NOT EXISTS (
    SELECT 1
    FROM public.asset_loans l
    WHERE l.asset_id = v_loan.asset_id
      AND l.returned_at IS NULL
  ) THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      WHERE e.enumtypid = 'public.asset_status'::regtype
        AND e.enumlabel = 'Available'
    )
    INTO v_status_available_exists;

    IF v_status_available_exists THEN
      UPDATE public.assets
      SET assigned_to = NULL,
          status = 'Available'::public.asset_status
      WHERE id = v_loan.asset_id;
    ELSE
      UPDATE public.assets
      SET assigned_to = NULL
      WHERE id = v_loan.asset_id;
    END IF;
  END IF;

  INSERT INTO public.logs (user_id, action, details)
  VALUES (
    v_uid,
    'asset.borrow_returned',
    jsonb_build_object(
      'loan_id', v_loan.id,
      'request_id', v_loan.request_id,
      'asset_id', v_loan.asset_id,
      'borrower_id', v_loan.borrower_id
    )
  );

  RETURN v_loan;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_asset_request(uuid, text, integer, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_asset_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_asset_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_asset_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_asset_loan(uuid, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_asset_request(uuid, text, integer, text, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_asset_request(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_asset_request(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_asset_request(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.return_asset_loan(uuid, text, text) TO service_role;
