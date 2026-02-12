import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import './styles/print.css';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MotionConfig } from 'motion/react';
import { appMotionTransition } from '@/lib/motion';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <MotionConfig reducedMotion="user" transition={appMotionTransition}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </MotionConfig>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
