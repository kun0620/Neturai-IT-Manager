import React, { useState } from 'react';
    import { ColumnDef } from '@tanstack/react-table';
    import { format } from 'date-fns';
    import { Button } from '@/components/ui/button';
    import { DataTable } from '@/components/ui/data-table';
    import { useUsers } from '@/hooks/useUsers';
    import { Tables } from '@/types/supabase';
    import { UserFormDialog } from '@/components/users/UserFormDialog';
    import { DeleteUserDialog } from '@/components/users/DeleteUserDialog';
    import { ResetPasswordDialog } from '@/components/users/ResetPasswordDialog';
    import { PlusCircle } from 'lucide-react';
    import { useQueryClient } from '@tanstack/react-query';
    import { LoadingSpinner } from '@/components/ui/loading-spinner'; // Corrected import path
    import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
    import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

    type UserWithRole = Tables<'users'> & {
      roles: Tables<'roles'> | null;
    };

    export const Users: React.FC = () => {
      const queryClient = useQueryClient();
      const { data: users, isLoading, isError, error } = useUsers();

      const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
      const [editingUser, setEditingUser] = useState<UserWithRole | undefined>(undefined);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
      const [deletingUser, setDeletingUser] = useState<{ id: string; name: string } | undefined>(undefined);
      const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
      const [resettingUser, setResettingUser] = useState<{ email: string; name: string } | undefined>(undefined);

      const handleAddUser = () => {
        setEditingUser(undefined);
        setIsFormDialogOpen(true);
      };

      const handleEditUser = (user: UserWithRole) => {
        setEditingUser(user);
        setIsFormDialogOpen(true);
      };

      const handleDeleteUser = (user: UserWithRole) => {
        setDeletingUser({ id: user.id, name: user.name });
        setIsDeleteDialogOpen(true);
      };

      const handleResetPassword = (user: UserWithRole) => {
        setResettingUser({ email: user.email, name: user.name });
        setIsResetPasswordDialogOpen(true);
      };

      const handleDialogClose = () => {
        setIsFormDialogOpen(false);
        setIsDeleteDialogOpen(false);
        setIsResetPasswordDialogOpen(false);
        setEditingUser(undefined);
        setDeletingUser(undefined);
        setResettingUser(undefined);
      };

      const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
      };

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
          cell: ({ row }) => format(new Date(row.getValue('created_at')), 'PPP'),
        },
        {
          id: 'actions',
          header: 'Actions',
          cell: ({ row }) => (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleEditUser(row.original)}>
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleResetPassword(row.original)}>
                Reset Password
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(row.original)}>
                Delete
              </Button>
            </div>
          ),
        },
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
            <Button onClick={handleAddUser}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add User
            </Button>
          </div>
          <p className="text-muted-foreground">
            Manage users and their roles within the system.
          </p>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <DataTable
              columns={columns}
              data={users || []}
              filterColumnId="email"
              filterPlaceholder="Filter by email..."
            />
          </div>

          <UserFormDialog
            isOpen={isFormDialogOpen}
            onClose={handleDialogClose}
            user={editingUser}
            onSuccess={handleSuccess}
          />

          {deletingUser && (
            <DeleteUserDialog
              isOpen={isDeleteDialogOpen}
              onClose={handleDialogClose}
              userId={deletingUser.id}
              userName={deletingUser.name}
              onSuccess={handleSuccess}
            />
          )}

          {resettingUser && (
            <ResetPasswordDialog
              isOpen={isResetPasswordDialogOpen}
              onClose={handleDialogClose}
              userEmail={resettingUser.email}
              userName={resettingUser.name}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      );
    };
