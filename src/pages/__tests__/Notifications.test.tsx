import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationsPage from '@/pages/Notifications';

type MockNotification = {
  id: string;
  user_id: string;
  ticket_id: string | null;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean | null;
  created_at: string | null;
};
type MockPreferences = {
  user_id: string;
  receive_new_ticket: boolean;
  receive_status_change: boolean;
  receive_priority_change: boolean;
};

const mockUseAuth = vi.fn();
const notifyErrorMock = vi.fn();
const notifySuccessMock = vi.fn();

let mockNotifications: MockNotification[] = [];
let mockPreferences: MockPreferences | null = null;

type MockFilter =
  | { operator: 'eq'; column: string; value: unknown }
  | { operator: 'gte'; column: string; value: unknown };

const applyFilters = (rows: MockNotification[], filters: MockFilter[]) =>
  rows.filter((row) =>
    filters.every((filter) => {
      const rowValue = (row as Record<string, unknown>)[filter.column];
      if (filter.operator === 'eq') {
        return rowValue === filter.value;
      }

      if (typeof rowValue === 'string' && typeof filter.value === 'string') {
        return rowValue >= filter.value;
      }

      return true;
    })
  );

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/notify', () => ({
  notifyError: (...args: unknown[]) => notifyErrorMock(...args),
  notifySuccess: (...args: unknown[]) => notifySuccessMock(...args),
}));

