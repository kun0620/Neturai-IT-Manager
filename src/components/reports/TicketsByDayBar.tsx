import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

type TicketRow = {
  created_at: string;
};

interface TicketsByDayBarProps {
  data: TicketRow[];
}

export function TicketsByDayBar({ data }: TicketsByDayBarProps) {
  /**
   * Group tickets by day
   */
  const grouped = data.reduce((acc, t) => {
    const day = format(new Date(t.created_at), 'MMM dd');

    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(grouped).map(([date, count]) => ({
    date,
    count,
  }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value: number) => [`${value} tickets`, 'Count']}
            />
          <Bar
            dataKey="count"
            fill="#6366f1" // indigo
            radius={[4, 4, 0, 0]}
            name="Tickets"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
