import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderTemplate, getTemplate, DEFAULT_TEMPLATES, type MessageTemplate } from "../_shared/render-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InstantReminderPayload {
  event_id: string;
  organization_id: string;
  custom_template?: MessageTemplate;
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;

    let callerOrgId: string | null = null;

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: authError } = await userClient.auth.getUser();
      if (authError || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", userData.user.id)
        .single();
      callerOrgId = profile?.organization_id || null;
    }

    const payload: InstantReminderPayload = await req.json();
    console.log("Received instant reminder request:", JSON.stringify(payload));

    if (!payload.event_id || !payload.organization_id) {
      return new Response(
        JSON.stringify({ error: "event_id and organization_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller belongs to the requested organization
    if (!isServiceRole && callerOrgId !== payload.organization_id) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch event data
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, date, start_time, end_time, responsible_id, organization_id, ministry_id, created_at")
      .eq("id", payload.event_id)
      .eq("organization_id", payload.organization_id)
      .single();

    if (eventError || !event) {
      console.error("Event not found:", eventError);
      return new Response(
        JSON.stringify({ error: "Evento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Note: No date validation here - admins should be able to send reminders
    // regardless of timezone differences between server (UTC) and user's local time

    // Determine which template to use:
    // 1. Custom template from payload (event-specific or global passed from frontend)
    // 2. Organization's instant_reminder template from DB
    // 3. Default shared template
    let template: MessageTemplate;
    
    if (payload.custom_template) {
      console.log("Using template from payload");
      template = payload.custom_template;
    } else {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("reminder_settings")
        .eq("id", payload.organization_id)
        .single();

      const messageTemplates = (orgData?.reminder_settings as any)?.message_templates;
      template = getTemplate(messageTemplates, "instant_reminder");
      console.log("Using template from DB/default fallback");
    }

    let ministryName = "";
    let collabMinistryNames: string[] = [];
    
    if (event.ministry_id) {
      const { data: ministry } = await supabase
        .from("ministries")
        .select("name")
        .eq("id", event.ministry_id)
        .single();
      
      if (ministry) {
        const { data: leaderEntries } = await supabase
          .from("user_ministries")
          .select("user_id")
          .eq("ministry_id", event.ministry_id)
          .eq("role", "leader");
        
        if (leaderEntries && leaderEntries.length > 0) {
          const { data: leaderProfiles } = await supabase
            .from("profiles")
            .select("name")
            .in("id", leaderEntries.map(l => l.user_id));
          
          const leaderNames = leaderProfiles?.map(p => p.name).join(", ") || "";
          ministryName = leaderNames ? `${ministry.name} (${leaderNames})` : ministry.name;
        } else {
          ministryName = ministry.name;
        }
      }
    }

    const recipientSet = new Set<string>();
    if (event.responsible_id) {
      recipientSet.add(event.responsible_id);
    }

    const ministryIds: string[] = [];
    if (event.ministry_id) {
      ministryIds.push(event.ministry_id);
    }

    const { data: collabMinistries, error: collabError } = await supabase
      .from("event_collaborator_ministries")
      .select("ministry_id")
      .eq("event_id", payload.event_id);

    if (collabError) {
      console.error("Error fetching collaborator ministries:", collabError);
    } else if (collabMinistries && collabMinistries.length > 0) {
      const collabMinistryIds = collabMinistries.map(cm => cm.ministry_id).filter(Boolean);
      
      for (const cmId of collabMinistryIds) {
        if (!ministryIds.includes(cmId)) {
          ministryIds.push(cmId);
        }
      }
      
      if (collabMinistryIds.length > 0) {
        const { data: collabMinData } = await supabase
          .from("ministries")
          .select("id, name")
          .in("id", collabMinistryIds);
        
        if (collabMinData) {
          const { data: collabLeaders } = await supabase
            .from("user_ministries")
            .select("ministry_id, user_id")
            .eq("role", "leader")
            .in("ministry_id", collabMinistryIds);
          
          const collabLeaderUserIds = [...new Set((collabLeaders || []).map(l => l.user_id))];
          let collabLeaderProfiles: Record<string, string> = {};
          if (collabLeaderUserIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, name")
              .in("id", collabLeaderUserIds);
            (profiles || []).forEach(p => { collabLeaderProfiles[p.id] = p.name; });
          }
          
          collabMinistryNames = collabMinData.map(m => {
            const leaders = (collabLeaders || [])
              .filter(l => l.ministry_id === m.id)
              .map(l => collabLeaderProfiles[l.user_id])
              .filter(Boolean);
            return leaders.length > 0 ? `${m.name} (${leaders.join(", ")})` : m.name;
          });
        }
      }
    }

    console.log(`Found ${ministryIds.length} ministries for event ${event.title}`);

    if (ministryIds.length > 0) {
      const { data: ministryMembers, error: membersError } = await supabase
        .from("user_ministries")
        .select("user_id")
        .eq("role", "leader")
        .in("ministry_id", ministryIds);

      if (membersError) {
        console.error("Error fetching ministry leaders:", membersError);
      } else if (ministryMembers && ministryMembers.length > 0) {
        for (const m of ministryMembers) {
          if (m.user_id) {
            recipientSet.add(m.user_id);
          }
        }
      }
    }

    const recipientIds = Array.from(recipientSet);

    if (recipientIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Nenhum participante encontrado para este evento",
          sent: 0, failed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${recipientIds.length} participants from ${ministryIds.length} ministries for event ${event.title}`);

    const { data: recipients } = await supabase
      .from("profiles")
      .select("id, name, phone, phone_country")
      .in("id", recipientIds);

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Nenhum perfil encontrado para os participantes",
          sent: 0, failed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [year, month, day] = event.date.split("-");
    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = event.start_time.slice(0, 5);

    const createdAtDate = event.created_at ? event.created_at.split("T")[0] : "";
    const createdAtTime = event.created_at ? event.created_at.split("T")[1]?.slice(0, 5) || "" : "";
    const formattedCreatedDate = createdAtDate ? (() => {
      const [cy, cm, cd] = createdAtDate.split("-");
      return `${cd}/${cm}/${cy}`;
    })() : "";

    let totalSent = 0;
    let totalFailed = 0;

    for (const recipient of recipients) {
      const { title, body } = renderTemplate(template, {
        titulo: event.title,
        tipo_recurso: "Evento",
        data_evento: formattedDate,
        hora_evento: formattedTime,
        data_criacao: formattedCreatedDate,
        hora_criacao: createdAtTime,
        nome: recipient.name,
        ministerio: ministryName,
        ministerios_colaboradores: collabMinistryNames.join(", "),
      });

      console.log(`Sending instant reminder to ${recipient.name}: ${title}`);

      try {
        const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke("send-whatsapp", {
          body: {
            organization_id: payload.organization_id,
            recipient_ids: [recipient.id],
            title,
            body,
            tag: `event-instant-${event.id}`,
          },
        });

        if (whatsappError) {
          console.error(`Error sending to ${recipient.name}:`, whatsappError);
          totalFailed++;
        } else {
          totalSent += whatsappResult?.sent || 0;
          totalFailed += whatsappResult?.failed || 0;
        }
      } catch (sendError) {
        console.error(`Error sending to ${recipient.name}:`, sendError);
        totalFailed++;
      }
    }

    console.log(`WhatsApp result: ${totalSent} sent, ${totalFailed} failed`);

    return new Response(
      JSON.stringify({
        message: "Lembretes enviados com sucesso",
        recipients: recipients.length,
        sent: totalSent,
        failed: totalFailed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-instant-reminder:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
