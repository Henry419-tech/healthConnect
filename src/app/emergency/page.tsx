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
  Home,
  Edit2,
  Trash2,
  Save,
  UserPlus,
  Mail,
  MessageCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Bot
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
  id: string;
  name: string;
  relationship: string;
  number: string;
  priority: number;
  email?: string;
  notes?: string;
  createdAt: Date;
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

interface FormData {
  name: string;
  relationship: string;
  number: string;
  priority: string;
  email: string;
  notes: string;
}

interface NotificationStatus {
  contactId: string;
  status: 'sending' | 'success' | 'error';
  message?: string;
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

// Personal Emergency Contacts (Initial empty - loaded from memory)
const initialPersonalContacts: PersonalContact[] = [];

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
  const [personalContacts, setPersonalContacts] = useState<PersonalContact[]>(initialPersonalContacts);
  const [editingContact, setEditingContact] = useState<PersonalContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBottomTab, setActiveBottomTab] = useState<string>('emergency');
  const [notificationStatuses, setNotificationStatuses] = useState<NotificationStatus[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    relationship: '',
    number: '',
    priority: '1',
    email: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Load contacts from database on mount
  useEffect(() => {
    loadContactsFromDatabase();
    
    // Check if location permission was previously granted
    const locationPermission = localStorage.getItem('locationPermissionGranted');
    if (locationPermission === 'true') {
      requestUserLocation();
    } else if (locationPermission === 'denied') {
      setLocationPermissionDenied(true);
    } else {
      // Show friendly prompt after 2 seconds
      setTimeout(() => {
        setShowLocationPrompt(true);
      }, 2000);
    }
  }, []);

  // Load contacts from database
  const loadContactsFromDatabase = async () => {
    try {
      setIsLoadingContacts(true);
      const response = await fetch('/api/emergency-contacts');
      
      if (!response.ok) {
        throw new Error('Failed to load contacts');
      }

      const data = await response.json();
      
      if (data.success && data.contacts) {
        // Convert database dates to Date objects
        const contactsWithDates = data.contacts.map((contact: any) => ({
          ...contact,
          createdAt: new Date(contact.createdAt)
        }));
        setPersonalContacts(contactsWithDates);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Request user location
  const requestUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          localStorage.setItem('locationPermissionGranted', 'true');
          setShowLocationPrompt(false);
          setLocationPermissionDenied(false);
        },
        (error) => {
          console.log('Location access denied or unavailable');
          localStorage.setItem('locationPermissionGranted', 'denied');
          setLocationPermissionDenied(true);
          setShowLocationPrompt(false);
        }
      );
    }
  };

  // Handle location permission acceptance
  const handleAcceptLocation = () => {
    requestUserLocation();
  };

  // Handle location permission denial
  const handleDeclineLocation = () => {
    localStorage.setItem('locationPermissionGranted', 'denied');
    setShowLocationPrompt(false);
    setLocationPermissionDenied(true);
  };

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

  // Helper function to detect if device supports SMS
  const isMobileDevice = (): boolean => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return isMobile || isStandalone;
  };

  // Send notification via SMS (mobile) or Email (desktop)
  const sendSMSNotification = async (contact: PersonalContact): Promise<{
    success: boolean, 
    message: string, 
    smsURI?: string,
    method?: 'sms' | 'email'
  }> => {
    try {
      const locationString = userLocation 
        ? `${userLocation.lat},${userLocation.lng}`
        : null;

      const isMobile = isMobileDevice();
      const useEmail = !isMobile || !contact.number;

      const response = await fetch('/api/send-emergency-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: contact.number,
          contactName: contact.name,
          userName: session?.user?.name || 'Your emergency contact',
          userLocation: locationString,
          relationship: contact.relationship,
          contactEmail: contact.email,
          useEmail: useEmail
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification');
      }

      return {
        success: true,
        message: data.message || 'Notification sent successfully',
        smsURI: data.smsURI,
        method: data.method
      };
    } catch (error: any) {
      console.error('Notification error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send notification'
      };
    }
  };

  // Handle notify single contact
  const handleNotifyContact = async (contact: PersonalContact) => {
    const isMobile = isMobileDevice();
    
    // Check if contact has required info
    if (!isMobile && !contact.email) {
      alert(`Cannot send notification to ${contact.name}.\n\nEmail is required for desktop notifications. Please add an email address for this contact.`);
      return;
    }

    if (isMobile && !contact.number) {
      alert(`Cannot send SMS to ${contact.name}.\n\nPhone number is required. Please add a phone number for this contact.`);
      return;
    }

    const methodText = isMobile ? 'SMS' : 'email';
    const targetText = isMobile ? contact.number : contact.email;

    if (!confirm(`Send emergency ${methodText} to ${contact.name}?\n\nTo: ${targetText}\n\n${isMobile ? 'This will open your SMS app. You pay from your phone plan (~GHS 0.10-0.20)' : 'An emergency email will be sent immediately.'}`)) {
      return;
    }

    // Show loading status
    setNotificationStatuses([{
      contactId: contact.id,
      status: 'sending',
      message: isMobile ? 'Preparing SMS...' : 'Sending email...'
    }]);
    setShowNotificationModal(true);

    // Send the notification
    const result = await sendSMSNotification(contact);

    if (!result.success) {
      setNotificationStatuses([{
        contactId: contact.id,
        status: 'error',
        message: result.message
      }]);
      
      // Auto-close error after 3 seconds
      setTimeout(() => {
        setShowNotificationModal(false);
        setNotificationStatuses([]);
      }, 3000);
      return;
    }

    // Handle SMS (mobile)
    if (result.method === 'sms' && result.smsURI) {
      setNotificationStatuses([{
        contactId: contact.id,
        status: 'success',
        message: 'Opening SMS app...'
      }]);

      // Wait a moment then open SMS app
      setTimeout(() => {
        setShowNotificationModal(false);
        setNotificationStatuses([]);
        window.location.href = result.smsURI!;
      }, 1000);
    } 
    // Handle Email (desktop)
    else if (result.method === 'email') {
      setNotificationStatuses([{
        contactId: contact.id,
        status: 'success',
        message: 'Email sent successfully!'
      }]);

      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowNotificationModal(false);
        setNotificationStatuses([]);
      }, 3000);
    }

    // Track activity
    try {
      await trackActivity(
        activityTypes.EMERGENCY_ACCESSED,
        `Emergency notification ${result.success ? 'sent to' : 'failed for'} ${contact.name}`,
        `Emergency ${result.method?.toUpperCase()} notification`,
        {
          contactName: contact.name,
          relationship: contact.relationship,
          priority: contact.priority,
          method: result.method,
          success: result.success
        }
      );
    } catch (error) {
      console.error('Failed to track notification activity:', error);
    }
  };

  // Notify all contacts
  const handleNotifyAllContacts = async () => {
    if (personalContacts.length === 0) {
      alert('No emergency contacts added yet.');
      return;
    }

    const isMobile = isMobileDevice();
    const methodText = isMobile ? 'SMS' : 'email';

    // Check if all contacts have required info
    const contactsWithoutInfo = personalContacts.filter(c => 
      isMobile ? !c.number : !c.email
    );

    if (contactsWithoutInfo.length > 0) {
      const missing = contactsWithoutInfo.map(c => c.name).join(', ');
      alert(`Cannot notify all contacts.\n\n${contactsWithoutInfo.length} contact(s) missing ${isMobile ? 'phone numbers' : 'email addresses'}:\n${missing}\n\nPlease update these contacts first.`);
      return;
    }

    if (!confirm(`Send emergency ${methodText} to ALL ${personalContacts.length} contacts?\n\n${isMobile ? 'This will open your SMS app for each contact. You will pay from your phone plan (~GHS 0.10-0.20 per message).' : 'Emergency emails will be sent immediately to all contacts.'}`)) {
      return;
    }

    // Initialize statuses
    const initialStatuses = personalContacts.map(contact => ({
      contactId: contact.id,
      status: 'sending' as const,
      message: isMobile ? 'Preparing SMS...' : 'Sending email...'
    }));
    
    setNotificationStatuses(initialStatuses);
    setShowNotificationModal(true);

    // Send to all contacts
    const results = await Promise.all(
      personalContacts.map(async (contact) => {
        const result = await sendSMSNotification(contact);
        return {
          contactId: contact.id,
          status: result.success ? 'success' as const : 'error' as const,
          message: result.success ? (result.method === 'sms' ? 'SMS ready' : 'Email sent!') : result.message,
          contactName: contact.name,
          smsURI: result.smsURI,
          method: result.method
        };
      })
    );

    // Update statuses
    setNotificationStatuses(results);

    // For mobile SMS - open each SMS app in sequence
    if (isMobile) {
      setTimeout(() => {
        setShowNotificationModal(false);
        
        results.forEach((result, index) => {
          if (result.status === 'success' && result.smsURI) {
            setTimeout(() => {
              window.location.href = result.smsURI!;
            }, index * 2000); // 2 second delay between each
          }
        });
      }, 1500);
    } 
    // For desktop email - just show success
    else {
      setTimeout(() => {
        setShowNotificationModal(false);
        setNotificationStatuses([]);
      }, 3000);
    }

    // Track activity
    const successCount = results.filter(r => r.status === 'success').length;
    try {
      await trackActivity(
        activityTypes.EMERGENCY_ACCESSED,
        `Mass emergency notification sent to ${successCount}/${personalContacts.length} contacts`,
        'Emergency broadcast notification',
        {
          totalContacts: personalContacts.length,
          successCount: successCount,
          failedCount: personalContacts.length - successCount,
          method: isMobile ? 'SMS' : 'Email'
        }
      );
    } catch (error) {
      console.error('Failed to track mass notification activity:', error);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.relationship.trim()) {
      errors.relationship = 'Relationship is required';
    }
    
    if (!formData.number.trim()) {
      errors.number = 'Phone number is required';
    } else if (!/^(\+233|0)[0-9]{9}$/.test(formData.number.replace(/\s/g, ''))) {
      errors.number = 'Invalid Ghana phone number format (e.g., +233245678901 or 0245678901)';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add new contact
  const handleAddContact = async () => {
    if (!validateForm()) return;
    
    try {
      const response = await fetch('/api/emergency-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          relationship: formData.relationship.trim(),
          number: formData.number.trim(),
          priority: parseInt(formData.priority),
          email: formData.email.trim() || null,
          notes: formData.notes.trim() || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to add contact');
        return;
      }

      // Reload contacts from database
      await loadContactsFromDatabase();
      
      setShowAddContact(false);
      resetForm();
      
      // Track activity
      try {
        await trackActivity(
          activityTypes.EMERGENCY_ACCESSED,
          `Added emergency contact: ${data.contact.name}`,
          'New personal emergency contact added',
          { contactName: data.contact.name, relationship: data.contact.relationship }
        );
      } catch (error) {
        console.error('Failed to track add contact activity:', error);
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Failed to add emergency contact. Please try again.');
    }
  };

  // Update existing contact
  const handleUpdateContact = async () => {
    if (!editingContact || !validateForm()) return;
    
    try {
      const response = await fetch('/api/emergency-contacts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingContact.id,
          name: formData.name.trim(),
          relationship: formData.relationship.trim(),
          number: formData.number.trim(),
          priority: parseInt(formData.priority),
          email: formData.email.trim() || null,
          notes: formData.notes.trim() || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to update contact');
        return;
      }

      // Reload contacts from database
      await loadContactsFromDatabase();
      
      setEditingContact(null);
      setShowAddContact(false);
      resetForm();
      
      // Track activity
      try {
        await trackActivity(
          activityTypes.EMERGENCY_ACCESSED,
          `Updated emergency contact: ${data.contact.name}`,
          'Personal emergency contact updated',
          { contactName: data.contact.name }
        );
      } catch (error) {
        console.error('Failed to track update contact activity:', error);
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update emergency contact. Please try again.');
    }
  };

  // Delete contact
  const handleDeleteContact = async (contact: PersonalContact) => {
    if (!confirm(`Are you sure you want to delete ${contact.name} from your emergency contacts?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/emergency-contacts?id=${contact.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to delete contact');
        return;
      }

      // Reload contacts from database
      await loadContactsFromDatabase();
      
      // Track activity
      try {
        await trackActivity(
          activityTypes.EMERGENCY_ACCESSED,
          `Deleted emergency contact: ${contact.name}`,
          'Personal emergency contact deleted',
          { contactName: contact.name }
        );
      } catch (error) {
        console.error('Failed to track delete contact activity:', error);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete emergency contact. Please try again.');
    }
  };

  // Start editing contact
  const handleEditContact = (contact: PersonalContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      number: contact.number,
      priority: contact.priority.toString(),
      email: contact.email || '',
      notes: contact.notes || ''
    });
    setFormErrors({});
    setShowAddContact(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      relationship: '',
      number: '',
      priority: '1',
      email: '',
      notes: ''
    });
    setFormErrors({});
    setEditingContact(null);
  };

  // Handle form input change
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Filter contacts based on search
  const filteredContacts = personalContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.relationship.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.number.includes(searchQuery)
  );

  const getUrgencyColor = (urgency: 'critical' | 'urgent' | 'important') => {
    switch (urgency) {
      case 'critical': return isDarkMode ? 'text-red-300 bg-red-900/40 border-red-700' : 'text-red-600 bg-red-50 border-red-200';
      case 'urgent': return isDarkMode ? 'text-orange-300 bg-orange-900/40 border-orange-700' : 'text-orange-600 bg-orange-50 border-orange-200';
      case 'important': return isDarkMode ? 'text-blue-300 bg-blue-900/40 border-blue-700' : 'text-blue-600 bg-blue-50 border-blue-200';
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

  // Handle bottom nav click
  const handleBottomNavClick = (path: string, tab: string) => {
    setActiveBottomTab(tab);
    router.push(path);
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
          <div className="emergency-page-header">
            <h1 className="emergency-header-with-icon">
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
          Personal Contacts ({personalContacts.length})
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
              <div>
                <h2>Personal Emergency Contacts</h2>
                <p>Your trusted contacts for emergencies</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {personalContacts.length > 0 && (
                  <button 
                    className="notify-all-btn"
                    onClick={handleNotifyAllContacts}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    <Bell size={18} />
                    Alert All
                  </button>
                )}
                <button 
                  className="add-contact-btn"
                  onClick={() => {
                    resetForm();
                    setShowAddContact(true);
                  }}
                >
                  <Plus size={18} />
                  Add Contact
                </button>
              </div>
            </div>
            
            {personalContacts.length > 0 && (
              <div className="contacts-search-bar">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button 
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            
            {isLoadingContacts ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                gap: '16px'
              }}>
                <Loader2 size={48} className="animate-spin" style={{ color: '#3b82f6' }} />
                <p style={{ fontSize: '16px', color: '#64748b' }}>Loading your emergency contacts...</p>
              </div>
            ) : (
              <div className="personal-contacts-list">
              {filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <div key={contact.id} className="personal-contact-card">
                    <div className="personal-contact-info">
                      <div className="contact-priority">
                        <span className="priority-number">{contact.priority}</span>
                      </div>
                      <div className="contact-details">
                        <h3 className="contact-name">{contact.name}</h3>
                        <p className="contact-relationship">{contact.relationship}</p>
                        <p className="contact-number">
                          <Phone size={14} />
                          {contact.number}
                        </p>
                        {contact.email && (
                          <p className="contact-email">
                            <Mail size={14} />
                            {contact.email}
                          </p>
                        )}
                        {contact.notes && (
                          <p className="contact-notes">
                            <MessageCircle size={14} />
                            {contact.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="personal-contact-actions">
                      <button 
                        className="contact-call-btn primary"
                        onClick={() => callEmergency(contact.number, contact.name)}
                        title="Call contact"
                      >
                        <Phone size={16} />
                        Call
                      </button>
                      <button 
                        className="contact-notify-btn"
                        onClick={() => handleNotifyContact(contact)}
                        title="Send emergency SMS notification"
                      >
                        <Bell size={16} />
                        SMS
                      </button>
                      <button 
                        className="contact-edit-btn"
                        onClick={() => handleEditContact(contact)}
                        title="Edit contact"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="contact-delete-btn"
                        onClick={() => handleDeleteContact(contact)}
                        title="Delete contact"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-contacts-message">
                  {searchQuery ? (
                    <>
                      <Search size={48} className="no-contacts-icon" />
                      <h3>No contacts found</h3>
                      <p>No contacts match your search "{searchQuery}"</p>
                      <button 
                        className="clear-search-btn-large"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear Search
                      </button>
                    </>
                  ) : (
                    <>
                      <Users size={48} className="no-contacts-icon" />
                      <h3>No Personal Contacts Added</h3>
                      <p>Add your trusted emergency contacts for quick SMS notifications during emergencies.</p>
                      <button 
                        className="add-first-contact-btn"
                        onClick={() => {
                          resetForm();
                          setShowAddContact(true);
                        }}
                      >
                        <Plus size={18} />
                        Add Your First Contact
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            )}
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

      {/* Location Permission Prompt */}
      {showLocationPrompt && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="add-contact-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MapPin size={24} style={{ color: '#3b82f6' }} />
                <h3>Enable Location Services</h3>
              </div>
            </div>
            
            <div className="modal-content">
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '16px' }}>
                  To provide you with the best emergency assistance, we'd like to access your location. This helps us:
                </p>
                <ul style={{ 
                  fontSize: '14px', 
                  lineHeight: '1.8', 
                  paddingLeft: '20px',
                  color: '#64748b'
                }}>
                  <li>Include your exact location in emergency SMS notifications</li>
                  <li>Help emergency contacts find you quickly</li>
                  <li>Show you the nearest hospitals and emergency services</li>
                  <li>Provide accurate directions to healthcare facilities</li>
                </ul>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <Info size={20} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#1e40af', marginBottom: '8px', fontWeight: '600' }}>
                      Your Privacy Matters
                    </p>
                    <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#1e40af' }}>
                      Your location is only used for emergency services and is never stored or shared. 
                      You can change this permission at any time in your browser settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-actions" style={{ gap: '12px' }}>
              <button 
                className="modal-cancel-btn"
                onClick={handleDeclineLocation}
                style={{ flex: 1 }}
              >
                Not Now
              </button>
              <button 
                className="modal-save-btn"
                onClick={handleAcceptLocation}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <MapPin size={18} />
                Enable Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Permission Denied Info Banner */}
      {locationPermissionDenied && !userLocation && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '500px',
          width: '90%',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'start',
          gap: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 999
        }}>
          <AlertCircle size={20} style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>
              Location Access Disabled
            </p>
            <p style={{ fontSize: '13px', color: '#991b1b', lineHeight: '1.4', marginBottom: '8px' }}>
              Emergency notifications won't include your location. Enable it anytime in your browser settings.
            </p>
            <button
              onClick={() => {
                setLocationPermissionDenied(false);
                setShowLocationPrompt(true);
              }}
              style={{
                fontSize: '13px',
                color: '#dc2626',
                fontWeight: '600',
                background: 'none',
                border: 'none',
                padding: '0',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Try Again
            </button>
          </div>
          <button
            onClick={() => setLocationPermissionDenied(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              color: '#991b1b'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Notification Status Modal */}
      {showNotificationModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="notification-status-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Emergency SMS Status</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowNotificationModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notificationStatuses.map((status) => {
                const contact = personalContacts.find(c => c.id === status.contactId);
                return (
                  <div key={status.contactId} className="notification-status-item" style={{
                    padding: '16px',
                    marginBottom: '12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: status.status === 'success' ? '#10b981' : status.status === 'error' ? '#ef4444' : '#94a3b8',
                    backgroundColor: status.status === 'success' ? '#ecfdf5' : status.status === 'error' ? '#fef2f2' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {status.status === 'sending' && (
                      <Loader2 size={24} className="animate-spin" style={{ color: '#3b82f6' }} />
                    )}
                    {status.status === 'success' && (
                      <CheckCircle2 size={24} style={{ color: '#10b981' }} />
                    )}
                    {status.status === 'error' && (
                      <XCircle size={24} style={{ color: '#ef4444' }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {contact?.name || 'Unknown Contact'}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: status.status === 'success' ? '#059669' : status.status === 'error' ? '#dc2626' : '#64748b'
                      }}>
                        {status.message}
                      </div>
                      {contact && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {contact.number}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-save-btn"
                onClick={() => {
                  setShowNotificationModal(false);
                  setNotificationStatuses([]);
                }}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {showAddContact && (
        <div className="modal-overlay" onClick={() => {
          setShowAddContact(false);
          resetForm();
        }}>
          <div className="add-contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</h3>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setShowAddContact(false);
                  resetForm();
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Full Name *</label>
                <input 
                  type="text" 
                  placeholder="Enter contact's full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={formErrors.name ? 'error' : ''}
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>
              
              <div className="form-group">
                <label>Relationship *</label>
                <select
                  value={formData.relationship}
                  onChange={(e) => handleInputChange('relationship', e.target.value)}
                  className={formErrors.relationship ? 'error' : ''}
                >
                  <option value="">Select relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Friend">Friend</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Neighbor">Neighbor</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Other">Other</option>
                </select>
                {formErrors.relationship && <span className="error-text">{formErrors.relationship}</span>}
              </div>
              
              <div className="form-group">
                <label>Phone Number (Ghana) *</label>
                <input 
                  type="tel" 
                  placeholder="+233245678901 or 0245678901"
                  value={formData.number}
                  onChange={(e) => handleInputChange('number', e.target.value)}
                  className={formErrors.number ? 'error' : ''}
                />
                {formErrors.number && <span className="error-text">{formErrors.number}</span>}
                <small style={{ display: 'block', marginTop: '4px', color: '#64748b' }}>
                  Format: +233XXXXXXXXX or 0XXXXXXXXX (MTN, Vodafone, AirtelTigo)
                </small>
              </div>
              
              <div className="form-group">
                <label>Priority Level *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                >
                  <option value="1">1 - Primary Contact</option>
                  <option value="2">2 - Secondary Contact</option>
                  <option value="3">3 - Backup Contact</option>
                  <option value="4">4 - Additional Contact</option>
                  <option value="5">5 - Other Contact</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Email (Optional)</label>
                <input 
                  type="email" 
                  placeholder="contact@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={formErrors.email ? 'error' : ''}
                />
                {formErrors.email && <span className="error-text">{formErrors.email}</span>}
              </div>
              
              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea 
                  placeholder="Any additional information..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-cancel-btn"
                onClick={() => {
                  setShowAddContact(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button 
                className="modal-save-btn"
                onClick={editingContact ? handleUpdateContact : handleAddContact}
              >
                {editingContact ? (
                  <>
                    <Save size={16} />
                    Update Contact
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Contact
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav className="dashboard-bottom-nav">
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/dashboard', 'dashboard')}
          type="button"
          data-tab="dashboard"
        >
          <Home size={22} />
          <span>Home</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'facilities' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/facilities', 'facilities')}
          type="button"
          data-tab="facilities"
        >
          <MapPin size={22} />
          <span>Facilities</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'symptom' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/symptom-checker', 'symptom')}
          type="button"
          data-tab="symptom"
        >
          <Bot size={22} />
          <span>Symptoms</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'emergency' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/emergency', 'emergency')}
          type="button"
          data-tab="emergency"
        >
          <Phone size={22} />
          <span>Emergency</span>
        </button>
        <button 
          className={`dashboard-bottom-nav-item ${activeBottomTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleBottomNavClick('/profile', 'profile')}
          type="button"
          data-tab="profile"
        >
          <User size={22} />
          <span>Profile</span>
        </button>
      </nav>

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