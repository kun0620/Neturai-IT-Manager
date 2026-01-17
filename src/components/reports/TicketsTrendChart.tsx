import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

type TicketTrendRow = {
  created_at: string;
  status: 'open' | 'in_progress' | 'closed';
};

interface TicketsTrendChartProps {
  data: TicketTrendRow[];
}

export function TicketsTrendChart({ data }: TicketsTrendChartProps) {
  /**
   * แปลงข้อมูลจาก ticket list
   * → grouped by day
   * → นับ open / closed
   */
  const groupedByDay = data.reduce((acc, ticket) => {
    const day = format(new Date(ticket.created_at), 'MMM dd');

    if (!acc[day]) {
      acc[day] = {
        date: day,
        open: 0,
        closed: 0,
      };
    }

    if (ticket.status === 'open') acc[day].open += 1;
    if (ticket.status === 'closed') acc[day].closed += 1;

    return acc;
  }, {} as Record<string, { date: string; open: number; closed: number }>);

  const chartData = Object.values(groupedByDay);

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value: number, name: string) => [
                value,
                name === 'open' ? 'Open Tickets' : 'Closed Tickets',
            ]}
            />
            
          <Line
            type="monotone"
            dataKey="open"
            stroke="#22c55e"
            strokeWidth={2}
            name="Open"
          />

          <Line
            type="monotone"
            dataKey="closed"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Closed"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
