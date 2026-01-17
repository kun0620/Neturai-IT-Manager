import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type StatusData = {
  open: number;
  inProgress: number;
  closed: number;
};

interface TicketsStatusDonutProps {
  data: StatusData;
}

const COLORS = {
  open: '#22c55e',        // green
  inProgress: '#eab308',  // yellow
  closed: '#3b82f6',      // blue
};

export function TicketsStatusDonut({ data }: TicketsStatusDonutProps) {
  const chartData = [
    { name: 'Open', value: data.open, key: 'open' },
    { name: 'In Progress', value: data.inProgress, key: 'inProgress' },
    { name: 'Closed', value: data.closed, key: 'closed' },
  ];

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.key}
                fill={COLORS[entry.key as keyof typeof COLORS]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} tickets`, name]}
            />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
