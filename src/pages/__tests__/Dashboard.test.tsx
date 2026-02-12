import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import Dashboard from '@/pages/Dashboard';

const mockNavigate = vi.fn();
const mockRefetchDashboardMetrics = vi.fn().mockResolvedValue(undefined);
const mockUseAuth = vi.fn();

type QueryResult<T> = {
  data: T;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  isFetching?: boolean;
  dataUpdatedAt?: number;
  refetch?: () => Promise<unknown>;
};

type DashboardMetrics = {
  totalTickets: number;
  totalAssets: number;
  openTicketsCount: number;
  inProgressTicketsCount: number;
  closedTicketsCount: number;
  todayTicketsCount: number;
  overdueTicketsCount: number;
  avgResolutionHours: number | null;
  openTrendDelta: number;
  inProgressTrendDelta: number;
  closedTrendDelta: number;
  todayTrendDelta: number;
      overdueTrendDelta: number;
      recentTickets: Array<{ id: string; title: string }>;
    };

const mockUseDashboardMetrics = vi.fn<
  (options?: { userId?: string | null; onlyMy?: boolean }) => QueryResult<DashboardMetrics | undefined>
>();
const mockUseTicketCategories = vi.fn<() => QueryResult<Array<{ id: string }>>>();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useTickets', () => ({
  useTickets: {
    useDashboardMetrics: (options?: { userId?: string | null; onlyMy?: boolean }) =>
      mockUseDashboardMetrics(options),
    useTicketCategories: () => mockUseTicketCategories(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/dashboard/RecentTicketsTable', () => ({
  RecentTicketsTable: ({ tickets }: { tickets: Array<{ id: string }> }) => (
    <div data-testid="recent-tickets-table">rows:{tickets.length}</div>
  ),
}));

vi.mock('@/components/tickets/TicketDetailsDrawer', () => ({
  TicketDetailsDrawer: () => <div data-testid="ticket-details-drawer" />,
}));

vi.mock('@/components/tickets/CreateTicketDialog', () => ({
  CreateTicketDialog: () => <div data-testid="create-ticket-dialog" />,
}));

function setupDefaultMocks() {
  mockUseAuth.mockReturnValue({
    role: 'admin',
    session: { user: { id: 'admin-1' } },
  });

  mockUseDashboardMetrics.mockReturnValue({
    data: {
      totalTickets: 24,
      totalAssets: 12,
      openTicketsCount: 4,
      inProgressTicketsCount: 6,
      closedTicketsCount: 14,
      todayTicketsCount: 2,
      overdueTicketsCount: 3,
      avgResolutionHours: 12.5,
      openTrendDelta: 1,
      inProgressTrendDelta: -1,
      closedTrendDelta: 2,
      todayTrendDelta: 0,
      overdueTrendDelta: 1,
      recentTickets: [{ id: '1', title: 'A' }],
    },
    isLoading: false,
    isError: false,
    error: null,
    isFetching: false,
    dataUpdatedAt: 1739318400000,
    refetch: mockRefetchDashboardMetrics,
  });

  mockUseTicketCategories.mockReturnValue({
    data: [{ id: 'cat-1' }],
    isLoading: false,
    isError: false,
    error: null,
  });
}

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });
  
  afterEach(() => {
    cleanup();
  });

  it('renders key dashboard sections', () => {
    render(<Dashboard />);

    expect(screen.getByText('IT Operations Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Quick Filters')).toBeInTheDocument();
    expect(screen.getByText('Showing: All tickets')).toBeInTheDocument();
    expect(screen.getByTestId('recent-tickets-table')).toHaveTextContent('rows:1');
  });

  it('passes all-ticket scope to dashboard metrics hook for admin role', () => {
    render(<Dashboard />);
    expect(mockUseDashboardMetrics).toHaveBeenCalledWith({
      userId: 'admin-1',
      onlyMy: false,
    });
  });

  it('passes my-ticket scope to dashboard metrics hook for non-manage role', () => {
    mockUseAuth.mockReturnValue({
      role: 'user',
      session: { user: { id: 'user-1' } },
    });

    render(<Dashboard />);

    expect(mockUseDashboardMetrics).toHaveBeenCalledWith({
      userId: 'user-1',
      onlyMy: true,
    });
    expect(screen.getByText('Showing: My tickets')).toBeInTheDocument();
  });

  it('navigates to in-progress ticket filter from quick filter button', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /In Progress \(6\)/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/tickets?status=in_progress');
  });

  it('refresh button refetches dashboard metrics', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /Refresh/i }));

    expect(mockRefetchDashboardMetrics).toHaveBeenCalledTimes(1);
  });

  it('disables New Ticket button while categories are loading', () => {
    (mockUseTicketCategories as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<Dashboard />);

    expect(screen.getByRole('button', { name: /New Ticket/i })).toBeDisabled();
  });

  it('shows metrics error state when dashboard metrics query fails', () => {
    (mockUseDashboardMetrics as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('metrics failed'),
      isFetching: false,
      dataUpdatedAt: 0,
      refetch: mockRefetchDashboardMetrics,
    });

    render(<Dashboard />);

    expect(screen.getByText('Metrics unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('metrics failed').length).toBeGreaterThan(0);
  });

  it('shows recent tickets error state when dashboard metrics query fails', () => {
    (mockUseDashboardMetrics as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('recent failed'),
      isFetching: false,
      dataUpdatedAt: 0,
      refetch: mockRefetchDashboardMetrics,
    });

    render(<Dashboard />);

    expect(screen.getByText('Recent tickets unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('recent failed').length).toBeGreaterThan(0);
  });

  it('shows categories error state and disables New Ticket button when categories fail', () => {
    (mockUseTicketCategories as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('categories failed'),
    });

    render(<Dashboard />);

    expect(screen.getByText('Categories unavailable')).toBeInTheDocument();
    expect(screen.getByText('categories failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Ticket/i })).toBeDisabled();
  });
});
