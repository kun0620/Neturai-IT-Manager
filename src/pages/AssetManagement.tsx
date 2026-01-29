import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { AssetFormDialog } from '@/components/assets/AssetFormDialog';
import { useAssets } from '@/hooks/useAssets';
import { useUsersForAssignment } from '@/hooks/useUsers';
import { getColumns } from '@/components/assets/columns';
import { AssetWithType } from '@/types/asset';
import { AssetDrawer } from '@/features/assets/components/AssetDrawer';
import { useAuth } from '@/context/AuthContext';


export function AssetManagement() {
  // ✅ hooks ต้องอยู่ใน component เท่านั้น
  const { data: assets = [], isLoading, isError, error } = useAssets();
  const { user } = useAuth();
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
  const handleEditAsset = (asset: AssetWithType) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAssetForDrawer, setSelectedAssetForDrawer] =
  useState<AssetWithType | null>(null);

  const handleViewAsset = (asset: AssetWithType) => {
    setSelectedAssetForDrawer(asset);
    setIsDrawerOpen(true);
  };

  const updateDrawerAsset = (next: AssetWithType) => {
    setSelectedAssetForDrawer(next);
  };

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



  /* ---------------- Loading / Error ---------------- */

  if (isLoading || usersLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Asset Management
        </h1>
        <p className="text-muted-foreground">Loading assets...</p>
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Asset Management
        </h1>

        <Button
          onClick={() => {
            setSelectedAsset(null);
            setIsFormOpen(true);
          }}
        >
          Add Asset
        </Button>
      </div>

      <p className="text-muted-foreground">
        Manage your organization's assets, track their status, and
        assign them to users.
      </p>

      <div className="rounded-md border">
        <DataTable
          columns={getColumns()}
          data={assets}
          filterColumnId="name"
          onRowClick={(asset) => {
            setSelectedAssetForDrawer(asset);
            setIsDrawerOpen(true);
          }}
        />
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
