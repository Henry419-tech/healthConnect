'use client';

// src/app/legal/page.tsx — Phase 5
// Standalone legal page with Privacy Policy and Terms tabs.
// Adds a "Security & Data Protection" link card at the bottom of each tab.

import React, { useState } from 'react';
import Link    from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, FileText, Lock, ChevronRight, ExternalLink } from 'lucide-react';
import '@/styles/dashboard.css';

// ── Static content ────────────────────────────────────────────────────────────

const PRIVACY_SECTIONS = [
  {
    title: 'Information We Collect',
    body:  'We collect health information you voluntarily provide, including blood type, date of birth, weight, height, gender, allergies, medications, medical conditions, and emergency contacts. We also collect account information (name, email address) and usage data (pages visited, features used) to improve the Service.',
  },
  {
    title: 'How We Use Your Information',
    body:  'Your health data is used solely to provide and improve HealthConnect Navigator. We use it to personalise your health score, enable the Medical ID and Emergency Hub features, and send medication reminders if you configure them. We do not sell, rent, or trade your health data.',
  },
  {
    title: 'Data Sharing',
    body:  'We do not share your personal health data with third parties for commercial or marketing purposes. Your data may be processed by our infrastructure providers (database hosting, email services) under strict data processing agreements.',
  },
  {
    title: 'Your Rights',
    body:  'You may access, correct, or delete your health data at any time. Account deletion can be requested from Settings → Privacy & Security → Delete Account. Data export is available from Settings → Export Data. Requests are processed within 30 days.',
  },
  {
    title: 'Data Protection',
    body:  'We comply with the Ghana Data Protection Act 2012 (Act 843). All data is transmitted over HTTPS. Passwords are hashed with bcrypt and never stored in plain text. For a full technical breakdown of our security practices, see our Security & Data Protection page.',
  },
  {
    title: 'Contact',
    body:  'For privacy questions or to exercise your rights, contact us at healthconnect.navigator@gmail.com. For security vulnerabilities, email security@healthconnect.gh.',
  },
];

