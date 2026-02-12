import React, { useMemo, useState, useEffect } from 'react';
import {
  KanbanSquare,
  List,
  ListFilter,
  PlusCircle,
  RotateCcw,
  Search,
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
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useTicketDrawer } from '@/context/TicketDrawerContext';

const SLA_HOURS: Record<string, number> = {
  Low: 72,
  Medium: 48,
  High: 24,
  Critical: 8,
};

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
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { data: assignableUsers } = useAssignableUsers();

  
  useEffect(() => {
    if (!canManageTickets) {
      setShowMyTickets(true);
      return;
    }
    setShowMyTickets(scopeFilter === 'my');
  }, [canManageTickets, scopeFilter]);

  const applyScopeFilter = (scope: 'all' | 'my') => {
    const nextParams = new URLSearchParams(searchParams);
    if (scope === 'my') {
      nextParams.set('scope', 'my');
    } else {
      nextParams.delete('scope');
    }
    setSearchParams(nextParams);
  };

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

        // SLA breach logic
        if (!ticket.created_at || !ticket.priority) return false;

        const sla = SLA_HOURS[ticket.priority];
        if (!sla) return false;

        const start = new Date(ticket.created_at).getTime();
        const end = ticket.updated_at
          ? new Date(ticket.updated_at).getTime()
          : Date.now();

        const hours = (end - start) / (1000 * 60 * 60);

        const isSlaBreach = hours > sla && ticket.status !== 'closed';

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
    if (!openTicketId || isLoadingCategories) return;
    openDrawer(openTicketId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('open_ticket');
    setSearchParams(nextParams);
  }, [isLoadingCategories, openDrawer, openTicketId, searchParams, setSearchParams]);

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const removeUrlFilter = (key: 'status' | 'filter' | 'sla' | 'scope') => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(key);
    if (key === 'filter') {
      nextParams.delete('fillet');
    }
    setSearchParams(nextParams);
  };

  const selectedCategoryName =
    categoryFilter !== 'all' ? categoryMap.get(categoryFilter) ?? 'Unknown category' : null;
  const selectedAssigneeName =
    assigneeFilter === 'all'
      ? null
      : assigneeFilter === 'unassigned'
        ? 'Unassigned'
        : (assignableUsers || []).find((user) => user.id === assigneeFilter)?.name ||
          assigneeFilter;
  const ticketStatusCounts = useMemo(() => {
    const counts = { open: 0, in_progress: 0, closed: 0 };
    (tickets || []).forEach((ticket) => {
      if (ticket.status === 'open') counts.open += 1;
      if (ticket.status === 'in_progress') counts.in_progress += 1;
      if (ticket.status === 'closed') counts.closed += 1;
    });
    return counts;
  }, [tickets]);

  const renderFilterSidebarContent = () => (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <h3 className="mb-2 text-sm font-semibold">Presets</h3>
        <Select
          value={selectedPreset}
          onValueChange={(value) => applyPreset(value as TicketViewPreset)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            {canManageTickets && <SelectItem value="my_tickets">My tickets</SelectItem>}
            <SelectItem value="open">Open tickets</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Status</h3>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAllFilters}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => applyStatusFilter('all')}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              !statusFilter && !isOverdueFilter ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <span>All</span>
            <span className="text-xs text-muted-foreground">{tickets?.length ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => applyStatusFilter('open')}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              statusFilter === 'open' && !isOverdueFilter ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <span>Open</span>
            <span className="text-xs text-muted-foreground">{ticketStatusCounts.open}</span>
          </button>
          <button
            type="button"
            onClick={() => applyStatusFilter('in_progress')}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              statusFilter === 'in_progress' && !isOverdueFilter
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted'
            }`}
          >
            <span>In progress</span>
            <span className="text-xs text-muted-foreground">{ticketStatusCounts.in_progress}</span>
          </button>
          <button
            type="button"
            onClick={() => applyStatusFilter('closed')}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              statusFilter === 'closed' && !isOverdueFilter ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <span>Closed</span>
            <span className="text-xs text-muted-foreground">{ticketStatusCounts.closed}</span>
          </button>
          <button
            type="button"
            onClick={() => applyOverdueFilter(true)}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              isOverdueFilter ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <span>Overdue</span>
          </button>
        </div>
      </div>

      {canManageTickets && (
        <div className="rounded-lg border border-border/70 bg-card/70 p-3">
          <h3 className="mb-2 text-sm font-semibold">Scope</h3>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => applyScopeFilter('all')}
              className={`rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                !showMyTickets ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              }`}
            >
              All tickets
            </button>
            <button
              type="button"
              onClick={() => applyScopeFilter('my')}
              className={`rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                showMyTickets ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              }`}
            >
              My tickets
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <h3 className="mb-2 text-sm font-semibold">Category</h3>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories || []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <h3 className="mb-2 text-sm font-semibold">Priority</h3>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {priorityOptions.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {formatPriorityLabel(priority)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/70 bg-card/70 p-3">
        <h3 className="mb-2 text-sm font-semibold">Assignee</h3>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {(assignableUsers || []).map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );


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
    <motion.div className="flex flex-col gap-6 p-4 md:p-6" {...createFadeSlideUp(0)}>
      <motion.div
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        {...createFadeSlideUp(0.04)}
      >
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Neturai IT Manager
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Ticket Management
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage all incoming, in-progress, and resolved support tickets.
          </p>
          <div className="flex flex-wrap gap-2">
            {isOverdueFilter && (
              <div className="rounded-full border border-red-300/50 bg-red-50 px-3 py-1 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300">
                Filter: overdue
              </div>
            )}
            {slaFilter === 'breach' && (
              <div className="rounded-full border border-red-300/50 bg-red-50 px-3 py-1 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300">
                Filter: SLA breach
              </div>
            )}
          </div>
        </div>

      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          {renderFilterSidebarContent()}
        </aside>

        <section className="space-y-3">
          <motion.div
            className="rounded-lg border border-border/70 bg-card/70 p-2"
            {...createFadeSlideUp(0.08)}
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Button
                type="button"
                variant="outline"
                className="h-8 lg:hidden"
                onClick={() => setIsFilterDrawerOpen(true)}
              >
                <ListFilter className="mr-1.5 h-3.5 w-3.5" />
                Filters
              </Button>

              <div className="relative min-w-[260px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search tickets"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 pr-8 text-sm"
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

              <Badge variant="secondary" className="ml-auto whitespace-nowrap">
                Showing: {displayedTickets.length}
              </Badge>
            </div>
          </motion.div>

      <motion.div className="flex flex-wrap gap-2" {...createFadeSlideUp(0.095)}>
        {searchTerm.trim().length > 0 && (
          <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
            Search: {searchTerm.trim()}
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Remove search filter"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {selectedCategoryName && (
          <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
            Category: {selectedCategoryName}
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              aria-label="Remove category filter"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {priorityFilter !== 'all' && (
          <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
            Priority: {formatPriorityLabel(priorityFilter)}
            <button
              type="button"
              onClick={() => setPriorityFilter('all')}
              aria-label="Remove priority filter"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {selectedAssigneeName && (
          <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
            Assignee: {selectedAssigneeName}
            <button
              type="button"
              onClick={() => setAssigneeFilter('all')}
              aria-label="Remove assignee filter"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {isOverdueFilter && (
          <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
            Overdue
            <button
              type="button"
              onClick={() => removeUrlFilter('filter')}
              aria-label="Remove overdue filter"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {slaFilter === 'breach' && (
          <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
            SLA breach
            <button
              type="button"
              onClick={() => removeUrlFilter('sla')}
              aria-label="Remove SLA filter"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
        {canManageTickets && scopeFilter === 'my' && (
          <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
            Scope: my tickets
            <button
              type="button"
              onClick={() => removeUrlFilter('scope')}
              aria-label="Remove scope filter"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
          </motion.div>

          <motion.div
            className="text-sm text-muted-foreground"
            {...createFadeSlideUp(0.1)}
          >
            Showing {displayedTickets.length} of {tickets?.length ?? 0} tickets
          </motion.div>

          <motion.div {...createFadeSlideUp(0.16)}>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'kanban')}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="table">
              <List className="mr-2 h-4 w-4" /> Table View
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <KanbanSquare className="mr-2 h-4 w-4" /> Kanban View
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={() => setIsCreateTicketDialogOpen(true)}
            className="btn-motion-primary ml-auto h-9"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Ticket
          </Button>
          {statusFilter && (
            <Badge variant="outline" className="gap-1 px-2 py-1 text-xs">
              Status: {statusFilter.replace('_', ' ')}
              <button
                type="button"
                onClick={() => removeUrlFilter('status')}
                aria-label="Remove status filter"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
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
      </div>

      <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerDescription>Refine tickets by status, scope, category, priority, and assignee.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-auto px-4 pb-6">
            {renderFilterSidebarContent()}
          </div>
        </DrawerContent>
      </Drawer>

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
