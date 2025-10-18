import React from 'react';
import { Menu, UserCircle, LogOut } from 'lucide-react'; // Added LogOut import back for the new logout button
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../../lib/AuthContext'; // Import useAuth
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
    } else {
      console.error('Logout error:', error.message);
      alert('Failed to log out. Please try again.');
    }
  };

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
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="h-6 w-6" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
