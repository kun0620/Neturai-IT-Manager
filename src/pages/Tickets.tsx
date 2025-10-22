import React, { useState, useEffect, useCallback } from 'react';
import { Search, PlusCircle, Filter, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Tables } from '../types/supabase';
import LoadingSpinner from '../components/LoadingSpinner'; // Import LoadingSpinner
import NewTicketModal from '../components/NewTicketModal'; // Import NewTicketModal
import EditTicketModal from '../components/EditTicketModal'; // Import EditTicketModal

type TicketWithDetails = Tables<'tickets'> & {
  profiles: Tables<'profiles'> | null;
  statuses: Tables<'statuses'> | null;
  categories: Tables<'categories'> | null;
};

const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isEditTicketModalOpen, setIsEditTicketModalOpen] = useState(false); // State for edit modal visibility
  const [selectedTicket, setSelectedTicket] = useState<Tables<'tickets'> | null>(null); // State for selected ticket to edit

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, profiles(full_name), statuses(name), categories(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data as TicketWithDetails[]);
    } catch (err: any) {
      console.error('Error fetching tickets:', err.message);
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const getStatusColor = (statusName: string | undefined) => {
    switch (statusName) {
      case 'Open': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100';
      case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100';
      case 'Closed': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
    }
  };

  const getPriorityColor = (priority: string | undefined) => {
    // Assuming priority can be derived or is a field in tickets table.
    // For now, let's use a placeholder logic or assume a 'priority' field exists.
    // If 'priority' is not directly in tickets, we'd need to add it or derive it.
    // For this example, let's map status to a 'priority' feel.
    switch (priority) {
      case 'Critical': return 'text-red-600 dark:text-red-400 font-bold';
      case 'High': return 'text-orange-500 dark:text-orange-300';
      case 'Medium': return 'text-yellow-500 dark:text-yellow-300';
      case 'Low': return 'text-green-500 dark:text-green-300';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const handleNewTicketClick = () => {
    setIsNewTicketModalOpen(true);
  };

  const handleCloseNewTicketModal = () => {
    setIsNewTicketModalOpen(false);
  };

  const handleTicketCreated = () => {
    fetchTickets(); // Re-fetch tickets after a new one is created
  };

  const handleEditTicketClick = (ticket: Tables<'tickets'>) => {
    setSelectedTicket(ticket);
    setIsEditTicketModalOpen(true);
  };

  const handleCloseEditTicketModal = () => {
    setIsEditTicketModalOpen(false);
    setSelectedTicket(null); // Clear selected ticket
  };

  const handleTicketUpdated = () => {
    fetchTickets(); // Re-fetch tickets after one is updated
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 bg-background-light dark:bg-background-dark transition-colors duration-200 flex items-center justify-center">
        <LoadingSpinner />
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Tickets</h1>

      <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-subtle dark:shadow-md-dark">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
            />
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            <button
              onClick={handleNewTicketClick}
              className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-md"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Ticket
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subject
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card-light dark:bg-card-dark divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{ticket.id?.substring(0, 8)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{ticket.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.statuses?.name)}`}>
                        {ticket.statuses?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {ticket.categories?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {ticket.profiles?.full_name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(ticket.created_at || '').toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditTicketClick(ticket)}
                        className="text-primary hover:text-indigo-900 dark:hover:text-indigo-400 mr-3"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 dark:hover:text-red-400">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isNewTicketModalOpen}
        onClose={handleCloseNewTicketModal}
        onTicketCreated={handleTicketCreated}
      />

      {/* Edit Ticket Modal */}
      <EditTicketModal
        isOpen={isEditTicketModalOpen}
        onClose={handleCloseEditTicketModal}
        onTicketUpdated={handleTicketUpdated}
        ticket={selectedTicket}
      />
    </div>
  );
};

export default Tickets;
