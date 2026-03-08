// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'stroke', 'difficulty breathing', 'severe bleeding',
  'unconscious', 'severe allergic reaction', 'poisoning', 'severe head injury',
  'severe burns', 'choking', 'severe abdominal pain', 'seizure'
];

function containsEmergencySymptoms(text: string): boolean {
  const lowerText = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function getBasicSymptomGuidance(userMessage: string): string {
  const message = userMessage.toLowerCase();

  const emergencySymptoms = [
    'chest pain', 'heart attack', 'stroke', 'difficulty breathing', 'severe bleeding',
    'unconscious', 'severe allergic reaction', 'choking', 'severe head injury'
  ];

  if (emergencySymptoms.some(symptom => message.includes(symptom))) {
    return `🚨 EMERGENCY SYMPTOMS DETECTED 🚨\n\nSEEK IMMEDIATE MEDICAL ATTENTION:\n• Call emergency services immediately (193)\n• Go to the nearest hospital emergency room\n• Do not delay seeking professional medical care`;
  }

  if (message.includes('fever') || message.includes('temperature')) {
    return `Fever Guidance:\n\nWhen to seek care immediately:\n• Temperature over 39.4°C\n• Fever with severe headache, stiff neck, or rash\n• Difficulty breathing\n\nGeneral care:\n• Rest and stay hydrated\n• Monitor temperature regularly\n• Seek medical attention if fever persists`;
  }

  if (message.includes('headache') || message.includes('head pain')) {
    return `Headache Guidance:\n\nSeek immediate care if you have:\n• Sudden severe headache unlike any before\n• Headache with fever, stiff neck, or vision changes\n• Headache after head injury\n\nGeneral guidance:\n• Rest in a quiet, dark room\n• Stay hydrated\n• Consult a healthcare provider if headaches are frequent or severe`;
  }

  return `General Health Guidance:\n\nSeek immediate medical care for:\n• Severe or worsening symptoms\n• High fever, severe pain, or difficulty breathing\n\nFor non-emergency symptoms:\n• Monitor your symptoms carefully\n• Rest and stay hydrated\n• Contact your healthcare provider\n\nRemember: Always consult qualified healthcare professionals for proper medical advice.`;
}

// ── Parse and strip the <risk> tag Gemini embeds in every reply ──────────────
function extractRisk(text: string): { message: string; riskLevel: string } {
  const match = text.match(/<risk>(low|moderate|high|emergency)<\/risk>/i);
  const riskLevel = match?.[1]?.toLowerCase() ?? 'low';
  const message = text.replace(/<risk>(low|moderate|high|emergency)<\/risk>/gi, '').trim();
  return { message, riskLevel };
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

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const userMessage = messages[messages.length - 1];
    if (userMessage?.role === 'user' && containsEmergencySymptoms(userMessage.content)) {
      return NextResponse.json({
        message: `🚨 EMERGENCY SYMPTOMS DETECTED 🚨\n\nI notice you may be describing symptoms that could be a medical emergency. Please:\n\nSEEK IMMEDIATE MEDICAL ATTENTION\n• Call emergency services (193)\n• Go to the nearest hospital emergency room\n• Do not delay seeking professional medical care\n\nThis is not a medical diagnosis, but these symptoms require immediate professional evaluation.`,
        riskLevel: 'emergency',
        emergencyDetected: true
      });
    }

    const systemPrompt = `You are an intelligent medical information assistant for HealthConnect Navigator in Ghana. Your role is to have helpful, informative conversations about health symptoms while maintaining safety.

Your Approach:
1. Be Conversational & Helpful: Engage naturally, ask relevant questions, and provide useful health information
2. Educate, Don't Diagnose: Share information about possible conditions and common causes WITHOUT making definitive diagnoses
3. Ask Clarifying Questions: Gather details about symptoms (when started, severity, other symptoms, medical history)
4. Provide Context: Explain what symptoms might indicate, common vs. serious causes, and self-care options
5. Only Flag TRUE Emergencies: Reserve urgent care recommendations for genuinely life-threatening situations

Emergency Symptoms (ONLY these require immediate care direction):
- Severe chest pain with shortness of breath, sweating, or radiating pain
- Sudden severe headache (worst of life) with confusion or vision loss
- Difficulty breathing at rest or turning blue
- Uncontrolled bleeding that won't stop
- Signs of stroke: sudden face drooping, arm weakness, slurred speech
- Loss of consciousness or severe confusion
- Severe allergic reaction with throat swelling
- Severe abdominal pain with fever and vomiting

For NON-Emergency Symptoms:
- Discuss possible common causes
- Explain what to watch for
- Suggest general self-care when appropriate
- Ask about associated symptoms to better understand the situation
- Provide information about when medical attention is typically recommended

Communication Style:
- Be warm, empathetic, and conversational
- NEVER use ** bold markers, # headers, or markdown formatting
- For bullet lists use ONLY the • character
- Keep responses concise — under 180 words
- Ask ONE clarifying question at a time
- Avoid repeating "see a doctor" after every response

RISK LEVEL TAGGING — REQUIRED IN EVERY RESPONSE:
At the very end of your response, on its own line, append exactly one risk tag:
<risk>low</risk>

Choose the level based on what the user has described so far:
- low: mild or common symptoms (minor headache, mild cold, slight nausea, fatigue, minor ache)
- moderate: symptoms needing medical attention within 24-48 hours (persistent fever >38°C, worsening pain, multiple concurrent symptoms)
- high: serious symptoms needing same-day care (high fever >39°C, severe pain rating 7+/10, significant breathing difficulty)
- emergency: life-threatening (chest pain with sweating, stroke signs, uncontrolled bleeding, unconsciousness)

This tag is stripped before the user sees it. It must always be present.`;

    let conversationText = systemPrompt + '\n\nConversation:\n';
    for (const msg of messages) {
      if (msg.role === 'user') {
        conversationText += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationText += `Assistant: ${msg.content}\n`;
      }
    }
    conversationText += 'Assistant:';

    const model = genAI.getGenerativeModel({
      model: 'models/gemini-2.5-flash',
      generationConfig: {
        temperature: Math.max(0.1, Math.min(temperature, 0.5)),
        maxOutputTokens: Math.min(max_tokens, 800),
        topP: 0.8,
        topK: 40,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT,         threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    const result = await model.generateContent(conversationText);
    const response = await result.response;
    const rawText = response.text();

    // Strip <risk> tag from message, extract level
    const { message: aiMessage, riskLevel } = extractRisk(rawText);

    // Add subtle disclaimer only when no healthcare mention exists
    let finalMessage = aiMessage;
    if (
      !finalMessage.toLowerCase().includes('medical professional') &&
      !finalMessage.toLowerCase().includes('healthcare') &&
      !finalMessage.toLowerCase().includes('doctor') &&
      finalMessage.length > 200
    ) {
      finalMessage += '\n\n💡 Note: This is general health information. Consider consulting a healthcare provider if symptoms persist or worsen.';
    }

    if (
      finalMessage.toLowerCase().includes('facility') ||
      finalMessage.toLowerCase().includes('hospital') ||
      finalMessage.toLowerCase().includes('seek care')
    ) {
      finalMessage += '\n\n🏥 Find Healthcare Facilities: Use our facility finder to locate hospitals, clinics, and pharmacies near you.';
    }

    console.log(`AI Symptom Checker — Gemini response at ${new Date().toISOString()} | risk: ${riskLevel}`);

    return NextResponse.json({ message: finalMessage, riskLevel, model: 'gemini-2.5-flash' });

  } catch (error: any) {
    console.error('Gemini API Error:', error);

    if (error?.status === 429 || error?.message?.includes('quota')) {
      return NextResponse.json({
        message: `I apologize, but the AI service is temporarily unavailable due to usage limits.\n\nFor your health and safety, please:\n\n🏥 Immediate Care Needed?\n• Call emergency services (193) for severe symptoms\n• Visit your nearest hospital or clinic\n• Contact your healthcare provider directly\n\nThis AI service will be restored once usage limits are renewed.`,
        riskLevel: 'low',
        error: 'quota_exceeded',
        fallback: true
      }, { status: 503 });
    }

    if (error?.status === 400 && error?.message?.includes('SAFETY')) {
      return NextResponse.json({
        message: `For your safety, I cannot provide specific guidance on the symptoms you've described.\n\nPlease seek immediate medical attention:\n• Contact your healthcare provider\n• Visit your nearest clinic or hospital\n• Call emergency services if symptoms are severe`,
        riskLevel: 'high',
        error: 'safety_filter',
        fallback: true
      }, { status: 400 });
    }

    if (error?.status === 404) {
      return NextResponse.json({
        message: `I apologize, but the AI service is temporarily unavailable.\n\nFor your health and safety, please visit your nearest hospital or clinic, or call emergency services (193) if symptoms are severe.`,
        riskLevel: 'low',
        error: 'model_not_found',
        fallback: true
      }, { status: 503 });
    }

    return NextResponse.json({
      message: getBasicSymptomGuidance(messages.length > 0 ? messages[messages.length - 1]?.content || '' : ''),
      riskLevel: 'low',
      error: 'service_unavailable',
      fallback: true
    }, { status: 500 });
  }
}

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