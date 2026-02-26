import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ForgotPasswordRequest {
  phone?: string;
  phoneCountry?: string;
  email?: string;
}

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

const generatePassword = (): string => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

function formatPhoneForWhatsApp(phone: string, countryCode: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  const dialCodes: Record<string, string> = { BR: "55", US: "1", CA: "1", PT: "351" };
  const dialCode = dialCodes[countryCode] || "55";
  if (!cleaned.startsWith(dialCode)) cleaned = dialCode + cleaned;
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
    const { phone, phoneCountry, email } = body;

    // Must provide phone or email
    const isEmailMode = !!email && !phone;
    const isPhoneMode = !!phone && !!phoneCountry;

    if (!isEmailMode && !isPhoneMode) {
      return new Response(
        JSON.stringify({ error: "Informe o telefone ou e-mail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate inputs
    if (isPhoneMode) {
      const cleanedPhone = phone!.replace(/\D/g, "");
      if (cleanedPhone.length < 8 || cleanedPhone.length > 15) {
        return new Response(
          JSON.stringify({ error: "Telefone inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const allowedCountries = ["BR", "US", "CA", "PT"];
      if (!allowedCountries.includes(phoneCountry!)) {
        return new Response(
          JSON.stringify({ error: "País do telefone inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (isEmailMode && (!email!.includes("@") || email!.length < 5)) {
      return new Response(
        JSON.stringify({ error: "E-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genericSuccess = {
      success: true,
      message: isEmailMode
        ? "Se o e-mail estiver cadastrado, uma nova senha será enviada."
        : "Se o número estiver cadastrado, uma nova senha foi enviada via WhatsApp.",
    };

    // Find the user
    let authUser: any = null;
    let profile: any = null;

    if (isPhoneMode) {
      const authEmail = phoneToEmail(phone!, phoneCountry!);
      console.log(`Forgot password request for phone: ${authEmail}`);

      const { data: authUsers } = await supabase.auth.admin.listUsers();
      authUser = authUsers?.users?.find((u: any) => u.email === authEmail);
    } else {
      // Email mode: find profile by email field
      const cleanEmail = email!.trim().toLowerCase();
      console.log(`Forgot password request for email: ${cleanEmail}`);

      const { data: profileByEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (profileByEmail) {
        // Also check if there's a direct auth user with this email
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        authUser = authUsers?.users?.find((u: any) => u.email === cleanEmail || u.id === profileByEmail.id);
      } else {
        // Maybe the user registered with email directly as auth email
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        authUser = authUsers?.users?.find((u: any) => u.email === cleanEmail);
      }
    }

    if (!authUser) {
      console.log("User not found");
      return new Response(JSON.stringify(genericSuccess), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profile
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, name, phone, phone_country, organization_id, email")
      .eq("id", authUser.id)
      .maybeSingle();

    if (!userProfile) {
      return new Response(JSON.stringify(genericSuccess), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    profile = userProfile;

    // Generate and set new password
    const newPassword = generatePassword();
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

    // ===== Send via WhatsApp =====
    let whatsappSent = false;

    if (profile.organization_id) {
      // Try org's WhatsApp instance first
      const { data: org } = await supabase
        .from("organizations")
        .select("evolution_api_url, evolution_api_key, evolution_instance_name, whatsapp_connected")
        .eq("id", profile.organization_id)
        .maybeSingle();

      const waMessage = `🔐 *Redefinição de Senha - Agenda da Igreja*\n\n` +
        `Olá, ${profile.name}!\n\n` +
        `Sua senha foi redefinida com sucesso.\n\n` +
        `📱 *Login:* ${profile.phone}\n` +
        `🔑 *Nova Senha:* ${newPassword}\n\n` +
        `Acesse: https://agendaigr.lovable.app/login\n\n` +
        `⚠️ Recomendamos alterar sua senha após o login.`;

      if (org?.whatsapp_connected && org.evolution_api_url && org.evolution_api_key && org.evolution_instance_name) {
        try {
          const phoneForWA = formatPhoneForWhatsApp(profile.phone, profile.phone_country || phoneCountry || "BR");
          const response = await fetch(
            `${org.evolution_api_url}/message/sendText/${org.evolution_instance_name}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: org.evolution_api_key },
              body: JSON.stringify({ number: phoneForWA, text: waMessage }),
            }
          );
          if (response.ok) { whatsappSent = true; console.log("WhatsApp sent via org instance"); }
        } catch (e) { console.error("Error sending via org WhatsApp:", e); }
      }

      // Fallback: global Evolution
      if (!whatsappSent && globalEvolutionUrl && globalEvolutionKey) {
        const globalInstanceName = Deno.env.get("GLOBAL_EVOLUTION_INSTANCE_NAME") || "agendaigr-global";
        try {
          const phoneForWA = formatPhoneForWhatsApp(profile.phone, profile.phone_country || phoneCountry || "BR");
          console.log(`Attempting global WhatsApp send to ${phoneForWA} via instance ${globalInstanceName}`);
          const response = await fetch(
            `${globalEvolutionUrl}/message/sendText/${globalInstanceName}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: globalEvolutionKey },
              body: JSON.stringify({ number: phoneForWA, text: waMessage }),
            }
          );
          const responseBody = await response.text();
          if (response.ok) {
            whatsappSent = true;
            console.log("WhatsApp sent via global instance");
          } else {
            console.error(`Global WhatsApp failed (${response.status}): ${responseBody}`);
          }
        } catch (e) { console.error("Error sending via global WhatsApp:", e); }
      }
    }

    // ===== Send via Email (if profile has email) =====
    let emailSent = false;
    const profileEmail = profile.email;

    if (profileEmail && !profileEmail.endsWith("@phone.agendaigr.app")) {
      try {
        console.log(`Attempting Supabase password reset email to: ${profileEmail}`);
        const { error: resetEmailError } = await supabase.auth.resetPasswordForEmail(profileEmail, {
          redirectTo: "https://agendaigr.cmrsys.com.br/login",
        });
        if (resetEmailError) {
          console.error("Error sending reset email:", resetEmailError);
        } else {
          emailSent = true;
          console.log("Password reset email sent successfully");
        }
      } catch (e) {
        console.error("Error sending reset email:", e);
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
          email_sent: emailSent,
          method: isEmailMode ? "email" : "phone",
        },
      });
    }

    // Build response message
    let responseMessage = genericSuccess.message;
    if (whatsappSent && emailSent) {
      responseMessage = "Uma nova senha foi enviada via WhatsApp e um link de redefinição foi enviado para o e-mail cadastrado.";
    } else if (whatsappSent) {
      responseMessage = "Uma nova senha foi enviada via WhatsApp.";
    } else if (emailSent) {
      responseMessage = "Um link de redefinição de senha foi enviado para o e-mail cadastrado.";
    }

    console.log(`Password reset result: whatsapp_sent=${whatsappSent}, email_sent=${emailSent}`);

    return new Response(
      JSON.stringify({ success: true, message: responseMessage }),
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
