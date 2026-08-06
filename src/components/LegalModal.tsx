'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Shield, X, CheckCircle } from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────── */
export type LegalModalType = 'terms' | 'privacy' | 'disclaimer'

/* ── Section data ───────────────────────────────────────────── */
const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using HealthConnect Navigator (the "Service"), including by creating an account, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions and our Privacy Policy, which is incorporated herein by reference.\n\nYour continued use of the Service after any modification constitutes your acceptance of the revised Terms.`,
  },
  {
    title: '2. Description of Service',
    body: `HealthConnect Navigator is a healthcare information and navigation web application designed for users in Ghana. Features include:\n\n• Healthcare facility finder (map-based hospital, clinic & pharmacy locator)\n• Health profile management (blood type, allergies, medications, conditions)\n• Medication tracking and reminders\n• Health document storage (for sharing with doctors and hospitals)\n• Emergency services hub (Ghana emergency numbers, first aid guides, one-tap calling)\n• Medical ID (shareable critical health information for first responders)\n• NHIS card storage\n• Emergency contact management\n\nThe Service is provided "as is" and may change without notice.`,
  },
  {
    title: '3. Medical Disclaimer',
    body: `IMPORTANT: HealthConnect Navigator is NOT a medical device and does NOT provide medical advice. It is NOT a substitute for professional medical diagnosis, treatment, or consultation.\n\nYou acknowledge that:\n• No doctor-patient relationship is created by your use of this Service\n• All health information is general in nature and may not apply to your circumstances\n• You should always seek qualified healthcare professional advice for any medical condition\n• You should never disregard professional medical advice because of something you read here\n• In a medical emergency, immediately call Ghana National Ambulance (193), Police (191), or go to the nearest emergency room\n\nWe expressly disclaim any liability for decisions you make based on information provided by the Service.`,
  },
  {
    title: '4. Eligibility',
    body: `To use HealthConnect Navigator, you must:\n• Be at least 13 years of age (users under 18 require parental/guardian consent)\n• Have the legal capacity to enter a binding agreement\n• Not be prohibited from using the Service under applicable laws\n• Provide accurate, current, and complete registration information`,
  },
  {
    title: '5. Account Registration & Security',
    body: `When you create an account, you agree to:\n• Provide accurate and truthful registration information\n• Keep your account credentials confidential\n• Notify us immediately at healthconnect.navigator@gmail.com if you suspect unauthorised access\n• Accept responsibility for all activities under your account\n\nPasswords are never stored in plain text — they are processed using industry-standard cryptographic hashing. You may also sign in using Google OAuth.`,
  },
  {
    title: '6. User Data & Health Information',
    body: `You may voluntarily provide health information including blood type, date of birth, weight, height, allergies, medications, medical conditions, and emergency contacts.\n\nYou retain full ownership of all health data you input. We do not claim ownership over your personal health information.\n\nYour data is used solely to provide and improve the Service. We do not sell, rent, or trade your health data to third parties for marketing or commercial purposes.\n\nYou may request deletion of your account and associated data at any time by contacting us. We will process deletion requests within 30 days.`,
  },
  {
    title: '7. Privacy & Data Protection',
    body: `Our collection, use, and protection of your personal data is governed by our Privacy Policy. Key points:\n• All data is transmitted over encrypted HTTPS connections\n• Your health data is stored in a secure database — each user can only access their own data\n• We comply with applicable data protection principles\n• We do not use your health data for advertising or profiling purposes\n\nIf you are in the EEA or UK, you may have additional rights under GDPR.`,
  },
  {
    title: '8. Emergency Services Disclaimer',
    body: `Emergency numbers, first aid guides, and emergency contact information displayed in the Service are supplementary tools only. They do NOT replace calling emergency services directly.\n\nAlways call 193 (Ambulance), 191 (Police), or 192 (Fire) in a life-threatening emergency.\n\nWe are not responsible for any harm resulting from reliance on information displayed in the Service.`,
  },
  {
    title: '9. Acceptable Use',
    body: `You agree NOT to use HealthConnect Navigator to:\n• Upload false, misleading, or fraudulent health information\n• Reverse-engineer, hack, or gain unauthorised access to the Service\n• Use automated bots or scrapers to interact with the Service\n• Violate any applicable law, regulation, or third-party rights\n• Harass, threaten, or harm other users\n• Circumvent or interfere with security or authentication features\n• Use the Service for commercial purposes without express written consent\n• Impersonate any person or healthcare professional`,
  },
  {
    title: '10. Limitation of Liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HEALTHCONNECT NAVIGATOR AND ITS DEVELOPER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF LIFE, PERSONAL INJURY, MEDICAL COMPLICATIONS, OR LOSS OF DATA.\n\nOur total aggregate liability for all claims shall not exceed the amount you paid us in the preceding 12 months, or GHS 50, whichever is greater.`,
  },
  {
    title: '11. Governing Law',
    body: `These Terms are governed by the laws of the Republic of Ghana. The Electronic Transactions Act, 2008 (Act 772) and the Data Protection Act, 2012 (Act 843) apply where relevant.\n\nDisputes shall first be resolved through good-faith negotiation. If negotiation fails, disputes shall be submitted to the jurisdiction of the courts of Ghana.`,
  },
  {
    title: '12. Contact Information',
    body: `HealthConnect Navigator\nEmail: healthconnect.navigator@gmail.com\nInstitution: University of Mines and Technology (UMaT), Tarkwa, Ghana\nProgramme: BSc Information Systems and Technology\n\nThese Terms were last updated on 21 March 2026.`,
  },
]

