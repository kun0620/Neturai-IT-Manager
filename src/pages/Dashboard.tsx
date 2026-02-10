import React, { useState } from 'react';
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
} from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { useTickets } from '@/hooks/useTickets';
import { ErrorState } from '@/components/common/ErrorState';
import { RecentTicketsTable } from '@/components/dashboard/RecentTicketsTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { TicketDetailsDrawer } from '@/components/tickets/TicketDetailsDrawer';
import { motion } from 'motion/react';
import { createFadeSlideUp } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] =
  useState(false);
  
  const {
    useDashboardSummary,
    useRecentTickets,
    useOpenTicketsCount,
    useInProgressTicketsCount,
    useClosedTicketsCount,
    useTicketCategories,
    useTodayTicketsCount,
    useOverdueTicketsCount,
    useAvgResolutionTime,
  } = useTickets;

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: errorSummary,
  } = useDashboardSummary();

  const {
    data: openTicketsCount,
    isLoading: isLoadingOpenTickets,
    isError: isErrorOpenTickets,
    error: errorOpenTickets,
  } = useOpenTicketsCount();

  const {
    data: inProgressTicketsCount,
    isLoading: isLoadingInProgressTickets,
    isError: isErrorInProgressTickets,
    error: errorInProgressTickets,
  } = useInProgressTicketsCount();

  const {
    data: closedTicketsCount,
    isLoading: isLoadingClosedTickets,
    isError: isErrorClosedTickets,
    error: errorClosedTickets,
  } = useClosedTicketsCount();

  const {
    data: recentTickets,
    isLoading: isLoadingRecentTickets,
    isError: isErrorRecentTickets,
    error: errorRecentTickets,
  } = useRecentTickets();

  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    error: errorCategories,
  } = useTicketCategories();

  const {
      data: todayTicketsCount,
      isLoading: isLoadingTodayTickets,
    } = useTodayTicketsCount();

  const {
      data: overdueTicketsCount,
      isLoading: isLoadingOverdueTickets,
    } = useOverdueTicketsCount();

  const {
      data: avgResolutionHours,
      isLoading: isLoadingAvgResolution,
    } = useAvgResolutionTime();


  const isLoadingAny =
    isLoadingSummary ||
    isLoadingOpenTickets ||
    isLoadingInProgressTickets ||
    isLoadingClosedTickets ||
    isLoadingRecentTickets ||
    isLoadingTodayTickets ||
    isLoadingOverdueTickets ||
    isLoadingAvgResolution ||
    isLoadingCategories;

  const isErrorAny =
    isErrorSummary ||
    isErrorOpenTickets ||
    isErrorInProgressTickets ||
    isErrorClosedTickets ||
    isErrorRecentTickets ||
    isErrorCategories;

  if (isLoadingAny) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <LoadingSkeleton count={8} className="md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4" />
      </div>
    );
  }

  if (isErrorAny) {
    return (
      <ErrorState
        title="Error Loading Dashboard"
        message={
          errorSummary?.message ||
          errorOpenTickets?.message ||
          errorInProgressTickets?.message ||
          errorClosedTickets?.message ||
          errorRecentTickets?.message ||
          errorCategories?.message ||
          'An unknown error occurred.'
        }
      />
    );
  }

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

        <div className="ml-auto flex items-center text-xs text-muted-foreground">
          Updated from live ticket and asset sources
        </div>
      </motion.div>

      {/* Summary Cards */}

      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        {...createFadeSlideUp(0.1)}
      >
        <SummaryCard
          index={0}
          title="Open Tickets"
          value={openTicketsCount || 0}
          icon={CircleDot}
          color="text-green-500"
          description="Tickets awaiting action"
          onClick={() => navigate('/tickets?status=open')}
        />
        <SummaryCard
          index={1}
          title="In Progress Tickets"
          value={inProgressTicketsCount || 0}
          icon={Hourglass}
          color="text-yellow-500"
          description="Tickets currently being worked on"
          onClick={() => navigate('/tickets?status=in_progress')}
        />
        <SummaryCard
          index={2}
          title="Closed Tickets"
          value={closedTicketsCount || 0}
          icon={CheckCircle}
          color="text-red-500"
          description="Tickets that have been resolved"
          onClick={() => navigate('/tickets?status=closed')}
        />
        <SummaryCard
          index={3}
          title="Total Assets"
          value={summaryData?.totalAssets || 0}
          icon={HardDrive}
          color="text-blue-500"
          description="All IT assets managed"
          onClick={() => navigate('/assets')}
        />
        <SummaryCard
          index={4}
          title="Tickets Today"
          value={todayTicketsCount || 0}
          icon={Activity}
          color="text-indigo-500"
          description="New tickets created today"
          className="border-indigo-200"
        />
        <SummaryCard
          index={5}
          title="Overdue Tickets"
          value={overdueTicketsCount || 0}
          icon={AlertTriangle}
          color="text-red-500"
          description="Tickets past their due date"
          className="border-red-200"
          onClick={() => navigate('/tickets?filter=overdue')}
        />
        <SummaryCard
          index={6}
          title="Avg Resolution Time"
          value={avgResolutionHours !== null ? `${avgResolutionHours} hrs` : '—'}
          icon={Clock}
          color="text-emerald-500"
          description="Average time to resolve tickets"
        />
        <SummaryCard
          index={7}
          title="Total Tickets"
          value={summaryData?.totalTickets || 0}
          icon={ListTodo}
          description="All tickets in the system"
        />
      </motion.div>

      {/* Recent Tickets */}
      <motion.div
        {...createFadeSlideUp(0.18)}
      >
        <RecentTicketsTable
          tickets={recentTickets || []}
          isLoading={isLoadingRecentTickets}
        />
      </motion.div>

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
