import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast'; // Corrected import path

interface DeleteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onSuccess: () => void;
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { toast: shadcnToast } = useToast(); // Renamed to avoid conflict with sonner.toast

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('delete-user', {
        body: JSON.stringify({ userId: id }),
      });

      if (edgeFunctionError) throw edgeFunctionError;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User Deleted', {
        description: `User "${userName}" has been successfully removed.`,
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to Delete User', {
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    deleteUserMutation.mutate(userId);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete user{' '}
            <span className="font-semibold text-foreground">"{userName}"</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteUserMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteUserMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
