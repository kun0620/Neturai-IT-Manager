/* eslint-disable react-refresh/only-export-components */

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
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
    'bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]',
  Assigned:
    'bg-[hsl(var(--info)/0.14)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.25)]',
  'In Repair':
    'bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.25)]',
  Retired:
    'bg-[hsl(var(--muted)/0.5)] text-muted-foreground border-[hsl(var(--border))]',
  Lost:
    'bg-[hsl(var(--destructive)/0.14)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.25)]',
  'In Use':
    'bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.25)]',
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
      accessorFn: (row) => row.asset_type?.name ?? '',
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
      accessorFn: (row) => row.category?.name ?? '',
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
      header: () => <div className="text-center">Status</div>,
      size: 120,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className={STATUS_STYLE[row.getValue('status') as string] ?? ''}
          >
            {row.getValue('status')}
          </Badge>
        </div>
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