const PRIVACY_SECTIONS = [
  {
    title: 'Overview',
    body: `HealthConnect Navigator ("we", "us", "our") is committed to protecting your personal and health information. This Privacy Policy explains what data we collect, how we use it, how it is stored, and your rights regarding it.\n\nThis policy is effective as of 21 March 2026 and applies to all users of the HealthConnect Navigator web application.\n\nContact: healthconnect.navigator@gmail.com`,
  },
  {
    title: '1. Information We Collect',
    body: `We collect the following categories of information:\n\nAccount Information\n• Full name and email address (required for registration)\n• Profile image (optional, from Google OAuth)\n• Hashed password (we never store plain-text passwords)\n• Password reset tokens (temporary, time-limited)\n\nHealth Profile Data (all voluntary)\n• Blood type, date of birth, weight, height, gender, BMI\n• Allergies (name, severity, reaction type)\n• Medications (name, dose, frequency, start date, notes)\n• Medical conditions (name, status, diagnosed year, notes)\n• Family member health records (name, relation, age, blood type)\n• Medication reminders (time, schedule, dose)\n\nEmergency Information\n• Emergency contact details (name, relationship, phone number, email)\n\nApp Usage Data\n• Activity log (actions taken in the app, with timestamps)\n• Saved facilities (name, type, address, GPS coordinates at time of save)\n\nAuthentication Data\n• OAuth tokens (when signing in with Google)\n• Session tokens (to keep you signed in)`,
  },
  {
    title: '2. How We Use Your Information',
    body: `Your data is used exclusively to provide and improve the Service:\n\n• To create and manage your account\n• To display your health profile, Medical ID, and health score\n• To power personalised first aid guides (e.g. allergy action plans)\n• To show nearby healthcare facilities on the map\n• To log your app activity for your own review\n\nWe do NOT use your data for:\n• Advertising or marketing\n• Selling or trading with third parties\n• Profiling or behavioural tracking\n• Any purpose unrelated to the Service`,
  },
  {
    title: '3. Location Data',
    body: `Location (GPS coordinates) is only used for Facility Search — your location is used in real-time to find nearby hospitals, clinics, and pharmacies. It is not stored on our servers.\n\nWe do not track your location continuously or in the background.`,
  },
  {
    title: '4. Data Storage & Security',
    body: `All data is stored in a secure PostgreSQL database. Security measures include:\n\n• HTTPS encryption for all data in transit\n• Passwords are hashed using industry-standard cryptography — never stored in plain text\n• Database queries are filtered by user ID — you can never access another user's data\n• OAuth tokens (Google sign-in) are managed by NextAuth.js\n• The application is hosted on Vercel, which enforces HTTPS and provides infrastructure-level security\n\nOffline access: Your Medical ID and emergency numbers are cached locally on your device so that first responders can access them even without internet connectivity.`,
  },
  {
    title: '5. Data Sharing',
    body: `We do not sell, rent, or trade your personal or health data to any third party.\n\nYour data may be shared only in these limited circumstances:\n\n• With service providers strictly as necessary to operate the app\n• If required by law, court order, or government authority in Ghana\n\nWe will never share your health data with advertisers, data brokers, insurance companies, or employers.`,
  },
  {
    title: '6. Your Rights',
    body: `You have the following rights regarding your data:\n\n• Access — you can view all your stored data within the app\n• Correction — you can update your health profile at any time\n• Deletion — you can request full account and data deletion by emailing healthconnect.navigator@gmail.com. We will process requests within 30 days.\n• Portability — you may request an export of your data\n\nIf you are in the European Economic Area (EEA) or United Kingdom, you have additional rights under GDPR, including the right to object to processing and to lodge a complaint with a supervisory authority.\n\nAll Ghanaian users are protected under the Data Protection Act, 2012 (Act 843).`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your data for as long as your account is active.\n\nUpon account deletion:\n• Your health profile, medications, allergies, conditions, and family records are deleted\n• Your emergency contacts are deleted\n• Your saved facilities and activity log are deleted\n• Authentication tokens and sessions are invalidated\n\nCertain data may be retained for a limited period if required by law.`,
  },
  {
    title: "8. Children's Privacy",
    body: `HealthConnect Navigator is not intended for children under 13. Users aged 13–17 must have parental or guardian consent before using the Service.\n\nIf we become aware that we have collected personal data from a child under 13 without verifiable parental consent, we will delete that data promptly. Please contact us at healthconnect.navigator@gmail.com if you believe this has occurred.`,
  },
  {
    title: '9. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we make material changes, we will update the effective date and display a notice within the app.\n\nYour continued use of the Service after changes take effect constitutes your acceptance of the updated policy.`,
  },
  {
    title: '10. Contact Us',
    body: `If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact:\n\nHealthConnect Navigator\nEmail: healthconnect.navigator@gmail.com\nInstitution: University of Mines and Technology (UMaT), Tarkwa, Ghana\n\nThis Privacy Policy was last updated on 21 March 2026.`,
  },
]

