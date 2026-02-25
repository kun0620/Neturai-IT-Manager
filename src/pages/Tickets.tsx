import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  FileSpreadsheet,
  KanbanSquare,
  List,
  ListFilter,
  PlusCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { TableView } from '@/components/tickets/TableView';
import { KanbanView } from '@/components/tickets/KanbanView';
import { useTickets } from '@/hooks/useTickets';
import { ErrorState } from '@/components/common/ErrorState';
import { TicketDetailsDrawer } from '@/components/tickets/TicketDetailsDrawer'; // Import the drawer
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { hasPermission } from '@/lib/permissions';
import { motion } from 'motion/react';
import { createFadeSlideUp } from '@/lib/motion';
import { TicketsPageSkeleton } from '@/components/tickets/TicketsPageSkeleton';
import { useAssignableUsers } from '@/hooks/useAssignableUsers';
import { useTicketDrawer } from '@/context/TicketDrawerContext';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notify';
import { exportRowsToExcel } from '@/lib/export';
import { useSLAPolicies } from '@/hooks/useSLAPolicies';
import { buildSlaResolutionHoursMap, isTicketSlaBreached } from '@/lib/sla';

const PRIORITY_ORDER: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};
type TicketViewPreset =
  | 'default'
  | 'my_tickets'
  | 'open'
  | 'in_progress'
  | 'overdue';

const formatPriorityLabel = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'low') return 'Low';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'high') return 'High';
  if (normalized === 'critical') return 'Critical';
  return value;
};

