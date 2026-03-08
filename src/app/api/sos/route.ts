import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/* ─── Nodemailer transporter (lazy — missing env vars disable email
       without crashing the rest of the app)                        ─── */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/* ─── HTML email template ────────────────────────────────────────── */
function buildEmailHtml(opts: {
  contactName: string;
  userName:    string;
  userEmail:   string;
  lat?:        number;
  lng?:        number;
  city?:       string;
  nearestER?:  string;
  sentAt:      string;
}): string {
  const hasCoords = typeof opts.lat === 'number' && typeof opts.lng === 'number';
  const mapsLink  = hasCoords ? `https://maps.google.com/?q=${opts.lat},${opts.lng}` : null;
  const coordText = opts.city || (hasCoords ? `${opts.lat!.toFixed(5)}, ${opts.lng!.toFixed(5)}` : null);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SOS Emergency Alert</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#ff1744,#d50000);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">&#128680;</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">SOS EMERGENCY ALERT</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${opts.userName} needs immediate help</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#111827;padding:28px 32px;">

          <p style="margin:0 0 20px;color:#e5e7eb;font-size:15px;line-height:1.6;">
            Hi <strong style="color:#fff;">${opts.contactName}</strong>,<br /><br />
            <strong style="color:#fff;">${opts.userName}</strong> has activated an emergency SOS
            alert on HealthConnect. Please check on them immediately or contact emergency services.
          </p>

          <!-- Location card -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#1f2937;border:1px solid #374151;border-radius:12px;margin-bottom:16px;">
            <tr><td style="padding:18px 20px;">
              <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.8px;">&#128205; Location</p>
              ${coordText
                ? `<p style="margin:0 0 14px;color:#f9fafb;font-size:17px;font-weight:700;">${coordText}</p>`
                : `<p style="margin:0 0 14px;color:#9ca3af;font-size:14px;font-style:italic;">Location unavailable — GPS could not be acquired</p>`
              }
              ${mapsLink
                ? `<a href="${mapsLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;">Open in Google Maps &#8594;</a>`
                : ''
              }
            </td></tr>
          </table>

          ${opts.nearestER ? `
          <!-- Nearest ER card -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#1f2937;border:1px solid #374151;border-radius:12px;margin-bottom:16px;">
            <tr><td style="padding:18px 20px;">
              <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.8px;">&#127973; Nearest Emergency Room</p>
              <p style="margin:0;color:#f9fafb;font-size:17px;font-weight:700;">${opts.nearestER}</p>
            </td></tr>
          </table>
          ` : ''}

          <!-- Emergency numbers -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#7f1d1d;border:1px solid #991b1b;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;text-align:center;">
              <p style="margin:0;color:#fca5a5;font-size:13px;font-weight:600;">
                Ghana Ambulance: <strong style="color:#fff;font-size:16px;">193</strong>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                Police: <strong style="color:#fff;">191</strong>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                Fire: <strong style="color:#fff;">192</strong>
              </p>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0d1117;border-radius:0 0 16px 16px;padding:18px 32px;
          text-align:center;border-top:1px solid #1f2937;">
          <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.6;">
            Sent by <strong style="color:#9ca3af;">HealthConnect</strong> on behalf of
            <strong style="color:#9ca3af;">${opts.userName}</strong>
            (${opts.userEmail})<br />
            ${opts.sentAt}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─── Plain-text fallback ────────────────────────────────────────── */
function buildEmailText(opts: {
  contactName: string;
  userName:    string;
  userEmail:   string;
  lat?:        number;
  lng?:        number;
  city?:       string;
  nearestER?:  string;
  sentAt:      string;
}): string {
  const hasCoords = typeof opts.lat === 'number' && typeof opts.lng === 'number';
  const mapsLink  = hasCoords ? `https://maps.google.com/?q=${opts.lat},${opts.lng}` : null;
  const coordText = opts.city || (hasCoords ? `${opts.lat!.toFixed(5)}, ${opts.lng!.toFixed(5)}` : null);
  const lines = [
    `SOS EMERGENCY ALERT`,
    ``,
    `Hi ${opts.contactName},`,
    ``,
    `${opts.userName} has activated an emergency SOS alert on HealthConnect.`,
    `Please check on them immediately or contact emergency services.`,
    ``,
    `Location : ${coordText || 'Unavailable — GPS could not be acquired'}`,
  ];
  if (mapsLink) lines.push(`Map link : ${mapsLink}`);
  if (opts.nearestER) lines.push(`Nearest ER: ${opts.nearestER}`);
  lines.push(
    ``,
    `Ghana Ambulance: 193  |  Police: 191  |  Fire: 192`,
    ``,
    `---`,
    `Sent by HealthConnect on behalf of ${opts.userName} (${opts.userEmail})`,
    `${opts.sentAt}`,
  );
  return lines.join('\n');
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

    /* ── Fetch user + contacts ───────────────────────────────── */
    const user = await prisma.user.findUnique({
      where:   { email: session.user.email },
      include: { emergencyContacts: { orderBy: { priority: 'asc' } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!user.emergencyContacts.length) {
      return NextResponse.json({
        success:    false,
        noContacts: true,
        error:      'No emergency contacts saved. Add contacts in the Emergency Hub.',
        sent: 0, total: 0, failed: 0,
        contacts: [],
      });
    }

    /* ── Split: contacts with vs without email ───────────────── */
    const withEmail    = user.emergencyContacts.filter(c => c.email?.trim());
    const withoutEmail = user.emergencyContacts.filter(c => !c.email?.trim());

    const sentAt      = new Date().toLocaleString('en-GB', {
      timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short',
    });
    const userName    = user.name || session.user.email;
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@healthconnect.app';
    const transporter = getTransporter();

    /* ── SMTP not configured ─────────────────────────────────── */
    if (!transporter) {
      console.warn('[SOS] SMTP not configured — email not sent.');
      return NextResponse.json({
        success:      false,
        smtpMissing:  true,
        sent:         0,
        total:        user.emergencyContacts.length,
        failed:       0,
        withoutEmail: withoutEmail.map(c => ({ name: c.name, number: c.number })),
        contacts:     user.emergencyContacts.map(c => ({
          name: c.name, number: c.number, hasEmail: !!c.email,
        })),
      });
    }

    /* ── No contact has an email address ────────────────────── */
    if (!withEmail.length) {
      return NextResponse.json({
        success:      false,
        noEmails:     true,
        error:        'None of your emergency contacts have an email address. Add emails in the Emergency Hub.',
        sent:         0,
        total:        user.emergencyContacts.length,
        failed:       0,
        withoutEmail: withoutEmail.map(c => ({ name: c.name, number: c.number })),
        contacts:     user.emergencyContacts.map(c => ({
          name: c.name, number: c.number, hasEmail: false,
        })),
      });
    }

    /* ── Send emails to all contacts that have one ───────────── */
    const results = await Promise.allSettled(
      withEmail.map(contact =>
        transporter.sendMail({
          from:    `"HealthConnect SOS" <${fromAddress}>`,
          to:      contact.email!,
          subject: `SOS Alert — ${userName} needs emergency help`,
          text:    buildEmailText({
            contactName: contact.name, userName, userEmail: session.user!.email!,
            lat: hasLocation ? lat : undefined,
            lng: hasLocation ? lng : undefined,
            city, nearestER, sentAt,
          }),
          html: buildEmailHtml({
            contactName: contact.name, userName, userEmail: session.user!.email!,
            lat: hasLocation ? lat : undefined,
            lng: hasLocation ? lng : undefined,
            city, nearestER, sentAt,
          }),
        })
      )
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const failedDetails = results
      .map((r, i) => r.status === 'rejected'
        ? {
            name:  withEmail[i].name,
            email: withEmail[i].email,
            error: (r as PromiseRejectedResult).reason?.message,
          }
        : null)
      .filter(Boolean);

    if (failedDetails.length) {
      console.error('[SOS] Email failures:', failedDetails);
    }

    return NextResponse.json({
      success:      sent > 0,
      sent,
      failed,
      total:        user.emergencyContacts.length,
      emailedCount: withEmail.length,
      withoutEmail: withoutEmail.map(c => ({ name: c.name, number: c.number })),
      contacts:     user.emergencyContacts.map(c => ({
        name: c.name, number: c.number, hasEmail: !!c.email,
      })),
    });

  } catch (error) {
    console.error('[SOS] Error:', error);
    return NextResponse.json({ error: 'Failed to send SOS alert.' }, { status: 500 });
  }
}