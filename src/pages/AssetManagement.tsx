import React, { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { AssetFormDialog } from '@/components/assets/AssetFormDialog';
import { useAssets } from '@/hooks/useAssets';
import { useUsersForAssignment } from '@/hooks/useUsers';
import { getColumns } from '@/components/assets/columns';
import { AssetWithType } from '@/types/asset';
import { AssetDrawer } from '@/features/assets/components/AssetDrawer';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowDownUp,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  ListFilter,
  Pencil,
  Save,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { notifyError, notifySuccess } from '@/lib/notify';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { exportRowsToExcel, exportRowsToPdf } from '@/lib/export';

type AssetSortField = 'updated_at' | 'name' | 'asset_code' | 'status';
type AssetSortDirection = 'asc' | 'desc';
type AssetOwnerFilter = string;
type AssetViewPreset = 'default' | 'my_assigned' | 'in_repair' | 'unassigned';
type AssetViewSnapshot = {
  q: string;
  status: string;
  category: string;
  type: string;
  owner: AssetOwnerFilter;
  sortBy: AssetSortField;
  sortDir: AssetSortDirection;
};
type AssetSavedView = {
  id: string;
  name: string;
  pinned?: boolean;
  snapshot: AssetViewSnapshot;
};
type BulkUndoState =
  | {
      kind: 'owner';
      label: string;
      items: Array<{ id: string; previousAssignedTo: string | null }>;
    }
  | {
      kind: 'status';
      label: string;
      items: Array<{ id: string; previousStatus: AssetWithType['status'] }>;
    };
type BulkOperation = 'owner' | 'status' | 'undo' | 'delete' | null;

const DEFAULT_SORT_FIELD: AssetSortField = 'updated_at';
const DEFAULT_SORT_DIRECTION: AssetSortDirection = 'desc';
const DEFAULT_OWNER_FILTER = 'all';
const OWNER_FILTER_ME = 'me';
const OWNER_FILTER_UNASSIGNED = 'unassigned';
const ASSET_VIEW_PRESET_KEY = 'neturai_asset_view_preset';
const ASSET_SAVED_VIEWS_KEY = 'neturai_asset_saved_views';


export function AssetManagement() {
  const { session } = useAuth();
  const { can } = useCurrentProfile();
  const canAssignAssets = can('asset.assign');
  const canChangeAssetStatus = can('asset.status.change');
  const canDeleteAssets = can('asset.delete');
  const myUserId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  // ✅ hooks ต้องอยู่ใน component เท่านั้น
  const { data: assets = [], isLoading, isError, error } = useAssets();
  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
  } = useUsersForAssignment();
  const assignmentUsers = users
    .filter((u) => u.name) // ตัด user ที่ไม่มีชื่อ
    .map((u) => ({
      id: u.id,
      name: u.name!, // safe เพราะ filter แล้ว
    }));
  const assigneeNameById = useMemo(
    () =>
      assignmentUsers.reduce<Record<string, string>>((acc, user) => {
        acc[user.id] = user.name;
        return acc;
      }, {}),
    [assignmentUsers]
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithType | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAssetForDrawer, setSelectedAssetForDrawer] =
  useState<AssetWithType | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const statusQuery = searchParams.get('status') ?? 'all';
  const categoryQuery = searchParams.get('category') ?? 'all';
  const typeQuery = searchParams.get('type') ?? 'all';
  const ownerQuery = searchParams.get('owner') ?? DEFAULT_OWNER_FILTER;
  const sortByQuery = searchParams.get('sortBy');
  const sortDirQuery = searchParams.get('sortDir');
  const normalizedOwnerFilter: AssetOwnerFilter =
    ownerQuery && ownerQuery !== '' ? ownerQuery : DEFAULT_OWNER_FILTER;
  const normalizedSortBy: AssetSortField =
    sortByQuery === 'name' ||
    sortByQuery === 'asset_code' ||
    sortByQuery === 'status' ||
    sortByQuery === 'updated_at'
      ? sortByQuery
      : DEFAULT_SORT_FIELD;
  const normalizedSortDir: AssetSortDirection =
    sortDirQuery === 'asc' || sortDirQuery === 'desc'
      ? sortDirQuery
      : DEFAULT_SORT_DIRECTION;
  const [statusFilter, setStatusFilter] = useState<string>(statusQuery);
  const [categoryFilter, setCategoryFilter] = useState<string>(categoryQuery);
  const [typeFilter, setTypeFilter] = useState<string>(typeQuery);
  const [ownerFilter, setOwnerFilter] =
    useState<AssetOwnerFilter>(normalizedOwnerFilter);
  const [sortBy, setSortBy] = useState<AssetSortField>(normalizedSortBy);
  const [sortDirection, setSortDirection] =
    useState<AssetSortDirection>(normalizedSortDir);
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchQuery);
  const [selectedPreset, setSelectedPreset] = useState<AssetViewPreset>('default');
  const [savedViews, setSavedViews] = useState<AssetSavedView[]>([]);
  const [selectedSavedViewId, setSelectedSavedViewId] = useState('none');
  const [deleteSavedViewOpen, setDeleteSavedViewOpen] = useState(false);
  const [confirmBulkOwnerOpen, setConfirmBulkOwnerOpen] = useState(false);
  const [confirmBulkStatusOpen, setConfirmBulkStatusOpen] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [confirmBulkDeleteFinalOpen, setConfirmBulkDeleteFinalOpen] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<AssetWithType[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkOwnerValue, setBulkOwnerValue] = useState('__none__');
  const [bulkStatusValue, setBulkStatusValue] = useState('__none__');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>(null);
  const [lastBulkUndo, setLastBulkUndo] = useState<BulkUndoState | null>(null);
  const prefetchTicketsRoute = React.useCallback(() => {
    void import('@/pages/Tickets');
  }, []);


  const applyPreset = React.useCallback(
    (preset: AssetViewPreset) => {
      if (preset === 'default') {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setStatusFilter('all');
        setCategoryFilter('all');
        setTypeFilter('all');
        setOwnerFilter(DEFAULT_OWNER_FILTER);
        setSortBy(DEFAULT_SORT_FIELD);
        setSortDirection(DEFAULT_SORT_DIRECTION);
        setSelectedPreset('default');
        return;
      }

      if (preset === 'my_assigned') {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setStatusFilter('Assigned');
        setCategoryFilter('all');
        setTypeFilter('all');
        setOwnerFilter('me');
        setSortBy('updated_at');
        setSortDirection('desc');
        setSelectedPreset('my_assigned');
        return;
      }

      if (preset === 'in_repair') {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setStatusFilter('In Repair');
        setCategoryFilter('all');
        setTypeFilter('all');
        setOwnerFilter(DEFAULT_OWNER_FILTER);
        setSortBy('updated_at');
        setSortDirection('desc');
        setSelectedPreset('in_repair');
        return;
      }

      setSearchTerm('');
      setDebouncedSearchTerm('');
      setStatusFilter('all');
      setCategoryFilter('all');
      setTypeFilter('all');
      setOwnerFilter('unassigned');
      setSortBy('updated_at');
      setSortDirection('desc');
      setSelectedPreset('unassigned');
    },
    []
  );

  // เพิ่ม handler ให้ครบ
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedAssetForDrawer(null);
    if (searchParams.get('assetId')) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('assetId');
        return next;
      });
    }
  };

  const handleEditFromDrawer = (asset: AssetWithType) => {
    setIsDrawerOpen(false);
    setSelectedAssetForDrawer(null);

    setSelectedAsset(asset);
    setIsFormOpen(true);
  };

  const openAssetInDrawer = React.useCallback(
    (asset: AssetWithType) => {
      setSelectedAssetForDrawer(asset);
      setIsDrawerOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('assetId', asset.id);
        return next;
      });
    },
    [setSearchParams]
  );

  const statusCounts = useMemo(() => {
    const counts = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.status ?? 'Unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return counts;
  }, [assets]);

  const statusOptions = useMemo(() => {
    const preferredOrder = [
      'Available',
      'Assigned',
      'In Repair',
      'In Use',
      'Retired',
      'Lost',
      'Unknown',
    ];
    const availableKeys = Object.keys(statusCounts);
    const ordered = [
      ...preferredOrder.filter((status) => availableKeys.includes(status)),
      ...availableKeys
        .filter((status) => !preferredOrder.includes(status))
        .sort((a, b) => a.localeCompare(b)),
    ];
    return ordered.map((status) => ({
      status,
      count: statusCounts[status] ?? 0,
    }));
  }, [statusCounts]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    assets.forEach((a) => {
      if (a.category?.id) {
        map.set(a.category.id, a.category.name ?? a.category.id);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({
      id,
      label,
    }));
  }, [assets]);

  const typeOptions = useMemo(() => {
    const map = new Map<string, string>();
    assets.forEach((a) => {
      if (a.asset_type?.id) {
        map.set(a.asset_type.id, a.asset_type.name ?? a.asset_type.id);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({
      id,
      label,
    }));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const keyword = debouncedSearchTerm.trim().toLowerCase();
      const matchesSearch =
        keyword.length === 0 ||
        a.name?.toLowerCase().includes(keyword) ||
        a.asset_code?.toLowerCase().includes(keyword) ||
        a.asset_type?.name?.toLowerCase().includes(keyword) ||
        a.category?.name?.toLowerCase().includes(keyword) ||
        a.location?.toLowerCase().includes(keyword) ||
        a.serial_number?.toLowerCase().includes(keyword) ||
        a.status?.toLowerCase().includes(keyword) ||
        (a.assigned_to
          ? (assigneeNameById[a.assigned_to] ?? '').toLowerCase().includes(keyword)
          : false);
      if (!matchesSearch) {
        return false;
      }
      if (statusFilter !== 'all' && a.status !== statusFilter) {
        return false;
      }
      if (
        categoryFilter !== 'all' &&
        a.category?.id !== categoryFilter
      ) {
        return false;
      }
      if (
        typeFilter !== 'all' &&
        a.asset_type?.id !== typeFilter
      ) {
        return false;
      }
      if (ownerFilter === 'me') {
        if (!myUserId) return false;
        if (a.assigned_to !== myUserId) return false;
      }
      if (ownerFilter === OWNER_FILTER_UNASSIGNED && a.assigned_to) {
        return false;
      }
      if (
        ownerFilter !== DEFAULT_OWNER_FILTER &&
        ownerFilter !== OWNER_FILTER_ME &&
        ownerFilter !== OWNER_FILTER_UNASSIGNED &&
        a.assigned_to !== ownerFilter
      ) {
        return false;
      }
      return true;
    });
  }, [
    assets,
    statusFilter,
    categoryFilter,
    typeFilter,
    debouncedSearchTerm,
    assigneeNameById,
    ownerFilter,
    myUserId,
  ]);

  const sortedAssets = useMemo(() => {
    const list = [...filteredAssets];
    const getTextValue = (asset: AssetWithType, field: AssetSortField) => {
      if (field === 'name') return asset.name ?? '';
      if (field === 'asset_code') return asset.asset_code ?? '';
      if (field === 'status') return asset.status ?? '';
      return asset.updated_at ?? '';
    };

    list.sort((a, b) => {
      if (sortBy === 'updated_at') {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }

      const aValue = getTextValue(a, sortBy).toLowerCase();
      const bValue = getTextValue(b, sortBy).toLowerCase();
      if (aValue === bValue) return 0;
      const result = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? result : -result;
    });

    return list;
  }, [filteredAssets, sortBy, sortDirection]);

  const selectedDrawerIndex = useMemo(() => {
    if (!selectedAssetForDrawer) return -1;
    return sortedAssets.findIndex((asset) => asset.id === selectedAssetForDrawer.id);
  }, [sortedAssets, selectedAssetForDrawer]);

  const hasDrawerPrev = selectedDrawerIndex > 0;
  const hasDrawerNext =
    selectedDrawerIndex >= 0 && selectedDrawerIndex < sortedAssets.length - 1;

  const handleDrawerPrev = React.useCallback(() => {
    if (!hasDrawerPrev) return;
    const previousAsset = sortedAssets[selectedDrawerIndex - 1];
    if (!previousAsset) return;
    openAssetInDrawer(previousAsset);
  }, [hasDrawerPrev, sortedAssets, selectedDrawerIndex, openAssetInDrawer]);

  const handleDrawerNext = React.useCallback(() => {
    if (!hasDrawerNext) return;
    const nextAsset = sortedAssets[selectedDrawerIndex + 1];
    if (!nextAsset) return;
    openAssetInDrawer(nextAsset);
  }, [hasDrawerNext, sortedAssets, selectedDrawerIndex, openAssetInDrawer]);

  const selectedAssetIds = useMemo(
    () => selectedAssets.map((asset) => asset.id),
    [selectedAssets]
  );
  const allVisibleSelected =
    sortedAssets.length > 0 && selectedAssetIds.length === sortedAssets.length;

  const toggleAssetSelection = React.useCallback((asset: AssetWithType) => {
    setSelectedAssets((prev) => {
      const exists = prev.some((item) => item.id === asset.id);
      if (exists) {
        return prev.filter((item) => item.id !== asset.id);
      }
      return [...prev, asset];
    });
  }, []);

  const toggleSelectAllVisible = React.useCallback(() => {
    if (allVisibleSelected) {
      setSelectedAssets([]);
      return;
    }
    setSelectedAssets(sortedAssets);
  }, [allVisibleSelected, sortedAssets]);

  const assetTableColumns = useMemo<ColumnDef<AssetWithType>[]>(
    () =>
      selectionMode
        ? [
            {
              id: 'select',
              enableSorting: false,
              enableHiding: false,
              size: 40,
              header: () => (
                <div
                  className="flex items-center justify-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAllVisible}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Select all rows"
                  />
                </div>
              ),
              cell: ({ row }) => (
                <div
                  className="flex items-center justify-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedAssetIds.includes(row.original.id)}
                    onCheckedChange={() => toggleAssetSelection(row.original)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Select row"
                  />
                </div>
              ),
            },
            ...getColumns(assigneeNameById),
          ]
        : [...getColumns(assigneeNameById)],
    [allVisibleSelected, assigneeNameById, selectedAssetIds, selectionMode, toggleAssetSelection, toggleSelectAllVisible]
  );

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefetch = () => {
      prefetchTicketsRoute();
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(prefetch, 500);
    return () => window.clearTimeout(timeoutId);
  }, [prefetchTicketsRoute]);

  React.useEffect(() => {
    setSearchTerm(searchQuery);
    setDebouncedSearchTerm(searchQuery);
    setStatusFilter(statusQuery);
    setCategoryFilter(categoryQuery);
    setTypeFilter(typeQuery);
    setOwnerFilter(normalizedOwnerFilter);
    setSortBy(normalizedSortBy);
    setSortDirection(normalizedSortDir);
  }, [
    searchQuery,
    statusQuery,
    categoryQuery,
    typeQuery,
    normalizedOwnerFilter,
    normalizedSortBy,
    normalizedSortDir,
  ]);

  React.useEffect(() => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);

      const syncParam = (key: string, value: string, fallback: string) => {
        if (value.trim() === '' || value === fallback) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      };

      syncParam('q', debouncedSearchTerm, '');
      syncParam('status', statusFilter, 'all');
      syncParam('category', categoryFilter, 'all');
      syncParam('type', typeFilter, 'all');
      syncParam('owner', ownerFilter, DEFAULT_OWNER_FILTER);
      syncParam('sortBy', sortBy, DEFAULT_SORT_FIELD);
      syncParam('sortDir', sortDirection, DEFAULT_SORT_DIRECTION);

      if (nextParams.toString() === currentParams.toString()) {
        return currentParams;
      }
      return nextParams;
    });
  }, [
    debouncedSearchTerm,
    statusFilter,
    categoryFilter,
    typeFilter,
    ownerFilter,
    sortBy,
    sortDirection,
    setSearchParams,
  ]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (
      searchQuery ||
      statusQuery !== 'all' ||
      categoryQuery !== 'all' ||
      typeQuery !== 'all' ||
      ownerQuery !== DEFAULT_OWNER_FILTER
    ) {
      return;
    }
    const saved = window.localStorage.getItem(ASSET_VIEW_PRESET_KEY);
    if (
      saved === 'default' ||
      saved === 'my_assigned' ||
      saved === 'in_repair' ||
      saved === 'unassigned'
    ) {
      applyPreset(saved);
    }
  }, [
    applyPreset,
    searchQuery,
    statusQuery,
    categoryQuery,
    typeQuery,
    ownerQuery,
  ]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ASSET_VIEW_PRESET_KEY, selectedPreset);
  }, [selectedPreset]);

  React.useEffect(() => {
    const assetId = searchParams.get('assetId');
    if (!assetId) return;

    const target = assets.find((a) => a.id === assetId);
    if (!target) return;

    setSelectedAssetForDrawer(target);
    setIsDrawerOpen(true);
  }, [assets, searchParams]);

  const hasActiveFilters =
    debouncedSearchTerm.trim().length > 0 ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    typeFilter !== 'all' ||
    ownerFilter !== DEFAULT_OWNER_FILTER ||
    sortBy !== DEFAULT_SORT_FIELD ||
    sortDirection !== DEFAULT_SORT_DIRECTION;

  const selectedCategoryLabel =
    categoryFilter === 'all'
      ? null
      : categoryOptions.find((c) => c.id === categoryFilter)?.label ?? categoryFilter;
  const selectedTypeLabel =
    typeFilter === 'all'
      ? null
      : typeOptions.find((t) => t.id === typeFilter)?.label ?? typeFilter;
  const sortByLabel =
    sortBy === 'updated_at'
      ? 'Updated date'
      : sortBy === 'asset_code'
        ? 'Asset code'
        : sortBy === 'status'
          ? 'Status'
          : 'Name';
  const sortDirLabel = sortDirection === 'desc' ? 'Desc' : 'Asc';

  const clearAll = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setTypeFilter('all');
    setOwnerFilter(DEFAULT_OWNER_FILTER);
    setSortBy(DEFAULT_SORT_FIELD);
    setSortDirection(DEFAULT_SORT_DIRECTION);
    setSelectedPreset('default');
    setSelectedSavedViewId('none');
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete('q');
      nextParams.delete('status');
      nextParams.delete('category');
      nextParams.delete('type');
      nextParams.delete('owner');
      nextParams.delete('sortBy');
      nextParams.delete('sortDir');
      return nextParams;
    });
  };

  const clearBulkSelection = () => {
    setSelectedAssets([]);
    setBulkOwnerValue('__none__');
    setBulkStatusValue('__none__');
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
  };

  const exitSelectionMode = () => {
    clearBulkSelection();
    setSelectionMode(false);
  };

  React.useEffect(() => {
    if (selectionMode) return;
    if (selectedAssets.length === 0) return;
    clearBulkSelection();
  }, [selectionMode, selectedAssets.length]);

  const handleBulkAssignOwner = async () => {
    if (selectedAssetIds.length === 0) return false;
    if (!canAssignAssets) {
      notifyError('You do not have permission to assign assets');
      return false;
    }
    if (bulkOwnerValue === '__none__') {
      notifyError('Select an owner first');
      return false;
    }

    let assignedTo: string | null = null;
    if (bulkOwnerValue === OWNER_FILTER_ME) {
      if (!myUserId) {
        notifyError('You must be logged in to assign to yourself');
        return false;
      }
      assignedTo = myUserId;
    } else if (bulkOwnerValue === OWNER_FILTER_UNASSIGNED) {
      assignedTo = null;
    } else {
      assignedTo = bulkOwnerValue;
    }

    const previousItems = selectedAssets.map((asset) => ({
      id: asset.id,
      previousAssignedTo: asset.assigned_to,
    }));
    const nextOwnerLabel =
      bulkOwnerValue === OWNER_FILTER_ME
        ? 'Assign to me'
        : bulkOwnerValue === OWNER_FILTER_UNASSIGNED
          ? 'Set unassigned'
          : assignmentUsers.find((user) => user.id === bulkOwnerValue)?.name ??
            bulkOwnerValue;

    setBulkUpdating(true);
    setBulkOperation('owner');
    const { error: updateError } = await supabase
      .from('assets')
      .update({ assigned_to: assignedTo })
      .in('id', selectedAssetIds);

    if (updateError) {
      notifyError('Failed to assign owner', updateError.message);
      setBulkUpdating(false);
      setBulkOperation(null);
      return false;
    }

    notifySuccess('Owner updated', `${selectedAssetIds.length} asset(s)`);
    setLastBulkUndo({
      kind: 'owner',
      label: `Owner -> ${nextOwnerLabel}`,
      items: previousItems,
    });
    clearBulkSelection();
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    setBulkUpdating(false);
    setBulkOperation(null);
    return true;
  };

  const handleBulkUpdateStatus = async () => {
    if (selectedAssetIds.length === 0) return false;
    if (!canChangeAssetStatus) {
      notifyError('You do not have permission to change asset status');
      return false;
    }
    if (bulkStatusValue === '__none__') {
      notifyError('Select a status first');
      return false;
    }

    const previousItems = selectedAssets.map((asset) => ({
      id: asset.id,
      previousStatus: asset.status,
    }));

    setBulkUpdating(true);
    setBulkOperation('status');
    const { error: updateError } = await supabase
      .from('assets')
      .update({ status: bulkStatusValue as AssetWithType['status'] })
      .in('id', selectedAssetIds);

    if (updateError) {
      notifyError('Failed to update status', updateError.message);
      setBulkUpdating(false);
      setBulkOperation(null);
      return false;
    }

    notifySuccess('Status updated', `${selectedAssetIds.length} asset(s)`);
    setLastBulkUndo({
      kind: 'status',
      label: `Status -> ${bulkStatusValue}`,
      items: previousItems,
    });
    clearBulkSelection();
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    setBulkUpdating(false);
    setBulkOperation(null);
    return true;
  };

  const handleBulkExportSelected = () => {
    if (selectedAssets.length === 0) return;
    const csvRows = [
      ['Name', 'Asset Code', 'Type', 'Category', 'Status', 'Location', 'Assigned To'],
      ...selectedAssets.map((asset) => [
        asset.name ?? '',
        asset.asset_code ?? '',
        asset.asset_type?.name ?? '',
        asset.category?.name ?? '',
        asset.status ?? '',
        asset.location ?? '',
        asset.assigned_to ? assigneeNameById[asset.assigned_to] ?? asset.assigned_to : 'Unassigned',
      ]),
    ];

    const escapeCell = (cell: string) =>
      `"${String(cell).replace(/"/g, '""')}"`;
    const csv = csvRows.map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'selected-assets.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notifySuccess('Export complete', `${selectedAssets.length} asset(s)`);
  };

  const buildAssetExportRows = (sourceAssets: AssetWithType[]) =>
    sourceAssets.map((asset) => ({
      Name: asset.name ?? '',
      'Asset Code': asset.asset_code ?? '',
      Type: asset.asset_type?.name ?? '',
      Category: asset.category?.name ?? '',
      Status: asset.status ?? '',
      Location: asset.location ?? '',
      'Assigned To': asset.assigned_to
        ? assigneeNameById[asset.assigned_to] ?? asset.assigned_to
        : 'Unassigned',
      'Updated At': asset.updated_at
        ? new Date(asset.updated_at).toLocaleString()
        : '',
    }));

  const handleExportAssetsExcel = async () => {
    if (sortedAssets.length === 0) {
      notifyError('No assets to export');
      return;
    }
    await exportRowsToExcel(buildAssetExportRows(sortedAssets), 'assets-export');
    notifySuccess('Excel exported', `${sortedAssets.length} asset(s)`);
  };

  const handleExportAssetsPdf = () => {
    if (sortedAssets.length === 0) {
      notifyError('No assets to export');
      return;
    }
    exportRowsToPdf(buildAssetExportRows(sortedAssets), 'Assets Export', 'assets-export');
    notifySuccess('PDF exported', `${sortedAssets.length} asset(s)`);
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedAssetIds.length === 0) return false;
    if (!canDeleteAssets) {
      notifyError('You do not have permission to delete assets');
      return false;
    }

    setBulkUpdating(true);
    setBulkOperation('delete');
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .in('id', selectedAssetIds);

    if (deleteError) {
      notifyError('Failed to delete assets', deleteError.message);
      setBulkUpdating(false);
      setBulkOperation(null);
      return false;
    }

    notifySuccess('Assets deleted', `${selectedAssetIds.length} asset(s)`);
    clearBulkSelection();
    setLastBulkUndo(null);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    setBulkUpdating(false);
    setBulkOperation(null);
    return true;
  };

  const handleUndoLastBulkChange = async () => {
    if (!lastBulkUndo) return;
    setBulkUpdating(true);
    setBulkOperation('undo');

    if (lastBulkUndo.kind === 'owner') {
      const results = await Promise.all(
        lastBulkUndo.items.map((item) =>
          supabase
            .from('assets')
            .update({ assigned_to: item.previousAssignedTo })
            .eq('id', item.id)
        )
      );
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        notifyError('Undo failed', failed.error.message);
        setBulkUpdating(false);
        setBulkOperation(null);
        return;
      }
    } else {
      const results = await Promise.all(
        lastBulkUndo.items.map((item) =>
          supabase
            .from('assets')
            .update({ status: item.previousStatus })
            .eq('id', item.id)
        )
      );
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        notifyError('Undo failed', failed.error.message);
        setBulkUpdating(false);
        setBulkOperation(null);
        return;
      }
    }

    notifySuccess('Undo complete', lastBulkUndo.label);
    setLastBulkUndo(null);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    setBulkUpdating(false);
    setBulkOperation(null);
  };

  const bulkOwnerLabel =
    bulkOwnerValue === '__none__'
      ? ''
      : bulkOwnerValue === OWNER_FILTER_ME
        ? 'Assign to me'
        : bulkOwnerValue === OWNER_FILTER_UNASSIGNED
          ? 'Set unassigned'
          : assignmentUsers.find((user) => user.id === bulkOwnerValue)?.name ??
            bulkOwnerValue;

  const buildSnapshot = React.useCallback(
    (): AssetViewSnapshot => ({
      q: searchTerm,
      status: statusFilter,
      category: categoryFilter,
      type: typeFilter,
      owner: ownerFilter,
      sortBy,
      sortDir: sortDirection,
    }),
    [
      searchTerm,
      statusFilter,
      categoryFilter,
      typeFilter,
      ownerFilter,
      sortBy,
      sortDirection,
    ]
  );

  const applySnapshot = React.useCallback((snapshot: AssetViewSnapshot) => {
    setSearchTerm(snapshot.q);
    setDebouncedSearchTerm(snapshot.q);
    setStatusFilter(snapshot.status);
    setCategoryFilter(snapshot.category);
    setTypeFilter(snapshot.type);
    setOwnerFilter(snapshot.owner);
    setSortBy(snapshot.sortBy);
    setSortDirection(snapshot.sortDir);
    setSelectedPreset('default');
  }, []);

  const handleSaveCurrentView = React.useCallback(() => {
    const name = window.prompt('Saved view name');
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const snapshot = buildSnapshot();
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `view-${Date.now()}`;

    setSavedViews((prev) => {
      const duplicateByName = prev.find(
        (v) => v.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicateByName) {
        const updated = prev.map((view) =>
          view.id === duplicateByName.id
            ? { ...view, snapshot, name: trimmed }
            : view
        );
        setSelectedSavedViewId(duplicateByName.id);
        notifySuccess('Saved view updated', trimmed);
        return updated;
      }
      const created: AssetSavedView = { id: nextId, name: trimmed, snapshot };
      setSelectedSavedViewId(created.id);
      notifySuccess('Saved view created', trimmed);
      return [...prev, created];
    });
  }, [buildSnapshot]);

  const handleApplySavedView = React.useCallback(
    (id: string) => {
      setSelectedSavedViewId(id);
      if (id === 'none') return;
      const target = savedViews.find((view) => view.id === id);
      if (!target) return;
      applySnapshot(target.snapshot);
    },
    [savedViews, applySnapshot]
  );

  const handleDeleteSavedView = React.useCallback(() => {
    if (selectedSavedViewId === 'none') return;
    const deleting = savedViews.find((view) => view.id === selectedSavedViewId);
    setSavedViews((prev) => prev.filter((view) => view.id !== selectedSavedViewId));
    setSelectedSavedViewId('none');
    notifySuccess('Saved view deleted', deleting?.name);
  }, [savedViews, selectedSavedViewId]);

  const handleRenameSavedView = React.useCallback(() => {
    if (selectedSavedViewId === 'none') return;
    const current = savedViews.find((view) => view.id === selectedSavedViewId);
    if (!current) return;
    const nextName = window.prompt('Rename saved view', current.name);
    if (!nextName) return;
    const trimmed = nextName.trim();
    if (!trimmed) return;
    setSavedViews((prev) =>
      prev.map((view) =>
        view.id === selectedSavedViewId ? { ...view, name: trimmed } : view
      )
    );
    notifySuccess('Saved view renamed', trimmed);
  }, [savedViews, selectedSavedViewId]);

  const handleTogglePinSavedView = React.useCallback(() => {
    if (selectedSavedViewId === 'none') return;
    const current = savedViews.find((view) => view.id === selectedSavedViewId);
    if (!current) return;
    setSavedViews((prev) =>
      prev.map((view) =>
        view.id === selectedSavedViewId
          ? { ...view, pinned: !view.pinned }
          : view
      )
    );
    notifySuccess(
      current.pinned ? 'Removed pin from saved view' : 'Pinned saved view',
      current.name
    );
  }, [savedViews, selectedSavedViewId]);

  const isValidSnapshot = (snapshot: unknown): snapshot is AssetViewSnapshot => {
    if (!snapshot || typeof snapshot !== 'object') return false;
    const s = snapshot as Partial<AssetViewSnapshot>;
    return (
      typeof s.q === 'string' &&
      typeof s.status === 'string' &&
      typeof s.category === 'string' &&
      typeof s.type === 'string' &&
      typeof s.owner === 'string' &&
      (s.sortBy === 'updated_at' ||
        s.sortBy === 'name' ||
        s.sortBy === 'asset_code' ||
        s.sortBy === 'status') &&
      (s.sortDir === 'asc' || s.sortDir === 'desc')
    );
  };

  const handleExportSavedViews = React.useCallback(() => {
    const payload = JSON.stringify(savedViews, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'neturai-asset-saved-views.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    notifySuccess('Saved views exported');
  }, [savedViews]);

  const handleImportSavedViews = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        if (!Array.isArray(parsed)) {
          notifyError('Import failed', 'Invalid file format');
          return;
        }

        const normalized = parsed
          .filter((item): item is AssetSavedView => {
            if (!item || typeof item !== 'object') return false;
            const candidate = item as Partial<AssetSavedView>;
            return (
              typeof candidate.id === 'string' &&
              typeof candidate.name === 'string' &&
              isValidSnapshot(candidate.snapshot)
            );
          })
          .map((item) => ({
            id: item.id,
            name: item.name,
            pinned: !!item.pinned,
            snapshot: item.snapshot,
          }));

        if (normalized.length === 0) {
          notifyError('Import failed', 'No valid saved views found');
          return;
        }

        setSavedViews((prev) => {
          const map = new Map<string, AssetSavedView>(
            prev.map((view) => [view.id, view])
          );
          normalized.forEach((view) => map.set(view.id, view));
          return Array.from(map.values());
        });
        notifySuccess('Saved views imported', `${normalized.length} view(s)`);
      } catch {
        notifyError('Import failed', 'Cannot read JSON file');
      }
    },
    []
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(ASSET_SAVED_VIEWS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as AssetSavedView[];
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(
        (view) =>
          typeof view?.id === 'string' &&
          typeof view?.name === 'string' &&
          typeof view?.snapshot === 'object' &&
          view.snapshot !== null
      );
      setSavedViews(
        valid.sort((a, b) => {
          if (!!a.pinned === !!b.pinned) return a.name.localeCompare(b.name);
          return a.pinned ? -1 : 1;
        })
      );
    } catch {
      // ignore invalid saved format
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ASSET_SAVED_VIEWS_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  const selectedSavedView =
    selectedSavedViewId === 'none'
      ? null
      : savedViews.find((view) => view.id === selectedSavedViewId) ?? null;
  const orderedSavedViews = useMemo(
    () =>
      [...savedViews].sort((a, b) => {
        if (!!a.pinned === !!b.pinned) return a.name.localeCompare(b.name);
        return a.pinned ? -1 : 1;
      }),
    [savedViews]
  );

  const renderFilterSidebarContent = () => (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <h3 className="mb-2 text-sm font-semibold">Presets</h3>
        <Select
          value={selectedPreset}
          onValueChange={(value) => applyPreset(value as AssetViewPreset)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="my_assigned">My assigned</SelectItem>
            <SelectItem value="in_repair">In repair</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Saved views</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSaveCurrentView}
            >
              <Save className="mr-1 h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleExportSavedViews}
              disabled={savedViews.length === 0}
              aria-label="Export saved views"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => importFileInputRef.current?.click()}
              aria-label="Import saved views"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRenameSavedView}
              disabled={selectedSavedViewId === 'none'}
              aria-label="Rename saved view"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleTogglePinSavedView}
              disabled={selectedSavedViewId === 'none'}
              aria-label="Pin saved view"
            >
              <Star
                className={`h-3.5 w-3.5 ${
                  selectedSavedView?.pinned ? 'fill-current' : ''
                }`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDeleteSavedViewOpen(true)}
              disabled={selectedSavedViewId === 'none'}
              aria-label="Delete saved view"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Select value={selectedSavedViewId} onValueChange={handleApplySavedView}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select saved view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No saved view</SelectItem>
            {orderedSavedViews.map((view) => (
              <SelectItem key={view.id} value={view.id}>
                {view.pinned ? `★ ${view.name}` : view.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          ref={importFileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportSavedViews}
        />
      </div>

      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Status</h3>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAll}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted'
            }`}
          >
            <span>All</span>
            <span className="text-xs text-muted-foreground">{assets.length}</span>
          </button>
          {statusOptions.map(({ status, count }) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                statusFilter === status
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              }`}
            >
              <span>{status}</span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <h3 className="mb-2 text-sm font-semibold">Category</h3>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <h3 className="mb-2 text-sm font-semibold">Type</h3>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {typeOptions.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <h3 className="mb-2 text-sm font-semibold">Owner</h3>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_OWNER_FILTER}>All owners</SelectItem>
            <SelectItem value={OWNER_FILTER_ME}>Assigned to me</SelectItem>
            <SelectItem value={OWNER_FILTER_UNASSIGNED}>Unassigned</SelectItem>
            {assignmentUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );



  /* ---------------- Loading / Error ---------------- */

  if (isLoading || usersLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="h-8 w-1/3 rounded bg-muted animate-pulse"></div>
        <div className="h-5 w-1/2 rounded bg-muted animate-pulse"></div>
        <LoadingSkeleton count={6} className="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Asset Management
        </h1>
        <p className="text-red-500">
          Error loading assets: {error?.message}
        </p>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Asset Management
        </h1>
        <p className="text-red-500">
          Error loading users for assignment.
        </p>
      </div>
    );
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Neturai IT Manager
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Asset Management
        </h1>
        <p className="text-muted-foreground">
          Track asset health, ownership, and lifecycle in one place.
        </p>
      </div>

      <Button
        className="md:hidden self-start"
        onClick={() => {
          setSelectedAsset(null);
          setIsFormOpen(true);
        }}
      >
        Add Asset
      </Button>
      <div className="mt-2 flex items-center justify-between rounded-md border bg-background/80 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 md:sticky md:top-[68px] md:z-20 md:mt-0 lg:top-[64px]">
        <h2 className="text-lg font-semibold tracking-tight">
          Filters & Actions
        </h2>

        <Button
          className="hidden md:inline-flex"
          onClick={() => {
            setSelectedAsset(null);
            setIsFormOpen(true);
          }}
        >
          Add Asset
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          {renderFilterSidebarContent()}
        </aside>

        <section className="space-y-3">
          <div className="rounded-lg border border-border/70 bg-card/60 p-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Button
                type="button"
                variant="outline"
                className="h-8 lg:hidden"
                onClick={() => setIsFilterDrawerOpen(true)}
              >
                <ListFilter className="mr-1.5 h-3.5 w-3.5" />
                Filters
              </Button>

              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search assets"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search assets..."
                  className="h-8 pl-8 text-sm"
                />
              </div>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as AssetSortField)}>
                <SelectTrigger aria-label="Sort field" className="h-8 min-w-[150px] text-sm">
                  <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={6}>
                  <SelectItem value="updated_at">Updated date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="asset_code">Asset code</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortDirection}
                onValueChange={(value) => setSortDirection(value as AssetSortDirection)}
              >
                <SelectTrigger aria-label="Sort direction" className="h-8 min-w-[130px] text-sm">
                  <ArrowDownUp className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={6}>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>

              {selectionMode ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8"
                  onClick={exitSelectionMode}
                >
                  Done
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8"
                  onClick={enterSelectionMode}
                >
                  Select
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                className="h-8"
                onClick={() => void handleExportAssetsExcel()}
                disabled={sortedAssets.length === 0}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Excel
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-8"
                onClick={handleExportAssetsPdf}
                disabled={sortedAssets.length === 0}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </Button>

              <Badge variant="secondary" className="ml-auto whitespace-nowrap">
                Showing: {sortedAssets.length}
              </Badge>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {searchTerm.trim().length > 0 && (
                <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
                  Search: {searchTerm.trim()}
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Remove search filter"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
                  Status: {statusFilter}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    aria-label="Remove status filter"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCategoryLabel && (
                <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
                  Category: {selectedCategoryLabel}
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    aria-label="Remove category filter"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedTypeLabel && (
                <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
                  Type: {selectedTypeLabel}
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    aria-label="Remove type filter"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
          {ownerFilter === OWNER_FILTER_ME && (
            <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
              Owner: assigned to me
              <button
                type="button"
                onClick={() => setOwnerFilter(DEFAULT_OWNER_FILTER)}
                    aria-label="Remove owner filter"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
          {ownerFilter === OWNER_FILTER_UNASSIGNED && (
            <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
              Owner: unassigned
              <button
                type="button"
                onClick={() => setOwnerFilter(DEFAULT_OWNER_FILTER)}
                    aria-label="Remove owner filter"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {ownerFilter !== DEFAULT_OWNER_FILTER &&
            ownerFilter !== OWNER_FILTER_ME &&
            ownerFilter !== OWNER_FILTER_UNASSIGNED && (
              <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
                Owner:{' '}
                {assignmentUsers.find((user) => user.id === ownerFilter)?.name ||
                  ownerFilter}
                <button
                  type="button"
                  onClick={() => setOwnerFilter(DEFAULT_OWNER_FILTER)}
                  aria-label="Remove owner filter"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
              {(sortBy !== DEFAULT_SORT_FIELD || sortDirection !== DEFAULT_SORT_DIRECTION) && (
                <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
                  Sort: {sortByLabel} ({sortDirLabel})
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy(DEFAULT_SORT_FIELD);
                      setSortDirection(DEFAULT_SORT_DIRECTION);
                    }}
                    aria-label="Reset sorting"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            </div>
          )}

          {selectionMode && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
              <Badge variant="secondary" className="whitespace-nowrap">
                Selected: {selectedAssetIds.length}
              </Badge>
              {bulkUpdating && (
                <Badge variant="outline" className="whitespace-nowrap">
                  {bulkOperation === 'owner'
                    ? 'Updating owner...'
                    : bulkOperation === 'status'
                      ? 'Updating status...'
                      : bulkOperation === 'delete'
                        ? 'Deleting...'
                      : 'Processing...'}
                </Badge>
              )}

              <Select
                value={bulkOwnerValue}
                onValueChange={setBulkOwnerValue}
                disabled={bulkUpdating || !canAssignAssets}
              >
                <SelectTrigger className="h-8 min-w-[180px] text-sm">
                  <SelectValue placeholder="Assign owner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Assign owner...</SelectItem>
                  <SelectItem value={OWNER_FILTER_ME}>Assign to me</SelectItem>
                  <SelectItem value={OWNER_FILTER_UNASSIGNED}>Set unassigned</SelectItem>
                  {assignmentUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmBulkOwnerOpen(true)}
                        disabled={
                          bulkUpdating ||
                          selectedAssetIds.length === 0 ||
                          bulkOwnerValue === '__none__' ||
                          !canAssignAssets
                        }
                      >
                        Assign Owner
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canAssignAssets && (
                    <TooltipContent>
                      Admin/IT only: you do not have permission to assign assets
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <Select
                value={bulkStatusValue}
                onValueChange={setBulkStatusValue}
                disabled={bulkUpdating || !canChangeAssetStatus}
              >
                <SelectTrigger className="h-8 min-w-[170px] text-sm">
                  <SelectValue placeholder="Set status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Set status...</SelectItem>
                  {statusOptions.map(({ status }) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmBulkStatusOpen(true)}
                        disabled={
                          bulkUpdating ||
                          selectedAssetIds.length === 0 ||
                          bulkStatusValue === '__none__' ||
                          !canChangeAssetStatus
                        }
                      >
                        Update Status
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canChangeAssetStatus && (
                    <TooltipContent>
                      Admin/IT only: you do not have permission to change asset status
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExportSelected}
                disabled={bulkUpdating || selectedAssetIds.length === 0}
              >
                Export Selected
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearBulkSelection}
                disabled={bulkUpdating}
              >
                Clear selection
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmBulkDeleteOpen(true)}
                        disabled={bulkUpdating || selectedAssetIds.length === 0 || !canDeleteAssets}
                      >
                        Delete Selected
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canDeleteAssets && (
                    <TooltipContent>
                      Admin/IT only: you do not have permission to delete assets
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {lastBulkUndo && selectedAssetIds.length === 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 p-2">
              <Badge variant="secondary" className="whitespace-nowrap">
                Last: {lastBulkUndo.label}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndoLastBulkChange}
                disabled={bulkUpdating}
              >
                {bulkUpdating && bulkOperation === 'undo'
                  ? 'Undoing...'
                  : 'Undo last bulk change'}
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            {sortedAssets.length === 0 ? (
              <EmptyState
                title="No assets found"
                message="Try adjusting your filters or add a new asset."
              />
            ) : (
              <DataTable
                columns={assetTableColumns}
                data={sortedAssets}
                showGlobalFilter={false}
                getRowId={(row) => row.id}
                globalFilterPlaceholder="Search assets by name, code, type, category, location, status..."
                onRowClick={
                  selectionMode
                    ? (asset) => {
                        toggleAssetSelection(asset);
                      }
                    : (asset) => {
                        openAssetInDrawer(asset);
                      }
                }
              />
            )}
          </div>
        </section>
      </div>

      <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerDescription>Refine assets by status, category, type, and owner.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-auto px-4 pb-6">
            {renderFilterSidebarContent()}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={deleteSavedViewOpen} onOpenChange={setDeleteSavedViewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved view?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.{' '}
              {selectedSavedView ? `"${selectedSavedView.name}"` : 'Selected view'} will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDeleteSavedView();
                setDeleteSavedViewOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkOwnerOpen} onOpenChange={setConfirmBulkOwnerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm owner update</AlertDialogTitle>
            <AlertDialogDescription>
              Update owner for {selectedAssetIds.length} selected asset(s) to{' '}
              <span className="font-medium text-foreground">{bulkOwnerLabel || 'selected owner'}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkUpdating}
              onClick={async () => {
                const ok = await handleBulkAssignOwner();
                if (ok) {
                  setConfirmBulkOwnerOpen(false);
                }
              }}
            >
              {bulkUpdating && bulkOperation === 'owner' ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkStatusOpen} onOpenChange={setConfirmBulkStatusOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm status update</AlertDialogTitle>
            <AlertDialogDescription>
              Update status for {selectedAssetIds.length} selected asset(s) to{' '}
              <span className="font-medium text-foreground">{bulkStatusValue}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkUpdating}
              onClick={async () => {
                const ok = await handleBulkUpdateStatus();
                if (ok) {
                  setConfirmBulkStatusOpen(false);
                }
              }}
            >
              {bulkUpdating && bulkOperation === 'status' ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canDeleteAssets && (
        <AlertDialog open={confirmBulkDeleteOpen} onOpenChange={setConfirmBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected assets?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {selectedAssetIds.length} selected asset(s). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkUpdating}
              onClick={() => {
                setConfirmBulkDeleteOpen(false);
                setConfirmBulkDeleteFinalOpen(true);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      )}

      {canDeleteAssets && (
        <AlertDialog
        open={confirmBulkDeleteFinalOpen}
        onOpenChange={setConfirmBulkDeleteFinalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm permanent deletion for {selectedAssetIds.length} selected asset(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkUpdating}>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkUpdating}
              onClick={async () => {
                const ok = await handleBulkDeleteSelected();
                if (ok) {
                  setConfirmBulkDeleteFinalOpen(false);
                }
              }}
            >
              {bulkUpdating && bulkOperation === 'delete' ? 'Deleting...' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog */}
      <AssetFormDialog
        isOpen={isFormOpen}
        asset={selectedAsset}
        users={users ?? []}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAsset(null);
        }}
      />
      <AssetDrawer
        asset={selectedAssetForDrawer}
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        onEdit={handleEditFromDrawer}
        users={assignmentUsers}
        hasPrev={hasDrawerPrev}
        hasNext={hasDrawerNext}
        onPrev={handleDrawerPrev}
        onNext={handleDrawerNext}
        positionLabel={
          selectedDrawerIndex >= 0 ? `${selectedDrawerIndex + 1} / ${sortedAssets.length}` : ''
        }
      />

    </div>
  );
}
