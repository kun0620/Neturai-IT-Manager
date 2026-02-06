import { supabase } from '@/lib/supabase';

export type LogSystemActionParams = {
  action: string;
  details?: Record<string, any> | null;
  userId?: string | null;
};

/**
 * Write a system-wide audit log.
 * - Used for Settings → System Logs
 * - Should be human-readable via mapLogToText
 */
export async function logSystemAction({
  action,
  details = null,
  userId = null,
}: LogSystemActionParams) {
  const { error } = await supabase
    .from('logs')
    .insert({
      action,
      details,
      user_id: userId,
    });

  if (error) {
    // ไม่ block main transaction
  }
}
