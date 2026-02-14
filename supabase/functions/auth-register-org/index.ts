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
  country?: string;
  phone: string;
  phoneCountry: string;
  password: string;
  adminName: string;
  adminPersonalId?: string;
  adminNationalId?: string;
  adminAddress?: string;
  adminPhone?: string;
  adminPhoneCountry?: string;
  adminWhatsapp?: string;
  adminWhatsappCountry?: string;
}

// Convert phone to internal email format
const phoneToEmail = (phone: string, phoneCountry: string): string => {
  // Remove all non-numeric characters
  let cleanPhone = phone.replace(/\D/g, "");
  
  // Normalize: strip leading country code if user included it
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

// Generate slug from organization name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, "") // Remove leading/trailing dashes
    .substring(0, 50);
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: RegisterOrgRequest = await req.json();
    const { 
      orgName, orgTaxId, orgAddress, orgCity, orgState, orgPostalCode, country,
      phone, phoneCountry, password, adminName,
      adminPersonalId, adminNationalId, adminAddress, 
      adminPhone, adminPhoneCountry, adminWhatsapp, adminWhatsappCountry 
    } = body;

    // Validation
    if (!orgName || !phone || !phoneCountry || !password || !adminName) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = phoneToEmail(phone, phoneCountry);
    const slug = generateSlug(orgName) + "-" + Date.now().toString(36);

    console.log(`Registering new organization: ${orgName} with admin: ${adminName}`);

    // Check if phone is already registered
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingUser?.users?.find(u => u.email === email);
    
    if (existingAuthUser) {
      // Check if this auth user has an active profile
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", existingAuthUser.id)
        .maybeSingle();

      if (existingProfile) {
        // Auth user exists with an active profile - cannot reuse phone
        return new Response(
          JSON.stringify({ error: "Este telefone já está vinculado a outra conta no sistema. Cada telefone só pode ser usado em uma única organização." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Auth user exists but no profile (deleted user) - clean up and allow registration
        console.log(`Found orphaned auth user for ${email}, deleting...`);
        try {
          await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
          console.log(`Orphaned auth user deleted: ${existingAuthUser.id}`);
        } catch (deleteError) {
          console.error("Error deleting orphaned auth user:", deleteError);
          return new Response(
            JSON.stringify({ error: "Erro ao processar registro. Tente novamente." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // 1. Create organization - Active immediately with 7-day trial
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
      })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organization:", orgError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar organização: ${orgError.message || orgError.code || "erro interno do banco de dados"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Organization created: ${org.id}`);

    // 2. Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm since we use phone
      user_metadata: {
        name: adminName,
        phone,
        phone_country: phoneCountry,
        organization_id: org.id,
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      // Rollback: delete organization
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${authError.message || "erro de autenticação"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auth user created: ${authUser.user.id}`);

    // 3. Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authUser.user.id,
        organization_id: org.id,
        name: adminName,
        phone,
        phone_country: phoneCountry,
        can_create_events: true,
        personal_id: adminPersonalId || null,
        national_id: adminNationalId || null,
        whatsapp: adminWhatsapp || null,
        whatsapp_country: adminWhatsappCountry || null,
        address: adminAddress || null,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar perfil do administrador: ${profileError.message || profileError.code || "erro interno"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authUser.user.id,
        role: "admin",
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // 5. Notify Super Admin about new organization registration
    console.log(`Notifying Super Admin about new organization: ${org.name}`);

    const { data: superAdminRole } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin")
      .maybeSingle();

    if (superAdminRole?.user_id) {
      // Send push notification
      try {
        await supabaseAdmin.functions.invoke("send-push", {
          body: {
            recipient_ids: [superAdminRole.user_id],
            title: "Nova Organização Registrada",
            body: `${orgName} (${phoneCountry}) iniciou o período de teste de 7 dias.`,
            icon: "/pwa-icon-192.png",
            badge: "/favicon.png",
            tag: "new-org-registration",
            data: {
              type: "new_organization",
              organization_id: org.id,
              organization_name: orgName,
              phone_country: phoneCountry,
            },
          },
        });
        console.log(`Push notification sent to Super Admin for organization: ${org.name}`);
      } catch (pushError) {
        console.error(`Failed to send push notification to Super Admin:`, pushError);
      }

      // Send WhatsApp notification to Super Admin
      try {
        const globalEvolutionUrl = Deno.env.get("GLOBAL_EVOLUTION_API_URL");
        const globalEvolutionKey = Deno.env.get("GLOBAL_EVOLUTION_API_KEY");
        const globalInstanceName = Deno.env.get("GLOBAL_EVOLUTION_INSTANCE_NAME");

        if (globalEvolutionUrl && globalEvolutionKey && globalInstanceName) {
          // Get Super Admin's phone from profile
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

            const whatsappResponse = await fetch(
              `${globalEvolutionUrl}/message/sendText/${globalInstanceName}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: globalEvolutionKey,
                },
                body: JSON.stringify({
                  number: fullPhone,
                  text: message,
                }),
              }
            );

            if (whatsappResponse.ok) {
              console.log(`WhatsApp notification sent to Super Admin for: ${orgName}`);
            } else {
              const errText = await whatsappResponse.text();
              console.error(`WhatsApp send failed (${whatsappResponse.status}):`, errText);
            }
          }
        } else {
          console.log("Global Evolution API credentials not fully configured, skipping WhatsApp.");
        }
      } catch (whatsappError) {
        console.error("Failed to send WhatsApp to Super Admin:", whatsappError);
        // Don't fail the registration
      }
    }

    console.log(`Registration complete for organization: ${org.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cadastro realizado com sucesso! Seu acesso está liberado.",
        organizationId: org.id,
      }),
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
