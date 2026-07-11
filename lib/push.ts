import webpush from "web-push";
import { supabaseServer } from "@/lib/supabase-server";
import type { NotificationCandidate } from "@/lib/notifications";

// Web-push transport. VAPID keys are env-gated the same way Stripe is —
// everything 503s/hides cleanly until they're configured.
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  (client subscribes with this)
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT                 (mailto:hello@studyledger.in)

let configured = false;

export function isPushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureVapid() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@studyledger.in",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type StoredSubscription = {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
};

/**
 * Send one notification to every device the user subscribed. Endpoints that
 * report 404/410 (expired/unsubscribed at the browser) are deleted — the
 * automatic stale-subscription cleanup.
 */
export async function sendToUser(userId: string, n: NotificationCandidate): Promise<{ delivered: number; cleaned: number }> {
  ensureVapid();

  const { data: subs } = await supabaseServer
    .from("push_subscriptions")
    .select("endpoint, user_id, p256dh, auth")
    .eq("user_id", userId);

  let delivered = 0, cleaned = 0;
  const payload = JSON.stringify({ title: n.title, body: n.body, url: n.url, type: n.type, key: n.key });

  for (const sub of (subs ?? []) as StoredSubscription[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 * 12, urgency: n.priority === "high" ? "high" : "normal" },
      );
      delivered++;
      await supabaseServer
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("endpoint", sub.endpoint);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabaseServer.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        cleaned++;
      }
      // Other failures (429/5xx) are left alone — the semantic-key dedup
      // means this notification simply won't retry, which is the right
      // trade for nudges: better silently dropped than doubled.
    }
  }
  return { delivered, cleaned };
}
