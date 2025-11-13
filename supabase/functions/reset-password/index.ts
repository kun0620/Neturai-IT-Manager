import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

    serve(async (req) => {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 405,
        });
      }

      const { email } = await req.json();

      if (!email) {
        return new Response(JSON.stringify({ error: 'Missing required field: email' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      try {
        // 1. Generate password reset link
        const { data, error: authError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'password_reset',
          email,
        });

        if (authError) {
          console.error('Supabase Auth Generate Link Error:', authError.message);
          return new Response(JSON.stringify({ error: authError.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // 2. Log the action
        const { data: userDetails, error: fetchUserError } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .eq('email', email)
          .single();

        if (fetchUserError) {
          console.warn(`Could not fetch user details for logging password reset for email ${email}: ${fetchUserError.message}`);
        }

        await supabaseAdmin.from('logs').insert({
          user_id: userDetails?.id,
          action: 'PASSWORD_RESET_INITIATED',
          details: {
            initiatedBy: req.headers.get('x-supabase-user-id'),
            email,
            resetLink: data.properties?.action_link, // Log the link for audit purposes (optional, be careful with sensitive data)
          },
        });

        return new Response(JSON.stringify({ message: 'Password reset email sent' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (error) {
        console.error('Edge Function Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    });
