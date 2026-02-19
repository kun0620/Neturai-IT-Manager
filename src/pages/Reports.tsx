import React, { useMemo, useState } from 'react';
import { subDays, formatISO, format } from 'date-fns';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

import { useReportOverview } from '@/hooks/useReportOverview';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SummaryCard } from '@/components/dashboard/SummaryCard';

import { useTicketsTrend } from '@/hooks/useTicketsTrend';
import { TicketsTrendChart } from '@/components/reports/TicketsTrendChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketsStatusDonut } from '@/components/reports/TicketsStatusDonut';
import { TicketsByDayBar } from '@/components/reports/TicketsByDayBar';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { createFadeSlideUp } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notifyError, notifySuccess } from '@/lib/notify';
import { exportRowsToExcel, exportRowsToPdf } from '@/lib/export';



import {
  CircleDot,
  FileSpreadsheet,
  FileText,
  Hourglass,
  CheckCircle,
  LayoutDashboard,
  Printer,
  RefreshCw,
} from 'lucide-react';

const Reports: React.FC = () => {
  /* ---------- state ---------- */
  const [range, setRange] = useState<'7d' | '30d' | 'custom'>('7d');
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 7));
  const [toDate, setToDate] = useState<Date>(new Date());
  
  /* ---------- derived ---------- */
  const from = formatISO(fromDate);
  const to = formatISO(toDate);
  const customFromValue = format(fromDate, 'yyyy-MM-dd');
  const customToValue = format(toDate, 'yyyy-MM-dd');
  const isDateRangeInvalid = useMemo(
    () => fromDate.getTime() > toDate.getTime(),
    [fromDate, toDate]
  );

  /* ---------- data ---------- */
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useReportOverview(from, to);

  const {
  data: trendData,
  isLoading: isLoadingTrend,
} = useTicketsTrend(from, to);

const navigate = useNavigate();

const buildReportRows = () => {
  if (!data?.tickets) return [];
  return data.tickets.map((t) => ({
    ID: t.id,
    Title: t.title ?? '',
    Status: t.status ?? '',
    Priority: t.priority ?? '',
    'Created At': t.created_at ? format(new Date(t.created_at), 'yyyy-MM-dd HH:mm') : '',
    'Updated At': t.updated_at ? format(new Date(t.updated_at), 'yyyy-MM-dd HH:mm') : '',
    'Due At': t.due_at ? format(new Date(t.due_at), 'yyyy-MM-dd HH:mm') : '',
  }));
};

const handleExportExcel = async () => {
  const rows = buildReportRows();
  if (rows.length === 0 || (range === 'custom' && isDateRangeInvalid)) {
    notifyError('No tickets available to export');
    return;
  }
  await exportRowsToExcel(
    rows,
    `tickets_report_${from.slice(0, 10)}_${to.slice(0, 10)}`,
    'Tickets'
  );
  notifySuccess('Excel exported', `${rows.length} ticket(s)`);
};

