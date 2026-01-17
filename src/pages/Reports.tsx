import React, { useState } from 'react';
import { subDays, formatISO } from 'date-fns';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

import { useReportOverview } from '@/hooks/useReportOverview';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SummaryCard } from '@/components/dashboard/SummaryCard';

import { useTicketsTrend } from '@/hooks/useTicketsTrend';
import { TicketsTrendChart } from '@/components/reports/TicketsTrendChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketsStatusDonut } from '@/components/reports/TicketsStatusDonut';
import { TicketsByDayBar } from '@/components/reports/TicketsByDayBar';
import { useNavigate } from 'react-router-dom';



import {
  CircleDot,
  Hourglass,
  CheckCircle,
  LayoutDashboard,
} from 'lucide-react';

const Reports: React.FC = () => {
  /* ---------- state ---------- */
  const [range, setRange] = useState<'7d' | '30d' | 'custom'>('7d');
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 7));
  const [toDate, setToDate] = useState<Date>(new Date());
  
  /* ---------- derived ---------- */
  const from = formatISO(fromDate);
  const to = formatISO(toDate);

  /* ---------- data ---------- */
  const {
    data,
    isLoading,
    isError,
    error,
  } = useReportOverview(from, to);

  const {
  data: trendData,
  isLoading: isLoadingTrend,
} = useTicketsTrend(from, to);

const navigate = useNavigate();

const exportCSV = () => {
  if (!data?.tickets || data.tickets.length === 0) return;

  const headers = [
    'ID',
    'Title',
    'Status',
    'Priority',
    'Created At',
    'Updated At',
    'Due At',
  ];

  const rows = data.tickets.map(t => [
    t.id,
    `"${t.title ?? ''}"`,
    t.status,
    t.priority,
    t.created_at,
    t.updated_at,
    t.due_at,
  ]);

  const csvContent =
    [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `tickets_report_${from.slice(0, 10)}_${to.slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};

  /* ---------- states ---------- */
  if (isLoading || isLoadingTrend) {
  return <LoadingSpinner />;
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
    <div id="report-print" className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">IT Ticket Report</h1>
        <p className="text-sm text-muted-foreground">
          Period: {from.slice(0,10)} → {to.slice(0,10)}
        </p>
        <hr className="my-4" />

      {/* Date Range */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`px-3 py-1 text-sm rounded-md border ${
            range === '7d' ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => {
            setRange('7d');
            setFromDate(subDays(new Date(), 7));
            setToDate(new Date());
          }}
        >
          Last 7 days
        </button>

        <button
          className={`px-3 py-1 text-sm rounded-md border ${
            range === '30d' ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => {
            setRange('30d');
            setFromDate(subDays(new Date(), 30));
            setToDate(new Date());
          }}
        >
          Last 30 days
        </button>

        <button
          className={`px-3 py-1 text-sm rounded-md border ${
            range === 'custom' ? 'bg-primary text-primary-foreground' : ''
          }`}
          onClick={() => setRange('custom')}
        >
          Custom
        </button>

        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate.toISOString().slice(0, 10)}
              onChange={(e) => setFromDate(new Date(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={toDate.toISOString().slice(0, 10)}
              onChange={(e) => setToDate(new Date(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
        )}

        <button
          className="ml-auto px-3 py-1 text-sm rounded-md border hover:bg-muted"
          onClick={() => exportCSV()}
        >
          Export CSV
        </button>
        <button
          className="px-3 py-1 text-sm rounded-md border hover:bg-muted"
          onClick={() => window.print()}
        >
          Export PDF
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print-summary-grid">
        <SummaryCard
          title="Total Tickets"
          value={data.total}
          icon={LayoutDashboard}
          description="Selected range"
        />

        <SummaryCard
          title="Open"
          value={data.open}
          icon={CircleDot}
          color="text-green-500"
          description="Currently open"
        />

        <SummaryCard
          title="In Progress"
          value={data.inProgress}
          icon={Hourglass}
          color="text-yellow-500"
          description="Being worked on"
        />

        <SummaryCard
          title="Closed"
          value={data.closed}
          icon={CheckCircle}
          color="text-blue-500"
          description="Resolved"
        />

        <SummaryCard
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
          title="Overdue Tickets"
          value={data.overdue}
          icon={CircleDot}
          color="text-red-600"
          description="Past SLA"
        />

        <SummaryCard
          title="SLA Breaches"
          value={data.slaBreaches}
          icon={CircleDot}
          color="text-red-600"
          description="Tickets exceeding SLA"
          onClick={() => navigate('/tickets?sla=breach')}
        />

      </div>
      <div className="grid gap-6 lg:grid-cols-2 print-grid-2">
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
      </div>
    </div>
  );

  
};


export default Reports;
