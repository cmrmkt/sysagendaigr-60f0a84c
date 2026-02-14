import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Secret key to authorize this setup (prevents unauthorized calls)
    const { setupKey } = await req.json();
    
    if (setupKey !== "SETUP_SUPER_ADMIN_2024") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if super admin already exists
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role", "super_admin")
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ error: "Super admin já existe", exists: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create system organization
    const orgId = "00000000-0000-0000-0000-000000000001";
    const { error: orgError } = await supabase
      .from("organizations")
      .upsert({
        id: orgId,
        name: "Sistema AgendaIGR",
        slug: "sistema",
        status: "active",
        subscription_status: "active",
        country_code: "BR",
      }, { onConflict: "id" });

    if (orgError) {
      console.error("Org error:", orgError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar organização", details: orgError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create super admin user via Supabase Auth Admin API
    const email = "5500000000000@phone.agendaigr.app";
    const password = "SuperAdmin@2024!";

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Super Admin" },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário", details: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // 3. Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        organization_id: orgId,
        name: "Super Admin",
        phone: "00000000000",
        phone_country: "BR",
      });

    if (profileError) {
      console.error("Profile error:", profileError);
      // Cleanup: delete auth user if profile fails
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Erro ao criar perfil", details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Assign super_admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "super_admin",
      });

    if (roleError) {
      console.error("Role error:", roleError);
      return new Response(
        JSON.stringify({ error: "Erro ao atribuir role", details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Super admin created successfully:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Super Admin criado com sucesso!",
        credentials: {
          phone: "00000000000",
          phoneCountry: "BR",
          password: "SuperAdmin@2024!",
          note: "Altere a senha após o primeiro login!",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
