import React from 'react';
import { Menu, UserCircle } from 'lucide-react'; // Removed LogOut import
import ThemeToggle from '../ThemeToggle';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarCollapsed }) => {
  return (
    <nav className="bg-card-light dark:bg-card-dark p-4 shadow-lg dark:shadow-2xl-dark flex items-center justify-between sticky top-0 z-30 w-full">
      {/* Mobile Sidebar Toggle & App Name for Mobile */}
      <div className="flex items-center md:hidden">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 mr-4"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="text-xl font-bold text-primary">IT Management</div>
      </div>

      {/* App Name for Desktop (hidden on mobile, conditional on sidebar state) */}
      {isSidebarCollapsed && (
        <div className="hidden md:block text-2xl font-extrabold text-primary">
          IT Management
        </div>
      )}

      {/* User Profile and Theme Toggle */}
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        {/* User Avatar and Name */}
        <div className="flex items-center space-x-2 group">
          <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300 overflow-hidden">
            {/* Using Lucide icon as a placeholder avatar */}
            <UserCircle className="h-full w-full text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-primary transition-colors duration-200" />
          </div>
          <span className="text-text-light dark:text-text-dark font-medium hidden sm:block group-hover:text-primary dark:group-hover:text-primary transition-colors duration-200">Admin</span>
        </div>
        {/* Logout Button - Removed */}
      </div>
    </nav>
  );
};

export default Navbar;
