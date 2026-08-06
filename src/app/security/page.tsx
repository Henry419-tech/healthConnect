// src/app/security/page.tsx — Phase 5
// Public page — no authentication required.
// Do NOT wrap in DashboardLayout or add an auth redirect.

import React    from 'react';
import Link     from 'next/link';
import type { Metadata } from 'next';
import '@/styles/dashboard.css';

export const metadata: Metadata = {
  title:       'Security & Data Protection | HealthConnect Navigator',
  description: 'How HealthConnect Navigator protects your health data — encryption, authentication, AI data handling, and responsible disclosure.',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function lastReviewed(): string {
  return new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  accent = false,
}: {
  title:    string;
  children: React.ReactNode;
  accent?:  boolean;
}) {
  return (
    <section style={{
      background:   'var(--hc-card)',
      border:       '1px solid var(--hc-border)',
      borderRadius: 14,
      padding:      28,
      marginBottom: 20,
    }}>
      <h2 style={{
        margin:       '0 0 16px',
        fontSize:     '1rem',
        fontWeight:   700,
        color:        accent ? 'var(--hc-teal)' : 'var(--hc-text)',
        paddingBottom: 12,
        borderBottom: '2px solid',
        borderColor:  accent ? 'var(--hc-teal)' : 'var(--hc-border)',
        display:      'flex',
        alignItems:   'center',
        gap:          8,
      }}>
        {title}
      </h2>
      <div style={{ color: 'var(--hc-text2)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 6 }}>{item}</li>
      ))}
    </ul>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  return (
    <div style={{
      minHeight:  '100vh',
      background: 'var(--hc-bg)',
      color:      'var(--hc-text)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Simple top bar */}
      <header style={{
        background:  'var(--hc-card)',
        borderBottom: '1px solid var(--hc-border)',
        padding:     '16px 24px',
        display:     'flex',
        alignItems:  'center',
        gap:         12,
      }}>
        <Link
          href="/legal"
          style={{
            color:          'var(--hc-teal)',
            textDecoration: 'none',
            fontSize:       '0.88rem',
            display:        'flex',
            alignItems:     'center',
            gap:            4,
          }}
        >
          ← Back to Legal
        </Link>
        <span style={{ color: 'var(--hc-border)' }}>|</span>
        <span style={{ fontSize: '0.88rem', color: 'var(--hc-text3)' }}>
          HealthConnect Navigator
        </span>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 64px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.8rem', fontWeight: 800, color: 'var(--hc-text)' }}>
            🔒 Security &amp; Data Protection
          </h1>
          <p style={{ margin: 0, color: 'var(--hc-text2)', fontSize: '0.95rem' }}>
            How we protect your health information at every layer.
          </p>
        </div>

        {/* 1. Encryption */}
        <SectionCard title="1. Encryption" accent>
          <p style={{ margin: '0 0 12px', fontWeight: 600, color: 'var(--hc-text)' }}>Data in transit</p>
          <p style={{ margin: '0 0 16px' }}>
            All communication between your browser and HealthConnect servers uses
            TLS 1.2 or higher (HTTPS). Your health data is never transmitted
            unencrypted.
          </p>

          <p style={{ margin: '0 0 12px', fontWeight: 600, color: 'var(--hc-text)' }}>Data at rest</p>
          <p style={{ margin: 0 }}>
            Your health data is stored in a PostgreSQL database with encryption
            at rest enabled at the infrastructure level. Individual sensitive
            fields (passwords) are hashed using bcrypt before storage. Passwords
            are never stored in plain text.
          </p>
        </SectionCard>

        {/* 2. Authentication & Access */}
        <SectionCard title="2. Authentication &amp; Access">
          <p style={{ margin: '0 0 12px' }}>
            Your account is protected by multiple layers of authentication:
          </p>
          <BulletList items={[
            'Email/password authentication with bcrypt password hashing',
            'Optional two-factor authentication (2FA) via your account settings',
            'Passkey / biometric login — register a device-level authenticator for faster, phishing-resistant sign-in',
            'OAuth sign-in via Google — no password stored on our side when using this method',
            'Automatic session timeout after 30 minutes of inactivity',
          ]} />
          <p style={{ margin: '12px 0 0' }}>
            Only you can access your health data. HealthConnect engineers do not
            have access to your individual health records. Database access is
            restricted to authenticated services only, with no direct public
            exposure.
          </p>
        </SectionCard>

        {/* 3. AI Data Handling */}
        <SectionCard title="3. AI Data Handling">
          <p style={{ margin: 0 }}>
            A few features — regional health advisories, profile insight tips,
            and medication interaction checks — send small portions of your
            health profile to <strong>Google Gemini AI</strong> for processing.
            We take the following precautions:
          </p>
          <BulletList items={[
            'No personally identifiable information (name, email, NHIS number) is included in AI requests',
            'Only clinically relevant data (conditions, medications, region) is sent — the minimum necessary for useful analysis',
            'Gemini processes data subject to Google\'s privacy policy and data processing terms',
            'AI responses are general health information only — not a medical diagnosis',
          ]} />
        </SectionCard>

        {/* 4. Emergency Data Sharing */}
        <SectionCard title="4. Emergency Data Sharing">
          <p style={{ margin: 0 }}>
            Your emergency brief — accessible via QR code or shared link — is
            protected by a <strong>unique cryptographic token</strong>. This token
            is required to view your brief; guessing it is computationally
            infeasible. You can regenerate or revoke this token at any time from
            your Profile → Emergency Hub section. Revocation immediately
            invalidates any previously shared links.
          </p>
        </SectionCard>

        {/* 5. Data Retention & Deletion */}
        <SectionCard title="5. Data Retention &amp; Deletion">
          <p style={{ margin: '0 0 12px' }}>
            You are in full control of your data:
          </p>
          <BulletList items={[
            'You can permanently delete your account and all associated health data at any time from Settings → Privacy & Security → Delete Account',
            'Deletion is irreversible — we do not retain backups of deleted accounts beyond our standard rotation cycle',
            'Activity logs older than 90 days are automatically purged to minimise data retention',
            'You can export a copy of your health data at any time from Settings → Export Data',
          ]} />
        </SectionCard>

        {/* 6. Responsible Disclosure */}
        <SectionCard title="6. Responsible Disclosure">
          <p style={{ margin: 0 }}>
            If you discover a security vulnerability in HealthConnect Navigator,
            please report it responsibly to{' '}
            <a
              href="mailto:security@healthconnect.gh"
              style={{ color: 'var(--hc-teal)', textDecoration: 'none', fontWeight: 600 }}
            >
              security@healthconnect.gh
            </a>
            . We aim to acknowledge reports within <strong>48 hours</strong> and
            will work with you on an appropriate fix timeline. We do not take
            legal action against researchers who act in good faith and follow
            responsible disclosure practices.
          </p>
        </SectionCard>

        {/* Last reviewed + back link */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          flexWrap:       'wrap',
          gap:            12,
          marginTop:      32,
          padding:        '20px 24px',
          background:     'var(--hc-card)',
          border:         '1px solid var(--hc-border)',
          borderRadius:   12,
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--hc-text3)' }}>
            Last reviewed: <strong style={{ color: 'var(--hc-text2)' }}>{lastReviewed()}</strong>
          </p>
          <Link
            href="/legal"
            style={{
              color:          'var(--hc-teal)',
              textDecoration: 'none',
              fontSize:       '0.88rem',
              fontWeight:     600,
            }}
          >
            ← Back to Privacy Policy &amp; Terms
          </Link>
        </div>

        {/* Admin access — deliberately just a plain, quiet text link, not
            styled like real navigation. This app has exactly one admin
            (see middleware.ts — Basic Auth via ADMIN_PASSWORD, no user
            role/session involved at all), so there's nothing to gate this
            link on; it's here purely so the URL doesn't have to be
            retyped/remembered on a phone that doesn't have it bookmarked.
            Deliberately a plain <a>, NOT next/link's <Link> — clicking
            /admin/alerts has to be a real top-level browser navigation for
            the browser's native Basic Auth prompt to fire. <Link>'s
            client-side fetch would just get a silent 401 with nothing
            visible happening. */}
        <p style={{ margin: '16px 0 0', textAlign: 'center' as const }}>
          <a
            href="/admin/alerts"
            style={{
              color:          'var(--hc-text3)',
              textDecoration: 'none',
              fontSize:       '0.72rem',
            }}
          >
            Admin
          </a>
        </p>

      </main>
    </div>
  );
}
