import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
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
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import {
  type StockItemView,
  type StockMovementRow,
  type StockTrackingMode,
  useAdjustStockBalance,
  useCreateStockItem,
  useInStockUnits,
  useIssueStockBulk,
  useIssueStockUnit,
  useReceiveSerializedStock,
  useReceiveStock,
  useRecentStockMovements,
  useStockItems,
} from '@/hooks/useStockControl';

type OperationType = 'receive' | 'issue' | 'adjust';

const MOVEMENT_STYLE_MAP: Record<
  StockMovementRow['movement_type'],
  { label: string; className: string; qtyClass: string }
> = {
  issue: { label: 'Issued', className: 'text-blue-600', qtyClass: 'text-red-600' },
  receive: { label: 'Received', className: 'text-green-600', qtyClass: 'text-green-600' },
  adjust_increase: { label: 'Adjusted', className: 'text-amber-600', qtyClass: 'text-green-600' },
  adjust_decrease: { label: 'Adjusted', className: 'text-amber-600', qtyClass: 'text-amber-600' },
  return_in: { label: 'Returned', className: 'text-green-600', qtyClass: 'text-green-600' },
  transfer_in: { label: 'Transfer In', className: 'text-green-600', qtyClass: 'text-green-600' },
  transfer_out: { label: 'Transfer Out', className: 'text-blue-600', qtyClass: 'text-red-600' },
  reserve: { label: 'Reserved', className: 'text-amber-600', qtyClass: 'text-amber-600' },
  release: { label: 'Released', className: 'text-slate-500', qtyClass: 'text-slate-500' },
};

const formatMovementDate = (value: string) => format(new Date(value), 'MMM d, h:mm a');

const getStatus = (item: StockItemView) => {
  if (item.reorder_point > 0 && item.available <= item.reorder_point) {
    return {
      label: 'LOW STOCK',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      rowClass: 'bg-orange-50/30 dark:bg-orange-900/5',
    };
  }

  return {
    label: 'IN STOCK',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rowClass: '',
  };
};

function MetricCard({
  icon,
  iconClass,
  label,
  value,
  subtext,
  subtextClass,
  danger = false,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: number;
  subtext: string;
  subtextClass: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-6 ${
        danger
          ? 'border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/10'
          : 'border-primary/10 bg-white dark:bg-slate-900'
      }`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconClass}`}>
        {icon}
      </div>
      <div>
        <p
          className={`text-xs font-bold uppercase tracking-widest ${
            danger ? 'text-orange-700 dark:text-orange-400' : 'text-slate-500'
          }`}
        >
          {label}
        </p>
        <p
          className={`mt-1 text-2xl font-black leading-none ${
            danger ? 'text-orange-800 dark:text-orange-200' : ''
          }`}
        >
          {value.toLocaleString()}
        </p>
        <p className={`mt-1 text-xs font-medium ${subtextClass}`}>{subtext}</p>
      </div>
    </div>
  );
}

function MiniOpButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-bold uppercase transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

