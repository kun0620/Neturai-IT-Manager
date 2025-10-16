import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark">
      {/* Sidebar component */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        ></div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300 ease-in-out">
        <Navbar onToggleSidebar={toggleSidebar} isSidebarCollapsed={!isSidebarOpen} />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
