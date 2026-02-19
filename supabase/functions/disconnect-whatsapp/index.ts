import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DisconnectPayload {
  organization_id: string;
  delete_instance?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const globalEvolutionUrl = Deno.env.get("GLOBAL_EVOLUTION_API_URL");
    const globalEvolutionKey = Deno.env.get("GLOBAL_EVOLUTION_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Auth validation: require authenticated admin ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!globalEvolutionUrl || !globalEvolutionKey) {
      return new Response(JSON.stringify({ error: "WhatsApp não configurado pelo administrador do sistema", code: "GLOBAL_CONFIG_MISSING" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload: DisconnectPayload = await req.json();
    const { organization_id, delete_instance = false } = payload;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller belongs to org and is admin
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    if (!profile || profile.organization_id !== organization_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).in("role", ["admin", "super_admin"]).limit(1);
    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch credentials from dedicated table
    const { data: creds } = await supabase
      .from("organization_credentials")
      .select("evolution_instance_name")
      .eq("organization_id", organization_id)
      .single();

    // Also fetch org status
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("whatsapp_connected")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organização não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!creds?.evolution_instance_name) {
      return new Response(JSON.stringify({ success: true, message: "Nenhuma instância para desconectar" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (delete_instance) {
      const evolutionUrl = `${globalEvolutionUrl}/instance/delete/${creds.evolution_instance_name}`;
      console.log("Deleting instance:", evolutionUrl);
      const response = await fetch(evolutionUrl, { method: "DELETE", headers: { "apikey": globalEvolutionKey } });
      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        console.error("Error deleting instance:", errorData);
      }
    } else {
      const evolutionUrl = `${globalEvolutionUrl}/instance/logout/${creds.evolution_instance_name}`;
      console.log("Logging out instance:", evolutionUrl);
      const response = await fetch(evolutionUrl, { method: "DELETE", headers: { "apikey": globalEvolutionKey } });
      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        console.error("Error logging out instance:", errorData);
      }
    }

    // Update credentials table
    if (delete_instance) {
      await supabase.from("organization_credentials").update({
        evolution_instance_name: null, evolution_api_url: null, evolution_api_key: null,
      }).eq("organization_id", organization_id);
    }

    // Update organizations table
    const updateData = delete_instance
      ? { whatsapp_connected: false, whatsapp_connected_at: null, whatsapp_phone_number: null }
      : { whatsapp_connected: false, whatsapp_connected_at: null, whatsapp_phone_number: null };

    const { error: updateError } = await supabase.from("organizations").update(updateData).eq("id", organization_id);
    if (updateError) console.error("Error updating organization:", updateError);

    console.log(`Organization ${organization_id} WhatsApp disconnected (delete_instance: ${delete_instance})`);

    return new Response(
      JSON.stringify({ success: true, message: delete_instance ? "Instância removida com sucesso" : "WhatsApp desconectado com sucesso", instanceDeleted: delete_instance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in disconnect-whatsapp:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
