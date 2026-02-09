import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { motion } from 'framer-motion';

interface AverageResolutionTimeChartProps {
  data: { month: string; avg_time_hours: number }[];
  kpiValue: number | null;
}

const chartConfig = {
  avg_time_hours: {
    label: 'Avg. Hours',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function AverageResolutionTimeChart({
  data,
  kpiValue,
}: AverageResolutionTimeChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Average Resolution Time
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {kpiValue !== null ? `${kpiValue.toFixed(2)} hours` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            Average time to resolve tickets
          </p>
          <ChartContainer config={chartConfig} className="h-[150px] w-full mt-4">
            <LineChart data={data}>
              <XAxis
                dataKey="month"
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                formatter={(value: number) => `${value.toFixed(2)} hours`}
              />
              <Legend />
              <Line
                dataKey="avg_time_hours"
                type="monotone"
                stroke="var(--color-avg_time_hours)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
