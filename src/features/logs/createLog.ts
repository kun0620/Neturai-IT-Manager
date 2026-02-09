import { supabase } from '@/lib/supabase';

type CreateLogInput = {
  action: string;
  userId: string | null;
  details?: Record<string, unknown>;
};

export async function createLog({
  action,
  userId,
  details,
}: CreateLogInput) {
  const { error } = await supabase.from('logs').insert({
    action,
    user_id: userId,
    details: details ?? {},
  });

  if (error) {
    // best-effort: ignore log failures
  }
}
