import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Types matching the frontend ReminderTemplates / DelayConfig / RepeatConfig ---

interface DelayConfig {
  value: number;
  unit: "minutes" | "hours" | "days";
}

interface RepeatConfig {
  type: "none" | "minutes" | "hours" | "days" | "weeks" | "months" | "years";
  interval: number;
  duration: "forever" | "count" | "until";
  count?: number;
  until?: string;
}

interface TemplateWithRepeat {
  enabled: boolean;
  template: { title: string; body: string };
  repeat: RepeatConfig;
  delay?: DelayConfig;
  reference_date?: string;
}

// Event-level override (from custom_reminder_templates on the event)
interface EventTemplateOverride {
  title?: string;
  body?: string;
  delay?: DelayConfig;
  repeat?: RepeatConfig;
  reference_date?: string;
  enabled?: boolean;
}

interface ReminderTemplates {
  after_creation: TemplateWithRepeat;
  before_due: TemplateWithRepeat;
  on_due: TemplateWithRepeat;
}

interface OrgReminderSettings {
  enabled: boolean;
  reminder_templates?: ReminderTemplates;
  // Legacy fields (ignored now)
  [key: string]: unknown;
}

interface GenerateRemindersPayload {
  organization_id: string;
  resource_type: "event" | "task" | "announcement";
  resource_id: string;
  resource_title: string;
  due_date?: string;
  recipient_ids: string[];
  custom_reminder_templates?: Record<string, EventTemplateOverride>;
}

// Default templates if org has none configured
const DEFAULT_TEMPLATES: ReminderTemplates = {
  after_creation: {
    enabled: true,
    template: { title: "📝 Novo", body: "" },
    repeat: { type: "none", interval: 1, duration: "forever" },
    delay: { value: 30, unit: "minutes" },
  },
  before_due: {
    enabled: true,
    template: { title: "⏰ Lembrete", body: "" },
    repeat: { type: "days", interval: 1, duration: "count", count: 3 },
  },
  on_due: {
    enabled: true,
    template: { title: "📅 Hoje", body: "" },
    repeat: { type: "none", interval: 1, duration: "forever" },
  },
};

// --- Helpers ---

/** Add a duration (value + unit) to a Date and return new Date */
function addDuration(base: Date, value: number, unit: string): Date {
  const result = new Date(base);
  switch (unit) {
    case "minutes":
      result.setMinutes(result.getMinutes() + value);
      break;
    case "hours":
      result.setHours(result.getHours() + value);
      break;
    case "days":
      result.setDate(result.getDate() + value);
      break;
    case "weeks":
      result.setDate(result.getDate() + value * 7);
      break;
    case "months":
      result.setMonth(result.getMonth() + value);
      break;
    case "years":
      result.setFullYear(result.getFullYear() + value);
      break;
    default:
      result.setDate(result.getDate() + value);
  }
  return result;
}

