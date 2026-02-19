import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Bell, CheckCheck, Filter, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
type NotificationPreference = {
  user_id: string;
  receive_new_ticket: boolean;
  receive_status_change: boolean;
  receive_priority_change: boolean;
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const preferencesQuery = useQuery({
    queryKey: ['notification-preferences', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as NotificationPreference | null) ?? null;
    },
  });

  const upsertPreferences = useMutation({
    mutationFn: async (patch: Partial<NotificationPreference>) => {
      if (!userId) return;
      const current = preferencesQuery.data;
      const { error } = await supabase.from('user_notification_preferences').upsert(
        {
          user_id: userId,
          receive_new_ticket: current?.receive_new_ticket ?? true,
          receive_status_change: current?.receive_status_change ?? true,
          receive_priority_change: current?.receive_priority_change ?? true,
          ...patch,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notification-preferences', userId] });
      notifySuccess('Preferences updated');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      notifyError('Failed to update preferences', message);
    },
  });

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

  const types = Array.from(new Set(rows.map((row) => row.type).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
  const preferences = preferencesQuery.data;

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
    <motion.div className="flex flex-col gap-4 p-4 md:p-6" {...createFadeSlideUp(0)}>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Neturai IT Manager
        </p>
        <h1 className="flex items-center gap-2 text-3xl font-semibold">
          <Bell className="h-7 w-7" /> Notifications
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Unread: {unreadCount}</Badge>
          <Badge variant="outline">Total: {total}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              key: 'receive_new_ticket' as const,
              label: 'New ticket assigned',
              description: 'Notify when a new ticket is assigned or created for you.',
            },
            {
              key: 'receive_status_change' as const,
              label: 'Ticket status changes',
              description: 'Notify when ticket status changes.',
            },
            {
              key: 'receive_priority_change' as const,
              label: 'Ticket priority changes',
              description: 'Notify when ticket priority changes.',
            },
          ].map((item) => {
            const checked = preferences?.[item.key] ?? true;
            return (
              <div key={item.key} className="flex items-center justify-between rounded-md border border-border/70 p-3">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={checked}
                  disabled={upsertPreferences.isPending || preferencesQuery.isLoading}
                  onCheckedChange={(value) =>
                    upsertPreferences.mutate({ [item.key]: value } as Partial<NotificationPreference>)
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="mr-auto text-base">Inbox</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              onClick={() => void notificationsQuery.refetch()}
              disabled={notificationsQuery.isFetching}
            >
              <RefreshCw className={notificationsQuery.isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={readFilter}
              onValueChange={(value) => {
                setReadFilter(value as ReadFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[130px] text-sm">
                <SelectValue placeholder="Read state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={dateFilter}
              onValueChange={(value) => {
                setDateFilter(value as DateFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[130px] text-sm">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[170px] text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {notificationsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-md border border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 rounded bg-muted/60" />
                    <div className="h-4 w-12 rounded bg-muted/50" />
                  </div>
                  <div
                    className={`mt-2 h-4 rounded bg-muted/60 ${
                      index % 3 === 0 ? 'w-3/4' : index % 3 === 1 ? 'w-2/3' : 'w-4/5'
                    }`}
                  />
                  <div
                    className={`mt-1 h-3 rounded bg-muted/50 ${
                      index % 3 === 0 ? 'w-1/2' : index % 3 === 1 ? 'w-2/5' : 'w-3/5'
                    }`}
                  />
                  <div className="mt-2 h-3 w-24 rounded bg-muted/40" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState title="No notifications" message="Try adjusting your filters." />
          ) : (
            <div className="space-y-2">
              {rows.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/40 ${
                    !notification.is_read ? 'border-primary/40 bg-primary/5' : 'border-border/70'
                  }`}
                  onClick={() => void openNotification(notification)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {notification.type}
                    </Badge>
                    {!notification.is_read && (
                      <Badge variant="secondary" className="text-[10px]">
                        Unread
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium">{notification.title}</p>
                  {notification.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{notification.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {notification.created_at
                      ? format(new Date(notification.created_at), 'dd MMM yyyy HH:mm')
                      : '—'}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm">
            <span className="text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
