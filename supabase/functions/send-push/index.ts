import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push VAPID implementation for Deno
// Based on RFC 8291 (Message Encryption for Web Push) and RFC 8292 (VAPID)

interface PushSubscription {
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  user_id: string;
}

interface PushPayload {
  recipient_ids: string[];
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Generate VAPID JWT token
async function generateVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const payloadB64 = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = base64UrlToUint8Array(privateKeyBase64);
  
  // Create JWK from raw private key (32 bytes)
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: uint8ArrayToBase64Url(privateKeyBytes),
      x: '', // Will be computed
      y: '', // Will be computed
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(async () => {
    // If JWK import fails, try PKCS8 format
    // For raw 32-byte keys, we need to derive the public key
    // This is a simplified approach - in production you'd store the full key
    const keyData = new Uint8Array([
      0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
      0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
      0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
      ...privateKeyBytes,
    ]);
    return crypto.subtle.importKey(
      'pkcs8',
      keyData,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  });

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format (r || s)
  const signatureBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  
  if (signatureBytes.length === 64) {
    // Already raw format
    r = signatureBytes.slice(0, 32);
    s = signatureBytes.slice(32);
  } else {
    // DER format - parse it
    let offset = 2;
    const rLen = signatureBytes[offset + 1];
    offset += 2;
    r = signatureBytes.slice(offset, offset + rLen);
    if (r.length > 32) r = r.slice(r.length - 32);
    offset += rLen + 2;
    const sLen = signatureBytes[offset - 1];
    s = signatureBytes.slice(offset, offset + sLen);
    if (s.length > 32) s = s.slice(s.length - 32);
  }

  // Pad to 32 bytes each
  const rPadded = new Uint8Array(32);
  const sPadded = new Uint8Array(32);
  rPadded.set(r, 32 - r.length);
  sPadded.set(s, 32 - s.length);

  const rawSignature = new Uint8Array(64);
  rawSignature.set(rPadded, 0);
  rawSignature.set(sPadded, 32);

  const signatureB64 = uint8ArrayToBase64Url(rawSignature);
  return `${unsignedToken}.${signatureB64}`;
}

// Send a single push notification
async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; icon?: string; badge?: string; tag?: string; data?: Record<string, unknown> },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // Generate VAPID JWT
    const jwt = await generateVapidJwt(audience, vapidSubject, vapidPrivateKey);

    // For simplicity, we'll send a plain text payload
    // Full encryption would require implementing RFC 8291
    const payloadJson = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/favicon.png',
      badge: payload.badge || '/favicon.png',
      tag: payload.tag,
      data: payload.data,
    });

    const payloadBytes = new TextEncoder().encode(payloadJson);

    // Create authorization header
    const authHeader = `vapid t=${jwt}, k=${vapidPublicKey}`;

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400', // 24 hours
        'Urgency': 'normal',
      },
      body: payloadBytes,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed for ${subscription.endpoint}: ${response.status} - ${errorText}`);
      
      // If subscription is invalid (410 Gone or 404), we should clean it up
      if (response.status === 410 || response.status === 404) {
        return { success: false, error: 'subscription_expired' };
      }
      
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    console.log(`Push sent successfully to ${subscription.endpoint}`);
    return { success: true };
  } catch (error) {
    console.error(`Error sending push to ${subscription.endpoint}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || Deno.env.get("ASSUNTO_VAPID");

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      console.error("Missing VAPID configuration");
      return new Response(
        JSON.stringify({ error: "VAPID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log("Received push request:", JSON.stringify(payload));

    if (!payload.recipient_ids || payload.recipient_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch subscriptions for all recipients
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", payload.recipient_ids);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found for recipients:", payload.recipient_ids);
      return new Response(
        JSON.stringify({ 
          message: "No subscriptions found", 
          sent: 0, 
          failed: 0,
          recipients: payload.recipient_ids.length 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions for ${payload.recipient_ids.length} recipients`);

    // Get recipient names for logging
    const { data: recipientProfiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", payload.recipient_ids);

    const recipientNameMap = new Map(
      recipientProfiles?.map((p) => [p.id, p.name]) || []
    );

    // Send notifications to all subscriptions
    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendPushNotification(
          sub as PushSubscription,
          {
            title: payload.title,
            body: payload.body,
            icon: payload.icon,
            badge: payload.badge,
            tag: payload.tag,
            data: payload.data,
          },
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        )
      )
    );

    // Clean up expired subscriptions
    const expiredSubscriptions = subscriptions.filter(
      (_, i) => results[i].error === 'subscription_expired'
    );
    
    if (expiredSubscriptions.length > 0) {
      console.log(`Cleaning up ${expiredSubscriptions.length} expired subscriptions`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredSubscriptions.map((s) => s.id));
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Push results: ${sent} sent, ${failed} failed`);

    // Log notifications for each recipient
    const notificationLogs = payload.recipient_ids.map((recipientId) => {
      const recipientSubscriptions = subscriptions.filter(
        (s) => s.user_id === recipientId
      );
      const recipientResults = recipientSubscriptions.map((sub) => {
        const subIndex = subscriptions.findIndex((s) => s.id === sub.id);
        return results[subIndex];
      });
      
      const anySent = recipientResults.some((r) => r?.success);
      const allFailed = recipientResults.length > 0 && recipientResults.every((r) => !r?.success);
      const noSubscription = recipientSubscriptions.length === 0;
      
      let status = 'sent';
      let errorMessage = null;
      
      if (noSubscription) {
        status = 'no_subscription';
        errorMessage = 'Nenhum dispositivo registrado';
      } else if (allFailed) {
        status = 'failed';
        errorMessage = recipientResults.find((r) => r?.error)?.error || 'Falha ao enviar';
      } else if (!anySent && recipientResults.length > 0) {
        status = 'failed';
        errorMessage = 'Falha parcial no envio';
      }
      
      return {
        recipient_id: recipientId,
        recipient_name: recipientNameMap.get(recipientId) || null,
        title: payload.title,
        body: payload.body,
        tag: payload.tag || null,
        data: payload.data || {},
        status,
        error_message: errorMessage,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      };
    });

    // Insert notification logs
    if (notificationLogs.length > 0) {
      const { error: logError } = await supabase
        .from("notification_logs")
        .insert(notificationLogs);

      if (logError) {
        console.error("Error logging notifications:", logError);
      } else {
        console.log(`Logged ${notificationLogs.length} notification(s)`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Push notifications processed",
        sent,
        failed,
        total: subscriptions.length,
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
