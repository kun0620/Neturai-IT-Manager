import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  HardHat,
  Users,
  BarChart2,
  Settings,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/common/EmptyState';
import { TopBar } from '@/components/Layout/TopBar';
import { TicketDrawerProvider } from '@/context/TicketDrawerContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tickets', href: '/tickets', icon: Ticket },
  { name: 'Asset Management', href: '/assets', icon: HardHat },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart2 },
  { name: 'Settings & Logs', href: '/settings', icon: Settings },
];

export const MainLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  if (!user) {
    return (
      <>
        <EmptyState
          title="Authentication Required"
          message="Please log in to access the application."
        />
        <div className="mt-4">
          <Link to="/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <TicketDrawerProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        {/* ================= Sidebar (Desktop) ================= */}
        <aside className="hidden border-r bg-background md:block">
          <div className="flex h-full max-h-screen flex-col">
            {/* Sidebar Header (สูง = TopBar) */}
            <div className="flex h-14 items-center border-b px-4 lg:h-14 lg:px-6">
              <Link to="/" className="flex items-center gap-2 font-semibold">
                <HardHat className="h-6 w-6" />
                <span>Neturai IT Manager</span>
              </Link>
            </div>

            <ScrollArea className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                {navItems.map((item) => {
                  const active = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                        active
                          ? 'bg-muted text-primary'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </ScrollArea>
          </div>
        </aside>

        {/* ================= Main Area ================= */}
        <div className="flex flex-col">
          {/* ===== Top Bar (HEADER เดียว) ===== */}
          <TopBar
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          />

          {/* ===== Mobile Sidebar (Sheet) ===== */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetContent side="left" className="flex flex-col md:hidden">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  to="/"
                  className="mb-4 flex items-center gap-2 text-lg font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <HardHat className="h-6 w-6" />
                  <span>Neturai IT Manager</span>
                </Link>

                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-4 rounded-xl px-3 py-2 ${
                      location.pathname.startsWith(item.href)
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* ===== Page Content ===== */}
          <main className="flex-1 bg-background text-foreground p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TicketDrawerProvider>
  );
};