const handleExportPdf = () => {
  const rows = buildReportRows();
  if (rows.length === 0 || (range === 'custom' && isDateRangeInvalid)) {
    notifyError('No tickets available to export');
    return;
  }
  exportRowsToPdf(
    rows,
    `IT Ticket Report ${from.slice(0, 10)} to ${to.slice(0, 10)}`,
    `tickets_report_${from.slice(0, 10)}_${to.slice(0, 10)}`
  );
  notifySuccess('PDF exported', `${rows.length} ticket(s)`);
};

  /* ---------- states ---------- */
  if (isLoading || isLoadingTrend) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="h-8 w-1/2 bg-muted rounded animate-pulse"></div>
        <div className="h-6 w-1/3 bg-muted rounded animate-pulse"></div>
        <LoadingSkeleton count={6} className="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load reports: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  /* ---------- render ---------- */
  return (
    <motion.div
      id="report-print"
      className="flex flex-col gap-6 p-4 md:p-6"
      {...createFadeSlideUp(0)}
    >
      <motion.div className="space-y-2" {...createFadeSlideUp(0.04)}>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Neturai IT Manager
        </p>
        <h1 className="text-3xl font-semibold">IT Ticket Report</h1>
        <p className="text-sm text-muted-foreground">
          Reporting period: {from.slice(0,10)} → {to.slice(0,10)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Range: {range === 'custom' ? 'Custom' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}</Badge>
          <Badge variant="secondary">Total: {data.total}</Badge>
        </div>
      </motion.div>

      {/* Date Range */}
      <motion.div
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card/60 p-2"
        {...createFadeSlideUp(0.08)}
      >
        <Button
          type="button"
          variant={range === '7d' ? 'default' : 'outline'}
          size="sm"
          className={`h-8 ${
            range === '7d' ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => {
            setRange('7d');
            setFromDate(subDays(new Date(), 7));
            setToDate(new Date());
          }}
        >
          Last 7 days
        </Button>

        <Button
          type="button"
          variant={range === '30d' ? 'default' : 'outline'}
          size="sm"
          className={`h-8 ${
            range === '30d' ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => {
            setRange('30d');
            setFromDate(subDays(new Date(), 30));
            setToDate(new Date());
          }}
        >
          Last 30 days
        </Button>

        <Button
          type="button"
          variant={range === 'custom' ? 'default' : 'outline'}
          size="sm"
          className={`h-8 ${
            range === 'custom' ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => setRange('custom')}
        >
          Custom
        </Button>

        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFromValue}
              onChange={(e) => {
                const next = new Date(e.target.value);
                if (next.getTime() > toDate.getTime()) {
                  setFromDate(next);
                  setToDate(next);
                  return;
                }
                setFromDate(next);
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={customToValue}
              onChange={(e) => {
                const next = new Date(e.target.value);
                if (next.getTime() < fromDate.getTime()) {
                  setToDate(next);
                  setFromDate(next);
                  return;
                }
                setToDate(next);
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
        )}

        {range === 'custom' && isDateRangeInvalid && (
          <span className="text-sm text-destructive">
            From date must be before or equal to To date
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {range === 'custom' && isDateRangeInvalid && (
            <span className="text-xs text-muted-foreground">
              Export disabled while date range is invalid
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => void handleExportExcel()}
            disabled={range === 'custom' && isDateRangeInvalid || !data.tickets || data.tickets.length === 0}
            title={
              range === 'custom' && isDateRangeInvalid
                ? 'Fix date range to export'
                : !data.tickets || data.tickets.length === 0
                  ? 'No tickets in selected range'
                : undefined
            }
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => handleExportPdf()}
            disabled={range === 'custom' && isDateRangeInvalid || !data.tickets || data.tickets.length === 0}
            title={
              range === 'custom' && isDateRangeInvalid
                ? 'Fix date range to export'
                : !data.tickets || data.tickets.length === 0
                  ? 'No tickets in selected range'
                : undefined
            }
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print-summary-grid"
        {...createFadeSlideUp(0.12)}
      >
        <SummaryCard
          index={0}
          title="Total Tickets"
          value={data.total}
          icon={LayoutDashboard}
          description="Selected range"
        />

        <SummaryCard
          index={1}
          title="Open"
          value={data.open}
          icon={CircleDot}
          color="text-green-500"
          description="Currently open"
          onClick={() => navigate('/tickets?status=open')}
          clickHint="Open open tickets"
        />

        <SummaryCard
          index={2}
          title="In Progress"
          value={data.inProgress}
          icon={Hourglass}
          color="text-yellow-500"
          description="Being worked on"
          onClick={() => navigate('/tickets?status=in_progress')}
          clickHint="Open in-progress tickets"
        />

        <SummaryCard
          index={3}
          title="Closed"
          value={data.closed}
          icon={CheckCircle}
          color="text-blue-500"
          description="Resolved"
          onClick={() => navigate('/tickets?status=closed')}
          clickHint="Open closed tickets"
        />

        <SummaryCard
          index={4}
          title="Median Resolution"
          value={
            data.medianResolutionHours !== null
              ? `${data.medianResolutionHours.toFixed(1)}h`
              : '—'
          }
          icon={Hourglass}
          description="Typical time to close"
        />

        <SummaryCard
          index={5}
          title="Overdue Tickets"
          value={data.overdue}
          icon={CircleDot}
          color="text-red-600"
          description="Past SLA"
          onClick={() => navigate('/tickets?filter=overdue')}
          clickHint="Review overdue tickets"
        />

        <SummaryCard
          index={6}
          title="SLA Breaches"
          value={data.slaBreaches}
          icon={CircleDot}
          color="text-red-600"
          description="Tickets exceeding SLA"
          onClick={() => navigate('/tickets?sla=breach')}
          clickHint="Open SLA breach ticket list"
        />

      </motion.div>
      <motion.div
        className="grid gap-6 lg:grid-cols-2 print-grid-2"
        {...createFadeSlideUp(0.16)}
      >
        {/* Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData && trendData.length > 0 ? (
              <TicketsTrendChart data={trendData} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No trend data available.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketsStatusDonut
              data={{
                open: data.open,
                inProgress: data.inProgress,
                closed: data.closed,
              }}
            />
          </CardContent>
        </Card>
        {/* Tickets by Day */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Ticket Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData && trendData.length > 0 ? (
              <TicketsByDayBar data={trendData} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No daily ticket data available.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );

  
};


export default Reports;
