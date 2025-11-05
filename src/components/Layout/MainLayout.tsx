import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CircleUser,
  Home,
  LineChart,
  Menu,
  Package2,
  Search,
  Ticket,
  HardDrive,
  UserCog,
  Settings,
  LogOut,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ModeToggle } from '../mode-toggle';
import { NotificationDrawer } from '../dashboard/NotificationDrawer';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '../ui/loading-spinner'; // Assuming you have a LoadingSpinner
import { toast } from 'sonner';

interface MainLayoutProps {
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  // You can pass specific components for these states if needed
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}

// Placeholder components for loading, empty, and error states
const DefaultLoadingState = () => <LoadingSpinner />;
const DefaultEmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
    <p className="text-lg">No data to display.</p>
    <p className="text-sm">Try adjusting your filters or adding new items.</p>
  </div>
);
const DefaultErrorState = () => (
  <div className="flex flex-col items-center justify-center h-full text-destructive">
    <p className="text-lg">An error occurred.</p>
    <p className="text-sm">Please try again later or contact support.</p>
  </div>
);

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  isLoading = false,
  isEmpty = false,
  isError = false,
  loadingComponent,
  emptyComponent,
  errorComponent,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      name: 'Dashboard',
      icon: Home,
      path: '/',
    },
    {
      name: 'Tickets',
      icon: Ticket,
      path: '/tickets',
    },
    {
      name: 'Asset Management',
      icon: HardDrive,
      path: '/assets',
    },
    {
      name: 'User Management',
      icon: UserCog,
      path: '/users',
    },
    {
      name: 'Reports',
      icon: LineChart,
      path: '/reports',
    },
    {
      name: 'Settings & Logs',
      icon: Settings,
      path: '/settings',
    },
  ];

  const sidebarVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.1 } },
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Logout Failed', {
        description: error.message,
      });
    } else {
      toast.success('Logged Out', {
        description: 'You have been successfully logged out.',
      });
      navigate('/login'); // Redirect to login page after logout
    }
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <motion.div
        className="hidden border-r bg-muted/40 md:block"
        initial="hidden"
        animate="visible"
        variants={sidebarVariants}
      >
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              <span className="">Neturai IT</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                    location.pathname === item.path ? 'bg-muted text-primary' : ''
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            {/* Placeholder for future sidebar content like upgrade card */}
          </div>
        </div>
      </motion.div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  to="#"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Package2 className="h-6 w-6" />
                  <span className="sr-only">Neturai IT</span>
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground ${
                      location.pathname === item.path ? 'bg-muted text-foreground' : ''
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              {/* Placeholder for future mobile sidebar content */}
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                />
              </div>
            </form>
          </div>
          <NotificationDrawer>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                3
              </span>
              <span className="sr-only">Notifications</span>
            </Button>
          </NotificationDrawer>
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <motion.main
          className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6"
          initial="hidden"
          animate="visible"
          variants={contentVariants}
        >
          {isLoading ? (
            loadingComponent || <DefaultLoadingState />
          ) : isError ? (
            errorComponent || <DefaultErrorState />
          ) : isEmpty ? (
            emptyComponent || <DefaultEmptyState />
          ) : (
            children
          )}
        </motion.main>
      </div>
    </div>
  );
};
