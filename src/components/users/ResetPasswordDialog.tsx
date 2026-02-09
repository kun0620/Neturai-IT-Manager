import React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { notifyError, notifySuccess } from '@/lib/notify';
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
  const [isSending, setIsSending] = React.useState(false);

  const handleResetPassword = async () => {
    setIsSending(true);
    try {
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('reset-password', {
        body: JSON.stringify({ email: userEmail }),
      });

      if (edgeFunctionError) throw edgeFunctionError;
      if (data.error) throw new Error(data.error);

      notifySuccess(
        'Password reset email sent',
        `Sent to "${userEmail}" for "${userName}".`
      );
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to send password reset email';
      notifyError(
        'Failed to send password reset email',
        message
      );
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
