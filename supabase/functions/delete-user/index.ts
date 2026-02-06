import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  const { userId } = await req.json();

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: userId' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: requesterData, error: requesterError } =
      await supabaseAdmin.auth.getUser(jwt);

    if (requesterError || !requesterData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', requesterData.user.id)
      .single();

    const requesterRole = String(requesterProfile?.role ?? '').toLowerCase();
    const allowedRoles = ['admin', 'manager', 'it'];
    if (!allowedRoles.includes(requesterRole)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 1. Get user details for logging before deletion
    const { data: userToDelete, error: fetchUserError } =
      await supabaseAdmin
        .from('profiles')
        .select('email, name, role')
        .eq('id', userId)
        .single();

    if (fetchUserError) {
      console.warn(
        `Could not fetch user ${userId} for logging before deletion: ${fetchUserError.message}`
      );
      // Continue with deletion even if logging info is incomplete
    }

    // 2. Delete user from Supabase Auth (this should cascade delete from public.profiles if FK is set)
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Supabase Auth Delete Error:', authError.message);
      return new Response(JSON.stringify({ error: authError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 3. Log the action
    await supabaseAdmin.from('logs').insert({
      user_id: userId, // Log with the deleted user's ID
      action: 'USER_DELETED',
      details: {
        deletedBy: req.headers.get('x-supabase-user-id'),
        userId,
        email: userToDelete?.email,
        name: userToDelete?.name,
        role: userToDelete?.role,
      },
    });

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
