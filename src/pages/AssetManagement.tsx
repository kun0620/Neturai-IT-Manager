import React, { useMemo, useState } from 'react';
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


export function AssetManagement() {
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithType | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAssetForDrawer, setSelectedAssetForDrawer] =
  useState<AssetWithType | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');


  // เพิ่ม handler ให้ครบ
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedAssetForDrawer(null);
  };

  const handleEditFromDrawer = (asset: AssetWithType) => {
    setIsDrawerOpen(false);
    setSelectedAssetForDrawer(null);

    setSelectedAsset(asset);
    setIsFormOpen(true);
  };

  const statusCounts = useMemo(() => {
    const counts = assets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.status ?? 'Unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return counts;
  }, [assets]);

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
      return true;
    });
  }, [assets, statusFilter, categoryFilter, typeFilter]);



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
      <div className="mt-2 flex items-center justify-between rounded-md border bg-background/80 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 md:sticky md:top-14 md:z-20 md:mt-0">
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

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          Total: {assets.length}
        </Badge>
        {Object.entries(statusCounts).map(([status, count]) => (
          <Badge key={status} variant="secondary">
            {status}: {count}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            Status
          </div>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={6}>
              <SelectItem value="all">All</SelectItem>
              {Object.keys(statusCounts).map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            Category
          </div>
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={6}>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            Type
          </div>
          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={6}>
              <SelectItem value="all">All types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(statusFilter !== 'all' ||
        categoryFilter !== 'all' ||
        typeFilter !== 'all') && (
        <div className="flex gap-2">
          {statusFilter !== 'all' && (
            <Button
              variant="ghost"
              onClick={() => setStatusFilter('all')}
            >
              Clear status
            </Button>
          )}
          {(categoryFilter !== 'all' ||
            typeFilter !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                setCategoryFilter('all');
                setTypeFilter('all');
              }}
            >
              Clear category/type
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border">
        {filteredAssets.length === 0 ? (
          <EmptyState
            title="No assets found"
            message="Try adjusting your filters or add a new asset."
          />
        ) : (
          <DataTable
            columns={getColumns()}
            data={filteredAssets}
            filterColumnId="name"
            onRowClick={(asset) => {
              setSelectedAssetForDrawer(asset);
              setIsDrawerOpen(true);
            }}
          />
        )}
      </div>

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
      />

    </div>
  );
}
