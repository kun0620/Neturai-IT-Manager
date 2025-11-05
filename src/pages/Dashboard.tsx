import React, { useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  useTicketsSummary,
  useTicketsPerMonth,
  useIssueCategories,
  useTickets,
} from '@/hooks/useTickets';
import { useTotalAssets } from '@/hooks/useAssets';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';

const Dashboard: React.FC = () => {
  const { data: ticketsSummary, isLoading: isLoadingTicketsSummary, error: ticketsSummaryError } = useTicketsSummary();
  const { data: totalAssets, isLoading: isLoadingTotalAssets, error: totalAssetsError } = useTotalAssets();
  const { data: ticketsPerMonth, isLoading: isLoadingTicketsPerMonth, error: ticketsPerMonthError } = useTicketsPerMonth();
  const { data: issueCategories, isLoading: isLoadingIssueCategories, error: issueCategoriesError } = useIssueCategories();
  const { data: allTickets, isLoading: isLoadingAllTickets, error: allTicketsError } = useTickets();

  const recentTickets = allTickets
    ? allTickets
        .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
        .slice(0, 5)
    : [];

  // Realtime notification for new tickets
  useEffect(() => {
    if (allTickets && allTickets.length > 0) {
      const latestTicket = allTickets[0]; // Assuming the first ticket is the latest due to sorting in useTickets hook or a separate check
      // This is a simplified check. In a real-time scenario, you'd compare against a previously known state
      // or use the payload from the Supabase Realtime subscription directly to detect new tickets.
      // For this example, we'll just show a toast for the latest ticket if it's "new" (e.g., within the last few seconds).
      const now = new Date();
      const ticketCreatedAt = new Date(latestTicket.created_at!);
      const diffSeconds = (now.getTime() - ticketCreatedAt.getTime()) / 1000;

      if (diffSeconds < 10) { // If ticket was created within the last 10 seconds
        toast.info(`New Ticket: ${latestTicket.subject}`, {
          description: `Category: ${latestTicket.category}, Priority: ${latestTicket.priority}`,
          action: {
            label: 'View',
            onClick: () => console.log(`View ticket ${latestTicket.id}`), // Placeholder for opening details drawer
          },
        });
      }
    }
  }, [allTickets]);

  const renderLoading = () => (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const renderError = (error: Error) => (
    <div className="text-red-500 text-center p-4">
      Error: {error.message}
    </div>
  );

  const getStatusBadgeVariant = (status: Tables<'tickets'>['status']) => {
    switch (status) {
      case 'Open':
        return 'destructive';
      case 'In Progress':
        return 'default';
      case 'Resolved':
        return 'success';
      case 'Closed':
        return 'secondary';
      case 'Pending':
        return 'warning';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: Tables<'tickets'>['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'destructive';
      case 'High':
        return 'default';
      case 'Medium':
        return 'secondary';
      case 'Low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold md:text-2xl">Welcome to Neturai IT Dashboard!</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
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
              {isLoadingTicketsSummary ? renderLoading() : ticketsSummaryError ? renderError(ticketsSummaryError) : (
                <div className="text-2xl font-bold">{ticketsSummary?.open}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Tickets currently awaiting action
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress Tickets</CardTitle>
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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              {isLoadingTicketsSummary ? renderLoading() : ticketsSummaryError ? renderError(ticketsSummaryError) : (
                <div className="text-2xl font-bold">{ticketsSummary?.inProgress}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Tickets being actively worked on
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closed Tickets</CardTitle>
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
                <rect width="20" height="14" x="2" y="6" rx="2" />
                <path d="M22 10H2" />
              </svg>
            </CardHeader>
            <CardContent>
              {isLoadingTicketsSummary ? renderLoading() : ticketsSummaryError ? renderError(ticketsSummaryError) : (
                <div className="text-2xl font-bold">{ticketsSummary?.closed}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Tickets successfully resolved
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
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
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </CardHeader>
            <CardContent>
              {isLoadingTotalAssets ? renderLoading() : totalAssetsError ? renderError(totalAssetsError) : (
                <div className="text-2xl font-bold">{totalAssets}</div>
              )}
              <p className="text-xs text-muted-foreground">
                All IT assets managed
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tickets Created Per Month</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTicketsPerMonth ? renderLoading() : ticketsPerMonthError ? renderError(ticketsPerMonthError) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={ticketsPerMonth}>
                    <XAxis
                      dataKey="month"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Issue Categories Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-[350px]">
              {isLoadingIssueCategories ? renderLoading() : issueCategoriesError ? renderError(issueCategoriesError) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={issueCategories}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {issueCategories?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAllTickets ? renderLoading() : allTicketsError ? renderError(allTicketsError) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTickets.length > 0 ? (
                    recentTickets.map((ticket) => (
                      <TableRow key={ticket.id} onClick={() => console.log(`Open ticket details for ${ticket.id}`)} className="cursor-pointer hover:bg-muted">
                        <TableCell className="font-medium">{ticket.subject}</TableCell>
                        <TableCell>{ticket.category}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(ticket.priority)}>{ticket.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(ticket.created_at!), 'MMM dd, yyyy HH:mm')}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No recent tickets found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