const DISCLAIMER_SECTIONS = [
  {
    title: 'Not a Medical Device',
    body: `HealthConnect Navigator is NOT a medical device, does NOT provide medical advice, and is NOT a substitute for professional medical diagnosis, treatment, or consultation.\n\nThe information provided through the Service is for general informational purposes only.`,
  },
  {
    title: 'No Doctor-Patient Relationship',
    body: `No doctor-patient relationship is created by your use of this Service. Using HealthConnect Navigator does not constitute a clinical consultation, and no information provided should be interpreted as a clinical recommendation.\n\nAlways seek the advice of a qualified healthcare professional for any medical condition or symptom you experience.`,
  },
  {
    title: 'Emergency Services',
    body: `Do not rely solely on HealthConnect Navigator in a life-threatening situation.\n\nIn any medical emergency, immediately contact:\n• National Ambulance Service — 193\n• Ghana Police Service — 191\n• Ghana Fire Service — 192\n• Or go directly to the nearest emergency room\n\nEmergency numbers and first aid guides in the Service are supplementary tools only, and depend on your internet connection and device settings.`,
  },
  {
    title: 'Facility Information',
    body: `Healthcare facility information shown on the map is sourced from OpenStreetMap, which is community-maintained. Information including facility names, addresses, phone numbers, and opening hours may be incomplete, outdated, or inaccurate.\n\nAlways verify facility details directly before visiting.`,
  },
  {
    title: 'First Aid Guides',
    body: `First aid guides provided in the Emergency Hub are for general educational purposes only. They do not replace professional emergency medical training or the advice of a trained first responder.\n\nWe are not responsible for any harm resulting from reliance on first aid information provided by the Service.`,
  },
  {
    title: 'Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, HealthConnect Navigator shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, including but not limited to loss of life, personal injury, or medical complications.\n\nYou use this Service at your own risk.`,
  },
  {
    title: 'Contact',
    body: `For questions about this disclaimer, please contact:\n\nHealthConnect Navigator\nEmail: healthconnect.navigator@gmail.com\n\nLast updated: 21 March 2026`,
  },
]

