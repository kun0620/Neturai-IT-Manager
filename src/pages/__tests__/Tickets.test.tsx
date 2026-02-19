import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Tickets } from '@/pages/Tickets';
import { TicketDrawerProvider } from '@/context/TicketDrawerContext';

const mockUseAuth = vi.fn();
const mockUseAllTickets = vi.fn();
const mockUseTicketCategories = vi.fn();
const mockUseAssignableUsers = vi.fn();
const mockUseSLAPolicies = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useTickets', () => ({
  useTickets: {
    useAllTickets: () => mockUseAllTickets(),
    useTicketCategories: () => mockUseTicketCategories(),
  },
}));

vi.mock('@/hooks/useAssignableUsers', () => ({
  useAssignableUsers: () => mockUseAssignableUsers(),
}));

vi.mock('@/hooks/useSLAPolicies', () => ({
  useSLAPolicies: () => mockUseSLAPolicies(),
}));

vi.mock('@/components/tickets/TableView', () => ({
  TableView: ({ tickets }: { tickets: Array<{ id: string }> }) => (
    <div data-testid="table-view">tickets:{tickets.length}</div>
  ),
}));

vi.mock('@/components/tickets/KanbanView', () => ({
  KanbanView: ({ tickets }: { tickets: Array<{ id: string }> }) => (
    <div data-testid="kanban-view">tickets:{tickets.length}</div>
  ),
}));

vi.mock('@/components/tickets/CreateTicketDialog', () => ({
  CreateTicketDialog: () => <div data-testid="create-ticket-dialog" />,
}));

vi.mock('@/components/tickets/TicketDetailsDrawer', () => ({
  TicketDetailsDrawer: () => <div data-testid="ticket-details-drawer" />,
}));

function TestLocation() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderTickets(initialPath = '/tickets') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/tickets"
          element={
            <TicketDrawerProvider>
              <Tickets />
              <TestLocation />
            </TicketDrawerProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('Tickets page filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      role: 'admin',
      session: { user: { id: 'admin-1' } },
    });

    mockUseAllTickets.mockReturnValue({
      data: [
        {
          id: 't-1',
          title: 'VPN issue',
          description: 'cannot connect',
          status: 'open',
          priority: 'High',
          category_id: 'cat-1',
          assigned_to: 'u-1',
          created_by: 'u-2',
          created_at: '2026-02-11T10:00:00.000Z',
          updated_at: '2026-02-11T10:00:00.000Z',
          due_at: '2026-02-11T12:00:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseTicketCategories.mockReturnValue({
      data: [{ id: 'cat-1', name: 'Network' }],
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseAssignableUsers.mockReturnValue({
      data: [{ id: 'u-1', name: 'Alice' }],
    });

    mockUseSLAPolicies.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('reads filters from URL and renders active filter chips', async () => {
    renderTickets(
      '/tickets?q=vpn&category=cat-1&priority=high&assignee=u-1&status=open&scope=my'
    );

    expect(screen.getByDisplayValue('vpn')).toBeInTheDocument();
    expect(await screen.findByText('Category: Network')).toBeInTheDocument();
    expect(screen.getByText('Priority: High')).toBeInTheDocument();
    expect(screen.getByText('Assignee: Alice')).toBeInTheDocument();
    expect(screen.getAllByText('Status: open').length).toBeGreaterThan(0);
    expect(screen.getByText('Scope: my tickets')).toBeInTheDocument();
  });

  it('clear all resets query string and removes active chips', async () => {
    const user = userEvent.setup();
    renderTickets('/tickets?q=vpn&category=cat-1&priority=high&assignee=u-1&status=open');

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
      expect(screen.getByTestId('location-search').textContent).toBe('');
    });

    expect(screen.queryByText('Category: Network')).not.toBeInTheDocument();
    expect(screen.queryByText('Priority: High')).not.toBeInTheDocument();
    expect(screen.queryByText('Assignee: Alice')).not.toBeInTheDocument();
  });

  it('removes status query only when removing status chip', async () => {
    const user = userEvent.setup();
    renderTickets('/tickets?q=vpn&status=open&priority=high');

    const removeStatusButton = screen.getByLabelText('Remove status filter');
    await user.click(removeStatusButton);

    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? '';
      const params = new URLSearchParams(search);
      expect(params.get('q')).toBe('vpn');
      expect(params.get('priority')).toBe('high');
      expect(params.get('status')).toBeNull();
    });
  });
});