export const Tickets: React.FC = () => {
  const {
    role,
    session,
  } = useAuth();
  
  const myUserId = session?.user?.id;

  const canManageTickets = hasPermission(role, 'ticket.manage');
  
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { openDrawer } = useTicketDrawer();
  const consumedOpenTicketIdRef = useRef<string | null>(null);
  const slaFilter = searchParams.get('sla'); // 'breach' | null
  const openTicketId = searchParams.get('open_ticket');
  const statusQuery = searchParams.get('status');
  // Backward compatibility: support legacy typo query key `fillet`.
  const filterQuery = searchParams.get('filter') ?? searchParams.get('fillet');
  const scopeQuery = searchParams.get('scope');
  const searchQuery = searchParams.get('q') ?? '';
  const viewQuery = searchParams.get('view');
  const categoryQuery = searchParams.get('category') ?? 'all';
  const priorityQuery = searchParams.get('priority') ?? 'all';
  const assigneeQuery = searchParams.get('assignee') ?? 'all';
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(
    () => searchParams.get('q') ?? ''
  );

  const statusFilter =
    statusQuery === 'open' ||
    statusQuery === 'in_progress' ||
    statusQuery === 'closed'
      ? statusQuery
      : null;
  const isOverdueFilter = filterQuery === 'overdue';
  const scopeFilter = scopeQuery === 'my' ? 'my' : 'all';
  const hasUrlFilters =
    !!searchQuery.trim() ||
    !!statusFilter ||
    isOverdueFilter ||
    slaFilter === 'breach' ||
    categoryQuery !== 'all' ||
    priorityQuery !== 'all' ||
    assigneeQuery !== 'all' ||
    (canManageTickets && scopeFilter === 'my');

  const { useAllTickets, useTicketCategories } = useTickets;

  const {
    data: tickets,
    isLoading: isLoadingTickets,
    isError: isErrorTickets,
    error: ticketsError,
  } = useAllTickets();

  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    error: categoriesError,
  } = useTicketCategories();

  const [showMyTickets, setShowMyTickets] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(
    viewQuery === 'kanban' ? 'kanban' : 'table'
  );
  const [categoryFilter, setCategoryFilter] = useState(categoryQuery);
  const [priorityFilter, setPriorityFilter] = useState(priorityQuery);
  const [assigneeFilter, setAssigneeFilter] = useState(assigneeQuery);
  const TICKETS_VIEW_MODE_KEY = 'neturai_tickets_view_mode';
  const TICKETS_PRESET_KEY = 'neturai_tickets_preset';
  const [selectedPreset, setSelectedPreset] = useState<TicketViewPreset>('default');
  const { data: assignableUsers } = useAssignableUsers();
  const { data: slaPolicies = [] } = useSLAPolicies();
  const prefetchAssetsRoute = useCallback(() => {
    void import('@/pages/AssetManagement');
  }, []);

  
  useEffect(() => {
    if (!canManageTickets) {
      setShowMyTickets(true);
      return;
    }
    setShowMyTickets(scopeFilter === 'my');
  }, [canManageTickets, scopeFilter]);

  const applyPreset = (preset: TicketViewPreset) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    nextParams.delete('category');
    nextParams.delete('priority');
    nextParams.delete('assignee');
    nextParams.delete('status');
    nextParams.delete('filter');
    nextParams.delete('fillet');
    nextParams.delete('scope');
    nextParams.delete('sla');

    if (preset === 'my_tickets' && canManageTickets) {
      nextParams.set('scope', 'my');
    }
    if (preset === 'open') {
      nextParams.set('status', 'open');
    }
    if (preset === 'in_progress') {
      nextParams.set('status', 'in_progress');
    }
    if (preset === 'overdue') {
      nextParams.set('filter', 'overdue');
    }

    setSelectedPreset(preset);
    setSearchParams(nextParams);
  };

  const applyStatusFilter = (status: 'all' | 'open' | 'in_progress' | 'closed') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('filter');
    nextParams.delete('fillet');
    if (status === 'all') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', status);
    }
    setSearchParams(nextParams);
  };

  const applyOverdueFilter = (enabled: boolean) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('status');
    if (enabled) {
      nextParams.set('filter', 'overdue');
    } else {
      nextParams.delete('filter');
      nextParams.delete('fillet');
    }
    setSearchParams(nextParams);
  };

  useEffect(() => {
    setSearchTerm(searchQuery);
    setDebouncedSearchTerm(searchQuery);
    setCategoryFilter(categoryQuery);
    setPriorityFilter(priorityQuery);
    setAssigneeFilter(assigneeQuery);
    setViewMode(viewQuery === 'kanban' ? 'kanban' : 'table');
  }, [assigneeQuery, categoryQuery, priorityQuery, searchQuery, viewQuery]);

  useEffect(() => {
    const onlyBaseFilters =
      !searchQuery.trim() &&
      categoryQuery === 'all' &&
      priorityQuery === 'all' &&
      assigneeQuery === 'all' &&
      slaFilter !== 'breach';
    if (!onlyBaseFilters) {
      setSelectedPreset('default');
      return;
    }
    if (scopeFilter === 'my' && canManageTickets && !statusFilter && !isOverdueFilter) {
      setSelectedPreset('my_tickets');
      return;
    }
    if (statusFilter === 'open' && !isOverdueFilter && scopeFilter === 'all') {
      setSelectedPreset('open');
      return;
    }
    if (statusFilter === 'in_progress' && !isOverdueFilter && scopeFilter === 'all') {
      setSelectedPreset('in_progress');
      return;
    }
    if (isOverdueFilter && !statusFilter && scopeFilter === 'all') {
      setSelectedPreset('overdue');
      return;
    }
    setSelectedPreset('default');
  }, [
    assigneeQuery,
    canManageTickets,
    categoryQuery,
    isOverdueFilter,
    priorityQuery,
    scopeFilter,
    searchQuery,
    slaFilter,
    statusFilter,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);


  const categoryMap = useMemo(
    () => new Map((categories || []).map((category) => [category.id, category.name])),
    [categories]
  );
  const priorityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (tickets || [])
            .map((ticket) => ticket.priority)
            .filter((priority): priority is string => Boolean(priority))
        )
      ).sort((a, b) => {
        const aRank = PRIORITY_ORDER[a.toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
        const bRank = PRIORITY_ORDER[b.toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
        return a.localeCompare(b);
      }),
    [tickets]
  );
  const slaResolutionHoursMap = useMemo(
    () => buildSlaResolutionHoursMap(slaPolicies),
    [slaPolicies]
  );

  const filteredTickets = useMemo(
    () =>
      tickets?.filter(ticket => {
        const keyword = debouncedSearchTerm.trim().toLowerCase();
        const now = Date.now();
        const categoryName = ticket.category_id
          ? (categoryMap.get(ticket.category_id) || '').toLowerCase()
          : '';

        const matchKeyword =
          keyword.length === 0 ||
          ticket.title?.toLowerCase().includes(keyword) ||
          ticket.description?.toLowerCase().includes(keyword) ||
          ticket.status?.toLowerCase().includes(keyword) ||
          ticket.priority?.toLowerCase().includes(keyword) ||
          categoryName.includes(keyword);

        const matchStatus = statusFilter ? ticket.status === statusFilter : true;
        const matchCategory =
          categoryFilter === 'all' || ticket.category_id === categoryFilter;
        const matchPriority =
          priorityFilter === 'all' ||
          (ticket.priority || '').toLowerCase() === priorityFilter.toLowerCase();
        const matchAssignee =
          assigneeFilter === 'all'
            ? true
            : assigneeFilter === 'unassigned'
              ? !ticket.assigned_to
              : ticket.assigned_to === assigneeFilter;

        const matchOverdue =
          !isOverdueFilter ||
          (ticket.due_at !== null &&
            new Date(ticket.due_at).getTime() < now &&
            ticket.status !== 'closed');

        if (slaFilter !== 'breach') {
          return (
            matchKeyword &&
            matchStatus &&
            matchCategory &&
            matchPriority &&
            matchAssignee &&
            matchOverdue
          );
        }

        const isSlaBreach = isTicketSlaBreached(
          ticket,
          slaResolutionHoursMap,
          now
        );

        return (
          matchKeyword &&
          matchStatus &&
          matchCategory &&
          matchPriority &&
          matchAssignee &&
          matchOverdue &&
          isSlaBreach
        );
      }) || [],
    [
      assigneeFilter,
      categoryFilter,
      categoryMap,
      debouncedSearchTerm,
      isOverdueFilter,
      priorityFilter,
      slaFilter,
      slaResolutionHoursMap,
      statusFilter,
      tickets,
    ]
  );

  const displayedTickets = useMemo(
    () =>
      showMyTickets && myUserId
        ? filteredTickets.filter(
            (ticket) =>
              ticket.assigned_to === myUserId || ticket.created_by === myUserId
          )
        : filteredTickets,
    [filteredTickets, myUserId, showMyTickets]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (viewQuery === 'kanban' || viewQuery === 'table') return;
      const saved = window.localStorage.getItem(TICKETS_VIEW_MODE_KEY);
      if (saved === 'table' || saved === 'kanban') {
        setViewMode(saved);
      }
    } catch {
      // ignore storage read errors
    }
  }, [viewQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TICKETS_VIEW_MODE_KEY, viewMode);
    } catch {
      // ignore storage write errors
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefetch = () => {
      prefetchAssetsRoute();
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(prefetch, 500);
    return () => window.clearTimeout(timeoutId);
  }, [prefetchAssetsRoute]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TICKETS_PRESET_KEY, selectedPreset);
    } catch {
      // ignore storage write errors
    }
  }, [selectedPreset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasUrlFilters) return;
    try {
      const savedPreset = window.localStorage.getItem(TICKETS_PRESET_KEY);
      if (
        savedPreset === 'my_tickets' ||
        savedPreset === 'open' ||
        savedPreset === 'in_progress' ||
        savedPreset === 'overdue'
      ) {
        applyPreset(savedPreset);
      }
    } catch {
      // ignore storage read errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);

      const syncParam = (key: string, value: string, fallback: string) => {
        if (value.trim() === '' || value === fallback) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      };

      syncParam('q', debouncedSearchTerm, '');
      syncParam('view', viewMode, 'table');
      syncParam('category', categoryFilter, 'all');
      syncParam('priority', priorityFilter, 'all');
      syncParam('assignee', assigneeFilter, 'all');

      if (nextParams.toString() === currentParams.toString()) {
        return currentParams;
      }

      return nextParams;
    });
  }, [
    assigneeFilter,
    categoryFilter,
    debouncedSearchTerm,
    priorityFilter,
    setSearchParams,
    viewMode,
  ]);

  useEffect(() => {
    if (!openTicketId) return;
    if (isLoadingCategories || isLoadingTickets) return;
    if (consumedOpenTicketIdRef.current === openTicketId) return;

    consumedOpenTicketIdRef.current = openTicketId;

    const ticketExists = (tickets ?? []).some((ticket) => ticket.id === openTicketId);
    if (!ticketExists) {
      notifyWarning('Ticket unavailable or inaccessible.');
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.delete('open_ticket');
        return nextParams;
      });
      return;
    }

    openDrawer(openTicketId);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete('open_ticket');
      return nextParams;
    });
  }, [
    isLoadingCategories,
    isLoadingTickets,
    openDrawer,
    openTicketId,
    setSearchParams,
    tickets,
  ]);

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const applySlaFilter = (value: 'all' | 'breach') => {
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'breach') {
      nextParams.set('sla', 'breach');
    } else {
      nextParams.delete('sla');
    }
    setSearchParams(nextParams);
  };

  const statusFilterValue = isOverdueFilter ? 'overdue' : statusFilter ?? 'all';
  const assigneeNameById = useMemo(
    () =>
      new Map(
        (assignableUsers || []).map((user) => [user.id, user.name || user.id])
      ),
    [assignableUsers]
  );

  const buildTicketExportRows = () =>
    displayedTickets.map((ticket) => ({
      ID: ticket.id,
      Title: ticket.title ?? '',
      Status: ticket.status ?? '',
      Priority: ticket.priority ?? '',
      Category: ticket.category_id ? categoryMap.get(ticket.category_id) ?? '' : '',
      Assignee: ticket.assigned_to
        ? assigneeNameById.get(ticket.assigned_to) ?? ticket.assigned_to
        : 'Unassigned',
      'Created At': ticket.created_at
        ? new Date(ticket.created_at).toLocaleString()
        : '',
      'Due At': ticket.due_at ? new Date(ticket.due_at).toLocaleString() : '',
    }));

  const handleExportTicketsExcel = async () => {
    if (displayedTickets.length === 0) {
      notifyError('No tickets to export');
      return;
    }
    await exportRowsToExcel(buildTicketExportRows(), 'tickets-export');
    notifySuccess('Excel exported', `${displayedTickets.length} ticket(s)`);
  };


  if (isLoadingTickets || isLoadingCategories) {
    return <TicketsPageSkeleton />;
  }

  if (isErrorTickets || isErrorCategories) {
    return (
      <ErrorState
        title="Error Loading Tickets"
        message={ticketsError?.message || categoriesError?.message || 'An unknown error occurred.'}
      />
    );
  }

  return (
    <motion.div className="relative flex flex-col gap-6 p-8" {...createFadeSlideUp(0)}>
      <motion.div
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        {...createFadeSlideUp(0.04)}
      >
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Neturai IT Manager
          </p>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Ticket Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage, track and resolve incoming technical requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            onClick={() => void handleExportTicketsExcel()}
            disabled={displayedTickets.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button
            onClick={() => setIsCreateTicketDialogOpen(true)}
            className="btn-motion-primary h-10 rounded-lg px-5 text-sm font-semibold shadow-lg shadow-primary/20"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create Ticket
          </Button>
        </div>
      </motion.div>

      <section className="space-y-4">
          <motion.div
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            {...createFadeSlideUp(0.08)}
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <ListFilter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="Search tickets"
                  placeholder="Filter tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 rounded-lg border-slate-200 bg-slate-50 pl-8 pr-8 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                {searchTerm.trim().length > 0 && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Select
                value={statusFilterValue}
                onValueChange={(value) => {
                  if (value === 'overdue') {
                    applyOverdueFilter(true);
                    return;
                  }
                  applyStatusFilter(value as 'all' | 'open' | 'in_progress' | 'closed');
                }}
              >
                <SelectTrigger className="h-8 w-[120px] rounded-lg border-none bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 w-[120px] rounded-lg border-none bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {formatPriorityLabel(priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="h-8 w-[130px] rounded-lg border-none bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(assignableUsers || []).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={slaFilter === 'breach' ? 'breach' : 'all'} onValueChange={(value) => applySlaFilter(value as 'all' | 'breach')}>
                <SelectTrigger className="h-8 w-[90px] rounded-lg border-none bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <SelectValue placeholder="SLA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="breach">Breach</SelectItem>
                </SelectContent>
              </Select>

              <Button type="button" variant="ghost" className="h-8 px-2 text-sm font-medium text-primary" onClick={clearAllFilters}>
                Clear All
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Saved Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('overdue')}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  selectedPreset === 'overdue'
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Unassigned Urgent
              </button>
              {canManageTickets && (
                <button
                  type="button"
                  onClick={() => applyPreset('my_tickets')}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    selectedPreset === 'my_tickets'
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  My Active Tasks
                </button>
              )}
              <button
                type="button"
                onClick={() => applyPreset('open')}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  selectedPreset === 'open'
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Network Outages
              </button>
            </div>
          </motion.div>

          <motion.div {...createFadeSlideUp(0.16)}>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'kanban')}>
        <div className="mb-0 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-slate-200 border-b-0 bg-white px-4 pt-1 dark:border-slate-800 dark:bg-slate-900">
          <TabsList className="grid h-auto w-fit grid-cols-2 bg-transparent p-0">
            <TabsTrigger value="table" className="rounded-none border-b-2 border-transparent px-2 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary">
              <List className="mr-2 h-4 w-4" /> Table View
            </TabsTrigger>
            <TabsTrigger value="kanban" className="rounded-none border-b-2 border-transparent px-2 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary">
              <KanbanSquare className="mr-2 h-4 w-4" /> Kanban View
            </TabsTrigger>
          </TabsList>
          <p className="text-xs font-medium text-slate-400">
            Showing {displayedTickets.length} of {tickets?.length ?? 0} tickets
          </p>
        </div>
        <TabsContent value="table">
          {displayedTickets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 py-12 text-center">
              <p className="text-sm font-medium">No tickets found for current filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try clearing search or filters to see more tickets.
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                {searchTerm.trim().length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                    Clear search
                  </Button>
                )}
                {hasUrlFilters && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          <TableView
            tickets={displayedTickets}
            categories={categories || []}
          />
        </TabsContent>
        <TabsContent value="kanban">
          <KanbanView
            tickets={displayedTickets}
            categories={categories || []}
          />
        </TabsContent>
        </Tabs>
          </motion.div>
      </section>

      <CreateTicketDialog
        isOpen={isCreateTicketDialogOpen}
        onClose={() => setIsCreateTicketDialogOpen(false)}
        categories={categories || []}
      />

      {/* Render the TicketDetailsDrawer */}
      {categories && <TicketDetailsDrawer categories={categories} />}
    </motion.div>
  );
};
