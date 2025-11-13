import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

    serve(async (req) => {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 405,
        });
      }

      const { userId } = await req.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing required field: userId' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      try {
        // 1. Get user details for logging before deletion
        const { data: userToDelete, error: fetchUserError } = await supabaseAdmin
          .from('users')
          .select('email, name, role_id')
          .eq('id', userId)
          .single();

        if (fetchUserError) {
          console.warn(`Could not fetch user ${userId} for logging before deletion: ${fetchUserError.message}`);
          // Continue with deletion even if logging info is incomplete
        }

        // 2. Delete user from Supabase Auth (this will cascade delete from public.users due to FK)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
          console.error('Supabase Auth Delete Error:', authError.message);
          return new Response(JSON.stringify({ error: authError.message }), {
            headers: { 'Content-Type': 'application/json' },
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
            role_id: userToDelete?.role_id,
          },
        });

        return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
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
