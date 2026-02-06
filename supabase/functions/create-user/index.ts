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

  const { email, password, name, role } = await req.json();

  if (!email || !password || !name || !role) {
    return new Response(
      JSON.stringify({
        error: 'Missing required fields: email, password, name, role',
      }),
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

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error('Supabase Auth Error:', authError.message);
      return new Response(JSON.stringify({ error: authError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const newAuthUser = authData.user;

    if (!newAuthUser) {
      return new Response(
        JSON.stringify({ error: 'Failed to create auth user.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // 2. Create user profile in public.profiles table
    const { data: userProfile, error: userProfileError } =
      await supabaseAdmin
        .from('profiles')
        .insert({
          id: newAuthUser.id,
          email: newAuthUser.email,
          name,
          role,
        })
        .select()
        .single();

    if (userProfileError || !userProfile) {
      // If profile creation fails, attempt to delete the auth user to prevent orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id);
      console.error(
        'Supabase Profile Error:',
        userProfileError?.message ?? 'Unknown error'
      );
      return new Response(
        JSON.stringify({
          error: userProfileError?.message ?? 'Profile creation failed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 3. Log the action
    await supabaseAdmin.from('logs').insert({
      user_id: newAuthUser.id,
      action: 'USER_CREATED',
      details: {
        createdBy: req.headers.get('x-supabase-user-id'),
        email,
        name,
        role,
      },
    });

    return new Response(JSON.stringify({ user: userProfile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
