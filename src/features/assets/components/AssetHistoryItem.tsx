import { formatDistanceToNow } from 'date-fns';
import { Sliders } from 'lucide-react';
import {
  PlusCircle,
  UserPlus,
  UserMinus,
  RefreshCcw,
  Edit3,
} from 'lucide-react';
import type { ElementType } from 'react';
import { HistoryItem, HistoryAction } from '../types/history';

const ACTION_META: Record<
  HistoryAction,
  { icon: ElementType; color: string }
> = {
  create: { icon: PlusCircle, color: 'text-green-600' },
  assign: { icon: UserPlus, color: 'text-purple-600' },
  unassign: { icon: UserMinus, color: 'text-gray-500' },
  status_change: { icon: RefreshCcw, color: 'text-blue-600' },
  update: { icon: Edit3, color: 'text-muted-foreground' },
  custom_field_update: {
    icon: Sliders,
    color: 'text-orange-600',
  },
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
    <div className="relative pl-8 pb-6 last:pb-0">
      <div className="absolute left-2 top-3 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />

      <div
        className={`absolute left-0 top-0 z-10 flex h-4 w-4 items-center justify-center rounded-full border-4 border-white bg-slate-300 dark:border-slate-900 dark:bg-slate-600 ${log.action === 'status_change' ? 'bg-primary text-white dark:bg-primary' : meta.color}`}
      >
        <Icon size={10} />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{log.title}</div>

        {log.description && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {log.description}
          </div>
        )}

        <div className="text-[10px] text-slate-500 dark:text-slate-400">
          {log.actor} · {timeLabel}
        </div>
      </div>
    </div>
  );
}
