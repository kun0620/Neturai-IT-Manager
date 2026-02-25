import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/common/EmptyState';
import { TopBar } from '@/components/Layout/TopBar';
import { TicketDrawerProvider } from '@/context/TicketDrawerContext';
import { motion } from 'motion/react';
import { createFadeSlideUp } from '@/lib/motion';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isTicketsRoute = location.pathname.startsWith('/tickets');

  if (!user) {
    return (
      <>
        <EmptyState
          title="Authentication Required"
          message="Please log in to access the application."
        />
        <div className="mt-4">
          <Link to="/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <TicketDrawerProvider>
      <div className="min-h-screen w-full bg-background text-foreground">
        <TopBar />
        <main
          className={
            isTicketsRoute
              ? 'bg-background pt-16 text-foreground md:ml-64 md:pt-16'
              : 'bg-background p-4 pt-20 text-foreground md:ml-64 md:p-6 md:pt-24'
          }
        >
          <motion.div key={location.pathname} {...createFadeSlideUp(0)}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </TicketDrawerProvider>
  );
};

