import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyError } from '@/lib/notify';

export type Notification = {
  id: string;
  user_id: string;
  ticket_id: string | null;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean | null;
  created_at: string | null;
};


export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // โหลด notification ครั้งแรก
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        notifyError('Failed to load notifications', error.message);
      }

      if (!error && data) {
        setNotifications(
            data.map(n => ({
            ...n,
            is_read: n.is_read ?? false,
            }))
        );
        }

      setLoading(false);
    };

    fetchNotifications();
  }, [userId]);

  // realtime
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
        const newNoti = {
            ...(payload.new as Notification),
            is_read: payload.new.is_read ?? false,
        };

        setNotifications(prev => [newNoti, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const updated = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => (n.id === updated.id ? { ...n, ...updated } : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const removed = payload.old as Notification;
          setNotifications(prev => prev.filter(n => n.id !== removed.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // mark read
  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      notifyError('Failed to mark notification as read', error.message);
      return;
    }

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
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

    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
  };

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.is_read).length,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
