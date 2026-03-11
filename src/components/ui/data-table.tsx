import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumnId?: string;
  filterPlaceholder?: string;
  globalFilterPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  showGlobalFilter?: boolean;
  enableRowSelection?: boolean;
  getRowId?: (row: TData, index: number) => string;
  onSelectedRowsChange?: (rows: TData[]) => void;
  clearSelectionKey?: number;
  showToolbar?: boolean;
  tableWrapperClassName?: string;
  tableClassName?: string;
  headerRowClassName?: string;
  rowClassName?: (row: TData, index: number) => string | undefined;
  footerClassName?: string;
  rowLabel?: string;
}

type TableDensity = 'compact' | 'comfortable';
const TABLE_DENSITY_KEY = 'datatable-density';

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnId,
  filterPlaceholder,
  globalFilterPlaceholder,
  onRowClick,
  showGlobalFilter = true,
  enableRowSelection = false,
  getRowId,
  onSelectedRowsChange,
  clearSelectionKey,
  showToolbar = true,
  tableWrapperClassName,
  tableClassName,
  headerRowClassName,
  rowClassName,
  footerClassName,
  rowLabel,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const previousClearSelectionKeyRef = React.useRef<number | undefined>(undefined);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [density, setDensity] = React.useState<TableDensity>(() => {
    if (typeof window === 'undefined') {
      return 'comfortable';
    }
    const savedDensity = window.localStorage.getItem(TABLE_DENSITY_KEY);
    return savedDensity === 'compact' ? 'compact' : 'comfortable';
  });

  React.useEffect(() => {
    window.localStorage.setItem(TABLE_DENSITY_KEY, density);
  }, [density]);

  const headerClassName =
    density === 'compact'
      ? 'h-8 px-3 text-[11px] font-bold uppercase tracking-[0.14em]'
      : 'px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em]';
  const cellClassName = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    getRowId,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
  });

  React.useEffect(() => {
    if (!onSelectedRowsChange) return;
    onSelectedRowsChange(table.getSelectedRowModel().rows.map((row) => row.original));
  }, [onSelectedRowsChange, rowSelection, table, data]);

  React.useEffect(() => {
    if (clearSelectionKey === undefined) return;
    if (previousClearSelectionKeyRef.current === clearSelectionKey) return;
    previousClearSelectionKeyRef.current = clearSelectionKey;
    table.resetRowSelection();
  }, [clearSelectionKey, table]);

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = totalRows === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, totalRows);
  const footerSummary = rowLabel
    ? `Showing ${startRow} to ${endRow} of ${totalRows} ${rowLabel}`
    : table.getFilteredSelectedRowModel().rows.length > 0
      ? `${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} row(s) selected.`
      : '';

  return (
    <div className="w-full">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 py-2">
          {showGlobalFilter && (
            <Input
              placeholder={globalFilterPlaceholder || 'Search all columns...'}
              value={(table.getState().globalFilter as string) ?? ''}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
              className="h-8 w-full max-w-sm text-sm"
            />
          )}
          {filterColumnId && (
            <Input
              placeholder={filterPlaceholder || `Filter ${filterColumnId}...`}
              value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn(filterColumnId)?.setFilterValue(event.target.value)
              }
              className="h-8 w-full max-w-sm text-sm"
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto h-8 text-sm">
                Density
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Table density</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={density}
                onValueChange={(value) => setDensity(value as TableDensity)}
              >
                <DropdownMenuRadioItem value="comfortable">
                  Comfortable
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="compact">
                  Compact
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-2 h-8 text-sm">
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div className={cn('rounded-md border bg-background text-foreground', tableWrapperClassName)}>
        <div className="overflow-x-auto">
          <Table className={tableClassName}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className={headerRowClassName}>
                  {headerGroup.headers.map((header) => {
                    const headerMeta = (header.column.columnDef.meta ?? {}) as {
                      headerClassName?: string;
                    };
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(headerClassName, headerMeta.headerClassName)}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() => {
                      if (onRowClick) {
                        onRowClick(row.original);
                        return;
                      }
                      if (enableRowSelection) {
                        row.toggleSelected();
                      }
                    }}
                    className={cn(
                      onRowClick || enableRowSelection
                        ? 'cursor-pointer hover:bg-muted/50'
                        : '',
                      rowClassName?.(row.original, row.index)
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const cellMeta = (cell.column.columnDef.meta ?? {}) as {
                        cellClassName?: string;
                      };
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(cellClassName, cellMeta.cellClassName)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 py-4',
          footerClassName
        )}
      >
        <div className="flex-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {footerSummary}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          {pageCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-8 rounded-lg border-primary bg-primary px-3 text-xs font-semibold text-white shadow-none hover:bg-primary/90"
              disabled
            >
              {pageIndex + 1}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 shadow-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
