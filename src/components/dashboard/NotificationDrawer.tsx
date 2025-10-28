import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BellRing, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationDrawerProps {
  children: ReactNode;
}

type Notification = {
  id: string;
  type: 'new_ticket' | 'status_change' | 'priority_change' | 'info';
  message: string;
  timestamp: string;
  ticket_id?: string;
  status?: Tables<'tickets'>['status'];
  priority?: Tables<'tickets'>['priority'];
};

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'new_ticket':
      return <BellRing className="h-5 w-5 text-blue-500" />;
    case 'status_change':
      return <Info className="h-5 w-5 text-yellow-500" />;
    case 'priority_change':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'info':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

export function NotificationDrawer({ children }: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Simulate initial notifications
    setNotifications([
      {
        id: '1',
        type: 'new_ticket',
        message: 'New high-priority ticket #NT-001 created: "Server Down"',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        ticket_id: 'NT-001',
        priority: 'Critical',
      },
      {
        id: '2',
        type: 'status_change',
        message: 'Ticket #NT-005 status changed to "In Progress"',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        ticket_id: 'NT-005',
        status: 'In Progress',
      },
      {
        id: '3',
        type: 'priority_change',
        message: 'Ticket #NT-002 priority escalated to "High"',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        ticket_id: 'NT-002',
        priority: 'High',
      },
    ]);

    const channel = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          console.log('Change received!', payload);
          const newTicket = payload.new as Tables<'tickets'>;
          let newNotification: Notification | null = null;

          if (payload.eventType === 'INSERT') {
            newNotification = {
              id: newTicket.id,
              type: 'new_ticket',
              message: `New ticket #${newTicket.id.substring(0, 8)} created: "${newTicket.subject}"`,
              timestamp: new Date().toISOString(),
              ticket_id: newTicket.id,
              priority: newTicket.priority,
            };
          } else if (payload.eventType === 'UPDATE') {
            const oldTicket = payload.old as Tables<'tickets'>;
            if (newTicket.status !== oldTicket.status) {
              newNotification = {
                id: newTicket.id + '-status',
                type: 'status_change',
                message: `Ticket #${newTicket.id.substring(0, 8)} status changed to "${newTicket.status}"`,
                timestamp: new Date().toISOString(),
                ticket_id: newTicket.id,
                status: newTicket.status,
              };
            } else if (newTicket.priority !== oldTicket.priority) {
              newNotification = {
                id: newTicket.id + '-priority',
                type: 'priority_change',
                message: `Ticket #${newTicket.id.substring(0, 8)} priority escalated to "${newTicket.priority}"`,
                timestamp: new Date().toISOString(),
                ticket_id: newTicket.id,
                priority: newTicket.priority,
              };
            }
          }

          if (newNotification) {
            setNotifications((prev) => [newNotification!, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] py-4">
          <div className="flex flex-col gap-4 pr-4">
            <AnimatePresence initial={false}>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3 rounded-lg border p-4 shadow-sm"
                  >
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No new notifications.
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
