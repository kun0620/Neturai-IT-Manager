import { supabase } from '@/lib/supabase';
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



export function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openDrawer } = useTicketDrawer();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/login');
    } else {
      console.error('Logout failed', error.message);
    }
  };

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications(user?.id);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b bg-background px-4">
      <ModeToggle />

      {/* 🔔 Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-accent"
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
            className="w-80 max-h-96 overflow-y-auto"
          >

          <DropdownMenuLabel className="flex items-center justify-between">
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
          <DropdownMenuSeparator />

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
                  'flex flex-col gap-1 items-start cursor-pointer',
                  !n.is_read && 'bg-muted font-medium'
                )}
              >
                {/* Title */}
                <span className="text-sm">
                  🆕 New ticket: {n.title}
                </span>

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
            className="flex h-9 w-9 items-center justify-center rounded-full border bg-background hover:bg-accent"
          >
            <User className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="z-[9999] w-48"
        >
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
