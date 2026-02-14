import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateInstancePayload {
  organization_id: string;
}

interface EvolutionCreateResponse {
  instance?: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash?: string;
  qrcode?: {
    base64: string;
    code: string;
  };
  error?: string;
  message?: string | string[];
  status?: number;
  response?: {
    message?: string | string[];
  };
}

// Helper to extract error message from Evolution API response
function extractErrorMessage(responseData: EvolutionCreateResponse): string {
  // Check nested response.message first (403 errors use this format)
  const nestedMsg = responseData.response?.message;
  if (nestedMsg) {
    return Array.isArray(nestedMsg) ? nestedMsg[0] || "" : nestedMsg;
  }
  
  // Check top-level message
  const topMsg = responseData.message;
  if (topMsg) {
    return Array.isArray(topMsg) ? topMsg[0] || "" : topMsg;
  }
  
  // Fallback to error field
  return responseData.error || "";
}

// Helper to check if error indicates instance exists
function isInstanceExistsError(responseData: EvolutionCreateResponse): boolean {
  const message = extractErrorMessage(responseData).toLowerCase();
  return message.includes("already") || 
         message.includes("exists") || 
         message.includes("in use") ||
         message.includes("já existe");
}

// Fetch QR code for an existing instance with retry
async function fetchQRCodeWithRetry(
  evolutionUrl: string, 
  apiKey: string, 
  instanceName: string,
  maxRetries: number = 2
): Promise<{ success: boolean; data?: any; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Fetching QR Code attempt ${attempt}/${maxRetries} for ${instanceName}`);
    
    try {
      const response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: { "apikey": apiKey },
      });
      
      const data = await response.json();
      console.log(`QR fetch attempt ${attempt} response:`, JSON.stringify(data));
      
      // Check if connected
      if (data.instance?.state === "open") {
        return { success: true, data: { connected: true, state: "open" } };
      }
      
      // Check if QR code is available
      const qrBase64 = data.base64 || data.qrcode?.base64;
      if (qrBase64) {
        return { 
          success: true, 
          data: { 
            qrcode: qrBase64, 
            code: data.code || data.qrcode?.code 
          } 
        };
      }
      
      // If no QR and not connected, wait and retry
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(`QR fetch attempt ${attempt} error:`, err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
      }
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
    const globalEvolutionUrl = Deno.env.get("GLOBAL_EVOLUTION_API_URL");
    const globalEvolutionKey = Deno.env.get("GLOBAL_EVOLUTION_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate global configuration
    if (!globalEvolutionUrl || !globalEvolutionKey) {
      console.error("Global Evolution API not configured");
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp não configurado pelo administrador do sistema",
          code: "GLOBAL_CONFIG_MISSING"
        }),
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

    // Fetch organization data
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, slug, evolution_instance_name, whatsapp_connected")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      return new Response(
        JSON.stringify({ error: "Organização não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already connected, return error
    if (org.whatsapp_connected) {
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp já está conectado",
          code: "ALREADY_CONNECTED"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique instance name using org slug + short id
    const shortId = organization_id.substring(0, 8);
    const instanceName = org.evolution_instance_name || `igreja-${org.slug}-${shortId}`;

    console.log(`Creating instance: ${instanceName}`);

    // Create instance on Evolution API
    const evolutionUrl = `${globalEvolutionUrl}/instance/create`;
    
    const evolutionPayload = {
      instanceName: instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      rejectCall: true,
      msgCall: "Não recebemos ligações. Por favor, envie uma mensagem.",
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
    };

    console.log("Calling Evolution API:", evolutionUrl);
    
    const response = await fetch(evolutionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": globalEvolutionKey,
      },
      body: JSON.stringify(evolutionPayload),
    });

    const responseData = await response.json() as EvolutionCreateResponse;
    console.log("Evolution API response status:", response.status);
    console.log("Evolution API response:", JSON.stringify(responseData));

    // Handle instance creation failure
    if (!response.ok) {
      const errorMsg = extractErrorMessage(responseData);
      console.log("Error message extracted:", errorMsg);
      
      // Check if instance already exists
      if (isInstanceExistsError(responseData)) {
        console.log("Instance already exists, attempting to fetch QR code...");
        
        // Update organization with instance name first
        await supabase
          .from("organizations")
          .update({
            evolution_instance_name: instanceName,
            evolution_api_url: globalEvolutionUrl,
          })
          .eq("id", organization_id);
        
        // Try to get QR code
        const qrResult = await fetchQRCodeWithRetry(globalEvolutionUrl, globalEvolutionKey, instanceName);
        
        if (qrResult.success) {
          if (qrResult.data?.connected) {
            // Already connected
            await supabase
              .from("organizations")
              .update({
                whatsapp_connected: true,
                whatsapp_connected_at: new Date().toISOString(),
              })
              .eq("id", organization_id);

            return new Response(
              JSON.stringify({
                success: true,
                instanceName: instanceName,
                connected: true,
                message: "WhatsApp já está conectado",
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          // Return QR code
          return new Response(
            JSON.stringify({
              success: true,
              instanceName: instanceName,
              qrcode: qrResult.data?.qrcode,
              code: qrResult.data?.code,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // QR fetch failed, but instance exists - return success with instruction
        return new Response(
          JSON.stringify({
            success: true,
            instanceName: instanceName,
            needsRefresh: true,
            message: "Instância encontrada. Clique em 'Gerar Novo Código' para obter o QR Code.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Other error - return with clear message
      console.error("Evolution API error:", responseData);
      return new Response(
        JSON.stringify({ 
          error: errorMsg || "Erro ao criar instância WhatsApp",
          details: responseData
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success - save instance data to organization
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        evolution_instance_name: instanceName,
        evolution_api_url: globalEvolutionUrl,
        evolution_api_key: responseData.hash || null,
      })
      .eq("id", organization_id);

    if (updateError) {
      console.error("Error updating organization:", updateError);
    }

    // Return QR Code
    return new Response(
      JSON.stringify({
        success: true,
        instanceName: instanceName,
        qrcode: responseData.qrcode?.base64,
        code: responseData.qrcode?.code,
        hash: responseData.hash,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-whatsapp-instance:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
