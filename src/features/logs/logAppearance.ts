import {
  PlusCircle,
  ArrowRightLeft,
  CalendarClock,
  UserPlus,
  UserMinus,
  MessageSquare,
  Activity,
} from 'lucide-react';

export const logAppearance = (action: string) => {
  switch (action) {
    case 'ticket.created':
      return { icon: PlusCircle, color: 'text-emerald-500' };

    case 'ticket.status_changed':
      return { icon: ArrowRightLeft, color: 'text-indigo-500' };

    case 'ticket.due_date_changed':
      return { icon: CalendarClock, color: 'text-orange-500' };

    case 'ticket.assigned':
      return { icon: UserPlus, color: 'text-blue-500' };

    case 'ticket.unassigned':
      return { icon: UserMinus, color: 'text-gray-500' };

    case 'ticket.comment_added':
      return { icon: MessageSquare, color: 'text-purple-500' };

    default:
      return { icon: Activity, color: 'text-muted-foreground' };
  }
};
