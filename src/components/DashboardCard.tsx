import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string; // Tailwind color classes, e.g., "text-blue-500 bg-blue-500"
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon: Icon, color }) => {
  // Safely extract the text color class, defaulting to an empty string if color is undefined or null
  const textColorClass = color ? color.split(' ')[0] : '';

  return (
    <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-subtle dark:shadow-md-dark flex items-center justify-between transition-transform duration-200 hover:scale-[1.02]">
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="mt-1 text-3xl font-semibold text-text-light dark:text-text-dark">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color} bg-opacity-20`}>
        <Icon className={`h-7 w-7 ${textColorClass}`} />
      </div>
    </div>
  );
};

export default DashboardCard;
