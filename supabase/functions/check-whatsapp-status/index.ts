import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckStatusPayload {
  organization_id: string;
}

interface ConnectionStateResponse {
  instance?: { instanceName: string; state: string; owner?: string; profileName?: string; profilePictureUrl?: string };
  error?: string;
  message?: string;
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

    // --- Auth validation ---
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
      return new Response(
        JSON.stringify({ error: "WhatsApp não configurado pelo administrador do sistema", code: "GLOBAL_CONFIG_MISSING" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: CheckStatusPayload = await req.json();
    const { organization_id } = payload;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller belongs to the org
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    if (!profile || profile.organization_id !== organization_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch organization data
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("whatsapp_connected, whatsapp_phone_number")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organização não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch credentials from dedicated table
    const { data: creds } = await supabase
      .from("organization_credentials")
      .select("evolution_instance_name")
      .eq("organization_id", organization_id)
      .single();

    if (!creds?.evolution_instance_name) {
      return new Response(
        JSON.stringify({ connected: false, state: "not_created", message: "Instância não criada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const evolutionUrl = `${globalEvolutionUrl}/instance/connectionState/${creds.evolution_instance_name}`;
    console.log("Checking connection state:", evolutionUrl);
    
    const response = await fetch(evolutionUrl, { method: "GET", headers: { "apikey": globalEvolutionKey } });
    const responseData = await response.json() as ConnectionStateResponse;
    console.log("Connection state response:", JSON.stringify(responseData));

    if (!response.ok) {
      if (response.status === 404) {
        await supabase.from("organization_credentials").update({
          evolution_instance_name: null,
        }).eq("organization_id", organization_id);
        await supabase.from("organizations").update({
          whatsapp_connected: false, whatsapp_connected_at: null, whatsapp_phone_number: null,
        }).eq("id", organization_id);
        return new Response(JSON.stringify({ connected: false, state: "not_found", message: "Instância não encontrada" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: responseData.message || "Erro ao verificar status", state: "error" }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const state = responseData.instance?.state || "unknown";
    const isConnected = state === "open";

    if (isConnected && !org.whatsapp_connected) {
      const phoneNumber = responseData.instance?.owner?.replace("@s.whatsapp.net", "") || null;
      await supabase.from("organizations").update({ whatsapp_connected: true, whatsapp_connected_at: new Date().toISOString(), whatsapp_phone_number: phoneNumber }).eq("id", organization_id);
      console.log(`Organization ${organization_id} WhatsApp connected: ${phoneNumber}`);
    } else if (!isConnected && org.whatsapp_connected) {
      await supabase.from("organizations").update({ whatsapp_connected: false }).eq("id", organization_id);
      console.log(`Organization ${organization_id} WhatsApp disconnected`);
    }

    return new Response(
      JSON.stringify({
        connected: isConnected, state,
        phoneNumber: responseData.instance?.owner?.replace("@s.whatsapp.net", ""),
        profileName: responseData.instance?.profileName,
        profilePictureUrl: responseData.instance?.profilePictureUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-whatsapp-status:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
