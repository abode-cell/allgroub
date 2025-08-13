// supabase/functions/register-office-manager/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

interface ManagerPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  officeName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: ManagerPayload = await req.json();
    if (!payload.password) {
      throw new Error('Password is required');
    }

    // Step 1: Create the user in the auth schema
    const {
      data: { user: newAuthUser },
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: false, // User will confirm via link
      user_metadata: {
        name: payload.name,
        phone: payload.phone,
        officeName: payload.officeName,
        role: 'مدير المكتب',
      },
    });

    if (authError) {
      if (authError.message.includes('Email rate limit exceeded')) {
        throw new Error(
          'تم تجاوز حد إرسال رسائل البريد الإلكتروني. يرجى المحاولة مرة أخرى لاحقًا.'
        );
      }
      if (authError.message.includes('User already registered')) {
        throw new Error('البريد الإلكتروني مسجل بالفعل.');
      }
      throw new Error(`Auth Error: ${authError.message}`);
    }
    if (!newAuthUser) {
      throw new Error('Failed to create auth user.');
    }

    // Step 2: Manually insert into the public.users table
    // Note: We are not setting managedBy here. A system admin can be associated later if needed.
    const { error: publicUserError } = await supabaseAdmin.from('users').insert({
      id: newAuthUser.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      officeName: payload.officeName,
      role: 'مدير المكتب',
      status: 'معلق', // Managers start as pending until activated by a system admin
    });

    if (publicUserError) {
      // If this fails, we must delete the auth user to avoid orphans.
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id);
      throw new Error(
        `Failed to create user in public table: ${publicUserError.message}`
      );
    }
    
    // Step 3: Send the confirmation email
    const { error: sendError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: payload.email,
        options: {
            redirectTo: `${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/auth-confirmed`
        }
    });

    if (sendError) {
        console.error("Could not send confirmation email:", sendError.message);
        // We don't throw an error here, as the user is already created.
        // The admin can resend the invite later.
    }


    return new Response(
      JSON.stringify({ success: true, userId: newAuthUser.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
