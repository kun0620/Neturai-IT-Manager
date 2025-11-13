import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Asset, Database } from '@/types/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { AssetFormDialog } from '@/components/assets/AssetFormDialog';
import { AssetDetailDrawer } from '@/components/assets/AssetDetailDrawer';
import { useUsersForAssignment } from '@/hooks/useUsers';

type AssetWithUser = Asset & {
  users: { name: string } | null;
};

export const AssetManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithUser | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading: isLoadingUsers } = useUsersForAssignment();

  const {
    data: assets,
    isLoading: isLoadingAssets,
    error: assetsError,
  } = useQuery<AssetWithUser[], Error>({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*, users(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AssetWithUser[];
    },
  });

  const deleteAssetMutation = useMutation<void, Error, string>({
    mutationFn: async (assetId) => {
      const { error } = await supabase.from('assets').delete().eq('id', assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset Deleted', {
        description: 'The asset has been successfully removed.',
      });
    },
    onError: (error) => {
      toast.error('Failed to Delete Asset', {
        description: error.message,
      });
    },
  });

  const handleAddAsset = () => {
    setSelectedAsset(null);
    setIsFormDialogOpen(true);
  };

  const handleEditAsset = (asset: AssetWithUser) => {
    setSelectedAsset(asset);
    setIsFormDialogOpen(true);
  };

  const handleDeleteAsset = (assetId: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      deleteAssetMutation.mutate(assetId);
    }
  };

  const handleViewDetails = (asset: AssetWithUser) => {
    setSelectedAsset(asset);
    setIsDetailDrawerOpen(true);
  };

  const filteredAssets = assets?.filter((asset) =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.asset_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (asset.users?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (isLoadingAssets || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (assetsError) {
    return (
      <EmptyState
        title="Error Loading Assets"
        message={assetsError.message}
        action={<Button onClick={() => queryClient.invalidateQueries({ queryKey: ['assets'] })}>Retry</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Asset Management</h1>
        <Button onClick={handleAddAsset}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Asset
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        {/* Add filter dropdowns here if needed */}
      </div>

      <div className="rounded-md border">
        {filteredAssets && filteredAssets.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Asset Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Last Service Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.asset_code}</TableCell>
                  <TableCell>{asset.category}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        asset.status === 'Available'
                          ? 'default'
                          : asset.status === 'Assigned'
                          ? 'secondary'
                          : asset.status === 'In Repair'
                          ? 'outline'
                          : 'destructive'
                      }
                    >
                      {asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{asset.users?.name || 'Unassigned'}</TableCell>
                  <TableCell>
                    {asset.last_service_date ? format(new Date(asset.last_service_date), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewDetails(asset)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteAsset(asset.id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No Assets Found"
            message="Start by adding a new asset to your inventory."
            action={<Button onClick={handleAddAsset}>Add Asset</Button>}
          />
        )}
      </div>

      {isFormDialogOpen && (
        <AssetFormDialog
          isOpen={isFormDialogOpen}
          onClose={() => setIsFormDialogOpen(false)}
          asset={selectedAsset}
          users={users || []}
        />
      )}

      {isDetailDrawerOpen && selectedAsset && (
        <AssetDetailDrawer
          isOpen={isDetailDrawerOpen}
          onClose={() => setIsDetailDrawerOpen(false)}
          asset={selectedAsset}
          users={users || []}
        />
      )}
    </div>
  );
};
