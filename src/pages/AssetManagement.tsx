import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, HardDrive, Wrench, Info, CalendarDays, DollarSign, Tag, MapPin, User, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { supabase } from '@/lib/supabase';
import { Tables, Enums } from '@/types/supabase';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast'; // Corrected import path

type Asset = Tables<'assets'>;
type Repair = Tables<'repairs'>;
type AssetCategory = Enums<'asset_category'>;
type AssetStatus = Enums<'asset_status'>;
type RepairStatus = Enums<'repair_status'>;

export const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Form states for Add Asset
  const [newName, setNewName] = useState('');
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newCategory, setNewCategory] = useState<AssetCategory>('Other');
  const [newLocation, setNewLocation] = useState('');
  const [newStatus, setNewStatus] = useState<AssetStatus>('Available');
  const [newAssignedTo, setNewAssignedTo] = useState<string | null>(null); // Assuming user ID

  // Filter states
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      toast({
        title: 'Error fetching assets',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  };

  const fetchRepairsForAsset = async (assetId: string) => {
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .eq('asset_id', assetId)
      .order('repair_date', { ascending: false });

    if (error) {
      toast({
        title: 'Error fetching repair history',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
    return data || [];
  };

  useEffect(() => {
    fetchAssets();

    const assetsChannel = supabase
      .channel('public:assets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        (payload) => {
          console.log('Change received!', payload);
          fetchAssets(); // Re-fetch assets on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(assetsChannel);
    };
  }, []);

  const handleAddAsset = async () => {
    const { data, error } = await supabase.from('assets').insert({
      name: newName,
      asset_code: newAssetCode,
      serial_number: newSerialNumber,
      category: newCategory,
      location: newLocation,
      status: newStatus,
      assigned_to: newAssignedTo,
    }).select();

    if (error) {
      toast({
        title: 'Error adding asset',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Asset added successfully!',
        description: `Asset "${newName}" has been added.`,
      });
      setIsAddAssetModalOpen(false);
      resetAddAssetForm();
      fetchAssets(); // Re-fetch to include the new asset
    }
  };

  const resetAddAssetForm = () => {
    setNewName('');
    setNewAssetCode('');
    setNewSerialNumber('');
    setNewCategory('Other');
    setNewLocation('');
    setNewStatus('Available');
    setNewAssignedTo(null);
  };

  const handleViewDetails = async (asset: Asset) => {
    setSelectedAsset(asset);
    const assetRepairs = await fetchRepairsForAsset(asset.id);
    setRepairs(assetRepairs);
    setIsDetailsDrawerOpen(true);
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = filterCategory === 'All' || asset.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || asset.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const assetCategories: AssetCategory[] = ['Laptop', 'Desktop', 'Monitor', 'Printer', 'Network Device', 'Software License', 'Other'];
  const assetStatuses: AssetStatus[] = ['Available', 'Assigned', 'In Repair', 'Retired', 'Lost'];
  const repairStatuses: RepairStatus[] = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <h1 className="text-xl font-semibold">Asset Management</h1>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold md:text-2xl">Loading Assets...</h2>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <h1 className="text-xl font-semibold">Asset Management</h1>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold md:text-2xl text-red-500">Error: {error}</h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-xl font-semibold">Asset Management</h1>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold md:text-2xl">IT Assets</h2>
          <Dialog open={isAddAssetModalOpen} onOpenChange={setIsAddAssetModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Asset
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assetCode" className="text-right">
                    Asset Code
                  </Label>
                  <Input
                    id="assetCode"
                    value={newAssetCode}
                    onChange={(e) => setNewAssetCode(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="serialNumber" className="text-right">
                    Serial Number
                  </Label>
                  <Input
                    id="serialNumber"
                    value={newSerialNumber}
                    onChange={(e) => setNewSerialNumber(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category
                  </Label>
                  <Select value={newCategory} onValueChange={(value: AssetCategory) => setNewCategory(value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select value={newStatus} onValueChange={(value: AssetStatus) => setNewStatus(value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetStatuses.map((stat) => (
                        <SelectItem key={stat} value={stat}>
                          {stat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Assigned To field can be added here, potentially with a user search/select */}
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddAsset}>
                  Add Asset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:gap-8">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assets..."
                className="w-full appearance-none bg-background pl-8 shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {assetCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {assetStatuses.map((stat) => (
                  <SelectItem key={stat} value={stat}>
                    {stat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Asset Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No assets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.asset_code}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell>
                        <StatusBadge status={asset.status} />
                      </TableCell>
                      <TableCell>{asset.assigned_to || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        {asset.updated_at ? format(new Date(asset.updated_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(asset)}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Sheet open={isDetailsDrawerOpen} onOpenChange={setIsDetailsDrawerOpen}>
          <SheetContent className="w-full sm:max-w-md flex flex-col">
            <SheetHeader>
              <SheetTitle>Asset Details</SheetTitle>
            </SheetHeader>
            {selectedAsset && (
              <ScrollArea className="flex-1 pr-4">
                <div className="grid gap-4 py-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{selectedAsset.name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Asset Code:</span> {selectedAsset.asset_code}
                    </div>
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Serial:</span> {selectedAsset.serial_number || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Category:</span> {selectedAsset.category}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Location:</span> {selectedAsset.location || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Assigned To:</span> {selectedAsset.assigned_to || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Created:</span> {selectedAsset.created_at ? format(new Date(selectedAsset.created_at), 'MMM dd, yyyy') : 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Last Updated:</span> {selectedAsset.updated_at ? format(new Date(selectedAsset.updated_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-medium">Current Status:</span>
                    <StatusBadge status={selectedAsset.status} />
                  </div>

                  <Separator className="my-4" />

                  <h4 className="text-md font-semibold flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Repair History
                  </h4>
                  {repairs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No repair history for this asset.</p>
                  ) : (
                    <div className="grid gap-3">
                      {repairs.map((repair) => (
                        <div key={repair.id} className="border rounded-md p-3 text-sm">
                          <div className="flex justify-between items-center">
                            <p className="font-medium">{repair.description}</p>
                            <StatusBadge status={repair.status} />
                          </div>
                          <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {repair.repair_date ? format(new Date(repair.repair_date), 'MMM dd, yyyy') : 'N/A'}
                            <DollarSign className="h-3 w-3 ml-2" />
                            Cost: {repair.cost ? `$${repair.cost.toFixed(2)}` : 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
};
