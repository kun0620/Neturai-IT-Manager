import { NavLink } from 'react-router-dom';
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

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
    isActive
      ? 'bg-primary text-primary-foreground font-medium'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  );

export function Sidebar({ className }: SidebarProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col justify-between border-r border-border bg-card text-card-foreground p-4',
        className
      )}
    >
      <div className="space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          <h1 className="ml-2 text-2xl font-bold text-primary">
            Neturai IT
          </h1>
        </div>

        {/* Navigation */}
        <nav className="grid gap-1">
          <NavLink to="/" end className={navItemClass}>
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </NavLink>

          <NavLink to="/tickets" className={navItemClass}>
            <Ticket className="h-5 w-5" />
            Tickets
          </NavLink>

          <NavLink to="/assets" className={navItemClass}>
            <HardDrive className="h-5 w-5" />
            Asset Management
          </NavLink>

          <NavLink to="/settings" className={navItemClass}>
            <Settings className="h-5 w-5" />
            Settings & Logs
          </NavLink>
        </nav>
      </div>

      {/* Logout */}
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={handleLogout}
      >
        <LogOut className="mr-3 h-5 w-5" />
        Logout
      </Button>
    </aside>
  );
}
