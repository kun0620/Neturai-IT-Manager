import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Download } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

// Dummy Data
const ticketsPerMonthData = [
  { month: 'Jan', tickets: 120, color: 'hsl(var(--chart-1))' },
  { month: 'Feb', tickets: 150, color: 'hsl(var(--chart-1))' },
  { month: 'Mar', tickets: 130, color: 'hsl(var(--chart-1))' },
  { month: 'Apr', tickets: 180, color: 'hsl(var(--chart-1))' },
  { month: 'May', tickets: 160, color: 'hsl(var(--chart-1))' },
  { month: 'Jun', tickets: 200, color: 'hsl(var(--chart-1))' },
  { month: 'Jul', tickets: 190, color: 'hsl(var(--chart-1))' },
  { month: 'Aug', tickets: 220, color: 'hsl(var(--chart-1))' },
  { month: 'Sep', tickets: 210, color: 'hsl(var(--chart-1))' },
  { month: 'Oct', tickets: 230, color: 'hsl(var(--chart-1))' },
  { month: 'Nov', tickets: 250, color: 'hsl(var(--chart-1))' },
  { month: 'Dec', tickets: 240, color: 'hsl(var(--chart-1))' },
];

const avgResolutionTimeData = [
  { month: 'Jan', avgTime: 4.5, color: 'hsl(var(--chart-2))' },
  { month: 'Feb', avgTime: 3.8, color: 'hsl(var(--chart-2))' },
  { month: 'Mar', avgTime: 4.2, color: 'hsl(var(--chart-2))' },
  { month: 'Apr', avgTime: 3.5, color: 'hsl(var(--chart-2))' },
  { month: 'May', avgTime: 3.9, color: 'hsl(var(--chart-2))' },
  { month: 'Jun', avgTime: 3.2, color: 'hsl(var(--chart-2))' },
  { month: 'Jul', avgTime: 3.7, color: 'hsl(var(--chart-2))' },
  { month: 'Aug', avgTime: 3.0, color: 'hsl(var(--chart-2))' },
  { month: 'Sep', avgTime: 3.4, color: 'hsl(var(--chart-2))' },
  { month: 'Oct', avgTime: 2.8, color: 'hsl(var(--chart-2))' },
  { month: 'Nov', avgTime: 3.1, color: 'hsl(var(--chart-2))' },
  { month: 'Dec', avgTime: 2.9, color: 'hsl(var(--chart-2))' },
];

const topCategoriesData = [
  { name: 'Software Issue', value: 300, color: 'hsl(var(--chart-1))' },
  { name: 'Hardware Repair', value: 200, color: 'hsl(var(--chart-2))' },
  { name: 'Network Problem', value: 150, color: 'hsl(var(--chart-3))' },
  { name: 'Account Access', value: 100, color: 'hsl(var(--chart-4))' },
  { name: 'Other', value: 50, color: 'hsl(var(--chart-5))' },
];

const topRepairedAssetsData = [
  { name: 'Laptop Pro X', repairs: 15, lastRepair: '2023-10-20' },
  { name: 'Monitor UltraWide', repairs: 12, lastRepair: '2023-11-01' },
  { name: 'Desktop Workstation', repairs: 10, lastRepair: '2023-09-15' },
  { name: 'Network Switch 10G', repairs: 8, lastRepair: '2023-12-05' },
  { name: 'Printer LaserJet', repairs: 7, lastRepair: '2023-11-22' },
];

const chartConfig = {
  tickets: {
    label: 'Tickets',
    color: 'hsl(var(--chart-1))',
  },
  avgTime: {
    label: 'Avg. Time (Days)',
    color: 'hsl(var(--chart-2))',
  },
  software: {
    label: 'Software Issue',
    color: 'hsl(var(--chart-1))',
  },
  hardware: {
    label: 'Hardware Repair',
    color: 'hsl(var(--chart-2))',
  },
  network: {
    label: 'Network Problem',
    color: 'hsl(var(--chart-3))',
  },
  account: {
    label: 'Account Access',
    color: 'hsl(var(--chart-4))',
  },
  other: {
    label: 'Other',
    color: 'hsl(var(--chart-5))',
  },
};

const Reports: React.FC = () => {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2023, 0, 1),
    to: new Date(),
  });

  const handleExportPdf = () => {
    alert('Exporting report to PDF...');
    // Implement PDF generation logic here
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-xl font-semibold">Reports & Analytics</h1>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold md:text-2xl">Overview</h2>
          <div className="flex items-center gap-2">
            <DatePickerWithRange date={date} setDate={setDate} />
            <Button onClick={handleExportPdf} className="gap-1">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tickets per Month</CardTitle>
              <CardDescription>Number of tickets created each month.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                <BarChart data={ticketsPerMonthData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Bar dataKey="tickets" fill="var(--color-tickets)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Resolution Time</CardTitle>
              <CardDescription>Average days to resolve a ticket.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                <LineChart data={avgResolutionTimeData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value} days`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Line
                    dataKey="avgTime"
                    type="monotone"
                    stroke="var(--color-avgTime)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Ticket Categories</CardTitle>
              <CardDescription>Distribution of tickets by category.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-0">
              <ChartContainer
                config={chartConfig}
                className="aspect-square h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={topCategoriesData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    strokeWidth={5}
                  >
                    {topCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                    className="-translate-y-2 flex-wrap gap-2"
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 xl:col-span-3">
            <CardHeader>
              <CardTitle>Top Repaired Assets</CardTitle>
              <CardDescription>Assets with the most repair incidents.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Repairs Count</TableHead>
                    <TableHead>Last Repair Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRepairedAssetsData.map((asset, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.repairs}</TableCell>
                      <TableCell>{asset.lastRepair}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;
