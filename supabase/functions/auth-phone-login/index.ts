import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginRequest {
  phone: string;
  phoneCountry: string; // 'BR' or 'US'
  password: string;
}

// Convert phone to internal email format
const phoneToEmail = (phone: string, phoneCountry: string): string => {
  // Remove all non-numeric characters
  let cleanPhone = phone.replace(/\D/g, "");
  
  // Normalize: strip leading country code if user included it
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body: LoginRequest = await req.json();
    const { phone, phoneCountry, password } = body;

    // Validation
    if (!phone || !phoneCountry || !password) {
      return new Response(
        JSON.stringify({ error: "Telefone e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = phoneToEmail(phone, phoneCountry);

    console.log(`Login attempt for: ${email}`);

    // Create regular client for authentication
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Attempt login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("Auth error:", authError.message, "| email tried:", email);
      return new Response(
        JSON.stringify({ error: `Telefone ou senha incorretos. Verifique se o país e número estão corretos. (Detalhe: ${authError.message})` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to fetch profile and organization
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
    }

    // Block login if profile doesn't exist (member was deleted)
    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Telefone ou senha incorretos. Verifique se o país e número estão corretos." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch organization and update last login
    let organization = null;
    if (profile?.organization_id) {
      // Update last_login_at
      await supabaseAdmin
        .from("organizations")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", profile.organization_id);

      const { data: org, error: orgError } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .maybeSingle();

      if (orgError) {
        console.error("Organization fetch error:", orgError);
      } else {
        organization = org;
      }

      // Check if organization is suspended (manual block by Super Admin)
      if (organization && organization.status === "suspended") {
        return new Response(
          JSON.stringify({ 
            error: "Sua igreja está suspensa. Entre em contato com o suporte."
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch user role
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

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
