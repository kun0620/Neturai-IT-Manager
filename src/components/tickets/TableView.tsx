import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/types/database.types';
import { format } from 'date-fns';

interface TableViewProps {
  tickets: Tables<'tickets'>[];
  categories: Tables<'ticket_categories'>[];
  onTicketClick: (ticketId: string) => void;
}

export const TableView: React.FC<TableViewProps> = ({ tickets, categories, onTicketClick }) => {
  const getCategoryName = (categoryId: string | null) => {
    return categories.find((cat) => cat.id === categoryId)?.name || 'N/A';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <TableRow key={ticket.id} onClick={() => onTicketClick(ticket.id)} className="cursor-pointer">
                <TableCell className="font-medium">{ticket.id.substring(0, 8)}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell>{getCategoryName(ticket.category_id)}</TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  {ticket.created_at ? format(new Date(ticket.created_at), 'PPP') : 'N/A'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No tickets found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
