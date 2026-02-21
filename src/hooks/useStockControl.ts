import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type StockTrackingMode = 'bulk' | 'serialized';

export type StockItemRow = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  tracking_mode: StockTrackingMode;
  reorder_point: number;
  reorder_qty: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StockBalanceRow = {
  id: string;
  stock_item_id: string;
  location_key: string;
  qty_on_hand: number;
  qty_reserved: number;
  created_at: string;
  updated_at: string;
};

export type StockUnitRow = {
  id: string;
  stock_item_id: string;
  serial_no: string;
  location_key: string;
  status: 'in_stock' | 'reserved' | 'issued' | 'retired' | 'lost';
  assigned_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type StockMovementRow = {
  id: string;
  stock_item_id: string;
  stock_unit_id: string | null;
  movement_type:
    | 'receive'
    | 'issue'
    | 'adjust_increase'
    | 'adjust_decrease'
    | 'return_in'
    | 'transfer_in'
    | 'transfer_out'
    | 'reserve'
    | 'release';
  quantity: number;
  location_from: string | null;
  location_to: string | null;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockItemView = StockItemRow & {
  balances: StockBalanceRow[];
  total_on_hand: number;
  total_reserved: number;
  available: number;
};

async function fetchStockItems(): Promise<StockItemView[]> {
  const { data: items, error: itemsError } = await supabase
    .from('stock_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (itemsError) throw new Error(itemsError.message);

  const { data: balances, error: balancesError } = await supabase
    .from('stock_balances')
    .select('*');
  if (balancesError) throw new Error(balancesError.message);

  const balanceMap = new Map<string, StockBalanceRow[]>();
  for (const row of (balances ?? []) as StockBalanceRow[]) {
    const arr = balanceMap.get(row.stock_item_id) ?? [];
    arr.push(row);
    balanceMap.set(row.stock_item_id, arr);
  }

  return ((items ?? []) as StockItemRow[]).map((item) => {
    const itemBalances = balanceMap.get(item.id) ?? [];
    const totalOnHand = itemBalances.reduce((sum, b) => sum + (b.qty_on_hand ?? 0), 0);
    const totalReserved = itemBalances.reduce((sum, b) => sum + (b.qty_reserved ?? 0), 0);
    return {
      ...item,
      balances: itemBalances,
      total_on_hand: totalOnHand,
      total_reserved: totalReserved,
      available: totalOnHand - totalReserved,
    };
  });
}

async function fetchRecentStockMovements(): Promise<StockMovementRow[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as StockMovementRow[];
}

async function fetchInStockUnits(stockItemId?: string): Promise<StockUnitRow[]> {
  let query = supabase
    .from('stock_units')
    .select('*')
    .in('status', ['in_stock', 'reserved'])
    .order('created_at', { ascending: false })
    .limit(300);

  if (stockItemId) {
    query = query.eq('stock_item_id', stockItemId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as StockUnitRow[];
}

export function useStockItems() {
  return useQuery<StockItemView[], Error>({
    queryKey: ['stock-items'],
    queryFn: fetchStockItems,
  });
}

export function useRecentStockMovements() {
  return useQuery<StockMovementRow[], Error>({
    queryKey: ['stock-movements', 'recent'],
    queryFn: fetchRecentStockMovements,
  });
}

export function useInStockUnits(stockItemId?: string) {
  return useQuery<StockUnitRow[], Error>({
    queryKey: ['stock-units', 'in-stock', stockItemId ?? 'all'],
    queryFn: () => fetchInStockUnits(stockItemId),
  });
}

type CreateStockItemPayload = {
  sku: string;
  name: string;
  trackingMode: StockTrackingMode;
  category?: string | null;
  reorderPoint?: number;
  reorderQty?: number;
  locationKey?: string;
  openingQty?: number;
};

export function useCreateStockItem() {
  const queryClient = useQueryClient();
  return useMutation<StockItemRow, Error, CreateStockItemPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.rpc('create_stock_item', {
        p_sku: payload.sku,
        p_name: payload.name,
        p_tracking_mode: payload.trackingMode,
        p_category: payload.category ?? null,
        p_reorder_point: payload.reorderPoint ?? 0,
        p_reorder_qty: payload.reorderQty ?? 0,
        p_location_key: payload.locationKey ?? 'main',
        p_opening_qty: payload.openingQty ?? 0,
      });
      if (error) throw new Error(error.message);
      return data as StockItemRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

export function useReceiveStock() {
  const queryClient = useQueryClient();
  return useMutation<
    StockBalanceRow,
    Error,
    { stockItemId: string; quantity: number; locationKey?: string; note?: string }
  >({
    mutationFn: async ({ stockItemId, quantity, locationKey, note }) => {
      const { data, error } = await supabase.rpc('receive_stock', {
        p_stock_item_id: stockItemId,
        p_quantity: quantity,
        p_location_key: locationKey ?? 'main',
        p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
      return data as StockBalanceRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

export function useReceiveSerializedStock() {
  const queryClient = useQueryClient();
  return useMutation<
    StockUnitRow,
    Error,
    { stockItemId: string; serialNo: string; locationKey?: string; note?: string }
  >({
    mutationFn: async ({ stockItemId, serialNo, locationKey, note }) => {
      const { data, error } = await supabase.rpc('receive_serialized_stock', {
        p_stock_item_id: stockItemId,
        p_serial_no: serialNo,
        p_location_key: locationKey ?? 'main',
        p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
      return data as StockUnitRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-units'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

export function useIssueStockBulk() {
  const queryClient = useQueryClient();
  return useMutation<
    StockBalanceRow,
    Error,
    {
      stockItemId: string;
      quantity: number;
      locationKey?: string;
      note?: string;
      referenceType?: string;
      referenceId?: string | null;
      issuedTo?: string | null;
    }
  >({
    mutationFn: async ({
      stockItemId,
      quantity,
      locationKey,
      note,
      referenceType,
      referenceId,
      issuedTo,
    }) => {
      const { data, error } = await supabase.rpc('issue_stock_bulk', {
        p_stock_item_id: stockItemId,
        p_quantity: quantity,
        p_issued_to: issuedTo ?? null,
        p_location_key: locationKey ?? 'main',
        p_reference_type: referenceType ?? null,
        p_reference_id: referenceId ?? null,
        p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
      return data as StockBalanceRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

export function useIssueStockUnit() {
  const queryClient = useQueryClient();
  return useMutation<
    StockUnitRow,
    Error,
    {
      stockUnitId: string;
      note?: string;
      referenceType?: string;
      referenceId?: string | null;
      issuedTo?: string | null;
    }
  >({
    mutationFn: async ({ stockUnitId, note, referenceType, referenceId, issuedTo }) => {
      const { data, error } = await supabase.rpc('issue_stock_unit', {
        p_stock_unit_id: stockUnitId,
        p_issued_to: issuedTo ?? null,
        p_reference_type: referenceType ?? null,
        p_reference_id: referenceId ?? null,
        p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
      return data as StockUnitRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-units'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

export function useAdjustStockBalance() {
  const queryClient = useQueryClient();
  return useMutation<
    StockBalanceRow,
    Error,
    { stockItemId: string; delta: number; locationKey?: string; note?: string }
  >({
    mutationFn: async ({ stockItemId, delta, locationKey, note }) => {
      const { data, error } = await supabase.rpc('adjust_stock_balance', {
        p_stock_item_id: stockItemId,
        p_delta: delta,
        p_location_key: locationKey ?? 'main',
        p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
      return data as StockBalanceRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}
