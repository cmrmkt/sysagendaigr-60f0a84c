import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginRequest {
  phone: string;
  phoneCountry: string; // 'BR', 'US', 'CA', 'PT' or 'EMAIL'
  password: string;
}

// Convert phone to internal email format
const phoneToEmail = (phone: string, phoneCountry: string): string => {
  let cleanPhone = phone.replace(/\D/g, "");
  
  if (phoneCountry === "BR" && cleanPhone.length === 13 && cleanPhone.startsWith("55")) {
    cleanPhone = cleanPhone.substring(2);
  } else if ((phoneCountry === "US" || phoneCountry === "CA") && cleanPhone.length === 11 && cleanPhone.startsWith("1")) {
    cleanPhone = cleanPhone.substring(1);
  } else if (phoneCountry === "PT" && cleanPhone.length === 12 && cleanPhone.startsWith("351")) {
    cleanPhone = cleanPhone.substring(3);
  }
  
  const countryCode = phoneCountry === "BR" ? "55" : phoneCountry === "PT" ? "351" : "1";
  return `${countryCode}${cleanPhone}@phone.agendaigr.app`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body: LoginRequest = await req.json();
    const { phone, phoneCountry, password } = body;

    if (!phone || !phoneCountry || !password) {
      return new Response(
        JSON.stringify({ error: "Credenciais são obrigatórias" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the email to use for auth
    let email: string;
    if (phoneCountry === "EMAIL") {
      // Direct email login
      email = phone.trim().toLowerCase();
      if (!email.includes("@") || email.length < 5) {
        return new Response(
          JSON.stringify({ error: "E-mail inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      email = phoneToEmail(phone, phoneCountry);
    }

    console.log(`Login attempt for: ${email}`);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Attempt login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // If email login failed, maybe the user registered with email but we need to look it up in profiles
      if (phoneCountry === "EMAIL") {
        // Try finding user by profile email and use their internal auth email
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: profileByEmail } = await supabaseAdmin
          .from("profiles")
          .select("id, phone, phone_country")
          .eq("email", email)
          .maybeSingle();

        if (profileByEmail?.phone && profileByEmail?.phone_country) {
          const internalEmail = phoneToEmail(profileByEmail.phone, profileByEmail.phone_country);
          const { data: retryAuth, error: retryError } = await supabase.auth.signInWithPassword({
            email: internalEmail,
            password,
          });

          if (!retryError && retryAuth?.session) {
            // Success via profile email lookup
            return await buildSuccessResponse(supabaseUrl, supabaseServiceKey, retryAuth);
          }
        }
      }

      console.error("Auth error:", authError.message, "| email tried:", email);
      return new Response(
        JSON.stringify({ error: "Credenciais incorretas. Verifique e tente novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return await buildSuccessResponse(supabaseUrl, supabaseServiceKey, authData);

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function buildSuccessResponse(
  supabaseUrl: string,
  supabaseServiceKey: string,
  authData: { session: any; user: any }
) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) console.error("Profile fetch error:", profileError);

  if (!profile) {
    return new Response(
      JSON.stringify({ error: "Credenciais incorretas. Verifique e tente novamente." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let organization = null;
  if (profile?.organization_id) {
    await supabaseAdmin
      .from("organizations")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", profile.organization_id);

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .maybeSingle();

    if (orgError) console.error("Organization fetch error:", orgError);
    else organization = org;

    if (organization && organization.status === "suspended") {
      return new Response(
        JSON.stringify({ error: "Sua igreja está suspensa. Entre em contato com o suporte." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  console.log(`Login successful for user: ${authData.user.id}`);

  return new Response(
    JSON.stringify({
      session: authData.session,
      user: authData.user,
      profile,
      organization,
      role: roleData?.role || "viewer",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
