import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GetQRCodePayload {
  organization_id: string;
}

// Fetch QR code with retry logic
async function fetchQRCodeWithRetry(
  evolutionUrl: string,
  apiKey: string,
  instanceName: string,
  maxRetries: number = 3
): Promise<{ success: boolean; data?: any; error?: string; status?: number }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`QR Code fetch attempt ${attempt}/${maxRetries} for ${instanceName}`);
    
    try {
      const response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: { "apikey": apiKey },
      });
      
      const data = await response.json();
      console.log(`Attempt ${attempt} response:`, JSON.stringify(data));
      
      if (!response.ok) {
        // If instance doesn't exist, no point retrying
        if (response.status === 404) {
          return { 
            success: false, 
            error: "Instância não encontrada. Clique em 'Conectar WhatsApp' para criar uma nova.",
            status: 404
          };
        }
        
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
          continue;
        }
        return { 
          success: false, 
          error: data.message || "Erro ao obter QR Code",
          status: response.status
        };
      }
      
      // Check if already connected
      if (data.instance?.state === "open") {
        return { 
          success: true, 
          data: { connected: true, state: "open" }
        };
      }
      
      // Check for QR code
      const qrBase64 = data.base64 || data.qrcode?.base64;
      if (qrBase64) {
        return {
          success: true,
          data: {
            qrcode: qrBase64,
            code: data.code || data.qrcode?.code,
          }
        };
      }
      
      // No QR code yet, wait and retry
      if (attempt < maxRetries) {
        console.log(`No QR code in response, waiting before retry...`);
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (err) {
      console.error(`Attempt ${attempt} error:`, err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  
  return { 
    success: false, 
    error: "Não foi possível obter o QR Code. Aguarde alguns segundos e tente novamente." 
  };
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

    if (!globalEvolutionUrl || !globalEvolutionKey) {
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp não configurado pelo administrador do sistema",
          code: "GLOBAL_CONFIG_MISSING"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: GetQRCodePayload = await req.json();
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
      .select("evolution_instance_name, whatsapp_connected")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organização não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!org.evolution_instance_name) {
      return new Response(
        JSON.stringify({ 
          error: "Nenhuma instância configurada. Clique em 'Conectar WhatsApp' primeiro.",
          code: "INSTANCE_NOT_CREATED"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (org.whatsapp_connected) {
      return new Response(
        JSON.stringify({ 
          connected: true,
          message: "WhatsApp já está conectado"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch QR Code with retry
    console.log(`Fetching QR Code for instance: ${org.evolution_instance_name}`);
    
    const result = await fetchQRCodeWithRetry(
      globalEvolutionUrl, 
      globalEvolutionKey, 
      org.evolution_instance_name
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if connected
    if (result.data?.connected) {
      await supabase
        .from("organizations")
        .update({
          whatsapp_connected: true,
          whatsapp_connected_at: new Date().toISOString(),
        })
        .eq("id", organization_id);

      return new Response(
        JSON.stringify({
          connected: true,
          message: "WhatsApp conectado com sucesso",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return QR code
    return new Response(
      JSON.stringify({
        success: true,
        qrcode: result.data?.qrcode,
        code: result.data?.code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-whatsapp-qrcode:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
