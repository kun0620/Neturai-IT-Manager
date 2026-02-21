import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Download, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { notifyError, notifySuccess } from '@/lib/notify';
import { useAssets } from '@/hooks/useAssets';
import { useInStockUnits, useStockItems } from '@/hooks/useStockControl';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import {
  useActiveAssetLoans,
  useApproveAssetRequest,
  useAssetRequests,
  useCancelAssetRequest,
  useCreateAssetIssueRequestWithStock,
  useCreateAssetRequest,
  useRejectAssetRequest,
  useReturnAssetLoan,
} from '@/hooks/useAssetRequests';

const formatDate = (value: string | null | undefined) =>
  value ? format(new Date(value), 'dd MMM yyyy, HH:mm') : '-';

const statusClassMap: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-300',
  cancelled: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-300',
  fulfilled: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
};

export function AssetRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedRequestId = searchParams.get('requestId');
  const { profile, isAdmin, isIT } = useCurrentProfile();
  const canApprove = isAdmin || isIT;

  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const { data: stockItems = [], isLoading: stockItemsLoading } = useStockItems();
  const { data: requests = [], isLoading: requestsLoading } = useAssetRequests();
  const { data: activeLoans = [], isLoading: loansLoading } = useActiveAssetLoans();

  const createRequest = useCreateAssetRequest();
  const createIssueWithStock = useCreateAssetIssueRequestWithStock();
  const approveRequest = useApproveAssetRequest();
  const rejectRequest = useRejectAssetRequest();
  const cancelRequest = useCancelAssetRequest();
  const returnLoan = useReturnAssetLoan();

  const [assetId, setAssetId] = useState<string>('');
  const [stockItemId, setStockItemId] = useState<string>('');
  const [stockUnitId, setStockUnitId] = useState<string>('');
  const [requestType, setRequestType] = useState<'borrow' | 'issue'>('borrow');
  const [quantity, setQuantity] = useState('1');
  const [dueAt, setDueAt] = useState('');
  const [neededAt, setNeededAt] = useState('');
  const [reason, setReason] = useState('');
  const [requestView, setRequestView] = useState<'all' | 'borrow' | 'issue'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

  const selectedStockItem = useMemo(
    () => stockItems.find((item) => item.id === stockItemId) ?? null,
    [stockItemId, stockItems]
  );
  const { data: issueUnits = [] } = useInStockUnits(
    requestType === 'issue' && selectedStockItem?.tracking_mode === 'serialized'
      ? selectedStockItem.id
      : undefined
  );

  useEffect(() => {
    const queryAssetId = searchParams.get('assetId');
    const queryType = searchParams.get('type');

    if (queryAssetId) {
      setAssetId(queryAssetId);
    }
    if (queryType === 'borrow' || queryType === 'issue') {
      setRequestType(queryType);
    }

    if (queryAssetId || queryType) {
      const next = new URLSearchParams(searchParams);
      next.delete('assetId');
      next.delete('type');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (requestType === 'borrow') {
      setStockItemId('');
      setStockUnitId('');
      setNeededAt('');
      return;
    }

    setAssetId('');
    setDueAt('');
  }, [requestType]);

  useEffect(() => {
    setStockUnitId('');
  }, [stockItemId]);

  const filteredRequests = useMemo(() => {
    const base = canApprove
      ? requests
      : requests.filter((request) => request.requested_by === profile?.id);

    const byType =
      requestView === 'all'
        ? base
        : base.filter((request) => request.request_type === requestView);

    const sorted = [...byType].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'latest' ? bTime - aTime : aTime - bTime;
    });

    return sorted;
  }, [canApprove, profile?.id, requestView, requests, sortOrder]);

  const pendingApprovals = useMemo(
    () => (canApprove ? requests.filter((request) => request.status === 'pending') : []),
    [canApprove, requests]
  );

  const handleCreateRequest = async () => {
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      notifyError('Invalid quantity', 'Quantity must be at least 1');
      return;
    }

    if (requestType === 'borrow' && !assetId) {
      notifyError('Asset required', 'Please select an asset for borrow request');
      return;
    }

    if (requestType === 'borrow' && !dueAt) {
      notifyError('Due date required', 'Please set due date for borrow request');
      return;
    }

    if (requestType === 'issue' && !stockItemId) {
      notifyError('Stock item required', 'Please select a stock item for issue request');
      return;
    }

    if (requestType === 'issue' && selectedStockItem?.tracking_mode === 'serialized') {
      if (parsedQuantity !== 1) {
        notifyError('Invalid quantity', 'Serialized issue request quantity must be 1');
        return;
      }
    }

    try {
      if (requestType === 'issue') {
        await createIssueWithStock.mutateAsync({
          stockItemId,
          stockUnitId: stockUnitId || null,
          quantity: selectedStockItem?.tracking_mode === 'serialized' ? 1 : parsedQuantity,
          neededAt: neededAt || null,
          reason: reason.trim() || undefined,
        });
      } else {
        await createRequest.mutateAsync({
          assetId: assetId || null,
          requestType,
          quantity: parsedQuantity,
          dueAt: dueAt || null,
          reason: reason.trim() || undefined,
        });
      }

      notifySuccess('Request created');
      setAssetId('');
      setStockItemId('');
      setStockUnitId('');
      setQuantity('1');
      setDueAt('');
      setNeededAt('');
      setReason('');
    } catch (err) {
      notifyError('Failed to create request', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Requests</h1>
          <p className="text-sm text-muted-foreground">
            Manage borrow/issue requests, approvals, and active loans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            New Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-bold">{pendingApprovals.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Approved/Fulfilled</p>
              <p className="text-2xl font-bold">
                {requests.filter((r) => r.status === 'approved' || r.status === 'fulfilled').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Repeat2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Active Loans</p>
              <p className="text-2xl font-bold">{activeLoans.length}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-lg border p-4 space-y-4">
        <div>
          <h2 className="text-base font-medium">New request</h2>
          <p className="text-xs text-muted-foreground">
            Borrow requires asset + due date. Issue requires stock item.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-6">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={requestType}
              onValueChange={(value: 'borrow' | 'issue') => setRequestType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="borrow">Borrow</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Asset</Label>
            <Select
              value={assetId || '__none__'}
              onValueChange={(value) => setAssetId(value === '__none__' ? '' : value)}
              disabled={requestType !== 'borrow'}
            >
              <SelectTrigger>
                <SelectValue placeholder={assetsLoading ? 'Loading assets...' : 'Select asset'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name} ({asset.asset_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Stock item</Label>
            <Select
              value={stockItemId || '__none__'}
              onValueChange={(value) => setStockItemId(value === '__none__' ? '' : value)}
              disabled={requestType !== 'issue'}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={stockItemsLoading ? 'Loading stock items...' : 'Select stock item'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {stockItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.sku} - {item.name} ({item.tracking_mode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="numeric"
              disabled={requestType === 'issue' && selectedStockItem?.tracking_mode === 'serialized'}
            />
          </div>

          <div className="space-y-1">
            <Label>Due at</Label>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={requestType !== 'borrow'}
            />
          </div>

          <div className="space-y-1">
            <Label>Needed at</Label>
            <Input
              type="datetime-local"
              value={neededAt}
              onChange={(e) => setNeededAt(e.target.value)}
              disabled={requestType !== 'issue'}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Stock unit (serial)</Label>
            <Select
              value={stockUnitId || '__none__'}
              onValueChange={(value) => setStockUnitId(value === '__none__' ? '' : value)}
              disabled={
                requestType !== 'issue' ||
                selectedStockItem?.tracking_mode !== 'serialized'
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Auto-pick first available if empty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Auto-pick</SelectItem>
                {issueUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.serial_no} ({unit.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => void handleCreateRequest()}
            disabled={createRequest.isPending || createIssueWithStock.isPending}
          >
            {createRequest.isPending || createIssueWithStock.isPending ? 'Submitting...' : 'Submit request'}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">{canApprove ? 'All requests' : 'My requests'}</h2>
          {canApprove && (
            <span className="text-xs text-muted-foreground">
              Pending approvals: {pendingApprovals.length}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
          <Button
            size="sm"
            variant={requestView === 'all' ? 'default' : 'ghost'}
            onClick={() => setRequestView('all')}
            className="rounded-full"
          >
            All Requests
          </Button>
          <Button
            size="sm"
            variant={requestView === 'borrow' ? 'default' : 'ghost'}
            onClick={() => setRequestView('borrow')}
            className="rounded-full"
          >
            Borrow Only
          </Button>
          <Button
            size="sm"
            variant={requestView === 'issue' ? 'default' : 'ghost'}
            onClick={() => setRequestView('issue')}
            className="rounded-full"
          >
            Issue Only
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by</span>
            <Select
              value={sortOrder}
              onValueChange={(value: 'latest' | 'oldest') => setSortOrder(value)}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {requestsLoading ? (
          <LoadingSkeleton className="h-40" />
        ) : filteredRequests.length === 0 ? (
          <EmptyState title="No requests" message="No borrow/issue requests yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Asset / Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow
                  key={request.id}
                  className={request.id === highlightedRequestId ? 'bg-primary/5' : undefined}
                >
                  <TableCell>{formatDate(request.created_at)}</TableCell>
                  <TableCell className="capitalize">{request.request_type}</TableCell>
                  <TableCell>
                    {request.asset
                      ? `${request.asset.name} (${request.asset.asset_code})`
                      : request.stock_item
                      ? `${request.stock_item.sku} - ${request.stock_item.name}${
                          request.stock_unit ? ` / ${request.stock_unit.serial_no}` : ''
                        }`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClassMap[request.status] ?? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                      {request.status}
                    </span>
                  </TableCell>
                  <TableCell>{request.requester?.name || request.requester?.email || request.requested_by}</TableCell>
                  <TableCell className="max-w-[260px] truncate" title={request.reason ?? '-'}>
                    {request.reason || '-'}
                  </TableCell>
                  <TableCell>{formatDate(request.due_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canApprove && request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              void approveRequest
                                .mutateAsync({ requestId: request.id })
                                .then(() => notifySuccess('Request approved'))
                                .catch((err) =>
                                  notifyError(
                                    'Approve failed',
                                    err instanceof Error ? err.message : 'Unknown error'
                                  )
                                )
                            }
                            disabled={approveRequest.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              void rejectRequest
                                .mutateAsync({ requestId: request.id })
                                .then(() => notifySuccess('Request rejected'))
                                .catch((err) =>
                                  notifyError(
                                    'Reject failed',
                                    err instanceof Error ? err.message : 'Unknown error'
                                  )
                                )
                            }
                            disabled={rejectRequest.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {!canApprove &&
                        request.requested_by === profile?.id &&
                        request.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void cancelRequest
                                .mutateAsync({ requestId: request.id })
                                .then(() => notifySuccess('Request cancelled'))
                                .catch((err) =>
                                  notifyError(
                                    'Cancel failed',
                                    err instanceof Error ? err.message : 'Unknown error'
                                  )
                                )
                            }
                            disabled={cancelRequest.isPending}
                          >
                            Cancel
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-base font-medium">Active loans</h2>
        {loansLoading ? (
          <LoadingSkeleton className="h-32" />
        ) : activeLoans.length === 0 ? (
          <EmptyState title="No active loans" message="All borrowed assets are returned." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Borrowed at</TableHead>
                <TableHead>Due at</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>{loan.asset ? `${loan.asset.name} (${loan.asset.asset_code})` : loan.asset_id}</TableCell>
                  <TableCell>{loan.borrower?.name || loan.borrower?.email || loan.borrower_id}</TableCell>
                  <TableCell>{formatDate(loan.borrowed_at)}</TableCell>
                  <TableCell>{formatDate(loan.due_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void returnLoan
                          .mutateAsync({ loanId: loan.id })
                          .then(() => notifySuccess('Loan marked as returned'))
                          .catch((err) =>
                            notifyError(
                              'Return failed',
                              err instanceof Error ? err.message : 'Unknown error'
                            )
                          )
                      }
                      disabled={returnLoan.isPending}
                    >
                      Mark returned
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

export default AssetRequestsPage;
