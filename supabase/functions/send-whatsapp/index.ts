import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WhatsAppPayload {
  organization_id: string;
  recipient_ids: string[];
  title: string;
  body: string;
  tag?: string;
}

interface EvolutionSendResponse {
  key?: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: object;
  status?: string;
}

// Format phone number to international format (remove +, spaces, dashes)
function formatPhoneNumber(phone: string, countryCode: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  const countryDialCodes: Record<string, string> = {
    BR: "55", US: "1", PT: "351", CA: "1",
  };
  const dialCode = countryDialCodes[countryCode] || "55";
  if (!cleaned.startsWith(dialCode)) {
    cleaned = dialCode + cleaned;
  }
  return cleaned;
}

// Validate caller's identity and organization access
async function validateCaller(
  req: Request,
  supabase: any,
  organizationId: string
): Promise<{ authorized: boolean; error?: string; status?: number }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Create a client scoped to the caller
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  // Check user belongs to the organization
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.organization_id !== organizationId) {
    return { authorized: false, error: "Access denied", status: 403 };
  }

  return { authorized: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WhatsAppPayload = await req.json();
    console.log("WhatsApp send request:", JSON.stringify(payload));

    const { organization_id, recipient_ids, title, body, tag } = payload;

    if (!organization_id || !recipient_ids || recipient_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "organization_id and recipient_ids are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input lengths and formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organization_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(recipient_ids) || recipient_ids.length > 500 || !recipient_ids.every((id: string) => uuidRegex.test(id))) {
      return new Response(
        JSON.stringify({ error: "Invalid recipient_ids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof title !== "string" || title.length > 500) {
      return new Response(
        JSON.stringify({ error: "Title too long (max 500 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof body !== "string" || body.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Body too long (max 5000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate caller: check JWT and org membership
    // Allow service-role calls (from other edge functions like process-reminders)
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = authHeader?.includes(supabaseServiceKey);
    
    if (!isServiceRole) {
      const validation = await validateCaller(req, supabase, organization_id);
      if (!validation.authorized) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: validation.status || 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch organization's Evolution API credentials
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("evolution_api_url, evolution_api_key, evolution_instance_name, whatsapp_connected")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!org.whatsapp_connected) {
      console.error("WhatsApp not connected for organization:", organization_id);
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp não conectado",
          message: "Conecte o WhatsApp nas configurações antes de enviar mensagens",
          code: "NOT_CONNECTED"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { evolution_api_url, evolution_api_key, evolution_instance_name } = org;

    if (!evolution_api_url || !evolution_api_key || !evolution_instance_name) {
      console.error("WhatsApp not configured for organization:", organization_id);
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp não configurado",
          message: "Configure a Evolution API nas configurações de WhatsApp" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recipients' phone numbers
    const { data: recipients, error: recipientsError } = await supabase
      .from("profiles")
      .select("id, name, phone, phone_country")
      .in("id", recipient_ids);

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      return new Response(
        JSON.stringify({ error: "Error fetching recipients" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients found", sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out recipients without valid phone numbers
    const validRecipients = recipients.filter((r) => {
      if (!r.phone || r.phone.trim() === "") {
        console.log(`⚠ Skipping ${r.name}: no phone number`);
        return false;
      }
      if (!r.phone_country || r.phone_country.trim() === "") {
        console.log(`⚠ Skipping ${r.name}: no phone country code`);
        return false;
      }
      return true;
    });

    const skippedCount = recipients.length - validRecipients.length;
    if (skippedCount > 0) {
      console.log(`⚠ ${skippedCount} recipients skipped (missing phone or country)`);
    }

    if (validRecipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No recipients with valid phone numbers",
          sent: 0, failed: 0, skipped: skippedCount
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending WhatsApp to ${validRecipients.length} recipients (${skippedCount} skipped)`);

    const message = `${title}\n\n${body}`;

    let sent = 0;
    let failed = 0;
    let skipped = skippedCount;

    async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch(url, options);
          if (response.status === 429) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          return response;
        } catch (error) {
          lastError = error as Error;
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      throw lastError || new Error("Max retries exceeded");
    }

    const sendPromises = validRecipients.map(async (recipient) => {
      const phoneNumber = formatPhoneNumber(recipient.phone, recipient.phone_country);
      
      try {
        const evolutionUrl = `${evolution_api_url}/message/sendText/${evolution_instance_name}`;
        const evolutionPayload = { number: phoneNumber, text: message };

        console.log(`Sending to ${recipient.name} (${phoneNumber})`);

        const response = await fetchWithRetry(evolutionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolution_api_key,
          },
          body: JSON.stringify(evolutionPayload),
        });

        const responseData = await response.json() as EvolutionSendResponse;

        const logData = {
          recipient_id: recipient.id,
          recipient_name: recipient.name,
          title,
          body,
          tag: tag || null,
          data: { phone: phoneNumber, response: responseData },
          status: response.ok ? "sent" : "failed",
          error_message: response.ok ? null : JSON.stringify(responseData),
          sent_at: response.ok ? new Date().toISOString() : null,
        };

        await supabase.from("notification_logs").insert(logData);

        if (response.ok) {
          console.log(`✓ Sent to ${recipient.name}`);
          sent++;
        } else {
          console.error(`✗ Failed for ${recipient.name}:`, responseData);
          failed++;
        }
      } catch (error) {
        console.error(`✗ Error sending to ${recipient.name}:`, error);
        await supabase.from("notification_logs").insert({
          recipient_id: recipient.id,
          recipient_name: recipient.name,
          title, body,
          tag: tag || null,
          data: { phone: phoneNumber },
          status: "failed",
          error_message: (error as Error).message,
        });
        failed++;
      }
    });

    await Promise.all(sendPromises);

    console.log(`WhatsApp send complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ sent, failed, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
