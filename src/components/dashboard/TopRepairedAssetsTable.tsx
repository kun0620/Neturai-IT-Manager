import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface TopRepairedAssetsTableProps {
  data: { asset_name: string; asset_code: string; repairs_count: number }[];
}

export function TopRepairedAssetsTable({
  data,
}: TopRepairedAssetsTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Top Repaired Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-muted-foreground">
              <thead className="text-xs text-foreground uppercase bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3">Asset Name</th>
                  <th scope="col" className="px-6 py-3">Asset Code</th>
                  <th scope="col" className="px-6 py-3">Repairs Count</th>
                </tr>
              </thead>
              <tbody>
                {data.length > 0 ? (
                  data.map((asset, index) => (
                    <tr key={index} className="bg-background border-b">
                      <td className="px-6 py-4">{asset.asset_name}</td>
                      <td className="px-6 py-4">{asset.asset_code}</td>
                      <td className="px-6 py-4">{asset.repairs_count}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-background">
                    <td colSpan={3} className="px-6 py-4 text-center">
                      No repaired assets found for the selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
