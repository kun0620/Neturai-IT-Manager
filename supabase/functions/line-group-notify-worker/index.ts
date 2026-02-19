import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

type NotificationJob = {
  id: string;
  channel: string;
  event_type: string;
  ticket_id: string | null;
  payload: Record<string, unknown> | null;
  attempts: number;
  status: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-worker-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_RETRIES = 5;

function responseJson(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toRetryDelayMinutes(attempt: number) {
  return Math.min(Math.pow(2, Math.max(attempt - 1, 0)), 60);
}

function buildLineText(job: NotificationJob) {
  const payload = job.payload ?? {};
  const title = String(payload.title ?? job.event_type ?? 'Ticket update');
  const body = String(payload.body ?? '').trim();
  const priority = String(payload.priority ?? '').trim();
  const ticketId = job.ticket_id ?? String(payload.ticket_id ?? '').trim();
  const appBaseUrl = (Deno.env.get('APP_BASE_URL') ?? '').trim();

  const lines = [title];
  if (priority) lines.push(`Priority: ${priority}`);
  if (body) lines.push(body);
  if (ticketId) lines.push(`Ticket ID: ${ticketId}`);
  if (appBaseUrl && ticketId) {
    try {
      const url = new URL('/tickets', appBaseUrl);
      url.searchParams.set('open_ticket', ticketId);
      lines.push(`Open: ${url.toString()}`);
    } catch {
      // Ignore malformed APP_BASE_URL and continue sending base message.
    }
  }

  return lines.join('\n').slice(0, 5000);
}

async function sendLineMessage(text: string) {
  const lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
  const lineGroupId = Deno.env.get('LINE_GROUP_ID');
  if (!lineToken || !lineGroupId) {
    throw new Error('LINE config missing (LINE_CHANNEL_ACCESS_TOKEN / LINE_GROUP_ID)');
  }

  const resp = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lineToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: lineGroupId,
      messages: [{ type: 'text', text }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`LINE API ${resp.status}: ${body}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return responseJson(405, { error: 'Method Not Allowed' });
  }

  const workerSecret = Deno.env.get('LINE_WORKER_SECRET');
  if (workerSecret) {
    const providedSecret = req.headers.get('x-worker-secret');
    if (providedSecret !== workerSecret) {
      return responseJson(401, { error: 'Unauthorized worker request' });
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return responseJson(500, { error: 'Supabase env missing' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let batchSize = 20;
  try {
    const body = await req.json();
    if (typeof body?.batchSize === 'number') {
      batchSize = Math.max(1, Math.min(100, Math.floor(body.batchSize)));
    }
  } catch {
    // Empty body is valid.
  }

  const nowIso = new Date().toISOString();
  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from('notification_jobs')
    .select('id, channel, event_type, ticket_id, payload, attempts, status')
    .eq('channel', 'line_group')
    .eq('status', 'pending')
    .lte('scheduled_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (jobsError) {
    return responseJson(500, { error: jobsError.message });
  }

  let claimed = 0;
  let sent = 0;
  let retryScheduled = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const job of (jobs ?? []) as NotificationJob[]) {
    const nextAttempt = (job.attempts ?? 0) + 1;
    const { data: claimedRow, error: claimError } = await supabaseAdmin
      .from('notification_jobs')
      .update({ status: 'processing', attempts: nextAttempt, last_error: null })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id')
      .single();

    if (claimError || !claimedRow) {
      continue;
    }
    claimed += 1;

    try {
      await sendLineMessage(buildLineText(job));
      const { error: markSentError } = await supabaseAdmin
        .from('notification_jobs')
        .update({
          status: 'sent',
          processed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', job.id);

      if (markSentError) {
        failed += 1;
        errors.push(`${job.id}: ${markSentError.message}`);
      } else {
        sent += 1;
      }
    } catch (err) {
      const rawError = err instanceof Error ? err.message : String(err);
      const isRetryable =
        /LINE API (429|5\d\d)/.test(rawError) || /fetch/i.test(rawError);
      const shouldRetry = isRetryable && nextAttempt < MAX_RETRIES;
      const lastError = rawError.slice(0, 500);

      if (shouldRetry) {
        const retryAt = new Date();
        retryAt.setMinutes(retryAt.getMinutes() + toRetryDelayMinutes(nextAttempt));
        const { error: retryError } = await supabaseAdmin
          .from('notification_jobs')
          .update({
            status: 'pending',
            scheduled_at: retryAt.toISOString(),
            last_error: lastError,
          })
          .eq('id', job.id);

        if (retryError) {
          failed += 1;
          errors.push(`${job.id}: ${retryError.message}`);
        } else {
          retryScheduled += 1;
        }
      } else {
        const { error: failError } = await supabaseAdmin
          .from('notification_jobs')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            last_error: lastError,
          })
          .eq('id', job.id);

        if (failError) {
          errors.push(`${job.id}: ${failError.message}`);
        }
        failed += 1;
      }
    }
  }

  return responseJson(200, {
    scanned: jobs?.length ?? 0,
    claimed,
    sent,
    retryScheduled,
    failed,
    errors,
  });
});
