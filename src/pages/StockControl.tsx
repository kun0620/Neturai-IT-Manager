import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  PackageCheck,
  Search,
  Settings2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { notifyError, notifySuccess } from '@/lib/notify';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import {
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

export default function StockControlPage() {
  const navigate = useNavigate();
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
  const [itemId, setItemId] = useState<string>('');

  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newMode, setNewMode] = useState<StockTrackingMode>('bulk');
  const [newReorderPoint, setNewReorderPoint] = useState('0');
  const [newReorderQty, setNewReorderQty] = useState('0');
  const [newOpeningQty, setNewOpeningQty] = useState('0');

  const [locationKey, setLocationKey] = useState('main');
  const [receiveQty, setReceiveQty] = useState('1');
  const [receiveSerial, setReceiveSerial] = useState('');
  const [issueQty, setIssueQty] = useState('1');
  const [adjustDelta, setAdjustDelta] = useState('0');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [note, setNote] = useState('');

  const selectedItem = useMemo(
    () => stockItems.find((item) => item.id === itemId) ?? null,
    [itemId, stockItems]
  );

  const { data: inStockUnits = [] } = useInStockUnits(
    selectedItem?.tracking_mode === 'serialized' ? selectedItem.id : undefined
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stockItems;
    return stockItems.filter((item) =>
      `${item.sku} ${item.name} ${item.category ?? ''}`.toLowerCase().includes(q)
    );
  }, [search, stockItems]);

  const totalOnHand = useMemo(
    () => stockItems.reduce((acc, item) => acc + item.total_on_hand, 0),
    [stockItems]
  );
  const totalReserved = useMemo(
    () => stockItems.reduce((acc, item) => acc + item.total_reserved, 0),
    [stockItems]
  );
  const totalAvailable = useMemo(
    () => stockItems.reduce((acc, item) => acc + item.available, 0),
    [stockItems]
  );
  const lowStockItems = useMemo(
    () => stockItems.filter((item) => item.reorder_point > 0 && item.available <= item.reorder_point),
    [stockItems]
  );

  const openRequestFromMovement = (referenceType: string | null, referenceId: string | null) => {
    if (!referenceId) return;
    if (referenceType === 'asset_request') {
      const params = new URLSearchParams();
      params.set('section', 'requests');
      params.set('requestId', referenceId);
      navigate(`/assets?${params.toString()}`);
    }
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
    if (
      !Number.isFinite(reorderPoint) ||
      !Number.isFinite(reorderQty) ||
      !Number.isFinite(openingQty)
    ) {
      notifyError('Invalid number', 'Please check reorder/opening values');
      return;
    }

    try {
      const row = await createStockItem.mutateAsync({
        sku: newSku.trim(),
        name: newName.trim(),
        trackingMode: newMode,
        category: newCategory.trim() || null,
        reorderPoint,
        reorderQty,
        locationKey,
        openingQty,
      });
      notifySuccess('Stock item created');
      setItemId(row.id);
      setNewSku('');
      setNewName('');
      setNewCategory('');
      setNewMode('bulk');
      setNewReorderPoint('0');
      setNewReorderQty('0');
      setNewOpeningQty('0');
    } catch (err) {
      notifyError('Create failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleReceive = async () => {
    if (!canManage || !selectedItem) return;
    try {
      if (selectedItem.tracking_mode === 'bulk') {
        const qty = Number(receiveQty);
        if (!Number.isFinite(qty) || qty < 1) {
          notifyError('Invalid quantity', 'Quantity must be >= 1');
          return;
        }
        await receiveStock.mutateAsync({
          stockItemId: selectedItem.id,
          quantity: qty,
          locationKey,
          note: note.trim() || undefined,
        });
      } else {
        if (!receiveSerial.trim()) {
          notifyError('Missing serial', 'Serial number is required');
          return;
        }
        await receiveSerializedStock.mutateAsync({
          stockItemId: selectedItem.id,
          serialNo: receiveSerial.trim(),
          locationKey,
          note: note.trim() || undefined,
        });
        setReceiveSerial('');
      }
      notifySuccess('Stock received');
      setNote('');
    } catch (err) {
      notifyError('Receive failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleIssue = async () => {
    if (!canManage || !selectedItem) return;
    try {
      if (selectedItem.tracking_mode === 'bulk') {
        const qty = Number(issueQty);
        if (!Number.isFinite(qty) || qty < 1) {
          notifyError('Invalid quantity', 'Quantity must be >= 1');
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
          notifyError('Select serial unit', 'Please choose a stock unit to issue');
          return;
        }
        await issueStockUnit.mutateAsync({
          stockUnitId: selectedUnitId,
          note: note.trim() || undefined,
          referenceType: 'manual_issue',
        });
        setSelectedUnitId('');
      }
      notifySuccess('Stock issued');
      setNote('');
    } catch (err) {
      notifyError('Issue failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleAdjust = async () => {
    if (!canManage || !selectedItem) return;
    if (selectedItem.tracking_mode !== 'bulk') {
      notifyError('Unsupported operation', 'Manual delta adjustment is only for bulk items');
      return;
    }
    const delta = Number(adjustDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      notifyError('Invalid delta', 'Delta must not be 0');
      return;
    }
    try {
      await adjustStockBalance.mutateAsync({
        stockItemId: selectedItem.id,
        delta,
        locationKey,
        note: note.trim() || undefined,
      });
      notifySuccess('Stock adjusted');
      setAdjustDelta('0');
      setNote('');
    } catch (err) {
      notifyError('Adjust failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (itemsLoading) {
    return <LoadingSkeleton count={6} className="md:grid-cols-2 lg:grid-cols-3" />;
  }

  if (itemsError) {
    return <EmptyState title="Failed to load stock control data" />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Stock Control</h1>
        <p className="text-sm text-muted-foreground">
          Real-time inventory for bulk and serialized stock.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">On Hand</p>
              <p className="text-2xl font-bold">{totalOnHand}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Reserved</p>
              <p className="text-2xl font-bold">{totalReserved}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Available</p>
              <p className="text-2xl font-bold">{totalAvailable}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Create stock item</h2>
          <p className="text-xs text-muted-foreground">
            Define a new SKU and starting balance.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <Label>SKU</Label>
            <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="MOUSE-M185" />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Logitech M185" />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Mouse" />
          </div>
          <div>
            <Label>Tracking mode</Label>
            <Select value={newMode} onValueChange={(v) => setNewMode(v as StockTrackingMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulk">bulk</SelectItem>
                <SelectItem value="serialized">serialized</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reorder point</Label>
            <Input value={newReorderPoint} onChange={(e) => setNewReorderPoint(e.target.value)} type="number" />
          </div>
          <div>
            <Label>Reorder qty</Label>
            <Input value={newReorderQty} onChange={(e) => setNewReorderQty(e.target.value)} type="number" />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={locationKey} onChange={(e) => setLocationKey(e.target.value)} placeholder="main" />
          </div>
          <div>
            <Label>Opening qty (bulk only)</Label>
            <Input value={newOpeningQty} onChange={(e) => setNewOpeningQty(e.target.value)} type="number" />
          </div>
          <div className="md:col-span-4">
            <Button
              onClick={handleCreateItem}
              disabled={!canManage || createStockItem.isPending}
            >
              {createStockItem.isPending ? 'Creating...' : 'Create item'}
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6 xl:flex-row">
        <section className="min-w-0 flex-1 rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="text-base font-semibold">Inventory overview</h2>
              <p className="text-xs text-muted-foreground">Search and monitor stock levels by SKU.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-64 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search SKU, name, category"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reorder point</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const lowStock = item.reorder_point > 0 && item.available <= item.reorder_point;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.tracking_mode}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.total_on_hand}</TableCell>
                      <TableCell className="text-right">{item.total_reserved}</TableCell>
                      <TableCell className="text-right">
                        <span className={lowStock ? 'font-semibold text-red-600' : undefined}>
                          {item.available}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.reorder_point}
                        {lowStock && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                            Low
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState title="No stock items" description="Create your first stock item above." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <aside className="w-full space-y-4 xl:w-[340px]">
          <section className="rounded-xl border bg-card">
            <div className="border-b p-4">
              <h2 className="text-base font-semibold">Stock operations</h2>
              <p className="text-xs text-muted-foreground">Receive, issue, or adjust for selected item.</p>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <Label>Stock item</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.sku} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input value={locationKey} onChange={(e) => setLocationKey(e.target.value)} />
              </div>
              <div>
                <Label>Note</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
              </div>

              {!selectedItem ? (
                <EmptyState title="Select item first" description="Choose a stock item to run operations." />
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                      Receive
                    </div>
                    {selectedItem.tracking_mode === 'bulk' ? (
                      <Input value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} type="number" />
                    ) : (
                      <Input
                        value={receiveSerial}
                        onChange={(e) => setReceiveSerial(e.target.value)}
                        placeholder="Serial number"
                      />
                    )}
                    <Button className="mt-2 w-full" onClick={handleReceive} disabled={!canManage}>
                      Receive
                    </Button>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                      Issue
                    </div>
                    {selectedItem.tracking_mode === 'bulk' ? (
                      <Input value={issueQty} onChange={(e) => setIssueQty(e.target.value)} type="number" />
                    ) : (
                      <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select serial unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {inStockUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.serial_no} ({unit.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button className="mt-2 w-full" onClick={handleIssue} disabled={!canManage}>
                      Issue
                    </Button>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Settings2 className="h-4 w-4 text-amber-600" />
                      Adjust (bulk only)
                    </div>
                    <Input value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} type="number" />
                    <Button
                      className="mt-2 w-full"
                      onClick={handleAdjust}
                      disabled={!canManage || selectedItem.tracking_mode !== 'bulk'}
                    >
                      Apply adjustment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Stock alerts</h3>
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">No low-stock alerts.</p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                    <div>
                      <p className="font-medium">{item.sku} - {item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Available {item.available} / Reorder point {item.reorder_point}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <section className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-base font-semibold">Recent movements</h2>
          <p className="text-xs text-muted-foreground">Latest inventory transactions and references.</p>
        </div>
        <div className="overflow-x-auto p-0">
          {movementLoading ? (
            <LoadingSkeleton count={3} className="md:grid-cols-1 p-4" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.created_at).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{m.movement_type}</TableCell>
                    <TableCell className="text-right">{m.quantity}</TableCell>
                    <TableCell>{m.location_from ?? '-'}</TableCell>
                    <TableCell>{m.location_to ?? '-'}</TableCell>
                    <TableCell>
                      {m.reference_id ? (
                        <button
                          type="button"
                          className="text-primary underline-offset-4 hover:underline"
                          onClick={() => openRequestFromMovement(m.reference_type, m.reference_id)}
                        >
                          {m.reference_type ?? 'reference'} ({m.reference_id})
                        </button>
                      ) : (
                        m.reference_type ?? '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState title="No movement yet" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
