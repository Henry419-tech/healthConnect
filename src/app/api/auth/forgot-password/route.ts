// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'      // ← required: prevents Edge runtime
export const dynamic = 'force-dynamic'

/* ─── Gmail SMTP transporter ──────────────────────────────────────
   Required env vars (.env.local + Vercel environment variables):
     SMTP_HOST = smtp.gmail.com
     SMTP_PORT = 465
     SMTP_USER = you@gmail.com
     SMTP_PASS = xxxx xxxx xxxx xxxx  (Gmail App Password — 16 chars)
     SMTP_FROM = HealthConnect Navigator <you@gmail.com>
   Port 465 (SSL / secure:true) is required — Vercel blocks port 587.
────────────────────────────────────────────────────────────────── */
function getTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,                    // ← port 465 requires SSL (not STARTTLS)
    auth:   { user, pass },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 },
      )
    }

    const normalised = email.trim().toLowerCase()

    // Always return success to prevent email enumeration attacks
    const user = await prisma.user.findUnique({ where: { email: normalised } })

    if (user) {
      const token  = crypto.randomBytes(32).toString('hex')
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data:  { resetToken: token, resetTokenExpiry: expiry },
      })

      const transporter = getTransporter()
      if (!transporter) {
        // SMTP not configured — token is saved but email won't go out.
        // Log the reset link in dev so you can still test the flow.
        const baseUrl   = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const resetLink = `${baseUrl}/reset-password?token=${token}`
        console.warn('[ForgotPassword] SMTP not configured. Reset link:', resetLink)
      } else {
        const baseUrl   = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const resetLink = `${baseUrl}/reset-password?token=${token}`
        const userName  = user.name || 'there'
        const from      = process.env.SMTP_FROM || `HealthConnect Navigator <${process.env.SMTP_USER}>`

        await transporter.sendMail({
          from,
          to:      user.email,
          subject: 'Reset your HealthConnect password',
          text: `
Hi ${userName},

You requested a password reset for your HealthConnect Navigator account.

Click the link below to set a new password. This link expires in 1 hour.

${resetLink}

If you did not request this, you can safely ignore this email — your password has not changed.

— HealthConnect Navigator
Emergency: 193 · Built for Ghana
          `.trim(),
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f0f6ff;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#050e1d;border-radius:16px 16px 0 0;padding:28px 36px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#00d4ff;">
                HEALTHCONNECT NAVIGATOR
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,.35);letter-spacing:1px;">
                BUILT FOR GHANA
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 36px;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#0a1628;letter-spacing:-0.5px;line-height:1.2;">
                Reset your password
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.65;">
                Hi ${userName}, we received a request to reset the password for your HealthConnect account.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#0099cc,#00d4ff);border-radius:12px;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;
                              color:#050e1d;text-decoration:none;letter-spacing:-0.2px;">
                      Set new password →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <p style="margin:0 0 24px;font-size:13px;color:#94a3b8;line-height:1.6;">
                ⏱ This link expires in <strong style="color:#475569;">1 hour</strong>.
                After that you'll need to request a new one.
              </p>

              <!-- Fallback URL -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                  Or copy this link
                </p>
                <p style="margin:0;font-size:12px;color:#475569;word-break:break-all;font-family:monospace;">
                  ${resetLink}
                </p>
              </div>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will not change.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;
                       padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                HealthConnect Navigator · Ghana's health navigation platform
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">
                Emergency: <strong>193</strong> · Fire: <strong>192</strong> · Police: <strong>191</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `.trim(),
        })
      }
    }

    // Always 200 — don't leak whether the email exists
    return NextResponse.json(
      { message: 'If an account with that email exists, a reset link has been sent.' },
      { status: 200 },
    )

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}