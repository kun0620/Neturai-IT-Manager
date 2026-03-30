/*
  # Reverse stock movements safely

  - Track reversal metadata on stock_movements
  - Add RPC to reverse eligible stock movements without deleting history
  - Restrict reversal for asset request driven movements
*/

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversal_movement_id uuid REFERENCES public.stock_movements(id) ON DELETE SET NULL;

DROP FUNCTION IF EXISTS public.reverse_stock_movement(uuid, text);

CREATE FUNCTION public.reverse_stock_movement(
  p_movement_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.stock_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_movement public.stock_movements;
  v_stock_item public.stock_items;
  v_stock_unit public.stock_units;
  v_stock_balance public.stock_balances;
  v_location_key text;
  v_reverse_type public.stock_movement_type;
  v_reverse_note text;
  v_reverse_movement public.stock_movements;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT *
    INTO v_movement
  FROM public.stock_movements
  WHERE id = p_movement_id
  FOR UPDATE;

  IF v_movement.id IS NULL THEN
    RAISE EXCEPTION 'stock movement not found';
  END IF;

  IF v_movement.reversed_at IS NOT NULL THEN
    RAISE EXCEPTION 'stock movement already reversed';
  END IF;

  IF coalesce(v_movement.reference_type, '') IN ('asset_request', 'asset_request_return') THEN
    RAISE EXCEPTION 'reverse from the related asset request flow instead';
  END IF;

  SELECT *
    INTO v_stock_item
  FROM public.stock_items
  WHERE id = v_movement.stock_item_id
    AND is_active = true
  FOR UPDATE;

  IF v_stock_item.id IS NULL THEN
    RAISE EXCEPTION 'stock item not found';
  END IF;

  v_reverse_note := coalesce(
    nullif(trim(p_reason), ''),
    format('Reversed movement %s', v_movement.id)
  );

  IF v_stock_item.tracking_mode = 'bulk' THEN
    IF v_movement.movement_type NOT IN ('receive', 'issue', 'adjust_increase', 'adjust_decrease') THEN
      RAISE EXCEPTION 'movement type % cannot be reversed', v_movement.movement_type;
    END IF;

    v_location_key := lower(
      coalesce(
        nullif(trim(v_movement.location_to), ''),
        nullif(trim(v_movement.location_from), ''),
        'main'
      )
    );

    SELECT *
      INTO v_stock_balance
    FROM public.stock_balances
    WHERE stock_item_id = v_stock_item.id
      AND location_key = v_location_key
    FOR UPDATE;

    IF v_stock_balance.id IS NULL THEN
      RAISE EXCEPTION 'stock balance not found for location';
    END IF;

    CASE v_movement.movement_type
      WHEN 'receive' THEN
        IF (v_stock_balance.qty_on_hand - v_movement.quantity) < v_stock_balance.qty_reserved THEN
          RAISE EXCEPTION 'reverse would break reserved quantity constraint';
        END IF;

        UPDATE public.stock_balances
        SET qty_on_hand = qty_on_hand - v_movement.quantity
        WHERE id = v_stock_balance.id;

        v_reverse_type := 'adjust_decrease'::public.stock_movement_type;

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
          v_reverse_type,
          v_movement.quantity,
          v_location_key,
          'stock_movement_reversal',
          v_movement.id,
          v_reverse_note,
          v_uid
        )
        RETURNING *
        INTO v_reverse_movement;

      WHEN 'issue' THEN
        INSERT INTO public.stock_balances (stock_item_id, location_key, qty_on_hand, qty_reserved)
        VALUES (v_stock_item.id, v_location_key, v_movement.quantity, 0)
        ON CONFLICT (stock_item_id, location_key)
        DO UPDATE SET qty_on_hand = public.stock_balances.qty_on_hand + EXCLUDED.qty_on_hand;

        v_reverse_type := 'adjust_increase'::public.stock_movement_type;

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
          v_reverse_type,
          v_movement.quantity,
          v_location_key,
          'stock_movement_reversal',
          v_movement.id,
          v_reverse_note,
          v_uid
        )
        RETURNING *
        INTO v_reverse_movement;

      WHEN 'adjust_increase' THEN
        IF (v_stock_balance.qty_on_hand - v_movement.quantity) < v_stock_balance.qty_reserved THEN
          RAISE EXCEPTION 'reverse would break reserved quantity constraint';
        END IF;

        UPDATE public.stock_balances
        SET qty_on_hand = qty_on_hand - v_movement.quantity
        WHERE id = v_stock_balance.id;

        v_reverse_type := 'adjust_decrease'::public.stock_movement_type;

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
          v_reverse_type,
          v_movement.quantity,
          v_location_key,
          'stock_movement_reversal',
          v_movement.id,
          v_reverse_note,
          v_uid
        )
        RETURNING *
        INTO v_reverse_movement;

      WHEN 'adjust_decrease' THEN
        INSERT INTO public.stock_balances (stock_item_id, location_key, qty_on_hand, qty_reserved)
        VALUES (v_stock_item.id, v_location_key, v_movement.quantity, 0)
        ON CONFLICT (stock_item_id, location_key)
        DO UPDATE SET qty_on_hand = public.stock_balances.qty_on_hand + EXCLUDED.qty_on_hand;

        v_reverse_type := 'adjust_increase'::public.stock_movement_type;

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
          v_reverse_type,
          v_movement.quantity,
          v_location_key,
          'stock_movement_reversal',
          v_movement.id,
          v_reverse_note,
          v_uid
        )
        RETURNING *
        INTO v_reverse_movement;
    END CASE;
  ELSE
    IF v_movement.movement_type NOT IN ('issue', 'receive') OR v_movement.stock_unit_id IS NULL THEN
      RAISE EXCEPTION 'only serialized issue or receive movements can be reversed';
    END IF;

    SELECT *
      INTO v_stock_unit
    FROM public.stock_units
    WHERE id = v_movement.stock_unit_id
      AND stock_item_id = v_stock_item.id
    FOR UPDATE;

    IF v_stock_unit.id IS NULL THEN
      RAISE EXCEPTION 'stock unit not found';
    END IF;

    IF v_movement.movement_type = 'issue' THEN
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
      DO UPDATE SET qty_on_hand = public.stock_balances.qty_on_hand + 1;

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
        'return_in',
        1,
        v_stock_unit.location_key,
        'stock_movement_reversal',
        v_movement.id,
        v_reverse_note,
        v_uid
      )
      RETURNING *
      INTO v_reverse_movement;
    ELSE
      IF v_stock_unit.status <> 'in_stock' THEN
        RAISE EXCEPTION 'stock unit must still be in stock to reverse receive';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.stock_movements sm
        WHERE sm.stock_unit_id = v_stock_unit.id
          AND sm.id <> v_movement.id
          AND sm.created_at >= v_movement.created_at
          AND sm.reversed_at IS NULL
      ) THEN
        RAISE EXCEPTION 'stock unit has later movements and cannot reverse receive';
      END IF;

      SELECT *
        INTO v_stock_balance
      FROM public.stock_balances
      WHERE stock_item_id = v_stock_item.id
        AND location_key = v_stock_unit.location_key
      FOR UPDATE;

      IF v_stock_balance.id IS NULL THEN
        RAISE EXCEPTION 'stock balance not found for location';
      END IF;

      IF (v_stock_balance.qty_on_hand - 1) < v_stock_balance.qty_reserved THEN
        RAISE EXCEPTION 'reverse would break reserved quantity constraint';
      END IF;

      UPDATE public.stock_balances
      SET qty_on_hand = qty_on_hand - 1
      WHERE id = v_stock_balance.id;

      UPDATE public.stock_units
      SET status = 'retired',
          assigned_to = NULL,
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'reverse_receive_movement_id', v_movement.id,
            'reverse_receive_note', v_reverse_note
          )
      WHERE id = v_stock_unit.id;

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
        'adjust_decrease',
        1,
        v_stock_unit.location_key,
        'stock_movement_reversal',
        v_movement.id,
        v_reverse_note,
        v_uid
      )
      RETURNING *
      INTO v_reverse_movement;
    END IF;
  END IF;

  UPDATE public.stock_movements
  SET reversed_at = now(),
      reversed_by = v_uid,
      reversal_movement_id = v_reverse_movement.id
  WHERE id = v_movement.id;

  INSERT INTO public.logs (user_id, action, details)
  VALUES (
    v_uid,
    'stock.movement_reversed',
    jsonb_build_object(
      'movement_id', v_movement.id,
      'reversal_movement_id', v_reverse_movement.id,
      'stock_item_id', v_movement.stock_item_id,
      'stock_unit_id', v_movement.stock_unit_id,
      'movement_type', v_movement.movement_type
    )
  );

  RETURN v_reverse_movement;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_stock_movement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_stock_movement(uuid, text) TO service_role;
