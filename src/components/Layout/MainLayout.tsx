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
        <main className="bg-background p-4 text-foreground md:p-6">
          <motion.div key={location.pathname} {...createFadeSlideUp(0)}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </TicketDrawerProvider>
  );
};

