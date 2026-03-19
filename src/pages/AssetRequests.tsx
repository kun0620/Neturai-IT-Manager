import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  History,
  Laptop,
  Monitor,
  Package2,
  RotateCcw,
  Search,
  Send,
  X,
  Webcam,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const REQUEST_STATUS_CLASS: Record<string, string> = {
  pending:
    'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  approved:
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  cancelled:
    'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  fulfilled:
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
};

const REQUEST_TYPE_META = {
  borrow: { label: 'Borrow', icon: History, iconClass: 'text-amber-500' },
  issue: { label: 'Issue', icon: Package2, iconClass: 'text-blue-500' },
} as const;

const formatShortDate = (value: string | null | undefined) =>
  value ? format(new Date(value), 'MMM d, yyyy') : '—';

const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'NA';

const getRequestDisplay = (
  request: ReturnType<typeof useAssetRequests>['data'] extends Array<infer T> ? T : never
) => {
  if (request.asset) {
    return {
      title: request.asset.name,
      subtitle: `Inventory ID: ${request.asset.asset_code}`,
    };
  }

  if (request.stock_item) {
    return {
      title: request.stock_item.name,
      subtitle: request.stock_unit?.serial_no
        ? `Serial: ${request.stock_unit.serial_no}`
        : request.stock_item.sku,
    };
  }

  return {
    title: 'General request',
    subtitle: 'No linked asset or stock item',
  };
};

const getLoanBadge = (dueAt: string | null) => {
  if (!dueAt) {
    return {
      label: 'Open loan',
      className:
        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
      progressWidth: '40%',
      progressClass: 'bg-slate-400',
    };
  }

  const diffMs = new Date(dueAt).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: 'Overdue',
      className:
        'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      progressWidth: '100%',
      progressClass: 'bg-red-500',
    };
  }

  if (diffDays <= 2) {
    return {
      label: `Due in ${diffDays}d`,
      className:
        'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
      progressWidth: '80%',
      progressClass: 'bg-amber-500',
    };
  }

  return {
    label: `Due in ${diffDays}d`,
    className:
      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
    progressWidth: '55%',
    progressClass: 'bg-primary',
  };
};

const getLoanIcon = (assetName: string | null | undefined) => {
  const normalized = (assetName ?? '').toLowerCase();
  if (normalized.includes('camera') || normalized.includes('webcam')) return Webcam;
  if (normalized.includes('monitor') || normalized.includes('display')) return Monitor;
  return Laptop;
};

