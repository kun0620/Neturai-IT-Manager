import { useMemo, useState } from 'react';
import { format, formatDistanceToNowStrict, isYesterday, subDays } from 'date-fns';
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Ticket,
  UserRound,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { createFadeSlideUp } from '@/lib/motion';
import { notifyError, notifySuccess } from '@/lib/notify';
import type { Database } from '@/types/database.types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type ReadFilter = 'all' | 'unread' | 'read';
type DateFilter = 'all' | '7d' | '30d';

const PAGE_SIZE = 5;

function getNotificationMeta(notification: NotificationRow) {
  const type = (notification.type ?? '').toLowerCase();
  const title = (notification.title ?? '').toLowerCase();

  if (type.includes('ticket') || title.includes('ticket')) {
    return {
      icon: Ticket,
      iconClass: notification.is_read
        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
        : 'bg-primary/20 text-primary',
      actionLabel: 'View Ticket',
    };
  }

  if (type.includes('asset') || title.includes('asset') || title.includes('inventory')) {
    return {
      icon: Package,
      iconClass: notification.is_read
        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
        : 'bg-primary/20 text-primary',
      actionLabel: 'View Asset',
    };
  }

  if (type.includes('security') || title.includes('security') || title.includes('login')) {
    return {
      icon: ShieldAlert,
      iconClass: notification.is_read
        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
        : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
      actionLabel: 'Investigate',
    };
  }

  if (type.includes('system') || title.includes('update')) {
    return {
      icon: Settings2,
      iconClass: notification.is_read
        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
        : 'bg-primary/20 text-primary',
      actionLabel: 'Release Notes',
    };
  }

  return {
    icon: UserRound,
    iconClass: notification.is_read
      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
      : 'bg-primary/20 text-primary',
    actionLabel: 'View Profile',
  };
}

function getDateRangeLabel(dateFilter: DateFilter) {
  if (dateFilter === '7d') return 'Last 7 days';
  if (dateFilter === '30d') return 'Last 30 days';
  return 'All time';
}

function getDateRangeDisplay(dateFilter: DateFilter) {
  const now = new Date();

  if (dateFilter === '7d') {
    return `${format(subDays(now, 7), 'MMM d, yyyy')} - ${format(now, 'MMM d, yyyy')}`;
  }

  if (dateFilter === '30d') {
    return `${format(subDays(now, 30), 'MMM d, yyyy')} - ${format(now, 'MMM d, yyyy')}`;
  }

  return 'All time';
}

