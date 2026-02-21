import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetManagement } from '@/pages/AssetManagement';
import AssetRequestsPage from '@/pages/AssetRequests';
import StockControlPage from '@/pages/StockControl';

type AssetSection = 'management' | 'requests' | 'stock';

export default function AssetsWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const section: AssetSection =
    sectionParam === 'requests' || sectionParam === 'stock' ? sectionParam : 'management';

  const handleSectionChange = (value: string) => {
    const nextSection: AssetSection =
      value === 'requests' || value === 'stock' ? value : 'management';
    const next = new URLSearchParams(searchParams);
    if (nextSection === 'management') {
      next.delete('section');
    } else {
      next.set('section', nextSection);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Tabs value={section} onValueChange={handleSectionChange}>
        <TabsList>
          <TabsTrigger value="management">Asset Management</TabsTrigger>
          <TabsTrigger value="requests">Asset Requests</TabsTrigger>
          <TabsTrigger value="stock">Stock Control</TabsTrigger>
        </TabsList>
        <TabsContent value="management">
          <AssetManagement />
        </TabsContent>
        <TabsContent value="requests">
          <AssetRequestsPage />
        </TabsContent>
        <TabsContent value="stock">
          <StockControlPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
