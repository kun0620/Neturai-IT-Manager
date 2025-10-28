import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusClass = (s: string) => {
    switch (s.toLowerCase()) {
      case 'open':
      case 'available':
        return 'bg-green-100 text-green-800 hover:bg-green-100/80';
      case 'in progress':
      case 'assigned':
      case 'pending':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80';
      case 'resolved':
      case 'completed':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100/80';
      case 'closed':
      case 'retired':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80';
      case 'high':
      case 'in repair':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80';
      case 'critical':
      case 'lost':
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-100/80';
      case 'low':
        return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80';
      case 'medium':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100/80';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80';
    }
  };

  return (
    <Badge className={cn(getStatusClass(status), className)}>
      {status}
    </Badge>
  );
};
