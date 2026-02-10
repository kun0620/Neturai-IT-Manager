import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createFadeSlideUp } from '@/lib/motion';
import { getTicketPriorityUi, getTicketStatusUi } from '@/lib/ticket-ui';

import { useTicketDrawer } from '@/context/TicketDrawerContext';
import type { Database } from '@/types/database.types';

/* ---------- Types ---------- */

type Ticket = Database['public']['Tables']['tickets']['Row'];

type RecentTicket = Pick<
  Ticket,
  'id' | 'title' | 'priority' | 'status' | 'created_at'
>;

interface RecentTicketsTableProps {
  tickets: RecentTicket[];
  isLoading?: boolean;
}

type SortKey = keyof RecentTicket;

const ITEMS_PER_PAGE = 5;

/* ---------- Component ---------- */

export function RecentTicketsTable({
  tickets,
  isLoading = false,
}: RecentTicketsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const { openDrawer, ticketId } = useTicketDrawer();
  
  useEffect(() => {
  if (!ticketId) {
    setOpeningId(null);
  }
}, [ticketId]);
  /* ---------- Sorting ---------- */

  const sortedTickets = [...tickets].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    const aValue = a[key];
    const bValue = b[key];

    if (aValue == null) return 1;
    if (bValue == null) return -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  const requestSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIndicator = (key: SortKey) =>
    sortConfig?.key === key
      ? sortConfig.direction === 'asc'
        ? ' ▲'
        : ' ▼'
      : null;

  /* ---------- Pagination ---------- */

  const totalPages = Math.ceil(sortedTickets.length / ITEMS_PER_PAGE);
  const currentTickets = sortedTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* ---------- Render ---------- */

  return (
    <motion.div {...createFadeSlideUp(0)}>
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
                <TableHead onClick={() => requestSort('title')}>
                  Title{getSortIndicator('title')}
                </TableHead>
                <TableHead onClick={() => requestSort('priority')}>
                  Priority{getSortIndicator('priority')}
                </TableHead>
                <TableHead onClick={() => requestSort('status')}>
                  Status{getSortIndicator('status')}
                </TableHead>
                <TableHead onClick={() => requestSort('created_at')}>
                  Created{getSortIndicator('created_at')}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : currentTickets.length ? (
                currentTickets.map((t) => {
                  const statusUi = getTicketStatusUi(t.status);
                  const priorityUi = getTicketPriorityUi(t.priority);

                  return (
                    <TableRow
                      key={t.id}
                      className={clsx(
                        'cursor-pointer transition-colors hover:bg-muted/60',
                        ticketId === t.id && 'bg-muted',
                        openingId === t.id && 'opacity-60 pointer-events-none'
                      )}
                      onClick={() => {
                        if (openingId) return;
                        setOpeningId(t.id);
                        openDrawer(t.id);
                      }}
                    >
                      <TableCell className="font-medium">
                        {t.title}
                      </TableCell>

                      <TableCell>
                        <Badge variant={priorityUi.variant}>
                          {priorityUi.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant={statusUi.variant}>
                          {statusUi.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {t.created_at
                          ? format(
                              new Date(t.created_at),
                              'dd MMM yyyy HH:mm'
                            )
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    🎉 No recent tickets
                    <div className="text-xs mt-1">
                      You're all caught up.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-end gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading || currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm self-center">
                Page {currentPage} / {totalPages}
              </span>

              <Button
                size="sm"
                variant="outline"
                disabled={isLoading || currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
