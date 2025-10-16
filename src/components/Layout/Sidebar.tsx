import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Ticket, HardDrive, Users, LogOut, X } from 'lucide-react';

interface SidebarLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center p-3 rounded-lg transition-all duration-200 group
        ${isActive
          ? 'bg-primary text-white shadow-md'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
    >
      <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-primary'}`} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-card-light dark:bg-card-dark p-6 flex flex-col shadow-xl dark:shadow-2xl-dark rounded-r-2xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >
      <div className="flex items-center justify-between mb-10">
        <Link to="/" className="flex items-center space-x-2 text-2xl font-extrabold text-primary hover:text-primary-dark transition-colors duration-200" onClick={onClose}>
          <HardDrive className="h-7 w-7" />
          <span>Neturai</span>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          aria-label="Close sidebar"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <nav className="flex-grow space-y-2">
        <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" onClick={onClose} />
        <SidebarLink to="/tickets" icon={Ticket} label="Tickets" onClick={onClose} />
        <SidebarLink to="/assets" icon={HardDrive} label="Assets" onClick={onClose} />
        <SidebarLink to="/users" icon={Users} label="Users" onClick={onClose} />
      </nav>
      <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          className="flex items-center w-full p-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-700 hover:text-red-600 dark:hover:text-white transition-colors duration-200 group"
          onClick={() => { /* Handle logout logic here */ onClose(); }}
        >
          <LogOut className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-white" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
