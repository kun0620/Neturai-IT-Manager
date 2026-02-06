import { supabase } from '@/lib/supabase';
import { notifyError } from '@/lib/notify';
import { Bell, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/mode-toggle';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useTicketDrawer } from '@/context/TicketDrawerContext';



export function TopBar({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openDrawer } = useTicketDrawer();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/login');
    } else {
      notifyError('Logout failed', error.message);
    }
  };

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications(user?.id);

  const getNotificationTitle = (n: typeof notifications[number]) => {
    if (n.title) return n.title;
    switch (n.type) {
      case 'status_change':
        return 'Ticket status changed';
      case 'priority_change':
        return 'Ticket priority changed';
      case 'new_ticket':
        return 'New ticket';
      default:
        return 'Notification';
    }
  };

  const getNotificationMeta = (n: typeof notifications[number]) => {
    switch (n.type) {
      case 'status_change':
        return { label: 'Status', color: 'bg-yellow-500/20 text-yellow-700' };
      case 'priority_change':
        return { label: 'Priority', color: 'bg-red-500/20 text-red-700' };
      case 'new_ticket':
        return { label: 'New', color: 'bg-blue-500/20 text-blue-700' };
      case 'info':
      default:
        return { label: 'Info', color: 'bg-gray-500/20 text-gray-700' };
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b bg-background px-4">
      <ModeToggle />

      {/* 🔔 Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md bg-transparent hover:bg-muted"
        >
            <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-80 max-h-96 overflow-y-auto bg-card border border-border shadow-xl"
        >

          <DropdownMenuLabel className="flex items-center justify-between px-4 py-2">
            <span>Notifications</span>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:underline"
              >
                Mark all as read
              </button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />

          {notifications.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              No notifications
            </div>
          )}
          {notifications.map((n) => (
            <DropdownMenuItem
                key={n.id}
                onClick={() => {
                  markAsRead(n.id);
                  if (n.ticket_id) {
                    openDrawer(n.ticket_id);
                  }
                }}
                className={clsx(
                  'flex flex-col gap-1 items-start cursor-pointer px-4 py-2',
                  !n.is_read &&
                    'border-l-2 border-primary bg-muted/50 font-medium'
                )}
              >
                {/* Title */}
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getNotificationMeta(n).color}`}
                  >
                    {getNotificationMeta(n).label}
                  </span>
                  <span className="text-sm">{getNotificationTitle(n)}</span>
                </div>

                {n.body && (
                  <span className="text-xs text-muted-foreground">
                    {n.body}
                  </span>
                )}

                {/* Time */}
                <span className="text-xs text-muted-foreground">
                  {n.created_at
                    ? format(new Date(n.created_at), 'dd MMM yyyy HH:mm')
                    : ''}
                </span>
              </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 👤 User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent hover:bg-muted"
          >
            <User className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="z-[9999] w-48 bg-card border border-border shadow-xl"
        >
          <DropdownMenuLabel className="flex items-center justify-between px-4 py-2">My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link to="/profile">Profile</Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to="/settings">Settings</Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={handleLogout}
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
