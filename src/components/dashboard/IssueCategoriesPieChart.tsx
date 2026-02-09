import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pie,
  PieChart,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { motion } from 'framer-motion';

interface IssueCategoriesPieChartProps {
  data: { name: string; value: number; color: string }[];
}

const chartConfig = {
  hardware: {
    label: 'Hardware',
    color: 'hsl(var(--chart-1))',
  },
  software: {
    label: 'Software',
    color: 'hsl(var(--chart-2))',
  },
  network: {
    label: 'Network',
    color: 'hsl(var(--chart-3))',
  },
  account: {
    label: 'Account',
    color: 'hsl(var(--chart-4))',
  },
  general: {
    label: 'General',
    color: 'hsl(var(--chart-5))',
  },
  other: {
    label: 'Other',
    color: 'hsl(var(--muted))',
  },
} satisfies ChartConfig;

export function IssueCategoriesPieChart({
  data,
}: IssueCategoriesPieChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Issue Categories Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center">
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <PieChart>
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString(),
                  name,
                ]}
              />
              <Legend />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
