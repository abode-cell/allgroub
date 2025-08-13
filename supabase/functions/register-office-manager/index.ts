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
    if (!payload.phone) {
        throw new Error("Phone number is required");
    }
     if (!payload.officeName) {
        throw new Error("Office name is required");
    }


    const {
      data: { user: newAuthUser },
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
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
    
    // Fetch default trial period days from config
    const { data: configData, error: configError } = await supabaseAdmin
        .from('app_config')
        .select('value')
        .eq('key', 'defaultTrialPeriodDays')
        .single();
    
    if (configError) throw new Error(`Could not fetch trial period config: ${configError.message}`);
    
    const trialDays = configData.value.value || 14;
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);


    const { error: publicUserError } = await supabaseAdmin.from('users').insert({
      id: newAuthUser.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      officeName: payload.officeName,
      role: 'مدير المكتب',
      status: 'معلق',
      investorLimit: 10,
      employeeLimit: 5,
      assistantLimit: 2,
      branchLimit: 3,
      allowEmployeeSubmissions: true,
      hideEmployeeInvestorFunds: false,
      allowEmployeeLoanEdits: false,
      trialEndsAt: trialEndDate.toISOString(),
      registrationDate: new Date().toISOString(),
    });

    if (publicUserError) {
      // If inserting into users fails, delete the auth user to keep things clean
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id);
      throw new Error(
        `Failed to create user in public table: ${publicUserError.message}`
      );
    }
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: payload.email,
    });

    if (linkError) {
      console.error("Could not generate confirmation email link:", linkError.message);
    }

    return new Response(
      JSON.stringify({ success: true, userId: newAuthUser.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