function getNotificationTimestamp(value: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  const now = new Date();
  const distanceInMs = now.getTime() - date.getTime();

  if (distanceInMs < 24 * 60 * 60 * 1000) {
    return `${formatDistanceToNowStrict(date, { addSuffix: true })}`;
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return format(date, 'MMM d, yyyy');
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fromDate = useMemo(() => {
    if (dateFilter === '7d') return subDays(new Date(), 7).toISOString();
    if (dateFilter === '30d') return subDays(new Date(), 30).toISOString();
    return null;
  }, [dateFilter]);

  const notificationsQuery = useQuery({
    queryKey: ['notifications-page', userId, readFilter, dateFilter, typeFilter, page],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { rows: [] as NotificationRow[], count: 0 };

      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (readFilter === 'unread') query = query.eq('is_read', false);
      if (readFilter === 'read') query = query.eq('is_read', true);
      if (typeFilter !== 'all') query = query.eq('type', typeFilter);
      if (fromDate) query = query.gte('created_at', fromDate);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        rows: (data ?? []).map((row) => ({ ...row, is_read: row.is_read ?? false })),
        count: count ?? 0,
      };
    },
  });

  const unreadSummaryQuery = useQuery({
    queryKey: ['notifications-unread-summary', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count ?? 0;
    },
  });

  const rows = notificationsQuery.data?.rows ?? [];
  const total = notificationsQuery.data?.count ?? 0;
  const unreadCount = unreadSummaryQuery.data ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  const types = Array.from(new Set(rows.map((row) => row.type).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );

  const markAsRead = async (notification: NotificationRow) => {
    if (notification.is_read) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id);

    if (error) {
      notifyError('Failed to mark notification as read', error.message);
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-summary'] }),
    ]);
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      notifyError('Failed to mark all as read', error.message);
      return;
    }

    notifySuccess('Notifications updated', 'All notifications are marked as read');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-summary'] }),
    ]);
  };

  const openNotification = async (notification: NotificationRow) => {
    await markAsRead(notification);
    if (notification.ticket_id) {
      navigate(`/tickets?open_ticket=${encodeURIComponent(notification.ticket_id)}`);
    }
  };

  if (notificationsQuery.isError) {
    const error = notificationsQuery.error as Error;
    return (
      <div className="p-4 md:p-6">
        <ErrorState title="Failed to load notifications" message={error.message} />
      </div>
    );
  }

  return (
    <motion.div
      className="w-full space-y-4 bg-[#f6f6f8] px-4 py-5 text-slate-900 dark:bg-[#161220] dark:text-slate-100 md:px-8 md:py-6"
      {...createFadeSlideUp(0)}
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage system alerts and team updates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex cursor-default items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <CalendarDays className="h-4 w-4" />
            <span>{getDateRangeDisplay(dateFilter)}</span>
          </div>
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-8">
          <button
            type="button"
            onClick={() => {
              setReadFilter('all');
              setPage(1);
            }}
            className={`flex items-center gap-2 pb-4 text-sm ${
              readFilter === 'all'
                ? 'border-b-2 border-primary font-bold text-primary'
                : 'font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            All Notifications
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              readFilter === 'all'
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
            }`}>
              {total}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setReadFilter('unread');
              setPage(1);
            }}
            className={`flex items-center gap-2 pb-4 text-sm ${
              readFilter === 'unread'
                ? 'border-b-2 border-primary font-bold text-primary'
                : 'font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Unread
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              readFilter === 'unread'
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
            }`}>
              {unreadCount}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => void notificationsQuery.refetch()}
          className="flex items-center gap-1 pb-4 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
        >
          {notificationsQuery.isFetching ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Filter className="h-4 w-4" />
          )}
          Filter
        </button>
      </div>

      <div className="sr-only">
        <p>Total: {total}</p>
        <p>Unread: {unreadCount}</p>
        <p>Page {page} / {totalPages}</p>
      </div>

      <div className="hidden">
        <select value={readFilter} onChange={(e) => setReadFilter(e.target.value as ReadFilter)}>
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}>
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {notificationsQuery.isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800/70" />
                <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800/70" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No notifications" message="Try adjusting your filters." />
      ) : (
        <div className="space-y-2.5">
          {rows.map((notification) => {
            const meta = getNotificationMeta(notification);
            const Icon = meta.icon;

            return (
              <div
                key={notification.id}
                className={`group relative flex items-start gap-3 rounded-xl p-3.5 transition-all ${
                  !notification.is_read
                    ? 'border-l-4 border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="mt-1 flex-shrink-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className={`min-w-0 flex-1 ${notification.is_read ? 'opacity-80' : ''}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className={`truncate pr-4 text-left text-sm transition-colors ${
                        notification.is_read
                          ? 'font-semibold text-slate-700 hover:text-primary dark:text-slate-200 dark:hover:text-primary'
                          : 'font-bold text-slate-900 hover:text-primary dark:text-white dark:hover:text-primary'
                      }`}
                    >
                      {notification.title}
                    </button>
                    <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                      {getNotificationTimestamp(notification.created_at)}
                    </span>
                  </div>
                  {notification.body ? (
                    <p className={`line-clamp-2 text-sm ${
                      notification.is_read
                        ? 'text-slate-500 dark:text-slate-500'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {notification.body}
                    </p>
                  ) : null}
                  <div className="mt-2.5 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className={`flex items-center gap-1 text-xs font-bold ${
                        notification.is_read
                          ? 'text-primary/70 hover:text-primary'
                          : 'text-primary hover:underline'
                      }`}
                    >
                      {meta.actionLabel}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    {!notification.is_read ? (
                      <button
                        type="button"
                        onClick={() => void markAsRead(notification)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Mark as read
                      </button>
                    ) : null}
                  </div>
                </div>
                {!notification.is_read ? (
                  <div className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing {showingFrom} to {showingTo} of {total} notifications
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400 transition-colors disabled:cursor-not-allowed dark:border-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <div className="flex items-center">
            {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                className={`h-9 w-9 rounded-lg text-sm font-medium ${
                  page === item
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {item}
              </button>
            ))}
            {totalPages > 4 ? <span className="px-2 text-slate-400">...</span> : null}
            {totalPages > 3 ? (
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                className={`h-9 w-9 rounded-lg text-sm font-medium ${
                  page === totalPages
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {totalPages}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="hidden">
        <Bell className="h-7 w-7" />
      </div>
    </motion.div>
  );
}
