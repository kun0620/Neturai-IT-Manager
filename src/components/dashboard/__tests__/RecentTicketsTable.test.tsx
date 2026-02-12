import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecentTicketsTable } from '@/components/dashboard/RecentTicketsTable';

const mockOpenDrawer = vi.fn();
let mockTicketId: string | null = null;

vi.mock('@/context/TicketDrawerContext', () => ({
  useTicketDrawer: () => ({
    openDrawer: mockOpenDrawer,
    ticketId: mockTicketId,
  }),
}));

const sampleTickets = [
  {
    id: 't1',
    title: 'Ticket A',
    priority: 'low',
    status: 'open',
    created_at: '2026-02-10T09:00:00.000Z',
  },
  {
    id: 't2',
    title: 'Ticket B',
    priority: 'medium',
    status: 'in_progress',
    created_at: '2026-02-10T10:00:00.000Z',
  },
  {
    id: 't3',
    title: 'Ticket C',
    priority: 'high',
    status: 'closed',
    created_at: '2026-02-10T11:00:00.000Z',
  },
];

function renderTable() {
  return render(<RecentTicketsTable tickets={sampleTickets} isLoading={false} />);
}

function createTickets(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `tx-${i + 1}`,
    title: `Ticket ${i + 1}`,
    priority: 'low',
    status: 'open',
    created_at: `2026-02-${String((i % 28) + 1).padStart(2, '0')}T09:00:00.000Z`,
  }));
}

describe('RecentTicketsTable', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  beforeEach(() => {
    mockOpenDrawer.mockReset();
    mockTicketId = null;
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('highlights first row by default and moves selection with ArrowDown', async () => {
    renderTable();

    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody');
    if (!tbody) throw new Error('tbody not found');

    const rows = within(tbody).getAllByRole('row');
    expect(rows[0]).toHaveAttribute('aria-selected', 'true');
    expect(rows[1]).toHaveAttribute('aria-selected', 'false');

    fireEvent.keyDown(tbody, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(rows[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('opens drawer for active row on Enter key', async () => {
    renderTable();

    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody');
    if (!tbody) throw new Error('tbody not found');

    fireEvent.keyDown(tbody, { key: 'ArrowDown' });
    fireEvent.keyDown(tbody, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOpenDrawer).toHaveBeenCalledWith('t2');
    });
  });

  it('opens drawer when clicking a row', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByText('Ticket C'));

    expect(mockOpenDrawer).toHaveBeenCalledWith('t3');
  });

  it('highlights row from external ticketId', async () => {
    mockTicketId = 't2';
    renderTable();

    const row = screen.getByText('Ticket B').closest('tr');
    if (!row) throw new Error('row not found');

    await waitFor(() => {
      expect(row).toHaveClass('bg-muted');
    });
  });

  it('paginates when ticket count exceeds page size', async () => {
    const user = userEvent.setup();
    render(
      <RecentTicketsTable
        tickets={createTickets(12)}
        isLoading={false}
      />
    );

    expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
    expect(screen.getByText('Ticket 1')).toBeInTheDocument();
    expect(screen.queryByText('Ticket 6')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '10' }));

    expect(screen.getByText('Page 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Ticket 10')).toBeInTheDocument();
  });

  it('reads and writes page size from localStorage', async () => {
    window.localStorage.setItem('neturai_recent_tickets_page_size', '10');
    const user = userEvent.setup();

    render(
      <RecentTicketsTable
        tickets={createTickets(12)}
        isLoading={false}
      />
    );

    expect(screen.getByText('Page 1 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '20' }));

    expect(window.localStorage.getItem('neturai_recent_tickets_page_size')).toBe('20');
  });
});