vi.mock('@/lib/supabase', () => {
  const from = vi.fn((table: string) => {
    if (table === 'notifications') {
      return {
        select: (_columns: string, options?: { head?: boolean }) => {
          const filters: MockFilter[] = [];
          const builder: Record<string, unknown> & {
            eq: (column: string, value: unknown) => typeof builder;
            gte: (column: string, value: unknown) => typeof builder;
            order: () => typeof builder;
            range: (from: number, to: number) => Promise<{
              data: MockNotification[];
              error: null;
              count: number;
            }>;
          } = {
            count: 0,
            error: null,
            eq: (column: string, value: unknown) => {
              filters.push({ operator: 'eq', column, value });
              if (options?.head) {
                builder.count = applyFilters(mockNotifications, filters).length;
              }
              return builder;
            },
            gte: (column: string, value: unknown) => {
              filters.push({ operator: 'gte', column, value });
              return builder;
            },
            order: () => builder,
            range: async (fromIndex: number, toIndex: number) => {
              const filtered = applyFilters(mockNotifications, filters);
              return {
                data: filtered.slice(fromIndex, toIndex + 1),
                error: null,
                count: filtered.length,
              };
            },
          };

          return builder;
        },
        update: (payload: Partial<MockNotification>) => {
          const filters: MockFilter[] = [];
          const builder: Record<string, unknown> & {
            eq: (column: string, value: unknown) => typeof builder;
          } = {
            error: null,
            eq: (column: string, value: unknown) => {
              filters.push({ operator: 'eq', column, value });
              mockNotifications = mockNotifications.map((row) => {
                const matches = filters.every(
                  (filter) =>
                    filter.operator === 'eq' &&
                    (row as Record<string, unknown>)[filter.column] === filter.value
                );
                return matches ? { ...row, ...payload } : row;
              });
              return builder;
            },
          };
          return builder;
        },
      };
    }

    if (table === 'user_notification_preferences') {
      return {
        select: () => {
          const builder: Record<string, unknown> & {
            eq: (_column: string, _value: unknown) => typeof builder;
            maybeSingle: () => Promise<{ data: MockPreferences | null; error: null }>;
          } = {
            eq: () => builder,
            maybeSingle: async () => ({ data: mockPreferences, error: null }),
          };
          return builder;
        },
        upsert: (payload: Partial<MockPreferences>) => {
          mockPreferences = {
            user_id: mockPreferences?.user_id ?? 'u-1',
            receive_new_ticket: mockPreferences?.receive_new_ticket ?? true,
            receive_status_change: mockPreferences?.receive_status_change ?? true,
            receive_priority_change: mockPreferences?.receive_priority_change ?? true,
            ...payload,
          } as MockPreferences;
          return Promise.resolve({ error: null });
        },
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    supabase: { from },
  };
});

function TestLocation() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderNotifications() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/notifications']}>
        <Routes>
          <Route
            path="/notifications"
            element={
              <>
                <NotificationsPage />
                <TestLocation />
              </>
            }
          />
          <Route
            path="/tickets"
            element={<TestLocation />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Notifications page', () => {
  beforeEach(() => {
    if (!Element.prototype.hasPointerCapture) {
      Object.defineProperty(Element.prototype, 'hasPointerCapture', {
        value: () => false,
        configurable: true,
      });
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        value: () => undefined,
        configurable: true,
      });
    }
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'u-1' } },
    });
    mockPreferences = null;
    mockNotifications = [
      {
        id: 'n-1',
        user_id: 'u-1',
        ticket_id: 't-1',
        type: 'new_ticket',
        title: 'New ticket assigned',
        body: 'Ticket #1',
        is_read: false,
        created_at: oneHourAgo,
      },
      {
        id: 'n-2',
        user_id: 'u-1',
        ticket_id: null,
        type: 'info',
        title: 'System notice',
        body: 'Maintenance window',
        is_read: false,
        created_at: twoHoursAgo,
      },
      {
        id: 'n-3',
        user_id: 'u-1',
        ticket_id: 't-2',
        type: 'status_change',
        title: 'Ticket closed',
        body: null,
        is_read: true,
        created_at: oneDayAgo,
      },
    ];
  });

  afterEach(() => {
    cleanup();
  });

  it('renders notification summary and list', async () => {
    renderNotifications();

    expect(await screen.findByText('Notifications')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Unread:\s*2/i)).toBeInTheDocument();
    });
    expect(await screen.findByRole('button', { name: /new ticket assigned/i })).toBeInTheDocument();
    expect(await screen.findByText('System notice')).toBeInTheDocument();
  });

  it('marks all notifications as read', async () => {
    const user = userEvent.setup();
    renderNotifications();

    await user.click(await screen.findByRole('button', { name: 'Mark all as read' }));

    await waitFor(() => {
      expect(screen.getByText('Unread: 0')).toBeInTheDocument();
    });
    expect(notifySuccessMock).toHaveBeenCalled();
  });

  it('opens ticket route from notification item', async () => {
    const user = userEvent.setup();
    renderNotifications();

    await user.click(await screen.findByRole('button', { name: /new ticket assigned/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/tickets?open_ticket=t-1'
      );
    });
  });

  it('applies default 30-day date filter', async () => {
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    mockNotifications.push({
      id: 'n-legacy',
      user_id: 'u-1',
      ticket_id: null,
      type: 'info',
      title: 'Legacy notification',
      body: 'Older than 30 days',
      is_read: false,
      created_at: oldDate,
    });

    renderNotifications();

    await waitFor(() => {
      expect(screen.getByText(/Total:\s*3/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Legacy notification')).not.toBeInTheDocument();
  });

  it('filters notifications by type', async () => {
    const user = userEvent.setup();
    renderNotifications();

    const combos = await screen.findAllByRole('combobox');
    await user.click(combos[2]);
    await user.click(await screen.findByRole('option', { name: 'info' }));

    await waitFor(() => {
      expect(screen.getByText(/Total:\s*1/i)).toBeInTheDocument();
    });
    expect(screen.getByText('System notice')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new ticket assigned/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ticket closed')).not.toBeInTheDocument();
  });

  it('supports pagination next and previous', async () => {
    const user = userEvent.setup();
    const now = Date.now();
    mockNotifications = Array.from({ length: 22 }, (_, index) => ({
      id: `n-${index + 1}`,
      user_id: 'u-1',
      ticket_id: null,
      type: 'info',
      title: `Paged notification ${index + 1}`,
      body: null,
      is_read: false,
      created_at: new Date(now - index * 60_000).toISOString(),
    }));

    renderNotifications();

    expect(await screen.findByText(/Page 1 \/ 2/i)).toBeInTheDocument();
    expect(screen.getByText('Paged notification 1')).toBeInTheDocument();
    expect(screen.queryByText('Paged notification 21')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByText(/Page 2 \/ 2/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Paged notification 21')).toBeInTheDocument();
    expect(screen.getByText('Paged notification 22')).toBeInTheDocument();
    expect(screen.queryByText('Paged notification 1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    await waitFor(() => {
      expect(screen.getByText(/Page 1 \/ 2/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Paged notification 1')).toBeInTheDocument();
  });
});
