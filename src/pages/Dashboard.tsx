import React from 'react';
import {
  Activity,
  Ticket,
  Hourglass,
  CheckCircle,
  LayoutDashboard,
} from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import {
  useTicketsSummary,
  useTicketsPerMonth,
  useIssueCategories,
  useRecentTickets,
} from '@/hooks/useTickets';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorState } from '@/components/common/ErrorState';

const Dashboard: React.FC = () => {
  // Define default date range for dashboard charts (e.g., current year)
  const defaultStartDate = new Date(new Date().getFullYear(), 0, 1); // Start of current year
  const defaultEndDate = new Date(); // Today

  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: errorSummary,
  } = useTicketsSummary();
  const {
    data: ticketsPerMonthData,
    isLoading: isLoadingTicketsPerMonth,
    isError: isErrorTicketsPerMonth,
    error: errorTicketsPerMonth,
  } = useTicketsPerMonth(defaultStartDate, defaultEndDate); // Pass default dates
  const {
    data: issueCategoriesData,
    isLoading: isLoadingIssueCategories,
    isError: isErrorIssueCategories,
    error: errorIssueCategories,
  } = useIssueCategories(defaultStartDate, defaultEndDate); // Pass default dates
  const {
    data: recentTickets,
    isLoading: isLoadingRecentTickets,
    isError: isErrorRecentTickets,
    error: errorRecentTickets,
  } = useRecentTickets();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Open':
        return 'destructive';
      case 'In Progress':
        return 'default';
      case 'Resolved':
        return 'secondary';
      case 'Closed':
        return 'success';
      default:
        return 'outline';
    }
  };

  if (isLoadingSummary || isLoadingTicketsPerMonth || isLoadingIssueCategories || isLoadingRecentTickets) {
    return <LoadingSpinner />;
  }

  if (isErrorSummary || isErrorTicketsPerMonth || isErrorIssueCategories || isErrorRecentTickets) {
    return (
      <ErrorState
        title="Error Loading Dashboard"
        message={
          errorSummary?.message ||
          errorTicketsPerMonth?.message ||
          errorIssueCategories?.message ||
          errorRecentTickets?.message ||
          'An unknown error occurred.'
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
        <LayoutDashboard className="h-8 w-8" /> Welcome to your Dashboard!
      </h1>
      <p className="text-muted-foreground text-lg">
        This is where you'll see an overview of your IT operations.
      </p>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Open Tickets"
          value={summaryData?.open || 0}
          icon={Ticket}
          color="text-red-500"
          description="Tickets awaiting action"
        />
        <SummaryCard
          title="In Progress"
          value={summaryData?.inProgress || 0}
          icon={Hourglass}
          color="text-blue-500"
          description="Tickets currently being worked on"
        />
        <SummaryCard
          title="Closed Tickets"
          value={summaryData?.closed || 0}
          icon={CheckCircle}
          color="text-green-500"
          description="Tickets resolved this month"
        />
        <SummaryCard
          title="Total Tickets"
          value={summaryData?.total || 0}
          icon={Activity}
          color="text-purple-500"
          description="All tickets in the system"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Tickets Created Per Month</h3>
          <div className="h-64">
            {ticketsPerMonthData && ticketsPerMonthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsPerMonthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted rounded-md">
                <p className="text-muted-foreground">No data for tickets per month.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Issue Categories Distribution</h3>
          <div className="h-64">
            {issueCategoriesData && issueCategoriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={issueCategoriesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {issueCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value, entry) => (
                      <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted rounded-md">
                <p className="text-muted-foreground">No data for issue categories.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tickets Table */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Tickets</h3>
        <div className="overflow-x-auto">
          {recentTickets && recentTickets.length > 0 ? (
            <table className="w-full text-sm text-left text-muted-foreground">
              <thead className="text-xs text-foreground uppercase bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3">Ticket ID</th>
                  <th scope="col" className="px-6 py-3">Title</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Assigned To</th>
                  <th scope="col" className="px-6 py-3">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="bg-background border-b hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{`#${ticket.id.substring(0, 8)}`}</td>
                    <td className="px-6 py-4">{ticket.title}</td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </td>
                    {/* Display raw assigned_to UUID or a placeholder for now */}
                    <td className="px-6 py-4">
                      {ticket.assigned_to ? ticket.assigned_to.substring(0, 8) : 'Unassigned'}
                    </td>
                    <td className="px-6 py-4">
                      {format(new Date(ticket.updated_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-32 flex items-center justify-center bg-muted rounded-md">
              <p className="text-muted-foreground">No recent tickets found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
