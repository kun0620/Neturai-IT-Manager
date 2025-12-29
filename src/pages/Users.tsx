import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DataTable } from '@/components/ui/data-table';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import type { Database } from '@/types/database.types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const Users: React.FC = () => {
  const { data: users, isLoading, isError, error } = useAdminUsers();

  const columns: ColumnDef<Profile>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('name') || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role;

        const map: Record<string, string> = {
          admin: 'bg-red-100 text-red-800',
          it: 'bg-green-100 text-green-800',
          user: 'bg-blue-100 text-blue-800',
        };

        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${map[role ?? ''] ?? 'bg-gray-100 text-gray-800'}`}>
            {role ?? 'N/A'}
          </span>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created Date',
      cell: ({ row }) => {
        const createdAt = row.getValue('created_at') as string | null;
        return createdAt ? format(new Date(createdAt), 'PPP') : 'N/A';
      },
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  if (isError) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load users: {error?.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">User Management</h1>
      <p className="text-muted-foreground">
        View user information and roles.
      </p>

      <div className="rounded-lg border p-6">
        <DataTable
          columns={columns}
          data={users || []}
          filterColumnId="email"
          filterPlaceholder="Filter by email..."
        />
      </div>
    </div>
  );
};
