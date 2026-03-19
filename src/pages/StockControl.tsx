import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Download,
  Boxes,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  PackageOpen,
  Plus,
  QrCode,
  Search,
  SlidersHorizontal,
  Warehouse,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { notifyError, notifySuccess } from '@/lib/notify';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useUsersForAssignment } from '@/hooks/useUsers';
import {
  type StockItemView,
  type StockMovementRow,
  type StockTrackingMode,
  useAdjustStockBalance,
  useCreateStockItem,
  useDeleteStockItem,
  useInStockUnits,
  useIssueStockBulk,
  useIssueStockUnit,
  useReceiveSerializedStock,
  useReceiveStock,
  useRecentStockMovements,
  useStockItems,
  useUpdateStockItem,
} from '@/hooks/useStockControl';

type OperationType = 'receive' | 'issue' | 'borrow' | 'adjust';

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
  if (!item.is_active) {
    return {
      label: 'INACTIVE',
      className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      rowClass: 'bg-slate-50/40 dark:bg-slate-900/10',
    };
  }

  if (item.total_on_hand <= 0) {
    return {
      label: 'OUT OF STOCK',
      className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
      rowClass: 'bg-rose-50/30 dark:bg-rose-900/5',
    };
  }

  if (item.available <= 0 && item.total_reserved > 0) {
    return {
      label: 'RESERVED',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      rowClass: 'bg-amber-50/30 dark:bg-amber-900/5',
    };
  }

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

const LOCATION_OPTIONS = [
  { value: 'main', label: 'Main Warehouse' },
  { value: 'warehouse', label: 'Office A - Shelf 2' },
  { value: 'spares', label: 'Spares Room' },
] as const;

const CATEGORY_OPTIONS = ['Hardware', 'Software', 'Peripherals'] as const;
const TEAM_OPTIONS = [
  'Product Engineering',
  'Marketing & Communications',
  'Human Resources',
  'Executive Leadership',
] as const;
const ADJUSTMENT_METHOD_OPTIONS = [
  'set_balance',
  'increase',
  'decrease',
] as const;
const ADJUSTMENT_REASON_OPTIONS = [
  'Manual Correction',
  'Damage / Broken',
  'Loss / Theft',
  'Inventory Count Audit',
  'Returned to Vendor',
] as const;