export default function StockControlPage() {
  const { isAdmin, isIT } = useCurrentProfile();
  const canManage = isAdmin || isIT;
  const { data: stockItems = [], isLoading: itemsLoading, isError: itemsError } = useStockItems();
  const { data: movements = [], isLoading: movementLoading } = useRecentStockMovements();
  const createStockItem = useCreateStockItem();
  const receiveStock = useReceiveStock();
  const receiveSerializedStock = useReceiveSerializedStock();
  const issueStockBulk = useIssueStockBulk();
  const issueStockUnit = useIssueStockUnit();
  const adjustStockBalance = useAdjustStockBalance();

  const [search, setSearch] = useState('');
  const [operationType, setOperationType] = useState<OperationType>('receive');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOperationOpen, setIsOperationOpen] = useState(false);

  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newMode, setNewMode] = useState<StockTrackingMode>('bulk');
  const [newReorderPoint, setNewReorderPoint] = useState('0');
  const [newReorderQty, setNewReorderQty] = useState('0');
  const [newOpeningQty, setNewOpeningQty] = useState('0');
  const [newLocationKey, setNewLocationKey] = useState('main');

  const [operationItemId, setOperationItemId] = useState('');
  const [locationKey, setLocationKey] = useState('main');
  const [quantity, setQuantity] = useState('1');
  const [serialInput, setSerialInput] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('0');
  const [note, setNote] = useState('');

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stockItems;
    return stockItems.filter((item) =>
      `${item.sku} ${item.name} ${item.category ?? ''}`.toLowerCase().includes(q)
    );
  }, [search, stockItems]);
  const selectedItem = useMemo(
    () => stockItems.find((item) => item.id === operationItemId) ?? null,
    [operationItemId, stockItems]
  );
  const { data: inStockUnits = [] } = useInStockUnits(
    selectedItem?.tracking_mode === 'serialized' ? selectedItem.id : undefined
  );
  const totalOnHand = useMemo(() => stockItems.reduce((acc, item) => acc + item.total_on_hand, 0), [stockItems]);
  const totalReserved = useMemo(() => stockItems.reduce((acc, item) => acc + item.total_reserved, 0), [stockItems]);
  const totalAvailable = useMemo(() => stockItems.reduce((acc, item) => acc + item.available, 0), [stockItems]);
  const lowStockItems = useMemo(
    () => stockItems.filter((item) => item.reorder_point > 0 && item.available <= item.reorder_point),
    [stockItems]
  );

  const resetCreateForm = () => {
    setNewSku('');
    setNewName('');
    setNewCategory('');
    setNewMode('bulk');
    setNewReorderPoint('0');
    setNewReorderQty('0');
    setNewOpeningQty('0');
    setNewLocationKey('main');
  };
  const resetOperationForm = () => {
    setOperationItemId('');
    setLocationKey('main');
    setQuantity('1');
    setSerialInput('');
    setSelectedUnitId('');
    setAdjustDelta('0');
    setNote('');
  };

  const handleCreateItem = async () => {
    if (!canManage) return;
    if (!newSku.trim() || !newName.trim()) {
      notifyError('Missing required fields', 'SKU and Name are required');
      return;
    }
    const reorderPoint = Number(newReorderPoint);
    const reorderQty = Number(newReorderQty);
    const openingQty = Number(newOpeningQty);
    if (!Number.isFinite(reorderPoint) || !Number.isFinite(reorderQty) || !Number.isFinite(openingQty)) {
      notifyError('Invalid values', 'Please verify reorder and opening quantities');
      return;
    }
    try {
      await createStockItem.mutateAsync({
        sku: newSku.trim(),
        name: newName.trim(),
        trackingMode: newMode,
        category: newCategory.trim() || null,
        reorderPoint,
        reorderQty,
        locationKey: newLocationKey,
        openingQty,
      });
      notifySuccess('Stock item created');
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      notifyError('Create failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSubmitOperation = async () => {
    if (!canManage || !selectedItem) {
      notifyError('Item required', 'Please select a stock item first');
      return;
    }
    try {
      if (operationType === 'receive') {
        if (selectedItem.tracking_mode === 'bulk') {
          const qty = Number(quantity);
          if (!Number.isFinite(qty) || qty < 1) {
            notifyError('Invalid quantity', 'Quantity must be 1 or greater');
            return;
          }
          await receiveStock.mutateAsync({ stockItemId: selectedItem.id, quantity: qty, locationKey, note: note.trim() || undefined });
        } else {
          const serials = serialInput
            .split('\n')
            .map((line) => line.replace(/^S\/N:\s*/i, '').trim())
            .filter(Boolean);
          if (serials.length === 0) {
            notifyError('Missing serial numbers', 'Enter at least one serial number');
            return;
          }
          for (const serialNo of serials) {
            await receiveSerializedStock.mutateAsync({ stockItemId: selectedItem.id, serialNo, locationKey, note: note.trim() || undefined });
          }
        }
        notifySuccess('Inventory received');
      }
      if (operationType === 'issue') {
        if (selectedItem.tracking_mode === 'bulk') {
          const qty = Number(quantity);
          if (!Number.isFinite(qty) || qty < 1) {
            notifyError('Invalid quantity', 'Quantity must be 1 or greater');
            return;
          }
          await issueStockBulk.mutateAsync({
            stockItemId: selectedItem.id,
            quantity: qty,
            locationKey,
            note: note.trim() || undefined,
            referenceType: 'manual_issue',
          });
        } else {
          if (!selectedUnitId) {
            notifyError('Select stock unit', 'Choose a serialized unit to issue');
            return;
          }
          await issueStockUnit.mutateAsync({
            stockUnitId: selectedUnitId,
            note: note.trim() || undefined,
            referenceType: 'manual_issue',
          });
        }
        notifySuccess('Inventory issued');
      }
      if (operationType === 'adjust') {
        if (selectedItem.tracking_mode !== 'bulk') {
          notifyError('Unsupported operation', 'Manual adjustment only supports bulk items');
          return;
        }
        const delta = Number(adjustDelta);
        if (!Number.isFinite(delta) || delta === 0) {
          notifyError('Invalid delta', 'Adjustment must be a non-zero number');
          return;
        }
        await adjustStockBalance.mutateAsync({
          stockItemId: selectedItem.id,
          delta,
          locationKey,
          note: note.trim() || undefined,
        });
        notifySuccess('Inventory adjusted');
      }
      setIsOperationOpen(false);
      resetOperationForm();
    } catch (err) {
      notifyError('Operation failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (itemsLoading) return <LoadingSkeleton count={6} className="md:grid-cols-2 lg:grid-cols-3" />;
  if (itemsError) return <EmptyState title="Failed to load stock control data" />;

  return (
    <div className="space-y-8 bg-[#f6f6f8] p-4 text-slate-900 dark:bg-[#161220] dark:text-slate-100 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Stock Control</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Real-time inventory management and hardware tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(['receive', 'issue', 'adjust'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setOperationType(type);
                  setIsOperationOpen(true);
                }}
                className={`px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                  operationType === type
                    ? 'rounded-md bg-white shadow-sm dark:bg-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Create Stock Item</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Boxes className="h-5 w-5" />} iconClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300" label="On-Hand" value={totalOnHand} subtext="+2% from last month" subtextClass="text-green-500" />
        <MetricCard icon={<PackageCheck className="h-5 w-5" />} iconClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300" label="Reserved" value={totalReserved} subtext="Steady status" subtextClass="text-slate-400" />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} iconClass="bg-primary/5 text-primary" label="Available" value={totalAvailable} subtext="-1.2% usage spike" subtextClass="text-red-500" />
        <MetricCard icon={<AlertTriangle className="h-5 w-5" />} iconClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300" label="Low Stock" value={lowStockItems.length} subtext="Requires reorder" subtextClass="text-orange-600 dark:text-orange-500" danger />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
        <section className="overflow-hidden rounded-xl border border-primary/10 bg-white dark:bg-slate-900 xl:col-span-3">
          <div className="flex items-center justify-between border-b border-primary/10 p-6">
            <h3 className="text-lg font-bold">Inventory Status</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="h-10 w-[260px] rounded-lg border-none bg-slate-100 pl-9 text-sm shadow-none dark:bg-slate-800" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inventory, SKUs, or serials..." />
              </div>
              <button type="button" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                <SlidersHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
          {filteredItems.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No inventory items" message="Create a stock item to start managing inventory." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
                      <th className="px-6 py-4">SKU / ID</th>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4 text-center">On-Hand</th>
                      <th className="px-6 py-4 text-center">Available</th>
                      <th className="px-6 py-4 text-center">Threshold</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5 text-sm">
                    {filteredItems.slice(0, 10).map((item) => {
                      const status = getStatus(item);
                      return (
                        <tr key={item.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${status.rowClass}`}>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.sku}</td>
                          <td className="px-6 py-4 font-semibold">{item.name}</td>
                          <td className="px-6 py-4 text-xs capitalize">{item.tracking_mode}</td>
                          <td className="px-6 py-4 text-center font-bold">{item.total_on_hand}</td>
                          <td className={`px-6 py-4 text-center font-bold ${status.label === 'LOW STOCK' ? 'text-orange-600' : ''}`}>{item.available}</td>
                          <td className="px-6 py-4 text-center text-slate-400">{item.reorder_point}</td>
                          <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>{status.label}</span></td>
                          <td className="px-6 py-4 text-right">
                            <button type="button" className="text-xs font-bold uppercase text-primary transition-colors hover:text-primary/70" onClick={() => { setOperationItemId(item.id); setIsOperationOpen(true); }}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-primary/10 bg-slate-50 p-4 dark:bg-slate-800/50">
                <span className="text-xs text-slate-500">Showing 1-{Math.min(filteredItems.length, 10)} of {filteredItems.length} items</span>
                <div className="flex gap-2">
                  <button type="button" className="rounded border border-primary/10 bg-white px-3 py-1 text-xs font-bold dark:bg-slate-900">Prev</button>
                  <button type="button" className="rounded border border-primary/10 bg-white px-3 py-1 text-xs font-bold dark:bg-slate-900">Next</button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="space-y-6 xl:col-span-1">
          <section className="rounded-xl border border-primary/10 bg-white p-6 dark:bg-slate-900">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <ClipboardList className="h-5 w-5 text-primary" />
              Quick Action
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Operation Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <MiniOpButton active={operationType === 'receive'} label="Receive" onClick={() => { setOperationType('receive'); setIsOperationOpen(true); }} />
                  <MiniOpButton active={operationType === 'issue'} label="Issue" onClick={() => { setOperationType('issue'); setIsOperationOpen(true); }} />
                  <MiniOpButton active={operationType === 'adjust'} label="Adjust" onClick={() => { setOperationType('adjust'); setIsOperationOpen(true); }} />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Search SKU / Item</Label>
                <Input className="h-11 border-none bg-slate-100 text-sm shadow-none dark:bg-slate-800" placeholder="Start typing name..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button type="button" className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90" onClick={() => setIsOperationOpen(true)}>
                SUBMIT OPERATION
              </button>
            </div>
          </section>
          <section className="overflow-hidden rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/10">
            <div className="border-b border-orange-200 bg-orange-100 px-6 py-4 dark:border-orange-900/30 dark:bg-orange-900/20">
              <h3 className="flex items-center gap-2 font-bold text-orange-800 dark:text-orange-200">
                <AlertTriangle className="h-5 w-5" />
                Critical Alerts
              </h3>
            </div>
            <div className="space-y-4 p-4">
              {lowStockItems.length === 0 ? (
                <div className="rounded-lg border border-orange-200 bg-white p-4 text-sm text-orange-700 dark:border-orange-900/30 dark:bg-slate-900 dark:text-orange-300">
                  No critical stock alerts right now.
                </div>
              ) : (
                lowStockItems.slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-lg border border-orange-200 bg-white p-3 dark:border-orange-900/30 dark:bg-slate-900">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="text-xs text-slate-500">Current: {item.available} / Min: {item.reorder_point}</p>
                      </div>
                      <span className="text-sm font-black text-orange-600">-{Math.max(item.reorder_point - item.available, 0)}</span>
                    </div>
                    <button
                      type="button"
                      className="mt-3 w-full rounded bg-orange-600 py-1.5 text-xs font-bold text-white transition-colors hover:bg-orange-700"
                      onClick={() => {
                        setOperationType('receive');
                        setOperationItemId(item.id);
                        setQuantity(String(item.reorder_qty || 1));
                        setIsOperationOpen(true);
                      }}
                    >
                      Quick Reorder
                    </button>
                  </div>
                ))
              )}
              <button type="button" className="block w-full text-center text-xs font-bold text-orange-700 transition-colors hover:underline dark:text-orange-400">
                View all {lowStockItems.length} alerts
              </button>
            </div>
          </section>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-primary/10 bg-white dark:bg-slate-900">
        <div className="border-b border-primary/10 p-6">
          <h3 className="text-lg font-bold">Recent Stock Movements</h3>
        </div>
        {movementLoading ? (
          <div className="p-6">
            <LoadingSkeleton className="h-40" />
          </div>
        ) : movements.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No stock movements yet" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
                    <th className="px-6 py-3">Date / Time</th>
                    <th className="px-6 py-3">Operation</th>
                    <th className="px-6 py-3">Item / SKU</th>
                    <th className="px-6 py-3 text-center">Qty</th>
                    <th className="px-6 py-3">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5 text-sm">
                  {movements.slice(0, 8).map((movement) => {
                    const meta = MOVEMENT_STYLE_MAP[movement.movement_type];
                    const item = stockItems.find((stockItem) => stockItem.id === movement.stock_item_id);
                    const qtyText =
                      movement.movement_type === 'issue' ||
                      movement.movement_type === 'adjust_decrease' ||
                      movement.movement_type === 'transfer_out' ||
                      movement.movement_type === 'reserve'
                        ? `-${movement.quantity}`
                        : `+${movement.quantity}`;
                    return (
                      <tr key={movement.id}>
                        <td className="whitespace-nowrap px-6 py-3 text-slate-500">{formatMovementDate(movement.created_at)}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${meta.className}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <p className="font-medium">{item?.name ?? movement.stock_item_id}</p>
                          <p className="text-[10px] text-slate-400">{item?.sku ?? '-'}</p>
                        </td>
                        <td className={`px-6 py-3 text-center font-bold ${meta.qtyClass}`}>{qtyText}</td>
                        <td className="px-6 py-3 text-xs text-slate-400">{movement.reference_id || movement.note || movement.reference_type || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center p-4">
              <button type="button" className="text-xs font-bold text-primary transition-colors hover:underline">
                View full movement log
              </button>
            </div>
          </>
        )}
      </section>
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="w-[95vw] max-w-[760px] overflow-hidden rounded-xl border border-slate-200 p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader className="border-b border-slate-100 px-8 py-6 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Stock Control</span>
            <DialogTitle className="text-2xl font-black tracking-tight">Create Stock Item</DialogTitle>
            <DialogDescription>Add a new inventory SKU with tracking mode, thresholds, and opening quantity.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-8 p-8 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-6">
              <FieldGroup title="Item Identity">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="SKU"><Input value={newSku} onChange={(e) => setNewSku(e.target.value)} /></Field>
                  <Field label="Category"><Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} /></Field>
                </div>
                <Field label="Item Name"><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></Field>
              </FieldGroup>
              <FieldGroup title="Control Rules">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Tracking Mode">
                    <Select value={newMode} onValueChange={(value) => setNewMode(value as StockTrackingMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bulk">Bulk</SelectItem>
                        <SelectItem value="serialized">Serialized</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Location">
                    <Select value={newLocationKey} onValueChange={setNewLocationKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Hub</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                        <SelectItem value="spares">Spares Room</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Reorder Point"><Input value={newReorderPoint} onChange={(e) => setNewReorderPoint(e.target.value)} /></Field>
                  <Field label="Reorder Qty"><Input value={newReorderQty} onChange={(e) => setNewReorderQty(e.target.value)} /></Field>
                  <Field label="Opening Qty"><Input value={newOpeningQty} onChange={(e) => setNewOpeningQty(e.target.value)} /></Field>
                </div>
              </FieldGroup>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Summary</h3>
              <div className="mt-5 space-y-4">
                <SummaryRow label="SKU" value={newSku || 'Not set'} />
                <SummaryRow label="Name" value={newName || 'Not set'} />
                <SummaryRow label="Mode" value={newMode} />
                <SummaryRow label="Category" value={newCategory || 'Uncategorized'} />
                <SummaryRow label="Opening Qty" value={newOpeningQty || '0'} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-8 py-5 dark:border-slate-800 dark:bg-slate-800/50">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90" onClick={() => void handleCreateItem()} disabled={createStockItem.isPending}>
              {createStockItem.isPending ? 'Creating...' : 'Create Stock Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isOperationOpen} onOpenChange={(open) => { setIsOperationOpen(open); if (!open) resetOperationForm(); }}>
        <DialogContent className="w-[95vw] max-w-[860px] overflow-hidden rounded-xl border border-slate-200 p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader className="border-b border-slate-100 px-8 py-6 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Stock Control</span>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">{operationType}</DialogTitle>
            <DialogDescription>Run a {operationType} operation against current inventory.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-8 p-8 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-6">
              <FieldGroup title="Operation Setup">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Operation Type">
                    <Select value={operationType} onValueChange={(value) => setOperationType(value as OperationType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receive">Receive Inventory</SelectItem>
                        <SelectItem value="issue">Issue to User</SelectItem>
                        <SelectItem value="adjust">Inventory Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Location">
                    <Select value={locationKey} onValueChange={setLocationKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Hub</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                        <SelectItem value="spares">Spares Room</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Search SKU / Item">
                  <Select value={operationItemId || '__none__'} onValueChange={(value) => setOperationItemId(value === '__none__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Select stock item" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select item</SelectItem>
                      {stockItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.sku} - {item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              <FieldGroup title="Movement Data">
                {selectedItem?.tracking_mode === 'serialized' && operationType === 'receive' ? (
                  <Field label="Serial Numbers (Scan)">
                    <textarea className="min-h-[96px] w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800" placeholder={`S/N: 123456789\nS/N: 987654321`} value={serialInput} onChange={(e) => setSerialInput(e.target.value)} />
                  </Field>
                ) : selectedItem?.tracking_mode === 'serialized' && operationType === 'issue' ? (
                  <Field label="Serialized Unit">
                    <Select value={selectedUnitId || '__none__'} onValueChange={(value) => setSelectedUnitId(value === '__none__' ? '' : value)}>
                      <SelectTrigger><SelectValue placeholder="Choose stock unit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select unit</SelectItem>
                        {inStockUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>{unit.serial_no} ({unit.status})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : operationType === 'adjust' ? (
                  <Field label="Adjustment Delta"><Input value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} /></Field>
                ) : (
                  <Field label="Quantity"><Input value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
                )}
                <Field label="Notes">
                  <textarea className="min-h-[96px] w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800" placeholder="Optional note or reference" value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
              </FieldGroup>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Operation Summary</h3>
              <div className="mt-5 space-y-4">
                <SummaryRow label="Type" value={operationType} />
                <SummaryRow label="Item" value={selectedItem ? `${selectedItem.name} (${selectedItem.sku})` : 'No item selected'} />
                <SummaryRow label="Tracking" value={selectedItem?.tracking_mode ?? '—'} />
                <SummaryRow label={operationType === 'adjust' ? 'Delta' : 'Quantity'} value={operationType === 'adjust' ? adjustDelta || '0' : quantity || '1'} />
              </div>
              <div className="mt-5 rounded-lg border border-primary/10 bg-primary/5 p-3 text-[11px] leading-tight text-primary/80">
                {operationType === 'receive' && 'Receive operations increase available inventory and create movement logs.'}
                {operationType === 'issue' && 'Issue operations remove stock from available inventory and support serialized issuance.'}
                {operationType === 'adjust' && 'Adjust operations are intended for audit corrections and manual inventory balancing.'}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-8 py-5 dark:border-slate-800 dark:bg-slate-800/50">
            <Button variant="ghost" onClick={() => setIsOperationOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90" onClick={() => void handleSubmitOperation()} disabled={receiveStock.isPending || receiveSerializedStock.isPending || issueStockBulk.isPending || issueStockUnit.isPending || adjustStockBalance.isPending}>
              Submit Operation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
