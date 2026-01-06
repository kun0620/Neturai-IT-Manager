import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'user' | 'it' | 'admin';

type Profile = {
  id: string;
  role: UserRole;
};

export function useCurrentProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
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
          setProfile(null);
          setLoading(false);
          return;
        }

        // 2) ดึง profile จากตาราง profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          console.error('[useCurrentProfile] Failed to load profile:', error);
          // fallback ปลอดภัย
          setProfile({
            id: user.id,
            role: 'user',
          });
        } else {
          setProfile({
            id: data.id,
            role: (data.role as UserRole) ?? 'user',
          });
        }
      } catch (err) {
        console.error('[useCurrentProfile] Unexpected error:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const role = profile?.role ?? null;

  return {
    profile, // ✅ ตอนนี้มีจริง
    role,
    loading,
    isUser: role === 'user',
    isIT: role === 'it',
    isAdmin: role === 'admin',
    canManageTickets: role === 'it' || role === 'admin',
  };
}
