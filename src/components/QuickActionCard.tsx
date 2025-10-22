import React from 'react';
import { Link } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  to?: string; // Make 'to' prop optional
  onClick?: () => void; // Add optional onClick prop
  colorClass: string; // New prop for custom background color
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon: Icon, to, onClick, colorClass }) => {
  const content = (
    <div className="block bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-subtle dark:shadow-md-dark transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-xl-dark group">
      <div className="flex items-center mb-3">
        {/* Use colorClass for background and ensure text is white for contrast */}
        <div className={`p-3 rounded-full ${colorClass} text-white group-hover:opacity-90 transition-colors duration-200`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="ml-4 text-xl font-semibold text-text-light dark:text-text-dark group-hover:text-primary dark:group-hover:text-primary-light transition-colors duration-200">
          {title}
        </h3>
      </div>
      <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }

  return content;
};

export default QuickActionCard;
