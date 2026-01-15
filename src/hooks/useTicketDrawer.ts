import { create } from 'zustand';

interface TicketDrawerState {
  isOpen: boolean;
  selectedTicketId: string | null;
  openTicketDrawer: (ticketId: string) => void;
  closeTicketDrawer: () => void;
}

export const useTicketDrawer = create<TicketDrawerState>((set) => ({
  isOpen: false,
  selectedTicketId: null,

  openTicketDrawer: (ticketId) =>
    set({
      isOpen: true,
      selectedTicketId: ticketId,
    }),

  closeTicketDrawer: () =>
    set({
      isOpen: false,
      selectedTicketId: null,
    }),
}));
