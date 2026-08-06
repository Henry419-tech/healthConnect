'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Activity } from 'lucide-react';
import { HCLogo } from './HCLogo';
import { LegalModal, LegalModalType } from './LegalModal';
import { useDarkMode } from '@/contexts/DarkModeContext';

const DashboardFooter: React.FC = () => {
  const router = useRouter();
  const { isDarkMode } = useDarkMode();
  const [legalModal, setLegalModal] = useState<LegalModalType | null>(null);
  const year = new Date().getFullYear();

  const nav = (path: string) => router.push(path);

  return (
    <>
      <footer className="dashboard-footer">
        <div className="footer-inner">

          {/* ── Top: Brand + Links ─────────────────── */}
          <div className="footer-top">

            {/* Brand */}
            <div className="footer-brand">
              <div className="footer-logo">
                <HCLogo size={28} />
                <p className="footer-logo-text">HealthConnect</p>
              </div>
              <p className="footer-tagline">
                Your trusted companion for navigating Ghana's healthcare system.
              </p>
            </div>

            {/* Nav groups */}
            <nav className="footer-nav" aria-label="Footer navigation">

              {/* Services — navigate to app pages */}
              <div className="footer-nav-group">
                <p className="footer-nav-title">Services</p>
                <button className="footer-nav-link" onClick={() => nav('/facilities')}>
                  Find Facilities
                </button>
                <button className="footer-nav-link" onClick={() => nav('/emergency')}>
                  Emergency Hub
                </button>
              </div>

              {/* Support — navigate to app pages */}
              <div className="footer-nav-group">
                <p className="footer-nav-title">Support</p>
                <button
                  className="footer-nav-link"
                  onClick={() => window.open('mailto:healthconnect.navigator@gmail.com?subject=Help%20Request', '_blank')}
                >
                  Help Centre
                </button>
                <button
                  className="footer-nav-link"
                  onClick={() => window.open('mailto:healthconnect.navigator@gmail.com', '_blank')}
                >
                  Contact Us
                </button>
                <button className="footer-nav-link" onClick={() => nav('/profile')}>
                  My Profile
                </button>
              </div>

              {/* Legal — open modals */}
              <div className="footer-nav-group">
                <p className="footer-nav-title">Legal</p>
                <button
                  className="footer-nav-link"
                  onClick={() => setLegalModal('privacy')}
                >
                  Privacy Policy
                </button>
                <button
                  className="footer-nav-link"
                  onClick={() => setLegalModal('terms')}
                >
                  Terms of Service
                </button>
                <button
                  className="footer-nav-link"
                  onClick={() => setLegalModal('disclaimer')}
                >
                  Medical Disclaimer
                </button>
                <button
                  className="footer-nav-link"
                  onClick={() => nav('/security')}
                >
                  Security
                </button>
              </div>

            </nav>
          </div>

          {/* ── Divider ────────────────────────────── */}
          <hr className="footer-divider" />

          {/* ── Bottom bar ─────────────────────────── */}
          <div className="footer-bottom">
            <p className="footer-copy">
              © {year} <span>HealthConnect Navigator</span>. Built for Ghana's healthcare.
            </p>
            <div className="footer-pills">
              <span className="footer-pill"><Shield size={11} /> End-to-End Encrypted</span>
              <span className="footer-pill"><Lock size={11} /> Secure</span>
              <span className="footer-pill"><Activity size={11} /> Medical Grade</span>
              <span className="footer-version">v2.0</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Legal modals — rendered via portal so they escape any stacking context */}
      {legalModal && (
        <LegalModal
          type={legalModal}
          isDark={isDarkMode}
          onClose={() => setLegalModal(null)}
        />
      )}
    </>
  );
};

export default DashboardFooter;