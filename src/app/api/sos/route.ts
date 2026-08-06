// src/app/api/sos/route.ts
// POST  — send SOS alert: email first, SMS fallback via Africa's Talking
// DELETE — send "false alarm" cancellation to alerted contacts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
/* ── Shared mailer ────────────────────────────────────────────────── */
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

/* ── Africa's Talking SMS client (lazy — skipped if keys not set) ─── */
async function createSmsClient() {
  const apiKey   = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username) return null;
  try {
    const AfricasTalking = (await import("africastalking")).default as any;
    const AT = AfricasTalking({ apiKey, username });
    return AT.SMS;
  } catch {
    console.warn("Africa's Talking package not available or misconfigured — SMS skipped.");
  }
}

/* ── Phone number normalisation (Ghana default: 0XX → +233XX) ──────── */
function normalisePhone(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (trimmed.startsWith('+'))  return trimmed;
  if (trimmed.startsWith('233')) return `+${trimmed}`;
  if (trimmed.startsWith('0'))  return `+233${trimmed.slice(1)}`;
  return trimmed; // already formatted or unknown prefix — pass through
}

/* ── User loader ──────────────────────────────────────────────────── */
async function getUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { emergencyContacts: { orderBy: { priority: 'asc' } } },
  });
}

/* ── POST — Send SOS alert ────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { lat, lng, city, nearestER } = body as {
      lat?: number; lng?: number; city?: string; nearestER?: string;
    };

    const user = await getUser(session.user.email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const contacts = user.emergencyContacts ?? [];
    if (!contacts.length) {
      return NextResponse.json({ success: false, noContacts: true, emailsSent: 0, smsSent: 0, failed: 0, total: 0 });
    }

    const transport = createTransport();
    const smsClient = await createSmsClient();

    console.log(`[SOS] SMTP ready: ${!!transport}, SMS ready: ${!!smsClient}, Contacts: ${contacts.length}`);
    const mapLink    = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : null;
    const locationText = city
      ? `${city}${mapLink ? ` — ${mapLink}` : ''}`
      : (mapLink ?? 'Location unavailable');

    // SMS body — kept under 160 chars
    const smsBody = `EMERGENCY ALERT from ${user.name ?? 'a HealthConnect user'}. Location: ${city ?? (lat && lng ? `${lat},${lng}` : 'unavailable')}. Check their HealthConnect profile. Sent via HealthConnect Navigator.`.slice(0, 160);

    let emailsSent = 0;
    let smsSent    = 0;
    let failed     = 0;

    for (const c of contacts) {
      let notifiedViaEmail = false;

      // 1. Attempt email
      if (c.email && transport) {
        try {
          console.log(`[SOS] Attempting email to ${c.email}...`);
          await transport.sendMail({
            from:    `"HealthConnect Navigator" <${process.env.SMTP_USER}>`,
            to:      c.email,
            subject: `🆘 SOS ALERT — ${user.name ?? 'Someone you know'} needs help`,
            html: `
<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:20px">
  <div style="background:#ff4d6d;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px;text-align:center">
    <p style="font-size:32px;margin:0">🆘</p>
    <h1 style="font-size:22px;font-weight:900;margin:8px 0 4px">Emergency Alert</h1>
    <p style="margin:0;font-size:14px;opacity:0.9">${user.name ?? 'A HealthConnect user'} has activated an SOS alert</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 24px">
    <p style="font-size:14px;color:#374151;margin:0 0 14px"><strong>They may be in danger and need immediate help.</strong></p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-bottom:14px">
      <p style="margin:0 0 6px;font-size:13px;color:#111"><strong>📍 Location</strong></p>
      <p style="margin:0;font-size:13px;color:#374151">${locationText}</p>
      ${nearestER ? `<p style="margin:6px 0 0;font-size:13px;color:#374151"><strong>🏥 Nearest ER:</strong> ${nearestER}</p>` : ''}
    </div>
    <a href="${mapLink ?? '#'}" style="display:block;text-align:center;background:#ff4d6d;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:14px">
      Open Location in Maps
    </a>
    <p style="font-size:12px;color:#6b7280;margin:0">You are listed as an emergency contact for ${user.name ?? 'this user'} on HealthConnect Navigator. If this was a test or false alarm, you may receive a follow-up cancellation email.</p>
  </div>
</div>`,
          });
          emailsSent++;
          notifiedViaEmail = true;
          console.log(`[SOS] ✅ Email sent to ${c.email}`);
        } catch (emailErr) {
          console.error(`[SOS] ❌ Email failed for ${c.email}:`, emailErr);
          // Email failed — fall through to SMS
        }
      }

      // 2. SMS fallback: no email OR email failed
      if (!notifiedViaEmail && c.number && smsClient) {
        try {
          const phone = normalisePhone(c.number);
          console.log(`[SOS] Attempting SMS to ${phone}...`);
          await smsClient.send({ to: [phone], message: smsBody });
          smsSent++;
          console.log(`[SOS] ✅ SMS sent to ${phone}`);
        } catch {
          failed++;
        }
      } else if (!notifiedViaEmail && (!c.number || !smsClient)) {
        failed++;
      }
    }

    const success = emailsSent > 0 || smsSent > 0;

    return NextResponse.json({
      success,
      emailsSent,
      smsSent,
      failed,
      total: contacts.length,
      // Legacy fields kept for backwards compat with emergency page
      sent: emailsSent + smsSent,
      emailedCount: emailsSent,
      withoutEmail: contacts.filter(c => !c.email).map(c => ({ name: c.name, number: c.number })),
      contacts: contacts.map(c => ({ name: c.name, number: c.number, hasEmail: !!c.email })),
    });

  } catch (err) {
    console.error('SOS POST error:', err);
    return NextResponse.json({ success: false, emailsSent: 0, smsSent: 0, failed: 0, total: 0 }, { status: 500 });
  }
}

/* ── DELETE — Send false-alarm cancellation ───────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { lat, lng, city } = body as { lat?: number; lng?: number; city?: string };

    const user = await getUser(session.user.email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const withEmail = (user.emergencyContacts ?? []).filter(c => c.email);
    if (!withEmail.length) return NextResponse.json({ success: true, sent: 0 });

    const transport = createTransport();
    if (!transport) return NextResponse.json({ success: false, smtpMissing: true });

    const mapLink = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : null;
    const locationText = city ?? (mapLink ?? 'unknown location');

    let sent = 0;
    for (const c of withEmail) {
      try {
        await transport.sendMail({
          from:    `"HealthConnect Navigator" <${process.env.SMTP_USER}>`,
          to:      c.email!,
          subject: `✅ False Alarm — ${user.name ?? 'Someone you know'}'s SOS alert was cancelled`,
          html: `
<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:20px">
  <div style="background:#10b981;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px;text-align:center">
    <p style="font-size:32px;margin:0">✅</p>
    <h1 style="font-size:20px;font-weight:900;margin:8px 0 4px">SOS Alert Cancelled</h1>
    <p style="margin:0;font-size:14px;opacity:0.9">This was a false alarm — no action is needed</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 24px">
    <p style="font-size:14px;color:#374151;margin:0 0 12px">
      <strong>${user.name ?? 'A HealthConnect user'}</strong> has cancelled the SOS alert you just received.
      They are safe — please disregard the earlier message.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px;margin-bottom:14px">
      <p style="margin:0;font-size:13px;color:#166534">📍 Alert location: ${locationText}</p>
    </div>
    <p style="font-size:12px;color:#6b7280;margin:0">
      If you are still concerned about ${user.name ?? 'this person'}, please reach out to them directly.
    </p>
  </div>
</div>`,
        });
        sent++;
      } catch { /* best-effort */ }
    }

    return NextResponse.json({ success: true, sent });
  } catch (err) {
    console.error('SOS DELETE error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}