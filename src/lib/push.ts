// src/lib/push.ts
//
// web-push sender for browser push notifications — the third leg of the
// notification pipeline alongside in-app (NotificationsContext.tsx) and
// email (email.ts). Deliberately mirrors email.ts's shape: lazy client
// setup so a missing env var doesn't crash routes that never send push,
// batched Promise.allSettled sends so one dead subscription can't abort
// the rest of the batch, and the opt-in filter (privacyPrefs.pushEnabled)
// is the caller's job, not this file's — same division of responsibility
// as sendHealthAlertEmail().
//
// Setup:
//   npm install web-push
//   Generate a VAPID key pair once: npx web-push generate-vapid-keys
//   Add to .env:
//     VAPID_PUBLIC_KEY=...
//     VAPID_PRIVATE_KEY=...
//     VAPID_SUBJECT=mailto:you@example.com     (or https://your-domain)
//     NEXT_PUBLIC_VAPID_PUBLIC_KEY=...          (same value as VAPID_PUBLIC_KEY —
//                                                 the client needs it too, see
//                                                 src/lib/pushClient.ts)

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn('VAPID keys not set — push sending is disabled.');
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

// No shared rate limit to respect the way Resend's free tier has one, but
// batching still bounds how many concurrent requests fire against
// whatever push services (FCM, Mozilla autopush, etc.) a large user base
// happens to be spread across.
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 250;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface AlertPushResult {
  sent: number;
  failed: number;
  removed: number; // stale subscriptions cleaned up along the way
}

/**
 * Health alert push — called from POST /api/health-alerts when the admin
 * publishes with "Send push notification" checked.
 *
 * `subscriptions` must already be filtered by the caller to users with
 * privacyPrefs.pushEnabled true — same division as sendHealthAlertEmail().
 *
 * On a 404/410 response (the push service or browser has permanently
 * invalidated that endpoint — user uninstalled, cleared site data, etc.)
 * the subscription row is deleted rather than retried on every future
 * alert forever. Any other failure is logged and left alone, since it
 * might be transient.
 */
export async function sendHealthAlertPush(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  alert: { title: string; body: string }
): Promise<AlertPushResult> {
  const result: AlertPushResult = { sent: 0, failed: 0, removed: 0 };
  if (subscriptions.length === 0) return result;

  if (!ensureConfigured()) {
    // No keys configured — treat every recipient as failed rather than
    // throwing, so the admin route can still return a 201 with a clear
    // "0 sent" result instead of a 500. Same fallback as email.ts.
    result.failed = subscriptions.length;
    return result;
  }

  const payload = JSON.stringify({
    title: alert.title,
    body: alert.body,
    url: '/dashboard', // sw.js's notificationclick handler opens/focuses this
  });

  const staleIds: string[] = [];

  for (const batch of chunk(subscriptions, BATCH_SIZE)) {
    const outcomes = await Promise.allSettled(
      batch.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    outcomes.forEach((outcome, i) => {
      if (outcome.status === 'fulfilled') {
        result.sent++;
        return;
      }
      result.failed++;
      const statusCode = (outcome.reason as { statusCode?: number } | undefined)?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(batch[i].id);
      } else {
        console.error(`Push failed for subscription ${batch[i].id}:`, outcome.reason);
      }
    });

    // Only pause between full batches — no need to wait after the last,
    // possibly-partial one.
    if (batch.length === BATCH_SIZE) await sleep(BATCH_DELAY_MS);
  }

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
    result.removed = staleIds.length;
  }

  return result;
}
