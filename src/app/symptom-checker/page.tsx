'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardHeader from '@/components/DashboardHeader';
import { trackActivity, activityTypes } from '@/lib/activityTracker';
import { 
  ArrowLeft,
  Bot,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Heart,
  Brain,
  Activity,
  Phone,
  MapPin,
  Info,
  ChevronRight,
  X,
  Plus,
  Minus,
  Shield,
  User,
  Calendar,
  Loader2,
  HelpCircle,
  Stethoscope,
  FileText,
  Send,
  MessageSquare,
  Zap,
  Star,
  Bell,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';

// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'symptom' | 'question' | 'assessment' | 'recommendation';
}

interface AssessmentResult {
  urgencyLevel: 'low' | 'moderate' | 'high' | 'emergency';
  summary: string;
  recommendations: string[];
  redFlags: string[];
  nextSteps: string[];
  facilityRecommendation: boolean;
}

export default function DynamicFacilityFinder() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // State management
  const [currentStep, setCurrentStep] = useState<'chat' | 'assessment'>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [showEmergencyWarning, setShowEmergencyWarning] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);

  
  // Ref for chat messages container
  const chatMessagesRef = React.useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

 // Replace the welcome message in your page.tsx (around line 95-110)

  // Initialize chat with welcome message
  useEffect(() => {
    if (currentStep === 'chat' && chatMessages.length === 0 && !showWelcomeModal) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your AI health assistant. I'm here to help you understand your symptoms and provide helpful health information.

**How I Can Help:**
• Answer questions about symptoms and common health conditions
• Provide health education and context
• Help you understand when to seek medical care
• Discuss possible causes of symptoms
• Suggest general self-care for minor issues

**What to Know:**
• I provide information, not diagnoses
• For emergencies, I'll direct you to immediate care
• I'm here to have a helpful conversation about your health

**Let's start:** Tell me what symptoms or health concerns you're experiencing, and I'll ask questions to better understand your situation.`,
        timestamp: new Date(),
        type: 'question'
      };
      setChatMessages([welcomeMessage]);
    }
  }, [currentStep, chatMessages.length, showWelcomeModal]);

  // Sign out handler
  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Send message to AI API
  const sendMessageToAI = async (messages: ChatMessage[], userMessage: string) => {
    try {
      setIsProcessing(true);
      
      const systemPrompt = `You are a medical information assistant for HealthConnect Navigator. Your role is to:

1. SAFETY FIRST: Always prioritize user safety and encourage professional medical consultation
2. NO DIAGNOSIS: Never provide medical diagnoses - only general health information
3. RED FLAGS: Immediately identify emergency symptoms and direct users to seek immediate care
4. PROFESSIONAL GUIDANCE: Always recommend consulting healthcare professionals
5. FACILITY DIRECTION: When appropriate, suggest users visit healthcare facilities

**Emergency Symptoms (Always direct to immediate care):**
- Chest pain, especially with shortness of breath
- Severe difficulty breathing
- Signs of stroke (face drooping, arm weakness, speech difficulty)
- Severe allergic reactions
- Severe abdominal pain
- High fever with severe symptoms
- Severe head injury or sudden severe headache
- Heavy bleeding that won't stop

**Your Process:**
1. Ask clarifying questions about symptoms (duration, severity, associated symptoms)
2. Provide general health education
3. Assess urgency level (low/moderate/high/emergency)
4. Give appropriate recommendations
5. ALWAYS end with disclaimer about seeking professional care

Be empathetic, professional, and always err on the side of caution. Ask one question at a time and keep responses clear and structured. If specific demographic information is needed for better guidance, ask the user directly in the conversation.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      return data.message;

    } catch (error) {
      console.error('Error calling AI:', error);
      return "I apologize, but I'm having trouble processing your request right now. For your safety, please consider speaking with a healthcare professional directly, or use our facility finder to locate nearby medical help.";
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle sending a message with activity tracking
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
      type: 'symptom'
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    
    // Track symptom message sent
    try {
      await trackActivity(
        activityTypes.SYMPTOM_CHECKED,
        'Symptom message sent',
        currentMessage.substring(0, 100), // First 100 chars
        {
          messageLength: currentMessage.length,
          messageNumber: chatMessages.filter(msg => msg.role === 'user').length + 1
        }
      );
    } catch (error) {
      console.error('Failed to track symptom message:', error);
    }

    const messageToSend = currentMessage;
    setCurrentMessage('');

    // Check for emergency keywords
    const emergencyKeywords = [
      'chest pain', 'can\'t breathe', 'severe pain', 'bleeding heavily', 
      'unconscious', 'stroke', 'heart attack', 'severe headache', 'choking'
    ];

    const hasEmergencyKeyword = emergencyKeywords.some(keyword => 
      messageToSend.toLowerCase().includes(keyword)
    );

    if (hasEmergencyKeyword) {
      setShowEmergencyWarning(true);
      
      // Track emergency keyword detection
      try {
        await trackActivity(
          activityTypes.EMERGENCY_ACCESSED,
          'Emergency symptoms detected in chat',
          messageToSend.substring(0, 100),
          {
            detectedKeywords: emergencyKeywords.filter(kw => 
              messageToSend.toLowerCase().includes(kw)
            )
          }
        );
      } catch (error) {
        console.error('Failed to track emergency detection:', error);
      }
    }

    // Get AI response
    const aiResponse = await sendMessageToAI(updatedMessages, messageToSend);

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      type: 'assessment'
    };

    setChatMessages(prev => [...prev, assistantMessage]);

    // Check if we should show assessment
    if (updatedMessages.length >= 6) {
      setTimeout(() => {
        generateAssessment(updatedMessages);
      }, 1000);
    }
  };

  // Generate final assessment with activity tracking
  const generateAssessment = async (messages: ChatMessage[]) => {
    try {
      const conversationSummary = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');

      const assessmentPrompt = `Based on this symptom consultation: "${conversationSummary}"

Please provide a structured assessment with:
1. Urgency level (low/moderate/high/emergency)
2. Brief summary of concerns
3. General recommendations
4. Any red flags to watch for
5. Whether they should visit a healthcare facility

Respond in this exact JSON format:
{
  "urgencyLevel": "low|moderate|high|emergency",
  "summary": "Brief summary of the consultation",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "redFlags": ["red flag 1", "red flag 2"],
  "nextSteps": ["next step 1", "next step 2"],
  "facilityRecommendation": true/false
}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a medical assessment assistant. Provide structured JSON responses only.' },
            { role: 'user', content: assessmentPrompt }
          ],
          temperature: 0.2,
          max_tokens: 400
        })
      });

      if (response.ok) {
        const data = await response.json();
        try {
          const assessment = JSON.parse(data.message);
          setAssessmentResult(assessment);
          setCurrentStep('assessment');
          
          // Track symptom assessment completion
          try {
            await trackActivity(
              activityTypes.SYMPTOM_CHECKED,
              'Completed symptom assessment',
              conversationSummary.substring(0, 200), // First 200 chars
              {
                urgencyLevel: assessment.urgencyLevel,
                facilityRecommended: assessment.facilityRecommendation,
                symptomCount: messages.filter(msg => msg.role === 'user').length,
                hasRedFlags: assessment.redFlags && assessment.redFlags.length > 0,
                recommendationCount: assessment.recommendations?.length || 0
              }
            );
          } catch (error) {
            console.error('Failed to track assessment completion:', error);
          }
        } catch (e) {
          console.error('Failed to parse assessment:', e);
        }
      }
    } catch (error) {
      console.error('Error generating assessment:', error);
    }
  };

  // Handle starting symptom check with tracking
  const handleStartSymptomCheck = async () => {
    setShowWelcomeModal(false);
    
    try {
      await trackActivity(
        activityTypes.SYMPTOM_CHECKED,
        'Started symptom checker session',
        'User initiated new symptom assessment',
        {
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to track symptom check start:', error);
    }
  };

  // Handle viewing facilities from assessment with tracking
  const handleViewFacilities = async () => {
    router.push('/facilities');
    
    try {
      await trackActivity(
        activityTypes.FACILITY_FOUND,
        'Viewed facilities from symptom assessment',
        'User clicked to find facilities after symptom check',
        {
          source: 'symptom_checker',
          assessmentUrgency: assessmentResult?.urgencyLevel
        }
      );
    } catch (error) {
      console.error('Failed to track facility view:', error);
    }
  };

  // Handle emergency call from symptom checker with tracking
  const handleEmergencyCall = async (number: string) => {
    window.open(`tel:${number}`, '_self');
    
    try {
      await trackActivity(
        activityTypes.EMERGENCY_ACCESSED,
        `Called ${number} from symptom checker`,
        'Emergency call initiated during symptom assessment',
        {
          contactNumber: number,
          source: 'symptom_checker',
          assessmentUrgency: assessmentResult?.urgencyLevel
        }
      );
    } catch (error) {
      console.error('Failed to track emergency call:', error);
    }
  };

  // Handle restarting symptom check with tracking
  const handleRestartSymptomCheck = async () => {
    const previousUrgency = assessmentResult?.urgencyLevel || 'none';
    
    setCurrentStep('chat');
    setChatMessages([]);
    setAssessmentResult(null);
    
    try {
      await trackActivity(
        activityTypes.SYMPTOM_CHECKED,
        'Restarted symptom checker',
        'User started new symptom assessment session',
        {
          previousUrgency: previousUrgency
        }
      );
    } catch (error) {
      console.error('Failed to track restart:', error);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get urgency color
  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'low': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'emergency': return '#dc2626';
      default: return '#6b7280';
    }
  };

  // Get user info with proper typing
  const userName: string = session?.user?.name || 'User';
  const userEmail: string | null = session?.user?.email || null;

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Bot size={48} className="loading-icon" />
          <div className="loading-title">Loading AI Symptom Checker...</div>
          <div className="loading-subtitle">Preparing your health assistant</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="symptom-checker">
      {/* Dashboard Header */}
     <DashboardHeader activeTab="/symptom-checker" />

      {/* Main Content */}
      <div className="symptom-checker-content">
        {/* Page Header Section */}
        <div className="symptom-checker-page-header">
          <div className="symptom-checker-header-info">
            <p className="symptom-checker-subtitle">AI-powered health insights - Always consult professionals for medical advice</p>
            <button 
              className="emergency-btn"
              onClick={() => setShowEmergencyWarning(true)}
            >
              <Phone size={18} />
              Emergency
            </button>
          </div>
        </div>

        {/* Welcome Modal */}
        {showWelcomeModal && (
          <div className="welcome-modal-overlay" onClick={() => handleStartSymptomCheck()}>
            <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
              <div className="welcome-modal-header">
                <div className="welcome-modal-icon">
                  <Bot size={48} />
                </div>
                <h3>Welcome to AI Symptom Checker</h3>
                <p>Get personalized health insights powered by advanced AI technology</p>
                <button 
                  className="welcome-modal-close"
                  onClick={handleStartSymptomCheck}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="welcome-modal-content">
                <div className="disclaimer-section">
                  <Shield size={24} />
                  <div>
                    <h4>Important Medical Disclaimer</h4>
                    <ul>
                      <li>This tool provides general health information only</li>
                      <li>It cannot replace professional medical diagnosis</li>
                      <li>Always consult healthcare professionals for medical advice</li>
                      <li>Seek immediate emergency care for severe symptoms</li>
                    </ul>
                  </div>
                </div>

                <div className="features-preview">
                  <div className="feature-preview">
                    <MessageSquare size={24} />
                    <div>
                      <h5>Interactive Chat</h5>
                      <p>Conversational symptom assessment</p>
                    </div>
                  </div>
                  <div className="feature-preview">
                    <Brain size={24} />
                    <div>
                      <h5>AI Analysis</h5>
                      <p>Advanced health insights</p>
                    </div>
                  </div>
                  <div className="feature-preview">
                    <Zap size={24} />
                    <div>
                      <h5>Instant Results</h5>
                      <p>Immediate guidance</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="welcome-modal-actions">
                <button 
                  className="start-chat-btn"
                  onClick={handleStartSymptomCheck}
                >
                  Start Health Assessment
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Warning Modal */}
        {showEmergencyWarning && (
          <div className="emergency-modal" onClick={() => setShowEmergencyWarning(false)}>
            <div className="emergency-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="emergency-modal-header">
                <AlertTriangle size={40} className="emergency-icon" />
                <h2>Emergency Symptoms Detected</h2>
                <button onClick={() => setShowEmergencyWarning(false)}>
                  <X size={24} />
                </button>
              </div>
              <div className="emergency-modal-body">
                <p className="emergency-warning">
                  If you're experiencing a medical emergency, please seek immediate medical attention.
                </p>
                <div className="emergency-actions">
                  <button 
                    className="emergency-action-btn primary"
                    onClick={() => handleEmergencyCall('193')}
                  >
                    <Phone size={20} />
                    Call Emergency Services
                  </button>
                  <button 
                    className="emergency-action-btn secondary"
                    onClick={handleViewFacilities}
                  >
                    <MapPin size={20} />
                    Find Nearest Hospital
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Section */}
        {currentStep === 'chat' && (
          <div className="chat-section">
            <div className="chat-container">
              <div className="chat-messages" ref={chatMessagesRef}>
                {chatMessages.map((message) => (
                  <div key={message.id} className={`message ${message.role}`}>
                    <div className="message-content">
                      {message.role === 'assistant' && (
                        <div className="message-avatar assistant">
                          <Bot size={20} />
                        </div>
                      )}
                      {message.role === 'user' && (
                        <div className="message-avatar user">
                          <User size={20} />
                        </div>
                      )}
                      <div className="message-bubble">
                        {message.content.split('\n').map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                        <div className="message-time">
                          {message.timestamp.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="message assistant">
                    <div className="message-content">
                      <div className="message-avatar assistant">
                        <Bot size={20} />
                      </div>
                      <div className="typing-indicator">
                        <div className="typing-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <span>AI is analyzing your symptoms...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="chat-input-container">
                <div className="chat-input-wrapper">
                  <textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe your symptoms in detail..."
                    className="chat-input"
                    rows={3}
                    disabled={isProcessing}
                  />
                  <button 
                    className="send-btn"
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || isProcessing}
                  >
                    <Send size={20} />
                  </button>
                </div>
                <div className="chat-suggestions">
                  <span>Try: "I have a headache and fever" or "I've been coughing for 3 days"</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assessment Section */}
        {currentStep === 'assessment' && assessmentResult && (
          <div className="assessment-section">
            <div className="assessment-card">
              <div className="assessment-header">
                <div 
                  className="urgency-indicator"
                  style={{ backgroundColor: getUrgencyColor(assessmentResult.urgencyLevel) }}
                >
                  <FileText size={32} />
                </div>
                <div className="assessment-header-content">
                  <h2>Health Assessment Summary</h2>
                  <p className="urgency-level">
                    Urgency Level: <span style={{ color: getUrgencyColor(assessmentResult.urgencyLevel) }}>
                      {assessmentResult.urgencyLevel.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="assessment-content">
                <div className="assessment-section-item">
                  <h3>
                    <FileText size={20} />
                    Summary
                  </h3>
                  <p>{assessmentResult.summary}</p>
                </div>

                {assessmentResult.recommendations.length > 0 && (
                  <div className="assessment-section-item">
                    <h3>
                      <CheckCircle size={20} />
                      Recommendations
                    </h3>
                    <ul>
                      {assessmentResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {assessmentResult.redFlags.length > 0 && (
                  <div className="assessment-section-item warning">
                    <h3>
                      <AlertTriangle size={20} />
                      Watch For These Warning Signs
                    </h3>
                    <ul>
                      {assessmentResult.redFlags.map((flag, index) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="assessment-section-item">
                  <h3>
                    <Activity size={20} />
                    Next Steps
                  </h3>
                  <ul>
                    {assessmentResult.nextSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>

                {assessmentResult.facilityRecommendation && (
                  <div className="facility-recommendation">
                    <MapPin size={28} />
                    <div>
                      <h4>Healthcare Facility Recommended</h4>
                      <p>Consider visiting a healthcare facility for professional evaluation and proper diagnosis.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="assessment-actions">
                <button 
                  className="action-btn primary"
                  onClick={handleViewFacilities}
                >
                  <MapPin size={18} />
                  Find Healthcare Facilities
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={handleRestartSymptomCheck}
                >
                  <Bot size={18} />
                  Start New Assessment
                </button>
              </div>

              <div className="final-disclaimer">
                <Info size={20} />
                <p>
                  <strong>Remember:</strong> This assessment is for informational purposes only. 
                  Always consult with qualified healthcare professionals for medical advice, 
                  diagnosis, and treatment. This AI tool cannot replace professional medical expertise.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

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
                Your trusted companion for healthcare navigation and emergency preparedness.
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
                  <li><button onClick={() => router.push('/health-history')} className="dashboard-footer-link">Health History</button></li>
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