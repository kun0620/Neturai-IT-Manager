import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyError } from '@/lib/notify';
import {
  Bell,
  User,
  Github,
  Search,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
  Users2,
  Tags,
  ShieldCheck,
  ClipboardList,
  Sun,
  Moon,
  Settings,
  LogOut,
  UserCircle2,
  LayoutDashboard,
  Ticket,
  HardDrive,
  BarChart3,
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
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useTicketDrawer } from '@/context/TicketDrawerContext';
import { AnimatePresence, motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';



const RECENT_SEARCH_STORAGE_KEY = 'neturai_recent_searches';
const SEARCH_SCOPE_STORAGE_KEY = 'neturai_search_scope';

export function TopBar() {
  type SearchScope = 'all' | 'tickets' | 'assets' | 'users';
  type NotificationFilter = 'all' | 'unread';
  type RecentSearchRecord = SearchOverlayItem & { label: string; scope: SearchScope };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [recentSearches, setRecentSearches] = useState<RecentSearchRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const searchListRef = useRef<HTMLDivElement | null>(null);
  const [ticketResults, setTicketResults] = useState<
    Array<{ id: string; title: string; status: string | null; priority: string | null }>
  >([]);
  const [assetResults, setAssetResults] = useState<
    Array<{ id: string; name: string; asset_code: string | null; status: string | null }>
  >([]);
  const [userResults, setUserResults] = useState<
    Array<{ id: string; name: string | null; email: string | null; department: string | null }>
  >([]);
  const { user } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { openDrawer } = useTicketDrawer();
  const topNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Tickets', href: '/tickets', icon: Ticket },
    { label: 'Assets', href: '/assets', icon: HardDrive },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Notifications', href: '/notifications', icon: Bell },
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
    { label: 'Notifications', href: '/notifications', keywords: 'alerts inbox updates' },
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

  type SearchOverlayItem =
    | { kind: 'quick'; key: string; href: string }
    | { kind: 'ticket'; key: string; id: string }
    | { kind: 'asset'; key: string; id: string }
    | { kind: 'user'; key: string; id: string };

  const recentKeyboardItems = useMemo(
    () =>
      recentSearches.map((record, idx) => ({
        ...record,
        key: `recent-${record.key}-${idx}`,
      })),
    [recentSearches]
  );

  const keyboardItems = useMemo<SearchOverlayItem[]>(() => {
    const query = searchQuery.trim();
    const showTickets = searchScope === 'all' || searchScope === 'tickets';
    const showAssets = searchScope === 'all' || searchScope === 'assets';
    const showUsers = searchScope === 'all' || searchScope === 'users';

    if (query.length < 2) {
      return [
        ...filteredSearchItems.map((item) => ({
          kind: 'quick' as const,
          key: `quick-${item.href}`,
          href: item.href,
        })),
        ...recentKeyboardItems,
      ];
    }

    if (isSearching) return [];

    return [
      ...(showTickets
        ? ticketResults.map((ticket) => ({
            kind: 'ticket' as const,
            key: `ticket-${ticket.id}`,
            id: ticket.id,
          }))
        : []),
      ...(showAssets
        ? assetResults.map((asset) => ({
            kind: 'asset' as const,
            key: `asset-${asset.id}`,
            id: asset.id,
          }))
        : []),
      ...(showUsers
        ? userResults.map((profile) => ({
            kind: 'user' as const,
            key: `user-${profile.id}`,
            id: profile.id,
          }))
        : []),
    ];
  }, [
    searchQuery,
    searchScope,
    filteredSearchItems,
    recentKeyboardItems,
    isSearching,
    ticketResults,
    assetResults,
    userResults,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecentSearchRecord[];
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawScope = window.localStorage.getItem(SEARCH_SCOPE_STORAGE_KEY);
      if (rawScope === 'all' || rawScope === 'tickets' || rawScope === 'assets' || rawScope === 'users') {
        setSearchScope(rawScope);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(recentSearches));
    } catch {
      // ignore
    }
  }, [recentSearches]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SEARCH_SCOPE_STORAGE_KEY, searchScope);
    } catch {
      // ignore
    }
  }, [searchScope]);

  const pushRecentSearch = useCallback((record: RecentSearchRecord) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.key !== record.key);
      return [record, ...filtered].slice(0, 6);
    });
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const query = searchQuery.trim();
    const shouldSearchTickets = searchScope === 'all' || searchScope === 'tickets';
    const shouldSearchAssets = searchScope === 'all' || searchScope === 'assets';
    const shouldSearchUsers = searchScope === 'all' || searchScope === 'users';

    if (query.length < 2) {
      setTicketResults([]);
      setAssetResults([]);
      setUserResults([]);
      setIsSearching(false);
      return;
    }

    const cleaned = query.replace(/[,%()]/g, ' ').trim();
    const like = `%${cleaned}%`;
    let isCancelled = false;

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const [ticketsRes, assetsRes, usersRes] = await Promise.all([
          shouldSearchTickets
            ? supabase
                .from('tickets')
                .select('id, title, status, priority, description, subject')
                .or(`title.ilike.${like},description.ilike.${like},subject.ilike.${like}`)
                .limit(6)
            : Promise.resolve({ data: [] }),
          shouldSearchAssets
            ? supabase
                .from('assets')
                .select('id, name, asset_code, status, location')
                .or(`name.ilike.${like},asset_code.ilike.${like},location.ilike.${like},status.ilike.${like}`)
                .limit(6)
            : Promise.resolve({ data: [] }),
          shouldSearchUsers
            ? supabase
                .from('profiles')
                .select('id, name, email, department')
                .or(`name.ilike.${like},email.ilike.${like},department.ilike.${like}`)
                .limit(6)
            : Promise.resolve({ data: [] }),
        ]);

        if (isCancelled) return;

        setTicketResults(
          (ticketsRes.data ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
          }))
        );
        setAssetResults(
          (assetsRes.data ?? []).map((a) => ({
            id: a.id,
            name: a.name,
            asset_code: a.asset_code,
            status: a.status,
          }))
        );
        setUserResults(
          (usersRes.data ?? []).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            department: u.department,
          }))
        );
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 240);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [searchOpen, searchQuery, searchScope]);

  useEffect(() => {
    if (!mobileMenuOpen && !searchOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen, searchOpen]);

  const prefetchRoute = useCallback((href: string) => {
    if (href.startsWith('/tickets')) {
      void import('@/pages/Tickets');
      return;
    }
    if (href.startsWith('/assets')) {
      void import('@/pages/AssetManagement');
      return;
    }
    if (href.startsWith('/dashboard')) {
      void import('@/pages/Dashboard');
      return;
    }
    if (href.startsWith('/reports')) {
      void import('@/pages/Reports');
      return;
    }
    if (href.startsWith('/notifications')) {
      void import('@/pages/Notifications');
      return;
    }
    if (href.startsWith('/settings')) {
      void import('@/pages/SettingsAndLogs');
      return;
    }
    if (href.startsWith('/profile')) {
      void import('@/pages/Profile');
      return;
    }
    if (href.startsWith('/users')) {
      void import('@/pages/Users');
    }
  }, []);

  const prefetchSearchItem = useCallback((item: SearchOverlayItem) => {
    if (item.kind === 'quick') {
      prefetchRoute(item.href);
      return;
    }
    if (item.kind === 'ticket') {
      prefetchRoute('/tickets');
      return;
    }
    if (item.kind === 'asset') {
      prefetchRoute('/assets');
      return;
    }
    prefetchRoute('/users');
  }, [prefetchRoute]);

  const goTo = useCallback((href: string) => {
    navigate(href);
    setMobileMenuOpen(false);
    setMobileSettingsOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  }, [navigate]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setActiveSearchIndex(-1);
  }, []);

  const selectSearchItem = useCallback((item: SearchOverlayItem) => {
    if (item.kind === 'quick') {
      goTo(item.href);
      return;
    }
    if (item.kind === 'ticket') {
      goTo('/tickets');
      requestAnimationFrame(() => openDrawer(item.id));
      return;
    }
    if (item.kind === 'asset') {
      goTo(`/assets?assetId=${item.id}`);
      return;
    }
    goTo(`/users?editUserId=${item.id}`);
  }, [goTo, openDrawer]);

  const applySearchSelection = useCallback(
    (item: SearchOverlayItem, label: string, scope: SearchScope = searchScope) => {
      pushRecentSearch({ ...item, label, scope });
      if (scope !== searchScope) {
        setSearchScope(scope);
      }
      selectSearchItem(item);
    },
    [pushRecentSearch, searchScope, selectSearchItem]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const removeRecentSearch = useCallback((key: string) => {
    setRecentSearches((prev) => prev.filter((item) => item.key !== key));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (!searchOpen) return;

      if (event.key === 'Escape') {
        closeSearch();
        return;
      }
      if (keyboardItems.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSearchIndex((prev) => {
          if (prev < 0) return 0;
          return (prev + 1) % keyboardItems.length;
        });
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSearchIndex((prev) => {
          if (prev < 0) return keyboardItems.length - 1;
          return (prev - 1 + keyboardItems.length) % keyboardItems.length;
        });
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        setActiveSearchIndex((prev) => {
          if (event.shiftKey) {
            if (prev < 0) return keyboardItems.length - 1;
            return (prev - 1 + keyboardItems.length) % keyboardItems.length;
          }
          if (prev < 0) return 0;
          return (prev + 1) % keyboardItems.length;
        });
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (activeSearchIndex >= 0 && activeSearchIndex < keyboardItems.length) {
          const activeItem = keyboardItems[activeSearchIndex];
          const recentItem = recentKeyboardItems.find((item) => item.key === activeItem.key);
          if (recentItem) {
            applySearchSelection(recentItem, recentItem.label, recentItem.scope);
            return;
          }
          selectSearchItem(activeItem);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, keyboardItems, activeSearchIndex, closeSearch, selectSearchItem, recentKeyboardItems, applySearchSelection]);

  useEffect(() => {
    if (!searchOpen) return;
    setActiveSearchIndex(keyboardItems.length > 0 ? 0 : -1);
  }, [searchOpen, searchQuery, searchScope, keyboardItems.length]);

  useEffect(() => {
    if (!searchOpen || activeSearchIndex < 0) return;
    const activeItem = searchListRef.current?.querySelector<HTMLElement>('[data-search-active="true"]');
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [searchOpen, activeSearchIndex, keyboardItems.length, isSearching, searchQuery]);

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
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications(user?.id);
  const visibleNotifications = useMemo(
    () =>
      notificationFilter === 'unread'
        ? notifications.filter((notification) => !notification.is_read)
        : notifications,
    [notificationFilter, notifications]
  );
  const unreadBadgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const handleNotificationOpen = useCallback(
    async (notification: (typeof notifications)[number]) => {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      if (notification.ticket_id) {
        prefetchRoute('/tickets');
        navigate(`/tickets?open_ticket=${encodeURIComponent(notification.ticket_id)}`);
      }
    },
    [markAsRead, navigate, prefetchRoute]
  );

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

  const scopeOptions: Array<{ value: SearchScope; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'tickets', label: 'Tickets' },
    { value: 'assets', label: 'Assets' },
    { value: 'users', label: 'Users' },
  ];
  const visibleTicketCount = searchScope === 'all' || searchScope === 'tickets' ? ticketResults.length : 0;
  const visibleAssetCount = searchScope === 'all' || searchScope === 'assets' ? assetResults.length : 0;
  const visibleUserCount = searchScope === 'all' || searchScope === 'users' ? userResults.length : 0;
  const isRouteActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }

    return location.pathname.startsWith(href);
  };
  const isDarkMode = theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark');
  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-primary/10 bg-white dark:bg-slate-900 md:flex">
        <div className="flex h-full flex-col p-6">
          <div className="mb-8 flex items-center gap-2">
            <span className="rounded-lg bg-primary p-1.5 text-white">
              <Github className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-tight text-primary">Neturai IT</p>
              <p className="text-[10px] font-medium text-muted-foreground">Enterprise Admin</p>
            </div>
          </div>
          <nav className="space-y-1">
            {topNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                    isRouteActive(item.href)
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-slate-600 hover:bg-primary/10 hover:text-primary dark:text-slate-400'
                  )}
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
                  onClick={() => goTo(item.href)}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-8 space-y-1 border-t border-primary/10 pt-8">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary dark:text-slate-400"
              onMouseEnter={() => prefetchRoute('/settings?tab=general')}
              onFocus={() => prefetchRoute('/settings?tab=general')}
              onClick={() => goTo('/settings?tab=general')}
            >
              <Settings className="h-4.5 w-4.5" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary dark:text-slate-400"
              onMouseEnter={() => prefetchRoute('/profile')}
              onFocus={() => prefetchRoute('/profile')}
              onClick={() => goTo('/profile')}
            >
              <UserCircle2 className="h-4.5 w-4.5" />
              <span>Profile</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4.5 w-4.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-primary/10 bg-background/80 backdrop-blur-md md:left-64">
        <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center md:max-w-xl">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-background/60 hover:bg-muted md:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="relative hidden h-10 w-full items-center rounded-xl border border-primary/20 bg-white px-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 dark:bg-slate-800 md:flex"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
              title="Search (Ctrl/Cmd + K)"
            >
              <Search className="h-4 w-4 text-slate-400" />
              <span className="ml-2">Search resources or tickets...</span>
              <kbd className="ml-auto hidden rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-400 sm:inline-block">
                Ctrl K
              </kbd>
            </button>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-md bg-background/60 hover:bg-muted md:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
              title="Search (Ctrl/Cmd + K)"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/10 dark:text-slate-400"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadBadgeLabel}
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
                <div className="px-4 pb-2">
                  <div className="grid w-full grid-cols-2 rounded-md border border-border/70 bg-muted/30 p-1">
                    <button
                      type="button"
                      className={clsx(
                        'h-7 rounded-[6px] px-2 text-xs font-medium leading-none whitespace-nowrap transition-colors',
                        notificationFilter === 'all'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-background/70'
                      )}
                      onClick={() => setNotificationFilter('all')}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      type="button"
                      className={clsx(
                        'h-7 rounded-[6px] px-2 text-xs font-medium leading-none whitespace-nowrap transition-colors',
                        notificationFilter === 'unread'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-background/70'
                      )}
                      onClick={() => setNotificationFilter('unread')}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-border" />

                {notificationsLoading && (
                  <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading notifications...
                  </div>
                )}
                {!notificationsLoading && visibleNotifications.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {notificationFilter === 'unread'
                      ? 'No unread notifications'
                      : 'No notifications'}
                  </div>
                )}
                {!notificationsLoading && visibleNotifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => {
                      void handleNotificationOpen(n);
                    }}
                    className={clsx(
                      'flex cursor-pointer flex-col items-start gap-1 px-4 py-2',
                      !n.is_read && 'border-l-2 border-primary bg-muted/50 font-medium'
                    )}
                  >
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

                    <span className="text-xs text-muted-foreground">
                      {n.created_at
                        ? format(new Date(n.created_at), 'dd MMM yyyy HH:mm')
                        : ''}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => goTo('/notifications')}
                  onMouseEnter={() => prefetchRoute('/notifications')}
                  className="justify-center text-sm font-medium"
                >
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/10 dark:text-slate-400"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="hidden h-6 w-px bg-primary/20 sm:block"></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group flex items-center gap-2 rounded-lg pl-1 pr-2 transition-colors hover:bg-primary/10"
                >
                  <div className="hidden text-right sm:block">
                    <p className="max-w-[120px] truncate text-xs font-semibold leading-none">
                      {user?.email?.split('@')[0] ?? 'User'}
                    </p>
                    <p className="mt-1 max-w-[120px] truncate text-[10px] text-muted-foreground">
                      {user?.email ?? 'No email'}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/60 ring-2 ring-primary/20">
                    <User className="h-5 w-5" />
                  </span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="z-[9999] w-48 border border-border/70 bg-card shadow-xl"
              >
                <DropdownMenuLabel className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {user?.email?.split('@')[0] ?? 'User'}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {user?.email ?? 'No email'}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
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
      </header>

      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-[70]">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              aria-label="Close search overlay"
              onClick={() => {
                closeSearch();
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
              <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1">Tab</kbd>
                  <span>/</span>
                  <kbd className="rounded border border-border/80 bg-muted px-1">↑↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1">Enter</kbd>
                  <span>Open</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1">Esc</kbd>
                  <span>Close</span>
                </span>
              </div>

              {searchQuery.trim().length >= 2 && (
                <div className="mt-2 flex flex-wrap items-center gap-1 px-1">
                  {scopeOptions.map((scope) => (
                    <button
                      key={scope.value}
                      type="button"
                      onClick={() => setSearchScope(scope.value)}
                      className={clsx(
                        'inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors',
                        searchScope === scope.value
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-primary/10 hover:text-primary'
                      )}
                    >
                      {scope.label}
                    </button>
                  ))}
                </div>
              )}

              <div
                ref={searchListRef}
                className="mt-2 max-h-[50vh] overflow-auto rounded-lg border border-border bg-background p-1 sm:max-h-[45vh]"
              >
                {searchQuery.trim().length < 2 ? (
                  <>
                    <p className="px-3 pt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Quick Links
                    </p>
                    {filteredSearchItems.map((item) => (
                      (() => {
                        const idx = keyboardItems.findIndex(
                          (entry) => entry.kind === 'quick' && entry.href === item.href
                        );
                        const entry = idx >= 0 ? keyboardItems[idx] : undefined;
                        const isActive = idx === activeSearchIndex;
                        return (
                          <button
                            key={item.href}
                            type="button"
                            data-search-active={isActive ? 'true' : undefined}
                            className={clsx(
                              'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/15 hover:text-primary',
                              isActive && 'bg-primary/15 text-primary'
                            )}
                            onMouseEnter={() => {
                              setActiveSearchIndex(idx);
                              if (entry) prefetchSearchItem(entry);
                            }}
                            onFocus={() => {
                              if (entry) prefetchSearchItem(entry);
                            }}
                            onClick={() => {
                              if (entry) {
                                applySearchSelection(entry, item.label);
                              } else {
                                goTo(item.href);
                              }
                            }}
                          >
                            <span>{item.label}</span>
                            <span className="text-xs text-muted-foreground">Open</span>
                          </button>
                        );
                      })()
                    ))}
                    {recentSearches.length > 0 && (
                      <div className="mt-3 border-t border-border/50 pt-2">
                        <div className="flex items-center justify-between px-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          <span>Recent Searches</span>
                          <button
                            type="button"
                            className="text-xs font-semibold text-muted-foreground hover:text-primary"
                            onClick={clearRecentSearches}
                          >
                            Clear
                          </button>
                        </div>
                        <div className="mt-1 space-y-1">
                          {recentSearches.map((record, recentIdx) => (
                            (() => {
                              const keyboardKey = recentKeyboardItems[recentIdx]?.key ?? `recent-${record.key}-${recentIdx}`;
                              const idx = keyboardItems.findIndex((entry) => entry.key === keyboardKey);
                              const isActive = idx === activeSearchIndex;
                              return (
                                <button
                                  key={`recent-${record.key}`}
                                  type="button"
                                  data-search-active={isActive ? 'true' : undefined}
                                  className={clsx(
                                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/15 hover:text-primary',
                                    isActive && 'bg-primary/15 text-primary'
                                  )}
                                  onMouseEnter={() => {
                                    setActiveSearchIndex(idx);
                                    prefetchSearchItem(record);
                                  }}
                                  onFocus={() => prefetchSearchItem(record)}
                                  onClick={() => applySearchSelection(record, record.label, record.scope)}
                                >
                                  <span className="truncate pr-3">{record.label}</span>
                                  <span className="ml-2 flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {record.scope === 'all'
                                        ? 'All'
                                        : record.scope.charAt(0).toUpperCase() + record.scope.slice(1)}
                                    </span>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      aria-label={`Remove ${record.label} from recent`}
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        removeRecentSearch(record.key);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key !== 'Enter' && event.key !== ' ') return;
                                        event.preventDefault();
                                        event.stopPropagation();
                                        removeRecentSearch(record.key);
                                      }}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </span>
                                  </span>
                                </button>
                              );
                            })()
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : isSearching ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                ) : (
                  <>
                    {(searchScope === 'all' || searchScope === 'tickets') && ticketResults.length > 0 && (
                      <div className="mb-1">
                        <p className="px-3 pt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Tickets
                        </p>
                        {ticketResults.map((ticket) => (
                          (() => {
                            const idx = keyboardItems.findIndex(
                              (entry) => entry.kind === 'ticket' && entry.id === ticket.id
                            );
                            const entry = idx >= 0 ? keyboardItems[idx] : undefined;
                            const isActive = idx === activeSearchIndex;
                            return (
                              <button
                                key={ticket.id}
                                type="button"
                                data-search-active={isActive ? 'true' : undefined}
                                className={clsx(
                                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/15 hover:text-primary',
                                  isActive && 'bg-primary/15 text-primary'
                                )}
                                onMouseEnter={() => {
                                  setActiveSearchIndex(idx);
                                  if (entry) prefetchSearchItem(entry);
                                }}
                                onFocus={() => {
                                  if (entry) prefetchSearchItem(entry);
                                }}
                                onClick={() => {
                                  if (entry) {
                                    applySearchSelection(entry, ticket.title);
                                  } else {
                                    goTo('/tickets');
                                    requestAnimationFrame(() => openDrawer(ticket.id));
                                  }
                                }}
                              >
                                <span className="truncate pr-3">{ticket.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {(ticket.status ?? '—').replace('_', ' ')}
                                </span>
                              </button>
                            );
                          })()
                        ))}
                      </div>
                    )}

                    {(searchScope === 'all' || searchScope === 'assets') && assetResults.length > 0 && (
                      <div className="mb-1">
                        <p className="px-3 pt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Assets
                        </p>
                        {assetResults.map((asset) => (
                          (() => {
                            const idx = keyboardItems.findIndex(
                              (entry) => entry.kind === 'asset' && entry.id === asset.id
                            );
                            const entry = idx >= 0 ? keyboardItems[idx] : undefined;
                            const isActive = idx === activeSearchIndex;
                            return (
                              <button
                                key={asset.id}
                                type="button"
                                data-search-active={isActive ? 'true' : undefined}
                                className={clsx(
                                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/15 hover:text-primary',
                                  isActive && 'bg-primary/15 text-primary'
                                )}
                                onMouseEnter={() => {
                                  setActiveSearchIndex(idx);
                                  if (entry) prefetchSearchItem(entry);
                                }}
                                onFocus={() => {
                                  if (entry) prefetchSearchItem(entry);
                                }}
                                onClick={() => {
                                  if (entry) {
                                    applySearchSelection(
                                      entry,
                                      `${asset.name}${asset.asset_code ? ` (${asset.asset_code})` : ''}`
                                    );
                                  } else {
                                    goTo(`/assets?assetId=${asset.id}`);
                                  }
                                }}
                              >
                                <span className="truncate pr-3">
                                  {asset.name}
                                  {asset.asset_code ? ` (${asset.asset_code})` : ''}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {asset.status ?? '—'}
                                </span>
                              </button>
                            );
                          })()
                        ))}
                      </div>
                    )}

                    {(searchScope === 'all' || searchScope === 'users') && userResults.length > 0 && (
                      <div className="mb-1">
                        <p className="px-3 pt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Users
                        </p>
                        {userResults.map((profile) => (
                          (() => {
                            const idx = keyboardItems.findIndex(
                              (entry) => entry.kind === 'user' && entry.id === profile.id
                            );
                            const entry = idx >= 0 ? keyboardItems[idx] : undefined;
                            const isActive = idx === activeSearchIndex;
                            const label = profile.name || profile.email || 'Unknown User';
                            return (
                              <button
                                key={profile.id}
                                type="button"
                                data-search-active={isActive ? 'true' : undefined}
                                className={clsx(
                                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/15 hover:text-primary',
                                  isActive && 'bg-primary/15 text-primary'
                                )}
                                onMouseEnter={() => {
                                  setActiveSearchIndex(idx);
                                  if (entry) prefetchSearchItem(entry);
                                }}
                                onFocus={() => {
                                  if (entry) prefetchSearchItem(entry);
                                }}
                                onClick={() => {
                                  if (entry) {
                                    applySearchSelection(entry, label);
                                  } else {
                                    goTo(`/users?editUserId=${profile.id}`);
                                  }
                                }}
                              >
                                <span className="truncate pr-3">{label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {profile.department || 'No Dept'}
                                </span>
                              </button>
                            );
                          })()
                        ))}
                      </div>
                    )}

                    {visibleTicketCount + visibleAssetCount + visibleUserCount === 0 && (
                        <p className="px-3 py-4 text-sm text-muted-foreground">
                          No results found
                        </p>
                      )}
                  </>
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
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
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
                      onMouseEnter={() => prefetchRoute(`/settings?tab=${option.tab}`)}
                      onFocus={() => prefetchRoute(`/settings?tab=${option.tab}`)}
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
    </>
  );
}
