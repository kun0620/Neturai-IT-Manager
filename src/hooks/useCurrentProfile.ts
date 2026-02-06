import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';
import { notifyError } from '@/lib/notify';

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
          notifyError('Failed to load profile', error?.message ?? 'Unknown error');
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
        notifyError('Failed to load profile', 'Unexpected error');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const role = profile?.role ?? null;

  return {
    profile,
    role,
    loading,

    isUser: role === 'user',
    isIT: role === 'it',
    isAdmin: role === 'admin',

    can: (permission: Permission) =>
    role ? hasPermission(role, permission) : false,
  };
}
