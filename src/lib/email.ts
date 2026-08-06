// src/lib/email.ts
//
// Resend email helpers — health alert notifications + welcome email.
// See HEALTHNAV handoff Section 8 for the full rationale (why email over
// Web Push, why Promise.allSettled instead of Promise.all, why opt-out
// filtering happens in the caller and not in here).
//
// Setup:
//   npm install resend
//   Add RESEND_API_KEY to .env (get it from the Resend dashboard)
//   Verify a sending domain in Resend (SPF/DKIM) BEFORE demo day — an
//   unverified domain bounces or lands in spam. Update the two `from`
//   addresses below to match whatever domain you actually verify;
//   healthconnectnav.com below is a placeholder from the project spec.

import { Resend } from 'resend';

// Lazily construct the Resend client. `new Resend(undefined)` throws
// synchronously, and since this module is imported at the top of
// route.ts, that throw used to blow up EVERY handler in that file —
// including GET, which never sends email at all. Deferring construction
// to send-time means the app runs fine without RESEND_API_KEY set (email
// sends just no-op with a console warning) instead of 500-ing routes
// that have nothing to do with email.
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('RESEND_API_KEY not set — email sending is disabled.');
    return null;
  }
  resend = new Resend(key);
  return resend;
}

// Resend free tier is rate-limited (~2 requests/second). Chunking and
// spacing out sends means a real alert going out to hundreds of users
// doesn't get rate-limited partway through the batch.
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Welcome email — called once, right after signup.
 * Never throws: a failed welcome email must not break account creation.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const client = getResendClient();
  if (!client) return; // no key configured — silently skip, never break signup

  try {
    await client.emails.send({
      // TODO: switch back to 'hello@healthconnectnav.com' once that domain
      // is verified in Resend (SPF/DKIM) — see setup notes at top of file.
      // Until then, sends from your own domain fail even with a valid key.
      from: 'onboarding@resend.dev',
      to,
      subject: 'Welcome to HealthConnect Navigator',
      html: `<p>Hi ${name},</p>
             <p>Welcome to HealthConnect Navigator — find the nearest hospital,
             clinic, or specialist anywhere in Ghana, in seconds.</p>
             <p>Open the app to get started.</p>`,
    });
  } catch (err) {
    console.error('Welcome email failed:', err);
  }
}

export interface AlertEmailResult {
  sent: number;
  failed: number;
  failedEmails: string[];
}

/**
 * Health alert email — called from POST /api/health-alerts when the admin
 * publishes a new alert with "Send email notification" checked.
 *
 * IMPORTANT: `users` must already be filtered by the caller to
 * `alertEmailsEnabled: true` (and, in v2, matched against region). This
 * function sends to whoever it's given — the opt-out check is the caller's
 * responsibility, not this function's, so it stays a pure "send to this
 * list" primitive.
 *
 * Uses Promise.allSettled (NOT Promise.all) per batch — one invalid or
 * bouncing address must not abort the rest of that batch and silently
 * skip every other user. Each outcome is tracked individually so the
 * admin route can report exact sent/failed counts instead of a blind
 * "success" that could be hiding a batch-wide silent failure.
 *
 * `personalize` (per user, defaults to true if omitted) backs the
 * "Welcome me by name in alerts" toggle on Profile → Settings → Notifications
 * (Section 14). false → generic "Hi there," greeting instead of the name.
 */
export async function sendHealthAlertEmail(
  users: { email: string; name: string; personalize?: boolean }[],
  alert: { title: string; body: string; region: string | null }
): Promise<AlertEmailResult> {
  const result: AlertEmailResult = { sent: 0, failed: 0, failedEmails: [] };
  if (users.length === 0) return result;

  const client = getResendClient();
  if (!client) {
    // No key configured — treat every recipient as failed rather than
    // throwing, so the admin route can still return a 201 with a clear
    // "0 sent" result instead of a 500.
    result.failed = users.length;
    result.failedEmails = users.map(u => u.email);
    return result;
  }

  for (const batch of chunk(users, BATCH_SIZE)) {
    const outcomes = await Promise.allSettled(
      batch.map(user =>
        client.emails.send({
          // TODO: switch back to 'alerts@healthconnectnav.com' once that
          // domain is verified in Resend — see setup notes at top of file.
          from: 'onboarding@resend.dev',
          to: user.email,
          subject: `Health Alert — ${alert.title}`,
          html: `<p>Hi ${user.personalize === false ? 'there' : user.name},</p>
                 <p><strong>${alert.title}</strong></p>
                 <p>${alert.body}</p>
                 <p>Open HealthConnect Navigator for more details and to find nearby facilities.</p>`,
        })
      )
    );

    outcomes.forEach((outcome, i) => {
      if (outcome.status === 'fulfilled') {
        result.sent++;
      } else {
        result.failed++;
        result.failedEmails.push(batch[i].email);
        console.error(`Alert email failed for ${batch[i].email}:`, outcome.reason);
      }
    });

    // Only pause between full batches — no need to wait after the last,
    // possibly-partial one.
    if (batch.length === BATCH_SIZE) await sleep(BATCH_DELAY_MS);
  }

  return result;
}