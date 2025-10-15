'use client'

import { motion } from 'framer-motion'
import { Heart, MapPin, Bot, Phone, Sparkles, LogIn, Shield, Zap, Users, Clock, ArrowRight, CheckCircle, Star, Award, TrendingUp, ChevronDown, Lock, Check, X, UserCircle, Building2, AlertCircle, Stethoscope, Hospital, Activity } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EnhancedLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const router = useRouter()

  const ghanaFacilities = [
    { name: "Korle Bu Teaching Hospital", type: "Major Hospital" },
    { name: "37 Military Hospital", type: "Specialized Care" },
    { name: "Ridge Hospital", type: "Regional Hospital" },
    { name: "Nyaho Medical Centre", type: "Private Clinic" },
    { name: "Ernest Chemists", type: "Pharmacy Network" },
    { name: "Greater Accra Regional Hospital", type: "Public Hospital" }
  ]

  const emergencyServices = [
    { name: "National Ambulance Service", number: "193", available: true },
    { name: "Ghana National Fire Service", number: "192", available: true },
    { name: "Ghana Police Emergency", number: "191", available: true },
    { name: "Ghana Health Service Hotline", number: "0800 100 388", available: true },
    { name: "Mental Health Authority", number: "0800 900 0111", available: true }
  ]

  const faqs = [
    {
      question: "Is HealthConnect Navigator really free?",
      answer: "Yes! All core features including the facility finder, AI health assistant, and emergency hub are completely free to use. We're committed to making healthcare navigation accessible to everyone in Ghana."
    },
    {
      question: "How accurate is the AI health assistant?",
      answer: "Our AI provides preliminary health assessments based on your symptoms. It's designed to help you understand when to seek professional care, not to replace medical diagnosis. Always consult healthcare professionals for medical advice and treatment."
    },
    {
      question: "Is my health data secure and private?",
      answer: "Absolutely. We use industry-standard encryption and never share your personal health information without your explicit consent. Your conversations with the AI assistant are private and secure."
    },
    {
      question: "What areas in Ghana do you cover?",
      answer: "We currently cover Greater Accra with verified data from major hospitals, clinics, and pharmacies. We're continuously expanding our database to include facilities across all regions of Ghana."
    },
    {
      question: "How do you get facility information?",
      answer: "We combine data from OpenStreetMap, Ghana Health Service database, and verified healthcare facilities. Our system provides real-time information including locations, contact numbers, and available services."
    },
    {
      question: "Can I use the app offline?",
      answer: "Emergency contacts and critical phone numbers are designed to work with minimal connectivity. However, the facility finder and AI assistant require internet connection for real-time information and assessments."
    }
  ]

  const useCases = [
    {
      icon: <Users size={32} />,
      title: "For Families",
      description: "Quick access to pediatric care, nearby pharmacies, and emergency services for your loved ones"
    },
    {
      icon: <UserCircle size={32} />,
      title: "For Seniors",
      description: "Easy-to-use interface with large fonts, simple navigation, and quick emergency access"
    },
    {
      icon: <Activity size={32} />,
      title: "For Everyone",
      description: "24/7 health guidance, symptom checking, and instant access to healthcare facilities"
    }
  ]

  const trustBadges = [
    { icon: <Shield size={24} />, text: "Secure & Private" },
    { icon: <Lock size={24} />, text: "Encrypted Data" },
    { icon: <CheckCircle size={24} />, text: "Verified Facilities" },
    { icon: <Heart size={24} />, text: "Always Available" }
  ]

  const comparisonFeatures = [
    { name: "24/7 AI Health Assistant", us: true, others: false },
    { name: "Real-time Ghana Facility Data", us: true, others: false },
    { name: "Verified Emergency Contacts", us: true, others: true },
    { name: "Interactive Maps & Directions", us: true, others: true },
    { name: "First Aid Procedures (Ghana-specific)", us: true, others: false },
    { name: "OpenStreetMap Integration", us: true, others: false },
    { name: "Activity Tracking", us: true, others: false },
    { name: "Free Forever", us: true, others: false }
  ]

  return (
    <div className="landing-page">
      {/* Background Elements */}
      <div className="landing-bg-element landing-bg-element-1"></div>
      <div className="landing-bg-element landing-bg-element-2"></div>
      <div className="landing-bg-element landing-bg-element-3"></div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-content">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="landing-nav-brand"
          >
            <div className="landing-nav-logo">
              <Heart size={20} color="white" />
            </div>
            <span className="landing-nav-title">HealthConnect Navigator</span>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="landing-signin-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/auth/signin')}
          >
            <LogIn size={18} />
            <span>Sign In</span>
          </motion.button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="landing-hero-text"
          >
            <div className="landing-hero-badge">
              <Sparkles size={16} />
              <span>✨ Now Live & Serving Ghana - Get Started Today</span>
            </div>
            
            <h1 className="landing-hero-title">
              <span className="landing-hero-title-primary">Healthcare Navigation</span>
              <span className="landing-hero-title-secondary">For Ghana, Made Simple</span>
            </h1>

            <p className="landing-hero-subtitle">
              Find nearby hospitals, clinics, and pharmacies across Ghana. Get AI-powered health assessments 
              and access emergency services instantly. <strong>Your complete health companion in one platform.</strong>
            </p>

            <div className="landing-hero-cta">
              <motion.button
                className="landing-cta-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/auth/signup')}
              >
                Get Started Free
                <ArrowRight size={20} />
              </motion.button>
            </div>

            {/* Trust Badges */}
            <div className="landing-trust-badges">
              {trustBadges.map((badge, idx) => (
                <div key={idx} className="landing-trust-badge">
                  {badge.icon}
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hero Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="landing-hero-image"
          >
            <div className="landing-mockup">
              <div className="landing-mockup-screen">
                <div className="landing-mockup-header">
                  <Heart size={20} color="#3b82f6" />
                  <span>HealthConnect</span>
                </div>
                <div className="landing-mockup-content">
                  <div className="landing-mockup-card">
                    <MapPin size={24} color="#3b82f6" />
                    <div>
                      <div className="landing-mockup-title">Find Nearby Care</div>
                      <div className="landing-mockup-subtitle">Accra, Kumasi & beyond</div>
                    </div>
                  </div>
                  <div className="landing-mockup-card">
                    <Bot size={24} color="#8b5cf6" />
                    <div>
                      <div className="landing-mockup-title">AI Health Check</div>
                      <div className="landing-mockup-subtitle">Get instant assessment</div>
                    </div>
                  </div>
                  <div className="landing-mockup-card">
                    <Phone size={24} color="#ef4444" />
                    <div>
                      <div className="landing-mockup-title">Emergency: 193</div>
                      <div className="landing-mockup-subtitle">Quick access 24/7</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ghana Healthcare Network Section */}
      <section className="landing-stats">
        <div className="landing-stats-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-section-header"
          >
            <h2 className="landing-section-title">Connected to Ghana's Healthcare Network</h2>
            <p className="landing-section-subtitle">Access verified facilities and emergency services across Ghana</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-stats-grid"
          >
            <div className="landing-stat-card">
              <Hospital size={32} />
              <div className="landing-stat-number">6+</div>
              <div className="landing-stat-label">Major Hospitals</div>
            </div>
            <div className="landing-stat-card">
              <MapPin size={32} />
              <div className="landing-stat-number">100+</div>
              <div className="landing-stat-label">Healthcare Facilities</div>
            </div>
            <div className="landing-stat-card">
              <Phone size={32} />
              <div className="landing-stat-number">10+</div>
              <div className="landing-stat-label">Emergency Contacts</div>
            </div>
            <div className="landing-stat-card">
              <Clock size={32} />
              <div className="landing-stat-number">24/7</div>
              <div className="landing-stat-label">Always Available</div>
            </div>
          </motion.div>

          {/* Featured Facilities */}
          <div className="landing-facilities-showcase">
            <h3>Featured Healthcare Facilities</h3>
            <div className="landing-facilities-grid">
              {ghanaFacilities.map((facility, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="landing-facility-badge"
                >
                  <Hospital size={20} />
                  <div>
                    <div className="facility-name">{facility.name}</div>
                    <div className="facility-type">{facility.type}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <div className="landing-features-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-section-header"
          >
            <h2 className="landing-section-title">Everything You Need for Healthcare Navigation</h2>
            <p className="landing-section-subtitle">Powerful features designed for Ghana's healthcare landscape</p>
          </motion.div>

          <div className="landing-features-grid">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="landing-feature-card"
            >
              <div className="landing-feature-icon landing-feature-icon-blue">
                <MapPin size={32} color="white" />
              </div>
              <h3 className="landing-feature-title">Smart Facility Finder</h3>
              <p className="landing-feature-description">
                Discover hospitals, clinics, and pharmacies with real-time data from OpenStreetMap and verified Ghana facilities.
              </p>
              <div className="landing-feature-benefits">
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Real-time location data</span>
                </div>
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Distance calculations</span>
                </div>
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Google Maps integration</span>
                </div>
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Filter by facility type</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="landing-feature-card"
            >
              <div className="landing-feature-icon landing-feature-icon-purple">
                <Bot size={32} color="white" />
              </div>
              <h3 className="landing-feature-title">AI Health Assistant</h3>
              <p className="landing-feature-description">
                Conversational symptom checker with urgency assessment and personalized health recommendations.
              </p>
              <div className="landing-feature-benefits">
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Interactive chat interface</span>
                </div>
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Urgency level detection</span>
                </div>
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Emergency symptom alerts</span>
                </div>
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Medical disclaimers included</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="landing-feature-card"
            >
              <div className="landing-feature-icon landing-feature-icon-red">
                <Phone size={32} color="white" />
              </div>
              <h3 className="landing-feature-title">Emergency Hub</h3>
              <p className="landing-feature-description">
                Instant access to Ghana's emergency services, verified contacts, and life-saving first aid procedures.
              </p>
              <div className="landing-feature-benefits">
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>National Ambulance: 193</span>
                </div>
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Ghana Police: 191</span>
                </div>
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>8 first aid procedures</span>
                </div>
                <div className="landing-benefit-item">
                  <CheckCircle size={16} />
                  <span>Personal emergency contacts</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Emergency Services Section */}
      <section className="landing-emergency-section">
        <div className="landing-emergency-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-section-header"
          >
            <h2 className="landing-section-title">Ghana Emergency Services at Your Fingertips</h2>
            <p className="landing-section-subtitle">Verified emergency contacts available 24/7</p>
          </motion.div>

          <div className="landing-emergency-grid">
            {emergencyServices.map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="landing-emergency-card"
              >
                <Phone size={24} />
                <div className="emergency-card-content">
                  <div className="emergency-name">{service.name}</div>
                  <div className="emergency-number">{service.number}</div>
                  <div className="emergency-status">
                    <div className="status-dot"></div>
                    <span>Available 24/7</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="landing-use-cases">
        <div className="landing-use-cases-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-section-header"
          >
            <h2 className="landing-section-title">Built For Everyone</h2>
            <p className="landing-section-subtitle">Healthcare navigation designed for all Ghanaians</p>
          </motion.div>

          <div className="landing-use-cases-grid">
            {useCases.map((useCase, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="landing-use-case-card"
              >
                <div className="landing-use-case-icon">{useCase.icon}</div>
                <h3 className="landing-use-case-title">{useCase.title}</h3>
                <p className="landing-use-case-description">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="landing-comparison">
        <div className="landing-comparison-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-section-header"
          >
            <h2 className="landing-section-title">Why Choose HealthConnect Navigator?</h2>
            <p className="landing-section-subtitle">See how we compare to other healthcare apps</p>
          </motion.div>

          <div className="landing-comparison-table">
            <div className="landing-comparison-header">
              <div className="landing-comparison-cell"></div>
              <div className="landing-comparison-cell landing-comparison-us">
                <Heart size={24} color="#3b82f6" />
                <span>HealthConnect</span>
              </div>
              <div className="landing-comparison-cell landing-comparison-others">
                <Building2 size={24} />
                <span>Other Apps</span>
              </div>
            </div>
            {comparisonFeatures.map((feature, idx) => (
              <div key={idx} className="landing-comparison-row">
                <div className="landing-comparison-cell landing-comparison-feature">{feature.name}</div>
                <div className="landing-comparison-cell">
                  {feature.us ? <Check size={24} color="#10b981" /> : <X size={24} color="#ef4444" />}
                </div>
                <div className="landing-comparison-cell">
                  {feature.others ? <Check size={24} color="#10b981" /> : <X size={24} color="#ef4444" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-how-it-works">
        <div className="landing-how-it-works-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-section-header"
          >
            <h2 className="landing-section-title">How It Works</h2>
            <p className="landing-section-subtitle">Get started in three simple steps</p>
          </motion.div>

          <div className="landing-steps-grid">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="landing-step-card"
            >
              <div className="step-number">1</div>
              <h3>Create Your Account</h3>
              <p>Sign up in seconds with your email. No credit card required, completely free forever.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="landing-step-card"
            >
              <div className="step-number">2</div>
              <h3>Enable Location</h3>
              <p>Allow location access to find nearby healthcare facilities with accurate distances and directions.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="landing-step-card"
            >
              <div className="step-number">3</div>
              <h3>Access Healthcare</h3>
              <p>Find facilities, check symptoms with AI, or access emergency services instantly whenever you need them.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="landing-faq">
        <div className="landing-faq-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-section-header"
          >
            <h2 className="landing-section-title">Frequently Asked Questions</h2>
            <p className="landing-section-subtitle">Everything you need to know about HealthConnect Navigator</p>
          </motion.div>

          <div className="landing-faq-list">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="landing-faq-item"
              >
                <button
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown 
                    size={24} 
                    className={`landing-faq-icon ${openFaq === idx ? 'landing-faq-icon-open' : ''}`}
                  />
                </button>
                <div className={`landing-faq-answer ${openFaq === idx ? 'landing-faq-answer-open' : ''}`}>
                  <p>{faq.answer}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-cta-section">
        <div className="landing-cta-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-cta-box"
          >
            <h2 className="landing-cta-title">Ready to Take Control of Your Health?</h2>
            <p className="landing-cta-description">
              Join HealthConnect Navigator today and experience healthcare navigation made simple. 
              Get started in less than 60 seconds.
            </p>
            <div className="landing-cta-buttons">
              <motion.button
                className="landing-cta-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/auth/signup')}
              >
                Get Started Free
                <ArrowRight size={20} />
              </motion.button>
            </div>
            <p className="landing-cta-note">
              <Lock size={16} />
              No credit card required • Free forever • Secure & private
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-main">
            <div className="landing-footer-brand">
              <div className="landing-footer-logo">
                <Heart size={20} />
                <span>HealthConnect Navigator</span>
              </div>
              <p className="landing-footer-tagline">
                Your trusted companion for healthcare navigation and emergency preparedness in Ghana.
              </p>
            </div>
            
            <div className="landing-footer-links">
              <div className="landing-footer-section">
                <h4>Product</h4>
                <button onClick={() => router.push('/auth/signup')}>Get Started</button>
                <button>Features</button>
                <button>FAQ</button>
              </div>
              
              <div className="landing-footer-section">
                <h4>Company</h4>
                <button>About Us</button>
                <button>Contact</button>
                <button>Privacy Policy</button>
                <button>Terms of Service</button>
              </div>
              
              <div className="landing-footer-section">
                <h4>Resources</h4>
                <button>Help Center</button>
                <button>Emergency Numbers</button>
                <button>Health Tips</button>
              </div>
            </div>
          </div>
          
          <div className="landing-footer-bottom">
            <p>© 2025 HealthConnect Navigator. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}