'use client'

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardHeader from '@/components/DashboardHeader';
import { trackActivity, activityTypes } from '@/lib/activityTracker';
import { 
  ArrowLeft,
  Phone,
  MapPin,
  AlertCircle,
  Heart,
  Zap,
  Users,
  BookOpen,
  Navigation,
  Clock,
  Shield,
  Bell,
  Plus,
  X,
  ChevronRight,
  Search,
  Copy,
  CheckCircle,
  Info,
  Activity,
  User,
  LogOut,
  Moon,
  Sun,
  Stethoscope,
  Home
} from 'lucide-react';

// Ghana Emergency Contacts - Accurate Health Information
interface EmergencyContact {
  id: number;
  name: string;
  number: string;
  type: string;
  description: string;
  icon: React.ComponentType<any>;
  available: string;
}

interface PersonalContact {
  id: number;
  name: string;
  relationship: string;
  number: string;
  priority: number;
}

interface FirstAidGuide {
  id: number;
  title: string;
  category: string;
  icon: React.ComponentType<any>;
  urgency: 'critical' | 'urgent' | 'important';
  steps: string[];
  warnings?: string[];
}

// Accurate Ghana Emergency Health Services
const emergencyContacts: EmergencyContact[] = [
  {
    id: 1,
    name: "National Ambulance Service",
    number: "193",
    type: "primary",
    description: "Free emergency ambulance service across Ghana",
    icon: Heart,
    available: "24/7"
  },
  {
    id: 2,
    name: "Ghana National Fire Service",
    number: "192",
    type: "fire",
    description: "Fire emergencies and rescue services",
    icon: Zap,
    available: "24/7"
  },
  {
    id: 3,
    name: "Ghana Police Emergency",
    number: "191",
    type: "police",
    description: "Police emergency hotline",
    icon: Shield,
    available: "24/7"
  },
  {
    id: 4,
    name: "Korle Bu Teaching Hospital Emergency",
    number: "0302 674 316",
    type: "medical",
    description: "Ghana's largest referral hospital emergency unit",
    icon: Stethoscope,
    available: "24/7"
  },
  {
    id: 5,
    name: "37 Military Hospital Emergency",
    number: "0303 777 666",
    type: "medical",
    description: "Military hospital emergency services (Accra)",
    icon: Stethoscope,
    available: "24/7"
  },
  {
    id: 6,
    name: "Ridge Hospital Emergency",
    number: "0302 776 891",
    type: "medical",
    description: "Greater Accra Regional Hospital emergency unit",
    icon: Heart,
    available: "24/7"
  },
  {
    id: 7,
    name: "Ghana Health Service Hotline",
    number: "0800 100 388",
    type: "support",
    description: "Health information and guidance hotline",
    icon: Info,
    available: "24/7"
  },
  {
    id: 8,
    name: "Mental Health Authority Helpline",
    number: "0800 900 0111",
    type: "mental",
    description: "Mental health crisis support and counseling",
    icon: Users,
    available: "24/7"
  },
  {
    id: 9,
    name: "Domestic Violence & Victim Support Unit",
    number: "0302 773 906",
    type: "support",
    description: "DOVVSU - Support for domestic violence victims",
    icon: Shield,
    available: "24/7"
  },
  {
    id: 10,
    name: "National Disaster Management",
    number: "0302 229 251",
    type: "support",
    description: "NADMO - Emergency disaster response",
    icon: AlertCircle,
    available: "24/7"
  }
];

// Personal Emergency Contacts (Mock data)
const personalContacts: PersonalContact[] = [
  {
    id: 1,
    name: "Dr. Kwame Mensah",
    relationship: "Family Doctor",
    number: "+233 24 456 7890",
    priority: 1
  },
  {
    id: 2,
    name: "Akosua Boateng",
    relationship: "Emergency Contact",
    number: "+233 54 321 0987",
    priority: 2
  },
  {
    id: 3,
    name: "Kofi Asante",
    relationship: "Next of Kin",
    number: "+233 20 123 4567",
    priority: 3
  }
];

