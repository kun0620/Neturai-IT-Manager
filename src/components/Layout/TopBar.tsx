import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyError } from '@/lib/notify';
import {
  Bell,
  User,
  Github,
  Search,
  ChevronDown,
  SlidersHorizontal,
  Users2,
  Tags,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
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
import { AnimatePresence, motion } from 'motion/react';
import { Input } from '@/components/ui/input';



export function TopBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openDrawer } = useTicketDrawer();
  const topNav = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Tickets', href: '/tickets' },
    { label: 'Asset Management', href: '/assets' },
    { label: 'Reports', href: '/reports' },
  ];
  const settingsOptions = [
    { label: 'General', tab: 'general', icon: SlidersHorizontal },
    { label: 'Users & Roles', tab: 'users', icon: Users2 },
    { label: 'Categories', tab: 'categories', icon: Tags },
    { label: 'SLA Policies', tab: 'sla', icon: ShieldCheck },
    { label: 'System Logs', tab: 'logs', icon: ClipboardList },
  ] as const;

  const quickSearchItems = [
    { label: 'Dashboard', href: '/dashboard', keywords: 'overview home' },
    { label: 'Tickets', href: '/tickets', keywords: 'incidents tasks support' },
    { label: 'Asset Management', href: '/assets', keywords: 'inventory devices hardware' },
    { label: 'Reports', href: '/reports', keywords: 'analytics metrics export' },
    { label: 'Settings - General', href: '/settings?tab=general', keywords: 'settings general' },
    { label: 'Settings - Users & Roles', href: '/settings?tab=users', keywords: 'settings users roles permissions' },
    { label: 'Settings - Categories', href: '/settings?tab=categories', keywords: 'settings categories' },
    { label: 'Settings - SLA Policies', href: '/settings?tab=sla', keywords: 'settings sla policy' },
    { label: 'Settings - System Logs', href: '/settings?tab=logs', keywords: 'settings logs audit' },
    { label: 'My Profile', href: '/profile', keywords: 'account profile me' },
  ];

  const filteredSearchItems = quickSearchItems.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return `${item.label} ${item.keywords}`.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (!mobileMenuOpen && !searchOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen, searchOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const goTo = (href: string) => {
    navigate(href);
    setMobileMenuOpen(false);
    setMobileSettingsOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  };

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
    <header className="sticky top-0 z-30 border-b border-border bg-card shadow-sm">
      <nav className="mx-auto flex h-[68px] w-full max-w-[1920px] items-center justify-between px-4 transition-all duration-200 sm:h-[64px] sm:px-6 lg:h-[60px] lg:px-10">
      <div className="flex min-w-0 items-center gap-4 lg:gap-6">
        <Link to="/dashboard" className="shrink-0 transition-colors duration-200">
          <span className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <span className="rounded-md bg-primary/12 p-1 text-primary">
            <Github className="h-4 w-4" />
          </span>
          <span className="text-lg">Neturai</span>
          </span>
        </Link>

        <ul className="ml-4 mt-0.5 hidden items-center gap-0.5 text-sm text-muted-foreground lg:ml-8 md:flex">
          {topNav.map((item) => (
            <li key={item.label}>
            <button
              key={item.label}
              type="button"
              className="inline-flex h-10 items-center rounded-[44px] px-3 text-[15px] font-medium leading-none tracking-wide transition-colors duration-200 hover:bg-primary/15 hover:text-primary"
              onClick={() => navigate(item.href)}
            >
              {item.label}
            </button>
            </li>
          ))}

          <li className="group relative">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1 rounded-[44px] px-3 text-[15px] font-medium leading-none tracking-wide transition-colors duration-200 hover:bg-primary/15 hover:text-primary"
            >
              Settings
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-rotate-180" />
            </button>

            <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100">
              <div className="w-[560px] rounded-md border border-border/70 bg-card p-3 shadow-xl">
                <div className="grid grid-cols-[1fr_240px] gap-3">
                  <div className="space-y-1">
                    {settingsOptions.map((option) => (
                      <button
                        key={option.tab}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-primary/15 hover:text-primary"
                        onClick={() => navigate(`/settings?tab=${option.tab}`)}
                      >
                        <option.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                    <p className="text-lg font-semibold">Settings</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Manage system behavior, users, categories, SLA rules, and audit logs from one control panel.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/settings?tab=general')}
                      className="mt-5 inline-flex items-center gap-1 text-sm font-semibold"
                    >
                      Open Control Panel <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-background/60 hover:bg-muted md:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-md bg-background/60 hover:bg-muted"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            title="Search (Ctrl/Cmd + K)"
          >
            <Search className="h-5 w-5" />
          </button>
          <ModeToggle />

          {/* 🔔 Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-md bg-background/60 hover:bg-muted"
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
              className="w-80 max-h-96 overflow-y-auto border border-border/70 bg-card shadow-xl"
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
                className="flex h-9 w-9 items-center justify-center rounded-full bg-background/60 hover:bg-muted"
              >
                <User className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="z-[9999] w-48 border border-border/70 bg-card shadow-xl"
          >
            <DropdownMenuLabel className="flex items-center justify-between px-4 py-2">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/settings?tab=general">Settings</Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link to="/profile">Profile</Link>
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
        </div>
      </div>
      </nav>

      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-[70]">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              aria-label="Close search overlay"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            />
            <motion.div
              className="relative mx-auto mt-14 w-[min(94vw,760px)] rounded-xl border border-border bg-card p-3 shadow-2xl sm:mt-16 sm:w-[min(92vw,740px)] lg:mt-20"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-12 rounded-lg pl-10 text-base"
                />
              </div>

              <div className="mt-2 max-h-[50vh] overflow-auto rounded-lg border border-border bg-background p-1 sm:max-h-[45vh]">
                {filteredSearchItems.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    No results found
                  </p>
                ) : (
                  filteredSearchItems.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/15 hover:text-primary"
                      onClick={() => goTo(item.href)}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs text-muted-foreground">Open</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu overlay"
              onClick={() => setMobileMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            />
            <motion.aside
              className="fixed right-0 top-0 z-[60] isolate h-screen w-[86vw] max-w-[430px] border-l border-border p-5 text-foreground shadow-2xl"
              style={{ backgroundColor: 'hsl(var(--background))' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.7 }}
            >
            <div className="absolute inset-0 -z-10 bg-background" />
            <div className="mb-6 flex items-center justify-between">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 font-semibold tracking-tight"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="rounded-md bg-primary/12 p-1 text-primary">
                  <Github className="h-4 w-4" />
                </span>
                <span className="text-lg">Neturai</span>
              </Link>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-background/50 hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              {topNav.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center justify-between border-b border-border/70 py-3 text-left text-2xl font-medium leading-none"
                  onClick={() => goTo(item.href)}
                >
                  {item.label}
                </button>
              ))}

              <button
                type="button"
                className="flex w-full items-center justify-between border-b border-border/70 py-3 text-left text-2xl font-medium leading-none"
                onClick={() => setMobileSettingsOpen((v) => !v)}
              >
                Settings
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${mobileSettingsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {mobileSettingsOpen && (
                <div className="space-y-1 border-b border-border/70 pb-3">
                  {settingsOptions.map((option) => (
                    <button
                      key={option.tab}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-1 py-2 text-left text-base text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                      onClick={() => goTo(`/settings?tab=${option.tab}`)}
                    >
                      <option.icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
