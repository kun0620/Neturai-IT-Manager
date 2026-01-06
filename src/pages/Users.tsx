import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useUpdateUserRole } from '@/hooks/useUpdateUserRole';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';

import type { Profile } from '@/hooks/useAdminUsers';

const ROLE_OPTIONS = ['admin', 'it', 'user'] as const;

export default function Users() {
  const { data = [], isLoading } = useAdminUsers();
  const { mutate: updateRole } = useUpdateUserRole();
  const { isAdmin } = useCurrentProfile();

  const columns: ColumnDef<Profile>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => row.original.name || '-',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const user = row.original;

        // 🔒 IT / user เห็นอย่างเดียว
        if (!isAdmin) {
          return <span className="capitalize">{user.role ?? 'user'}</span>;
        }

        // 👑 admin แก้ role ได้
        return (
          <Select
            value={user.role ?? 'user'}
            onValueChange={(value) =>
              updateRole({
                userId: user.id,
                role: value as 'admin' | 'it' | 'user',
              })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">User Management</h1>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
