import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ─── Gmail SMTP transporter ─────────────────────────────────────────
   Required env vars (.env.local + Vercel environment variables):
     SMTP_HOST = smtp.gmail.com
     SMTP_PORT = 465
     SMTP_USER = you@gmail.com
     SMTP_PASS = xxxx xxxx xxxx xxxx  (Gmail App Password — 16 chars)
     SMTP_FROM = HealthConnect SOS <you@gmail.com>
   Port 465 (SSL/secure:true) is required — Vercel blocks port 587.
──────────────────────────────────────────────────────────────────── */
function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth:   { user, pass },
  });
}

/* ─── HTML email template ────────────────────────────────────────── */
function buildHtml(o: {
  contactName: string; userName: string; userEmail: string;
  lat?: number; lng?: number; city?: string; nearestER?: string; sentAt: string;
}): string {
  const hasCoords = typeof o.lat === 'number' && typeof o.lng === 'number';
  const mapsLink  = hasCoords ? `https://maps.google.com/?q=${o.lat},${o.lng}` : null;
  const place     = o.city || (hasCoords ? `${o.lat!.toFixed(5)}, ${o.lng!.toFixed(5)}` : null);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>SOS Alert</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
<tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#ff1744,#d50000);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:40px;margin-bottom:8px;">&#128680;</div>
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">SOS EMERGENCY ALERT</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${o.userName} needs immediate help</p>
  </td></tr>
  <tr><td style="background:#111827;padding:28px 32px;">
    <p style="margin:0 0 20px;color:#e5e7eb;font-size:15px;line-height:1.6;">
      Hi <strong style="color:#fff;">${o.contactName}</strong>,<br/><br/>
      <strong style="color:#fff;">${o.userName}</strong> has activated an emergency SOS alert
      on HealthConnect. Please check on them immediately or contact emergency services.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#1f2937;border:1px solid #374151;border-radius:12px;margin-bottom:16px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">&#128205; Location</p>
        ${place
          ? `<p style="margin:0 0 ${mapsLink ? '14px' : '0'};color:#f9fafb;font-size:17px;font-weight:700;">${place}</p>`
          : `<p style="margin:0;color:#9ca3af;font-size:14px;font-style:italic;">Location unavailable</p>`}
        ${mapsLink ? `<a href="${mapsLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;">Open in Google Maps →</a>` : ''}
      </td></tr>
    </table>
    ${o.nearestER ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border:1px solid #374151;border-radius:12px;margin-bottom:16px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">&#127973; Nearest Emergency Room</p><p style="margin:0;color:#f9fafb;font-size:17px;font-weight:700;">${o.nearestER}</p></td></tr></table>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#7f1d1d;border:1px solid #991b1b;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;text-align:center;">
        <p style="margin:0;color:#fca5a5;font-size:13px;font-weight:600;">
          Ghana Ambulance: <strong style="color:#fff;font-size:16px;">193</strong>
          &nbsp;|&nbsp; Police: <strong style="color:#fff;">191</strong>
          &nbsp;|&nbsp; Fire: <strong style="color:#fff;">192</strong>
        </p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#0d1117;border-radius:0 0 16px 16px;padding:18px 32px;text-align:center;border-top:1px solid #1f2937;">
    <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
      Sent by <strong style="color:#9ca3af;">HealthConnect</strong> on behalf of
      <strong style="color:#9ca3af;">${o.userName}</strong> (${o.userEmail})<br/>${o.sentAt}
    </p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function buildText(o: {
  contactName: string; userName: string; userEmail: string;
  lat?: number; lng?: number; city?: string; nearestER?: string; sentAt: string;
}): string {
  const hasCoords = typeof o.lat === 'number' && typeof o.lng === 'number';
  const place  = o.city || (hasCoords ? `${o.lat!.toFixed(5)}, ${o.lng!.toFixed(5)}` : 'Unavailable');
  const mapUrl = hasCoords ? `https://maps.google.com/?q=${o.lat},${o.lng}` : null;
  return [
    'SOS EMERGENCY ALERT',
    `Hi ${o.contactName},`,
    `${o.userName} has activated an emergency SOS alert on HealthConnect. Please check on them immediately.`,
    `Location: ${place}`,
    mapUrl      ? `Map: ${mapUrl}`             : null,
    o.nearestER ? `Nearest ER: ${o.nearestER}` : null,
    'Ghana Ambulance: 193  |  Police: 191  |  Fire: 192',
    `Sent by HealthConnect on behalf of ${o.userName} (${o.userEmail}) — ${o.sentAt}`,
  ].filter(Boolean).join('\n\n');
}

/* ─── POST /api/sos ─────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { lat, lng, city, nearestER } = body as {
      lat?: number; lng?: number; city?: string; nearestER?: string;
    };
    const hasLocation = typeof lat === 'number' && typeof lng === 'number';

    const user = await prisma.user.findUnique({
      where:   { email: session.user.email },
      include: { emergencyContacts: { orderBy: { priority: 'asc' } } },
    });
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    if (!user.emergencyContacts.length) {
      return NextResponse.json({ success: false, noContacts: true, sent: 0, total: 0, failed: 0, contacts: [] });
    }

    const transporter = getTransporter();
    if (!transporter) {
      console.warn('[SOS] SMTP_USER or SMTP_PASS not configured.');
      return NextResponse.json({
        success: false, smtpMissing: true, sent: 0,
        total:        user.emergencyContacts.length, failed: 0,
        withoutEmail: user.emergencyContacts.filter(c => !c.email?.trim()).map(c => ({ name: c.name, number: c.number })),
        contacts:     user.emergencyContacts.map(c => ({ name: c.name, number: c.number, hasEmail: !!c.email?.trim() })),
      });
    }

    const withEmail    = user.emergencyContacts.filter(c => c.email?.trim());
    const withoutEmail = user.emergencyContacts.filter(c => !c.email?.trim());

    if (!withEmail.length) {
      return NextResponse.json({
        success: false, noEmails: true, sent: 0,
        total:        user.emergencyContacts.length, failed: 0,
        withoutEmail: withoutEmail.map(c => ({ name: c.name, number: c.number })),
        contacts:     user.emergencyContacts.map(c => ({ name: c.name, number: c.number, hasEmail: false })),
      });
    }

    const sentAt   = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short' });
    const userName = user.name || session.user.email;
    const from     = process.env.SMTP_FROM || `HealthConnect SOS <${process.env.SMTP_USER}>`;

    /* Send individually to every contact with an email address */
    const results = await Promise.allSettled(
      withEmail.map(contact =>
        transporter.sendMail({
          from,
          to:      contact.email!.trim(),
          subject: `🚨 SOS Alert — ${userName} needs emergency help`,
          text:    buildText({ contactName: contact.name, userName, userEmail: session.user!.email!, lat: hasLocation ? lat : undefined, lng: hasLocation ? lng : undefined, city, nearestER, sentAt }),
          html:    buildHtml({ contactName: contact.name, userName, userEmail: session.user!.email!, lat: hasLocation ? lat : undefined, lng: hasLocation ? lng : undefined, city, nearestER, sentAt }),
        })
      )
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[SOS] Failed for ${withEmail[i].email}:`, (r as PromiseRejectedResult).reason?.message);
      }
    });

    return NextResponse.json({
      success:      sent > 0,
      sent, failed,
      total:        user.emergencyContacts.length,
      emailedCount: withEmail.length,
      withoutEmail: withoutEmail.map(c => ({ name: c.name, number: c.number })),
      contacts:     user.emergencyContacts.map(c => ({ name: c.name, number: c.number, hasEmail: !!c.email?.trim() })),
    });

  } catch (error) {
    console.error('[SOS] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to send SOS alert.' }, { status: 500 });
  }
}