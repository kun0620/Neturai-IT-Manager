import React from 'react';
import { PackageX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  message = 'It looks like there is no data to display here yet.',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <PackageX className="h-16 w-16 mb-4 text-gray-400" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm">{message}</p>
    </div>
  );
};
