import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Auth validation ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload: TestConnectionPayload = await req.json();
    console.log("Testing WhatsApp connection for org:", payload.organization_id);

    if (!payload.organization_id) {
      return new Response(
        JSON.stringify({ success: false, message: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller belongs to the org
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    if (!profile || profile.organization_id !== payload.organization_id) {
      return new Response(JSON.stringify({ success: false, message: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        JSON.stringify({ success: false, message: "Credenciais não configuradas. Preencha todos os campos." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testUrl = `${evolution_api_url}/instance/fetchInstances`;
    console.log(`Testing connection to: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json", "apikey": evolution_api_key },
    });

    if (!response.ok) {
      console.error("Evolution API error:", response.status);
      return new Response(
        JSON.stringify({ success: false, message: `Erro na API (${response.status}): Verifique a URL e API Key` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instances = await response.json();

    const instanceExists = Array.isArray(instances) && 
      instances.some((inst: { instanceName?: string; name?: string }) => 
        inst.instanceName === evolution_instance_name || inst.name === evolution_instance_name
      );

    if (!instanceExists) {
      const instanceUrl = `${evolution_api_url}/instance/connectionState/${evolution_instance_name}`;
      try {
        const instanceResponse = await fetch(instanceUrl, {
          method: "GET", headers: { "Content-Type": "application/json", "apikey": evolution_api_key },
        });
        if (instanceResponse.ok) {
          const instanceData = await instanceResponse.json();
          const state = instanceData.state || instanceData.instance?.state;
          if (state === "open" || state === "connected") {
            return new Response(JSON.stringify({ success: true, message: "Conexão estabelecida com sucesso!", state }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          } else {
            return new Response(JSON.stringify({ success: false, message: `Instância encontrada mas não conectada (status: ${state}).`, state }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch (instanceError) {
        console.error("Error checking instance:", instanceError);
      }
      return new Response(JSON.stringify({ success: false, message: `Instância "${evolution_instance_name}" não encontrada.` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const instanceUrl = `${evolution_api_url}/instance/connectionState/${evolution_instance_name}`;
    const stateResponse = await fetch(instanceUrl, {
      method: "GET", headers: { "Content-Type": "application/json", "apikey": evolution_api_key },
    });

    if (stateResponse.ok) {
      const stateData = await stateResponse.json();
      const state = stateData.state || stateData.instance?.state;
      if (state === "open" || state === "connected") {
        return new Response(JSON.stringify({ success: true, message: "WhatsApp conectado e pronto para enviar mensagens!", state }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        return new Response(JSON.stringify({ success: false, message: `WhatsApp desconectado (status: ${state}).`, state }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Conexão com a API estabelecida. Instância encontrada." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error testing connection:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Erro de conexão interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