// First Aid Procedures
const firstAidGuides: FirstAidGuide[] = [
  {
    id: 1,
    title: "CPR (Cardiopulmonary Resuscitation)",
    category: "Critical",
    icon: Heart,
    urgency: "critical",
    steps: [
      "Check if person is responsive - tap shoulders and shout 'Are you okay?'",
      "Call 193 (National Ambulance Service) immediately",
      "Place person on hard, flat surface. Tilt head back, lift chin",
      "Place heel of one hand on center of chest, between nipples",
      "Place other hand on top, interlace fingers",
      "Push hard and fast at least 2 inches (5cm) deep",
      "Give 30 chest compressions at 100-120 per minute",
      "Give 2 rescue breaths - tilt head, lift chin, pinch nose",
      "Continue 30 compressions, 2 breaths until help arrives"
    ],
    warnings: ["Only perform if person is unresponsive and not breathing", "Do not stop until medical help arrives", "If trained, use AED if available"]
  },
  {
    id: 2,
    title: "Choking",
    category: "Critical",
    icon: AlertCircle,
    urgency: "critical",
    steps: [
      "If person can cough or speak, encourage continued coughing",
      "If person cannot breathe, cough, or speak:",
      "Stand behind person, wrap arms around waist",
      "Make fist with one hand, place above navel",
      "Grasp fist with other hand, press into abdomen",
      "Give 5 quick upward thrusts (Heimlich maneuver)",
      "Check mouth for object, remove if visible",
      "Repeat until object comes out or person becomes unconscious",
      "If unconscious, call 193 and begin CPR"
    ],
    warnings: ["For infants, use back blows and chest thrusts instead", "Get medical attention even if object comes out"]
  },
  {
    id: 3,
    title: "Severe Bleeding",
    category: "Critical",
    icon: AlertCircle,
    urgency: "critical",
    steps: [
      "Call 193 (National Ambulance Service) immediately",
      "Put on gloves if available to protect yourself",
      "Remove any visible debris, don't remove embedded objects",
      "Apply direct pressure with clean cloth or bandage",
      "Press firmly and continuously on the wound",
      "If blood soaks through, add more bandages on top",
      "Elevate injured area above heart level if possible",
      "Apply pressure to pressure points if bleeding continues",
      "Monitor for shock - keep person lying down and warm"
    ],
    warnings: ["Never remove embedded objects", "Don't use tourniquet unless trained", "Watch for signs of shock"]
  },
  {
    id: 4,
    title: "Burns",
    category: "Urgent",
    icon: Zap,
    urgency: "urgent",
    steps: [
      "Remove person from heat source safely",
      "Cool burn with cool (not cold) running water for 10-20 minutes",
      "Remove jewelry and tight clothing before swelling starts",
      "Cover burn with sterile, non-stick bandage",
      "Take over-the-counter pain medication if needed",
      "Seek medical attention for burns larger than your palm",
      "Watch for signs of infection over next few days"
    ],
    warnings: ["Don't use ice, butter, or oils", "Don't break blisters", "Seek immediate help for electrical or chemical burns"]
  },
  {
    id: 5,
    title: "Allergic Reaction",
    category: "Urgent",
    icon: AlertCircle,
    urgency: "urgent",
    steps: [
      "Remove or avoid the allergen if known",
      "If person has epinephrine auto-injector (EpiPen), help them use it",
      "Call 193 for severe reactions (anaphylaxis)",
      "Have person sit up and lean forward if breathing difficulties",
      "Loosen tight clothing around neck and waist",
      "Monitor breathing and consciousness",
      "Give antihistamine if person is conscious and can swallow",
      "Be prepared to perform CPR if person becomes unconscious"
    ],
    warnings: ["Severe allergic reactions can be life-threatening", "Use EpiPen immediately for known severe allergies"]
  },
  {
    id: 6,
    title: "Seizure",
    category: "Important",
    icon: Activity,
    urgency: "important",
    steps: [
      "Stay calm and time the seizure",
      "Clear area of hard objects that could cause injury",
      "Place something soft under person's head",
      "Turn person on their side to keep airway clear",
      "Do NOT put anything in person's mouth",
      "Do NOT hold person down or restrict movements",
      "Stay with person until seizure ends",
      "Call 193 if seizure lasts more than 5 minutes",
      "After seizure, keep person comfortable and explain what happened"
    ],
    warnings: ["Never put objects in mouth during seizure", "Call emergency if person is injured or seizure repeats"]
  },
  {
    id: 7,
    title: "Heat Stroke",
    category: "Critical",
    icon: Zap,
    urgency: "critical",
    steps: [
      "Move person to cool, shaded area immediately",
      "Call 193 - heat stroke is a medical emergency",
      "Remove excess clothing",
      "Cool person rapidly using cool water, wet towels, or fan",
      "Apply ice packs to neck, armpits, and groin",
      "If conscious, give small sips of cool water",
      "Monitor body temperature",
      "Continue cooling until body temperature drops to 38°C (100.4°F)"
    ],
    warnings: ["Heat stroke can be fatal", "Don't give aspirin or acetaminophen", "Very common in Ghana's climate - stay hydrated"]
  },
  {
    id: 8,
    title: "Snake Bite",
    category: "Critical",
    icon: AlertCircle,
    urgency: "critical",
    steps: [
      "Call 193 immediately - time is critical",
      "Keep person calm and still to slow venom spread",
      "Remove jewelry and tight clothing near bite",
      "Position bitten area below heart level",
      "Clean wound gently with soap and water if possible",
      "Cover with clean, dry bandage",
      "Note snake's appearance for identification",
      "Transport to nearest hospital with antivenom",
      "Do NOT cut wound or try to suck out venom"
    ],
    warnings: ["Many venomous snakes in Ghana including cobras and vipers", "Never attempt to catch or kill the snake", "Antivenom available at major hospitals"]
  }
];

