import React, { useMemo, useState } from 'react';
import { format, formatISO, subDays } from 'date-fns';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import {
  AlertTriangle,
  Cloud,
  Download,
  Laptop,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  KeyRound,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createFadeSlideUp } from '@/lib/motion';
import { notifyError, notifySuccess } from '@/lib/notify';
import { exportRowsToExcel, exportRowsToPdf } from '@/lib/export';
import { useCategoryStats } from '@/hooks/useCategories';
import { useReportOverview } from '@/hooks/useReportOverview';
import { useTicketsTrend } from '@/hooks/useTicketsTrend';

type RangeOption = '7d' | '30d' | 'custom';

type TrendTicket = {
  created_at: string;
  status: 'open' | 'in_progress' | 'closed';
};

const WEEKDAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

const Reports: React.FC = () => {
  const [range, setRange] = useState<RangeOption>('7d');
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 7));
  const [toDate, setToDate] = useState<Date>(new Date());

  const from = formatISO(fromDate);
  const to = formatISO(toDate);
  const customFromValue = format(fromDate, 'yyyy-MM-dd');
  const customToValue = format(toDate, 'yyyy-MM-dd');
  const isDateRangeInvalid = useMemo(
    () => fromDate.getTime() > toDate.getTime(),
    [fromDate, toDate]
  );

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useReportOverview(from, to);
  const { data: trendData = [], isLoading: isTrendLoading } = useTicketsTrend(from, to);
  const { data: categoryStats = [] } = useCategoryStats();

  const navigate = useNavigate();

  const buildReportRows = () => {
    if (!data?.tickets) return [];
    return data.tickets.map((ticket) => ({
      ID: ticket.id,
      Title: ticket.title ?? '',
      Status: ticket.status ?? '',
      Priority: ticket.priority ?? '',
      'Created At': ticket.created_at
        ? format(new Date(ticket.created_at), 'yyyy-MM-dd HH:mm')
        : '',
      'Updated At': ticket.updated_at
        ? format(new Date(ticket.updated_at), 'yyyy-MM-dd HH:mm')
        : '',
      'Due At': ticket.due_at ? format(new Date(ticket.due_at), 'yyyy-MM-dd HH:mm') : '',
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

  const trendSummary = useMemo(() => {
    const grouped = (trendData as TrendTicket[]).reduce<Record<string, number>>((acc, ticket) => {
      const key = format(new Date(ticket.created_at), 'MMM dd');
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const points = Object.entries(grouped).map(([label, value]) => ({ label, value }));
    if (points.length === 0) {
      return {
        points: [] as Array<{ label: string; value: number }>,
        polyline: '',
        maxValue: 0,
        anomaly: null as null | { label: string; value: number; delta: number },
      };
    }

    const maxValue = Math.max(...points.map((point) => point.value), 1);
    const avg = points.reduce((sum, point) => sum + point.value, 0) / points.length;
    const polyline = points
      .map((point, index) => {
        const x = points.length === 1 ? 300 : (index / (points.length - 1)) * 600;
        const y = 220 - (point.value / maxValue) * 180;
        return `${x},${y}`;
      })
      .join(' ');
    const anomalyPoint = points
      .filter((point) => point.value > avg * 1.4)
      .sort((a, b) => b.value - a.value)[0];

    return {
      points,
      polyline,
      maxValue,
      anomaly: anomalyPoint
        ? {
            label: anomalyPoint.label,
            value: anomalyPoint.value,
            delta: Math.round(((anomalyPoint.value - avg) / avg) * 100),
          }
        : null,
    };
  }, [trendData]);

  const weekdayVolume = useMemo(() => {
    const counts = WEEKDAY_ORDER.reduce<Record<(typeof WEEKDAY_ORDER)[number], number>>(
      (acc, day) => ({ ...acc, [day]: 0 }),
      {} as Record<(typeof WEEKDAY_ORDER)[number], number>
    );

    (trendData as TrendTicket[]).forEach((ticket) => {
      const day = format(new Date(ticket.created_at), 'EEE') as (typeof WEEKDAY_ORDER)[number];
      if (counts[day] !== undefined) counts[day] += 1;
    });

    const max = Math.max(...Object.values(counts), 1);
    return WEEKDAY_ORDER.map((day) => ({
      day,
      count: counts[day],
      height: `${Math.max(10, Math.round((counts[day] / max) * 100))}%`,
      active: counts[day] === max,
    }));
  }, [trendData]);

  const topCategories = useMemo(() => {
    const iconMap = [Laptop, KeyRound, Cloud];
    const colorMap = [
      'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
      'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300',
      'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300',
    ];

    return categoryStats.slice(0, 3).map((row, index) => ({
      ...row,
      icon: iconMap[index] ?? Laptop,
      iconClass: colorMap[index] ?? colorMap[0],
    }));
  }, [categoryStats]);

  const total = data?.total ?? 0;
  const resolutionRate = total > 0 ? (data?.closed ?? 0) / total : 0;
  const slaCompliance = total > 0 ? 1 - (data?.slaBreaches ?? 0) / total : 0;
  const avgResponseHours = data?.medianResolutionHours ?? 0;

  if (isLoading || isTrendLoading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <LoadingSkeleton count={4} className="lg:grid-cols-4" />
        </div>
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

  return (
    <motion.div
      id="report-print"
      className="space-y-6 bg-[#f6f6f8] p-6 text-slate-900 dark:bg-[#161220] dark:text-slate-100 md:p-8"
      {...createFadeSlideUp(0)}
    >
      <motion.div
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        {...createFadeSlideUp(0.03)}
      >
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Reports
          </h2>
          <p className="font-medium text-slate-500 dark:text-slate-400">
            Ticket Analytics &amp; System Health
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {([
              ['7d', 'Last 7 days'],
              ['30d', 'Last 30 days'],
              ['custom', 'Custom'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setRange(value);
                  if (value === '7d') {
                    setFromDate(subDays(new Date(), 7));
                    setToDate(new Date());
                  }
                  if (value === '30d') {
                    setFromDate(subDays(new Date(), 30));
                    setToDate(new Date());
                  }
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                  range === value
                    ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:ring-slate-600'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {range === 'custom' ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <input
                type="date"
                value={customFromValue}
                onChange={(e) => setFromDate(new Date(e.target.value))}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customToValue}
                onChange={(e) => setToDate(new Date(e.target.value))}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg border-slate-200 bg-white text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
              onClick={() => void handleExportExcel()}
              disabled={(range === 'custom' && isDateRangeInvalid) || !data.tickets?.length}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2 rounded-lg bg-primary text-xs font-bold text-white hover:bg-primary/90"
              onClick={handleExportPdf}
              disabled={(range === 'custom' && isDateRangeInvalid) || !data.tickets?.length}
            >
              <FileText className="h-4 w-4" />
              PDF Report
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg border-slate-200 bg-white text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {trendSummary.anomaly ? (
        <motion.div
          className="flex flex-col justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 md:flex-row md:items-center dark:bg-primary/10"
          {...createFadeSlideUp(0.06)}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2 text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Anomaly Detected</p>
              <p className="text-sm italic text-slate-600 dark:text-slate-400">
                Unusual spike in tickets detected on {trendSummary.anomaly.label} (+
                {trendSummary.anomaly.delta}% above baseline)
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-4 py-2 text-sm font-bold text-primary transition-colors hover:underline"
          >
            View Analysis
          </button>
        </motion.div>
      ) : null}

      <motion.div
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        {...createFadeSlideUp(0.09)}
      >
        {[
          {
            label: 'Total Tickets',
            value: total.toLocaleString(),
            delta: '+12%',
            deltaClass: 'text-emerald-500',
            barClass: 'bg-primary',
            barWidth: '70%',
            icon: TrendingUp,
          },
          {
            label: 'Resolution Rate',
            value: `${(resolutionRate * 100).toFixed(1)}%`,
            delta: '+2.4%',
            deltaClass: 'text-emerald-500',
            barClass: 'bg-emerald-500',
            barWidth: `${clampPercent(resolutionRate * 100)}%`,
            icon: TrendingUp,
          },
          {
            label: 'Avg Response Time',
            value: avgResponseHours ? `${avgResponseHours.toFixed(1)}h` : '—',
            delta: '-14m',
            deltaClass: 'text-red-500',
            barClass: 'bg-orange-400',
            barWidth: '45%',
            icon: TrendingDown,
          },
          {
            label: 'SLA Compliance',
            value: `${(slaCompliance * 100).toFixed(1)}%`,
            delta: 'Target: 98%',
            deltaClass: 'text-slate-400',
            barClass: 'bg-primary',
            barWidth: `${clampPercent(slaCompliance * 100)}%`,
            icon: ShieldCheck,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {item.label}
              </span>
              <span className={`flex items-center text-xs font-bold ${item.deltaClass}`}>
                {item.delta}
                <item.icon className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{item.value}</div>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full ${item.barClass}`} style={{ width: item.barWidth }} />
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        {...createFadeSlideUp(0.12)}
      >
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Ticket Volume Trend</h3>
            <select className="border-none bg-transparent text-xs font-bold text-slate-500 focus:ring-0">
              <option>Daily View</option>
              <option>Weekly View</option>
            </select>
          </div>
          <div className="relative h-64 rounded-lg bg-slate-50 px-6 pb-2 dark:bg-slate-800/50">
            <div className="absolute inset-y-4 left-4 flex flex-col justify-between text-[10px] font-bold uppercase text-slate-400">
              {[200, 150, 100, 50, 0].map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
            <div className="relative ml-8 h-full border-b border-l border-slate-200 dark:border-slate-700">
              {trendSummary.points.length > 0 ? (
                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    points={trendSummary.polyline}
                    stroke="#3b1e8a"
                    strokeWidth="3"
                  />
                  <path
                    d={`${trendSummary.polyline} L600,256 L0,256 Z`}
                    fill="rgba(59, 30, 138, 0.1)"
                  />
                </svg>
              ) : null}
              {trendSummary.points.slice(0, 5).map((point, index) => (
                <div
                  key={point.label}
                  className="absolute h-3 w-3 rounded-full border-2 border-white bg-primary dark:border-slate-900"
                  style={{
                    left: `${15 + index * 17}%`,
                    bottom: `${Math.max(18, (point.value / Math.max(trendSummary.maxValue, 1)) * 80)}%`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-between px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {(trendSummary.points.length ? trendSummary.points : [
              { label: 'Oct 01', value: 0 },
              { label: 'Oct 08', value: 0 },
              { label: 'Oct 15', value: 0 },
              { label: 'Oct 22', value: 0 },
              { label: 'Oct 29', value: 0 },
            ])
              .slice(0, 5)
              .map((point) => (
                <span key={point.label}>{point.label}</span>
              ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-6 font-bold text-slate-900 dark:text-white">Distribution by Status</h3>
          <div className="flex flex-col items-center">
            <div className="relative mb-6 h-48 w-48">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  className="stroke-slate-100 dark:stroke-slate-800"
                  cx="18"
                  cy="18"
                  fill="none"
                  r="16"
                  strokeWidth="4"
                />
                <circle
                  className="stroke-primary"
                  cx="18"
                  cy="18"
                  fill="none"
                  r="16"
                  strokeDasharray={`${clampPercent((data.open / Math.max(total, 1)) * 100)}, 100`}
                  strokeWidth="4"
                />
                <circle
                  className="stroke-emerald-500"
                  cx="18"
                  cy="18"
                  fill="none"
                  r="16"
                  strokeDasharray={`${clampPercent((data.inProgress / Math.max(total, 1)) * 100)}, 100`}
                  strokeDashoffset={`-${clampPercent((data.open / Math.max(total, 1)) * 100)}`}
                  strokeWidth="4"
                />
                <circle
                  className="stroke-orange-400"
                  cx="18"
                  cy="18"
                  fill="none"
                  r="16"
                  strokeDasharray={`${clampPercent((data.closed / Math.max(total, 1)) * 100)}, 100`}
                  strokeDashoffset={`-${clampPercent(((data.open + data.inProgress) / Math.max(total, 1)) * 100)}`}
                  strokeWidth="4"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {total.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold uppercase text-slate-500">Total</span>
              </div>
            </div>
            <div className="w-full space-y-2">
              {[
                { label: 'Open', value: data.open, color: 'bg-primary' },
                { label: 'In Progress', value: data.inProgress, color: 'bg-emerald-500' },
                { label: 'Closed', value: data.closed, color: 'bg-orange-400' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-sm ${item.color}`} />
                    <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                  </div>
                  <span className="text-slate-900 dark:text-white">
                    {clampPercent((item.value / Math.max(total, 1)) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Daily Volume Heatmap</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                <div className="h-2 w-2 rounded-full bg-primary/30" />
                Below Average
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                <div className="h-2 w-2 rounded-full bg-primary" />
                Above Average
              </div>
            </div>
          </div>
          <div className="grid h-48 grid-cols-7 items-end gap-4">
            {weekdayVolume.map((item) => (
              <div key={item.day} className="flex flex-col items-center gap-3">
                <div className="group relative h-full w-full">
                  <div
                    className={`absolute bottom-0 w-full rounded-t-lg ${
                      item.active ? 'bg-primary' : 'bg-primary/20'
                    }`}
                    style={{ height: item.height }}
                  />
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {item.count} Tickets
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black uppercase tracking-tighter ${
                    item.active ? 'text-primary' : 'text-slate-400'
                  }`}
                >
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        {...createFadeSlideUp(0.15)}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Top Ticket Categories</h3>
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
            onClick={() => navigate('/tickets')}
          >
            See Detailed Breakdowns
          </button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(topCategories.length > 0
            ? topCategories
            : [
                { category: 'Hardware Troubleshooting', count: 0, icon: Laptop, iconClass: 'bg-blue-50 text-blue-600' },
                { category: 'Access & Permissions', count: 0, icon: KeyRound, iconClass: 'bg-violet-50 text-violet-600' },
                { category: 'SaaS Subscriptions', count: 0, icon: Cloud, iconClass: 'bg-orange-50 text-orange-600' },
              ]
          ).map((category, index) => (
            <div
              key={category.category}
              className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.iconClass}`}
                >
                  <category.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {category.category}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500">
                    {index === 0
                      ? 'Laptops, Peripherals, Infrastructure'
                      : index === 1
                        ? 'SSO, VPN, Folder Access'
                        : 'Provisioning, Billing, Technical'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {category.count}
                </p>
                <p
                  className={`text-[10px] font-bold uppercase ${
                    index === 0
                      ? 'text-red-500'
                      : index === 1
                        ? 'text-emerald-500'
                        : 'text-slate-400'
                  }`}
                >
                  {index === 0 ? '+14.2%' : index === 1 ? '-2.5%' : 'Stable'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="hidden">
        <Badge variant="outline">Range: {range}</Badge>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Download className="h-4 w-4" />
          Print
        </Button>
      </div>
    </motion.div>
  );
};

export default Reports;
