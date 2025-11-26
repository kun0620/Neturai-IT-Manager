import React from 'react';
    import { ColumnDef } from '@tanstack/react-table';
    import { format } from 'date-fns';
    import { DataTable } from '@/components/ui/data-table';
    import { useUsers, UserWithRole } from '@/hooks/useUsers'; // Import UserWithRole from useUsers
    import { LoadingSpinner } from '@/components/ui/loading-spinner';
    import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
    import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

    export const Users: React.FC = () => {
      const { data: users, isLoading, isError, error } = useUsers();

      // Removed all state and handlers for dialogs related to CRUD operations

      const columns: ColumnDef<UserWithRole>[] = [
        {
          accessorKey: 'name',
          header: 'Name',
          cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
        },
        {
          accessorKey: 'email',
          header: 'Email',
        },
        {
          accessorKey: 'roles.name',
          header: 'Role',
          cell: ({ row }) => {
            const roleName = row.original.roles?.name;
            let roleColorClass = '';
            switch (roleName) {
              case 'Admin':
                roleColorClass = 'bg-red-100 text-red-800';
                break;
              case 'IT Support':
                roleColorClass = 'bg-green-100 text-green-800';
                break;
              case 'Viewer':
                roleColorClass = 'bg-blue-100 text-blue-800';
                break;
              default:
                roleColorClass = 'bg-gray-100 text-gray-800';
            }
            return (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColorClass}`}>
                {roleName || 'N/A'}
              </span>
            );
          },
        },
        {
          accessorKey: 'created_at',
          header: 'Created Date',
          cell: ({ row }) => {
            const createdAt = row.getValue('created_at') as string | null;
            if (createdAt) {
              try {
                return format(new Date(createdAt), 'PPP');
              } catch (e) {
                console.error("Error formatting date:", e);
                return 'Invalid Date';
              }
            }
            return 'N/A';
          },
        },
        // Removed 'actions' column as this is a view-only page
      ];

      if (isLoading) {
        return <LoadingSpinner />;
      }

      if (isError) {
        return (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load users: {error?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        );
      }

      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">User Management</h1>
            {/* Removed Add User button */}
          </div>
          <p className="text-muted-foreground">
            View user information and their assigned roles within the system. This page is for viewing user data only.
          </p>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <DataTable
              columns={columns}
              data={users || []}
              filterColumnId="email"
              filterPlaceholder="Filter by email..."
            />
          </div>

          {/* Removed UserFormDialog, DeleteUserDialog, ResetPasswordDialog components */}
        </div>
      );
    };
