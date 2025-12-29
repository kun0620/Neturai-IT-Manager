import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type UserRole = 'user' | 'it' | 'admin';

export function useCurrentProfile() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // 1) ดึง user จาก Supabase Auth
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setRole(null);
          setLoading(false);
          return;
        }

        // 2) ดึง role จากตาราง profiles (id = auth.users.id)
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[useCurrentProfile] Failed to load profile:', error);
          setRole('user'); // fallback ปลอดภัยสุด
        } else {
          setRole((data?.role as UserRole) ?? 'user');
        }
      } catch (err) {
        console.error('[useCurrentProfile] Unexpected error:', err);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  return {
    role,
    loading,
    isUser: role === 'user',
    isIT: role === 'it',
    isAdmin: role === 'admin',
    canManageTickets: role === 'it' || role === 'admin',
  };
}
