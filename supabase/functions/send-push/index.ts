// send-push — delivers one notification row as an Expo push notification.
//
// Called by the database (private.dispatch_push via pg_net) after the
// transaction that created the notification commits. Authenticated with a
// shared secret header, not a user JWT (verify_jwt = false in config.toml).
//
// Records the outcome on the notification (push_sent_at / push_error) and
// clears a courier's token when Expo reports DeviceNotRegistered.
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const ANDROID_CHANNEL_ID = "deliveries"; // must match the channel created by the courier app

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Constant-time string comparison for the shared secret. */
function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  const given = req.headers.get("x-webhook-secret") ?? "";
  if (!secret || !safeEqual(given, secret)) return json(401, { error: "unauthorized" });

  const payload = await req.json().catch(() => null);
  const notificationId = payload?.notification_id;
  if (typeof notificationId !== "string") return json(400, { error: "notification_id_required" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: n, error: nErr } = await admin
    .from("notifications")
    .select("id, recipient_id, type, title, body, delivery_id, push_sent_at")
    .eq("id", notificationId)
    .maybeSingle();
  if (nErr) return json(500, { error: "db_error" });
  if (!n) return json(404, { error: "notification_not_found" });
  if (n.push_sent_at) return json(200, { skipped: "already_sent" }); // idempotent on retries

  const { data: profile } = await admin
    .from("profiles")
    .select("expo_push_token, is_active")
    .eq("id", n.recipient_id)
    .maybeSingle();

  const token = profile?.is_active ? profile.expo_push_token : null;
  if (!token) {
    await admin.from("notifications").update({ push_error: "NO_TOKEN" }).eq("id", n.id);
    return json(200, { skipped: "no_token" });
  }

  const headers: Record<string, string> = { accept: "application/json", "content-type": "application/json" };
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN"); // only if enhanced push security is enabled
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  let ticket: { status?: string; details?: { error?: string }; message?: string } | undefined;
  let requestError: string | undefined;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify([
        {
          to: token,
          title: n.title,
          body: n.body,
          sound: "default",
          priority: "high",
          channelId: ANDROID_CHANNEL_ID,
          data: { notificationId: n.id, type: n.type, deliveryId: n.delivery_id },
        },
      ]),
    });
    const result = await res.json().catch(() => null);
    ticket = Array.isArray(result?.data) ? result.data[0] : undefined;
    if (!ticket) requestError = result?.errors?.[0]?.code ?? `HTTP_${res.status}`;
  } catch {
    requestError = "NETWORK_ERROR";
  }

  if (ticket?.status === "ok") {
    await admin.from("notifications").update({ push_sent_at: new Date().toISOString(), push_error: null }).eq("id", n.id);
    return json(200, { sent: true });
  }

  const code = requestError ?? ticket?.details?.error ?? "UNKNOWN_ERROR";
  await admin.from("notifications").update({ push_error: code }).eq("id", n.id);

  if (code === "DeviceNotRegistered") {
    // Stop sending to this token — but only if the courier hasn't registered a new one meanwhile.
    await admin.from("profiles").update({ expo_push_token: null }).eq("id", n.recipient_id).eq("expo_push_token", token);
  }

  return json(200, { sent: false, error: code });
});
