import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminUsers, useUpdateUserRole, Profile } from '@/hooks/useAdminUsers';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';

const ROLE_OPTIONS = ['admin', 'it', 'user'] as const;

export default function Users() {
  const { data, isLoading } = useAdminUsers();
  const { mutate: updateRole } = useUpdateUserRole();
  const { isAdmin } = useCurrentProfile();

  const columns: ColumnDef<Profile>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const user = row.original;

        if (!isAdmin) {
          return <span className="capitalize">{user.role}</span>;
        }

        return (
          <Select
            value={user.role ?? 'user'}
            onValueChange={(value) =>
              updateRole({ userId: user.id, role: value as any })
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
      <DataTable columns={columns} data={data ?? []} />
    </div>
  );
}
