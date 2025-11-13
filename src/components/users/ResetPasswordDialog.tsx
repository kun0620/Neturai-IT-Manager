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
import { useToast } from '@/hooks/use-toast'; // Corrected import path
import { supabase } from '@/lib/supabase';

interface ResetPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName: string;
  onSuccess: () => void;
}

export const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({
  isOpen,
  onClose,
  userEmail,
  userName,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSending, setIsSending] = React.useState(false);

  const handleResetPassword = async () => {
    setIsSending(true);
    try {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('reset-password', {
        body: JSON.stringify({ email: userEmail }),
      });

      if (edgeFunctionError) throw edgeFunctionError;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Success',
        description: `Password reset email sent to "${userEmail}" for user "${userName}".`,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send password reset email.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Password Reset</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to send a password reset email to{' '}
            <span className="font-semibold text-foreground">"{userEmail}"</span> for user{' '}
            <span className="font-semibold text-foreground">"{userName}"</span>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
          <Button onClick={handleResetPassword} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Reset Email'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
