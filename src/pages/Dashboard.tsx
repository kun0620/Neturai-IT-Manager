import React, { useEffect, useState } from 'react';
import {
  HardDrive,
  LayoutDashboard,
  CircleDot,
  Hourglass,
  CheckCircle,
  Plus,
  ListTodo,
  PackagePlus,
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { useTickets } from '@/hooks/useTickets';
import { ErrorState } from '@/components/common/ErrorState';
import { RecentTicketsTable } from '@/components/dashboard/RecentTicketsTable';
import { KpiCardSkeleton } from '@/components/dashboard/KpiCardSkeleton';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { TicketDetailsDrawer } from '@/components/tickets/TicketDetailsDrawer';
import { AnimatePresence, motion } from 'motion/react';
import { createFadeSlideUp } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/permissions';

const DASHBOARD_AUTO_REFRESH_KEY = 'neturai_dashboard_auto_refresh_enabled';
const DASHBOARD_AUTO_REFRESH_MS = 30000;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { role, session } = useAuth();
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] =
  useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const canManageTickets = hasPermission(role, 'ticket.manage');
  const myUserId = session?.user?.id ?? null;
  const [showOnlyMyTickets, setShowOnlyMyTickets] = useState(!canManageTickets);
  
  const {
    useDashboardMetrics,
    useTicketCategories,
  } = useTickets;

  const {
    data: dashboardMetrics,
    isLoading: isLoadingDashboardMetrics,
    isError: isErrorDashboardMetrics,
    error: errorDashboardMetrics,
    isFetching: isFetchingDashboardMetrics,
    dataUpdatedAt: dashboardMetricsUpdatedAt,
    refetch: refetchDashboardMetrics,
  } = useDashboardMetrics({
    userId: myUserId,
    onlyMy: showOnlyMyTickets,
  });

  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    error: errorCategories,
  } = useTicketCategories();
  const isRefreshing = isFetchingDashboardMetrics;
  const lastUpdatedAt = dashboardMetricsUpdatedAt ?? 0;
  const lastUpdatedLabel =
    lastUpdatedAt > 0
      ? format(new Date(lastUpdatedAt), 'dd MMM yyyy HH:mm:ss')
      : '—';
  const overdueTicketsCount = dashboardMetrics?.overdueTicketsCount ?? 0;
  const overdueTrendDelta = dashboardMetrics?.overdueTrendDelta ?? 0;
  const hasOverdueAlert = overdueTicketsCount > 0;

  useEffect(() => {
    if (!canManageTickets) {
      setShowOnlyMyTickets(true);
    }
  }, [canManageTickets]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setAutoRefreshEnabled(
        window.localStorage.getItem(DASHBOARD_AUTO_REFRESH_KEY) === 'true'
      );
    } catch {
      // ignore storage read errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        DASHBOARD_AUTO_REFRESH_KEY,
        String(autoRefreshEnabled)
      );
    } catch {
      // ignore storage write errors
    }
  }, [autoRefreshEnabled]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const timer = window.setInterval(() => {
      void refetchDashboardMetrics();
    }, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [autoRefreshEnabled, refetchDashboardMetrics]);

  return (
    <motion.div
      className="flex flex-col gap-6 p-4 md:p-6"
      {...createFadeSlideUp(0)}
    >
      <motion.div
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        {...createFadeSlideUp(0.05)}
      >
        <div className="w-full rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[11px] uppercase tracking-[0.14em]">
              Operations
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Live workspace
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              Showing: {showOnlyMyTickets ? 'My tickets' : 'All tickets'}
            </Badge>
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Neturai IT Manager
            </p>
            <h1 className="text-3xl font-semibold flex items-center gap-2">
              <LayoutDashboard className="h-8 w-8" />
              IT Operations Dashboard
            </h1>
            <p className="text-muted-foreground max-w-3xl">
              Track ticket throughput, queue pressure, and asset coverage in one operational view.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="flex flex-wrap gap-3 rounded-lg border border-border/80 bg-card/70 p-3"
        {...createFadeSlideUp(0.08)}
      >
        <Button
          onClick={() => setIsCreateTicketDialogOpen(true)}
          className="btn-motion-primary flex items-center gap-2"
          disabled={isLoadingCategories || isErrorCategories}
        >
          <Plus className="h-4 w-4" /> New Ticket
        </Button>

        <Button
          onClick={() => navigate('/tickets')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ListTodo className="h-4 w-4" /> View All Tickets
        </Button>

        <Button
          onClick={() => navigate('/assets/new')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <PackagePlus className="h-4 w-4" /> Add Asset
        </Button>

        {canManageTickets && (
          <div className="flex h-10 items-center rounded-full border border-border bg-background p-1">
            <Button
              type="button"
              size="sm"
              variant={showOnlyMyTickets ? 'ghost' : 'default'}
              className="h-8 rounded-full px-4"
              onClick={() => setShowOnlyMyTickets(false)}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={showOnlyMyTickets ? 'default' : 'ghost'}
              className="h-8 rounded-full px-4"
              onClick={() => setShowOnlyMyTickets(true)}
            >
              My
            </Button>
          </div>
        )}

        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground md:w-auto md:flex-nowrap">
          <div className="flex items-center gap-2 pr-2">
            <span id="dashboard-auto-refresh-label" className="text-xs">
              Auto refresh (30s)
            </span>
            <Switch
              aria-labelledby="dashboard-auto-refresh-label"
              checked={autoRefreshEnabled}
              onCheckedChange={setAutoRefreshEnabled}
            />
          </div>
          <span>
            Last updated: {lastUpdatedLabel}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => {
              void refetchDashboardMetrics();
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {isErrorCategories && (
        <motion.div {...createFadeSlideUp(0.085)}>
          <ErrorState
            title="Categories unavailable"
            message={errorCategories?.message || 'Unable to load ticket categories right now.'}
          />
        </motion.div>
      )}

      <AnimatePresence initial={false}>
        {!isErrorDashboardMetrics && hasOverdueAlert && (
          <motion.div
            key="overdue-alert"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-red-300/60 bg-red-50/60 px-4 py-3 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-950/20 dark:text-red-200"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">
              Overdue pressure: {overdueTicketsCount} overdue ticket{overdueTicketsCount > 1 ? 's' : ''}
            </span>
            <span className="text-red-700/80 dark:text-red-300/80">
              {overdueTrendDelta > 0
                ? `Up ${overdueTrendDelta} vs yesterday`
                : overdueTrendDelta < 0
                  ? `Down ${Math.abs(overdueTrendDelta)} vs yesterday`
                  : 'No change vs yesterday'}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto border-red-300/80 text-red-800 hover:bg-red-100 hover:text-red-900 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-900/30"
              onClick={() => navigate('/tickets?filter=overdue')}
            >
              Review overdue
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-background/70 p-3"
        {...createFadeSlideUp(0.09)}
      >
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Quick Filters
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-full"
          onClick={() => navigate('/tickets?status=open')}
        >
          Open ({dashboardMetrics?.openTicketsCount || 0})
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-full"
          onClick={() => navigate('/tickets?status=in_progress')}
        >
          In Progress ({dashboardMetrics?.inProgressTicketsCount || 0})
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-full"
          onClick={() => navigate('/tickets?status=closed')}
        >
          Closed ({dashboardMetrics?.closedTicketsCount || 0})
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-full text-red-600 hover:text-red-600"
          onClick={() => navigate('/tickets?filter=overdue')}
        >
          Overdue ({dashboardMetrics?.overdueTicketsCount || 0})
        </Button>
      </motion.div>

      {/* Summary Cards */}

      {isErrorDashboardMetrics ? (
        <motion.div {...createFadeSlideUp(0.1)}>
          <ErrorState
            title="Metrics unavailable"
            message={errorDashboardMetrics?.message || 'Unable to load dashboard metrics right now.'}
          />
        </motion.div>
      ) : isLoadingDashboardMetrics && !dashboardMetrics ? (
        <motion.div {...createFadeSlideUp(0.1)}>
          <KpiCardSkeleton count={8} />
        </motion.div>
      ) : (
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        {...createFadeSlideUp(0.1)}
      >
        <SummaryCard
          index={0}
          title="Open Tickets"
          value={dashboardMetrics?.openTicketsCount || 0}
          icon={CircleDot}
          color="text-green-500"
          description="Tickets awaiting action"
          trend={{
            value: dashboardMetrics?.openTrendDelta || 0,
            label: 'vs yesterday',
            mode: 'increase_is_bad',
          }}
          onClick={() => navigate('/tickets?status=open')}
          clickHint="Open open-ticket queue"
        />
        <SummaryCard
          index={1}
          title="In Progress Tickets"
          value={dashboardMetrics?.inProgressTicketsCount || 0}
          icon={Hourglass}
          color="text-yellow-500"
          description="Tickets currently being worked on"
          trend={{
            value: dashboardMetrics?.inProgressTrendDelta || 0,
            label: 'vs yesterday',
            mode: 'increase_is_good',
          }}
          onClick={() => navigate('/tickets?status=in_progress')}
          clickHint="Open in-progress queue"
        />
        <SummaryCard
          index={2}
          title="Closed Tickets"
          value={dashboardMetrics?.closedTicketsCount || 0}
          icon={CheckCircle}
          color="text-red-500"
          description="Tickets that have been resolved"
          trend={{
            value: dashboardMetrics?.closedTrendDelta || 0,
            label: 'closed today',
            mode: 'increase_is_good',
          }}
          onClick={() => navigate('/tickets?status=closed')}
          clickHint="Open resolved tickets"
        />
        <SummaryCard
          index={3}
          title="Total Assets"
          value={dashboardMetrics?.totalAssets || 0}
          icon={HardDrive}
          color="text-blue-500"
          description="All IT assets managed"
          onClick={() => navigate('/assets')}
          clickHint="Open asset inventory"
        />
        <SummaryCard
          index={4}
          title="Tickets Today"
          value={dashboardMetrics?.todayTicketsCount || 0}
          icon={Activity}
          color="text-indigo-500"
          description="New tickets created today"
          className="border-indigo-200"
          trend={{
            value: dashboardMetrics?.todayTrendDelta || 0,
            label: 'vs yesterday',
            mode: 'neutral',
          }}
        />
        <SummaryCard
          index={5}
          title="Overdue Tickets"
          value={dashboardMetrics?.overdueTicketsCount || 0}
          icon={AlertTriangle}
          color="text-red-500"
          description="Tickets past their due date"
          className="border-red-200"
          trend={{
            value: dashboardMetrics?.overdueTrendDelta || 0,
            label: 'vs yesterday',
            mode: 'increase_is_bad',
          }}
          onClick={() => navigate('/tickets?filter=overdue')}
          clickHint="Review overdue tickets"
        />
        <SummaryCard
          index={6}
          title="Avg Resolution Time"
          value={
            dashboardMetrics?.avgResolutionHours !== null &&
            dashboardMetrics?.avgResolutionHours !== undefined
              ? dashboardMetrics.avgResolutionHours
              : '—'
          }
          valueSuffix="hrs"
          decimalPlaces={2}
          icon={Clock}
          color="text-emerald-500"
          description="Average time to resolve tickets"
        />
        <SummaryCard
          index={7}
          title="Total Tickets"
          value={dashboardMetrics?.totalTickets || 0}
          icon={ListTodo}
          description="All tickets in the system"
        />
      </motion.div>
      )}

      {/* Recent Tickets */}
      {isErrorDashboardMetrics ? (
        <motion.div {...createFadeSlideUp(0.18)}>
          <ErrorState
            title="Recent tickets unavailable"
            message={errorDashboardMetrics?.message || 'Unable to load recent tickets right now.'}
          />
        </motion.div>
      ) : (
        <motion.div
          {...createFadeSlideUp(0.18)}
        >
          <RecentTicketsTable
            tickets={dashboardMetrics?.recentTickets || []}
            isLoading={isLoadingDashboardMetrics}
          />
        </motion.div>
      )}

      {/* Drawer (state comes from Context) */}
      {categories && <TicketDetailsDrawer categories={categories} />}

      {/* Create Ticket */}
      {isCreateTicketDialogOpen && (
        <CreateTicketDialog
          isOpen={isCreateTicketDialogOpen}
          onClose={() => setIsCreateTicketDialogOpen(false)}
          categories={categories || []}
        />
      )}
    </motion.div>
  );
};

export default Dashboard;
