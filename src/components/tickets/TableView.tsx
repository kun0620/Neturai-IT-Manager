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
    if (!categoryId) return 'N/A';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500 text-white';
      case 'High':
        return 'bg-orange-500 text-white';
      case 'Medium':
        return 'bg-yellow-500 text-black';
      case 'Low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-500 text-white';
      case 'In Progress':
        return 'bg-indigo-500 text-white';
      case 'Resolved':
        return 'bg-emerald-500 text-white';
      case 'Closed':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tickets found. Create a new one to get started!
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id} onClick={() => onTicketClick(ticket.id)} className="cursor-pointer hover:bg-accent">
              <TableCell className="font-medium">{ticket.title}</TableCell>
              <TableCell>{getCategoryName(ticket.category_id)}</TableCell>
              <TableCell>
                <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
              </TableCell>
              <TableCell>{format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
