import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GetQRCodePayload {
  organization_id: string;
}

async function fetchQRCodeWithRetry(
  evolutionUrl: string, apiKey: string, instanceName: string, maxRetries: number = 3
): Promise<{ success: boolean; data?: any; error?: string; status?: number }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`QR Code fetch attempt ${attempt}/${maxRetries} for ${instanceName}`);
    try {
      const response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: "GET", headers: { "apikey": apiKey },
      });
      const data = await response.json();
      console.log(`Attempt ${attempt} response:`, JSON.stringify(data));
      if (!response.ok) {
        if (response.status === 404) return { success: false, error: "Instância não encontrada. Clique em 'Conectar WhatsApp' para criar uma nova.", status: 404 };
        if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
        return { success: false, error: data.message || "Erro ao obter QR Code", status: response.status };
      }
      if (data.instance?.state === "open") return { success: true, data: { connected: true, state: "open" } };
      const qrBase64 = data.base64 || data.qrcode?.base64;
      if (qrBase64) return { success: true, data: { qrcode: qrBase64, code: data.code || data.qrcode?.code } };
      if (attempt < maxRetries) { console.log("No QR code in response, waiting..."); await new Promise(r => setTimeout(r, 1500)); }
    } catch (err) {
      console.error(`Attempt ${attempt} error:`, err);
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return { success: false, error: "Não foi possível obter o QR Code. Aguarde alguns segundos e tente novamente." };
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
      return new Response(JSON.stringify({ error: "WhatsApp não configurado pelo administrador do sistema", code: "GLOBAL_CONFIG_MISSING" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload: GetQRCodePayload = await req.json();
    const { organization_id } = payload;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller belongs to org
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    if (!profile || profile.organization_id !== organization_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch organization data
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("evolution_instance_name, whatsapp_connected")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organização não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!org.evolution_instance_name) {
      return new Response(JSON.stringify({ error: "Nenhuma instância configurada. Clique em 'Conectar WhatsApp' primeiro.", code: "INSTANCE_NOT_CREATED" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (org.whatsapp_connected) {
      return new Response(JSON.stringify({ connected: true, message: "WhatsApp já está conectado" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Fetching QR Code for instance: ${org.evolution_instance_name}`);
    const result = await fetchQRCodeWithRetry(globalEvolutionUrl, globalEvolutionKey, org.evolution_instance_name);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: result.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (result.data?.connected) {
      await supabase.from("organizations").update({ whatsapp_connected: true, whatsapp_connected_at: new Date().toISOString() }).eq("id", organization_id);
      return new Response(JSON.stringify({ connected: true, message: "WhatsApp conectado com sucesso" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ success: true, qrcode: result.data?.qrcode, code: result.data?.code }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-whatsapp-qrcode:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
