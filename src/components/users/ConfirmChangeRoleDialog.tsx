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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  oldRole: string;
  newRole: string;
  onConfirm: () => void;
}

export function ConfirmChangeRoleDialog({
  open,
  onOpenChange,
  userEmail,
  oldRole,
  newRole,
  onConfirm,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm role change</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to change role of{' '}
            <span className="font-medium">{userEmail}</span>
            <br />
            <span className="mt-2 block">
              {oldRole} → <strong>{newRole}</strong>
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
