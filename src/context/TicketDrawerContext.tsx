/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, ReactNode } from 'react';

type TicketDrawerContextType = {
  ticketId: string | null;
  isOpen: boolean;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
};

const TicketDrawerContext = createContext<TicketDrawerContextType | undefined>(
  undefined
);

export function TicketDrawerProvider({ children }: { children: ReactNode }) {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = (id: string) => {
    // force re-open even if same ticket
    setTicketId(null);

    requestAnimationFrame(() => {
      setTicketId(id);
      setIsOpen(true);
    });
  };

  const closeDrawer = () => {
    setIsOpen(false);
    setTicketId(null);
  };

  return (
    <TicketDrawerContext.Provider
      value={{
        ticketId,
        isOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </TicketDrawerContext.Provider>
  );
}

export function useTicketDrawer() {
  const ctx = useContext(TicketDrawerContext);
  if (!ctx) {
    throw new Error(
      'useTicketDrawer must be used inside TicketDrawerProvider'
    );
  }
  return ctx;
}
