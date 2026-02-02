import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
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
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useUpdateUserRole } from '@/hooks/useUpdateUserRole';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { toast } from 'sonner';
import type { UserRole } from '@/lib/permissions';

export default function Users() {
  const { data: users, isLoading } = useAdminUsers();
  const { mutate: updateRole } = useUpdateUserRole();
  const { can, profile, loading: profileLoading } = useCurrentProfile();

  const canViewUsers = can('user.view');
  const canUpdateRole = can('user.role.update');

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<{
    userId: string;
    email: string;
    role: UserRole;
  } | null>(null);

  const currentUserId = profile?.id;

  // ✅ loading ต้องมาก่อน permission
  if (isLoading || profileLoading) {
    return <LoadingSpinner />;
  }

  if (!canViewUsers) {
    return (
      <div className="p-6 text-muted-foreground">
        You do not have permission to view users.
      </div>
    );
  }

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === currentUserId;

        // ไม่มีสิทธิ์แก้ role → read only
        if (!canUpdateRole) {
          return <span className="capitalize">{user.role}</span>;
        }

        // ห้ามแก้ role ตัวเอง
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
  ];

  return (
    <>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">User Management</h1>
        <DataTable columns={columns} data={users ?? []} />
      </div>

      {/* Confirm Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm role change</DialogTitle>
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
                  toast.warning(
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
    </>
  );
}
