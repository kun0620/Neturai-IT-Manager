import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { AssetFormDialog } from '@/components/assets/AssetFormDialog';
import { useAssets } from '@/hooks/useAssets';
import { useUsersForAssignment } from '@/hooks/useUsers';
import { getColumns } from '@/components/assets/columns';
import { Tables } from '@/types/supabase';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { AssetWithType } from '@/types/asset';

export function Assets() {
  const { can, loading: profileLoading } = useCurrentProfile();
  const columns = getColumns();
  const { data: assets, isLoading, isError, error } = useAssets();
  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
  } = useUsersForAssignment();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] =
    useState<AssetWithType | null>(null);

  // ---------------------------
  // Edit Asset event
  // ---------------------------
  useEffect(() => {
    const handleEditAsset = (event: Event) => {
      if (!can('asset.edit')) return; // ✅ กันตรงนี้

      const customEvent = event as CustomEvent<AssetWithType>;
      setSelectedAsset(customEvent.detail);
      setIsFormOpen(true);
    };

    window.addEventListener('editAsset', handleEditAsset);
    return () => {
      window.removeEventListener('editAsset', handleEditAsset);
    };
  }, [can]);


  // ---------------------------
  // STEP 1: Profile loading
  // ---------------------------
  if (profileLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Asset Management
        </h1>
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // ---------------------------
  // STEP 1: Permission check
  // ---------------------------
  if (!can('asset.view')) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Asset Management
        </h1>
        <p className="text-muted-foreground text-center">
          You do not have permission to view assets.
        </p>
      </div>
    );
  }

  // ---------------------------
  // Data loading
  // ---------------------------
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

  // ---------------------------
  // Normal render
  // ---------------------------
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Asset Management
        </h1>

        {/* STEP 2 จะมาแก้ละเอียดกว่านี้ */}
        {can('asset.edit') && (
          <Button onClick={() => {
            setSelectedAsset(null);
            setIsFormOpen(true);
          }}>
            Add Asset
          </Button>
        )}
      </div>

      <p className="text-muted-foreground">
        Manage your organization's assets, track their status, and assign them
        to users.
      </p>

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={assets || []}
          filterColumnId="name"
          filterPlaceholder="Filter assets by name..."
        />
      </div>

      <AssetFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAsset(null);
        }}
        asset={selectedAsset}
        users={users || []}
      />
    </div>
  );
}
