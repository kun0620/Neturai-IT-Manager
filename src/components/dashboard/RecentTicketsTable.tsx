import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/types/database.types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '@/hooks/useTickets'; // Import useTickets to get categories
import { TicketDetailsDrawer } from '@/components/tickets/TicketDetailsDrawer'; // Import the TicketDetailsDrawer


interface RecentTicketsTableProps {
  tickets: Tables<'tickets'>[];
}

const ITEMS_PER_PAGE = 5;

export function RecentTicketsTable({ tickets }: RecentTicketsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Tables<'tickets'>;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const navigate = useNavigate();

  const { useTicketCategories } = useTickets;
  const { data: categories, isLoading: isLoadingCategories } = useTicketCategories(); // Fetch categories

  // State for the TicketDetailsDrawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const sortedTickets = [...tickets].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
    if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'ascending'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'ascending'
        ? aValue - bValue
        : bValue - aValue;
    }
    // Fallback for other types, or if types are mixed
    return 0;
  });

  const totalPages = Math.ceil(sortedTickets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTickets = sortedTickets.slice(startIndex, endIndex);

  const requestSort = (key: keyof Tables<'tickets'>) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Tables<'tickets'>) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const getStatusBadgeVariant = (status: Tables<'tickets'>['status']) => {
    switch (status) {
      case 'Open':
        return 'destructive';
      case 'In Progress':
        return 'secondary';
      case 'Resolved':
        return 'default';
      case 'Closed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: Tables<'tickets'>['priority']) => {
    switch (priority) {
      case 'Low':
        return 'outline';
      case 'Medium':
        return 'secondary';
      case 'High':
        return 'destructive';
      case 'Critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    return categories?.find((cat) => cat.id === categoryId)?.name || 'N/A';
  };

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedTicketId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
          <CardDescription>
            A list of the most recent IT service desk tickets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort('title')}
                >
                  Title {getSortIndicator('title')}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort('category_id')}
                >
                  Category {getSortIndicator('category_id')}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort('priority')}
                >
                  Priority {getSortIndicator('priority')}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort('status')}
                >
                  Status {getSortIndicator('status')}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => requestSort('created_at')}
                >
                  Created At {getSortIndicator('created_at')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTickets.length > 0 ? (
                currentTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleTicketClick(ticket.id)}>
                    <TableCell className="font-medium">
                      {/* Title is now plain text, but the row is clickable */}
                      {ticket.title}
                    </TableCell>
                    <TableCell>{getCategoryName(ticket.category_id)}</TableCell>
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
                    <TableCell>
                      {ticket.created_at
                        ? format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No recent tickets found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {sortedTickets.length > ITEMS_PER_PAGE && (
            <div className="flex justify-end items-center space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Details Drawer */}
      {!isLoadingCategories && categories && (
        <TicketDetailsDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          ticketId={selectedTicketId}
          categories={categories}
        />
      )}
    </motion.div>
  );
}
