import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { AssetFormDialog } from '@/components/assets/AssetFormDialog';
import { useAssets } from '@/hooks/useAssets';
import { useUsersForAssignment } from '@/hooks/useUsers';
import { columns } from '@/components/assets/columns';
import { Tables } from '@/types/supabase';

export function Assets() {
  const { data: assets, isLoading, isError, error } = useAssets();
  const { data: users, isLoading: usersLoading, isError: usersError } = useUsersForAssignment();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Tables<'assets'> | null>(null);

  useEffect(() => {
    const handleEditAsset = (event: Event) => {
      const customEvent = event as CustomEvent<Tables<'assets'>>;
      setSelectedAsset(customEvent.detail);
      setIsFormOpen(true);
    };

    window.addEventListener('editAsset', handleEditAsset);

    return () => {
      window.removeEventListener('editAsset', handleEditAsset);
    };
  }, []);

  const handleAddAssetClick = () => {
    setSelectedAsset(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedAsset(null);
  };

  if (isLoading || usersLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
        <p className="text-muted-foreground">Loading assets...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
        <p className="text-red-500">Error loading assets: {error?.message}</p>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
        <p className="text-red-500">Error loading users for assignment.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
        <Button onClick={handleAddAssetClick}>Add Asset</Button>
      </div>
      <p className="text-muted-foreground">
        Manage your organization's assets, track their status, and assign them to users.
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
        onClose={handleCloseForm}
        asset={selectedAsset}
        users={users || []}
      />
    </div>
  );
}
