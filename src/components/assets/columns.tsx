import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { AssetWithType } from '@/types/asset';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  Available: 'bg-emerald-500/10 text-emerald-700',
  Assigned: 'bg-blue-500/10 text-blue-700',
  'In Repair': 'bg-amber-500/10 text-amber-700',
  Retired: 'bg-gray-500/10 text-gray-700',
  Lost: 'bg-red-500/10 text-red-700',
  'In Use': 'bg-purple-500/10 text-purple-700',
};

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

export function getColumns(): ColumnDef<AssetWithType>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      size: 220,
      cell: ({ row }) => (
        <TextWithTooltip
          value={String(row.getValue('name') ?? '')}
          className="capitalize font-medium"
          maxWidthClass="max-w-[220px] inline-block"
        />
      ),
    },
    {
      accessorKey: 'asset_code',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        >
          Asset Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      size: 140,
      cell: ({ row }) => (
        <TextWithTooltip
          value={String(row.getValue('asset_code') ?? '')}
          className="text-muted-foreground"
          maxWidthClass="max-w-[140px] inline-block"
        />
      ),
    },
    {
      id: 'asset_type',
      header: 'Type',
      size: 160,
      cell: ({ row }) => (
        <div>{row.original.asset_type?.name ?? '—'}</div>
      ),
      sortingFn: (a, b) =>
        (a.original.asset_type?.name ?? '').localeCompare(
          b.original.asset_type?.name ?? ''
        ),
    },
    {
      id: 'category',
      header: 'Category',
      size: 160,
      cell: ({ row }) => (
        <div>{row.original.category?.name ?? '—'}</div>
      ),
      sortingFn: (a, b) =>
        (a.original.category?.name ?? '').localeCompare(
          b.original.category?.name ?? ''
        ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      size: 140,
      cell: ({ row }) => (
        <div>{row.getValue('location') || '—'}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={STATUS_STYLE[row.getValue('status') as string] ?? ''}
        >
          {row.getValue('status')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      size: 60,
      cell: ({ row }) => {
        const asset = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
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
              {/*<DropdownMenuSeparator />
               เผื่ออนาคต: Archive / Delete */}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
