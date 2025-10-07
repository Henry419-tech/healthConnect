'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Heart,
  Shield,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  AlertCircle,
  Users,
  FileText,
  Lock,
  Accessibility,
  Globe,
  Stethoscope,
  Pill,
  Hospital,
  BookOpen,
  HelpCircle
} from 'lucide-react';

interface FooterLinkProps {
  href?: string;
  onClick?: () => void;
  external?: boolean;
  children: React.ReactNode;
  icon?: React.ComponentType<{ size: number }>;
}

const FooterLink: React.FC<FooterLinkProps> = ({ 
  href, 
  onClick, 
  external = false, 
  children, 
  icon: Icon 
}) => {
  const router = useRouter();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else if (href) {
      if (external) {
        window.open(href, '_blank', 'noopener noreferrer');
      } else {
        router.push(href);
      }
    }
  };

  return (
    <button 
      onClick={handleClick}
      className="footer-link"
      type="button"
    >
      {Icon && <Icon size={16} />}
      {children}
      {external && <ExternalLink size={12} className="external-link-icon" />}
    </button>
  );
};

const DashboardFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="dashboard-footer">
      {/* Main Footer Content */}
      <div className="footer-main">
        <div className="footer-content">
          {/* Brand Section */}
          <div className="footer-section footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <Heart size={24} className="footer-logo-heart" />
              </div>
              <h3 className="footer-logo-text">HealthConnect Navigator</h3>
            </div>
            <p className="footer-brand-description">
              Your trusted companion for navigating Ghana's healthcare system. 
              Find facilities, check symptoms, and access emergency services with confidence.
            </p>
            <div className="footer-badges">
              <div className="footer-badge">
                <Shield size={16} />
                <span>HIPAA Compliant</span>
              </div>
              <div className="footer-badge">
                <Stethoscope size={16} />
                <span>Medical Grade</span>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="footer-section">
            <h4 className="footer-section-title">Our Services</h4>
            <div className="footer-links">
              <FooterLink href="/facilities" icon={Hospital}>
                Healthcare Facilities
              </FooterLink>
              <FooterLink href="/symptom-checker" icon={Stethoscope}>
                AI Symptom Checker
              </FooterLink>
              <FooterLink href="/emergency" icon={Phone}>
                Emergency Hub
              </FooterLink>
              <FooterLink href="/pharmacies" icon={Pill}>
                Pharmacy Locator
              </FooterLink>
            </div>
          </div>

          {/* Support Section */}
          <div className="footer-section">
            <h4 className="footer-section-title">Support & Resources</h4>
            <div className="footer-links">
              <FooterLink href="/help" icon={HelpCircle}>
                Help Center
              </FooterLink>
              <FooterLink href="/health-resources" icon={BookOpen}>
                Health Resources
              </FooterLink>
              <FooterLink href="/contact" icon={Mail}>
                Contact Support
              </FooterLink>
              <FooterLink href="/accessibility" icon={Accessibility}>
                Accessibility
              </FooterLink>
            </div>
          </div>

          {/* Legal Section */}
          <div className="footer-section">
            <h4 className="footer-section-title">Legal & Privacy</h4>
            <div className="footer-links">
              <FooterLink href="/privacy-policy" icon={Lock}>
                Privacy Policy
              </FooterLink>
              <FooterLink href="/terms-of-service" icon={FileText}>
                Terms of Service
              </FooterLink>
              <FooterLink href="/medical-disclaimer" icon={AlertCircle}>
                Medical Disclaimer
              </FooterLink>
              <FooterLink href="/data-protection" icon={Shield}>
                Data Protection
              </FooterLink>
            </div>
          </div>

          {/* Contact Section */}
          <div className="footer-section">
            <h4 className="footer-section-title">Get in Touch</h4>
            <div className="footer-contact-info">
              <div className="contact-item">
                <Phone size={16} />
                <div>
                  <p className="contact-label">24/7 Support Hotline</p>
                  <p className="contact-value">+233 (0) 30 123 4567</p>
                </div>
              </div>
              <div className="contact-item">
                <Mail size={16} />
                <div>
                  <p className="contact-label">Email Support</p>
                  <p className="contact-value">support@healthconnect.gh</p>
                </div>
              </div>
              <div className="contact-item">
                <MapPin size={16} />
                <div>
                  <p className="contact-label">Location</p>
                  <p className="contact-value">Accra, Ghana</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Disclaimer Banner */}
      <div className="footer-disclaimer">
        <div className="disclaimer-content">
          <AlertCircle size={20} className="disclaimer-icon" />
          <div className="disclaimer-text">
            <h5>Important Medical Disclaimer</h5>
            <p>
              This application is for informational purposes only and does not constitute medical advice. 
              Always consult with qualified healthcare professionals for medical diagnosis and treatment. 
              In case of emergency, call 911 or your local emergency services immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="footer-copyright">
            <p>© {currentYear} HealthConnect Navigator. All rights reserved.</p>
            <p>Proudly serving Ghana's healthcare community.</p>
          </div>
          
          <div className="footer-certifications">
            <div className="certification-badge">
              <Globe size={16} />
              <span>WHO Guidelines</span>
            </div>
            <div className="certification-badge">
              <Users size={16} />
              <span>Community Driven</span>
            </div>
          </div>
          
          <div className="footer-version">
            <span className="version-badge">v2.1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;