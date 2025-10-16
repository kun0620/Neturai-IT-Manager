import React from 'react';
import { Search, PlusCircle, Filter, ChevronDown, Edit, Trash2, Monitor, Laptop, Smartphone, Server, HardDrive } from 'lucide-react';

const assets = [
  { id: 'AST-001', name: 'Dell XPS 15', type: 'Laptop', status: 'Active', assignedTo: 'Alice', location: 'HR Dept', purchaseDate: '2022-01-15' },
  { id: 'AST-002', name: 'HP EliteDisplay', type: 'Monitor', status: 'Active', assignedTo: 'Bob', location: 'IT Dept', purchaseDate: '2021-08-01' },
  { id: 'AST-003', name: 'iPhone 13 Pro', type: 'Smartphone', status: 'Active', assignedTo: 'Charlie', location: 'Sales Dept', purchaseDate: '2023-03-10' },
  { id: 'AST-004', name: 'Lenovo ThinkPad', type: 'Laptop', status: 'In Repair', assignedTo: 'N/A', location: 'Repair Shop', purchaseDate: '2022-11-20' },
  { id: 'AST-005', name: 'Server Rack 1', type: 'Server', status: 'Active', assignedTo: 'IT Team', location: 'Server Room', purchaseDate: '2020-05-01' },
  { id: 'AST-006', name: 'Samsung Galaxy S22', type: 'Smartphone', status: 'Active', assignedTo: 'David', location: 'Marketing Dept', purchaseDate: '2023-01-05' },
  { id: 'AST-007', name: 'LG UltraWide Monitor', type: 'Monitor', status: 'Active', assignedTo: 'Eve', location: 'Finance Dept', purchaseDate: '2022-07-10' },
  { id: 'AST-008', name: 'MacBook Pro 16', type: 'Laptop', status: 'Active', assignedTo: 'Frank', location: 'Design Dept', purchaseDate: '2023-02-28' },
  { id: 'AST-009', name: 'Network Switch Cisco', type: 'Network Device', status: 'Active', assignedTo: 'IT Team', location: 'Server Room', purchaseDate: '2021-03-15' },
  { id: 'AST-010', name: 'Wireless AP Ubiquiti', type: 'Network Device', status: 'Maintenance', assignedTo: 'IT Team', location: 'Office', purchaseDate: '2022-09-01' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100';
    case 'In Repair': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100';
    case 'Maintenance': return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Laptop': return Laptop;
    case 'Monitor': return Monitor;
    case 'Smartphone': return Smartphone;
    case 'Server': return Server;
    default: return HardDrive;
  }
};

const Assets: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Assets</h1>

      <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-subtle dark:shadow-md-dark">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
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
              New Asset
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
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card-light dark:bg-card-dark divide-y divide-gray-200 dark:divide-gray-700">
              {assets.map((asset) => {
                const Icon = getTypeIcon(asset.type);
                return (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{asset.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{asset.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark flex items-center">
                      <Icon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                      {asset.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{asset.assignedTo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-primary hover:text-indigo-900 dark:hover:text-indigo-400 mr-3">
                        <Edit className="h-5 w-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 dark:hover:text-red-400">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Assets;
