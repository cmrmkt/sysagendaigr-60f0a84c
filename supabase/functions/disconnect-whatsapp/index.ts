import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DisconnectPayload {
  organization_id: string;
  delete_instance?: boolean; // If true, deletes the instance entirely
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

    const payload: DisconnectPayload = await req.json();
    const { organization_id, delete_instance = false } = payload;

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
          success: true,
          message: "Nenhuma instância para desconectar"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let evolutionSuccess = true;

    if (delete_instance) {
      // Delete the instance entirely
      const evolutionUrl = `${globalEvolutionUrl}/instance/delete/${org.evolution_instance_name}`;
      console.log("Deleting instance:", evolutionUrl);
      
      const response = await fetch(evolutionUrl, {
        method: "DELETE",
        headers: {
          "apikey": globalEvolutionKey,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        console.error("Error deleting instance:", errorData);
        evolutionSuccess = false;
      }
    } else {
      // Just logout (disconnect but keep instance)
      const evolutionUrl = `${globalEvolutionUrl}/instance/logout/${org.evolution_instance_name}`;
      console.log("Logging out instance:", evolutionUrl);
      
      const response = await fetch(evolutionUrl, {
        method: "DELETE",
        headers: {
          "apikey": globalEvolutionKey,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        console.error("Error logging out instance:", errorData);
        // Continue anyway to update local state
      }
    }

    // Update organization - reset WhatsApp connection status
    const updateData = delete_instance
      ? {
          evolution_instance_name: null,
          evolution_api_url: null,
          evolution_api_key: null,
          whatsapp_connected: false,
          whatsapp_connected_at: null,
          whatsapp_phone_number: null,
        }
      : {
          whatsapp_connected: false,
          whatsapp_connected_at: null,
          whatsapp_phone_number: null,
        };

    const { error: updateError } = await supabase
      .from("organizations")
      .update(updateData)
      .eq("id", organization_id);

    if (updateError) {
      console.error("Error updating organization:", updateError);
    }

    console.log(`Organization ${organization_id} WhatsApp disconnected (delete_instance: ${delete_instance})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: delete_instance 
          ? "Instância removida com sucesso"
          : "WhatsApp desconectado com sucesso",
        instanceDeleted: delete_instance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in disconnect-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
