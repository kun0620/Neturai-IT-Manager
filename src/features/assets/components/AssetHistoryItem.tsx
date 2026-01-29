import { formatDistanceToNow } from 'date-fns';
import { Sliders } from 'lucide-react';
import {
  PlusCircle,
  UserPlus,
  UserMinus,
  RefreshCcw,
  Edit3,
} from 'lucide-react';
import { HistoryItem, HistoryAction } from '../types/history';

const ACTION_META: Record<
  HistoryAction,
  { icon: any; color: string }
> = {
  create: { icon: PlusCircle, color: 'text-green-600' },
  assign: { icon: UserPlus, color: 'text-purple-600' },
  unassign: { icon: UserMinus, color: 'text-gray-500' },
  status_change: { icon: RefreshCcw, color: 'text-blue-600' },
  update: { icon: Edit3, color: 'text-muted-foreground' },
  custom_field_update: {icon: Sliders,color: 'text-orange-600',},
};

type Props = {
  log: HistoryItem;
};

export function AssetHistoryItem({ log }: Props) {
  const meta = ACTION_META[log.action];
  const Icon = meta.icon;

  const createdAt = new Date(log.createdAt);
  const timeLabel = isNaN(createdAt.getTime())
    ? 'just now'
    : formatDistanceToNow(createdAt, { addSuffix: true });

  return (
    <div className="relative pl-8 pb-6">
      <div className="absolute left-3 top-3 bottom-0 w-px bg-border" />

      <div
        className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-background ${meta.color}`}
      >
        <Icon size={14} />
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium">{log.title}</div>

        {log.description && (
          <div className="text-xs text-muted-foreground">
            {log.description}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {log.actor} · {timeLabel}
        </div>
      </div>
    </div>
  );
}
