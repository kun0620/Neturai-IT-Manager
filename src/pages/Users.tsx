import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/data-table';
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
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { DeleteUserDialog } from '@/components/users/DeleteUserDialog';

import { useAdminUsers, type AdminUser } from '@/hooks/useAdminUsers';
import { useUpdateUserRole } from '@/hooks/useUpdateUserRole';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { notifyWarning } from '@/lib/notify';
import { supabase } from '@/lib/supabase';
import { assignAsset } from '@/features/assets/api/assignAsset';
import type { UserRole } from '@/lib/permissions';

interface UserManagementPanelProps {
  embedded?: boolean;
}

export function UserManagementPanel({ embedded = false }: UserManagementPanelProps) {
  const { data: users, isLoading } = useAdminUsers();
  const { mutate: updateRole } = useUpdateUserRole();
  const { can, profile, loading: profileLoading } = useCurrentProfile();
  const queryClient = useQueryClient();

  const canViewUsers = can('user.view');
  const canUpdateRole = can('user.role.update');
  const canDeleteUsers = can('user.delete');
  const canEditUsers = canUpdateRole;

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<{
    userId: string;
    email: string;
    role: UserRole;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPreferredContact, setEditPreferredContact] = useState('');
  const [editPrimaryAssetId, setEditPrimaryAssetId] = useState<string>('');
  const [editAssets, setEditAssets] = useState<
    Array<{
      id: string;
      name: string;
      asset_code: string;
      serial_number: string | null;
      assigned_to: string | null;
      asset_type: { key: string; name: string } | null;
    }>
  >([]);
  const [editAssetsLoading, setEditAssetsLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const currentUserId = profile?.id;

  const loadPrimaryAssets = useCallback(async (userId: string) => {
    setEditAssetsLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select(
        `
        id,
        name,
        asset_code,
        serial_number,
        assigned_to,
        asset_type:asset_types(key, name)
      `
      )
      .or(`assigned_to.is.null,assigned_to.eq.${userId}`);

    if (error) {
      setEditAssets([]);
      setEditAssetsLoading(false);
      return;
    }

    const primaryAssets = (data ?? []).filter((asset) => {
      const typeKey = asset.asset_type?.key?.toLowerCase() ?? '';
      const typeName = asset.asset_type?.name?.toLowerCase() ?? '';
      return (
        (typeKey === 'laptop' ||
          typeKey === 'desktop' ||
          typeName === 'laptop' ||
          typeName === 'desktop') &&
        (asset.assigned_to === null || asset.assigned_to === userId)
      );
    });

    setEditAssets(primaryAssets);
    setEditAssetsLoading(false);
  }, []);

  const openEditProfile = useCallback((user: AdminUser) => {
    setEditTarget(user);
    setEditFullName(user.full_name ?? user.name ?? '');
    setEditDepartment(user.department ?? '');
    setEditLocation(user.location ?? '');
    setEditPreferredContact(user.preferred_contact ?? '');
    setEditPrimaryAssetId(user.assigned_asset?.id ?? '');
    setEditOpen(true);
    loadPrimaryAssets(user.id);
  }, [loadPrimaryAssets]);

  useEffect(() => {
    const editUserId = searchParams.get('editUserId');
    if (!editUserId || !users || !canEditUsers || editOpen) return;

    const target = users.find((u) => u.id === editUserId);
    if (!target) return;

    openEditProfile(target);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('editUserId');
      return next;
    });
  }, [searchParams, users, canEditUsers, editOpen, setSearchParams, openEditProfile]);

  // Loading must be checked before permissions.
  if (isLoading || profileLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="h-8 w-1/3 rounded bg-muted animate-pulse"></div>
        <div className="h-5 w-1/2 rounded bg-muted animate-pulse"></div>
        <LoadingSkeleton count={6} className="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3" />
      </div>
    );
  }

  if (!canViewUsers) {
    return (
      <div className="p-6 text-muted-foreground">
        You do not have permission to view users.
      </div>
    );
  }

  const handleSaveProfile = async () => {
    if (!editTarget) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editFullName || null,
        name: editFullName || null,
        department: editDepartment || null,
        location: editLocation || null,
        preferred_contact: editPreferredContact || null,
      })
      .eq('id', editTarget.id);

    if (error) {
      notifyWarning('Failed to update user profile');
      return;
    }

    const currentPrimaryId = editTarget.assigned_asset?.id ?? '';
    const performedBy = profile?.id ?? null;

    if (editPrimaryAssetId !== currentPrimaryId) {
      const assetsToClear = editAssets.filter(
        (asset) =>
          asset.assigned_to === editTarget.id &&
          asset.id !== editPrimaryAssetId
      );

      for (const asset of assetsToClear) {
        await assignAsset(asset.id, editTarget.id, null, performedBy);
      }

      if (editPrimaryAssetId) {
        const selectedAsset = editAssets.find(
          (asset) => asset.id === editPrimaryAssetId
        );
        const oldUserId = selectedAsset?.assigned_to ?? null;
        await assignAsset(
          editPrimaryAssetId,
          oldUserId,
          editTarget.id,
          performedBy
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    setEditOpen(false);
    setEditTarget(null);
  };

  const columns: ColumnDef<AdminUser>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === currentUserId;

        if (!canUpdateRole) {
          return <span className="capitalize">{user.role}</span>;
        }

        if (isSelf) {
          return (
            <span className="capitalize text-muted-foreground">
              {user.role} (you)
            </span>
          );
        }

        return (
          <Select
            value={user.role}
            onValueChange={(value) => {
              setPending({
                userId: user.id,
                email: user.email,
                role: value as UserRole,
              });
              setOpen(true);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">admin</SelectItem>
              <SelectItem value="it">it</SelectItem>
              <SelectItem value="user">user</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.department || '-',
    },
    {
      id: 'device',
      header: 'Device',
      cell: ({ row }) => {
        const asset = row.original.assigned_asset;
        if (!asset) return '-';
        const typeLabel = asset.asset_type?.name ?? 'Device';
        const detail = asset.serial_number ?? asset.asset_code ?? '';
        return detail
          ? `${asset.name} (${typeLabel}: ${detail})`
          : `${asset.name} (${typeLabel})`;
      },
    },
    {
      accessorKey: 'preferred_contact',
      header: 'Preferred Contact',
      cell: ({ row }) => row.original.preferred_contact || '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === currentUserId;

        if (!canDeleteUsers && !canEditUsers) return null;

        return (
          <div className="flex items-center gap-2">
            {canEditUsers && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEditProfile(user)}
              >
                Edit Profile
              </Button>
            )}
            {canDeleteUsers && (
              <Button
                variant="destructive"
                size="sm"
                disabled={isSelf}
                onClick={() => {
                  setDeleteTarget({
                    userId: user.id,
                    userName: user.name ?? user.email ?? 'User',
                  });
                  setDeleteOpen(true);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className={embedded ? 'space-y-4' : 'flex flex-col gap-6 p-4 md:p-6'}>
        {!embedded && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Neturai IT Manager
            </p>
            <h1 className="text-3xl font-semibold">User Management</h1>
            <p className="text-muted-foreground">
              Control access and roles across the organization.
            </p>
          </div>
        )}

        {embedded && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Manage users, roles, departments, and primary devices.
            </p>
          </div>
        )}

        <div className={embedded ? 'rounded-md border' : ''}>
          <DataTable columns={columns} data={users ?? []} />
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm role change</DialogTitle>
            <DialogDescription className="sr-only">
              Confirm the selected role update for this user.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Change role of <b>{pending?.email}</b> to{' '}
            <b className="capitalize">{pending?.role}</b> ?
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setPending(null);
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={() => {
                if (!pending) return;

                if (!canUpdateRole) {
                  notifyWarning(
                    'You do not have permission to update user role'
                  );
                  setOpen(false);
                  setPending(null);
                  return;
                }

                updateRole({
                  userId: pending.userId,
                  role: pending.role,
                });

                setOpen(false);
                setPending(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteUserDialog
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        userId={deleteTarget?.userId ?? ''}
        userName={deleteTarget?.userName ?? ''}
        onSuccess={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
      />

      <Dialog
        open={editOpen}
        onOpenChange={(nextOpen) => {
          setEditOpen(nextOpen);
          if (!nextOpen) {
            setEditTarget(null);
            setEditAssets([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user profile</DialogTitle>
            <DialogDescription className="sr-only">
              Update user profile fields and assigned primary device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Full Name</div>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editFullName}
                onChange={(event) => setEditFullName(event.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Email</div>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editTarget?.email ?? ''}
                disabled
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Department</div>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editDepartment}
                onChange={(event) => setEditDepartment(event.target.value)}
                placeholder="Department"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Location</div>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editLocation}
                onChange={(event) => setEditLocation(event.target.value)}
                placeholder="Location"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Preferred Contact</div>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editPreferredContact}
                onChange={(event) => setEditPreferredContact(event.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Primary Device</div>
              <Select
                value={editPrimaryAssetId}
                onValueChange={(value) => setEditPrimaryAssetId(value)}
                disabled={editAssetsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Laptop/Desktop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {editAssets.map((asset) => {
                    const typeLabel = asset.asset_type?.name ?? 'Device';
                    const detail = asset.serial_number ?? asset.asset_code ?? '';
                    const label = detail
                      ? `${asset.name} (${typeLabel}: ${detail})`
                      : `${asset.name} (${typeLabel})`;
                    return (
                      <SelectItem key={asset.id} value={asset.id}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {!editAssetsLoading && editAssets.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  This user has no assigned laptop/desktop devices.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Users() {
  return <UserManagementPanel />;
}