const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body:  'By accessing or using HealthConnect Navigator, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions and our Privacy Policy. Continued use after any modification constitutes acceptance of the revised Terms.',
  },
  {
    title: '2. Medical Disclaimer',
    body:  'IMPORTANT: HealthConnect Navigator is NOT a medical device and does NOT provide medical advice. It is not a substitute for professional medical diagnosis, treatment, or consultation. No doctor-patient relationship is created by your use of this Service. In a medical emergency, call Ghana National Ambulance (193), Police (191), or go to the nearest emergency room.',
  },
  {
    title: '3. Description of Service',
    body:  'HealthConnect Navigator is a healthcare information and navigation web application for users in Ghana. Features include a healthcare facility finder, health profile management, medication tracking, health document storage, emergency services hub, NHIS card storage, and Medical ID. The Service is provided "as is" and may change without notice.',
  },
  {
    title: '4. Account Registration & Security',
    body:  'You agree to provide accurate registration information, keep your credentials confidential, and notify us immediately at healthconnect.navigator@gmail.com if you suspect unauthorised access. You are responsible for all activities under your account.',
  },
  {
    title: '5. User Data & Health Information',
    body:  'You retain full ownership of all health data you input. We do not claim ownership over your personal health information. Your data is used solely to provide and improve the Service. You may request deletion of your account and associated data at any time.',
  },
  {
    title: '6. Emergency Services Disclaimer',
    body:  'Emergency numbers, first aid guides, and emergency contact information in the Service are supplementary tools only. They do NOT replace calling emergency services directly. Always call 193 (Ambulance), 191 (Police), or 192 (Fire) in a life-threatening emergency.',
  },
  {
    title: '7. Governing Law',
    body:  'These Terms are governed by the laws of the Republic of Ghana. The Electronic Transactions Act 2008 (Act 772) and the Data Protection Act 2012 (Act 843) apply where relevant.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

type Tab = 'privacy' | 'terms';

export default function LegalPage() {
  const router  = useRouter();
  const [tab, setTab] = useState<Tab>('privacy');

  const sections = tab === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <div style={{
      minHeight:  '100vh',
      background: 'var(--hc-bg)',
      color:      'var(--hc-text)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Top bar */}
      <header style={{
        background:   'var(--hc-card)',
        borderBottom: '1px solid var(--hc-border)',
        padding:      '16px 24px',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--hc-teal)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← Back
        </button>
        <span style={{ color: 'var(--hc-border)' }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={16} color="var(--hc-teal)" />
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--hc-text)' }}>Legal</span>
        </div>
      </header>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 64px' }}>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.7rem', fontWeight: 800 }}>
            Legal Documents
          </h1>
          <p style={{ margin: 0, color: 'var(--hc-text3)', fontSize: '0.9rem' }}>
            HealthConnect Navigator · Last updated 2026
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display:      'flex',
          gap:          4,
          marginBottom: 24,
          background:   'var(--hc-surface)',
          border:       '1px solid var(--hc-border)',
          borderRadius: 10,
          padding:      4,
        }}>
          {(['privacy', 'terms'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex:         1,
                padding:      '10px 16px',
                borderRadius: 8,
                border:       'none',
                cursor:       'pointer',
                fontSize:     '0.9rem',
                fontWeight:   600,
                background:   tab === t ? 'var(--hc-card)' : 'transparent',
                color:        tab === t ? 'var(--hc-teal)' : 'var(--hc-text2)',
                boxShadow:    tab === t ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                transition:   'all 0.15s',
              }}
            >
              {t === 'privacy' ? '🔒 Privacy Policy' : '📄 Terms of Service'}
            </button>
          ))}
        </div>

        {/* Sections */}
        {sections.map((section, i) => (
          <div
            key={i}
            style={{
              background:   'var(--hc-card)',
              border:       '1px solid var(--hc-border)',
              borderRadius: 12,
              padding:      '20px 24px',
              marginBottom: 12,
            }}
          >
            <h2 style={{
              margin:     '0 0 10px',
              fontSize:   '0.95rem',
              fontWeight: 700,
              color:      'var(--hc-teal)',
            }}>
              {section.title}
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--hc-text2)', lineHeight: 1.7 }}>
              {section.body}
            </p>
          </div>
        ))}

        {/* ── Security & Data Protection link card ───────────────────────── */}
        <div style={{
          background:   'color-mix(in srgb, var(--hc-teal) 6%, var(--hc-card))',
          border:       '1px solid color-mix(in srgb, var(--hc-teal) 30%, var(--hc-border))',
          borderRadius: 12,
          padding:      '20px 24px',
          marginTop:    20,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'color-mix(in srgb, var(--hc-teal) 15%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Lock size={20} color="var(--hc-teal)" />
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: 700, color: 'var(--hc-text)', fontSize: '0.95rem' }}>
                  Security &amp; Data Protection
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--hc-text2)' }}>
                  Encryption, authentication, AI data handling, and responsible disclosure details
                </p>
              </div>
            </div>
            <Link
              href="/security"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            6,
                background:     'var(--hc-teal)',
                color:          '#fff',
                textDecoration: 'none',
                borderRadius:   8,
                padding:        '9px 16px',
                fontSize:       '0.88rem',
                fontWeight:     600,
                flexShrink:     0,
              }}
            >
              View Security Page <ExternalLink size={14} />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--hc-text3)', fontSize: '0.82rem' }}>
          <p style={{ margin: '0 0 4px' }}>© 2026 HealthConnect Navigator · All rights reserved</p>
          <p style={{ margin: 0 }}>
            Questions?{' '}
            <a
              href="mailto:healthconnect.navigator@gmail.com"
              style={{ color: 'var(--hc-teal)', textDecoration: 'none' }}
            >
              healthconnect.navigator@gmail.com
            </a>
          </p>
        </div>

      </main>
    </div>
  );
}
