import React from 'react';
import { Users, Ticket, HardDrive, TrendingUp } from 'lucide-react';
import DashboardCard from '../components/DashboardCard'; // Import the new DashboardCard component

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard title="Total Users" value="1,234" icon={Users} color="text-blue-500 bg-blue-500" />
        <DashboardCard title="Open Tickets" value="78" icon={Ticket} color="text-yellow-500 bg-yellow-500" />
        <DashboardCard title="Active Assets" value="456" icon={HardDrive} color="text-green-500 bg-green-500" />
        <DashboardCard title="System Uptime" value="99.9%" icon={TrendingUp} color="text-purple-500 bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placeholder for recent activities */}
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-subtle dark:shadow-md-dark">
          <h2 className="text-xl font-semibold mb-4 text-text-light dark:text-text-dark">Recent Activities</h2>
          <ul className="space-y-3">
            <li className="flex items-start justify-between text-gray-700 dark:text-gray-300">
              <div className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                <span className="flex-grow">User <b>Alice</b> created a new ticket <i>"Printer not working"</i>.</span>
              </div>
              <span className="ml-4 text-sm text-gray-500 flex-shrink-0">2 hours ago</span>
            </li>
            <li className="flex items-start justify-between text-gray-700 dark:text-gray-300">
              <div className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                <span className="flex-grow">Asset <b>Laptop-001</b> updated by <b>Bob</b>.</span>
              </div>
              <span className="ml-4 text-sm text-gray-500 flex-shrink-0">5 hours ago</span>
            </li>
            <li className="flex items-start justify-between text-gray-700 dark:text-gray-300">
              <div className="flex items-start">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                <span className="flex-grow">Ticket <b>#1234</b> assigned to <b>Charlie</b>.</span>
              </div>
              <span className="ml-4 text-sm text-gray-500 flex-shrink-0">1 day ago</span>
            </li>
            <li className="flex items-start justify-between text-gray-700 dark:text-gray-300">
              <div className="flex items-start">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                <span className="flex-grow">Server <b>SRV-WEB-01</b> reported high CPU usage.</span>
              </div>
              <span className="ml-4 text-sm text-gray-500 flex-shrink-0">2 days ago</span>
            </li>
          </ul>
        </div>

        {/* Placeholder for quick actions */}
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-subtle dark:shadow-md-dark">
          <h2 className="text-xl font-semibold mb-4 text-text-light dark:text-text-dark">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-primary text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-md">
              Create New Ticket
            </button>
            <button className="bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors duration-200 shadow-md">
              Add New Asset
            </button>
            <button className="bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md">
              Manage Users
            </button>
            <button className="bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow-md">
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
