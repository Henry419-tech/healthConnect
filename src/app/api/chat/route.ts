// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
  let max_tokens = 1024;

  try {
    const requestData = await request.json();
    messages = requestData.messages;
    temperature = requestData.temperature || 0.3;
    max_tokens = requestData.max_tokens || 1024;
    const sessionId: string | null = requestData.sessionId || null;
    const isAssessment: boolean = requestData.isAssessment === true;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Resolve the logged-in user (optional — gracefully skip DB save if not authed)
    const authSession = await getServerSession(authOptions);
    const dbUser = authSession?.user?.email
      ? await prisma.user.findUnique({ where: { email: authSession.user.email } })
      : null;

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

    // Trim history to last 12 messages, always skipping the opening welcome message
    // (it's long, adds no diagnostic value, and wastes input tokens)
    const MAX_HISTORY = 12;
    const conversationMsgs = messages.filter(m =>
      // Drop the assistant welcome message — identified by containing the greeting phrase
      !(m.role === 'assistant' && m.content.includes("I'm your AI health assistant"))
    );
    const trimmedMessages = conversationMsgs.length > MAX_HISTORY
      ? conversationMsgs.slice(-MAX_HISTORY)
      : conversationMsgs;

    let conversationText = systemPrompt + '\n\nConversation:\n';
    for (const msg of trimmedMessages) {
      if (msg.role === 'user') {
        conversationText += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationText += `Assistant: ${msg.content}\n`;
      }
    }
    conversationText += 'Assistant:';

    // Fallback chain — only current non-retired models (1.5 series is retired)
    const MODELS = [
      'models/gemini-2.5-flash',      // primary — best quality
      'models/gemini-2.0-flash',      // fallback — current stable
      'models/gemini-2.0-flash-lite', // lighter fallback — higher quota
    ];
    const generationConfig = {
      temperature: Math.max(0.1, Math.min(temperature, 0.5)),
      maxOutputTokens: 2048,
      topP: 0.8,
      topK: 40,
    };
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT,         threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    let rawText = '';
    let usedModel = MODELS[0];
    let lastErr: any = null;

    for (const modelName of MODELS) {
      // Each model gets up to 2 attempts (handles transient network blips)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName, generationConfig, safetySettings });
          const result = await model.generateContent(conversationText);
          rawText = result.response.text();
          usedModel = modelName;
          lastErr = null;
          break; // success
        } catch (modelErr: any) {
          lastErr = modelErr;
          const msg = modelErr?.message || '';
          const isQuota    = modelErr?.status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
          const isNetwork  = msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('network') || msg.includes('ETIMEDOUT');
          const isNotFound = modelErr?.status === 404 || msg.includes('not found') || msg.includes('is not found');
          const shouldTryNext = isQuota || isNetwork || isNotFound;

          if (isNetwork && attempt === 0) {
            // Brief pause then retry same model once
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          if (shouldTryNext && modelName !== MODELS[MODELS.length - 1]) {
            console.warn(`[chat] ${modelName} failed (${isQuota ? 'quota' : isNotFound ? 'not found' : 'network'}), trying next model`);
            break; // move to next model
          }
          if (attempt === 0 && !shouldTryNext) {
            // Unknown error — retry once
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          break; // give up on this model
        }
      }
      if (!lastErr) break; // success — exit model loop
    }

    // All models failed
    if (lastErr) throw lastErr;

    // Strip <risk> tag from message, extract level
    const { message: aiMessage, riskLevel } = extractRisk(rawText);

    console.log(`[chat] ${usedModel} | risk: ${riskLevel} | ${new Date().toISOString()}`);

    // For assessment calls return raw JSON immediately — no disclaimers, no DB save
    if (isAssessment) {
      return NextResponse.json({ message: aiMessage, riskLevel });
    }

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

    // ── Persist to DB if user is logged in ──────────────────────
    let activeSessionId = sessionId;
    if (dbUser) {
      try {
        const latestUserMessage = messages[messages.length - 1];
        const userContent = latestUserMessage?.content || '';

        if (!activeSessionId) {
          // ── NEW SESSION ───────────────────────────────────────
          // Auto-title: first 60 chars of the user's opening message
          const title = userContent.length > 60
            ? userContent.slice(0, 57) + '…'
            : userContent || 'New Conversation';

          // FIX: seed messageCount with the full history length so the
          // count shown in the sidebar matches reality from the start.
          const newSession = await prisma.chatSession.create({
            data: {
              userId:       dbUser.id,
              title,
              riskLevel,
              messageCount: messages.length, // ← seed with actual history count
            },
          });
          activeSessionId = newSession.id;

          // Save the full history into the new session
          await prisma.chatMessage.createMany({
            data: messages.map((m: any) => ({
              sessionId: activeSessionId!,
              role:      m.role,
              content:   m.content,
              riskLevel: m.role === 'assistant' ? (m.riskLevel || null) : null,
            })),
          });
        } else {
          // ── EXISTING SESSION ──────────────────────────────────
          // FIX: save the user's current message — previously this was
          // skipped, so only the first session creation ever wrote user
          // messages. All turns after that were lost from the DB.
          await prisma.chatMessage.create({
            data: {
              sessionId: activeSessionId,
              role:      'user',
              content:   userContent,
              riskLevel: null,
            },
          });
        }

        // Always save the latest assistant reply
        await prisma.chatMessage.create({
          data: {
            sessionId: activeSessionId,
            role:      'assistant',
            content:   finalMessage,
            riskLevel,
          },
        });

        // Update session metadata — increment by 2 (user + assistant)
        await prisma.chatSession.update({
          where: { id: activeSessionId },
          data: {
            riskLevel,
            messageCount: { increment: 2 },
            updatedAt:    new Date(),
          },
        });
      } catch (dbErr) {
        // Never let a DB error break the chat response
        console.error('Chat DB save error:', dbErr);
      }
    }
    // ────────────────────────────────────────────────────────────

    return NextResponse.json({
      message:   finalMessage,
      riskLevel,
      model:     usedModel,
      sessionId: activeSessionId,
    });

  } catch (error: any) {
    console.error('Gemini API Error:', error?.message || error);

    const msg = error?.message || '';
    const isNetwork = msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('network');

    if (isNetwork) {
      return NextResponse.json({
        message: `I'm having trouble connecting to the AI service right now. Please try again in a moment.\n\nIf symptoms are urgent:\n• Call emergency services (193)\n• Visit your nearest clinic or hospital`,
        riskLevel: 'low',
        error:     'network_error',
        fallback:  true
      }, { status: 503 });
    }

    if (error?.status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({
        message: `The AI service is temporarily busy. Please try again in a few minutes.\n\nIf symptoms are urgent:\n• Call emergency services (193)\n• Visit your nearest clinic or hospital`,
        riskLevel: 'low',
        error:     'quota_exceeded',
        fallback:  true
      }, { status: 503 });
    }

    if (error?.status === 400 && error?.message?.includes('SAFETY')) {
      return NextResponse.json({
        message: `For your safety, I cannot provide specific guidance on the symptoms you've described.\n\nPlease seek immediate medical attention:\n• Contact your healthcare provider\n• Visit your nearest clinic or hospital\n• Call emergency services if symptoms are severe`,
        riskLevel: 'high',
        error:     'safety_filter',
        fallback:  true
      }, { status: 400 });
    }

    if (error?.status === 404) {
      return NextResponse.json({
        message: `I apologize, but the AI service is temporarily unavailable.\n\nFor your health and safety, please visit your nearest hospital or clinic, or call emergency services (193) if symptoms are severe.`,
        riskLevel: 'low',
        error:     'model_not_found',
        fallback:  true
      }, { status: 503 });
    }

    return NextResponse.json({
      message:   getBasicSymptomGuidance(messages.length > 0 ? messages[messages.length - 1]?.content || '' : ''),
      riskLevel: 'low',
      error:     'service_unavailable',
      fallback:  true
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
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}