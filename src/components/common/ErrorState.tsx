import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something Went Wrong',
  message = 'An unexpected error occurred. Please try again later.',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-red-500">
      <AlertTriangle className="h-16 w-16 mb-4" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm">{message}</p>
    </div>
  );
};
