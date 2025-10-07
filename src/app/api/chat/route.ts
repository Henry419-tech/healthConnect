// app/api/chat/route.ts - Fixed Version

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Medical safety keywords that require emergency response
const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'stroke', 'difficulty breathing', 'severe bleeding',
  'unconscious', 'severe allergic reaction', 'poisoning', 'severe head injury',
  'severe burns', 'choking', 'severe abdominal pain', 'seizure'
];

// Function to check for emergency symptoms
function containsEmergencySymptoms(text: string): boolean {
  const lowerText = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Basic offline symptom guidance when AI is unavailable
function getBasicSymptomGuidance(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // Emergency symptoms
  const emergencySymptoms = [
    'chest pain', 'heart attack', 'stroke', 'difficulty breathing', 'severe bleeding',
    'unconscious', 'severe allergic reaction', 'choking', 'severe head injury'
  ];
  
  if (emergencySymptoms.some(symptom => message.includes(symptom))) {
    return `🚨 **EMERGENCY SYMPTOMS DETECTED** 🚨

**SEEK IMMEDIATE MEDICAL ATTENTION:**
- Call emergency services immediately (911 or your local emergency number)
- Go to the nearest hospital emergency room
- Do not delay seeking professional medical care

This appears to be a medical emergency that requires immediate professional attention.`;
  }
  
  // Common symptoms guidance
  if (message.includes('fever') || message.includes('temperature')) {
    return `**Fever Guidance:**

**When to seek care immediately:**
- Temperature over 103°F (39.4°C)
- Fever with severe headache, stiff neck, or rash
- Difficulty breathing
- Severe dehydration

**General care (consult healthcare provider):**
- Rest and stay hydrated
- Consider fever-reducing medication as appropriate
- Monitor temperature regularly
- Seek medical attention if fever persists or worsens

**Important:** Fever can indicate various infections or conditions. Consider visiting a healthcare facility for proper testing and diagnosis.`;
  }
  
  if (message.includes('headache') || message.includes('head pain')) {
    return `**Headache Guidance:**

**Seek immediate care if you have:**
- Sudden severe headache unlike any before
- Headache with fever, stiff neck, rash, or vision changes
- Headache after head injury
- Headache with weakness or numbness

**General guidance:**
- Rest in a quiet, dark room
- Stay hydrated
- Consider appropriate pain relief
- Track patterns and triggers

**Consult a healthcare provider** if headaches are frequent, severe, or interfering with daily activities.`;
  }
  
  if (message.includes('cough') || message.includes('coughing')) {
    return `**Cough Guidance:**

**Seek immediate care for:**
- Severe difficulty breathing
- Coughing up blood
- High fever with severe cough
- Signs of severe respiratory distress

**General guidance:**
- Stay hydrated
- Rest and avoid irritants
- Consider honey for throat soothing
- Monitor for worsening symptoms

**Consult healthcare provider** if cough persists over 2 weeks, produces blood, or is accompanied by high fever.`;
  }
  
  // General guidance
  return `**General Health Guidance:**

Since our AI assistant is temporarily unavailable, here's general advice:

**Seek immediate medical care for:**
- Severe or worsening symptoms
- High fever, severe pain, or difficulty breathing
- Any symptoms that concern you significantly

**For non-emergency symptoms:**
- Monitor your symptoms carefully
- Rest and stay hydrated
- Contact your healthcare provider
- Visit a local clinic or hospital

**Remember:** This is general information only. Always consult qualified healthcare professionals for proper medical advice, diagnosis, and treatment.

**Use our Healthcare Facility Finder** to locate medical care near you.`;
}

export async function POST(request: NextRequest) {
  let messages: any[] = [];
  let temperature = 0.3;
  let max_tokens = 500;

  try {
    const requestData = await request.json();
    messages = requestData.messages;
    temperature = requestData.temperature || 0.3;
    max_tokens = requestData.max_tokens || 500;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    // Check for emergency symptoms in user messages
    const userMessage = messages[messages.length - 1];
    if (userMessage?.role === 'user' && containsEmergencySymptoms(userMessage.content)) {
      return NextResponse.json({
        message: `🚨 **EMERGENCY SYMPTOMS DETECTED** 🚨

I notice you may be describing symptoms that could be a medical emergency. Please:

**SEEK IMMEDIATE MEDICAL ATTENTION**
- Call emergency services (911 or your local emergency number)
- Go to the nearest hospital emergency room
- Do not delay seeking professional medical care

While waiting for help:
- Stay calm and keep someone with you if possible
- Follow any first aid you know is appropriate
- Have your medical information ready

**This is not a medical diagnosis, but these symptoms require immediate professional evaluation.**

Would you like me to help you find the nearest healthcare facilities instead?`,
        emergencyDetected: true
      });
    }

    // Build conversation for Gemini
    let conversationText = '';
    
    // System prompt
    const systemPrompt = `You are an intelligent medical information assistant for HealthConnect Navigator. Your role is to have helpful, informative conversations about health symptoms while maintaining safety.

**Your Approach:**
1. **Be Conversational & Helpful**: Engage naturally, ask relevant questions, and provide useful health information
2. **Educate, Don't Diagnose**: Share information about possible conditions, common causes, and general health knowledge WITHOUT making definitive diagnoses
3. **Ask Clarifying Questions**: Gather details about symptoms (when started, severity, other symptoms, medical history)
4. **Provide Context**: Explain what symptoms might indicate, common vs. serious causes, and self-care options
5. **Only Flag TRUE Emergencies**: Reserve urgent care recommendations for genuinely life-threatening situations

**Emergency Symptoms (ONLY these require immediate care direction):**
- Severe chest pain with shortness of breath, sweating, or radiating pain
- Sudden severe headache (worst of life) with confusion or vision loss
- Difficulty breathing at rest or turning blue
- Uncontrolled bleeding that won't stop
- Signs of stroke: sudden face drooping, arm weakness, slurred speech
- Loss of consciousness or severe confusion
- Severe allergic reaction with throat swelling
- Severe abdominal pain with fever and vomiting

**For NON-Emergency Symptoms:**
- Discuss possible common causes (e.g., "Headaches can be caused by tension, dehydration, sinus issues, etc.")
- Explain what to watch for ("If the pain becomes severe or you develop fever, that would be more concerning")
- Suggest general self-care when appropriate ("For mild headaches, rest, hydration, and pain relievers often help")
- Ask about associated symptoms to better understand the situation
- Provide information about when medical attention is typically recommended
- Share health education relevant to their concern

**Communication Style:**
- Be warm, empathetic, and conversational
- Avoid repeating "see a doctor" after every response
- Provide actual useful information and context
- Use disclaimers naturally, not robotically
- Balance safety with being genuinely helpful

**What You CAN Do:**
✅ Explain what symptoms might indicate
✅ Discuss common conditions associated with symptoms
✅ Suggest when medical evaluation is advisable vs. urgent
✅ Provide health education and context
✅ Ask diagnostic-style questions to understand better
✅ Suggest appropriate self-care for minor issues
✅ Explain warning signs to watch for

**What You CANNOT Do:**
❌ Make definitive diagnoses ("You have X condition")
❌ Prescribe medications or specific treatments
❌ Replace professional medical evaluation
❌ Ignore genuine emergency symptoms

**Example Good Response:**
"A persistent cough for 3 days could be due to several things - viral infections like colds or flu are most common, but it could also be from post-nasal drip, allergies, or irritation. Can you tell me: Is the cough dry or producing mucus? Do you have fever, and if so, how high? Any other symptoms like body aches or congestion? This will help me understand what might be going on."

**Example Bad Response:**
"You should see a healthcare professional immediately."

Remember: Your goal is to be HELPFUL and INFORMATIVE while maintaining appropriate safety boundaries. Users should feel like they had a valuable conversation, not just a liability disclaimer.`;

    // Build conversation history
    conversationText = systemPrompt + '\n\nConversation:\n';
    for (const msg of messages) {
      if (msg.role === 'user') {
        conversationText += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationText += `Assistant: ${msg.content}\n`;
      }
    }

    // Get Gemini model with updated model name
    const model = genAI.getGenerativeModel({ 
      model: "models/gemini-2.5-flash",
      generationConfig: {
        temperature: Math.max(0.1, Math.min(temperature, 0.5)),
        maxOutputTokens: Math.min(max_tokens, 800),
        topP: 0.8,
        topK: 40,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Generate response
    const result = await model.generateContent(conversationText);
    const response = await result.response;
    let aiMessage = response.text();

    // Post-process the response for additional safety
    if (!aiMessage.toLowerCase().includes('medical professional') && 
        !aiMessage.toLowerCase().includes('healthcare') &&
        !aiMessage.toLowerCase().includes('doctor') &&
        aiMessage.length > 200) {
      aiMessage += '\n\n💡 **Note:** This is general health information. Consider consulting a healthcare provider if symptoms persist or worsen.';
    }

    // Add healthcare facility resources if relevant
    if (aiMessage.toLowerCase().includes('facility') || 
        aiMessage.toLowerCase().includes('hospital') ||
        aiMessage.toLowerCase().includes('seek care')) {
      aiMessage += '\n\n🏥 **Find Healthcare Facilities:** Use our facility finder to locate hospitals, clinics, and pharmacies near you.';
    }

    console.log(`AI Symptom Checker - User query handled with Gemini at ${new Date().toISOString()}`);

    return NextResponse.json({
      message: aiMessage,
      model: 'gemini-2.5-flash'
    });

  } catch (error: any) {
    console.error('Gemini API Error:', error);

    // Handle different types of errors
    if (error?.status === 429 || error?.message?.includes('quota')) {
      return NextResponse.json({
        message: `I apologize, but the AI service is temporarily unavailable due to usage limits.

**For your health and safety, please:**

🏥 **Immediate Care Needed?**
- Call emergency services (911) for severe symptoms
- Visit your nearest hospital or clinic
- Contact your healthcare provider directly

🔍 **Continue Getting Help:**
- Use our Healthcare Facility Finder to locate nearby medical care
- Contact local hospitals or clinics directly
- Consider telehealth services available in your area

This AI service will be restored once usage limits are renewed.`,
        error: 'quota_exceeded',
        fallback: true
      }, { status: 503 });
    }

    if (error?.status === 400 && error?.message?.includes('SAFETY')) {
      return NextResponse.json({
        message: `For your safety, I cannot provide specific guidance on the symptoms you've described. 

**Please seek immediate medical attention:**
- Contact your healthcare provider
- Visit your nearest clinic or hospital
- Call emergency services if symptoms are severe

**Remember:** Professional medical evaluation is always the safest approach when you have health concerns.`,
        error: 'safety_filter',
        fallback: true
      }, { status: 400 });
    }

    // Handle model not found error specifically
    if (error?.status === 404) {
      console.error('Model not found. Please check if gemini-pro is available in your region.');
      return NextResponse.json({
        message: `I apologize, but the AI service is temporarily unavailable.

**For your health and safety, please:**

🏥 **Immediate Care Needed?**
- Call emergency services (911) for severe symptoms
- Visit your nearest hospital or clinic
- Contact your healthcare provider directly

🔍 **Continue Getting Help:**
- Use our Healthcare Facility Finder to locate nearby medical care
- Contact local hospitals or clinics directly

Please try again later or contact support if the issue persists.`,
        error: 'model_not_found',
        fallback: true
      }, { status: 503 });
    }

    // Generic error response with offline guidance
    return NextResponse.json({
      message: getBasicSymptomGuidance(messages.length > 0 ? messages[messages.length - 1]?.content || '' : ''),
      error: 'service_unavailable',
      fallback: true
    }, { status: 500 });
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { message: 'AI Symptom Checker API is running. Use POST to send messages.' },
    { status: 200 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}