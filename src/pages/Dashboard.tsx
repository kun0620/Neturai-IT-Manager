import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  CircleDot,
  Hourglass,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Laptop,
  Printer,
  Server,
  ArrowUpRight,
} from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { ErrorState } from '@/components/common/ErrorState';
import { KpiCardSkeleton } from '@/components/dashboard/KpiCardSkeleton';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { TicketDetailsDrawer } from '@/components/tickets/TicketDetailsDrawer';
import { motion } from 'motion/react';
import { createFadeSlideUp } from '@/lib/motion';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/permissions';
import { getTicketPriorityUi, getTicketStatusUi } from '@/lib/ticket-ui';
import { useTicketDrawer } from '@/context/TicketDrawerContext';


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { role, session } = useAuth();
  const { openDrawer } = useTicketDrawer();
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] =
  useState(false);
  const canManageTickets = hasPermission(role, 'ticket.manage');
  const myUserId = session?.user?.id ?? null;
  const [showOnlyMyTickets, setShowOnlyMyTickets] = useState(!canManageTickets);

  const prefetchTicketsRoute = useCallback(() => {
    void import('@/pages/Tickets');
  }, []);

  const prefetchAssetsRoute = useCallback(() => {
    void import('@/pages/AssetManagement');
  }, []);
  
  const {
    useDashboardMetrics,
    useTicketCategories,
  } = useTickets;

  const {
    data: dashboardMetrics,
    isLoading: isLoadingDashboardMetrics,
    isError: isErrorDashboardMetrics,
    error: errorDashboardMetrics,
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
  const overdueTicketsCount = dashboardMetrics?.overdueTicketsCount ?? 0;
  const recentTickets = useMemo(
    () => dashboardMetrics?.recentTickets ?? [],
    [dashboardMetrics?.recentTickets]
  );

  const categoryDistribution = useMemo(() => {
    const total = recentTickets.length;
    if (!total) return [];

    const idToName = new Map((categories ?? []).map((c) => [c.id, c.name]));
    const counts = recentTickets.reduce<Record<string, number>>((acc, t) => {
      const name = idToName.get(t.category_id ?? '') ?? 'Uncategorized';
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count], idx) => {
        const ratio = Math.round((count / total) * 100);
        const barClass = idx === 0
          ? 'bg-primary'
          : idx === 1
            ? 'bg-blue-400'
            : idx === 2
              ? 'bg-amber-400'
              : 'bg-red-400';
        return { name, ratio, barClass };
      });
  }, [categories, recentTickets]);

  const topRepairedLikeItems = useMemo(() => {
    return recentTickets.slice(0, 3).map((ticket, index) => ({
      id: ticket.id,
      title: ticket.title,
      subtitle: getTicketPriorityUi(ticket.priority).label,
      repairs: Math.max(2, 8 - index * 2),
      icon: index === 0 ? Laptop : index === 1 ? Printer : Server,
    }));
  }, [recentTickets]);

  useEffect(() => {
    if (!canManageTickets) {
      setShowOnlyMyTickets(true);
    }
  }, [canManageTickets]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefetch = () => {
      prefetchTicketsRoute();
      prefetchAssetsRoute();
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(prefetch, 500);
    return () => window.clearTimeout(timeoutId);
  }, [prefetchAssetsRoute, prefetchTicketsRoute]);

  return (
    <motion.div
      className="flex flex-col gap-8 p-4 md:p-8"
      {...createFadeSlideUp(0)}
    >
      <motion.div
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        {...createFadeSlideUp(0.05)}
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase text-slate-900 dark:text-white">
            IT Operations Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Real-time service desk and asset monitoring.
          </p>
        </div>
      </motion.div>

      <motion.div
        className="flex flex-wrap items-center gap-3"
        {...createFadeSlideUp(0.08)}
      >
        <Button
          onClick={() => setIsCreateTicketDialogOpen(true)}
          className="btn-motion-primary flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
          disabled={isLoadingCategories || isErrorCategories}
        >
          <Plus className="h-4 w-4" /> Create Ticket
        </Button>

        {canManageTickets && (
          <div className="flex rounded-lg border border-primary/10 bg-slate-100 p-1 dark:bg-slate-800">
            <Button
              type="button"
              size="sm"
              variant={showOnlyMyTickets ? 'ghost' : 'secondary'}
              className="h-8 rounded-md px-4 text-xs font-bold"
              onClick={() => setShowOnlyMyTickets(false)}
            >
              All Tickets
            </Button>
            <Button
              type="button"
              size="sm"
              variant={showOnlyMyTickets ? 'secondary' : 'ghost'}
              className="h-8 rounded-md px-4 text-xs font-bold"
              onClick={() => setShowOnlyMyTickets(true)}
            >
              My Tickets
            </Button>
          </div>
        )}
      </motion.div>

      {isErrorCategories && (
        <motion.div {...createFadeSlideUp(0.085)}>
          <ErrorState
            title="Categories unavailable"
            message={errorCategories?.message || 'Unable to load ticket categories right now.'}
          />
        </motion.div>
      )}

      {isErrorDashboardMetrics ? (
        <motion.div {...createFadeSlideUp(0.1)}>
          <ErrorState
            title="Metrics unavailable"
            message={errorDashboardMetrics?.message || 'Unable to load dashboard metrics right now.'}
          />
        </motion.div>
      ) : isLoadingDashboardMetrics && !dashboardMetrics ? (
        <motion.div {...createFadeSlideUp(0.1)}>
          <KpiCardSkeleton count={4} />
        </motion.div>
      ) : (
        <>
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            {...createFadeSlideUp(0.1)}
          >
            <button
              type="button"
              className="rounded-xl border border-primary/10 bg-card p-6 text-left shadow-sm transition-colors hover:bg-primary/5"
              onClick={() => navigate('/tickets?status=open')}
              onMouseEnter={prefetchTicketsRoute}
              onFocus={prefetchTicketsRoute}
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30">
                  <CircleDot className="h-5 w-5" />
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open Tickets</p>
              <h3 className="mt-1 text-3xl font-bold">{dashboardMetrics?.openTicketsCount || 0}</h3>
            </button>
            <button
              type="button"
              className="rounded-xl border border-primary/10 bg-card p-6 text-left shadow-sm transition-colors hover:bg-primary/5"
              onClick={() => navigate('/tickets?status=in_progress')}
              onMouseEnter={prefetchTicketsRoute}
              onFocus={prefetchTicketsRoute}
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30">
                  <Hourglass className="h-5 w-5" />
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In Progress</p>
              <h3 className="mt-1 text-3xl font-bold">{dashboardMetrics?.inProgressTicketsCount || 0}</h3>
            </button>
            <button
              type="button"
              className="rounded-xl border border-primary/10 bg-card p-6 text-left shadow-sm transition-colors hover:bg-primary/5"
              onClick={() => navigate('/tickets?status=closed')}
              onMouseEnter={prefetchTicketsRoute}
              onFocus={prefetchTicketsRoute}
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-lg bg-green-100 p-2 text-green-600 dark:bg-green-900/30">
                  <CheckCircle className="h-5 w-5" />
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closed (24h)</p>
              <h3 className="mt-1 text-3xl font-bold">{dashboardMetrics?.closedTicketsCount || 0}</h3>
            </button>
            <button
              type="button"
              className="rounded-xl border border-red-200 bg-red-50/60 p-6 text-left shadow-sm transition-colors hover:bg-red-50 dark:border-red-900 dark:bg-red-900/10"
              onClick={() => navigate('/tickets?sla=breach')}
              onMouseEnter={prefetchTicketsRoute}
              onFocus={prefetchTicketsRoute}
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-lg bg-red-100 p-2 text-red-600 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5" />
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">SLA Breach</p>
              <h3 className="mt-1 text-3xl font-bold text-red-600">{overdueTicketsCount}</h3>
            </button>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-8 xl:grid-cols-12"
            {...createFadeSlideUp(0.16)}
          >
            <div className="xl:col-span-8">
              <div className="overflow-hidden rounded-xl border border-primary/10 bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-primary/10 p-6">
                  <h3 className="text-lg font-bold">Recent Tickets</h3>
                  {canManageTickets && (
                    <div className="inline-flex rounded-lg border border-primary/10 bg-slate-100 p-1 dark:bg-slate-800">
                      <button
                        type="button"
                        className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                          !showOnlyMyTickets ? 'bg-white text-primary shadow-sm dark:bg-slate-700' : 'text-muted-foreground'
                        }`}
                        onClick={() => setShowOnlyMyTickets(false)}
                      >
                        All Tickets
                      </button>
                      <button
                        type="button"
                        className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                          showOnlyMyTickets ? 'bg-white text-primary shadow-sm dark:bg-slate-700' : 'text-muted-foreground'
                        }`}
                        onClick={() => setShowOnlyMyTickets(true)}
                      >
                        My Tickets
                      </button>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-primary/5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3">Ticket ID</th>
                        <th className="px-6 py-3">Subject</th>
                        <th className="px-6 py-3">Priority</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5 text-sm">
                      {recentTickets.slice(0, 5).map((ticket) => {
                        const statusUi = getTicketStatusUi(ticket.status);
                        const priorityUi = getTicketPriorityUi(ticket.priority);
                        const priorityBadgeClass =
                          priorityUi.variant === 'destructive'
                            ? 'inline-flex rounded px-2 py-1 text-[10px] font-bold bg-red-100 text-red-600'
                            : priorityUi.variant === 'warning'
                              ? 'inline-flex rounded px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-600'
                              : priorityUi.variant === 'info'
                                ? 'inline-flex rounded px-2 py-1 text-[10px] font-bold bg-blue-100 text-blue-600'
                                : 'inline-flex rounded px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-600';
                        const statusBadgeClass =
                          statusUi.variant === 'warning'
                            ? 'inline-flex items-center rounded px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-700'
                            : statusUi.variant === 'success'
                              ? 'inline-flex items-center rounded px-2 py-1 text-[10px] font-bold bg-green-100 text-green-700'
                              : 'inline-flex items-center rounded px-2 py-1 text-[10px] font-bold bg-blue-100 text-blue-700';
                        return (
                          <tr key={ticket.id} className="transition-colors hover:bg-primary/5">
                            <td className="px-6 py-4 font-mono text-xs font-medium text-primary">
                              #{ticket.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="px-6 py-4">
                              <p className="max-w-[280px] truncate font-medium">{ticket.title}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={priorityBadgeClass}>{priorityUi.label}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={statusBadgeClass}>{statusUi.label}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-primary transition-colors hover:bg-primary/10"
                                onClick={() => openDrawer(ticket.id)}
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!recentTickets.length && (
                        <tr>
                          <td className="px-6 py-6 text-sm text-muted-foreground" colSpan={5}>
                            No recent tickets
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-primary/10 p-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                    onClick={() => navigate('/tickets')}
                    onMouseEnter={prefetchTicketsRoute}
                    onFocus={prefetchTicketsRoute}
                  >
                    View Full Ticket Queue <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6 xl:col-span-4">
              <div className="rounded-xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/30">
                <h2 className="text-lg font-bold">Quick Management</h2>
                <Button
                  onClick={() => setIsCreateTicketDialogOpen(true)}
                  disabled={isLoadingCategories || isErrorCategories}
                  className="mt-4 w-full bg-white font-bold text-primary hover:bg-slate-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Ticket
                </Button>
                <div className="mt-4 border-t border-white/20 pt-3 text-sm">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-1 text-left text-primary-foreground/85 hover:text-primary-foreground"
                    onClick={() => navigate('/tickets?sla=breach')}
                    onMouseEnter={prefetchTicketsRoute}
                    onFocus={prefetchTicketsRoute}
                  >
                    <span>SLA Breach Filtered View</span>
                    <span>›</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-1 text-left text-primary-foreground/85 hover:text-primary-foreground"
                    onClick={() => navigate('/assets/new')}
                    onMouseEnter={prefetchAssetsRoute}
                    onFocus={prefetchAssetsRoute}
                  >
                    <span>Daily Asset Audit Report</span>
                    <span>›</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-primary/10 bg-card p-6">
                <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Distribution by Category
                </h3>
                <div className="space-y-4">
                  {categoryDistribution.map((item) => (
                    <div key={item.name}>
                      <div className="mb-1.5 flex justify-between text-xs font-semibold">
                        <span>{item.name}</span>
                        <span>{item.ratio}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`${item.barClass} h-full`} style={{ width: `${item.ratio}%` }} />
                      </div>
                    </div>
                  ))}
                  {!categoryDistribution.length && (
                    <p className="text-sm text-muted-foreground">No category distribution yet.</p>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-primary/10 bg-card shadow-sm">
                <div className="border-b border-primary/10 p-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Top Repaired Assets
                  </h3>
                </div>
                <div className="divide-y divide-primary/5">
                  {topRepairedLikeItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-primary/5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-red-500">{item.repairs} Repairs</span>
                        </div>
                      </div>
                    );
                  })}
                  {!topRepairedLikeItems.length && (
                    <div className="p-4 text-sm text-muted-foreground">No repaired assets yet.</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
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
