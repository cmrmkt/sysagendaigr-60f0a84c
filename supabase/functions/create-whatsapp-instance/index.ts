import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateInstancePayload {
  organization_id: string;
}

interface EvolutionCreateResponse {
  instance?: { instanceName: string; instanceId: string; status: string };
  hash?: string;
  qrcode?: { base64: string; code: string };
  error?: string;
  message?: string | string[];
  status?: number;
  response?: { message?: string | string[] };
}

function extractErrorMessage(responseData: EvolutionCreateResponse): string {
  const nestedMsg = responseData.response?.message;
  if (nestedMsg) return Array.isArray(nestedMsg) ? nestedMsg[0] || "" : nestedMsg;
  const topMsg = responseData.message;
  if (topMsg) return Array.isArray(topMsg) ? topMsg[0] || "" : topMsg;
  return responseData.error || "";
}

function isInstanceExistsError(responseData: EvolutionCreateResponse): boolean {
  const message = extractErrorMessage(responseData).toLowerCase();
  return message.includes("already") || message.includes("exists") || message.includes("in use") || message.includes("já existe");
}

async function fetchQRCodeWithRetry(
  evolutionUrl: string, apiKey: string, instanceName: string, maxRetries: number = 2
): Promise<{ success: boolean; data?: any; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Fetching QR Code attempt ${attempt}/${maxRetries} for ${instanceName}`);
    try {
      const response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: "GET", headers: { "apikey": apiKey },
      });
      const data = await response.json();
      console.log(`QR fetch attempt ${attempt} response:`, JSON.stringify(data));
      if (data.instance?.state === "open") return { success: true, data: { connected: true, state: "open" } };
      const qrBase64 = data.base64 || data.qrcode?.base64;
      if (qrBase64) return { success: true, data: { qrcode: qrBase64, code: data.code || data.qrcode?.code } };
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`QR fetch attempt ${attempt} error:`, err);
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000));
    }
  }
  return { success: false, error: "Não foi possível obter o QR Code. Tente novamente." };
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate global configuration
    if (!globalEvolutionUrl || !globalEvolutionKey) {
      console.error("Global Evolution API not configured");
      return new Response(
        JSON.stringify({ error: "WhatsApp não configurado pelo administrador do sistema", code: "GLOBAL_CONFIG_MISSING" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: CreateInstancePayload = await req.json();
    console.log("Create WhatsApp instance request:", payload);

    const { organization_id } = payload;

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller belongs to the org and is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userData.user.id)
      .single();

    if (!profile || profile.organization_id !== organization_id) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "super_admin"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch organization data
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, slug, whatsapp_connected")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      return new Response(
        JSON.stringify({ error: "Organização não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (org.whatsapp_connected) {
      return new Response(
        JSON.stringify({ error: "WhatsApp já está conectado", code: "ALREADY_CONNECTED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check existing credentials
    const { data: existingCreds } = await supabase
      .from("organization_credentials")
      .select("evolution_instance_name")
      .eq("organization_id", organization_id)
      .single();

    const shortId = organization_id.substring(0, 8);
    const instanceName = existingCreds?.evolution_instance_name || `igreja-${org.slug}-${shortId}`;

    console.log(`Creating instance: ${instanceName}`);

    const evolutionUrl = `${globalEvolutionUrl}/instance/create`;
    const evolutionPayload = {
      instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true,
      rejectCall: true, msgCall: "Não recebemos ligações. Por favor, envie uma mensagem.",
      groupsIgnore: true, alwaysOnline: false, readMessages: false, readStatus: false, syncFullHistory: false,
    };

    console.log("Calling Evolution API:", evolutionUrl);
    
    const response = await fetch(evolutionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": globalEvolutionKey },
      body: JSON.stringify(evolutionPayload),
    });

    const responseData = await response.json() as EvolutionCreateResponse;
    console.log("Evolution API response status:", response.status);

    if (!response.ok) {
      const errorMsg = extractErrorMessage(responseData);
      
      if (isInstanceExistsError(responseData)) {
        console.log("Instance already exists, attempting to fetch QR code...");
        await supabase.from("organization_credentials").upsert({ organization_id, evolution_instance_name: instanceName, evolution_api_url: globalEvolutionUrl });
        
        const qrResult = await fetchQRCodeWithRetry(globalEvolutionUrl, globalEvolutionKey, instanceName);
        
        if (qrResult.success) {
          if (qrResult.data?.connected) {
            await supabase.from("organizations").update({ whatsapp_connected: true, whatsapp_connected_at: new Date().toISOString() }).eq("id", organization_id);
            return new Response(JSON.stringify({ success: true, instanceName, connected: true, message: "WhatsApp já está conectado" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          return new Response(JSON.stringify({ success: true, instanceName, qrcode: qrResult.data?.qrcode, code: qrResult.data?.code }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        return new Response(JSON.stringify({ success: true, instanceName, needsRefresh: true, message: "Instância encontrada. Clique em 'Gerar Novo Código' para obter o QR Code." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.error("Evolution API error:", responseData);
      return new Response(
        JSON.stringify({ error: errorMsg || "Erro ao criar instância WhatsApp" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase.from("organization_credentials").upsert({
      organization_id,
      evolution_instance_name: instanceName,
      evolution_api_url: globalEvolutionUrl,
      evolution_api_key: responseData.hash || null,
    });

    if (updateError) console.error("Error updating organization:", updateError);

    return new Response(
      JSON.stringify({ success: true, instanceName, qrcode: responseData.qrcode?.base64, code: responseData.qrcode?.code, hash: responseData.hash }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-whatsapp-instance:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
