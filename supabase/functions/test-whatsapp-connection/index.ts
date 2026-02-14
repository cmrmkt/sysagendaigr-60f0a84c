import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestConnectionPayload {
  organization_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: TestConnectionPayload = await req.json();
    console.log("Testing WhatsApp connection for org:", payload.organization_id);

    if (!payload.organization_id) {
      return new Response(
        JSON.stringify({ success: false, message: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch organization's Evolution API credentials
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("evolution_api_url, evolution_api_key, evolution_instance_name")
      .eq("id", payload.organization_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ success: false, message: "Organização não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { evolution_api_url, evolution_api_key, evolution_instance_name } = org;

    if (!evolution_api_url || !evolution_api_key || !evolution_instance_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Credenciais não configuradas. Preencha todos os campos." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test connection by fetching instance info
    const testUrl = `${evolution_api_url}/instance/fetchInstances`;
    
    console.log(`Testing connection to: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolution_api_key,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Erro na API (${response.status}): Verifique a URL e API Key` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instances = await response.json();
    console.log("Instances found:", instances);

    // Check if our instance exists in the list
    const instanceExists = Array.isArray(instances) && 
      instances.some((inst: { instanceName?: string; name?: string }) => 
        inst.instanceName === evolution_instance_name || 
        inst.name === evolution_instance_name
      );

    if (!instanceExists) {
      // Try to get specific instance info
      const instanceUrl = `${evolution_api_url}/instance/connectionState/${evolution_instance_name}`;
      
      try {
        const instanceResponse = await fetch(instanceUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolution_api_key,
          },
        });

        if (instanceResponse.ok) {
          const instanceData = await instanceResponse.json();
          console.log("Instance state:", instanceData);
          
          const state = instanceData.state || instanceData.instance?.state;
          
          if (state === "open" || state === "connected") {
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: "Conexão estabelecida com sucesso!",
                state: state
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: `Instância encontrada mas não conectada (status: ${state}). Escaneie o QR Code na Evolution API.`,
                state: state
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (instanceError) {
        console.error("Error checking instance:", instanceError);
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Instância "${evolution_instance_name}" não encontrada. Verifique o nome.` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Instance exists, check its connection state
    const instanceUrl = `${evolution_api_url}/instance/connectionState/${evolution_instance_name}`;
    
    const stateResponse = await fetch(instanceUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolution_api_key,
      },
    });

    if (stateResponse.ok) {
      const stateData = await stateResponse.json();
      const state = stateData.state || stateData.instance?.state;
      
      if (state === "open" || state === "connected") {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "WhatsApp conectado e pronto para enviar mensagens!",
            state: state
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `WhatsApp desconectado (status: ${state}). Reconecte escaneando o QR Code.`,
            state: state
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Conexão com a API estabelecida. Instância encontrada." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error testing connection:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro de conexão: ${(error as Error).message}` 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