/** Generate remind_at dates for a given template config */
function generateRemindAts(
  config: TemplateWithRepeat,
  reminderType: string,
  now: Date,
  dueDate?: Date,
  referenceDate?: Date
): Date[] {
  if (!config.enabled) return [];

  const dates: Date[] = [];

  if (reminderType === "after_creation") {
    // Use reference_date if provided, otherwise fall back to now
    const baseDate = referenceDate || now;
    const delay = config.delay || { value: 30, unit: "minutes" };
    const firstRemind = addDuration(baseDate, delay.value, delay.unit);
    // Only schedule if in the future
    if (firstRemind > now) {
      dates.push(firstRemind);
    }

    // Additional reminders based on repeat
    if (config.repeat && config.repeat.type !== "none") {
      const repeatCount = config.repeat.duration === "count" ? (config.repeat.count || 1) : 1;
      // repeatCount is total occurrences including first? 
      // Based on plan: "repeat a cada 10 min, 2 vezes" -> 2 reminders total
      // So we already have 1, need (repeatCount - 1) more
      for (let i = 1; i < repeatCount; i++) {
        const next = addDuration(firstRemind, config.repeat.interval * i, config.repeat.type);
        dates.push(next);
      }
    }
  } else if (reminderType === "before_due") {
    if (!dueDate) return [];

    // before_due uses repeat to generate N reminders counting backwards from due date
    if (config.repeat && config.repeat.type !== "none") {
      const repeatCount = config.repeat.duration === "count" ? (config.repeat.count || 1) : 1;
      for (let i = 1; i <= repeatCount; i++) {
        const remind = addDuration(dueDate, -(config.repeat.interval * i), config.repeat.type);
        if (remind > now) {
          dates.push(remind);
        }
      }
    } else {
      // No repeat: single reminder 1 day before
      const remind = addDuration(dueDate, -1, "days");
      if (remind > now) {
        dates.push(remind);
      }
    }
  } else if (reminderType === "on_due") {
    if (!dueDate) return [];
    if (dueDate > now) {
      dates.push(new Date(dueDate));
    }
  }

  return dates;
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: GenerateRemindersPayload = await req.json();
    console.log("Generating reminders for:", JSON.stringify(payload));

    const {
      organization_id,
      resource_type,
      resource_id,
      resource_title,
      due_date,
      recipient_ids,
      custom_reminder_templates,
    } = payload;

    if (!organization_id || !resource_type || !resource_id || !resource_title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch organization reminder settings
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("reminder_settings")
      .eq("id", organization_id)
      .single();

    if (orgError) {
      console.error("Error fetching organization:", orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settings: OrgReminderSettings = org.reminder_settings || { enabled: true };

    if (!settings.enabled) {
      console.log("Reminders disabled for organization:", organization_id);
      return new Response(
        JSON.stringify({ message: "Reminders disabled", reminders_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the templates: org-level or defaults
    const orgTemplates: ReminderTemplates = settings.reminder_templates || DEFAULT_TEMPLATES;

    // Delete existing reminders for this resource
    const { error: deleteError } = await supabase
      .from("scheduled_reminders")
      .delete()
      .eq("resource_type", resource_type)
      .eq("resource_id", resource_id);

    if (deleteError) {
      console.error("Error deleting old reminders:", deleteError);
    }

    const now = new Date();
    const dueDate = due_date ? new Date(due_date) : undefined;

    // If due_date is just a date (YYYY-MM-DD), set to start of day
    // We keep the original time if provided
    if (dueDate && due_date && due_date.length === 10) {
      dueDate.setHours(0, 0, 0, 0);
    }

    const remindersToCreate: {
      organization_id: string;
      resource_type: string;
      resource_id: string;
      resource_title: string;
      remind_at: string;
      reminder_type: string;
      recipient_ids: string[];
    }[] = [];

    const reminderTypes: (keyof ReminderTemplates)[] = ["after_creation", "before_due", "on_due"];

    for (const type of reminderTypes) {
      // Priority: event override > org config > defaults
      const orgConfig = orgTemplates[type];
      const eventOverride = custom_reminder_templates?.[type];

      // Merge: event override fields take precedence over org config
      const config: TemplateWithRepeat = eventOverride
        ? {
            ...orgConfig,
            enabled: eventOverride.enabled !== undefined ? eventOverride.enabled : orgConfig.enabled,
            delay: eventOverride.delay || orgConfig.delay,
            repeat: eventOverride.repeat || orgConfig.repeat,
            reference_date: eventOverride.reference_date || orgConfig.reference_date,
          }
        : orgConfig;

      if (!config || !config.enabled) {
        console.log(`Skipping ${type}: disabled or not configured`);
        continue;
      }

      // Parse reference_date for after_creation
      let referenceDate: Date | undefined;
      if (type === "after_creation" && config.reference_date) {
        referenceDate = new Date(config.reference_date);
        // If it's just a date (YYYY-MM-DD), set to start of day
        if (config.reference_date.length === 10) {
          referenceDate.setHours(0, 0, 0, 0);
        }
      }

      const dates = generateRemindAts(config, type, now, dueDate, referenceDate);
      console.log(`${type}: generated ${dates.length} remind_at dates`, dates.map(d => d.toISOString()));

      for (const date of dates) {
        remindersToCreate.push({
          organization_id,
          resource_type,
          resource_id,
          resource_title,
          remind_at: date.toISOString(),
          reminder_type: type,
          recipient_ids,
        });
      }
    }

    // 1. Filter out reminders after the event date
    let filteredReminders = remindersToCreate;
    if (dueDate) {
      const beforeCount = filteredReminders.length;
      filteredReminders = filteredReminders.filter(r => new Date(r.remind_at) <= dueDate);
      if (filteredReminders.length < beforeCount) {
        console.log(`Filtered out ${beforeCount - filteredReminders.length} reminders after event date (${dueDate.toISOString()})`);
      }
    }

    // 2. Deduplicate by calendar day (priority: after_creation > before_due > on_due)
    const seenDays = new Set<string>();
    const deduped: typeof filteredReminders = [];
    for (const r of filteredReminders) {
      const day = r.remind_at.slice(0, 10); // YYYY-MM-DD
      if (!seenDays.has(day)) {
        seenDays.add(day);
        deduped.push(r);
      } else {
        console.log(`Deduplicated reminder on ${day} (type: ${r.reminder_type})`);
      }
    }
    filteredReminders = deduped;

    // Insert all reminders
    if (filteredReminders.length > 0) {
      const { error: insertError } = await supabase
        .from("scheduled_reminders")
        .insert(filteredReminders);

      if (insertError) {
        console.error("Error inserting reminders:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create reminders" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Created ${filteredReminders.length} reminders for ${resource_type}:${resource_id}`);

    return new Response(
      JSON.stringify({
        message: "Reminders generated successfully",
        reminders_created: filteredReminders.length,
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
