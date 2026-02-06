import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useUserNames(userIds: (string | null | undefined)[]) {
  const ids = useMemo(
    () =>
      Array.from(
        new Set(
          userIds.filter((id): id is string => Boolean(id))
        )
      ).sort(),
    [userIds]
  );

  const query = useQuery({
    queryKey: ['user-names', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', ids);

      if (error) throw error;
      return data ?? [];
    },
  });

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    query.data?.forEach((u) => {
      if (u?.id && u?.name) map[u.id] = u.name;
    });
    return map;
  }, [query.data]);

  return {
    ...query,
    nameMap,
  };
}