export default function StockControlPage() {
  const navigate = useNavigate();
  const { isAdmin, isIT } = useCurrentProfile();
  const canManage = isAdmin || isIT;
  const { data: stockItems = [], isLoading: itemsLoading, isError: itemsError } = useStockItems();
  const { data: movements = [], isLoading: movementLoading } = useRecentStockMovements();
  const { data: users = [] } = useUsersForAssignment();
  const createStockItem = useCreateStockItem();
  const updateStockItem = useUpdateStockItem();
  const deleteStockItem = useDeleteStockItem();
  const receiveStock = useReceiveStock();
  const receiveSerializedStock = useReceiveSerializedStock();
  const issueStockBulk = useIssueStockBulk();
  const issueStockUnit = useIssueStockUnit();
  const adjustStockBalance = useAdjustStockBalance();

  const [search, setSearch] = useState('');
  const [operationType, setOperationType] = useState<OperationType>('receive');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isOperationOpen, setIsOperationOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<StockItemView | null>(null);

  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Hardware');
  const [newMode, setNewMode] = useState<StockTrackingMode>('bulk');
  const [newReorderPoint, setNewReorderPoint] = useState('0');
  const [newReorderQty, setNewReorderQty] = useState('0');
  const [newOpeningQty, setNewOpeningQty] = useState('0');
  const [newLocationKey, setNewLocationKey] = useState('main');
  const [newBrand, setNewBrand] = useState('');
  const [isWarrantyTracking, setIsWarrantyTracking] = useState(true);

  const [operationItemId, setOperationItemId] = useState('');
  const [locationKey, setLocationKey] = useState('main');
  const [quantity, setQuantity] = useState('1');
  const [serialInput, setSerialInput] = useState('');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [adjustDelta, setAdjustDelta] = useState('0');
  const [note, setNote] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [receiveSource, setReceiveSource] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [issueAssigneeId, setIssueAssigneeId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [borrowDueDate, setBorrowDueDate] = useState('');
  const [destinationTeam, setDestinationTeam] = useState(TEAM_OPTIONS[0]);
  const [adjustmentMethod, setAdjustmentMethod] = useState<(typeof ADJUSTMENT_METHOD_OPTIONS)[number]>('set_balance');
  const [adjustmentReason, setAdjustmentReason] = useState(ADJUSTMENT_REASON_OPTIONS[0]);
  const [authorizedBy, setAuthorizedBy] = useState('');

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
  const selectedSerializedUnits = useMemo(
    () => inStockUnits.filter((unit) => selectedUnitIds.includes(unit.id)),
    [inStockUnits, selectedUnitIds]
  );
  const selectedSerializedCount = selectedUnitIds.length;
  const totalOnHand = useMemo(() => stockItems.reduce((acc, item) => acc + item.total_on_hand, 0), [stockItems]);
  const totalReserved = useMemo(() => stockItems.reduce((acc, item) => acc + item.total_reserved, 0), [stockItems]);
  const totalAvailable = useMemo(() => stockItems.reduce((acc, item) => acc + item.available, 0), [stockItems]);
  const lowStockItems = useMemo(
    () => stockItems.filter((item) => item.reorder_point > 0 && item.available <= item.reorder_point),
    [stockItems]
  );
  const selectedCreateLocationLabel =
    LOCATION_OPTIONS.find((option) => option.value === newLocationKey)?.label ?? 'Main Warehouse';
  const selectedOperationLocationLabel =
    LOCATION_OPTIONS.find((option) => option.value === locationKey)?.label ?? 'Main Warehouse';
  const selectedAssignee = useMemo(
    () => users.find((user) => user.id === issueAssigneeId) ?? null,
    [users, issueAssigneeId]
  );
  const receiveQuantityValue =
    selectedItem?.tracking_mode === 'serialized'
      ? serialInput
          .split('\n')
          .map((line) => line.replace(/^S\/N:\s*/i, '').trim())
          .filter(Boolean).length
      : Number(quantity || 0);
  const resultingBalance =
    selectedItem == null
      ? null
      : operationType === 'receive'
        ? selectedItem.total_on_hand + (Number.isFinite(receiveQuantityValue) ? receiveQuantityValue : 0)
        : operationType === 'issue' || operationType === 'borrow'
          ? selectedItem.total_on_hand - (selectedItem.tracking_mode === 'serialized' ? selectedSerializedCount : Number(quantity || 0))
          : selectedItem.tracking_mode === 'serialized'
            ? selectedItem.total_on_hand - selectedSerializedCount
          : adjustmentMethod === 'set_balance'
            ? Number(adjustDelta || 0)
            : adjustmentMethod === 'increase'
              ? selectedItem.total_on_hand + Number(adjustDelta || 0)
              : selectedItem.total_on_hand - Number(adjustDelta || 0);

  const resetCreateForm = () => {
    setEditingItemId(null);
    setNewSku('');
    setNewName('');
    setNewCategory('Hardware');
    setNewMode('bulk');
    setNewReorderPoint('0');
    setNewReorderQty('0');
    setNewOpeningQty('0');
    setNewLocationKey('main');
    setNewBrand('');
    setIsWarrantyTracking(true);
  };
  const resetOperationForm = () => {
    setOperationItemId('');
    setLocationKey('main');
    setQuantity('1');
    setSerialInput('');
    setSelectedUnitIds([]);
    setAdjustDelta('0');
    setNote('');
    setReferenceId('');
    setReceiveSource('');
    setReceivedDate('');
    setIssueAssigneeId('');
    setIssueDate('');
    setBorrowDueDate('');
    setDestinationTeam(TEAM_OPTIONS[0]);
    setAdjustmentMethod('set_balance');
    setAdjustmentReason(ADJUSTMENT_REASON_OPTIONS[0]);
    setAuthorizedBy('');
  };
  useEffect(() => {
    if (
      operationType === 'adjust' &&
      selectedItem?.tracking_mode === 'serialized' &&
      adjustmentMethod !== 'decrease'
    ) {
      setAdjustmentMethod('decrease');
    }
  }, [operationType, selectedItem?.tracking_mode, adjustmentMethod]);

  const toggleSerializedUnitSelection = (stockUnitId: string) => {
    setSelectedUnitIds((current) =>
      current.includes(stockUnitId)
        ? current.filter((id) => id !== stockUnitId)
        : [...current, stockUnitId]
    );
  };

  const openEditItemDialog = (item: StockItemView) => {
    setEditingItemId(item.id);
    setNewSku(item.sku);
    setNewName(item.name);
    setNewCategory(item.category?.trim() || 'Hardware');
    setNewMode(item.tracking_mode);
    setNewReorderPoint(String(item.reorder_point ?? 0));
    setNewReorderQty(String(item.reorder_qty ?? 0));
    setNewOpeningQty('0');
    setNewLocationKey(item.balances[0]?.location_key ?? 'main');
    setNewBrand('');
    setIsWarrantyTracking(true);
    setIsCreateOpen(true);
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
      if (editingItemId) {
        await updateStockItem.mutateAsync({
          stockItemId: editingItemId,
          sku: newSku.trim(),
          name: newName.trim(),
          category: newCategory.trim() || null,
          reorderPoint,
          reorderQty,
        });
        notifySuccess('Stock item updated');
      } else {
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
      }
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      notifyError(
        editingItemId ? 'Update failed' : 'Create failed',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  };

  const handleDeleteItem = async () => {
    if (!canManage || !deleteItem) return;
    try {
      await deleteStockItem.mutateAsync({ stockItemId: deleteItem.id });
      notifySuccess('Stock item deleted');
      if (operationItemId === deleteItem.id) {
        setIsOperationOpen(false);
        resetOperationForm();
      }
      setDeleteItem(null);
    } catch (err) {
      notifyError('Delete failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const goToAssetRequests = () => {
    navigate('/assets?section=requests');
  };

  const buildIssueLikeNote = (mode: 'issue' | 'borrow') => {
    const parts = [
      mode === 'borrow' ? 'Borrow Transaction' : 'Issue Transaction',
      issueDate ? `Date: ${issueDate}` : null,
      mode === 'borrow' && borrowDueDate ? `Due: ${borrowDueDate}` : null,
      destinationTeam ? `Team: ${destinationTeam}` : null,
      note.trim() || null,
    ];
    return parts.filter(Boolean).join(' | ') || undefined;
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
      if (operationType === 'issue' || operationType === 'borrow') {
        const issueLikeNote = buildIssueLikeNote(operationType);
        if (!issueAssigneeId) {
          notifyError(
            operationType === 'borrow' ? 'Borrower required' : 'Assignee required',
            operationType === 'borrow'
              ? 'Please select who is borrowing this item'
              : 'Please select who will receive this item'
          );
          return;
        }
        if (operationType === 'borrow' && !borrowDueDate) {
          notifyError('Due date required', 'Please choose a due date for this borrow transaction');
          return;
        }
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
            note: issueLikeNote,
            referenceType: operationType === 'borrow' ? 'manual_borrow' : 'manual_issue',
            referenceId: referenceId.trim() || null,
            issuedTo: issueAssigneeId,
          });
        } else {
          if (selectedUnitIds.length === 0) {
            notifyError('Select stock units', 'Choose at least one serialized unit to issue');
            return;
          }
          for (const stockUnitId of selectedUnitIds) {
            await issueStockUnit.mutateAsync({
              stockUnitId,
              note: issueLikeNote,
              referenceType: operationType === 'borrow' ? 'manual_borrow' : 'manual_issue',
              referenceId: referenceId.trim() || null,
              issuedTo: issueAssigneeId,
            });
          }
        }
        notifySuccess(operationType === 'borrow' ? 'Borrow recorded' : 'Inventory issued');
      }
      if (operationType === 'adjust') {
        if (selectedItem.tracking_mode === 'serialized') {
          if (adjustmentMethod !== 'decrease') {
            notifyError(
              'Unsupported adjustment method',
              'Serialized adjustment supports decrease only'
            );
            return;
          }
          if (selectedUnitIds.length === 0) {
            notifyError(
              'Select stock units',
              'Choose at least one serialized unit to adjust'
            );
            return;
          }
          const composedNote =
            [
              'Serialized Adjustment',
              adjustmentReason,
              authorizedBy ? `Authorized By: ${authorizedBy}` : null,
              note.trim() || null,
            ]
              .filter(Boolean)
              .join(' | ') || undefined;

          for (const stockUnitId of selectedUnitIds) {
            await issueStockUnit.mutateAsync({
              stockUnitId,
              note: composedNote,
              referenceType: 'manual_adjust',
              referenceId: referenceId.trim() || null,
            });
          }
          notifySuccess('Inventory adjusted');
          setIsOperationOpen(false);
          resetOperationForm();
          return;
        }

        const rawValue = Number(adjustDelta);
        if (!Number.isFinite(rawValue) || rawValue < 0) {
          notifyError('Invalid value', 'Adjustment value must be zero or greater');
          return;
        }
        const delta =
          adjustmentMethod === 'set_balance'
            ? rawValue - selectedItem.total_on_hand
            : adjustmentMethod === 'increase'
              ? rawValue
              : -rawValue;
        if (delta === 0) {
          notifyError('No adjustment required', 'The resulting balance is unchanged');
          return;
        }
        await adjustStockBalance.mutateAsync({
          stockItemId: selectedItem.id,
          delta,
          locationKey,
          note:
            [adjustmentReason, authorizedBy ? `Authorized By: ${authorizedBy}` : null, note.trim() || null]
              .filter(Boolean)
              .join(' | ') || undefined,
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
            {(['receive', 'adjust'] as const).map((type) => (
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
            className="rounded-lg border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5 dark:border-primary/20 dark:bg-slate-900"
            onClick={goToAssetRequests}
          >
            Go To Asset Requests
          </button>
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
                          <td
                            className={`px-6 py-4 text-center font-bold ${
                              status.label === 'LOW STOCK'
                                ? 'text-orange-600'
                                : status.label === 'OUT OF STOCK'
                                  ? 'text-rose-600'
                                  : status.label === 'RESERVED'
                                    ? 'text-amber-600'
                                    : ''
                            }`}
                          >
                            {item.available}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-400">{item.reorder_point}</td>
                          <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>{status.label}</span></td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                type="button"
                                className="text-xs font-bold uppercase text-primary transition-colors hover:text-primary/70"
                                onClick={() => openEditItemDialog(item)}
                                disabled={!canManage}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-xs font-bold uppercase text-red-600 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => setDeleteItem(item)}
                                disabled={!canManage}
                              >
                                Delete
                              </button>
                            </div>
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
                <div className="grid grid-cols-2 gap-2">
                  <MiniOpButton active={operationType === 'receive'} label="Receive" onClick={() => { setOperationType('receive'); setIsOperationOpen(true); }} />
                  <MiniOpButton active={operationType === 'adjust'} label="Adjust" onClick={() => { setOperationType('adjust'); setIsOperationOpen(true); }} />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Search SKU / Item</Label>
                <Input className="h-11 border-none bg-slate-100 text-sm shadow-none dark:bg-slate-800" placeholder="Start typing name..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 dark:border-primary/20 dark:bg-primary/10">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Request Workflow</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Borrow and Issue have moved to Asset Requests so approvals, due dates, and returns stay in one place.
                </p>
              </div>
              <button type="button" className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90" onClick={() => setIsOperationOpen(true)}>
                SUBMIT OPERATION
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 bg-white py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900"
                onClick={goToAssetRequests}
              >
                OPEN ASSET REQUESTS
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
        <DialogContent className="custom-scrollbar max-h-[90vh] w-[95vw] max-w-[860px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl border border-slate-200 p-0 shadow-2xl [&>button]:hidden dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader className="relative border-b border-slate-100 px-8 pb-6 pt-8 dark:border-slate-800">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Stock Control</span>
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {editingItemId ? 'Edit Stock Item' : 'Create Stock Item'}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                {editingItemId
                  ? 'Update stock item details, thresholds, and catalog information.'
                  : 'Add a new inventory SKU for bulk or serialized stock tracking.'}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-6 top-6 p-2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-6 w-6" />
            </button>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto p-8">
            <div className="grid grid-cols-12 items-start gap-8">
              <div className="col-span-12 flex flex-col gap-10 lg:col-span-7">
                <section className="flex flex-col gap-4">
                  <div className="mb-2 flex items-center gap-2">
                    <PackageOpen className="h-[18px] w-[18px] text-primary" />
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Item Basics
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Item Name
                      </span>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                        placeholder="e.g. MacBook Pro 14 M3"
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        SKU
                      </span>
                        <input
                          className={`w-full rounded-lg border px-4 py-2.5 text-slate-900 outline-none transition-all dark:text-slate-100 ${
                            newSku.trim()
                            ? 'border-slate-200 bg-slate-50 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800/50'
                            : 'border-red-500 bg-red-50/50 focus:ring-2 focus:ring-red-200 dark:border-red-500/50 dark:bg-red-900/10'
                        }`}
                          placeholder="Enter SKU code"
                          type="text"
                          value={newSku}
                          onChange={(e) => setNewSku(e.target.value)}
                          disabled={updateStockItem.isPending}
                        />
                      {!newSku.trim() ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Missing required field
                        </span>
                      ) : null}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Category
                        </span>
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                        >
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Brand
                        </span>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                          placeholder="Apple"
                          type="text"
                          value={newBrand}
                          onChange={(e) => setNewBrand(e.target.value)}
                          disabled={Boolean(editingItemId)}
                        />
                      </label>
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Stock Type
                      </span>
                      <div className="flex w-full rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setNewMode('bulk')}
                          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                            newMode === 'bulk'
                              ? 'bg-white text-primary shadow-sm dark:bg-slate-700'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                          disabled={Boolean(editingItemId)}
                        >
                          Bulk
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewMode('serialized')}
                          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                            newMode === 'serialized'
                              ? 'bg-white text-primary shadow-sm dark:bg-slate-700'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                          disabled={Boolean(editingItemId)}
                        >
                          Serialized
                        </button>
                      </div>
                      <p className="text-xs italic text-slate-500">
                        {editingItemId
                          ? 'Tracking mode is locked after creation to preserve inventory history.'
                          : 'Bulk items are tracked by quantity. Serialized items require unique identifiers.'}
                      </p>
                      {newMode === 'serialized' ? (
                        <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 dark:bg-primary/10">
                          <div className="flex gap-3">
                            <QrCode className="mt-0.5 h-4 w-4 text-primary" />
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                                  Serialized Intake
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                  This SKU will require unique serial numbers for each unit. Serial
                                  numbers are captured during <span className="font-semibold">Receive Stock</span>,
                                  not during stock item creation.
                                </p>
                              </div>
                              <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Serial Number Capture
                                </span>
                                <input
                                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400"
                                  value="Collected later in Receive Stock"
                                  readOnly
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

                <hr className="border-slate-100 dark:border-slate-800" />

                <section className="flex flex-col gap-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Warehouse className="h-[18px] w-[18px] text-primary" />
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Inventory Rules
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Reorder Threshold
                      </span>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                        placeholder="5"
                        type="number"
                        value={newReorderPoint}
                        onChange={(e) => setNewReorderPoint(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Default Location
                      </span>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                        value={newLocationKey}
                        onChange={(e) => setNewLocationKey(e.target.value)}
                        disabled={Boolean(editingItemId)}
                      >
                        {LOCATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-2 flex flex-col gap-4">
                    <button
                      type="button"
                      onClick={() => setIsWarrantyTracking((value) => !value)}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-left dark:border-slate-800 dark:bg-slate-800/30"
                      disabled={Boolean(editingItemId)}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Warranty Tracking
                        </span>
                        <span className="text-xs text-slate-500">
                          Track purchase dates and expiration
                        </span>
                      </div>
                      <span className="relative h-5 w-10 rounded-full bg-primary/20">
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-primary transition-all ${
                            isWarrantyTracking ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </section>
              </div>

              <div className="col-span-12 sticky top-0 lg:col-span-5">
                <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <QrCode className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Stock Item Summary
                    </h3>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium uppercase text-slate-500">Name</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {newName || 'MacBook Pro 14 M3'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium uppercase text-slate-500">SKU Code</span>
                      <span className={`text-sm font-semibold ${newSku.trim() ? 'text-slate-900 dark:text-slate-100' : 'text-red-500'}`}>
                        {newSku.trim() || 'MISSING'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium uppercase text-slate-500">Category</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {newCategory || 'Hardware'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium uppercase text-slate-500">Type</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {newMode === 'bulk' ? 'Bulk Stock' : 'Serialized'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium uppercase text-slate-500">Threshold</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {newReorderPoint || '0'} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
                      <span className="text-xs font-medium uppercase text-slate-500">Storage</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedCreateLocationLabel}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 dark:bg-primary/10">
                    <div className="flex gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 text-primary" />
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        Serialized items are tracked per unit with unique serial numbers. Change type to
                        &nbsp;"Serialized" if unique tracking is required.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-8 py-6 dark:border-slate-800 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                onClick={() =>
                  notifySuccess(
                    editingItemId ? 'Changes staged' : 'Draft saved',
                    editingItemId
                      ? 'Review the item details, then save to apply updates.'
                      : 'Create Stock Item draft is UI-only for now'
                  )
                }
              >
                {editingItemId ? 'Review Changes' : 'Save Draft'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void handleCreateItem()}
                disabled={createStockItem.isPending || updateStockItem.isPending}
              >
                {editingItemId
                  ? updateStockItem.isPending
                    ? 'Saving...'
                    : 'Save Changes'
                  : createStockItem.isPending
                    ? 'Creating...'
                    : 'Create Stock Item'}
              </button>
            </div>
          </footer>
        </DialogContent>
      </Dialog>

      <Dialog open={isOperationOpen} onOpenChange={(open) => { setIsOperationOpen(open); if (!open) resetOperationForm(); }}>
        <DialogContent className="custom-scrollbar max-h-[90vh] w-[95vw] max-w-5xl grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl border border-slate-200 p-0 shadow-2xl [&>button]:hidden dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader className="border-b border-slate-200 bg-white px-8 py-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Stock Control
              </span>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Stock Operation
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {operationType === 'receive' && 'Receive stock with clear audit-friendly inputs.'}
                    {operationType === 'adjust' && 'Adjust stock with clear audit-friendly inputs.'}
                  </DialogDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOperationOpen(false)}
                  className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="border-b border-slate-200 bg-slate-50 px-8 py-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex w-fit rounded-lg bg-slate-200/50 p-1 dark:bg-slate-800">
              {([
                ['receive', 'Receive'],
                ['adjust', 'Adjust'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOperationType(value)}
                  className={`rounded-md px-6 py-2 text-sm transition-colors ${
                    operationType === value
                      ? 'bg-white font-semibold text-primary shadow-sm dark:bg-primary dark:text-white'
                      : 'font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Stock Item
                    </label>
                    <div className="relative">
                      <select
                        className={`h-12 w-full appearance-none rounded-lg border px-4 pr-10 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${
                          stockItems.length === 0
                            ? 'cursor-not-allowed border-slate-200 bg-slate-50 italic text-slate-400 dark:bg-slate-800'
                            : 'border-slate-200 bg-white text-slate-900 dark:bg-slate-800'
                        }`}
                        value={operationItemId}
                        onChange={(e) => {
                          setOperationItemId(e.target.value);
                          setSelectedUnitIds([]);
                        }}
                        disabled={stockItems.length === 0}
                      >
                        <option value="">
                          {stockItems.length === 0 ? 'Loading stock items...' : 'Select stock item'}
                        </option>
                        {stockItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.sku} - {item.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-3 text-primary">
                        {stockItems.length === 0 ? (
                          <Boxes className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 opacity-70" />
                        )}
                      </div>
                    </div>
                  </div>

                  {operationType !== 'adjust' ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Storage Location
                      </label>
                      <select
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        value={locationKey}
                        onChange={(e) => setLocationKey(e.target.value)}
                      >
                        {LOCATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Adjustment Method
                      </label>
                      <select
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        value={adjustmentMethod}
                        onChange={(e) => setAdjustmentMethod(e.target.value as (typeof ADJUSTMENT_METHOD_OPTIONS)[number])}
                        disabled={selectedItem?.tracking_mode === 'serialized'}
                      >
                        <option value="set_balance">Set new balance</option>
                        <option value="increase">Increase quantity</option>
                        <option value="decrease">Decrease quantity</option>
                      </select>
                      {selectedItem?.tracking_mode === 'serialized' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Serialized adjustment supports decrease by selected units.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {operationType === 'adjust' ? (adjustmentMethod === 'set_balance' ? 'New Quantity' : 'Delta Quantity') : 'Quantity'}
                    </label>
                    {operationType === 'adjust' && selectedItem?.tracking_mode === 'serialized' ? (
                      <div className="flex h-12">
                        <input
                          className="h-12 flex-1 rounded-l-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="0"
                          type="number"
                          value={selectedSerializedCount || ''}
                          readOnly
                        />
                        <div className="flex items-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-100 px-4 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          SELECTED
                        </div>
                      </div>
                    ) : operationType === 'adjust' ? (
                      <input
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        placeholder="0"
                        type="number"
                        value={adjustDelta}
                        onChange={(e) => setAdjustDelta(e.target.value)}
                      />
                    ) : selectedItem?.tracking_mode === 'serialized' && operationType === 'receive' ? (
                      <div className="flex h-12">
                        <input
                          className="h-12 flex-1 rounded-l-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="0"
                          type="number"
                          value={receiveQuantityValue || ''}
                          readOnly
                        />
                        <div className="flex items-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-100 px-4 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          SERIALIZED
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-12">
                        <input
                          className="h-12 flex-1 rounded-l-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="0"
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                        />
                        <div className="flex items-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-100 px-4 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {selectedItem?.tracking_mode === 'serialized' ? 'UNIT' : 'BULK'}
                        </div>
                      </div>
                    )}
                  </div>

                  {operationType === 'receive' ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Supplier / Source
                        </label>
                        <input
                          className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="e.g. Dell Global"
                          type="text"
                          value={receiveSource}
                          onChange={(e) => setReceiveSource(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Received Date
                        </label>
                        <input
                          className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          type="date"
                          value={receivedDate}
                          onChange={(e) => setReceivedDate(e.target.value)}
                        />
                      </div>
                    </>
                  ) : operationType === 'issue' || operationType === 'borrow' ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {operationType === 'borrow' ? 'Borrower' : 'Requester / Assignee'}
                        </label>
                        <select
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          value={issueAssigneeId}
                          onChange={(e) => setIssueAssigneeId(e.target.value)}
                        >
                          <option value="">
                            {operationType === 'borrow' ? 'Select borrower' : 'Select assignee'}
                          </option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name || user.email || user.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {operationType === 'borrow' ? 'Borrow Date' : 'Issue Date'}
                        </label>
                        <input
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                        />
                      </div>
                      {operationType === 'borrow' ? (
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Due Date
                          </label>
                          <input
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            type="date"
                            value={borrowDueDate}
                            onChange={(e) => setBorrowDueDate(e.target.value)}
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Destination Team
                        </label>
                        <select
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          value={destinationTeam}
                          onChange={(e) => setDestinationTeam(e.target.value)}
                        >
                          {TEAM_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : operationType === 'adjust' ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Current Balance
                        </label>
                        <input
                          className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/50"
                          readOnly
                          type="text"
                          value={`${selectedItem?.total_on_hand ?? 0} units`}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Adjustment Reason
                        </label>
                        <select
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                        >
                          {ADJUSTMENT_REASON_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Authorized By
                        </label>
                        <input
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          placeholder="Manager Name or ID"
                          type="text"
                          value={authorizedBy}
                          onChange={(e) => setAuthorizedBy(e.target.value)}
                        />
                      </div>
                    </>
                  ) : null}

                  {operationType !== 'adjust' ? (
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {operationType === 'receive'
                          ? 'Reference ID / PO Number'
                          : operationType === 'borrow'
                            ? 'Borrow Reference'
                            : 'Reference ID'}
                      </label>
                      <input
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        placeholder={
                          operationType === 'receive'
                            ? 'REF-2023-0045'
                            : operationType === 'borrow'
                              ? 'BORROW-2026-001'
                              : 'ISS-2024-0012'
                        }
                        type="text"
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value)}
                      />
                    </div>
                  ) : null}

                  {selectedItem?.tracking_mode === 'serialized' && operationType === 'receive' ? (
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Serial Numbers
                      </label>
                      <textarea
                        className="min-h-[120px] w-full resize-none rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        placeholder={`S/N: 123456789\nS/N: 987654321`}
                        value={serialInput}
                        onChange={(e) => setSerialInput(e.target.value)}
                      />
                    </div>
                  ) : selectedItem?.tracking_mode === 'serialized' && (operationType === 'issue' || operationType === 'borrow' || operationType === 'adjust') ? (
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Serialized Units
                      </label>
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
                            onClick={() => setSelectedUnitIds(inStockUnits.map((unit) => unit.id))}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
                            onClick={() => setSelectedUnitIds([])}
                          >
                            Clear
                          </button>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedSerializedCount} selected
                          </span>
                        </div>
                        <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                          {inStockUnits.map((unit) => {
                            const isSelected = selectedUnitIds.includes(unit.id);
                            return (
                              <button
                                key={unit.id}
                                type="button"
                                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                                  isSelected
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-slate-200 text-slate-700 hover:border-primary/40 dark:border-slate-700 dark:text-slate-200'
                                }`}
                                onClick={() => toggleSerializedUnitSelection(unit.id)}
                              >
                                <span>{unit.serial_no}</span>
                                <span className="text-xs uppercase">{unit.status}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {operationType === 'adjust' ? 'Comments (Optional)' : 'Notes'}
                    </label>
                    <textarea
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder={
                        operationType === 'adjust'
                          ? 'Enter additional details about this adjustment...'
                          : operationType === 'issue'
                            ? 'Add any specific details regarding this issuance...'
                            : operationType === 'borrow'
                              ? 'Add borrower notes, return expectations, or hand-off details...'
                              : 'Additional details about the delivery condition...'
                      }
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-700/50">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Operation Summary
                    </h3>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Type</span>
                      <span className={`flex items-center gap-1 font-semibold ${
                        operationType === 'receive'
                          ? 'text-green-600 dark:text-green-400'
                          : operationType === 'issue'
                            ? 'text-blue-600 dark:text-blue-400'
                            : operationType === 'borrow'
                              ? 'text-violet-600 dark:text-violet-400'
                            : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        <Download className="h-4 w-4" />
                        {operationType === 'receive' ? 'Receive' : operationType === 'issue' ? 'Stock Issue' : operationType === 'borrow' ? 'Borrow' : 'Adjust'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Item</span>
                      <span className="max-w-[180px] text-right font-medium text-slate-900 dark:text-slate-100">
                        {selectedItem ? selectedItem.name : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        {operationType === 'issue' || operationType === 'borrow' ? 'Tracking' : operationType === 'adjust' ? 'Operation Type' : 'Stock Mode'}
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        operationType === 'issue'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : operationType === 'borrow'
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                          : operationType === 'adjust'
                            ? 'bg-primary/10 text-primary'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {operationType === 'adjust'
                          ? 'ADJUST'
                          : selectedItem?.tracking_mode === 'serialized'
                            ? 'SERIALIZED'
                            : 'BULK'}
                      </span>
                    </div>
                    {operationType === 'issue' || operationType === 'borrow' ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Selected ID</span>
                          <span className="font-mono text-sm font-bold text-primary">
                            {selectedItem?.tracking_mode === 'serialized'
                              ? selectedSerializedCount > 0
                                ? `${selectedSerializedCount} units`
                                : '—'
                              : 'BULK'}
                          </span>
                        </div>
                        <div className="border-t border-slate-50 pt-4 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">Inventory Balance</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 line-through">
                                {selectedItem?.total_on_hand ?? '—'}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                                {resultingBalance ?? '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : operationType === 'adjust' ? (
                      <>
                        <hr className="border-slate-100 dark:border-slate-800" />
                        <div className="space-y-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Balance Preview
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 border-r border-slate-100 text-center dark:border-slate-800">
                              <p className="text-xs text-slate-500">Current</p>
                              <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {selectedItem?.total_on_hand ?? 0}
                              </p>
                            </div>
                            <div className="flex items-center justify-center px-3 text-slate-300">
                              <span>→</span>
                            </div>
                            <div className="flex-1 text-center">
                              <p className="text-xs text-slate-500">New</p>
                              <p className="text-lg font-bold text-primary">
                                {resultingBalance == null || Number.isNaN(resultingBalance) ? '--' : resultingBalance}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Quantity</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {operationType === 'adjust'
                              ? `${Number(adjustDelta || 0) >= 0 ? '+' : ''} ${adjustDelta || '0'} units`
                              : `${operationType === 'receive' ? '+' : '-'} ${
                                  selectedItem?.tracking_mode === 'serialized'
                                    ? operationType === 'receive'
                                      ? receiveQuantityValue || 0
                                      : selectedSerializedCount
                                    : quantity || '0'
                                } units`}
                          </span>
                        </div>
                        <hr className="border-slate-100 dark:border-slate-700" />
                        <div className="rounded-lg bg-primary/5 p-3 dark:bg-primary/10">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-primary/70 dark:text-primary/90">
                              Resulting Balance
                            </span>
                            <span className="text-base font-bold text-primary">
                              {resultingBalance == null ? '—' : `${resultingBalance} Units`}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {operationType === 'issue' || operationType === 'borrow' ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-900/20">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                          {operationType === 'borrow' ? 'Borrow Notice' : 'Stock Level Notice'}
                        </h4>
                        <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                          {operationType === 'borrow'
                            ? 'Borrowing deducts inventory from available stock now. When the item comes back, use Receive Stock to bring it into inventory again.'
                            : `Low stock warning if quantity reaches threshold. Current threshold is set to ${
                                selectedItem?.reorder_point ?? 0
                              } units.`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : operationType === 'adjust' ? (
                  <div className="flex gap-4 rounded-xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/20">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h5 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                        Audit Notification
                      </h5>
                      <p className="mt-1 text-sm leading-relaxed text-amber-800/80 dark:text-amber-400/80">
                        This action changes the inventory audit trail. This adjustment will be
                        permanently logged with your user credentials.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 rounded-xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
                    <div className="text-blue-500 dark:text-blue-400">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Serialized Units
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-blue-600 dark:text-blue-400">
                        If selected, serialized units will be created individually in the system for tracking.
                      </p>
                    </div>
                  </div>
                )}

                {operationType === 'issue' || operationType === 'borrow' ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {operationType === 'borrow' ? 'Borrow Reminder' : 'Recent Action'}
                    </h4>
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-slate-300" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">
                          {operationType === 'borrow'
                            ? borrowDueDate
                              ? `Due back on ${borrowDueDate}`
                              : 'Set a due date to track this borrow'
                            : '3 items received today'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {operationType === 'borrow'
                            ? `${selectedAssignee?.name || selectedAssignee?.email || 'Borrower not selected'} • ${selectedOperationLocationLabel}`
                            : `2 hours ago • ${selectedOperationLocationLabel}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : operationType === 'adjust' ? (
                  <div className="rounded-xl border border-primary/10 bg-primary/5 p-5 dark:border-primary/20 dark:bg-primary/10">
                    <h5 className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
                      <AlertCircle className="h-4 w-4" />
                      Quick Tips
                    </h5>
                    <ul className="space-y-2 text-xs leading-normal text-slate-600 dark:text-slate-400">
                      <li className="flex gap-2">
                        <span className="text-primary">•</span>
                        Use "Damage" reason to automatically flag items for tech inspection.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary">•</span>
                        Delta values must be positive; use the method dropdown to control direction.
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-indigo-900 opacity-90" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_58%)]" />
                    <div className="relative z-10 p-4 text-center text-white">
                      <Boxes className="mx-auto mb-2 h-8 w-8 opacity-60" />
                      <p className="text-xs font-medium uppercase tracking-widest opacity-80">
                        Inventory Management
                      </p>
                      <p className="mt-2 text-[11px] text-white/70">
                        {selectedOperationLocationLabel}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-end gap-4 border-t border-slate-200 bg-white px-8 py-5 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setIsOperationOpen(false)}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {operationType === 'adjust' ? 'Discard' : 'Cancel'}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => void handleSubmitOperation()}
              disabled={receiveStock.isPending || receiveSerializedStock.isPending || issueStockBulk.isPending || issueStockUnit.isPending || adjustStockBalance.isPending}
            >
              <Plus className="h-4 w-4" />
              {operationType === 'receive' ? 'Receive Stock' : operationType === 'issue' ? 'Issue Stock' : operationType === 'borrow' ? 'Confirm Borrow' : 'Apply Adjustment'}
            </button>
          </footer>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteItem != null}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stock item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {deleteItem?.name ?? 'this item'}
              </span>{' '}
              and its related balances, serialized units, and movement history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStockItem.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700"
              onClick={() => void handleDeleteItem()}
            >
              {deleteStockItem.isPending ? 'Deleting...' : 'Delete Item'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
