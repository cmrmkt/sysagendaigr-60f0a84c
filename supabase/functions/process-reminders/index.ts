import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Template rendering utilities (inline to avoid import issues)
interface MessageTemplate {
  title: string;
  body: string;
}

interface TemplateVariables {
  titulo?: string;
  tipo_recurso?: string;
  data_evento?: string;
  hora_evento?: string;
  data_criacao?: string;
  hora_criacao?: string;
  dias_para_vencimento?: string;
  nome?: string;
  ministerio?: string;
  ministerios_colaboradores?: string;
}

function renderTemplate(
  template: MessageTemplate,
  variables: TemplateVariables
): { title: string; body: string } {
  const variableMap: Record<string, string> = {
    "[titulo]": variables.titulo || "",
    "[tipo_recurso]": variables.tipo_recurso || "",
    "[data_evento]": variables.data_evento || "",
    "[hora_evento]": variables.hora_evento || "",
    "[data_criacao]": variables.data_criacao || "",
    "[hora_criacao]": variables.hora_criacao || "",
    "[dias_para_vencimento]": variables.dias_para_vencimento || "",
    "[nome]": variables.nome || "",
    "[ministério]": variables.ministerio || "",
    "[ministérios_colaboradores]": variables.ministerios_colaboradores || "",
  };

  let renderedTitle = template.title;
  let renderedBody = template.body;

  for (const [placeholder, value] of Object.entries(variableMap)) {
    const regex = new RegExp(placeholder.replace(/[[\]]/g, "\\$&"), "g");
    renderedTitle = renderedTitle.replace(regex, value);
    renderedBody = renderedBody.replace(regex, value);
  }

  renderedTitle = renderedTitle.replace(/\[[^\]]+\]/g, "");
  renderedBody = renderedBody.replace(/\[[^\]]+\]/g, "");

  return { title: renderedTitle.trim(), body: renderedBody.trim() };
}

const DEFAULT_TEMPLATES = {
  after_creation: { title: "📝 Novo [tipo_recurso]", body: "[nome], [titulo] foi criado.\n\nCriado em [data_criacao] às [hora_criacao]" },
  before_due: { title: "⏰ Lembrete", body: "[nome], [ministério]: [titulo]\nVencimento em [data_evento] às [hora_evento]" },
  on_due: { title: "📅 Hoje", body: "[nome], [ministério]: [titulo]\nVencimento hoje às [hora_evento]" },
  interval: { title: "🔔 Lembrete", body: "[nome], [ministério]: [titulo]" },
  instant_reminder: { title: "⏰ Lembrete", body: "[nome] - [ministério]\n\nProgramação:\n[titulo]\n\nData:\n[data_evento] às [hora_evento]\n\nObs: Sua participação é muito importante, Ore pela programação e fique atento às suas responsabilidades." },
};

