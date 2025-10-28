import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  HardDrive,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login'; // Redirect to login page after logout
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col justify-between border-r bg-background p-4 shadow-lg',
        className
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <h1 className="ml-2 text-2xl font-bold text-primary">Neturai IT</h1>
        </div>
        <nav className="grid items-start gap-2">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          <Link
            to="/tickets"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Ticket className="h-5 w-5" />
            Tickets
          </Link>
          <Link
            to="/assets"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <HardDrive className="h-5 w-5" />
            Assets
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>
      </div>
      <div className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-primary"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
