import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tables, Enums } from '@/types/supabase';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface TableViewProps {
  tickets: Tables<'tickets'>[];
  onTicketClick: (ticketId: string) => void;
}

export function TableView({ tickets, onTicketClick }: TableViewProps) {
  const getStatusBadgeVariant = (status: Enums<'ticket_status'>) => {
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

  const getPriorityBadgeVariant = (priority: Enums<'ticket_priority'>) => {
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
    <div className="rounded-md border overflow-auto h-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Updated At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No tickets found.
              </TableCell>
            </TableRow>
          ) : (
            tickets.map((ticket) => (
              <TableRow key={ticket.id} onClick={() => onTicketClick(ticket.id)} className="cursor-pointer">
                <TableCell className="font-medium">{ticket.id.substring(0, 8)}</TableCell>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell>{ticket.category}</TableCell>
                <TableCell>
                  <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.assignee || 'Unassigned'}</TableCell>
                <TableCell>
                  {ticket.updated_at ? format(new Date(ticket.updated_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
