import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type AssetRequestRow = {
  id: string;
  asset_id: string | null;
  stock_item_id: string | null;
  stock_unit_id: string | null;
  request_type: 'borrow' | 'issue';
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'fulfilled';
  requested_by: string;
  approved_by: string | null;
  reason: string | null;
  decision_note: string | null;
  needed_at: string | null;
  due_at: string | null;
  approved_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetRequestItem = AssetRequestRow & {
  asset: {
    id: string;
    name: string;
    asset_code: string;
    status: string;
  } | null;
  requester: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  approver: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  stock_item: {
    id: string;
    sku: string;
    name: string;
    tracking_mode: 'bulk' | 'serialized';
  } | null;
  stock_unit: {
    id: string;
    serial_no: string;
    status: 'in_stock' | 'reserved' | 'issued' | 'retired' | 'lost';
  } | null;
};

export type AssetLoanItem = {
  id: string;
  asset_id: string;
  borrower_id: string;
  issued_by: string;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  request_id: string | null;
  return_condition: string | null;
  notes: string | null;
  asset: {
    id: string;
    name: string;
    asset_code: string;
    status: string;
  } | null;
  borrower: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

async function fetchAssetRequests(): Promise<AssetRequestItem[]> {
  const { data, error } = await supabase
    .from('asset_requests')
    .select(`
      *,
      asset:assets(id, name, asset_code, status),
      requester:profiles!asset_requests_requested_by_fkey(id, name, email),
      approver:profiles!asset_requests_approved_by_fkey(id, name, email),
      stock_item:stock_items(id, sku, name, tracking_mode),
      stock_unit:stock_units(id, serial_no, status)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AssetRequestItem[];
}

async function fetchActiveLoans(): Promise<AssetLoanItem[]> {
  const { data, error } = await supabase
    .from('asset_loans')
    .select(`
      *,
      asset:assets(id, name, asset_code, status),
      borrower:profiles!asset_loans_borrower_id_fkey(id, name, email)
    `)
    .is('returned_at', null)
    .order('due_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AssetLoanItem[];
}

export function useAssetRequests() {
  return useQuery<AssetRequestItem[], Error>({
    queryKey: ['asset-requests'],
    queryFn: fetchAssetRequests,
  });
}

export function useActiveAssetLoans() {
  return useQuery<AssetLoanItem[], Error>({
    queryKey: ['asset-loans', 'active'],
    queryFn: fetchActiveLoans,
  });
}

type CreateAssetRequestPayload = {
  assetId: string | null;
  requestType: 'borrow' | 'issue';
  quantity: number;
  reason?: string;
  neededAt?: string | null;
  dueAt?: string | null;
};

export function useCreateAssetRequest() {
  const queryClient = useQueryClient();
  return useMutation<AssetRequestRow, Error, CreateAssetRequestPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.rpc('create_asset_request', {
        p_asset_id: payload.assetId,
        p_request_type: payload.requestType,
        p_quantity: payload.quantity,
        p_reason: payload.reason ?? null,
        p_needed_at: payload.neededAt ?? null,
        p_due_at: payload.dueAt ?? null,
      });
      if (error) throw new Error(error.message);
      return data as AssetRequestRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['asset-loans'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

type CreateAssetIssueWithStockPayload = {
  stockItemId: string;
  quantity: number;
  reason?: string;
  neededAt?: string | null;
  stockUnitId?: string | null;
};

export function useCreateAssetIssueRequestWithStock() {
  const queryClient = useQueryClient();
  return useMutation<AssetRequestRow, Error, CreateAssetIssueWithStockPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.rpc('create_asset_issue_request_with_stock', {
        p_stock_item_id: payload.stockItemId,
        p_quantity: payload.quantity,
        p_reason: payload.reason ?? null,
        p_needed_at: payload.neededAt ?? null,
        p_stock_unit_id: payload.stockUnitId ?? null,
      });
      if (error) throw new Error(error.message);
      return data as AssetRequestRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-units'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

export function useApproveAssetRequest() {
  const queryClient = useQueryClient();
  return useMutation<AssetRequestRow, Error, { requestId: string; decisionNote?: string }>({
    mutationFn: async ({ requestId, decisionNote }) => {
      const { data, error } = await supabase.rpc('approve_asset_request', {
        p_request_id: requestId,
        p_decision_note: decisionNote ?? null,
      });
      if (error) throw new Error(error.message);
      return data as AssetRequestRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['asset-loans'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useRejectAssetRequest() {
  const queryClient = useQueryClient();
  return useMutation<AssetRequestRow, Error, { requestId: string; decisionNote?: string }>({
    mutationFn: async ({ requestId, decisionNote }) => {
      const { data, error } = await supabase.rpc('reject_asset_request', {
        p_request_id: requestId,
        p_decision_note: decisionNote ?? null,
      });
      if (error) throw new Error(error.message);
      return data as AssetRequestRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['asset-loans'] });
    },
  });
}

export function useCancelAssetRequest() {
  const queryClient = useQueryClient();
  return useMutation<AssetRequestRow, Error, { requestId: string }>({
    mutationFn: async ({ requestId }) => {
      const { data, error } = await supabase.rpc('cancel_asset_request', {
        p_request_id: requestId,
      });
      if (error) throw new Error(error.message);
      return data as AssetRequestRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] });
    },
  });
}

export function useReturnAssetLoan() {
  const queryClient = useQueryClient();
  return useMutation<
    AssetLoanItem,
    Error,
    { loanId: string; returnCondition?: string; notes?: string }
  >({
    mutationFn: async ({ loanId, returnCondition, notes }) => {
      const { data, error } = await supabase.rpc('return_asset_loan', {
        p_loan_id: loanId,
        p_return_condition: returnCondition ?? null,
        p_notes: notes ?? null,
      });
      if (error) throw new Error(error.message);
      return data as unknown as AssetLoanItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] });
      queryClient.invalidateQueries({ queryKey: ['asset-loans'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
