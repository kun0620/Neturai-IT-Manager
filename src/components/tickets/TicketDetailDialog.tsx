import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useTicketDetails } from '@/hooks/useTicketDetails'; // Assuming this hook will be created
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';

interface TicketDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
}

export const TicketDetailDialog: React.FC<TicketDetailDialogProps> = ({ isOpen, onClose, ticketId }) => {
  const { data: ticket, isLoading, error } = useTicketDetails(ticketId); // Fetch ticket details

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] h-[70vh] flex items-center justify-center">
          <LoadingSpinner />
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] h-[70vh]">
          <EmptyState
            title="Error Loading Ticket Details"
            message={error.message}
            action={<Button onClick={onClose}>Close</Button>}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (!ticket) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] h-[70vh]">
          <EmptyState
            title="Ticket Not Found"
            message="The requested ticket could not be loaded."
            action={<Button onClick={onClose}>Close</Button>}
          />
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Open':
        return 'destructive';
      case 'In Progress':
        return 'secondary';
      case 'Closed':
      case 'Resolved':
        return 'default';
      case 'Pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'secondary';
      case 'Low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Ticket #{ticket.id?.substring(0, 8)} - {ticket.subject}
          </DialogTitle>
          <DialogDescription>
            Details and history for this ticket.
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-2" />
        <ScrollArea className="flex-grow pr-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1 text-sm font-medium">Status:</div>
              <div className="col-span-3">
                <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1 text-sm font-medium">Priority:</div>
              <div className="col-span-3">
                <Badge variant={getPriorityBadgeVariant(ticket.priority)}>{ticket.priority}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1 text-sm font-medium">Category:</div>
              <div className="col-span-3 text-sm">{ticket.category}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1 text-sm font-medium">Created By:</div>
              <div className="col-span-3 text-sm">{ticket.users?.name || 'N/A'}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1 text-sm font-medium">Assigned To:</div>
              <div className="col-span-3 text-sm">{ticket.assignee_users?.name || 'Unassigned'}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1 text-sm font-medium">Created At:</div>
              <div className="col-span-3 text-sm">
                {ticket.created_at ? format(new Date(ticket.created_at), 'PPP p') : 'N/A'}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-1 text-sm font-medium">Last Updated:</div>
              <div className="col-span-3 text-sm">
                {ticket.updated_at ? format(new Date(ticket.updated_at), 'PPP p') : 'N/A'}
              </div>
            </div>
            <Separator className="my-4" />
            <div>
              <h4 className="mb-2 text-lg font-semibold">Description</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{ticket.description}</p>
            </div>
            {/* Add sections for comments and history here later */}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
