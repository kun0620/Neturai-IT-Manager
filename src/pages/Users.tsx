import React from 'react';
import { Search, PlusCircle, Filter, ChevronDown, Edit, Trash2, Mail, Phone } from 'lucide-react';

const users = [
  { id: 'USR-001', name: 'Alice Johnson', email: 'alice.j@example.com', role: 'Admin', status: 'Active', phone: '555-1234' },
  { id: 'USR-002', name: 'Bob Williams', email: 'bob.w@example.com', role: 'IT Support', status: 'Active', phone: '555-5678' },
  { id: 'USR-003', name: 'Charlie Brown', email: 'charlie.b@example.com', role: 'Employee', status: 'Inactive', phone: '555-9012' },
  { id: 'USR-004', name: 'David Lee', email: 'david.l@example.com', role: 'Employee', status: 'Active', phone: '555-3456' },
  { id: 'USR-005', name: 'Eve Davis', email: 'eve.d@example.com', role: 'IT Support', status: 'Active', phone: '555-7890' },
  { id: 'USR-006', name: 'Frank White', email: 'frank.w@example.com', role: 'Employee', status: 'Active', phone: '555-2345' },
  { id: 'USR-007', name: 'Grace Taylor', email: 'grace.t@example.com', role: 'Admin', status: 'Active', phone: '555-6789' },
  { id: 'USR-008', name: 'Henry Miller', email: 'henry.m@example.com', role: 'Employee', status: 'Inactive', phone: '555-0123' },
  { id: 'USR-009', name: 'Ivy Wilson', email: 'ivy.w@example.com', role: 'IT Support', status: 'Active', phone: '555-4567' },
  { id: 'USR-010', name: 'Jack Moore', email: 'jack.m@example.com', role: 'Employee', status: 'Active', phone: '555-8901' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100';
    case 'Inactive': return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
  }
};

const Users: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Users</h1>

      <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-subtle dark:shadow-md-dark">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
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
              New User
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
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card-light dark:bg-card-dark divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <a href={`mailto:${user.email}`} className="flex items-center hover:text-primary">
                      <Mail className="h-4 w-4 mr-2" />
                      {user.email}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
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

export default Users;