function getTemplate(
  messageTemplates: Record<string, MessageTemplate> | null | undefined,
  type: string
): MessageTemplate {
  if (messageTemplates && messageTemplates[type]) {
    return messageTemplates[type];
  }
  return DEFAULT_TEMPLATES[type as keyof typeof DEFAULT_TEMPLATES] || { title: "🔔 Lembrete", body: "[titulo]" };
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

function getResourceTypeLabel(resourceType: string): string {
  const labels: Record<string, string> = { event: "Evento", task: "Tarefa", announcement: "Aviso" };
  return labels[resourceType] || resourceType;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing pending reminders...");

    const { data: reminders, error: fetchError } = await supabase
      .from("scheduled_reminders")
      .select("*")
      .lte("remind_at", new Date().toISOString())
      .is("sent_at", null)
      .limit(100);

    if (fetchError) {
      console.error("Error fetching reminders:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch reminders" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reminders || reminders.length === 0) {
      console.log("No pending reminders found");
      return new Response(
        JSON.stringify({ message: "No pending reminders", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${reminders.length} pending reminders`);

    // Cache organization settings, notification channel, and ministry names to avoid repeated queries
    const orgSettingsCache: Record<string, { messageTemplates: Record<string, MessageTemplate> | null; notificationChannel: string }> = {};
    const ministryNameCache: Record<string, string> = {};
    const ministryWithLeaderCache: Record<string, string> = {};

    const processedIds: string[] = [];
    const errors: string[] = [];

    for (const reminder of reminders) {
      try {
        let recipientIds: string[] = reminder.recipient_ids || [];

        // Dynamic leader resolution: if recipient_ids is empty and resource is an event,
        // resolve leaders from the event's responsible + collaborator ministries
        if (recipientIds.length === 0 && reminder.resource_type === "event") {
          console.log(`Reminder ${reminder.id}: recipient_ids empty, resolving leaders dynamically for event ${reminder.resource_id}`);
          
          const { data: eventData } = await supabase
            .from("events")
            .select("responsible_id, ministry_id")
            .eq("id", reminder.resource_id)
            .single();
          
          if (eventData) {
            const dynamicSet = new Set<string>();
            if (eventData.responsible_id) dynamicSet.add(eventData.responsible_id);
            
            const ministryIds: string[] = [];
            if (eventData.ministry_id) ministryIds.push(eventData.ministry_id);
            
            // Get collaborator ministries
            const { data: collabMins } = await supabase
              .from("event_collaborator_ministries")
              .select("ministry_id")
              .eq("event_id", reminder.resource_id);
            
            if (collabMins) {
              collabMins.forEach(cm => {
                if (!ministryIds.includes(cm.ministry_id)) ministryIds.push(cm.ministry_id);
              });
            }
            
            // Get leaders from all ministries
            if (ministryIds.length > 0) {
              const { data: leaders } = await supabase
                .from("user_ministries")
                .select("user_id")
                .eq("role", "leader")
                .in("ministry_id", ministryIds);
              
              if (leaders) leaders.forEach(l => dynamicSet.add(l.user_id));
            }
            
            recipientIds = Array.from(dynamicSet);
            console.log(`Resolved ${recipientIds.length} recipients dynamically`);
          }
        }

        const { data: recipients } = await supabase
          .from("profiles")
          .select("id, name, phone, phone_country")
          .in("id", recipientIds);

        if (recipients && recipients.length > 0) {
          // Get organization's settings (cached)
          let orgSettings = orgSettingsCache[reminder.organization_id];
          if (orgSettings === undefined) {
            const { data: orgData } = await supabase
              .from("organizations")
              .select("reminder_settings")
              .eq("id", reminder.organization_id)
              .single();

            const reminderSettings = orgData?.reminder_settings as any;
            orgSettings = {
              messageTemplates: reminderSettings?.message_templates || null,
              notificationChannel: reminderSettings?.notification_channel || "whatsapp"
            };
            orgSettingsCache[reminder.organization_id] = orgSettings;
          }

          const { messageTemplates, notificationChannel } = orgSettings;

          // Prepare base variables
          const baseVariables: Omit<TemplateVariables, 'nome'> = {
            titulo: reminder.resource_title,
            tipo_recurso: getResourceTypeLabel(reminder.resource_type),
          };

          let ministryId: string | null = null;
          let template: MessageTemplate;

          if (reminder.resource_type === "event") {
            // Single query for event data including custom templates
            const { data: eventData } = await supabase
              .from("events")
              .select("custom_message_template, custom_reminder_templates, date, start_time, created_at, ministry_id")
              .eq("id", reminder.resource_id)
              .single();

            if (eventData) {
              baseVariables.data_evento = formatDateBR(eventData.date);
              baseVariables.hora_evento = formatTime(eventData.start_time);
              baseVariables.data_criacao = formatDateBR(eventData.created_at?.split("T")[0] || "");
              baseVariables.hora_criacao = eventData.created_at ? eventData.created_at.split("T")[1]?.slice(0, 5) || "" : "";
              ministryId = eventData.ministry_id;
            }

            // Template priority: 
            // 1. Per-type event override (custom_reminder_templates[type])
            // 2. Event-wide custom template (custom_message_template) - only for manual/instant
            // 3. Org templates > defaults
            const perTypeTemplates = eventData?.custom_reminder_templates as Record<string, MessageTemplate> | null;
            if (perTypeTemplates && perTypeTemplates[reminder.reminder_type]) {
              console.log(`Using event's per-type template for ${reminder.reminder_type} on reminder ${reminder.id}`);
              template = perTypeTemplates[reminder.reminder_type];
            } else {
              template = getTemplate(messageTemplates, reminder.reminder_type);
            }

            // Fetch collaborator ministries with leader names
            const { data: collabMins } = await supabase
              .from("event_collaborator_ministries")
              .select("ministry_id")
              .eq("event_id", reminder.resource_id);

            if (collabMins && collabMins.length > 0) {
              const collabNames: string[] = [];
              for (const cm of collabMins) {
                if (ministryWithLeaderCache[cm.ministry_id] !== undefined) {
                  collabNames.push(ministryWithLeaderCache[cm.ministry_id]);
                } else {
                  const { data: minData } = await supabase
                    .from("ministries")
                    .select("name")
                    .eq("id", cm.ministry_id)
                    .single();
                  
                  let fullName = minData?.name || "";
                  if (minData) {
                    const { data: leaders } = await supabase
                      .from("user_ministries")
                      .select("user_id")
                      .eq("ministry_id", cm.ministry_id)
                      .eq("role", "leader");
                    
                    if (leaders && leaders.length > 0) {
                      const { data: profiles } = await supabase
                        .from("profiles")
                        .select("name")
                        .in("id", leaders.map(l => l.user_id));
                      const leaderNames = profiles?.map(p => p.name).join(", ") || "";
                      if (leaderNames) fullName = `${minData.name} (${leaderNames})`;
                    }
                  }
                  ministryWithLeaderCache[cm.ministry_id] = fullName;
                  collabNames.push(fullName);
                }
              }
              baseVariables.ministerios_colaboradores = collabNames.join(", ");
            }
          } else {
            template = getTemplate(messageTemplates, reminder.reminder_type);
            
            if (reminder.resource_type === "task") {
              const { data: taskData } = await supabase
                .from("event_tasks")
                .select("due_date, created_at, ministry_id")
                .eq("id", reminder.resource_id)
                .single();

              if (taskData) {
                baseVariables.data_evento = formatDateBR(taskData.due_date || "");
                baseVariables.data_criacao = formatDateBR(taskData.created_at?.split("T")[0] || "");
                ministryId = taskData.ministry_id;
              }
            }
          }

          // Get ministry name with leader (cached)
          let ministryName = "";
          if (ministryId) {
            if (ministryWithLeaderCache[ministryId] !== undefined) {
              ministryName = ministryWithLeaderCache[ministryId];
            } else {
              const { data: ministry } = await supabase
                .from("ministries")
                .select("name")
                .eq("id", ministryId)
                .single();
              
              let fullName = ministry?.name || "";
              if (ministry) {
                const { data: leaders } = await supabase
                  .from("user_ministries")
                  .select("user_id")
                  .eq("ministry_id", ministryId)
                  .eq("role", "leader");
                
                if (leaders && leaders.length > 0) {
                  const { data: profiles } = await supabase
                    .from("profiles")
                    .select("name")
                    .in("id", leaders.map(l => l.user_id));
                  const leaderNames = profiles?.map(p => p.name).join(", ") || "";
                  if (leaderNames) fullName = `${ministry.name} (${leaderNames})`;
                }
              }
              ministryWithLeaderCache[ministryId] = fullName;
              ministryName = fullName;
            }
          }

          baseVariables.ministerio = ministryName;

          const shouldSendWhatsApp = notificationChannel === "whatsapp" || notificationChannel === "both";
          const shouldSendPush = notificationChannel === "push" || notificationChannel === "both";

          console.log(`Sending reminders to ${recipients.length} recipients via channel: ${notificationChannel}`);

          // Render template for each recipient (personalized with [nome])
          for (const recipient of recipients) {
            const variables: TemplateVariables = {
              ...baseVariables,
              nome: recipient.name,
            };

            const { title, body } = renderTemplate(template, variables);

            console.log(`Sending to ${recipient.name}: ${title}`);

            // Send via WhatsApp if enabled
            if (shouldSendWhatsApp) {
              try {
                const whatsappResponse = await fetch(
                  `${supabaseUrl}/functions/v1/send-whatsapp`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                      organization_id: reminder.organization_id,
                      recipient_ids: [recipient.id],
                      title,
                      body,
                      tag: `${reminder.resource_type}-${reminder.resource_id}`,
                    }),
                  }
                );

                if (whatsappResponse.ok) {
                  const whatsappResult = await whatsappResponse.json();
                  console.log(`WhatsApp result for ${recipient.name}: ${whatsappResult.sent} sent, ${whatsappResult.failed} failed`);
                } else {
                  const errorText = await whatsappResponse.text();
                  console.error(`WhatsApp request failed for ${recipient.name}: ${whatsappResponse.status} - ${errorText}`);
                }
              } catch (whatsappError) {
                console.error(`Error calling send-whatsapp for ${recipient.name}:`, whatsappError);
              }
            }

            // Send via Push if enabled
            if (shouldSendPush) {
              try {
                const pushResponse = await fetch(
                  `${supabaseUrl}/functions/v1/send-push`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                      recipient_ids: [recipient.id],
                      title,
                      body,
                      tag: `${reminder.resource_type}-${reminder.resource_id}`,
                    }),
                  }
                );

                if (pushResponse.ok) {
                  const pushResult = await pushResponse.json();
                  console.log(`Push result for ${recipient.name}: ${pushResult.sent} sent, ${pushResult.failed} failed`);
                } else {
                  const errorText = await pushResponse.text();
                  console.error(`Push request failed for ${recipient.name}: ${pushResponse.status} - ${errorText}`);
                }
              } catch (pushError) {
                console.error(`Error calling send-push for ${recipient.name}:`, pushError);
              }
            }
          }

          const { error: updateError } = await supabase
            .from("scheduled_reminders")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", reminder.id);

          if (updateError) {
            console.error(`Error updating reminder ${reminder.id}:`, updateError);
            errors.push(reminder.id);
          } else {
            processedIds.push(reminder.id);
          }
        } else {
          console.log(`No recipients found for reminder ${reminder.id}`);
          await supabase
            .from("scheduled_reminders")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", reminder.id);
          processedIds.push(reminder.id);
        }
      } catch (err) {
        console.error(`Error processing reminder ${reminder.id}:`, err);
        errors.push(reminder.id);
      }
    }

    console.log(`Processed ${processedIds.length} reminders, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        message: "Reminders processed",
        processed: processedIds.length,
        errors: errors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
