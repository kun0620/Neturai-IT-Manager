import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'it' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const loadSessionAndProfile = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    setSession(session);

    if (session?.user) {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!error && profileData?.role) {
        if (
          profileData.role === 'admin' ||
          profileData.role === 'it' ||
          profileData.role === 'user'
        ) {
          setRole(profileData.role);
        } else {
          setRole(null);
        }
      } else {
        setRole(null);
      }
    }
    setLoading(false);
  };

  loadSessionAndProfile();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    if (!session) {
      setRole(null);
    }
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
