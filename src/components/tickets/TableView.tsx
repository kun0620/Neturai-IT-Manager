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
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTicketDrawer } from '@/context/TicketDrawerContext';
import { createFadeSlideUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { getTicketPriorityUi, getTicketStatusUi } from '@/lib/ticket-ui';

type Ticket = Database['public']['Tables']['tickets']['Row'];

interface TableViewProps {
  tickets: Ticket[];
  categories: Tables<'ticket_categories'>[];
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const TICKETS_TABLE_PAGE_SIZE_KEY = 'neturai_tickets_table_page_size';

export function TableView({
  tickets,
  categories,
}: TableViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
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

  const totalPages = Math.ceil(sortedTickets.length / pageSize);
  const totalRows = sortedTickets.length;
  const startRow = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);
  const currentTickets = sortedTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(TICKETS_TABLE_PAGE_SIZE_KEY);
      const parsed = Number(raw);
      if (PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) {
        setPageSize(parsed as (typeof PAGE_SIZE_OPTIONS)[number]);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TICKETS_TABLE_PAGE_SIZE_KEY, String(pageSize));
    } catch {
      // ignore
    }
  }, [pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (totalPages === 0) {
      if (currentPage !== 1) setCurrentPage(1);
      return;
    }
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const requestSort = (key: keyof Ticket) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key && prev.direction === 'ascending'
          ? 'descending'
          : 'ascending',
    }));
  };

  const getSortIcon = (key: keyof Ticket) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    return sortConfig.direction === 'ascending' ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

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
          <div className="max-h-[62vh] overflow-auto rounded-lg border border-border/70">
          <Table className="min-w-[760px] table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
              <TableRow>
                <TableHead className="w-[30%]">
                  <button
                    type="button"
                    onClick={() => requestSort('title')}
                    className="flex w-full items-center gap-1.5 text-left font-medium hover:text-foreground"
                  >
                    <span>Title</span>
                    {getSortIcon('title')}
                  </button>
                </TableHead>
                <TableHead className="w-[17%]">
                  <button
                    type="button"
                    onClick={() => requestSort('category_id')}
                    className="flex w-full items-center gap-1.5 text-left font-medium hover:text-foreground"
                  >
                    <span>Category</span>
                    {getSortIcon('category_id')}
                  </button>
                </TableHead>
                <TableHead className="w-[12%]">
                  <button
                    type="button"
                    onClick={() => requestSort('priority')}
                    className="mx-auto flex items-center justify-center gap-1.5 font-medium hover:text-foreground"
                  >
                    <span>Priority</span>
                    {getSortIcon('priority')}
                  </button>
                </TableHead>
                <TableHead className="w-[12%]">
                  <button
                    type="button"
                    onClick={() => requestSort('status')}
                    className="mx-auto flex items-center justify-center gap-1.5 font-medium hover:text-foreground"
                  >
                    <span>Status</span>
                    {getSortIcon('status')}
                  </button>
                </TableHead>
                <TableHead className="w-[14%]">
                  <button
                    type="button"
                    onClick={() => requestSort('assigned_to')}
                    className="mx-auto flex items-center justify-center gap-1.5 font-medium hover:text-foreground"
                  >
                    <span>Assigned To</span>
                    {getSortIcon('assigned_to')}
                  </button>
                </TableHead>
                <TableHead className="w-[15%]">
                  <button
                    type="button"
                    onClick={() => requestSort('created_at')}
                    className="flex w-full items-center gap-1.5 text-left font-medium hover:text-foreground"
                  >
                    <span>Created At</span>
                    {getSortIcon('created_at')}
                  </button>
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
                const isSlaBreached =
                  !!ticket.due_at &&
                  ticket.status !== 'closed' &&
                  new Date(ticket.due_at).getTime() < Date.now();
                const assignedToLabel = isUsersLoading
                  ? 'Loading...'
                  : ticket.assigned_to
                    ? userMap.get(ticket.assigned_to) ?? 'Unknown'
                    : 'Unassigned';

                return (
                  <TableRow
                    key={ticket.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ticket ${ticket.title}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button,a')) return;
                      openDrawer(ticket.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      openDrawer(ticket.id);
                    }}
                    className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <TableCell className="font-medium">
                      {ticket.title}
                    </TableCell>

                    <TableCell className="truncate">
                      {ticket.category_id
                        ? categoryMap.get(ticket.category_id) ?? 'N/A'
                        : 'N/A'}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={priorityUi.variant}>{priorityUi.label}</Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Badge
                          variant={statusUi.variant}
                          className={cn(statusUi.badgeClass)}
                        >
                          {statusUi.label}
                        </Badge>
                        {isSlaBreached && (
                          <Badge variant="destructive" className="text-[10px]">
                            SLA Breached
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center text-muted-foreground">
                      {assignedToLabel}
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
          </div>

          <motion.div className="flex flex-wrap items-center justify-between gap-3 py-4" {...createFadeSlideUp(0.12)}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Rows {startRow}-{endRow} of {totalRows}
              </span>
              <span className="text-xs text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">Show</span>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <Button
                  key={size}
                  variant={pageSize === size ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setPageSize(size)}
                >
                  {size}
                </Button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
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
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
          </CardContent>
        </motion.div>
      </Card>
    </motion.div>
  );
}