export function AssetRequestsPage() {
  const [searchParams] = useSearchParams();
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

  const [activeTab, setActiveTab] = useState<'pending' | 'loans'>('pending');
  const [requestView, setRequestView] = useState<'all' | 'borrow' | 'issue'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [requestType, setRequestType] = useState<'borrow' | 'issue'>('borrow');
  const [assetId, setAssetId] = useState('');
  const [stockItemId, setStockItemId] = useState('');
  const [stockUnitIds, setStockUnitIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('1');
  const [dateValue, setDateValue] = useState('');
  const [reason, setReason] = useState('');

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId) ?? null,
    [assetId, assets]
  );
  const selectedStockItem = useMemo(
    () => stockItems.find((item) => item.id === stockItemId) ?? null,
    [stockItemId, stockItems]
  );
  const { data: issueUnits = [] } = useInStockUnits(
    requestType === 'issue' && selectedStockItem?.tracking_mode === 'serialized'
      ? selectedStockItem.id
      : undefined
  );

  const visibleRequests = useMemo(() => {
    const base = canApprove
      ? requests
      : requests.filter((request) => request.requested_by === profile?.id);

    return base.filter((request) =>
      requestView === 'all' ? true : request.request_type === requestView
    );
  }, [canApprove, profile?.id, requestView, requests]);

  const pendingRequests = useMemo(
    () => visibleRequests.filter((request) => request.status === 'pending'),
    [visibleRequests]
  );

  const tableRequests = activeTab === 'pending' ? pendingRequests : visibleRequests;
  const serializedSelectedCount =
    requestType === 'issue' && selectedStockItem?.tracking_mode === 'serialized'
      ? stockUnitIds.length
      : 0;
  const parsedQuantity = Number(quantity) || 1;
  const summaryDateLabel = dateValue ? format(new Date(dateValue), 'MMM d, yyyy') : '-- / -- / --';
  const summaryTypeLabel = requestType === 'borrow' ? 'Borrow Request' : 'Issue Request';
  const summaryItemLabel = requestType === 'borrow'
    ? selectedAsset
      ? `${selectedAsset.name} (${selectedAsset.asset_code})`
      : 'No item selected'
    : selectedStockItem
      ? `${selectedStockItem.name}${
          serializedSelectedCount > 0 ? ` / ${serializedSelectedCount} serialized units` : ''
        }`
      : 'No item selected';

  const resetCreateForm = () => {
    setRequestType('borrow');
    setAssetId('');
    setStockItemId('');
    setStockUnitIds([]);
    setQuantity('1');
    setDateValue('');
    setReason('');
  };

  const toggleStockUnitSelection = (stockUnitId: string) => {
    setStockUnitIds((current) =>
      current.includes(stockUnitId)
        ? current.filter((id) => id !== stockUnitId)
        : [...current, stockUnitId]
    );
  };

  const handleApprove = async (requestId: string) => {
    try {
      await approveRequest.mutateAsync({ requestId });
      notifySuccess('Request approved');
    } catch (err) {
      notifyError('Approve failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectRequest.mutateAsync({ requestId });
      notifySuccess('Request rejected');
    } catch (err) {
      notifyError('Reject failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await cancelRequest.mutateAsync({ requestId });
      notifySuccess('Request cancelled');
    } catch (err) {
      notifyError('Cancel failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleReturn = async (loanId: string) => {
    try {
      await returnLoan.mutateAsync({ loanId });
      notifySuccess('Loan marked as returned');
    } catch (err) {
      notifyError('Return failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleCreateRequest = async () => {
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      notifyError('Invalid quantity', 'Quantity must be at least 1');
      return;
    }

    if (requestType === 'borrow' && !assetId) {
      notifyError('Asset required', 'Please select an asset for borrow request');
      return;
    }

    if (requestType === 'issue' && !stockItemId) {
      notifyError('Stock item required', 'Please select a stock item for issue request');
      return;
    }

    if (!dateValue) {
      notifyError(
        requestType === 'borrow' ? 'Due date required' : 'Needed-by date required',
        'Please set the request date before submitting'
      );
      return;
    }

    try {
      if (requestType === 'issue') {
        if (selectedStockItem?.tracking_mode === 'serialized') {
          if (stockUnitIds.length === 0) {
            notifyError('Serialized unit required', 'Please select at least one serialized unit');
            return;
          }
          for (const stockUnitId of stockUnitIds) {
            await createIssueWithStock.mutateAsync({
              stockItemId,
              stockUnitId,
              quantity: 1,
              neededAt: dateValue || null,
              reason: reason.trim() || undefined,
            });
          }
        } else {
          await createIssueWithStock.mutateAsync({
            stockItemId,
            stockUnitId: null,
            quantity: parsedQuantity,
            neededAt: dateValue || null,
            reason: reason.trim() || undefined,
          });
        }
      } else {
        await createRequest.mutateAsync({
          assetId,
          requestType: 'borrow',
          quantity: parsedQuantity,
          dueAt: dateValue || null,
          reason: reason.trim() || undefined,
        });
      }

      notifySuccess('Request created');
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      notifyError('Failed to create request', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const createPending = createRequest.isPending || createIssueWithStock.isPending;

  return (
    <div className="space-y-6 bg-[#f6f6f8] p-4 text-slate-900 dark:bg-[#161220] dark:text-slate-100 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Asset Requests</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage hardware allocation and temporary device loans.
          </p>
        </div>
        <Button
          className="h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
          onClick={() => setIsCreateOpen(true)}
        >
          New Request
        </Button>
      </div>

      <section className="space-y-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`rounded-lg px-6 py-1.5 text-sm transition-all ${
                activeTab === 'pending'
                  ? 'bg-white font-bold text-primary shadow-sm dark:bg-slate-700'
                  : 'font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Pending Requests
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('loans')}
              className={`rounded-lg px-6 py-1.5 text-sm transition-all ${
                activeTab === 'loans'
                  ? 'bg-white font-bold text-primary shadow-sm dark:bg-slate-700'
                  : 'font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Active Loans
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="mr-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Filter by:
            </span>
            <div className="flex gap-2">
              {(['all', 'borrow', 'issue'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setRequestView(filterKey)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    requestView === filterKey
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {filterKey === 'all'
                    ? 'All'
                    : filterKey === 'borrow'
                      ? 'Borrow'
                      : 'Issue'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {requestsLoading ? (
          <div className="p-6">
            <LoadingSkeleton className="h-56" />
          </div>
        ) : tableRequests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={activeTab === 'pending' ? 'No requests found' : 'No requests available'}
              message="Try changing the request type filter or create a new request."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Request ID
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Type
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Asset Details
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Requester
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Request Date
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tableRequests.map((request) => {
                  const typeMeta = REQUEST_TYPE_META[request.request_type];
                  const display = getRequestDisplay(request);
                  const requesterName =
                    request.requester?.name ||
                    request.requester?.email ||
                    request.requested_by;
                  const TypeIcon = typeMeta.icon;

                  return (
                    <tr
                      key={request.id}
                      className={`transition-colors ${
                        request.id === highlightedRequestId
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-black ${
                            request.id === highlightedRequestId
                              ? 'text-primary'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          #{request.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`h-4 w-4 ${typeMeta.iconClass}`} />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {typeMeta.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{display.title}</span>
                          <span className="text-[10px] text-slate-400">{display.subtitle}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold dark:bg-slate-700">
                            {getInitials(requesterName)}
                          </div>
                          <span className="text-xs font-semibold">{requesterName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {formatShortDate(request.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded px-2 py-1 text-[10px] font-black uppercase ${REQUEST_STATUS_CLASS[request.status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {canApprove && request.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                className="rounded bg-green-500 px-3 py-1 text-[10px] font-bold text-white transition-colors hover:bg-green-600"
                                disabled={approveRequest.isPending}
                                onClick={() => void handleApprove(request.id)}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="rounded bg-slate-200 px-3 py-1 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                                disabled={rejectRequest.isPending}
                                onClick={() => void handleReject(request.id)}
                              >
                                Reject
                              </button>
                            </>
                          ) : !canApprove &&
                            request.requested_by === profile?.id &&
                            request.status === 'pending' ? (
                            <button
                              type="button"
                              className="rounded bg-slate-200 px-3 py-1 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                              disabled={cancelRequest.isPending}
                              onClick={() => void handleCancel(request.id)}
                            >
                              Cancel Request
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-primary transition-colors hover:text-primary/70"
                            >
                              •••
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight">Active Loans</h2>
          <button
            type="button"
            className="text-xs font-bold text-primary transition-colors hover:underline"
            onClick={() => setActiveTab('loans')}
          >
            View All Loans →
          </button>
        </div>

        {loansLoading ? (
          <LoadingSkeleton className="h-48" />
        ) : activeLoans.length === 0 ? (
          <EmptyState title="No active loans" message="All borrowed assets are already returned." />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {activeLoans.slice(0, 3).map((loan, index) => {
              const badge = getLoanBadge(loan.due_at);
              const borrowerName =
                loan.borrower?.name || loan.borrower?.email || loan.borrower_id;
              const assetName = loan.asset?.name ?? loan.asset_id;
              const assetCode = loan.asset?.asset_code ?? `#${loan.id.slice(0, 8)}`;
              const LoanIcon = getLoanIcon(assetName);

              return (
                <div
                  key={loan.id}
                  className={`group relative overflow-hidden rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
                    index === 2 && activeLoans.length > 2
                      ? 'border-dashed border-slate-300 bg-slate-50 opacity-80 dark:border-slate-700 dark:bg-slate-800/30'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  {index === 2 && activeLoans.length > 2 ? (
                    <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-center">
                      <Package2 className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-bold text-slate-500">Quick-assign item</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Direct issue from existing stock
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="absolute right-0 top-0 p-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 text-primary dark:bg-slate-800">
                          <LoanIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="truncate text-sm font-bold">{assetName}</h4>
                          <p className="mb-2 text-[10px] text-slate-500">
                            Loaned to{' '}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {borrowerName}
                            </span>
                          </p>
                          <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${badge.progressClass}`}
                              style={{ width: badge.progressWidth }}
                            />
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400">
                              {assetCode}
                            </span>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-[10px] font-black uppercase text-primary transition-all hover:gap-2"
                              disabled={returnLoan.isPending}
                              onClick={() => void handleReturn(loan.id)}
                            >
                              Mark Returned
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[80px]" />

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="w-[95vw] max-w-[800px] overflow-hidden rounded-xl border border-slate-200 p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader className="relative gap-1 border-b border-slate-100 px-8 py-6 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Asset Requests
            </span>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              New Request
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Create a borrow request or issue request from available stock.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto p-8">
            <div className="flex flex-col gap-8">
              <div className="flex justify-center">
                <div className="flex h-11 w-full max-w-sm items-center justify-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRequestType('borrow');
                      setStockItemId('');
                      setStockUnitIds([]);
                    }}
                    className={`h-full grow rounded-lg px-2 text-sm font-semibold transition-all ${
                      requestType === 'borrow'
                        ? 'bg-white text-primary shadow-sm dark:bg-slate-700'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Borrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestType('issue');
                      setAssetId('');
                      setStockUnitIds([]);
                    }}
                    className={`h-full grow rounded-lg px-2 text-sm font-semibold transition-all ${
                      requestType === 'issue'
                        ? 'bg-white text-primary shadow-sm dark:bg-slate-700'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Issue
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 flex flex-col gap-6 lg:col-span-7">
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Inventory Source
                      </span>
                      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                    </div>

                    {requestType === 'borrow' ? (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Asset
                        </Label>
                        <Select value={assetId || '__none__'} onValueChange={(value) => setAssetId(value === '__none__' ? '' : value)}>
                          <SelectTrigger className="h-11 border-slate-200 bg-slate-50 text-sm shadow-none dark:border-slate-700 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                              <Search className="h-4 w-4 text-slate-400" />
                              <SelectValue placeholder={assetsLoading ? 'Loading inventory...' : 'Search inventory...'} />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select asset</SelectItem>
                            {assets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                {asset.name} ({asset.asset_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Stock Item
                          </Label>
                          <Select value={stockItemId || '__none__'} onValueChange={(value) => {
                            setStockItemId(value === '__none__' ? '' : value);
                            setStockUnitIds([]);
                          }}>
                            <SelectTrigger className="h-11 border-slate-200 bg-slate-50 text-sm shadow-none dark:border-slate-700 dark:bg-slate-800/50">
                              <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-slate-400" />
                                <SelectValue placeholder={stockItemsLoading ? 'Loading inventory...' : 'Search inventory...'} />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Select stock item</SelectItem>
                              {stockItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.sku} - {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedStockItem?.tracking_mode === 'serialized' && (
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Stock Units / Serial
                            </Label>
                            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  onClick={() => setStockUnitIds(issueUnits.map((unit) => unit.id))}
                                >
                                  Select all
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  onClick={() => setStockUnitIds([])}
                                >
                                  Clear
                                </button>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {serializedSelectedCount} selected
                                </span>
                              </div>
                              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                                {issueUnits.map((unit) => {
                                  const isSelected = stockUnitIds.includes(unit.id);
                                  return (
                                    <button
                                      key={unit.id}
                                      type="button"
                                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                                        isSelected
                                          ? 'border-primary bg-primary/10 text-primary'
                                          : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                      }`}
                                      onClick={() => toggleStockUnitSelection(unit.id)}
                                    >
                                      <span>{unit.serial_no}</span>
                                      <span className="text-xs uppercase">{unit.status}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex w-32 flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Quantity
                      </Label>
                      <Input
                        className="h-11 border-slate-200 bg-slate-50 text-sm shadow-none dark:border-slate-700 dark:bg-slate-800/50"
                        min="1"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        disabled={requestType === 'issue' && selectedStockItem?.tracking_mode === 'serialized'}
                      />
                    </div>
                  </section>

                  <section className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Request Details
                      </span>
                      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {requestType === 'borrow' ? 'Due Date' : 'Needed By'}
                      </Label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                        </div>
                        <Input
                          className="h-11 border-slate-200 bg-slate-50 pl-10 text-sm shadow-none dark:border-slate-700 dark:bg-slate-800/50"
                          type="date"
                          value={dateValue}
                          onChange={(e) => setDateValue(e.target.value)}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Business Need
                      </span>
                      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Reason Justification
                      </Label>
                      <textarea
                        className="min-h-[92px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800/50"
                        placeholder="Explain why this asset is required..."
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  </section>
                </div>

                <div className="col-span-12 lg:col-span-5">
                  <div className="sticky top-0 flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Request Summary
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">
                          Type
                        </span>
                        <div className="flex items-center gap-2 text-primary">
                          <RotateCcw className="h-4 w-4" />
                          <span className="text-sm font-bold">{summaryTypeLabel}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase text-slate-400">
                          Selected Item
                        </span>
                        <span className={`text-sm font-medium ${summaryItemLabel === 'No item selected' ? 'italic text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {summaryItemLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase text-slate-400">
                            Quantity
                          </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {(requestType === 'issue' && selectedStockItem?.tracking_mode === 'serialized'
                              ? serializedSelectedCount
                              : parsedQuantity)} unit
                            {(requestType === 'issue' && selectedStockItem?.tracking_mode === 'serialized'
                              ? serializedSelectedCount
                              : parsedQuantity) > 1
                              ? 's'
                              : ''}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase text-slate-400">
                            Date
                          </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {summaryDateLabel}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {getInitials(profile?.name || profile?.email || 'User')}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-none text-slate-900 dark:text-slate-100">
                            {profile?.name || profile?.email || 'Current user'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {isAdmin ? 'Administrator' : isIT ? 'IT Specialist' : 'Requester'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-primary/10 bg-primary/5 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
                      <p className="text-[11px] leading-tight text-primary/80">
                        {requestType === 'borrow'
                          ? 'Borrow requests require manager approval and must be returned by the due date.'
                          : 'Issue requests allocate stock permanently or until separately returned.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-8 py-6 dark:border-slate-800 dark:bg-slate-800/50">
            <button
              type="button"
              className="px-5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                onClick={() => notifySuccess('Draft saved locally', 'This is currently a UI-only draft action.')}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-primary px-8 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={createPending}
                onClick={() => void handleCreateRequest()}
              >
                <span>{createPending ? 'Submitting...' : 'Submit Request'}</span>
                {!createPending && <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AssetRequestsPage;