export default function EmergencyHub() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('emergency');
  const [selectedGuide, setSelectedGuide] = useState<FirstAidGuide | null>(null);
  const [copiedNumber, setCopiedNumber] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedNumber(number);
      setTimeout(() => setCopiedNumber(''), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Updated callEmergency function with activity tracking
  const callEmergency = async (number: string, contactName?: string) => {
    window.open(`tel:${number}`, '_self');
    
    // Track this activity
    try {
      await trackActivity(
        activityTypes.EMERGENCY_ACCESSED,
        `Called ${contactName || number}`,
        `Emergency contact accessed`,
        {
          contactNumber: number,
          contactName: contactName || 'Unknown'
        }
      );
    } catch (error) {
      console.error('Failed to track emergency call activity:', error);
    }
  };

  // Updated handleSelectGuide function with activity tracking
  const handleSelectGuide = async (guide: FirstAidGuide) => {
    setSelectedGuide(guide);
    
    // Track this activity
    try {
      await trackActivity(
        activityTypes.FIRST_AID_VIEWED,
        `Viewed ${guide.title} guide`,
        `First aid guide accessed: ${guide.category}`,
        {
          guideId: guide.id,
          guideTitle: guide.title,
          urgency: guide.urgency
        }
      );
    } catch (error) {
      console.error('Failed to track first aid guide activity:', error);
    }
  };

  // Track tab changes
  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    
    try {
      await trackActivity(
        activityTypes.EMERGENCY_ACCESSED,
        `Switched to ${tab} tab`,
        `Emergency hub tab changed`,
        {
          tabName: tab
        }
      );
    } catch (error) {
      console.error('Failed to track tab change:', error);
    }
  };

  // Track personal contact notifications
  const handleNotifyContact = async (contact: PersonalContact) => {
    alert(`Sending emergency notification to ${contact.name}...`);
    
    try {
      await trackActivity(
        activityTypes.EMERGENCY_ACCESSED,
        `Notified ${contact.name}`,
        `Emergency notification sent to personal contact`,
        {
          contactName: contact.name,
          relationship: contact.relationship,
          priority: contact.priority
        }
      );
    } catch (error) {
      console.error('Failed to track notification activity:', error);
    }
  };

  const getUrgencyColor = (urgency: 'critical' | 'urgent' | 'important') => {
    switch (urgency) {
      case 'critical': return isDarkMode ? 'text-red-400 bg-red-950 border-red-800' : 'text-red-600 bg-red-50 border-red-200';
      case 'urgent': return isDarkMode ? 'text-orange-400 bg-orange-950 border-orange-800' : 'text-orange-600 bg-orange-50 border-orange-200';
      case 'important': return isDarkMode ? 'text-blue-400 bg-blue-950 border-blue-800' : 'text-blue-600 bg-blue-50 border-blue-200';
      default: return isDarkMode ? 'text-gray-400 bg-gray-900 border-gray-700' : 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || null;

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <AlertCircle size={48} className="loading-icon" />
          <div className="loading-title">Loading Emergency Hub...</div>
          <div className="loading-subtitle">Preparing emergency resources</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="emergency-hub-container">
      {/* Dashboard Header */}
      <DashboardHeader activeTab="/emergency" />

      {/* Emergency Header */}
      <div className="emergency-hub-header">
        <div className="emergency-hub-header-content">
          <div className="emergency-hub-title-section">
            <h1 className="emergency-hub-title">
              <AlertCircle size={24} />
              Emergency Hub
            </h1>
            <p className="emergency-hub-subtitle">
              Quick access to Ghana emergency services and first aid guidance
            </p>
          </div>
        </div>
      </div>

      {/* Quick Emergency Actions */}
      <div className="emergency-quick-actions">
        <button 
          className="emergency-quick-btn primary"
          onClick={() => callEmergency('193', 'National Ambulance Service')}
        >
          <Phone size={24} />
          <div className="quick-btn-content">
            <span className="quick-btn-title">Call 193</span>
            <span className="quick-btn-subtitle">National Ambulance</span>
          </div>
        </button>
        
        <button 
          className="emergency-quick-btn secondary"
          onClick={() => callEmergency('192', 'Ghana National Fire Service')}
        >
          <Zap size={24} />
          <div className="quick-btn-content">
            <span className="quick-btn-title">Call 192</span>
            <span className="quick-btn-subtitle">Fire Service</span>
          </div>
        </button>
        
        <button 
          className="emergency-quick-btn tertiary"
          onClick={() => router.push('/facilities')}
        >
          <Navigation size={24} />
          <div className="quick-btn-content">
            <span className="quick-btn-title">Nearest Hospital</span>
            <span className="quick-btn-subtitle">Find Emergency Care</span>
          </div>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="emergency-hub-tabs">
        <button 
          className={`emergency-tab ${activeTab === 'emergency' ? 'active' : ''}`}
          onClick={() => handleTabChange('emergency')}
        >
          <Phone size={20} />
          Emergency Contacts
        </button>
        <button 
          className={`emergency-tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => handleTabChange('personal')}
        >
          <Users size={20} />
          Personal Contacts
        </button>
        <button 
          className={`emergency-tab ${activeTab === 'firstaid' ? 'active' : ''}`}
          onClick={() => handleTabChange('firstaid')}
        >
          <BookOpen size={20} />
          First Aid Guide
        </button>
      </div>

      {/* Tab Content */}
      <div className="emergency-hub-content">
        {activeTab === 'emergency' && (
          <div className="emergency-contacts-section">
            <div className="section-header">
              <h2>Ghana Emergency Health Services</h2>
              <p>Official emergency contacts available 24/7 across Ghana</p>
            </div>
            
            <div className="emergency-contacts-grid">
              {emergencyContacts.map(contact => (
                <div key={contact.id} className={`emergency-contact-card ${contact.type}`}>
                  <div className="contact-header">
                    <div className="contact-icon">
                      <contact.icon size={24} />
                    </div>
                    <div className="contact-info">
                      <h3 className="contact-name">{contact.name}</h3>
                      <p className="contact-description">{contact.description}</p>
                    </div>
                    <div className="contact-availability">
                      <span className="availability-badge">{contact.available}</span>
                    </div>
                  </div>
                  
                  <div className="contact-number">
                    <span className="number-display">{contact.number}</span>
                  </div>
                  
                  <div className="contact-actions">
                    <button 
                      className="contact-call-btn"
                      onClick={() => callEmergency(contact.number, contact.name)}
                    >
                      <Phone size={18} />
                      Call Now
                    </button>
                    <button 
                      className="contact-copy-btn"
                      onClick={() => copyToClipboard(contact.number)}
                    >
                      {copiedNumber === contact.number ? (
                        <CheckCircle size={18} />
                      ) : (
                        <Copy size={18} />
                      )}
                      {copiedNumber === contact.number ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="personal-contacts-section">
            <div className="section-header">
              <h2>Personal Emergency Contacts</h2>
              <p>Your trusted contacts for emergencies</p>
              <button 
                className="add-contact-btn"
                onClick={() => setShowAddContact(true)}
              >
                <Plus size={18} />
                Add Contact
              </button>
            </div>
            
            <div className="personal-contacts-list">
              {personalContacts.map(contact => (
                <div key={contact.id} className="personal-contact-card">
                  <div className="personal-contact-info">
                    <div className="contact-priority">
                      <span className="priority-number">{contact.priority}</span>
                    </div>
                    <div className="contact-details">
                      <h3 className="contact-name">{contact.name}</h3>
                      <p className="contact-relationship">{contact.relationship}</p>
                      <p className="contact-number">{contact.number}</p>
                    </div>
                  </div>
                  
                  <div className="personal-contact-actions">
                    <button 
                      className="contact-call-btn primary"
                      onClick={() => callEmergency(contact.number, contact.name)}
                    >
                      <Phone size={16} />
                      Call
                    </button>
                    <button 
                      className="contact-notify-btn"
                      onClick={() => handleNotifyContact(contact)}
                    >
                      <Bell size={16} />
                      Notify
                    </button>
                  </div>
                </div>
              ))}
              
              {personalContacts.length === 0 && (
                <div className="no-contacts-message">
                  <Users size={48} className="no-contacts-icon" />
                  <h3>No Personal Contacts Added</h3>
                  <p>Add your trusted emergency contacts for quick access during emergencies.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'firstaid' && (
          <div className="firstaid-section">
            {!selectedGuide ? (
              <>
                <div className="section-header">
                  <h2>First Aid Procedures</h2>
                  <p>Essential first aid steps for common emergencies in Ghana</p>
                </div>
                
                <div className="firstaid-disclaimer">
                  <Info size={20} />
                  <div className="disclaimer-content">
                    <strong>Important:</strong> These are basic first aid guidelines. Always call 193 (National Ambulance Service) for serious injuries or medical emergencies. Seek proper first aid training for comprehensive knowledge.
                  </div>
                </div>
                
                <div className="firstaid-grid">
                  {firstAidGuides.map(guide => (
                    <div 
                      key={guide.id} 
                      className={`firstaid-card ${guide.urgency}`}
                      onClick={() => handleSelectGuide(guide)}
                    >
                      <div className="firstaid-header">
                        <div className={`firstaid-icon ${guide.urgency}`}>
                          <guide.icon size={24} />
                        </div>
                        <div className="firstaid-info">
                          <h3 className="firstaid-title">{guide.title}</h3>
                          <span className={`urgency-badge ${getUrgencyColor(guide.urgency)}`}>
                            {guide.category}
                          </span>
                        </div>
                        <ChevronRight size={20} className="firstaid-arrow" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="firstaid-detail">
                <div className="firstaid-detail-header">
                  <button 
                    className="firstaid-back-btn"
                    onClick={() => setSelectedGuide(null)}
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="firstaid-detail-title">
                    <div className={`firstaid-detail-icon ${selectedGuide.urgency}`}>
                      <selectedGuide.icon size={32} />
                    </div>
                    <div>
                      <h2>{selectedGuide.title}</h2>
                      <span className={`urgency-badge ${getUrgencyColor(selectedGuide.urgency)}`}>
                        {selectedGuide.category}
                      </span>
                    </div>
                  </div>
                </div>
                
                {selectedGuide.urgency === 'critical' && (
                  <div className="critical-alert">
                    <AlertCircle size={20} />
                    <span>Call 193 (National Ambulance Service) Immediately</span>
                  </div>
                )}
                
                <div className="firstaid-steps">
                  <h3>Steps to Follow:</h3>
                  <ol className="steps-list">
                    {selectedGuide.steps.map((step, index) => (
                      <li key={index} className="step-item">
                        <span className="step-number">{index + 1}</span>
                        <span className="step-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                
                {selectedGuide.warnings && selectedGuide.warnings.length > 0 && (
                  <div className="firstaid-warnings">
                    <h3>Important Warnings:</h3>
                    <ul className="warnings-list">
                      {selectedGuide.warnings.map((warning, index) => (
                        <li key={index} className="warning-item">
                          <AlertCircle size={16} />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="firstaid-actions">
                  <button 
                    className="emergency-call-btn"
                    onClick={() => callEmergency('193', 'National Ambulance Service')}
                  >
                    <Phone size={20} />
                    Call Ambulance (193)
                  </button>
                  <button 
                    className="ambulance-call-btn"
                    onClick={() => router.push('/facilities')}
                  >
                    <MapPin size={20} />
                    Find Nearest Hospital
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="modal-overlay" onClick={() => setShowAddContact(false)}>
          <div className="add-contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Emergency Contact</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowAddContact(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Enter contact's full name" />
              </div>
              
              <div className="form-group">
                <label>Relationship</label>
                <select>
                  <option value="">Select relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="child">Child</option>
                  <option value="friend">Friend</option>
                  <option value="doctor">Doctor</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" placeholder="+233 XX XXX XXXX" />
              </div>
              
              <div className="form-group">
                <label>Priority Level</label>
                <select>
                  <option value="1">1 - Primary Contact</option>
                  <option value="2">2 - Secondary Contact</option>
                  <option value="3">3 - Backup Contact</option>
                </select>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-cancel-btn"
                onClick={() => setShowAddContact(false)}
              >
                Cancel
              </button>
              <button className="modal-save-btn">
                <Plus size={16} />
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="dashboard-footer-content">
          <div className="dashboard-footer-main">
            <div className="dashboard-footer-brand">
              <div className="dashboard-footer-logo">
                <Heart size={20} className="dashboard-footer-heart" />
                <span className="dashboard-footer-brand-text">HealthConnect Navigator</span>
              </div>
              <p className="dashboard-footer-tagline">
                Your trusted companion for healthcare navigation and emergency preparedness in Ghana.
              </p>
            </div>
            
            <div className="dashboard-footer-links">
              <div className="dashboard-footer-section">
                <h4 className="dashboard-footer-section-title">Services</h4>
                <ul className="dashboard-footer-list">
                  <li><button onClick={() => router.push('/facilities')} className="dashboard-footer-link">Find Facilities</button></li>
                  <li><button onClick={() => router.push('/symptom-checker')} className="dashboard-footer-link">Symptom Checker</button></li>
                  <li><button onClick={() => router.push('/emergency')} className="dashboard-footer-link">Emergency Hub</button></li>
                </ul>
              </div>
              
              <div className="dashboard-footer-section">
                <h4 className="dashboard-footer-section-title">Account</h4>
                <ul className="dashboard-footer-list">
                  <li><button onClick={() => router.push('/profile')} className="dashboard-footer-link">Profile</button></li>
                  <li><button onClick={() => router.push('/dashboard')} className="dashboard-footer-link">Dashboard</button></li>
                  <li><button onClick={handleSignOut} className="dashboard-footer-link">Sign Out</button></li>
                </ul>
              </div>
              
              <div className="dashboard-footer-section">
                <h4 className="dashboard-footer-section-title">Support</h4>
                <ul className="dashboard-footer-list">
                  <li><button className="dashboard-footer-link">Help Center</button></li>
                  <li><button className="dashboard-footer-link">Contact Us</button></li>
                  <li><button className="dashboard-footer-link">Privacy Policy</button></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="dashboard-footer-bottom">
            <div className="dashboard-footer-copyright">
              <p>&copy; 2025 HealthConnect Navigator. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}