/* ── Modal config map ───────────────────────────────────────── */
const MODAL_CONFIG: Record<LegalModalType, {
  title: string
  subtitle: string
  banner: string
  sections: { title: string; body: string }[]
}> = {
  terms: {
    title: 'Terms of Service',
    subtitle: 'Effective 21 March 2026 · Version 2.0',
    banner: 'By creating an account you agree to these Terms. HealthConnect Navigator is a health information tool — not a medical device. Always consult a qualified healthcare professional for medical decisions.',
    sections: TERMS_SECTIONS,
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Effective 21 March 2026',
    banner: 'We collect only what is needed to provide the Service. Your health data is encrypted, never sold, and only visible to you. You can delete your data at any time.',
    sections: PRIVACY_SECTIONS,
  },
  disclaimer: {
    title: 'Medical Disclaimer',
    subtitle: 'Effective 21 March 2026',
    banner: 'HealthConnect Navigator is a health information tool only. It is not a medical device and cannot diagnose or treat any condition. Always seek professional medical advice.',
    sections: DISCLAIMER_SECTIONS,
  },
}

/* ── LegalModal component ───────────────────────────────────── */
export function LegalModal({
  type,
  isDark,
  onClose,
}: {
  type: LegalModalType
  isDark: boolean
  onClose: () => void
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const config    = MODAL_CONFIG[type]
  const accentCol = isDark ? '#00d4ff' : '#0077aa'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0)
    setOpenIdx(null)
  }, [type])

  const bg       = isDark ? '#07101f'               : '#ffffff'
  const border   = isDark ? 'rgba(255,255,255,.08)' : '#e2e8f0'
  const surface  = isDark ? 'rgba(255,255,255,.04)' : '#f8fafc'
  const titleCol = isDark ? '#eef4ff'               : '#0a1628'
  const subCol   = isDark ? 'rgba(255,255,255,.46)' : '#64748b'
  const bodyCol  = isDark ? 'rgba(255,255,255,.78)' : '#334155'
  const hdrHover = isDark ? 'rgba(0,212,255,.07)'   : 'rgba(0,119,170,.06)'

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'hc-legal-fade .18s ease',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={config.title}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9001,
          width: 'min(680px, 96vw)',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          background: bg,
          borderRadius: '20px',
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? '0 32px 80px rgba(0,0,0,.70), 0 0 0 1px rgba(0,212,255,.08)'
            : '0 32px 80px rgba(0,0,0,.22)',
          animation: 'hc-legal-in .22s cubic-bezier(.22,1,.36,1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '2px', borderRadius: '2px', background: `linear-gradient(90deg,${accentCol},transparent)` }} />
              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '2px', color: accentCol, fontFamily: "'DM Sans', sans-serif" }}>
                Legal document
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 400, color: titleCol, letterSpacing: '-.5px', fontFamily: "'DM Serif Display', serif" }}>
              {config.title}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: subCol, fontFamily: "'DM Sans', sans-serif" }}>
              {config.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0, width: '34px', height: '34px',
              borderRadius: '50%', border: `1px solid ${border}`,
              background: isDark ? 'rgba(255,255,255,.06)' : '#f1f5f9',
              color: subCol, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Banner */}
        <div style={{
          margin: '16px 20px 0',
          padding: '12px 16px',
          borderRadius: '10px',
          background: isDark ? 'rgba(0,212,255,.06)' : 'rgba(0,119,170,.06)',
          border: `1px solid ${isDark ? 'rgba(0,212,255,.14)' : 'rgba(0,119,170,.14)'}`,
          display: 'flex', gap: '10px', alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <Shield size={14} style={{ color: accentCol, flexShrink: 0, marginTop: '1px' }} />
          <p style={{ margin: 0, fontSize: '12px', color: bodyCol, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
            {config.banner}
          </p>
        </div>

        {/* Scrollable accordion */}
        <div
          ref={bodyRef}
          style={{
            flex: 1, overflowY: 'auto', padding: '16px 20px 24px',
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? 'rgba(255,255,255,.12) transparent' : 'rgba(0,0,0,.12) transparent',
          }}
        >
          {config.sections.map((sec, i) => {
            const isOpen = openIdx === i
            return (
              <div
                key={i}
                style={{
                  marginBottom: '6px',
                  borderRadius: '12px',
                  border: `1px solid ${isOpen ? (isDark ? 'rgba(0,212,255,.20)' : 'rgba(0,119,170,.20)') : border}`,
                  overflow: 'hidden',
                  transition: 'border-color .15s',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '13px 16px',
                    background: isOpen ? (isDark ? 'rgba(0,212,255,.07)' : 'rgba(0,119,170,.06)') : surface,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    transition: 'background .15s',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = hdrHover }}
                  onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = surface }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: isOpen ? accentCol : titleCol }}>
                    {sec.title}
                  </span>
                  <span style={{
                    flexShrink: 0, width: '18px', height: '18px',
                    borderRadius: '50%',
                    background: isOpen ? accentCol : (isDark ? 'rgba(255,255,255,.10)' : '#e2e8f0'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform .2s, background .15s',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 3.5L5 6.5L8 3.5" stroke={isOpen ? (isDark ? '#050e1d' : '#fff') : subCol} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div style={{
                    padding: '14px 16px 16px',
                    background: isDark ? 'rgba(255,255,255,.02)' : '#fafbfc',
                    borderTop: `1px solid ${border}`,
                  }}>
                    {sec.body.split('\n').map((line, li) => (
                      line === '' ? (
                        <div key={li} style={{ height: '8px' }} />
                      ) : line.startsWith('•') ? (
                        <div key={li} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ color: accentCol, flexShrink: 0, fontSize: '13px', lineHeight: '20px' }}>•</span>
                          <p style={{ margin: 0, fontSize: '12.5px', color: bodyCol, lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
                            {line.slice(1).trim()}
                          </p>
                        </div>
                      ) : (li > 0 && sec.body.split('\n')[li - 1] === '' && !line.startsWith('•') && !line.match(/^\d+\./)) ? (
                        <p key={li} style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: titleCol, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' as const, letterSpacing: '.5px' }}>
                          {line}
                        </p>
                      ) : (
                        <p key={li} style={{ margin: 0, fontSize: '12.5px', color: bodyCol, lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
                          {line}
                        </p>
                      )
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px 16px',
          borderTop: `1px solid ${border}`,
          display: 'flex', flexDirection: 'column', gap: '10px',
          flexShrink: 0,
          background: isDark ? 'rgba(255,255,255,.02)' : '#fafbfc',
        }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: '12px', border: 'none',
              background: isDark ? 'linear-gradient(135deg,#0099cc,#00d4ff)' : '#0a1628',
              color: isDark ? '#050e1d' : '#fff',
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              letterSpacing: '-.2px',
            }}
          >
            <CheckCircle size={16} /> I understand, close
          </button>
          <p style={{ margin: 0, fontSize: '10.5px', color: subCol, fontFamily: "'DM Sans', sans-serif", textAlign: 'center' as const }}>
            © 2026 HealthConnect Navigator · All rights reserved
          </p>
        </div>
      </div>

      <style>{`
        @keyframes hc-legal-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes hc-legal-in {
          from { opacity: 0; transform: translate(-50%, -47%) scale(.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>,
    document.body
  )
}