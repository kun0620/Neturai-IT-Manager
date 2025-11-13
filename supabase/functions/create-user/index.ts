import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

    serve(async (req) => {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 405,
        });
      }

      const { email, password, name, role_id } = await req.json();

      if (!email || !password || !name || !role_id) {
        return new Response(JSON.stringify({ error: 'Missing required fields: email, password, name, role_id' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      try {
        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Automatically confirm email for admin-created users
        });

        if (authError) {
          console.error('Supabase Auth Error:', authError.message);
          return new Response(JSON.stringify({ error: authError.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        const newAuthUser = authData.user;

        if (!newAuthUser) {
          return new Response(JSON.stringify({ error: 'Failed to create auth user.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
          });
        }

        // 2. Create user profile in public.users table
        const { data: userProfile, error: userProfileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: newAuthUser.id,
            email: newAuthUser.email,
            name,
            role_id,
          })
          .select()
          .single();

        if (userProfileError) {
          // If profile creation fails, attempt to delete the auth user to prevent orphaned accounts
          await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id);
          console.error('Supabase User Profile Error:', userProfileError.message);
          return new Response(JSON.stringify({ error: userProfileError.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // 3. Log the action
        await supabaseAdmin.from('logs').insert({
          user_id: newAuthUser.id,
          action: 'USER_CREATED',
          details: { createdBy: req.headers.get('x-supabase-user-id'), email, name, role_id },
        });

        return new Response(JSON.stringify({ user: userProfile }), {
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
