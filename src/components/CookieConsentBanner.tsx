'use client'

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

const CONSENT_KEY = 'hc_consent_v1';

const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable (private browsing, etc.) — don't show banner
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch { /* ignore */ }
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem(CONSENT_KEY, 'declined'); } catch { /* ignore */ }
    setVisible(false);
    signOut({ callbackUrl: '/auth/signin' });
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      style={{
        position:        'fixed',
        bottom:          0,
        left:            0,
        right:           0,
        zIndex:          10000,
        background:      'var(--hc-card)',
        borderTop:       '1px solid var(--hc-border)',
        boxShadow:       '0 -4px 24px rgba(0,0,0,0.18)',
        padding:         '1rem 1.25rem',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        gap:             '1rem',
        flexWrap:        'wrap',
      }}
    >
      <p style={{
        margin:     0,
        fontSize:   13,
        lineHeight: 1.55,
        color:      'var(--hc-text2)',
        flex:       '1 1 280px',
      }}>
        HealthConnect uses one authentication cookie to keep you signed in.
        No tracking or advertising cookies are set.{' '}
        <a
          href="/legal"
          style={{
            color:          'var(--hc-teal)',
            textDecoration: 'underline',
            fontWeight:     500,
          }}
        >
          Learn more
        </a>
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={decline}
          type="button"
          style={{
            padding:      '0.5rem 1rem',
            borderRadius: 8,
            border:       '1px solid var(--hc-border)',
            background:   'transparent',
            color:        'var(--hc-text2)',
            cursor:       'pointer',
            fontSize:     13,
            fontWeight:   500,
            whiteSpace:   'nowrap',
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          type="button"
          style={{
            padding:      '0.5rem 1.25rem',
            borderRadius: 8,
            border:       'none',
            background:   'var(--hc-teal)',
            color:        'var(--hc-text-on-teal, #000)',
            cursor:       'pointer',
            fontSize:     13,
            fontWeight:   600,
            whiteSpace:   'nowrap',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
