import React from 'react';
import { Search, PlusCircle, Filter, ChevronDown, Edit, Trash2 } from 'lucide-react';

const tickets = [
  { id: '#001', subject: 'Printer not working in HR', status: 'Open', priority: 'High', assignedTo: 'Alice', date: '2023-10-26' },
  { id: '#002', subject: 'Software installation request', status: 'In Progress', priority: 'Medium', assignedTo: 'Bob', date: '2023-10-25' },
  { id: '#003', subject: 'New laptop setup for Marketing', status: 'Closed', priority: 'Low', assignedTo: 'Charlie', date: '2023-10-24' },
  { id: '#004', subject: 'Network issue in Server Room', status: 'Open', priority: 'Critical', assignedTo: 'Alice', date: '2023-10-26' },
  { id: '#005', subject: 'Email client configuration', status: 'Pending', priority: 'Medium', assignedTo: 'Bob', date: '2023-10-23' },
  { id: '#006', subject: 'Monitor replacement for Finance', status: 'Closed', priority: 'Low', assignedTo: 'Charlie', date: '2023-10-22' },
  { id: '#007', subject: 'VPN access request', status: 'Open', priority: 'High', assignedTo: 'Alice', date: '2023-10-21' },
  { id: '#008', subject: 'Password reset for new employee', status: 'Closed', priority: 'Low', assignedTo: 'Bob', date: '2023-10-20' },
  { id: '#009', subject: 'Server maintenance schedule', status: 'In Progress', priority: 'Medium', assignedTo: 'Charlie', date: '2023-10-19' },
  { id: '#010', subject: 'New software license purchase', status: 'Pending', priority: 'High', assignedTo: 'Alice', date: '2023-10-18' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Open': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100';
    case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100';
    case 'Closed': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100';
    case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical': return 'text-red-600 dark:text-red-400 font-bold';
    case 'High': return 'text-orange-500 dark:text-orange-300';
    case 'Medium': return 'text-yellow-500 dark:text-yellow-300';
    case 'Low': return 'text-green-500 dark:text-green-300';
    default: return 'text-gray-500 dark:text-gray-400';
  }
};

const Tickets: React.FC = () => {
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
            <button className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-md">
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
                  Priority
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
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{ticket.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{ticket.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getPriorityColor(ticket.priority)}>{ticket.priority}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{ticket.assignedTo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{ticket.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary hover:text-indigo-900 dark:hover:text-indigo-400 mr-3">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button className="text-red-600 hover:text-red-900 dark:hover:text-red-400">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Tickets;
