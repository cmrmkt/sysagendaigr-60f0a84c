import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterOrgRequest {
  orgName: string;
  orgTaxId?: string;
  orgAddress?: string;
  orgCity?: string;
  orgState?: string;
  orgPostalCode?: string;
  orgPhone?: string;
  orgPhoneCountry?: string;
  country?: string;
  phone: string;
  phoneCountry: string;
  loginEmail?: string;
  loginMethod?: "phone" | "email";
  password: string;
  adminName: string;
  adminPersonalId?: string;
  adminAddress?: string;
  adminPhone?: string;
  adminPhoneCountry?: string;
  adminWhatsapp?: string;
  adminWhatsappCountry?: string;
}

// Convert phone to internal email format
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

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: RegisterOrgRequest = await req.json();
    const { 
      orgName, orgTaxId, orgAddress, orgCity, orgState, orgPostalCode,
      orgPhone, orgPhoneCountry, country,
      phone, phoneCountry, loginEmail, loginMethod, password, adminName,
      adminPersonalId, adminAddress, 
      adminPhone, adminPhoneCountry, adminWhatsapp, adminWhatsappCountry 
    } = body;

    // Validation
    if (!orgName || !phone || !phoneCountry || !password || !adminName) {
      return new Response(
        JSON.stringify({ error: "Todos os campos obrigatórios devem ser preenchidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (orgName.length > 100 || adminName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nome deve ter no máximo 100 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhoneCheck = phone.replace(/\D/g, "");
    if (cleanPhoneCheck.length < 7 || cleanPhoneCheck.length > 15) {
      return new Response(
        JSON.stringify({ error: "Telefone inválido. Deve conter entre 7 e 15 dígitos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supportedCountries = ["BR", "US", "CA", "PT"];
    if (!supportedCountries.includes(phoneCountry)) {
      return new Response(
        JSON.stringify({ error: "País não suportado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6 || password.length > 72) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter entre 6 e 72 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine auth email: if loginMethod is "email", use loginEmail directly; otherwise phone-based
    let authEmail: string;
    if (loginMethod === "email" && loginEmail) {
      authEmail = loginEmail.trim().toLowerCase();
      if (!authEmail.includes("@") || authEmail.length < 5 || authEmail.length > 255) {
        return new Response(
          JSON.stringify({ error: "E-mail de login inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      authEmail = phoneToEmail(phone, phoneCountry);
    }

    const slug = generateSlug(orgName) + "-" + Date.now().toString(36);

    console.log(`Registering new organization: ${orgName} with admin: ${adminName} (auth: ${authEmail})`);

    // Check if auth email is already registered
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingUser?.users?.find(u => u.email === authEmail);
    
    if (existingAuthUser) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", existingAuthUser.id)
        .maybeSingle();

      if (existingProfile) {
        const identLabel = loginMethod === "email" ? "e-mail" : "telefone";
        return new Response(
          JSON.stringify({ error: `Este ${identLabel} já está vinculado a outra conta no sistema.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.log(`Found orphaned auth user for ${authEmail}, deleting...`);
        try {
          await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
        } catch (deleteError) {
          console.error("Error deleting orphaned auth user:", deleteError);
          return new Response(
            JSON.stringify({ error: "Erro ao processar registro. Tente novamente." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // 1. Create organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: orgName,
        slug,
        country_code: country || phoneCountry,
        status: "active",
        subscription_status: "trial",
        trial_ends_at: trialEndsAt.toISOString(),
        tax_id: orgTaxId || null,
        address: orgAddress || null,
        city: orgCity || null,
        state: orgState || null,
        postal_code: orgPostalCode || null,
        phone: orgPhone || null,
      })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organization:", orgError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar organização: ${orgError.message || "erro interno"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Organization created: ${org.id}`);

    // 2. Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        phone,
        phone_country: phoneCountry,
        organization_id: org.id,
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${authError.message || "erro de autenticação"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auth user created: ${authUser.user.id}`);

    // 3. Create profile (store loginEmail in email field if provided)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authUser.user.id,
        organization_id: org.id,
        name: adminName,
        phone: adminPhone || phone,
        phone_country: adminPhoneCountry || phoneCountry,
        can_create_events: true,
        personal_id: adminPersonalId || null,
        whatsapp: adminWhatsapp || null,
        whatsapp_country: adminWhatsappCountry || null,
        address: adminAddress || null,
        email: loginMethod === "email" ? loginEmail?.trim().toLowerCase() : null,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message || "erro interno"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: authUser.user.id, role: "admin" });

    if (roleError) console.error("Error assigning role:", roleError);

    // 5. Notify Super Admin
    console.log(`Notifying Super Admin about new organization: ${org.name}`);

    const { data: superAdminRole } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin")
      .maybeSingle();

    if (superAdminRole?.user_id) {
      try {
        await supabaseAdmin.functions.invoke("send-push", {
          body: {
            recipient_ids: [superAdminRole.user_id],
            title: "Nova Organização Registrada",
            body: `${orgName} (${country || phoneCountry}) iniciou o período de teste de 7 dias.`,
            icon: "/pwa-icon-192.png",
            badge: "/favicon.png",
            tag: "new-org-registration",
            data: { type: "new_organization", organization_id: org.id, organization_name: orgName },
          },
        });
      } catch (pushError) {
        console.error("Failed to send push:", pushError);
      }

      // WhatsApp notification to Super Admin
      try {
        const globalEvolutionUrl = Deno.env.get("GLOBAL_EVOLUTION_API_URL");
        const globalEvolutionKey = Deno.env.get("GLOBAL_EVOLUTION_API_KEY");
        const globalInstanceName = Deno.env.get("GLOBAL_EVOLUTION_INSTANCE_NAME");

        if (globalEvolutionUrl && globalEvolutionKey && globalInstanceName) {
          const { data: superAdminProfile } = await supabaseAdmin
            .from("profiles")
            .select("phone, phone_country")
            .eq("id", superAdminRole.user_id)
            .maybeSingle();

          if (superAdminProfile?.phone) {
            const saPhone = superAdminProfile.phone.replace(/\D/g, "");
            const saCountryCode = superAdminProfile.phone_country === "BR" ? "55" 
              : superAdminProfile.phone_country === "PT" ? "351" : "1";
            const fullPhone = `${saCountryCode}${saPhone}`;

            const countryNames: Record<string, string> = {
              BR: "Brasil", US: "Estados Unidos", CA: "Canadá", PT: "Portugal",
            };
            const countryName = countryNames[country || phoneCountry] || (country || phoneCountry);
            const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

            const message = `🔔 *Nova Organização Cadastrada!*\n\n🏢 *${orgName}*\n🌍 País: ${countryName}\n⏰ Data: ${now}\n\n✅ Período de teste de 7 dias iniciado.`;

            await fetch(
              `${globalEvolutionUrl}/message/sendText/${globalInstanceName}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: globalEvolutionKey },
                body: JSON.stringify({ number: fullPhone, text: message }),
              }
            );
          }
        }
      } catch (whatsappError) {
        console.error("Failed to send WhatsApp to Super Admin:", whatsappError);
      }
    }

    console.log(`Registration complete for organization: ${org.name}`);

    return new Response(
      JSON.stringify({ success: true, message: "Cadastro realizado com sucesso!", organizationId: org.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMsg = error instanceof Error ? error.message : "erro desconhecido";
    return new Response(
      JSON.stringify({ error: `Erro interno do servidor: ${errorMsg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
