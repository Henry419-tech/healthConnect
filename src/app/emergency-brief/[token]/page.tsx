// src/app/emergency-brief/[token]/page.tsx
// PUBLIC standalone page — no DashboardLayout, no auth required.
// Scanned by first responders via QR code — designed for mobile, high-contrast, fast reading.

import React from 'react';

interface BriefData {
  name:        string;
  bloodType:   string | null;
  allergies:   { name: string; severity: string }[];
  medications: { name: string; dose: string | null; frequency: string | null }[];
  conditions:  { name: string; status: string }[];
  expiresAt:   string;
  generatedAt: string;
}

async function getBrief(token: string): Promise<BriefData | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/emergency-brief/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function EmergencyBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const brief = await getBrief(token);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  /* ── Expired / not-found state ───────────────────────────────── */
  if (!brief) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Emergency Brief Unavailable</title>
          <style>{`
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
              background: #0f172a;
              color: #e2e8f0;
              min-height: 100dvh;
              display: flex; align-items: center; justify-content: center;
              padding: 24px;
            }
            .err {
              max-width: 420px; width: 100%;
              background: #1e293b;
              border: 1px solid #334155;
              border-radius: 20px;
              padding: 40px 32px;
              text-align: center;
            }
            .err__icon {
              width: 72px; height: 72px; border-radius: 50%;
              background: rgba(220,38,38,0.14);
              border: 2px solid rgba(220,38,38,0.35);
              display: flex; align-items: center; justify-content: center;
              font-size: 32px; margin: 0 auto 20px;
            }
            .err__title { font-size: 22px; font-weight: 800; color: #f1f5f9; margin-bottom: 10px; }
            .err__sub { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
            .err__badge {
              display: inline-block;
              font-size: 11px; font-weight: 700;
              text-transform: uppercase; letter-spacing: 0.8px;
              color: #dc2626;
              background: rgba(220,38,38,0.10);
              border: 1px solid rgba(220,38,38,0.25);
              padding: 5px 14px; border-radius: 20px;
            }
            .err__hint { font-size: 12px; color: #475569; margin-top: 20px; line-height: 1.5; }
          `}</style>
        </head>
        <body>
          <div className="err">
            <div className="err__icon">⚠️</div>
            <h1 className="err__title">Brief Unavailable</h1>
            <p className="err__sub">
              This emergency brief link has expired or is no longer valid.
              Ask the patient to regenerate their QR code from the HealthConnect app.
            </p>
            <span className="err__badge">Link Expired</span>
            <p className="err__hint">Emergency QR codes are valid for 30 days from generation.</p>
          </div>
        </body>
      </html>
    );
  }

  /* ── Colour helpers ──────────────────────────────────────────── */
  const severityColor = (s: string) => {
    if (s === 'severe')   return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#dc2626' };
    if (s === 'moderate') return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', dot: '#f59e0b' };
    return                       { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#22c55e' };
  };

  const statusColor = (s: string) => {
    if (s === 'active')   return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
    if (s === 'managed')  return { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' };
    return                       { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' };
  };

  const hasBlood = brief.bloodType && brief.bloodType !== 'Not set';
  const criticalAllergies = brief.allergies.filter(a => a.severity === 'severe');
  const hasCritical = criticalAllergies.length > 0;

  const bloodCompat: Record<string, string> = {
    'O-':  'O− only',
    'O+':  'O+, O−',
    'A-':  'A−, O−',
    'A+':  'A+, A−, O+, O−',
    'B-':  'B−, O−',
    'B+':  'B+, B−, O+, O−',
    'AB-': 'A−, B−, O−, AB−',
    'AB+': 'Any blood type (universal recipient)',
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#dc2626" />
        <title>🚑 Emergency Brief — {brief.name}</title>
        <meta name="robots" content="noindex,nofollow" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: #f1f5f9;
            color: #0f172a;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
          }

          /* Blinking animation */
          @keyframes eb-blink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.25; }
          }

          /* ── URGENT BAR ─────────────────────────────────────────── */
          .eb-urgent {
            background: #b91c1c;
            color: #fff;
            text-align: center;
            padding: 9px 16px;
            font-size: 11px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 1.4px;
            display: flex; align-items: center; justify-content: center; gap: 8px;
          }
          .eb-urgent__dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: #fca5a5;
            animation: eb-blink 1.1s ease-in-out infinite;
            flex-shrink: 0;
          }

          /* ── HEADER ─────────────────────────────────────────────── */
          .eb-header {
            background: linear-gradient(135deg, #991b1b 0%, #dc2626 55%, #ef4444 100%);
            color: #fff;
            padding: 22px 20px 20px;
            display: flex; align-items: center; gap: 14px;
            position: relative; overflow: hidden;
          }
          .eb-header::before {
            content: '';
            position: absolute; bottom: -28px; right: -28px;
            width: 120px; height: 120px; border-radius: 50%;
            background: rgba(255,255,255,0.07);
            pointer-events: none;
          }
          .eb-header__icon {
            width: 54px; height: 54px; border-radius: 15px;
            background: rgba(255,255,255,0.18);
            border: 1.5px solid rgba(255,255,255,0.26);
            display: flex; align-items: center; justify-content: center;
            font-size: 28px; flex-shrink: 0;
          }
          .eb-header__body { flex: 1; min-width: 0; position: relative; z-index: 1; }
          .eb-header__title {
            font-size: 22px; font-weight: 900;
            text-transform: uppercase; letter-spacing: 0.6px;
            line-height: 1; margin-bottom: 5px;
          }
          .eb-header__sub   { font-size: 12px; font-weight: 600; opacity: 0.80; margin-bottom: 3px; }
          .eb-header__brand { font-size: 10px; font-weight: 700; opacity: 0.50; text-transform: uppercase; letter-spacing: 1px; }

          /* ── CRITICAL ALLERGY BANNER ────────────────────────────── */
          .eb-critical {
            background: #450a0a;
            border-bottom: 3px solid #dc2626;
            padding: 14px 20px;
            display: flex; align-items: flex-start; gap: 12px;
          }
          .eb-critical__icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
          .eb-critical__label {
            font-size: 10px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.9px;
            color: #fca5a5; margin-bottom: 4px;
          }
          .eb-critical__list {
            font-size: 17px; font-weight: 900; color: #fff; line-height: 1.3;
          }

          /* ── MAIN BODY WRAPPER ──────────────────────────────────── */
          .eb-body { max-width: 600px; margin: 0 auto; }

          /* ── IDENTITY ───────────────────────────────────────────── */
          .eb-identity {
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
            padding: 20px 20px 18px;
            display: flex; align-items: center; gap: 16px;
          }
          .eb-identity__avatar {
            width: 62px; height: 62px; border-radius: 50%;
            background: linear-gradient(135deg, #dc2626, #991b1b);
            display: flex; align-items: center; justify-content: center;
            font-size: 22px; font-weight: 900; color: #fff;
            flex-shrink: 0;
            box-shadow: 0 4px 16px rgba(220,38,38,0.30);
          }
          .eb-identity__name {
            font-size: 28px; font-weight: 900;
            color: #0f172a; letter-spacing: -0.5px; line-height: 1.1;
          }
          .eb-identity__tag {
            font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.7px;
            color: #94a3b8; margin-top: 3px;
          }

          /* ── BLOOD TYPE ─────────────────────────────────────────── */
          .eb-blood {
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
            padding: 20px 20px;
            display: flex; align-items: center; gap: 18px;
          }
          .eb-blood__card {
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            padding: 14px 22px;
            background: #fef2f2;
            border: 2.5px solid #dc2626;
            border-radius: 16px;
            flex-shrink: 0; min-width: 96px;
          }
          .eb-blood__card-label {
            font-size: 9px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.9px;
            color: rgba(220,38,38,0.70);
          }
          .eb-blood__type {
            font-size: 46px; font-weight: 900;
            color: #dc2626; line-height: 1; letter-spacing: -1px;
          }
          .eb-blood__unknown-type {
            font-size: 36px; font-weight: 900; color: #cbd5e1; line-height: 1;
          }
          .eb-blood__info { flex: 1; }
          .eb-blood__info-label {
            font-size: 10px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.6px;
            color: #94a3b8; margin-bottom: 5px;
          }
          .eb-blood__compat {
            font-size: 14px; font-weight: 700; color: #1e293b; line-height: 1.5;
          }
          .eb-blood__unknown-hint {
            font-size: 13px; color: #94a3b8; font-style: italic; line-height: 1.4;
          }

          /* ── SECTION CARDS ──────────────────────────────────────── */
          .eb-section {
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
            padding: 20px 20px;
          }
          .eb-section--warn { background: #fffbeb; }

          .eb-section__head {
            display: flex; align-items: center; gap: 10px;
            margin-bottom: 14px;
          }
          .eb-section__icon {
            width: 38px; height: 38px; border-radius: 11px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; flex-shrink: 0;
          }
          .eb-section__icon--red    { background: #fef2f2; }
          .eb-section__icon--amber  { background: #fffbeb; }
          .eb-section__icon--blue   { background: #eff6ff; }
          .eb-section__icon--green  { background: #f0fdf4; }
          .eb-section__icon--violet { background: #faf5ff; }
          .eb-section__title {
            font-size: 12px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.8px;
            color: #475569; flex: 1;
          }
          .eb-section__count {
            font-size: 11px; font-weight: 700; color: #94a3b8;
            background: #f1f5f9; border: 1px solid #e2e8f0;
            padding: 2px 8px; border-radius: 20px;
          }

          /* ── ITEM ROWS ──────────────────────────────────────────── */
          .eb-item {
            display: flex; align-items: center; gap: 12px;
            padding: 12px 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 8px;
          }
          .eb-item:last-child { margin-bottom: 0; }
          .eb-item--severe { background: #fef2f2; border-color: #fca5a5; }
          .eb-item__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
          .eb-item__name { font-size: 15px; font-weight: 700; color: #0f172a; flex: 1; }
          .eb-item__meta { font-size: 12.5px; color: #64748b; font-weight: 500; flex-shrink: 0; }
          .eb-badge {
            display: inline-flex; align-items: center;
            font-size: 10.5px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 0.5px;
            padding: 3px 9px; border-radius: 20px;
            white-space: nowrap; flex-shrink: 0;
          }

          /* ── EMPTY STATE ────────────────────────────────────────── */
          .eb-empty {
            display: flex; align-items: center; gap: 8px;
            padding: 14px;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 10px;
            font-size: 13px; color: #94a3b8; font-style: italic;
          }
          .eb-empty::before { content: '—'; font-style: normal; margin-right: 4px; }

          /* ── EMERGENCY CONTACT ──────────────────────────────────── */
          .eb-contact {
            background: #f0fdf4;
            border: 2px solid #86efac;
            border-radius: 16px;
            overflow: hidden;
          }
          .eb-contact__top {
            display: flex; align-items: center; gap: 14px;
            padding: 16px 18px 12px;
          }
          .eb-contact__avatar {
            width: 48px; height: 48px; border-radius: 50%;
            background: #16a34a;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; font-weight: 900; color: #fff;
            flex-shrink: 0;
          }
          .eb-contact__name { font-size: 19px; font-weight: 800; color: #14532d; margin-bottom: 2px; }
          .eb-contact__rel  { font-size: 11.5px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px; }
          .eb-contact__call {
            display: flex; align-items: center; justify-content: center; gap: 10px;
            padding: 18px;
            background: #16a34a;
            font-size: 22px; font-weight: 900;
            color: #fff; text-decoration: none;
            letter-spacing: 0.3px;
            transition: filter 0.15s;
          }
          .eb-contact__call:hover { filter: brightness(1.08); }
          .eb-contact__call-icon { font-size: 20px; }
          .eb-contact__call-sub  { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.75; }

          /* ── DARK FOOTER STRIP ──────────────────────────────────── */
          .eb-meta {
            background: #0f172a;
            padding: 16px 20px;
            display: flex; align-items: center; justify-content: space-between;
            gap: 12px; flex-wrap: wrap;
            border-top: 1px solid #1e293b;
          }
          .eb-meta__col { display: flex; flex-direction: column; gap: 2px; }
          .eb-meta__label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; }
          .eb-meta__val   { font-size: 12.5px; font-weight: 600; color: #94a3b8; }
          .eb-meta__badge {
            display: inline-flex; align-items: center; gap: 5px;
            font-size: 10.5px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.6px;
            color: #22c55e;
            background: rgba(34,197,94,0.12);
            border: 1px solid rgba(34,197,94,0.25);
            padding: 5px 12px; border-radius: 20px;
          }
          .eb-meta__badge-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: #22c55e;
            animation: eb-blink 1.4s ease-in-out infinite;
          }

          /* ── FOOTER ─────────────────────────────────────────────── */
          .eb-footer {
            background: #0f172a;
            padding: 20px 20px 36px;
          }
          .eb-footer__logo {
            display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
          }
          .eb-footer__logo-icon {
            width: 28px; height: 28px; border-radius: 8px;
            background: rgba(220,38,38,0.18);
            border: 1px solid rgba(220,38,38,0.28);
            display: flex; align-items: center; justify-content: center; font-size: 13px;
          }
          .eb-footer__logo-name { font-size: 13px; font-weight: 700; color: #94a3b8; }
          .eb-footer__text { font-size: 12px; color: #475569; line-height: 1.65; margin-bottom: 14px; }
          .eb-footer__disclaimer {
            padding: 12px 14px;
            background: rgba(220,38,38,0.07);
            border: 1px solid rgba(220,38,38,0.16);
            border-radius: 10px;
            font-size: 11.5px; color: #64748b; line-height: 1.55;
          }

          /* ── PRINT ──────────────────────────────────────────────── */
          @media print {
            .eb-urgent   { display: none; }
            .eb-header, .eb-critical, .eb-meta, .eb-footer,
            .eb-contact__call { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            body { background: #fff; }
            .eb-item, .eb-section { break-inside: avoid; }
          }

          /* ── MOBILE ─────────────────────────────────────────────── */
          @media (max-width: 480px) {
            .eb-identity__name { font-size: 24px; }
            .eb-blood { gap: 14px; }
            .eb-blood__card { padding: 12px 18px; min-width: 88px; }
            .eb-blood__type { font-size: 40px; }
            .eb-contact__call { font-size: 20px; padding: 16px; }
            .eb-meta { gap: 10px; }
          }
        `}</style>
      </head>
      <body>

        {/* ── Blinking urgent bar ─────────────────────────────────── */}
        <div className="eb-urgent">
          <span className="eb-urgent__dot" />
          Emergency Medical Brief — First Responders Only
          <span className="eb-urgent__dot" />
        </div>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="eb-header">
          <div className="eb-header__icon">🚑</div>
          <div className="eb-header__body">
            <div className="eb-header__title">Medical ID</div>
            <div className="eb-header__sub">Critical health information — read immediately</div>
            <div className="eb-header__brand">HealthConnect Navigator</div>
          </div>
        </div>

        {/* ── Critical allergy banner ─────────────────────────────── */}
        {hasCritical && (
          <div className="eb-critical">
            <div className="eb-critical__icon">⛔</div>
            <div>
              <div className="eb-critical__label">Severe Allergy Alert — Do Not Administer</div>
              <div className="eb-critical__list">
                {criticalAllergies.map(a => a.name).join('  ·  ')}
              </div>
            </div>
          </div>
        )}

        <div className="eb-body">

          {/* ── Patient identity ──────────────────────────────────── */}
          <div className="eb-identity">
            <div className="eb-identity__avatar">
              {brief.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div className="eb-identity__name">{brief.name}</div>
              <div className="eb-identity__tag">Patient</div>
            </div>
          </div>

          {/* ── Blood type ────────────────────────────────────────── */}
          <div className="eb-blood">
            <div className="eb-blood__card">
              <span className="eb-blood__card-label">Blood Type</span>
              {hasBlood
                ? <span className="eb-blood__type">{brief.bloodType}</span>
                : <span className="eb-blood__unknown-type">?</span>
              }
            </div>
            <div className="eb-blood__info">
              <div className="eb-blood__info-label">
                {hasBlood ? 'Can receive from' : 'Blood type unknown'}
              </div>
              {hasBlood && brief.bloodType
                ? <div className="eb-blood__compat">{bloodCompat[brief.bloodType] ?? 'Verify with blood bank'}</div>
                : <div className="eb-blood__unknown-hint">Verify before any transfusion</div>
              }
            </div>
          </div>

          {/* ── Allergies ─────────────────────────────────────────── */}
          <div className={`eb-section${hasCritical ? ' eb-section--warn' : ''}`}>
            <div className="eb-section__head">
              <div className="eb-section__icon eb-section__icon--amber">⚠️</div>
              <span className="eb-section__title">Known Allergies</span>
              {brief.allergies.length > 0 && (
                <span className="eb-section__count">{brief.allergies.length}</span>
              )}
            </div>
            {brief.allergies.length === 0 ? (
              <div className="eb-empty">None recorded</div>
            ) : brief.allergies.map((a, i) => {
              const c = severityColor(a.severity);
              return (
                <div key={i} className={`eb-item${a.severity === 'severe' ? ' eb-item--severe' : ''}`}>
                  <span className="eb-item__dot" style={{ background: c.dot }} />
                  <span className="eb-item__name">{a.name}</span>
                  <span className="eb-badge" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                    {a.severity}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Active medications ────────────────────────────────── */}
          <div className="eb-section">
            <div className="eb-section__head">
              <div className="eb-section__icon eb-section__icon--blue">💊</div>
              <span className="eb-section__title">Active Medications</span>
              {brief.medications.length > 0 && (
                <span className="eb-section__count">{brief.medications.length}</span>
              )}
            </div>
            {brief.medications.length === 0 ? (
              <div className="eb-empty">None recorded</div>
            ) : brief.medications.map((m, i) => (
              <div key={i} className="eb-item">
                <span className="eb-item__dot" style={{ background: '#3b82f6' }} />
                <span className="eb-item__name">{m.name}</span>
                {(m.dose || m.frequency) && (
                  <span className="eb-item__meta">
                    {[m.dose, m.frequency].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ── Medical conditions ────────────────────────────────── */}
          <div className="eb-section">
            <div className="eb-section__head">
              <div className="eb-section__icon eb-section__icon--violet">🩺</div>
              <span className="eb-section__title">Medical Conditions</span>
              {brief.conditions.length > 0 && (
                <span className="eb-section__count">{brief.conditions.length}</span>
              )}
            </div>
            {brief.conditions.length === 0 ? (
              <div className="eb-empty">None recorded</div>
            ) : brief.conditions.map((c, i) => {
              const sc = statusColor(c.status);
              return (
                <div key={i} className="eb-item">
                  <span className="eb-item__dot" style={{ background: sc.text }} />
                  <span className="eb-item__name">{c.name}</span>
                  <span className="eb-badge" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                    {c.status}
                  </span>
                </div>
              );
            })}
          </div>

        </div>{/* /eb-body */}

          {/* ── Validity / metadata strip ──────────────────────────── */}
        <div className="eb-meta">
          <div className="eb-meta__col">
            <span className="eb-meta__label">Valid Until</span>
            <span className="eb-meta__val">{formatDate(brief.expiresAt)}</span>
          </div>
          <div className="eb-meta__col">
            <span className="eb-meta__label">Generated</span>
            <span className="eb-meta__val">{formatDate(brief.generatedAt)} · {formatTime(brief.generatedAt)}</span>
          </div>
          <span className="eb-meta__badge">
            <span className="eb-meta__badge-dot" />
            Active
          </span>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="eb-footer">
          <div className="eb-footer__logo">
            <div className="eb-footer__logo-icon">🏥</div>
            <span className="eb-footer__logo-name">HealthConnect Navigator</span>
          </div>
          <p className="eb-footer__text">
            This brief was generated from the patient's HealthConnect profile and accessed via emergency QR code.
            Data reflects the most recently recorded health information for this patient.
          </p>
          <div className="eb-footer__disclaimer">
            ⚕ Not a substitute for full medical records. Verify critical information where possible before acting.
            Treat the patient — not just this document.
          </div>
        </div>

      </body>
    </html>
  );
}