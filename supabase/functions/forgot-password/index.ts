import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ForgotPasswordRequest {
  phone: string;
  phoneCountry: string;
}

// Convert phone to internal email format (same logic as login/register)
const phoneToEmail = (phone: string, phoneCountry: string): string => {
  let cleanPhone = phone.replace(/\D/g, "");

  if (phoneCountry === "BR" && cleanPhone.length === 13 && cleanPhone.startsWith("55")) {
    cleanPhone = cleanPhone.substring(2);
  } else if ((phoneCountry === "US" || phoneCountry === "CA") && cleanPhone.length === 11 && cleanPhone.startsWith("1")) {
    cleanPhone = cleanPhone.substring(1);
  } else if (phoneCountry === "PT" && cleanPhone.length === 12 && cleanPhone.startsWith("351")) {
    cleanPhone = cleanPhone.substring(3);
  }

  const countryCode = phoneCountry === "BR" ? "55" : phoneCountry === "PT" ? "351" : "1";
  return `${countryCode}${cleanPhone}@phone.agendaigr.app`;
};

// Generate random password
const generatePassword = (): string => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Format phone for WhatsApp
function formatPhoneForWhatsApp(phone: string, countryCode: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);

  const dialCodes: Record<string, string> = { BR: "55", US: "1", CA: "1", PT: "351" };
  const dialCode = dialCodes[countryCode] || "55";

  if (!cleaned.startsWith(dialCode)) {
    cleaned = dialCode + cleaned;
  }
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const globalEvolutionUrl = Deno.env.get("GLOBAL_EVOLUTION_API_URL");
    const globalEvolutionKey = Deno.env.get("GLOBAL_EVOLUTION_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: ForgotPasswordRequest = await req.json();
    const { phone, phoneCountry } = body;

    if (!phone || !phoneCountry) {
      return new Response(
        JSON.stringify({ error: "Telefone e país são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format and country
    const cleanedPhone = (typeof phone === "string" ? phone : "").replace(/\D/g, "");
    if (cleanedPhone.length < 8 || cleanedPhone.length > 15) {
      return new Response(
        JSON.stringify({ error: "Telefone inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedCountries = ["BR", "US", "CA", "PT"];
    if (!allowedCountries.includes(phoneCountry)) {
      return new Response(
        JSON.stringify({ error: "País do telefone inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = phoneToEmail(phone, phoneCountry);
    console.log(`Forgot password request for: ${email}`);

    // Find user by email in auth
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: "Erro interno ao buscar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUser = authUsers?.users?.find(u => u.email === email);
    
    if (!authUser) {
      console.log(`User not found for email: ${email}`);
      // Return success anyway to prevent phone enumeration
      return new Response(
        JSON.stringify({ success: true, message: "Se o número estiver cadastrado, uma nova senha será enviada via WhatsApp." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, phone, phone_country, organization_id")
      .eq("id", authUser.id)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ success: true, message: "Se o número estiver cadastrado, uma nova senha será enviada via WhatsApp." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao redefinir senha" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password reset successful for user: ${authUser.id}`);

    // Try to send via WhatsApp
    let whatsappSent = false;

    // First try org's WhatsApp instance
    if (profile.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("evolution_api_url, evolution_api_key, evolution_instance_name, whatsapp_connected")
        .eq("id", profile.organization_id)
        .maybeSingle();

      if (org?.whatsapp_connected && org.evolution_api_url && org.evolution_api_key && org.evolution_instance_name) {
        try {
          const phoneForWA = formatPhoneForWhatsApp(profile.phone, profile.phone_country || phoneCountry);
          const message = `🔐 *Redefinição de Senha - Agenda da Igreja*\n\n` +
            `Olá, ${profile.name}!\n\n` +
            `Sua senha foi redefinida com sucesso.\n\n` +
            `📱 *Login:* ${profile.phone}\n` +
            `🔑 *Nova Senha:* ${newPassword}\n\n` +
            `Acesse: https://agendaigr.lovable.app/login\n\n` +
            `⚠️ Recomendamos alterar sua senha após o login.`;

          const response = await fetch(
            `${org.evolution_api_url}/message/sendText/${org.evolution_instance_name}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: org.evolution_api_key,
              },
              body: JSON.stringify({ number: phoneForWA, text: message }),
            }
          );

          if (response.ok) {
            whatsappSent = true;
            console.log(`WhatsApp sent to ${profile.name} via org instance`);
          } else {
            console.error("Org WhatsApp send failed:", await response.text());
          }
        } catch (e) {
          console.error("Error sending via org WhatsApp:", e);
        }
      }
    }

    // Fallback: try global Evolution API instance if available
    if (!whatsappSent && globalEvolutionUrl && globalEvolutionKey) {
      try {
        const phoneForWA = formatPhoneForWhatsApp(profile.phone, profile.phone_country || phoneCountry);
        const message = `🔐 *Redefinição de Senha - Agenda da Igreja*\n\n` +
          `Olá, ${profile.name}!\n\n` +
          `Sua senha foi redefinida com sucesso.\n\n` +
          `📱 *Login:* ${profile.phone}\n` +
          `🔑 *Nova Senha:* ${newPassword}\n\n` +
          `Acesse: https://agendaigr.lovable.app/login\n\n` +
          `⚠️ Recomendamos alterar sua senha após o login.`;

        // Try using a global instance (if configured)
        const response = await fetch(
          `${globalEvolutionUrl}/message/sendText/agendaigr-global`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: globalEvolutionKey,
            },
            body: JSON.stringify({ number: phoneForWA, text: message }),
          }
        );

        if (response.ok) {
          whatsappSent = true;
          console.log(`WhatsApp sent to ${profile.name} via global instance`);
        } else {
          console.error("Global WhatsApp send failed:", await response.text());
        }
      } catch (e) {
        console.error("Error sending via global WhatsApp:", e);
      }
    }

    // Log the action
    if (profile.organization_id) {
      await supabase.from("usage_logs").insert({
        organization_id: profile.organization_id,
        user_id: null,
        action: "self.password_reset",
        resource_type: "user",
        resource_id: profile.id,
        resource_name: profile.name,
        metadata: {
          whatsapp_sent: whatsappSent,
          phone_country: phoneCountry,
        },
      });
    }

    // Always return identical response to prevent phone enumeration
    console.log(`Password reset result: whatsapp_sent=${whatsappSent}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Se o número estiver cadastrado, uma nova senha foi enviada via WhatsApp.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
