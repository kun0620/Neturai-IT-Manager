import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, HardDrive, Ticket, PlusCircle, UserPlus, Package } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import QuickActionCard from '../components/QuickActionCard'; // Import the new component
import { supabase } from '../lib/supabaseClient';
import { Tables } from '../types/supabase';

type TicketType = Tables<'tickets'>; // Renamed to avoid conflict with Lucide icon
type Profile = Tables<'profiles'>;

const Dashboard: React.FC = () => {
  const [totalTickets, setTotalTickets] = useState<number | null>(null);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [totalAssets, setTotalAssets] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<
    (TicketType & { profiles: Profile | null; statuses: Tables<'statuses'> | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Total Tickets
        const { count: ticketsCount, error: ticketsError } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true });
        if (ticketsError) throw ticketsError;
        setTotalTickets(ticketsCount);

        // Fetch Active Users (using profiles table for now)
        const { count: profilesCount, error: profilesError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        if (profilesError) throw profilesError;
        setActiveUsers(profilesCount);

        // Fetch Total Assets
        const { count: assetsCount, error: assetsError } = await supabase
          .from('assets')
          .select('*', { count: 'exact', head: true });
        if (assetsError) throw assetsError;
        setTotalAssets(assetsCount);

        // Fetch Recent Activities (latest 5 tickets)
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('tickets')
          .select('*, profiles(full_name), statuses(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        if (activitiesError) throw activitiesError;
        setRecentActivities(activitiesData as any); // Type assertion for joined data

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err.message);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-6 bg-background-light dark:bg-background-dark transition-colors duration-200 flex items-center justify-center">
        <p className="text-text-light dark:text-text-dark">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-background-light dark:bg-background-dark transition-colors duration-200 flex items-center justify-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  const getStatusColor = (statusName: string | undefined) => {
    switch (statusName) {
      case 'Open': return 'bg-red-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Closed': return 'bg-green-500';
      case 'Pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex-1 p-6 bg-background-light dark:bg-background-dark transition-colors duration-200 overflow-auto">
      <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-6">Dashboard</h1>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <DashboardCard
          title="Total Tickets"
          value={totalTickets !== null ? totalTickets.toString() : 'N/A'}
          icon={TrendingUp}
          color="text-primary"
        />
        <DashboardCard
          title="Active Users"
          value={activeUsers !== null ? activeUsers.toString() : 'N/A'}
          icon={Users}
          color="text-primary"
        />
        <DashboardCard
          title="Total Assets"
          value={totalAssets !== null ? totalAssets.toString() : 'N/A'}
          icon={HardDrive}
          color="text-primary"
        />
      </div>

      {/* Quick Actions Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-text-light dark:text-text-dark mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickActionCard
            title="Create New Ticket"
            description="Quickly log a new support ticket."
            icon={Ticket}
            to="/tickets/new"
            colorClass="bg-blue-600" // Different color
          />
          <QuickActionCard
            title="View All Users"
            description="Manage and view all system users."
            icon={UserPlus}
            to="/users"
            colorClass="bg-green-600" // Different color
          />
          <QuickActionCard
            title="Add New Asset"
            description="Register a new IT asset to the inventory."
            icon={Package}
            to="/assets/new"
            colorClass="bg-purple-600" // Different color
          />
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-lg dark:shadow-md-dark">
        <h2 className="text-2xl font-semibold text-text-light dark:text-text-dark mb-4">Recent Activities</h2>
        <ul className="space-y-4">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <li key={activity.id} className="flex items-start space-x-3 flex-1">
                <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${getStatusColor(activity.statuses?.name)}`}></div>
                <div className="flex-1">
                  <p className="text-text-light dark:text-text-dark">
                    <span className="font-medium">{activity.profiles?.full_name || 'Unknown User'}</span>{' '}
                    {activity.title} -{' '}
                    <span className="font-medium text-primary">#{activity.id?.substring(0, 8)}</span>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(activity.created_at || '').toLocaleString()}
                  </p>
                </div>
              </li>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No recent activities.</p>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
