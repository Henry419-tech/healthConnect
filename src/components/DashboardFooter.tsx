'use client';

import React from 'react';
import { Heart, Shield, Lock, FileText, HelpCircle, Activity } from 'lucide-react';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

const DashboardFooter: React.FC<FooterProps> = ({ onNavigate }) => {
  const nav = (path: string) => onNavigate?.(path);
  const year = new Date().getFullYear();

  return (
    <footer className="dashboard-footer">
      <div className="footer-inner">

        {/* ── Top: Brand + Links ─────────────────── */}
        <div className="footer-top">

          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <Heart size={16} />
              </div>
              <p className="footer-logo-text">HealthConnect</p>
            </div>
            <p className="footer-tagline">
              Your trusted companion for navigating Ghana's healthcare system.
            </p>
          </div>

          {/* Nav groups */}
          <nav className="footer-nav" aria-label="Footer navigation">

            <div className="footer-nav-group">
              <p className="footer-nav-title">Services</p>
              <button className="footer-nav-link" onClick={() => nav('/facilities')}>Find Facilities</button>
              <button className="footer-nav-link" onClick={() => nav('/symptom-checker')}>Symptom Checker</button>
              <button className="footer-nav-link" onClick={() => nav('/emergency')}>Emergency Hub</button>
            </div>

            <div className="footer-nav-group">
              <p className="footer-nav-title">Support</p>
              <button className="footer-nav-link" onClick={() => nav('/help')}>Help Centre</button>
              <button className="footer-nav-link" onClick={() => nav('/contact')}>Contact Us</button>
              <button className="footer-nav-link" onClick={() => nav('/accessibility')}>Accessibility</button>
            </div>

            <div className="footer-nav-group">
              <p className="footer-nav-title">Legal</p>
              <button className="footer-nav-link" onClick={() => nav('/privacy')}>Privacy Policy</button>
              <button className="footer-nav-link" onClick={() => nav('/terms')}>Terms of Service</button>
              <button className="footer-nav-link" onClick={() => nav('/disclaimer')}>Medical Disclaimer</button>
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
            <span className="footer-pill"><Shield size={11} /> HIPAA</span>
            <span className="footer-pill"><Lock size={11} /> Secure</span>
            <span className="footer-pill"><Activity size={11} /> Medical Grade</span>
            <span className="footer-version">v2.0</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default DashboardFooter;