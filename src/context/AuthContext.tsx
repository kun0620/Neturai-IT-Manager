/* eslint-disable react-refresh/only-export-components */

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { notifyError } from '@/lib/notify';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  user: Session['user'] | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Session['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        notifyError('Failed to load session', error.message);
      }
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);

      // Redirect logic based on session
      if (session) {
        // User is logged in, redirect to dashboard if they are on auth pages
        if (['/login', '/register', '/forgot-password', '/update-password'].includes(window.location.pathname)) {
          navigate('/dashboard');
        }
      } else {
        // User is logged out, redirect to login if they are on protected pages
        if (!['/login', '/register', '/forgot-password', '/update-password'].includes(window.location.pathname)) {
          navigate('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]); // Add navigate to dependency array

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      notifyError('Logout failed', error.message);
    }
    setSession(null);
    setUser(null);
    setLoading(false);
    navigate('/login'); // Redirect to login after sign out
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, loading, user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
