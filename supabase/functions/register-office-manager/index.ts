// supabase/functions/register-office-manager/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

interface ManagerPayload {
  name: string;
  email: string;
  phone: string; // Corrected from phone_number to match frontend payload
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
    if (!payload.phone) {
        throw new Error("Phone number is required");
    }

    const {
      data: { user: newAuthUser },
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      phone: payload.phone, // Use the phone number for auth as well
      email_confirm: false, 
      user_metadata: {
        name: payload.name,
        phone: payload.phone,
        officeName: payload.officeName,
        role: 'مدير المكتب',
      },
    });

    if (authError) {
      if (authError.message.includes('Email rate limit exceeded')) {
        throw new Error('تم تجاوز حد إرسال رسائل البريد الإلكتروني. يرجى المحاولة مرة أخرى لاحقًا.');
      }
      if (authError.message.includes('User already registered')) {
        throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل.');
      }
      throw new Error(`Auth Error: ${authError.message}`);
    }
    if (!newAuthUser) {
      throw new Error('Failed to create auth user.');
    }

    const { error: publicUserError } = await supabaseAdmin.from('users').insert({
      id: newAuthUser.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      officeName: payload.officeName,
      role: 'مدير المكتب',
      status: 'معلق',
    });

    if (publicUserError) {
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id);
      throw new Error(
        `Failed to create user in public table: ${publicUserError.message}`
      );
    }

    const { error: sendError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: payload.email,
    });

    if (sendError) {
        console.error("Could not send confirmation email:", sendError.message);
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
