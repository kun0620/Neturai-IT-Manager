import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTickets } from '@/hooks/useTickets';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { EditTicketDialog } from './EditTicketDialog'; // Import the EditTicketDialog
import { Tables } from '@/types/database.types';

interface TicketDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  categories: Tables<'ticket_categories'>[];
}

export const TicketDetailDialog: React.FC<TicketDetailDialogProps> = ({
  isOpen,
  onClose,
  ticketId,
  categories,
}) => {
  const { useTicketById } = useTickets;
  const { data: ticket, isLoading, error } = useTicketById(ticketId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const getCategoryName = (categoryId: string | null) => {
    return categories.find((cat) => cat.id === categoryId)?.name || 'N/A';
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>Loading ticket information...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>Failed to load ticket details: {error.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!ticket) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ticket Not Found</DialogTitle>
            <DialogDescription>The requested ticket could not be found.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ticket #{ticket.id.substring(0, 8)}</DialogTitle>
            <DialogDescription>Details for this support ticket.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium col-span-1">Title:</span>
              <span className="col-span-3">{ticket.title}</span>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <span className="text-sm font-medium col-span-1">Description:</span>
              <span className="col-span-3 text-sm text-muted-foreground">
                {ticket.description || 'No description provided.'}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium col-span-1">Status:</span>
              <span className="col-span-3">
                <Badge
                  variant={
                    ticket.status === 'Open'
                      ? 'default'
                      : ticket.status === 'In Progress'
                      ? 'secondary'
                      : ticket.status === 'Resolved'
                      ? 'success'
                      : 'destructive'
                  }
                >
                  {ticket.status}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium col-span-1">Priority:</span>
              <span className="col-span-3">
                <Badge
                  variant={
                    ticket.priority === 'Low'
                      ? 'outline'
                      : ticket.priority === 'Medium'
                      ? 'secondary'
                      : ticket.priority === 'High'
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {ticket.priority}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium col-span-1">Category:</span>
              <span className="col-span-3">{getCategoryName(ticket.category_id)}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium col-span-1">Created At:</span>
              <span className="col-span-3">
                {ticket.created_at ? format(new Date(ticket.created_at), 'PPP p') : 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm font-medium col-span-1">Last Updated:</span>
              <span className="col-span-3">
                {ticket.updated_at ? format(new Date(ticket.updated_at), 'PPP p') : 'N/A'}
              </span>
            </div>
            {/* Add more fields as needed */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              Edit Ticket
            </Button>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEditDialogOpen && (
        <EditTicketDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          ticketId={ticketId}
          categories={categories}
        />
      )}
    </>
  );
};
