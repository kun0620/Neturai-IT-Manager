/*
  # Stock control phase 1 (hybrid bulk + serialized)

  - Adds stock master, balance, serialized unit, and movement ledger tables
  - Supports both tracking modes:
    - bulk (quantity only)
    - serialized (unit-level serial tracking)
  - Adds RLS and transactional RPCs for stock operations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'stock_tracking_mode'
  ) THEN
    CREATE TYPE public.stock_tracking_mode AS ENUM ('bulk', 'serialized');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'stock_unit_status'
  ) THEN
    CREATE TYPE public.stock_unit_status AS ENUM (
      'in_stock',
      'reserved',
      'issued',
      'retired',
      'lost'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'stock_movement_type'
  ) THEN
    CREATE TYPE public.stock_movement_type AS ENUM (
      'receive',
      'issue',
      'adjust_increase',
      'adjust_decrease',
      'return_in',
      'transfer_in',
      'transfer_out',
      'reserve',
      'release'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  tracking_mode public.stock_tracking_mode NOT NULL DEFAULT 'bulk',
  reorder_point integer NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  reorder_qty integer NOT NULL DEFAULT 0 CHECK (reorder_qty >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  location_key text NOT NULL DEFAULT 'main',
  qty_on_hand integer NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  qty_reserved integer NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stock_item_id, location_key),
  CONSTRAINT stock_balances_reserved_lte_on_hand CHECK (qty_reserved <= qty_on_hand)
);

CREATE TABLE IF NOT EXISTS public.stock_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  serial_no text NOT NULL,
  location_key text NOT NULL DEFAULT 'main',
  status public.stock_unit_status NOT NULL DEFAULT 'in_stock',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stock_item_id, serial_no)
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  stock_unit_id uuid REFERENCES public.stock_units(id) ON DELETE SET NULL,
  movement_type public.stock_movement_type NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  location_from text,
  location_to text,
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_items_tracking_mode
  ON public.stock_items (tracking_mode, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_balances_item_location
  ON public.stock_balances (stock_item_id, location_key);

CREATE INDEX IF NOT EXISTS idx_stock_units_item_status
  ON public.stock_units (stock_item_id, status, location_key);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_created_at
  ON public.stock_movements (stock_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
  ON public.stock_movements (reference_type, reference_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS set_stock_items_updated_at ON public.stock_items;
    CREATE TRIGGER set_stock_items_updated_at
      BEFORE UPDATE ON public.stock_items
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS set_stock_balances_updated_at ON public.stock_balances;
    CREATE TRIGGER set_stock_balances_updated_at
      BEFORE UPDATE ON public.stock_balances
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS set_stock_units_updated_at ON public.stock_units;
    CREATE TRIGGER set_stock_units_updated_at
      BEFORE UPDATE ON public.stock_units
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_items_select" ON public.stock_items;
CREATE POLICY "stock_items_select"
ON public.stock_items
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "stock_items_manage_admin_it" ON public.stock_items;
CREATE POLICY "stock_items_manage_admin_it"
ON public.stock_items
FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin_or_it(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin_or_it(auth.uid()));

DROP POLICY IF EXISTS "stock_balances_select" ON public.stock_balances;
CREATE POLICY "stock_balances_select"
ON public.stock_balances
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "stock_balances_manage_admin_it" ON public.stock_balances;
CREATE POLICY "stock_balances_manage_admin_it"
ON public.stock_balances
FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin_or_it(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin_or_it(auth.uid()));

DROP POLICY IF EXISTS "stock_units_select" ON public.stock_units;
CREATE POLICY "stock_units_select"
ON public.stock_units
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "stock_units_manage_admin_it" ON public.stock_units;
CREATE POLICY "stock_units_manage_admin_it"
ON public.stock_units
FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin_or_it(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin_or_it(auth.uid()));

DROP POLICY IF EXISTS "stock_movements_select" ON public.stock_movements;
CREATE POLICY "stock_movements_select"
ON public.stock_movements
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "stock_movements_manage_admin_it" ON public.stock_movements;
CREATE POLICY "stock_movements_manage_admin_it"
ON public.stock_movements
FOR ALL
USING (auth.uid() IS NOT NULL AND public.is_admin_or_it(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin_or_it(auth.uid()));

GRANT SELECT ON public.stock_items TO authenticated;
GRANT SELECT ON public.stock_balances TO authenticated;
GRANT SELECT ON public.stock_units TO authenticated;
GRANT SELECT ON public.stock_movements TO authenticated;

GRANT ALL ON public.stock_items TO service_role;
GRANT ALL ON public.stock_balances TO service_role;
GRANT ALL ON public.stock_units TO service_role;
GRANT ALL ON public.stock_movements TO service_role;

DROP FUNCTION IF EXISTS public.create_stock_item(text, text, text, text, integer, integer, text, integer);

CREATE FUNCTION public.create_stock_item(
  p_sku text,
  p_name text,
  p_tracking_mode text DEFAULT 'bulk',
  p_category text DEFAULT NULL,
  p_reorder_point integer DEFAULT 0,
  p_reorder_qty integer DEFAULT 0,
  p_location_key text DEFAULT 'main',
  p_opening_qty integer DEFAULT 0
)
RETURNS public.stock_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tracking_mode public.stock_tracking_mode;
  v_item public.stock_items;
  v_location_key text := lower(coalesce(nullif(trim(p_location_key), ''), 'main'));
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF coalesce(trim(p_sku), '') = '' OR coalesce(trim(p_name), '') = '' THEN
    RAISE EXCEPTION 'sku and name are required';
  END IF;

  IF coalesce(p_reorder_point, 0) < 0 OR coalesce(p_reorder_qty, 0) < 0 THEN
    RAISE EXCEPTION 'reorder values must be >= 0';
  END IF;

  IF coalesce(p_opening_qty, 0) < 0 THEN
    RAISE EXCEPTION 'opening quantity must be >= 0';
  END IF;

  BEGIN
    v_tracking_mode := lower(coalesce(p_tracking_mode, 'bulk'))::public.stock_tracking_mode;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'invalid tracking mode';
  END;

  IF v_tracking_mode = 'serialized' AND p_opening_qty > 0 THEN
    RAISE EXCEPTION 'opening quantity for serialized item must be 0; add units by serial';
  END IF;

  INSERT INTO public.stock_items (
    sku,
    name,
    category,
    tracking_mode,
    reorder_point,
    reorder_qty,
    created_by
  ) VALUES (
    trim(p_sku),
    trim(p_name),
    nullif(trim(p_category), ''),
    v_tracking_mode,
    coalesce(p_reorder_point, 0),
    coalesce(p_reorder_qty, 0),
    v_uid
  )
  RETURNING *
  INTO v_item;

  INSERT INTO public.stock_balances (stock_item_id, location_key, qty_on_hand, qty_reserved)
  VALUES (v_item.id, v_location_key, coalesce(p_opening_qty, 0), 0)
  ON CONFLICT (stock_item_id, location_key) DO NOTHING;

  IF coalesce(p_opening_qty, 0) > 0 THEN
    INSERT INTO public.stock_movements (
      stock_item_id,
      movement_type,
      quantity,
      location_to,
      reference_type,
      note,
      created_by
    ) VALUES (
      v_item.id,
      'receive',
      p_opening_qty,
      v_location_key,
      'opening_balance',
      'Opening balance',
      v_uid
    );
  END IF;

  INSERT INTO public.logs (user_id, action, details)
  VALUES (
    v_uid,
    'stock.item_created',
    jsonb_build_object(
      'stock_item_id', v_item.id,
      'sku', v_item.sku,
      'tracking_mode', v_item.tracking_mode
    )
  );

  RETURN v_item;
END;
$$;

DROP FUNCTION IF EXISTS public.receive_stock(uuid, integer, text, text);

CREATE FUNCTION public.receive_stock(
  p_stock_item_id uuid,
  p_quantity integer DEFAULT 1,
  p_location_key text DEFAULT 'main',
  p_note text DEFAULT NULL
)
RETURNS public.stock_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item public.stock_items;
  v_balance public.stock_balances;
  v_location_key text := lower(coalesce(nullif(trim(p_location_key), ''), 'main'));
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF coalesce(p_quantity, 0) < 1 THEN
    RAISE EXCEPTION 'quantity must be >= 1';
  END IF;

  SELECT *
    INTO v_item
  FROM public.stock_items
  WHERE id = p_stock_item_id
    AND is_active = true
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'stock item not found';
  END IF;

  IF v_item.tracking_mode <> 'bulk' THEN
    RAISE EXCEPTION 'use receive_serialized_stock for serialized items';
  END IF;

  INSERT INTO public.stock_balances (stock_item_id, location_key, qty_on_hand, qty_reserved)
  VALUES (v_item.id, v_location_key, p_quantity, 0)
  ON CONFLICT (stock_item_id, location_key)
  DO UPDATE SET qty_on_hand = public.stock_balances.qty_on_hand + EXCLUDED.qty_on_hand
  RETURNING *
  INTO v_balance;

  INSERT INTO public.stock_movements (
    stock_item_id,
    movement_type,
    quantity,
    location_to,
    note,
    created_by
  ) VALUES (
    v_item.id,
    'receive',
    p_quantity,
    v_location_key,
    nullif(trim(p_note), ''),
    v_uid
  );

  RETURN v_balance;
END;
$$;

DROP FUNCTION IF EXISTS public.receive_serialized_stock(uuid, text, text, text);

CREATE FUNCTION public.receive_serialized_stock(
  p_stock_item_id uuid,
  p_serial_no text,
  p_location_key text DEFAULT 'main',
  p_note text DEFAULT NULL
)
RETURNS public.stock_units
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item public.stock_items;
  v_unit public.stock_units;
  v_location_key text := lower(coalesce(nullif(trim(p_location_key), ''), 'main'));
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF coalesce(trim(p_serial_no), '') = '' THEN
    RAISE EXCEPTION 'serial number is required';
  END IF;

  SELECT *
    INTO v_item
  FROM public.stock_items
  WHERE id = p_stock_item_id
    AND is_active = true
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'stock item not found';
  END IF;

  IF v_item.tracking_mode <> 'serialized' THEN
    RAISE EXCEPTION 'item tracking mode is not serialized';
  END IF;

  INSERT INTO public.stock_units (
    stock_item_id,
    serial_no,
    location_key,
    status
  ) VALUES (
    v_item.id,
    trim(p_serial_no),
    v_location_key,
    'in_stock'
  )
  RETURNING *
  INTO v_unit;

  INSERT INTO public.stock_balances (stock_item_id, location_key, qty_on_hand, qty_reserved)
  VALUES (v_item.id, v_location_key, 1, 0)
  ON CONFLICT (stock_item_id, location_key)
  DO UPDATE SET qty_on_hand = public.stock_balances.qty_on_hand + 1;

  INSERT INTO public.stock_movements (
    stock_item_id,
    stock_unit_id,
    movement_type,
    quantity,
    location_to,
    note,
    created_by
  ) VALUES (
    v_item.id,
    v_unit.id,
    'receive',
    1,
    v_location_key,
    nullif(trim(p_note), ''),
    v_uid
  );

  RETURN v_unit;
END;
$$;

DROP FUNCTION IF EXISTS public.issue_stock_bulk(uuid, integer, uuid, text, text, uuid, text);

CREATE FUNCTION public.issue_stock_bulk(
  p_stock_item_id uuid,
  p_quantity integer,
  p_issued_to uuid DEFAULT NULL,
  p_location_key text DEFAULT 'main',
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS public.stock_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item public.stock_items;
  v_balance public.stock_balances;
  v_location_key text := lower(coalesce(nullif(trim(p_location_key), ''), 'main'));
  v_available integer := 0;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF coalesce(p_quantity, 0) < 1 THEN
    RAISE EXCEPTION 'quantity must be >= 1';
  END IF;

  SELECT *
    INTO v_item
  FROM public.stock_items
  WHERE id = p_stock_item_id
    AND is_active = true
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'stock item not found';
  END IF;

  IF v_item.tracking_mode <> 'bulk' THEN
    RAISE EXCEPTION 'use issue_stock_unit for serialized items';
  END IF;

  SELECT *
    INTO v_balance
  FROM public.stock_balances
  WHERE stock_item_id = v_item.id
    AND location_key = v_location_key
  FOR UPDATE;

  IF v_balance.id IS NULL THEN
    RAISE EXCEPTION 'stock balance not found for location';
  END IF;

  v_available := v_balance.qty_on_hand - v_balance.qty_reserved;
  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'insufficient stock';
  END IF;

  UPDATE public.stock_balances
  SET qty_on_hand = qty_on_hand - p_quantity
  WHERE id = v_balance.id
  RETURNING *
  INTO v_balance;

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
    v_item.id,
    'issue',
    p_quantity,
    v_location_key,
    nullif(trim(p_reference_type), ''),
    p_reference_id,
    nullif(trim(p_note), ''),
    v_uid
  );

  RETURN v_balance;
END;
$$;

DROP FUNCTION IF EXISTS public.issue_stock_unit(uuid, uuid, text, uuid, text);

CREATE FUNCTION public.issue_stock_unit(
  p_stock_unit_id uuid,
  p_issued_to uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS public.stock_units
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_unit public.stock_units;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT *
    INTO v_unit
  FROM public.stock_units
  WHERE id = p_stock_unit_id
  FOR UPDATE;

  IF v_unit.id IS NULL THEN
    RAISE EXCEPTION 'stock unit not found';
  END IF;

  IF v_unit.status NOT IN ('in_stock', 'reserved') THEN
    RAISE EXCEPTION 'stock unit is not available for issue';
  END IF;

  UPDATE public.stock_units
  SET status = 'issued',
      assigned_to = p_issued_to
  WHERE id = v_unit.id
  RETURNING *
  INTO v_unit;

  UPDATE public.stock_balances
  SET qty_on_hand = qty_on_hand - 1,
      qty_reserved = CASE WHEN v_unit.status = 'reserved' THEN qty_reserved - 1 ELSE qty_reserved END
  WHERE stock_item_id = v_unit.stock_item_id
    AND location_key = v_unit.location_key;

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
    v_unit.stock_item_id,
    v_unit.id,
    'issue',
    1,
    v_unit.location_key,
    nullif(trim(p_reference_type), ''),
    p_reference_id,
    nullif(trim(p_note), ''),
    v_uid
  );

  RETURN v_unit;
END;
$$;

DROP FUNCTION IF EXISTS public.adjust_stock_balance(uuid, integer, text, text);

CREATE FUNCTION public.adjust_stock_balance(
  p_stock_item_id uuid,
  p_delta integer,
  p_location_key text DEFAULT 'main',
  p_note text DEFAULT NULL
)
RETURNS public.stock_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item public.stock_items;
  v_balance public.stock_balances;
  v_location_key text := lower(coalesce(nullif(trim(p_location_key), ''), 'main'));
  v_movement_type public.stock_movement_type;
BEGIN
  IF v_uid IS NULL OR NOT public.is_admin_or_it(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF coalesce(p_delta, 0) = 0 THEN
    RAISE EXCEPTION 'delta must not be 0';
  END IF;

  SELECT *
    INTO v_item
  FROM public.stock_items
  WHERE id = p_stock_item_id
    AND is_active = true
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'stock item not found';
  END IF;

  IF v_item.tracking_mode <> 'bulk' THEN
    RAISE EXCEPTION 'adjust_stock_balance is allowed only for bulk items';
  END IF;

  SELECT *
    INTO v_balance
  FROM public.stock_balances
  WHERE stock_item_id = v_item.id
    AND location_key = v_location_key
  FOR UPDATE;

  IF v_balance.id IS NULL THEN
    RAISE EXCEPTION 'stock balance not found for location';
  END IF;

  IF (v_balance.qty_on_hand + p_delta) < v_balance.qty_reserved THEN
    RAISE EXCEPTION 'adjustment would break reserved quantity constraint';
  END IF;

  UPDATE public.stock_balances
  SET qty_on_hand = qty_on_hand + p_delta
  WHERE id = v_balance.id
  RETURNING *
  INTO v_balance;

  v_movement_type :=
    CASE
      WHEN p_delta > 0 THEN 'adjust_increase'::public.stock_movement_type
      ELSE 'adjust_decrease'::public.stock_movement_type
    END;

  INSERT INTO public.stock_movements (
    stock_item_id,
    movement_type,
    quantity,
    location_to,
    note,
    created_by
  ) VALUES (
    v_item.id,
    v_movement_type,
    abs(p_delta),
    v_location_key,
    nullif(trim(p_note), ''),
    v_uid
  );

  RETURN v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_stock_item(text, text, text, text, integer, integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_stock(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_serialized_stock(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_stock_bulk(uuid, integer, uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_stock_unit(uuid, uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock_balance(uuid, integer, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_stock_item(text, text, text, text, integer, integer, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.receive_stock(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.receive_serialized_stock(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_stock_bulk(uuid, integer, uuid, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_stock_unit(uuid, uuid, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_stock_balance(uuid, integer, text, text) TO service_role;
