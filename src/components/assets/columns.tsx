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

function SortableHeader({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" onClick={onClick}>
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

export function getColumns(
  assigneeNameById?: Record<string, string>
): ColumnDef<AssetWithType>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader
          label="Name"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        />
      ),
      size: 190,
      meta: {
        headerClassName: 'sticky left-0 z-20 bg-background border-r',
        cellClassName: 'sticky left-0 z-10 bg-background border-r',
      },
      cell: ({ row }) => (
        <TextWithTooltip
          value={String(row.getValue('name') ?? '')}
          className="capitalize font-medium"
          maxWidthClass="max-w-[190px] inline-block"
        />
      ),
    },
    {
      accessorKey: 'asset_code',
      header: ({ column }) => (
        <SortableHeader
          label="Asset Code"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        />
      ),
      size: 120,
      meta: {
        headerClassName: 'hidden sm:table-cell',
        cellClassName: 'hidden sm:table-cell',
      },
      cell: ({ row }) => (
        <TextWithTooltip
          value={String(row.getValue('asset_code') ?? '')}
          className="text-muted-foreground"
          maxWidthClass="max-w-[120px] inline-block"
        />
      ),
    },
    {
      id: 'asset_type',
      accessorFn: (row) => row.asset_type?.name ?? '',
      header: ({ column }) => (
        <SortableHeader
          label="Type"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        />
      ),
      size: 140,
      meta: {
        headerClassName: 'hidden md:table-cell',
        cellClassName: 'hidden md:table-cell',
      },
      cell: ({ row }) => (
        <TextWithTooltip
          value={row.original.asset_type?.name ?? '—'}
          maxWidthClass="max-w-[140px] inline-block"
        />
      ),
      sortingFn: (a, b) =>
        (a.original.asset_type?.name ?? '').localeCompare(
          b.original.asset_type?.name ?? ''
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
        headerClassName: 'hidden lg:table-cell',
        cellClassName: 'hidden lg:table-cell',
      },
      cell: ({ row }) => (
        <TextWithTooltip
          value={row.original.category?.name ?? '—'}
          maxWidthClass="max-w-[150px] inline-block"
        />
      ),
      sortingFn: (a, b) =>
        (a.original.category?.name ?? '').localeCompare(
          b.original.category?.name ?? ''
        ),
    },
    {
      accessorKey: 'location',
      header: ({ column }) => (
        <SortableHeader
          label="Location"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        />
      ),
      size: 120,
      meta: {
        headerClassName: 'hidden xl:table-cell',
        cellClassName: 'hidden xl:table-cell',
      },
      cell: ({ row }) => (
        <TextWithTooltip
          value={String(row.getValue('location') || '—')}
          maxWidthClass="max-w-[120px] inline-block"
        />
      ),
    },
    {
      id: 'assigned_to_display',
      accessorFn: (row) => {
        if (!row.assigned_to) return 'Unassigned';
        return assigneeNameById?.[row.assigned_to] ?? row.assigned_to;
      },
      header: ({ column }) => (
        <div className="flex justify-center">
          <SortableHeader
            label="Assigned To"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === 'asc')
            }
          />
        </div>
      ),
      size: 130,
      cell: ({ row }) => {
        const displayName = row.original.assigned_to
          ? assigneeNameById?.[row.original.assigned_to] ?? row.original.assigned_to
          : 'Unassigned';

        return (
          <div className="w-full text-center text-muted-foreground">
            <TextWithTooltip
              value={displayName}
              maxWidthClass="max-w-[130px] inline-block"
            />
          </div>
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
      accessorKey: 'updated_at',
      header: ({ column }) => (
        <SortableHeader
          label="Updated"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === 'asc')
          }
        />
      ),
      size: 150,
      meta: {
        headerClassName: 'hidden 2xl:table-cell',
        cellClassName: 'hidden 2xl:table-cell',
      },
      cell: ({ row }) => {
        const value = row.getValue('updated_at');
        if (!value) return <div className="text-muted-foreground">—</div>;
        const date = new Date(String(value));
        return (
          <div className="text-muted-foreground">
            {Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()}
          </div>
        );
      },
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
      meta: {
        headerClassName: 'hidden md:table-cell',
        cellClassName: 'hidden md:table-cell',
      },
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const asset = row.original;

        return (
          <div className="flex justify-center">
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
          </div>
        );
      },
    },
  ];
}
