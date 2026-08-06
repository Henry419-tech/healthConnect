'use client'
// app/reset-password/page.tsx

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Heart, ArrowRight } from 'lucide-react'
import '@/styles/landing.css'

const PW_REQS = [
  { label: 'At least 6 characters', test: (p: string) => p.length >= 6 },
  { label: 'Contains a number',     test: (p: string) => /\d/.test(p) },
  { label: 'Contains a letter',     test: (p: string) => /[a-zA-Z]/.test(p) },
]

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const router      = useRouter()
  const params      = useSearchParams()
  const token       = params.get('token') ?? ''

  const [pw,      setPw]      = useState('')
  const [cpw,     setCpw]     = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [showCpw, setShowCpw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const reqs   = PW_REQS.map(r => r.test(pw))
  const allMet = reqs.every(Boolean)

  // If no token in URL — show invalid state immediately
  const hasToken = token.length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!allMet)      return setError('Please meet all password requirements.')
    if (pw !== cpw)   return setError('Passwords do not match.')

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password: pw }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
        // Redirect to sign in after 3 seconds
        setTimeout(() => router.push('/?panel=signin'), 3000)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #050e1d 0%, #071525 50%, #050e1d 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,212,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,.018) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '440px',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 32px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(0,212,255,.08)',
        overflow: 'hidden',
      }}>

        {/* Top accent bar */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, #0099cc, #00d4ff, rgba(0,212,255,.20))',
        }} />

        <div style={{ padding: '36px 40px 40px' }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#050e1d', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0,212,255,.28)',
            }}>
              <Heart size={16} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0a1628', letterSpacing: '-0.3px', fontFamily: "'Outfit', sans-serif" }}>
                HealthConnect
              </p>
              <p style={{ margin: 0, fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#00a8cc' }}>
                Navigator
              </p>
            </div>
          </div>

          {/* ── Invalid / missing token ── */}
          {!hasToken && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(255,77,109,.08)', border: '2px solid rgba(255,77,109,.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', color: '#ff4d6d',
              }}>
                <AlertCircle size={28} />
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 700, color: '#0a1628', letterSpacing: '-0.4px' }}>
                Invalid reset link
              </h1>
              <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#64748b', lineHeight: 1.65 }}>
                This reset link is missing or has already been used. Please request a new one.
              </p>
              <button
                onClick={() => router.push('/?panel=signin')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '12px 28px', borderRadius: '11px', border: 'none',
                  background: '#0a1628', color: '#fff', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Back to Sign In <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* ── Success state ── */}
          {hasToken && success && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(0,212,255,.08)', border: '2px solid rgba(0,212,255,.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', color: '#00a8cc',
                animation: 'lp-pulse-ring 1.5s ease-in-out infinite',
              }}>
                <CheckCircle size={30} />
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: 700, color: '#0a1628', letterSpacing: '-0.5px', fontFamily: "'DM Serif Display', serif", fontStyle: 'italic' }}>
                Password updated!
              </h1>
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#64748b', lineHeight: 1.65 }}>
                Your new password has been saved. Redirecting you to sign in…
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px', fontSize: '13px', color: '#00a8cc', fontWeight: 500 }}>
                <span style={{
                  display: 'inline-block', width: '16px', height: '16px',
                  border: '2px solid rgba(0,168,204,.25)', borderTopColor: '#00a8cc',
                  borderRadius: '50%', animation: 'lp-spin .7s linear infinite',
                }} />
                Signing you in
              </div>
            </div>
          )}

          {/* ── Reset form ── */}
          {hasToken && !success && (
            <>
              {/* Eyebrow */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
                <span style={{ display: 'inline-block', width: '18px', height: '2px', borderRadius: '2px', background: 'linear-gradient(90deg, #00a8cc, rgba(0,168,204,.30))' }} />
                <span style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '2px', color: '#00a8cc' }}>
                  Password reset
                </span>
              </div>

              <h1 style={{ margin: '0 0 10px', fontSize: '30px', fontWeight: 400, color: '#0a1628', letterSpacing: '-1px', lineHeight: 1.08, fontFamily: "'DM Serif Display', serif" }}>
                Set a new<br /><em style={{ color: '#0077aa' }}>password</em>
              </h1>
              <p style={{ margin: '0 0 28px', fontSize: '13.5px', color: '#64748b', lineHeight: 1.7, borderLeft: '2px solid rgba(0,168,204,.22)', paddingLeft: '10px' }}>
                Choose a strong password for your HealthConnect account.
              </p>

              {error && (
                <div style={{
                  padding: '12px 15px', background: '#fff1f2',
                  border: '1px solid rgba(255,77,109,.28)', borderLeft: '3px solid #ff4d6d',
                  borderRadius: '10px', color: '#be123c', fontSize: '13px',
                  lineHeight: 1.5, marginBottom: '20px',
                  display: 'flex', alignItems: 'flex-start', gap: '9px',
                }}>
                  ⚠ {error}
                </div>
              )}

              <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* New password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    New password
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '13px', color: '#94a3b8', pointerEvents: 'none' }} />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pw}
                      onChange={e => setPw(e.target.value)}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      required
                      style={{
                        width: '100%', padding: '12px 42px', border: '1.5px solid #e2e8f0',
                        borderRadius: '11px', fontSize: '13.5px', fontFamily: "'DM Sans', sans-serif",
                        color: '#1e293b', background: '#fafbfc', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pw && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px', padding: '10px 13px', background: '#f8fafc', borderRadius: '9px', border: '1px solid #e8eef5' }}>
                      {PW_REQS.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: reqs[i] ? '#059669' : '#94a3b8' }}>
                          <div style={{
                            width: '15px', height: '15px', borderRadius: '50%', flexShrink: 0,
                            background: reqs[i] ? '#059669' : 'transparent',
                            border: `1.5px solid ${reqs[i] ? '#059669' : '#cbd5e1'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {reqs[i] && <span style={{ color: '#fff', fontSize: '9px', lineHeight: 1 }}>✓</span>}
                          </div>
                          {r.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    Confirm password
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '13px', color: '#94a3b8', pointerEvents: 'none' }} />
                    <input
                      type={showCpw ? 'text' : 'password'}
                      value={cpw}
                      onChange={e => setCpw(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      style={{
                        width: '100%', padding: '12px 42px', border: '1.5px solid #e2e8f0',
                        borderRadius: '11px', fontSize: '13.5px', fontFamily: "'DM Sans', sans-serif",
                        color: '#1e293b', background: '#fafbfc', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button type="button" onClick={() => setShowCpw(v => !v)}
                      style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                      {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !pw || !cpw}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: '12px', border: 'none',
                    fontFamily: "'DM Sans', sans-serif", fontSize: '14.5px', fontWeight: 700,
                    background: 'linear-gradient(135deg, #0099cc, #00d4ff)',
                    color: '#050e1d', cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: (loading || !pw || !cpw) ? 0.45 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                    marginTop: '4px',
                  }}
                >
                  {loading
                    ? <>
                        <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(5,14,29,.22)', borderTopColor: '#050e1d', borderRadius: '50%', animation: 'lp-spin .7s linear infinite' }} />
                        Updating password…
                      </>
                    : <>Update password <ArrowRight size={16} /></>
                  }
                </button>

              </form>

              <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '13px', color: '#64748b' }}>
                Remember it?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/?panel=signin')}
                  style={{ background: 'none', border: 'none', color: '#0a1628', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}
                >
                  Back to sign in
                </button>
              </p>
            </>
          )}

        </div>
      </div>

      <style>{`
        @keyframes lp-spin { to { transform: rotate(360deg); } }
        @keyframes lp-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,212,255,.35); }
          50%       { box-shadow: 0 0 0 14px rgba(0,212,255,0); }
        }
      `}</style>
    </div>
  )
}