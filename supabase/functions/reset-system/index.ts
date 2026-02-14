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

    const { resetKey, phone, phoneCountry } = await req.json();
    
    // Security check
    if (resetKey !== "RESET_SYSTEM_2024_SECURE") {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid reset key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Starting system reset...");

    // PART 1: Delete all data from tables (respecting foreign keys order)
    const tablesToClear = [
      "scheduled_reminders",
      "push_subscriptions",
      "usage_logs",
      "invoices",
      "event_tasks",
      "event_volunteers",
      "event_collaborators",
      "event_collaborator_ministries",
      "events",
      "event_templates",
      "announcements",
      "user_ministries",
      "user_roles",
      "profiles",
      "ministries",
      "organizations",
    ];

    for (const table of tablesToClear) {
      console.log(`Clearing table: ${table}`);
      const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        console.error(`Error clearing ${table}:`, error.message);
      }
    }

    console.log("All tables cleared");

    // PART 2: Delete all auth users
    console.log("Deleting all auth users...");
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError.message);
    } else if (authUsers?.users) {
      for (const user of authUsers.users) {
        console.log(`Deleting auth user: ${user.id}`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError.message);
        }
      }
    }

    console.log("All auth users deleted");

    // PART 3: Create system organization
    const orgId = "00000000-0000-0000-0000-000000000001";
    console.log("Creating system organization...");
    
    const { error: orgError } = await supabase
      .from("organizations")
      .insert({
        id: orgId,
        name: "Sistema AgendaIGR",
        slug: "sistema",
        status: "active",
        subscription_status: "active",
        country_code: phoneCountry || "BR",
      });

    if (orgError) {
      console.error("Error creating organization:", orgError);
      return new Response(
        JSON.stringify({ error: "Failed to create organization", details: orgError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PART 4: Create super admin user
    const cleanPhone = (phone || "32999926735").replace(/\D/g, "");
    const countryCode = phoneCountry === "US" ? "1" : "55";
    const email = `${countryCode}${cleanPhone}@phone.agendaigr.app`;
    const password = "SuperAdmin@2024!";

    console.log(`Creating super admin with email: ${email}`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Super Admin" },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create auth user", details: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    console.log(`Auth user created: ${userId}`);

    // Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        organization_id: orgId,
        name: "Super Admin",
        phone: cleanPhone,
        phone_country: phoneCountry || "BR",
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create profile", details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign super_admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "super_admin",
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // Format phone for display
    const displayPhone = phoneCountry === "US"
      ? cleanPhone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
      : cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");

    console.log("System reset completed successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sistema resetado com sucesso!",
        credentials: {
          phone: displayPhone,
          phoneCountry: phoneCountry || "BR",
          password: "SuperAdmin@2024!",
          note: "Altere a senha após o primeiro login!",
        },
        stats: {
          tablesCleared: tablesToClear.length,
          usersDeleted: authUsers?.users?.length || 0,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
