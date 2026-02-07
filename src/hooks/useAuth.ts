import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'it' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async (userId: string) => {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && profileData?.role) {
        if (
          profileData.role === 'admin' ||
          profileData.role === 'it' ||
          profileData.role === 'user'
        ) {
          setRole(profileData.role);
          return;
        }
      }

      setRole(null);
    };

    const loadSessionAndProfile = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      setSession(session);

      if (session?.user) {
        await fetchRole(session.user.id);
      } else {
        setRole(null);
      }

      setLoading(false);
    };

    loadSessionAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session?.user) {
        setRole(null);
        return;
      }

      void fetchRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
  session,
  user: session?.user ?? null,
  role,
  loading,
};

};
