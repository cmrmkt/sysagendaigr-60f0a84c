import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MinistryAssociation {
  ministryId: string;
  role: "leader" | "member";
}

interface CreateUserRequest {
  name: string;
  phone: string;
  phoneCountry: string; // 'BR' or 'US'
  role: "admin" | "leader" | "viewer";
  ministryAssociations?: MinistryAssociation[];
  isVolunteer?: boolean;
  canCreateEvents?: boolean;
  email?: string;
}

// Convert phone to internal email format (normalized)
const phoneToEmail = (phone: string, phoneCountry: string): string => {
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

// Generate temporary password (8 chars)
const generateTempPassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!callerRole || !["admin", "super_admin"].includes(callerRole.role)) {
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's organization
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: "Perfil não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateUserRequest = await req.json();
    const { name, phone, phoneCountry, role, ministryAssociations, isVolunteer, canCreateEvents, email: userEmail } = body;

    // Validation
    if (!name || !phone || !phoneCountry || !role) {
      return new Response(
        JSON.stringify({ error: "Nome, telefone e função são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input length and format validation
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nome deve ter entre 1 e 100 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedPhone = phone.replace(/\D/g, "");
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

    const allowedRoles = ["admin", "leader", "viewer"];
    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Função inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userEmail || typeof userEmail !== "string" || userEmail.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "E-mail é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return new Response(
        JSON.stringify({ error: "E-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ministryAssociations) {
      if (!Array.isArray(ministryAssociations) || ministryAssociations.length > 50) {
        return new Response(
          JSON.stringify({ error: "Associações de ministério inválidas" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const assoc of ministryAssociations) {
        if (!assoc.ministryId || !uuidRegex.test(assoc.ministryId) || !["leader", "member"].includes(assoc.role)) {
          return new Response(
            JSON.stringify({ error: "Associação de ministério inválida" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const internalEmail = phoneToEmail(phone, phoneCountry);
    const tempPassword = generateTempPassword();

    console.log(`Creating user: ${name} in org: ${callerProfile.organization_id}`);

    // Check if phone is already registered
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === internalEmail);

    if (userExists) {
      return new Response(
        JSON.stringify({ error: "Este telefone já está vinculado a outra conta no sistema. Cada telefone só pode ser usado em uma única organização." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        phone,
        phone_country: phoneCountry,
        organization_id: callerProfile.organization_id,
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auth user created: ${authUser.user.id}`);

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authUser.user.id,
        organization_id: callerProfile.organization_id,
        name,
        phone,
        phone_country: phoneCountry,
        email: userEmail || null,
        is_volunteer: isVolunteer || false,
        can_create_events: canCreateEvents || false,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return new Response(
        JSON.stringify({ error: "Erro ao criar perfil" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authUser.user.id,
        role,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // 4. Assign ministries with roles
    if (ministryAssociations && ministryAssociations.length > 0) {
      const ministryInserts = ministryAssociations.map(assoc => ({
        user_id: authUser.user.id,
        ministry_id: assoc.ministryId,
        role: assoc.role,
      }));

      const { error: ministryError } = await supabaseAdmin
        .from("user_ministries")
        .insert(ministryInserts);

      if (ministryError) {
        console.error("Error assigning ministries:", ministryError);
      }
    }

    // Format phone for display
    const displayPhone = phoneCountry === "BR" 
      ? phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      : phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");

    console.log(`User created successfully: ${name}`);

    const whatsappMessage = `🔐 *Acesso à Agenda da Igreja*

📱 Login: ${displayPhone}
🔑 Senha: ${tempPassword}
🔗 Acesse: https://agendaigr.cmrsys.com.br

📲 *Para receber lembretes no celular:*
1. Acesse o link acima no navegador do celular
2. Faça login com seus dados
3. Clique no seu nome (menu) → "Notificações"
4. Clique em "Ativar Notificações"
5. Permita quando o navegador solicitar`;

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUser.user.id,
          name,
          phone: displayPhone,
          role,
        },
        temporaryPassword: tempPassword,
        whatsappMessage,
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
