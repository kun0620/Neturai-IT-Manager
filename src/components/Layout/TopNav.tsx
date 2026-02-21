import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTicketDrawer } from '@/context/TicketDrawerContext';

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Tickets', href: '/tickets' },
  { label: 'Assets', href: '/assets' },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' },
];

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openDrawer } = useTicketDrawer();
  const [searchQuery, setSearchQuery] = useState('');

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const handleNewTicket = () => {
    openDrawer('new');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tickets?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-8 flex items-center justify-between">
      {/* Logo Section */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="bg-[#2b6cee] rounded-lg p-1.5 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="hidden lg:block">
          <h1 className="text-lg font-bold leading-none tracking-tight">Neturai IT</h1>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex items-center gap-1 shrink-0 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-[#2b6cee]/10 text-[#2b6cee]'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Search Bar (Centered) */}
      <form onSubmit={handleSearch} className="flex-1 flex justify-center px-4">
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-[#2b6cee]/20 placeholder:text-slate-500"
          />
        </div>
      </form>

      {/* Right Section */}
      <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800 shrink-0">
        {/* Search for mobile */}
        <button className="md:hidden p-2 text-slate-500">
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>

        {/* New Ticket Button */}
        <button
          onClick={handleNewTicket}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#2b6cee] hover:bg-[#2b6cee]/90 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Ticket
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold">{user?.email?.split('@')[0] || 'User'}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">IT Staff</p>
          </div>
          <button className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>
    </header>
  );
}
