import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Filter, ArrowUpNarrowWide, ArrowDownNarrowWide, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { Tables } from '@/types/supabase';
import { useAssets } from '@/hooks/useAssets'; // Assuming you'll create this hook
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;

export function Assets() {
  const { data: assets, isLoading, isError, error } = useAssets(); // Use the assets hook
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Tables<'assets'>;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAssets = assets?.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchTerm.toLowerCase().substring(0,8));

    const matchesType =
      filterType === 'All' || asset.type === filterType;
    const matchesStatus =
      filterStatus === 'All' || asset.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const sortedAssets = [...(filteredAssets || [])].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
    if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'ascending'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'ascending'
        ? aValue - bValue
        : bValue - aValue;
    }
    // Fallback for other types, or if types are mixed
    return 0;
  });

  const totalPages = Math.ceil(sortedAssets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentAssets = sortedAssets.slice(startIndex, endIndex);

  const requestSort = (key: keyof Tables<'assets'>) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Tables<'assets'>) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? (
      <ArrowUpNarrowWide className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDownNarrowWide className="ml-1 h-3 w-3 inline" />
    );
  };

  const getStatusBadgeVariant = (status: Tables<'assets'>['status']) => {
    switch (status) {
      case 'In Use':
        return 'default';
      case 'Available':
        return 'secondary';
      case 'Maintenance':
        return 'destructive';
      case 'Retired':
        return 'outline';
      case 'Lost':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Assets</h1>
        <p className="text-red-500">Error loading assets: {error?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assets..."
                className="w-full rounded-lg bg-background pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter Type: {filterType}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {['All', 'Hardware', 'Software License', 'Network Device', 'Peripheral', 'Other'].map(
                  (type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => {
                        setFilterType(type);
                        setCurrentPage(1);
                      }}
                    >
                      {type}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter Status: {filterStatus}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {['All', 'In Use', 'Available', 'Maintenance', 'Retired', 'Lost'].map(
                  (status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => {
                        setFilterStatus(status);
                        setCurrentPage(1);
                      }}
                    >
                      {status}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort('id')}
                    >
                      Asset ID {getSortIndicator('id')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort('name')}
                    >
                      Name {getSortIndicator('name')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort('type')}
                    >
                      Type {getSortIndicator('type')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort('status')}
                    >
                      Status {getSortIndicator('status')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort('assigned_to')}
                    >
                      Assigned To {getSortIndicator('assigned_to')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort('purchase_date')}
                    >
                      Purchase Date {getSortIndicator('purchase_date')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => requestSort('warranty_end_date')}
                    >
                      Warranty End {getSortIndicator('warranty_end_date')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentAssets.length > 0 ? (
                    currentAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          {asset.id.substring(0, 8)}
                        </TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(asset.status)}>
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.assigned_to || 'Unassigned'}</TableCell>
                        <TableCell>
                          {asset.purchase_date
                            ? format(new Date(asset.purchase_date), 'MMM dd, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {asset.warranty_end_date
                            ? format(new Date(asset.warranty_end_date), 'MMM dd, yyyy')
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No assets found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-end items-center space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
