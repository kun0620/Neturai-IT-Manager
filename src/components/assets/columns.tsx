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
      cell: ({ row }) => (
        <div className="capitalize font-medium">
          {row.getValue('name')}
        </div>
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
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {row.getValue('asset_code')}
        </div>
      ),
    },
    {
      id: 'asset_type',
      header: 'Type',
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
      cell: ({ row }) => (
        <div>{row.getValue('location') || '—'}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="capitalize">
          {row.getValue('status')}
        </div>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
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
