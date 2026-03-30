/*
  # Add stock borrow requests

  - Allow asset_requests of type `borrow` to target stock_items / stock_units
  - Add RPC for creating borrow requests from stock
  - Extend approval flow so stock borrow requests deduct inventory on approval
  - Add stock borrow return flow backed by returned_at / returned_by on asset_requests
*/

ALTER TABLE public.asset_requests
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

DROP FUNCTION IF EXISTS public.create_asset_borrow_request_with_stock(uuid, integer, text, timestamptz, uuid);

CREATE FUNCTION public.create_asset_borrow_request_with_stock(
  p_stock_item_id uuid,
  p_quantity integer DEFAULT 1,
  p_reason text DEFAULT NULL,
  p_due_at timestamptz DEFAULT NULL,
  p_stock_unit_id uuid DEFAULT NULL
)
RETURNS public.asset_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item public.stock_items;
  v_unit public.stock_units;
  v_request public.asset_requests;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_stock_item_id IS NULL THEN
    RAISE EXCEPTION 'stock_item_id is required';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'quantity must be at least 1';
  END IF;

  IF p_due_at IS NULL OR p_due_at <= now() THEN
    RAISE EXCEPTION 'due_at must be in the future';
  END IF;

  SELECT *
    INTO v_item
  FROM public.stock_items
  WHERE id = p_stock_item_id
    AND is_active = true;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'stock item not found';
  END IF;

  IF v_item.tracking_mode = 'serialized' AND p_quantity <> 1 THEN
    RAISE EXCEPTION 'serialized borrow request quantity must be 1';
  END IF;

  IF p_stock_unit_id IS NOT NULL THEN
    SELECT *
      INTO v_unit
    FROM public.stock_units
    WHERE id = p_stock_unit_id
      AND stock_item_id = p_stock_item_id;

    IF v_unit.id IS NULL THEN
      RAISE EXCEPTION 'stock unit not found for stock item';
    END IF;

    IF v_item.tracking_mode <> 'serialized' THEN
      RAISE EXCEPTION 'stock_unit_id may only be supplied for serialized stock';
    END IF;

    IF v_unit.status NOT IN ('in_stock', 'reserved') THEN
      RAISE EXCEPTION 'stock unit is not available for borrow';
    END IF;
  ELSIF v_item.tracking_mode = 'serialized' THEN
    RAISE EXCEPTION 'stock_unit_id is required for serialized borrow request';
  END IF;

  INSERT INTO public.asset_requests (
    asset_id,
    stock_item_id,
    stock_unit_id,
    request_type,
    quantity,
    status,
    requested_by,
    reason,
    due_at
  ) VALUES (
    NULL,
    p_stock_item_id,
    p_stock_unit_id,
    'borrow',
    CASE WHEN v_item.tracking_mode = 'serialized' THEN 1 ELSE p_quantity END,
    'pending',
    v_uid,
    nullif(trim(p_reason), ''),
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
      'request_type', v_request.request_type,
      'stock_item_id', v_request.stock_item_id,
      'stock_unit_id', v_request.stock_unit_id,
      'quantity', v_request.quantity
    )
  );

  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_asset_borrow_request_with_stock(uuid, integer, text, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_asset_borrow_request_with_stock(uuid, integer, text, timestamptz, uuid) TO service_role;

DROP FUNCTION IF EXISTS public.return_stock_borrow_request(uuid, text);

CREATE FUNCTION public.return_stock_borrow_request(
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.asset_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_request public.asset_requests;
  v_stock_item public.stock_items;
  v_stock_unit public.stock_units;
  v_balance public.stock_balances;
  v_location_key text := 'main';
BEGIN
  IF v_uid IS NULL THEN
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

  IF v_request.request_type <> 'borrow' OR v_request.stock_item_id IS NULL THEN
    RAISE EXCEPTION 'request is not a stock borrow';
  END IF;

  IF v_request.status <> 'fulfilled' THEN
    RAISE EXCEPTION 'stock borrow request is not active';
  END IF;

  IF v_request.returned_at IS NOT NULL THEN
    RAISE EXCEPTION 'stock borrow request already returned';
  END IF;

  IF NOT public.is_admin_or_it(v_uid) AND v_request.requested_by <> v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT *
    INTO v_stock_item
  FROM public.stock_items
  WHERE id = v_request.stock_item_id
    AND is_active = true
  FOR UPDATE;

  IF v_stock_item.id IS NULL THEN
    RAISE EXCEPTION 'stock item not found';
  END IF;

  IF v_stock_item.tracking_mode = 'bulk' THEN
    INSERT INTO public.stock_balances (stock_item_id, location_key, qty_on_hand, qty_reserved)
    VALUES (v_stock_item.id, v_location_key, v_request.quantity, 0)
    ON CONFLICT (stock_item_id, location_key)
    DO UPDATE SET qty_on_hand = public.stock_balances.qty_on_hand + EXCLUDED.qty_on_hand
    RETURNING *
    INTO v_balance;

    INSERT INTO public.stock_movements (
      stock_item_id,
      movement_type,
      quantity,
      location_to,
      reference_type,
      reference_id,
      note,
      created_by
    ) VALUES (
      v_stock_item.id,
      'receive',
      v_request.quantity,
      v_location_key,
      'asset_request_return',
      v_request.id,
      coalesce(nullif(trim(p_notes), ''), 'Returned borrowed stock via asset request'),
      v_uid
    );
  ELSE
    IF v_request.stock_unit_id IS NULL THEN
      RAISE EXCEPTION 'serialized stock borrow request is missing stock unit';
    END IF;

    SELECT *
      INTO v_stock_unit
    FROM public.stock_units
    WHERE id = v_request.stock_unit_id
      AND stock_item_id = v_stock_item.id
    FOR UPDATE;

    IF v_stock_unit.id IS NULL THEN
      RAISE EXCEPTION 'stock unit not found';
    END IF;

    IF v_stock_unit.status <> 'issued' THEN
      RAISE EXCEPTION 'stock unit is not currently issued';
    END IF;

    UPDATE public.stock_units
    SET status = 'in_stock',
        assigned_to = NULL
    WHERE id = v_stock_unit.id;

    INSERT INTO public.stock_balances (stock_item_id, location_key, qty_on_hand, qty_reserved)
    VALUES (v_stock_item.id, v_stock_unit.location_key, 1, 0)
    ON CONFLICT (stock_item_id, location_key)
    DO UPDATE SET qty_on_hand = public.stock_balances.qty_on_hand + 1
    RETURNING *
    INTO v_balance;

    INSERT INTO public.stock_movements (
      stock_item_id,
      stock_unit_id,
      movement_type,
      quantity,
      location_to,
      reference_type,
      reference_id,
      note,
      created_by
    ) VALUES (
      v_stock_item.id,
      v_stock_unit.id,
      'receive',
      1,
      v_stock_unit.location_key,
      'asset_request_return',
      v_request.id,
      coalesce(nullif(trim(p_notes), ''), 'Returned borrowed serialized stock via asset request'),
      v_uid
    );
  END IF;

  UPDATE public.asset_requests
  SET returned_at = now(),
      returned_by = v_uid,
      decision_note = CASE
        WHEN nullif(trim(p_notes), '') IS NULL THEN decision_note
        WHEN coalesce(decision_note, '') = '' THEN trim(p_notes)
        ELSE decision_note || E'\nReturned: ' || trim(p_notes)
      END
  WHERE id = v_request.id
  RETURNING *
  INTO v_request;

  INSERT INTO public.logs (user_id, action, details)
  VALUES (
    v_uid,
    'asset.stock_borrow_returned',
    jsonb_build_object(
      'request_id', v_request.id,
      'stock_item_id', v_request.stock_item_id,
      'stock_unit_id', v_request.stock_unit_id,
      'quantity', v_request.quantity
    )
  );

  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.return_stock_borrow_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_stock_borrow_request(uuid, text) TO service_role;

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
  v_stock_item public.stock_items;
  v_stock_balance public.stock_balances;
  v_stock_unit public.stock_units;
  v_available integer := 0;
  v_location_key text := 'main';
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

  IF v_request.request_type = 'borrow' AND v_request.stock_item_id IS NULL THEN
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
    IF v_request.stock_item_id IS NOT NULL THEN
      SELECT *
        INTO v_stock_item
      FROM public.stock_items
      WHERE id = v_request.stock_item_id
        AND is_active = true
      FOR UPDATE;

      IF v_stock_item.id IS NULL THEN
        RAISE EXCEPTION 'stock item not found';
      END IF;

      IF v_stock_item.tracking_mode = 'bulk' THEN
        SELECT *
          INTO v_stock_balance
        FROM public.stock_balances
        WHERE stock_item_id = v_stock_item.id
          AND location_key = v_location_key
        FOR UPDATE;

        IF v_stock_balance.id IS NULL THEN
          RAISE EXCEPTION 'stock balance not found for location';
        END IF;

        v_available := v_stock_balance.qty_on_hand - v_stock_balance.qty_reserved;
        IF v_available < v_request.quantity THEN
          RAISE EXCEPTION 'insufficient stock';
        END IF;

        UPDATE public.stock_balances
        SET qty_on_hand = qty_on_hand - v_request.quantity
        WHERE id = v_stock_balance.id;

        INSERT INTO public.stock_movements (
          stock_item_id,
          movement_type,
          quantity,
          location_from,
          reference_type,
          reference_id,
          note,
          created_by
        ) VALUES (
          v_stock_item.id,
          'issue',
          v_request.quantity,
          v_location_key,
          'asset_request',
          v_request.id,
          coalesce(
            nullif(trim(p_decision_note), ''),
            CASE
              WHEN v_request.request_type = 'borrow'
                THEN 'Borrowed from stock via asset request approval'
              ELSE 'Issued via asset issue request approval'
            END
          ),
          v_uid
        );
      ELSE
        IF v_request.quantity <> 1 THEN
          RAISE EXCEPTION 'serialized stock request quantity must be 1';
        END IF;

        IF v_request.stock_unit_id IS NOT NULL THEN
          SELECT *
            INTO v_stock_unit
          FROM public.stock_units
          WHERE id = v_request.stock_unit_id
            AND stock_item_id = v_stock_item.id
          FOR UPDATE;
        ELSE
          SELECT *
            INTO v_stock_unit
          FROM public.stock_units
          WHERE stock_item_id = v_stock_item.id
            AND status IN ('in_stock', 'reserved')
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED;
        END IF;

        IF v_stock_unit.id IS NULL THEN
          RAISE EXCEPTION 'no available serialized stock unit';
        END IF;

        IF v_stock_unit.status NOT IN ('in_stock', 'reserved') THEN
          RAISE EXCEPTION 'stock unit is not available for issue';
        END IF;

        UPDATE public.stock_units
        SET status = 'issued',
            assigned_to = v_request.requested_by
        WHERE id = v_stock_unit.id;

        UPDATE public.stock_balances
        SET qty_on_hand = qty_on_hand - 1,
            qty_reserved = CASE WHEN v_stock_unit.status = 'reserved' THEN qty_reserved - 1 ELSE qty_reserved END
        WHERE stock_item_id = v_stock_item.id
          AND location_key = v_stock_unit.location_key;

        INSERT INTO public.stock_movements (
          stock_item_id,
          stock_unit_id,
          movement_type,
          quantity,
          location_from,
          reference_type,
          reference_id,
          note,
          created_by
        ) VALUES (
          v_stock_item.id,
          v_stock_unit.id,
          'issue',
          1,
          v_stock_unit.location_key,
          'asset_request',
          v_request.id,
          coalesce(
            nullif(trim(p_decision_note), ''),
            CASE
              WHEN v_request.request_type = 'borrow'
                THEN 'Serialized borrow from stock via asset request approval'
              ELSE 'Serialized issue via asset request approval'
            END
          ),
          v_uid
        );

        UPDATE public.asset_requests
        SET stock_unit_id = v_stock_unit.id
        WHERE id = v_request.id;
      END IF;
    END IF;

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
      'stock_item_id', v_request.stock_item_id,
      'stock_unit_id', v_request.stock_unit_id,
      'request_type', v_request.request_type,
      'status', v_request.status
    )
  );

  RETURN v_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_asset_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_asset_request(uuid, text) TO service_role;
