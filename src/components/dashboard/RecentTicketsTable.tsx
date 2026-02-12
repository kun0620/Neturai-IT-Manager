import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
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

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
const RECENT_TICKETS_PAGE_SIZE_KEY = 'neturai_recent_tickets_page_size';

/* ---------- Component ---------- */

export function RecentTicketsTable({
  tickets,
  isLoading = false,
}: RecentTicketsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const { openDrawer, ticketId } = useTicketDrawer();
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  
  useEffect(() => {
  if (!ticketId) {
    setOpeningId(null);
    return;
  }
  setActiveRowId(ticketId);
}, [ticketId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(RECENT_TICKETS_PAGE_SIZE_KEY);
      const parsed = Number(raw);
      if (PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) {
        setPageSize(parsed as (typeof PAGE_SIZE_OPTIONS)[number]);
      }
    } catch {
      // ignore
    }
  }, []);
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

  const totalPages = Math.ceil(sortedTickets.length / pageSize);
  const currentTickets = sortedTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (currentTickets.length === 0) {
      setActiveRowId(null);
      return;
    }
    if (!activeRowId || !currentTickets.some((t) => t.id === activeRowId)) {
      setActiveRowId(currentTickets[0].id);
    }
  }, [currentTickets, activeRowId]);

  useEffect(() => {
    if (!activeRowId) return;
    rowRefs.current[activeRowId]?.scrollIntoView({
      block: 'nearest',
    });
  }, [activeRowId]);

  const openTicketFromRow = (id: string) => {
    if (openingId) return;
    setOpeningId(id);
    setActiveRowId(id);
    openDrawer(id);
  };

  const handleTableKeyDown = (event: KeyboardEvent<HTMLTableSectionElement>) => {
    if (!currentTickets.length) return;

    const activeIndex = currentTickets.findIndex((t) => t.id === activeRowId);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex =
        activeIndex < 0
          ? 0
          : Math.min(activeIndex + 1, currentTickets.length - 1);
      setActiveRowId(currentTickets[nextIndex].id);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex =
        activeIndex < 0 ? 0 : Math.max(activeIndex - 1, 0);
      setActiveRowId(currentTickets[prevIndex].id);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveRowId(currentTickets[0].id);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveRowId(currentTickets[currentTickets.length - 1].id);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!activeRowId) return;
      openTicketFromRow(activeRowId);
    }
  };

  useEffect(() => {
    if (totalPages === 0) {
      if (currentPage !== 1) setCurrentPage(1);
      return;
    }
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(RECENT_TICKETS_PAGE_SIZE_KEY, String(pageSize));
    } catch {
      // ignore
    }
  }, [pageSize]);

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
                <TableHead
                  className="text-center"
                  onClick={() => requestSort('status')}
                >
                  Status{getSortIndicator('status')}
                </TableHead>
                <TableHead onClick={() => requestSort('created_at')}>
                  Created{getSortIndicator('created_at')}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody
              tabIndex={0}
              onKeyDown={handleTableKeyDown}
              className="outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
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
                      ref={(el) => {
                        rowRefs.current[t.id] = el;
                      }}
                      tabIndex={-1}
                      aria-selected={activeRowId === t.id}
                      className={clsx(
                        'cursor-pointer transition-colors hover:bg-muted/60',
                        activeRowId === t.id && 'bg-primary/10 ring-1 ring-primary/30',
                        ticketId === t.id && 'bg-muted',
                        openingId === t.id && 'opacity-60 pointer-events-none'
                      )}
                      onMouseEnter={() => setActiveRowId(t.id)}
                      onClick={() => {
                        openTicketFromRow(t.id);
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

                      <TableCell className="text-center">
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Show</span>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <Button
                  key={size}
                  size="sm"
                  variant={pageSize === size ? 'default' : 'outline'}
                  onClick={() => setPageSize(size)}
                  disabled={isLoading}
                  className="h-8 px-2"
                >
                  {size}
                </Button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
