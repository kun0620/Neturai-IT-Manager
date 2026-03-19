/* eslint-disable react-refresh/only-export-components */

import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  Laptop,
  MoreHorizontal,
  Package2,
  Server,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { AssetWithType } from '@/types/asset';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const STATUS_STYLE: Record<string, string> = {
  Available:
    'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300',
  Assigned:
    'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-300',
  'In Repair':
    'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300',
  Retired:
    'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Lost:
    'border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/30 dark:text-rose-300',
  'In Use':
    'border-primary/20 bg-primary/10 text-primary',
};

const categoryIcon = (value: string | null | undefined) => {
  const normalized = (value ?? '').toLowerCase();
  if (normalized.includes('laptop') || normalized.includes('notebook')) return Laptop;
  if (normalized.includes('server')) return Server;
  if (normalized.includes('mobile') || normalized.includes('phone')) return Smartphone;
  return Package2;
};

const initialFromName = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'NA';

const TextWithTooltip = ({
  value,
  className,
  maxWidthClass,
}: {
  value: string;
  className?: string;
  maxWidthClass?: string;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`${maxWidthClass ?? ''} truncate ${className ?? ''}`}
          title={value}
        >
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

function SortableHeader({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="h-auto px-0 py-0 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:bg-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      {label}
      <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
    </Button>
  );
}

type AssetColumnActions = {
  canDeleteAsset?: boolean;
  onDeleteAsset?: (asset: AssetWithType) => void;
};

export function getColumns(
  assigneeNameById?: Record<string, string>,
  actions?: AssetColumnActions
): ColumnDef<AssetWithType>[] {
  return [
    {
      accessorKey: 'asset_code',
      header: ({ column }) => (
        <SortableHeader
          label="ID"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        />
      ),
      size: 120,
      meta: {
        headerClassName: 'w-[120px]',
        cellClassName: 'text-xs font-mono font-medium text-slate-500 dark:text-slate-400',
      },
      cell: ({ row }) => (
        <TextWithTooltip
          value={String(row.getValue('asset_code') ?? '')}
          className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400"
          maxWidthClass="max-w-[120px] inline-block"
        />
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader
          label="Asset Name"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        />
      ),
      size: 240,
      meta: {
        headerClassName: 'min-w-[240px]',
        cellClassName: 'font-semibold text-slate-900 dark:text-slate-100',
      },
      cell: ({ row }) => (
        <TextWithTooltip
          value={String(row.getValue('name') ?? '')}
          className="inline-block max-w-[240px] font-semibold"
          maxWidthClass="max-w-[240px] inline-block"
        />
      ),
    },
    {
      id: 'category',
      accessorFn: (row) => row.category?.name ?? '',
      header: ({ column }) => (
        <SortableHeader
          label="Category"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        />
      ),
      size: 150,
      meta: {
        headerClassName: 'min-w-[150px]',
        cellClassName: 'min-w-[150px]',
      },
      cell: ({ row }) => {
        const label = row.original.category?.name ?? row.original.asset_type?.name ?? '—';
        const Icon = categoryIcon(label);
        return (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <TextWithTooltip value={label} maxWidthClass="max-w-[120px] inline-block" />
          </div>
        );
      },
      sortingFn: (a, b) =>
        (a.original.category?.name ?? '').localeCompare(
          b.original.category?.name ?? ''
        ),
    },
    {
      id: 'assigned_to_display',
      accessorFn: (row) => {
        if (!row.assigned_to) return 'Unassigned';
        return assigneeNameById?.[row.assigned_to] ?? row.assigned_to;
      },
      header: ({ column }) => (
        <SortableHeader
          label="Owner"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        />
      ),
      size: 160,
      cell: ({ row }) => {
        const displayName = row.original.assigned_to
          ? assigneeNameById?.[row.original.assigned_to] ?? row.original.assigned_to
          : 'Unassigned';

        return row.original.assigned_to ? (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/10 bg-gradient-to-br from-primary/15 to-primary/5 text-[10px] font-bold text-primary">
              {initialFromName(displayName)}
            </span>
            <TextWithTooltip
              value={displayName}
              className="text-xs font-medium text-slate-700 dark:text-slate-200"
              maxWidthClass="max-w-[120px] inline-block"
            />
          </div>
        ) : (
          <span className="text-xs italic text-slate-400">Unassigned</span>
        );
      },
      sortingFn: (a, b) => {
        const aName = a.original.assigned_to
          ? assigneeNameById?.[a.original.assigned_to] ?? a.original.assigned_to
          : 'Unassigned';
        const bName = b.original.assigned_to
          ? assigneeNameById?.[b.original.assigned_to] ?? b.original.assigned_to
          : 'Unassigned';
        return aName.localeCompare(bName);
      },
    },
    {
      accessorKey: 'status',
      header: () => (
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Status
        </div>
      ),
      size: 120,
      meta: {
        headerClassName: 'min-w-[120px]',
      },
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] shadow-none ${STATUS_STYLE[row.getValue('status') as string] ?? ''}`}
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
          {row.getValue('status')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      size: 60,
      meta: {
        headerClassName: 'w-[72px] text-right',
        cellClassName: 'w-[72px] text-right',
      },
      header: () => (
        <div className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Actions
        </div>
      ),
      cell: ({ row }) => {
        const asset = row.original;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-md p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    navigator.clipboard.writeText(asset.id)
                  }
                >
                  Copy Asset ID
                </DropdownMenuItem>
                {actions?.canDeleteAsset && actions.onDeleteAsset && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => actions.onDeleteAsset?.(asset)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Asset
                  </DropdownMenuItem>
                )}
                {/*<DropdownMenuSeparator />
                 เผื่ออนาคต: Archive / Delete */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
