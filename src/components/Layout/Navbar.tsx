import React from 'react';
import { Menu, UserCircle, LogOut } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed,
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const {
    role,
    loading: roleLoading,
    isAdmin,
    isIT,
    isUser,
  } = useCurrentProfile();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
    } else {
      console.error('Logout error:', error.message);
      alert('Failed to log out. Please try again.');
    }
  };

  // แสดงชื่อ / role (ยังไม่ดึงชื่อจริงจาก profiles)
  const displayName =
    isAdmin ? 'Admin'
    : isIT ? 'IT Staff'
    : 'User';

  const displayRole = role ? role.toUpperCase() : 'USER';

  return (
    <nav className="bg-card-light dark:bg-card-dark p-4 shadow-lg dark:shadow-2xl-dark flex items-center justify-between sticky top-0 z-30 w-full">
      {/* Mobile Sidebar Toggle */}
      <div className="flex items-center md:hidden">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 mr-4"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="text-xl font-bold text-primary">
          IT Management
        </div>
      </div>

      {/* Desktop App Name */}
      {isSidebarCollapsed && (
        <div className="hidden md:block text-2xl font-extrabold text-primary">
          IT Management
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        <ThemeToggle />

        {/* User Info */}
        <div className="flex items-center space-x-2">
          <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
            <UserCircle className="h-full w-full text-gray-400 dark:text-gray-500" />
          </div>

          <div className="hidden sm:flex flex-col leading-tight">
            {roleLoading ? (
              <span className="text-xs text-muted-foreground">
                Loading...
              </span>
            ) : (
              <>
                <span className="text-sm font-medium text-text-light dark:text-text-dark">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {displayRole}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Logout */}
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
