import { useAssignableUsers } from '@/hooks/useAssignableUsers';
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
import { Tables, Database } from '@/types/database.types';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTicketDrawer } from '@/context/TicketDrawerContext';
import { createFadeSlideUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { getTicketPriorityUi, getTicketStatusUi } from '@/lib/ticket-ui';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface TableViewProps {
  tickets: Ticket[];
  categories: Tables<'ticket_categories'>[];
}

const ITEMS_PER_PAGE = 10;

export function TableView({
  tickets,
  categories,
}: TableViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Ticket;
    direction: 'ascending' | 'descending';
  } | null>(null);

  const { data: users, isLoading: isUsersLoading } = useAssignableUsers();
  const { openDrawer } = useTicketDrawer();

  /* ---------------- Maps ---------------- */

  const userMap = new Map(
    (users ?? []).map((u) => [u.id, u.name ?? u.id])
  );

  const categoryMap = new Map(
    categories.map((cat) => [cat.id, cat.name])
  );

  /* ---------------- Sorting ---------------- */

  const sortedTickets = [...tickets].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue = a[sortConfig.key] as string | null;
    let bValue = b[sortConfig.key] as string | null;

    if (sortConfig.key === 'category_id') {
      aValue = a.category_id ? categoryMap.get(a.category_id) : null;
      bValue = b.category_id ? categoryMap.get(b.category_id) : null;
    }

    if (sortConfig.key === 'assigned_to') {
      aValue = a.assigned_to ? userMap.get(a.assigned_to) : null;
      bValue = b.assigned_to ? userMap.get(b.assigned_to) : null;
    }

    if (aValue == null) return sortConfig.direction === 'ascending' ? 1 : -1;
    if (bValue == null) return sortConfig.direction === 'ascending' ? -1 : 1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'ascending'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  const totalPages = Math.ceil(sortedTickets.length / ITEMS_PER_PAGE);
  const currentTickets = sortedTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const requestSort = (key: keyof Ticket) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key && prev.direction === 'ascending'
          ? 'descending'
          : 'ascending',
    }));
  };

  const getSortIndicator = (key: keyof Ticket) =>
    sortConfig?.key === key
      ? sortConfig.direction === 'ascending'
        ? ' ▲'
        : ' ▼'
      : null;

  /* ---------------- Render ---------------- */

  return (
    <motion.div {...createFadeSlideUp(0)}>
      <Card>
        <motion.div {...createFadeSlideUp(0.04)}>
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
            <CardDescription>
              A comprehensive list of all IT service desk tickets.
            </CardDescription>
          </CardHeader>
        </motion.div>

        <motion.div {...createFadeSlideUp(0.08)}>
          <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('title')}>
                  Title {getSortIndicator('title')}
                </TableHead>
                <TableHead onClick={() => requestSort('category_id')}>
                  Category {getSortIndicator('category_id')}
                </TableHead>
                <TableHead onClick={() => requestSort('priority')}>
                  <div className="text-center">
                    Priority {getSortIndicator('priority')}
                  </div>
                </TableHead>
                <TableHead onClick={() => requestSort('status')}>
                  <div className="text-center">
                    Status {getSortIndicator('status')}
                  </div>
                </TableHead>
                <TableHead onClick={() => requestSort('assigned_to')}>
                  <div className="text-center">
                    Assigned To {getSortIndicator('assigned_to')}
                  </div>
                </TableHead>
                <TableHead onClick={() => requestSort('created_at')}>
                  Created At {getSortIndicator('created_at')}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {currentTickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No tickets found.
                  </TableCell>
                </TableRow>
              )}

              {currentTickets.map((ticket) => {
                const statusUi = getTicketStatusUi(ticket.status);
                const priorityUi = getTicketPriorityUi(ticket.priority);

                return (
                  <TableRow
                    key={ticket.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button,a')) return;
                      openDrawer(ticket.id);
                    }}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {ticket.title}
                    </TableCell>

                    <TableCell>
                      {ticket.category_id
                        ? categoryMap.get(ticket.category_id) ?? 'N/A'
                        : 'N/A'}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={priorityUi.variant}>{priorityUi.label}</Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant={statusUi.variant}
                        className={cn(statusUi.badgeClass)}
                      >
                        {statusUi.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center text-muted-foreground">
                      {isUsersLoading
                        ? 'Loading...'
                        : ticket.assigned_to
                        ? userMap.get(ticket.assigned_to) ?? 'Unknown'
                        : 'Unassigned'}
                    </TableCell>

                    <TableCell>
                      {ticket.created_at
                        ? format(
                            new Date(ticket.created_at),
                            'MMM dd, yyyy HH:mm'
                          )
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <motion.div className="flex justify-end gap-2 py-4" {...createFadeSlideUp(0.12)}>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm">
                Page {currentPage} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </motion.div>
          )}
          </CardContent>
        </motion.div>
      </Card>
    </motion.div>
  );
}
