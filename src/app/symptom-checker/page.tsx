'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDarkMode } from '@/contexts/DarkModeContext';
import DashboardLayout from '@/components/DashboardLayout';
import { trackActivity, activityTypes } from '@/lib/activityTracker';
import { useFacilitySearch } from '@/hooks/useFacilitySearch';
import '@/styles/dashboard-header.css';
import '@/styles/dashboard.css';
import '@/styles/dashboard-mobile.css';
import '@/styles/symptom-checker.css';
import '@/styles/symptom-checker-mobile.css';
import {
  Bot, AlertTriangle, CheckCircle, Clock, Thermometer, Heart,
  Brain, Activity, Phone, MapPin, ChevronRight, X, Shield,
  User, Loader2, FileText, Send, MessageSquare, Zap,
  Navigation, Crosshair, Search, Bell, AlertCircle,
  RefreshCw, Plus, Stethoscope, TrendingUp, Sun, Moon,
  Pill, Hospital, Star, Printer,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type UrgencyLevel = 'low' | 'moderate' | 'high' | 'emergency';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AssessmentResult {
  urgencyLevel: UrgencyLevel;
  summary: string;
  recommendations: string[];
  redFlags: string[];
  nextSteps: string[];
  facilityRecommendation: boolean;
}

interface NearbyFacility {
  id: string;
  name: string;
  type: string;
  distance: number;
  rating: number;
  hours: string;
  emergencyServices: boolean;
  city?: string;
  phone?: string;
  coordinates?: [number, number];
}

// ─── Risk keywords ────────────────────────────────────────────────────────────
const RISK_KW: Record<UrgencyLevel, string[]> = {
  emergency: [
    'chest pain', 'heart attack', 'stroke', 'not breathing', "can't breathe",
    'unconscious', 'severe bleeding', 'choking', 'collapsed', 'seizure',
    'overdose', 'poisoning', 'severe allergic', 'anaphylaxis',
  ],
  high: [
    'high fever', 'difficulty breathing', 'shortness of breath', 'sharp pain',
    'vomiting blood', 'severe headache', 'vision loss', 'numbness', 'paralysis',
    'confusion', 'chest tightness', 'rapid heartbeat', 'fainting', 'coughing blood',
  ],
  moderate: [
    'fever', 'chest', 'breathing', 'dizziness', 'nausea', 'vomiting',
    'abdominal pain', 'stomach pain', 'back pain', 'throat', 'infection',
    'rash', 'swelling', 'joint pain', 'migraine', 'weakness',
  ],
  low: [],
};

function computeRisk(msgs: ChatMessage[]): UrgencyLevel {
  const t = msgs.map(m => m.content).join(' ').toLowerCase();
  for (const kw of RISK_KW.emergency) if (t.includes(kw)) return 'emergency';
  for (const kw of RISK_KW.high)      if (t.includes(kw)) return 'high';
  for (const kw of RISK_KW.moderate)  if (t.includes(kw)) return 'moderate';
  return 'low';
}

// ─── Portal ───────────────────────────────────────────────────────────────────
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = [];
  let nums: React.ReactNode[] = [];
  let k = 0;

  const flushB = () => {
    if (bullets.length) { nodes.push(<ul key={k++} className="sc-md-ul">{bullets}</ul>); bullets = []; }
  };
  const flushN = () => {
    if (nums.length) { nodes.push(<ol key={k++} className="sc-md-ol">{nums}</ol>); nums = []; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\d+[.)]\s+/.test(line)) {
      flushB();
      nums.push(<li key={k++} className="sc-md-li">{fmt(line.replace(/^\d+[.)]\s+/, ''))}</li>);
      continue;
    }
    if (/^[•*\-]\s+/.test(line)) {
      flushN();
      bullets.push(<li key={k++} className="sc-md-li">{fmt(line.replace(/^[•*\-]\s+/, ''))}</li>);
      continue;
    }
    flushB(); flushN();
    if (/^\*\*[^*]+:?\*\*$/.test(line) || /^\*\*[^*]+\*\*:$/.test(line)) {
      nodes.push(<p key={k++} className="sc-md-heading">{line.replace(/\*\*/g, '').replace(/:$/, '')}</p>);
      continue;
    }
    nodes.push(<p key={k++} className="sc-md-p">{fmt(line)}</p>);
  }
  flushB(); flushN();
  return nodes;
}

function fmt(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={m.index}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// ─── Open/closed status using real hours string ───────────────────────────────
function facStatus(f: NearbyFacility): { label: string; isOpen: boolean } {
  if (f.emergencyServices) return { label: 'Open 24/7', isOpen: true };
  const h = f.hours?.toLowerCase() ?? '';
  if (h === '24/7' || h === 'always') return { label: 'Open 24/7', isOpen: true };
  if (!h || h === 'call for hours' || h === 'not available') return { label: 'Hours unknown', isOpen: false };
  // Parse "Mo-Fr 08:00-17:00" style
  const now = new Date();
  const dayIdx = now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1; // Mon=0..Sun=6
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const DAY: Record<string, number> = { mo: 0, tu: 1, we: 2, th: 3, fr: 4, sa: 5, su: 6 };
  const toMin = (t: string) => { const [hh, mm] = t.split(':').map(Number); return hh * 60 + (mm || 0); };
  for (const rule of h.split(';').map(r => r.trim())) {
    const dayTime = /^([a-z,\-\s]+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(rule);
    if (dayTime) {
      const seg = dayTime[1].trim();
      const dash = seg.indexOf('-');
      let days: number[] = [];
      if (dash > 0) {
        const s = DAY[seg.slice(0, dash).trim()], e = DAY[seg.slice(dash + 1).trim()];
        if (s != null && e != null) for (let d = s; ; d = (d + 1) % 7) { days.push(d); if (d === e) break; }
      } else { const d = DAY[seg]; if (d != null) days = [d]; }
      if (!days.includes(dayIdx)) continue;
      return mins >= toMin(dayTime[2]) && mins < toMin(dayTime[3])
        ? { label: 'Open Now', isOpen: true }
        : { label: 'Closed', isOpen: false };
    }
    const timeOnly = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(rule);
    if (timeOnly) {
      return mins >= toMin(timeOnly[1]) && mins < toMin(timeOnly[2])
        ? { label: 'Open Now', isOpen: true }
        : { label: 'Closed', isOpen: false };
    }
  }
  return { label: 'Hours unknown', isOpen: false };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SymptomChecker() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // ── UI state ─────────────────────────────────────────────────
  const [step,          setStep]          = useState<'chat' | 'assessment'>('chat');
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [messages,      setMessages]      = useState<ChatMessage[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [inputVal,      setInputVal]      = useState('');
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [assessment,    setAssessment]    = useState<AssessmentResult | null>(null);
  const [liveRisk,      setLiveRisk]      = useState<UrgencyLevel>('low');
  const [showEmergency, setShowEmergency] = useState(false);
  const [showWelcome,   setShowWelcome]   = useState(true);
  const [canAssess,     setCanAssess]     = useState(false);
  const [rightOpen,     setRightOpen]     = useState(false);
  const [mobPanelOpen,  setMobPanelOpen]  = useState(false);
  const [inputFocused,  setInputFocused]  = useState(false);

  // ── Facility state ───────────────────────────────────────────
  const [nearby,             setNearby]             = useState<NearbyFacility[]>([]);
  const [loadingFac,         setLoadingFac]         = useState(false);
  const [facError,           setFacError]           = useState<string | null>(null);
  const [userLoc,            setUserLoc]            = useState<[number, number] | null>(null);
  const [loadingLoc,         setLoadingLoc]         = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');

  // ── Session history ──────────────────────────────────────────
  const [sessionHistory, setSessionHistory] = useState<{
    date: string; title: string; badge: string; sub: string; id?: string; status?: string;
  }[]>([]);

  // ── Notification panel ───────────────────────────────────────
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifsRead,     setNotifsRead]     = useState(false);
  const notifBellRef  = useRef<HTMLButtonElement>(null);
  const notifMobRef   = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  // ── Processing timeout guard ─────────────────────────────────
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Refs ─────────────────────────────────────────────────────
  const msgEndRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const assessedRef  = useRef(false);

  // ── Top-bar facility search hook ─────────────────────────────
  const {
    searchQuery: facQ, setSearchQuery: setFacQ,
    searchInputRef: facRef, handleSearchSubmit, handleSearchKeyDown,
  } = useFacilitySearch();

  // ── Auth guard ────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  // ── Dark mode sync ────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // ── Auto-scroll ───────────────────────────────────────────────
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // ── Processing timeout — unblock UI after 30s ─────────────────
  useEffect(() => {
    if (isProcessing) {
      processingTimerRef.current = setTimeout(() => {
        setIsProcessing(false);
        setMessages(prev => [
          ...prev,
          {
            id: `timeout-${Date.now()}`,
            role: 'assistant',
            content: "I'm sorry, the request is taking too long. Please check your connection and try again.",
            timestamp: new Date(),
          },
        ]);
      }, 30000);
    } else {
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
        processingTimerRef.current = null;
      }
    }
    return () => {
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    };
  }, [isProcessing]);

  // ── Live risk detector ────────────────────────────────────────
  useEffect(() => {
    if (!messages.length) { setLiveRisk('low'); return; }
    const r = computeRisk(messages);
    setLiveRisk(r);
    if (r === 'emergency') setShowEmergency(true);
    setCanAssess(messages.filter(m => m.role === 'user').length >= 3);
  }, [messages]);

  // ── Fetch facilities via proxy route ──────────────────────────
  const fetchFacilities = useCallback(async () => {
    if (!userLoc) return;
    setLoadingFac(true);
    setFacError(null);
    const [lat, lng] = userLoc;
    try {
      const res = await fetch(
        `/api/facilities/nearby?lat=${lat}&lng=${lng}&radius=5000&limit=4`,
        { method: 'GET' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const list: NearbyFacility[] = (data.facilities || []).map((f: any) => ({
        id:                f.id,
        name:              f.name,
        type:              f.type,
        distance:          f.distance,
        rating:            f.rating,
        phone:             f.phone,
        hours:             f.hours,
        city:              f.city,
        coordinates:       f.coordinates,
        emergencyServices: f.emergencyServices,
      }));
      setNearby(list);
      if (!list.length) setFacError('No facilities found within 5km.');
    } catch (e: any) {
      setFacError(e.message || 'Unable to load facilities.');
    } finally {
      setLoadingFac(false);
    }
  }, [userLoc]);

  useEffect(() => {
    if (userLoc) fetchFacilities();
  }, [userLoc, fetchFacilities]);

  // ── Auto-request location on load ─────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated' || !navigator.geolocation) return;
    navigator.permissions?.query({ name: 'geolocation' }).then(r => {
      setLocationPermission(r.state as 'granted' | 'prompt' | 'denied');
      r.onchange = () => setLocationPermission(r.state as 'granted' | 'prompt' | 'denied');
      if (r.state === 'granted') {
        navigator.geolocation.getCurrentPosition(
          p => setUserLoc([p.coords.latitude, p.coords.longitude]),
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      }
    }).catch(() => {
      setLocationPermission('unknown');
      navigator.geolocation.getCurrentPosition(
        p => setUserLoc([p.coords.latitude, p.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, [status]);

  const getLocation = useCallback(() => {
    setLoadingLoc(true);
    if (!navigator.geolocation) { setLoadingLoc(false); return; }
    navigator.geolocation.getCurrentPosition(
      p => {
        setUserLoc([p.coords.latitude, p.coords.longitude]);
        setLocationPermission('granted');
        setLoadingLoc(false);
      },
      () => setLoadingLoc(false),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  }, []);

  // ── Load session history only — always start fresh on sign-in ──
  // Past sessions are accessible via the sidebar; we never auto-restore
  // because stale medical context from a prior session can mislead the AI.
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/chat-sessions').then(r => r.json()).then(({ sessions }) => {
      if (!sessions?.length) return;
      setSessionHistory((sessions || []).map((s: any) => ({
        date:   new Date(s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        title:  s.title ? (s.title.length > 40 ? s.title.slice(0, 40) + '…' : s.title) : 'Symptom check',
        badge:  s.riskLevel || 'low',
        sub:    `${s.messageCount || 0} messages`,
        id:     s.id,
        status: s.status || 'active',
      })));
      // No auto-restore — user always lands on a fresh chat.
      // History is accessible via the left sidebar / mobile bottom sheet.
    }).catch(() => {});
  }, [status]); // eslint-disable-line

  // ── Welcome message ───────────────────────────────────────────
  useEffect(() => {
    if (!showWelcome && messages.length === 0) {
      const first = session?.user?.name?.split(' ')[0] || 'there';
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        timestamp: new Date(),
        content: `Hi ${first}! I'm your AI health assistant, powered by HealthConnect AI.\n\nDescribe how you're feeling and I'll ask follow-up questions to better understand your situation.\n\nHow I can help:\n• Answer questions about symptoms and common health conditions\n• Provide health education and context\n• Help you understand when to seek medical care\n• Discuss possible causes of your symptoms\n\nImportant:\n• I provide information, not diagnoses\n• For life-threatening emergencies, call 193 immediately\n• Always consult a healthcare professional for medical advice\n\nLet's get started — what symptoms or health concerns are you experiencing today?`,
      }]);
    }
  }, [showWelcome, messages.length, session?.user?.name]);

  // ── Send to AI ────────────────────────────────────────────────
  const sendToAI = useCallback(async (history: ChatMessage[]): Promise<string> => {
    setIsProcessing(true);
    try {
      const payload = {
        messages:    history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        temperature: 0.35,
        max_tokens:  2048,
        sessionId:   chatSessionId,
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res  = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await res.json().catch(() => ({}));
          if (data.message) {
            if (data.sessionId && !chatSessionId) setChatSessionId(data.sessionId);
            if (data.riskLevel && ['low', 'moderate', 'high', 'emergency'].includes(data.riskLevel)) setLiveRisk(data.riskLevel);
            return data.message;
          }
          if (res.status >= 500 && attempt === 0) { await new Promise(r => setTimeout(r, 1500)); continue; }
          return "I'm sorry, I couldn't process that. Please try again.";
        } catch (e: any) {
          if (attempt === 0) { await new Promise(r => setTimeout(r, 1500)); continue; }
        }
      }
      return "I'm having trouble connecting. Please check your internet connection and try again.";
    } finally {
      setIsProcessing(false);
    }
  }, [chatSessionId]);

  // ── Handle send ───────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputVal.trim();
    if (!text || isProcessing) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputVal('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const reply = await sendToAI(updated);
    const withReply: ChatMessage[] = [...updated, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date() }];
    setMessages(withReply);
    if (withReply.filter(m => m.role === 'user').length >= 5 && !assessedRef.current) {
      setTimeout(() => genAssessment(withReply), 800);
    }
  }, [inputVal, isProcessing, messages, sendToAI]); // eslint-disable-line

  // ── Complete session in DB ────────────────────────────────────
  const completeSession = useCallback(async (id: string, risk: string) => {
    try {
      await fetch(`/api/chat-sessions/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'completed', riskLevel: risk }),
      });
      setSessionHistory(prev => prev.map(h => h.id === id ? { ...h, status: 'completed', badge: risk } : h));
    } catch (e) { console.error('Failed to complete session:', e); }
  }, []);

  // ── Generate assessment ───────────────────────────────────────
  const genAssessment = useCallback(async (history: ChatMessage[]) => {
    if (assessedRef.current) return;
    assessedRef.current = true;
    try {
      const summary = history.filter(m => m.role === 'user').map(m => m.content).join('. ');
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: [{
            role:    'user',
            content: `You are a medical assessment assistant. Respond ONLY with a single valid JSON object — no markdown, no code fences, no prose before or after.\n\nBased on this health consultation from a patient in Ghana: "${summary}"\n\nRespond with ONLY this JSON structure:\n{"urgencyLevel":"low","summary":"2-3 sentence summary","recommendations":["rec1","rec2","rec3"],"redFlags":["flag1","flag2"],"nextSteps":["step1","step2","step3"],"facilityRecommendation":false}\nurgencyLevel must be one of: low, moderate, high, emergency`,
          }],
          temperature:  0.1,
          max_tokens:   800,
          isAssessment: true,
        }),
      });
      if (!res.ok) { assessedRef.current = false; return; }
      const data = await res.json();
      const raw   = (data.message || '').trim();
      const start = raw.indexOf('{');
      const end   = raw.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) { assessedRef.current = false; return; }
      const result: AssessmentResult = JSON.parse(raw.slice(start, end + 1));
      setAssessment(result);
      setStep('assessment');
      const safeRisk = result.urgencyLevel === 'emergency' ? 'high' : result.urgencyLevel;
      setSessionHistory(prev => [
        {
          date:   new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          title:  summary.split(' ').slice(0, 6).join(' ') + '…',
          badge:  safeRisk,
          sub:    result.recommendations[0] || 'Assessment completed',
          status: 'completed',
        },
        ...prev,
      ].slice(0, 5));
      trackActivity(activityTypes.SYMPTOM_CHECKED, 'Assessment completed', summary.slice(0, 200), { urgencyLevel: result.urgencyLevel }).catch(() => {});
      if (chatSessionId) completeSession(chatSessionId, safeRisk);
    } catch (e) {
      console.error('Assessment error:', e);
      assessedRef.current = false;
    }
  }, [chatSessionId, completeSession]);

  // ── Start new chat ────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    if (chatSessionId && messages.length > 1) completeSession(chatSessionId, liveRisk);
    assessedRef.current = false;
    setStep('chat');
    setMessages([]);
    setAssessment(null);
    setInputVal('');
    setLiveRisk('low');
    setCanAssess(false);
    setChatSessionId(null);
    setIsViewingHistory(false);
  }, [chatSessionId, messages.length, liveRisk, completeSession]);

  // ── Delete history item ───────────────────────────────────────
  const deleteHistory = useCallback(async (id: string) => {
    await fetch(`/api/chat-sessions/${id}`, { method: 'DELETE' }).catch(() => {});
    setSessionHistory(prev => prev.filter(h => h.id !== id));
    if (id === chatSessionId) startNewChat();
  }, [chatSessionId, startNewChat]);

  // ── Load a past session ───────────────────────────────────────
  const loadSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chat-sessions/${id}`);
      const { session: cs } = await res.json();
      if (!cs?.messages?.length) return;
      const restored: ChatMessage[] = cs.messages.map((m: any) => ({
        id:        m.id,
        role:      m.role as 'user' | 'assistant',
        content:   m.content,
        timestamp: new Date(m.createdAt),
      }));
      assessedRef.current = false;
      setStep('chat');
      setAssessment(null);
      setMessages(restored);
      setChatSessionId(id);
      setLiveRisk((cs.riskLevel as UrgencyLevel) || 'low');
      setCanAssess(restored.filter(m => m.role === 'user').length >= 3);
      setShowWelcome(false);
      setIsViewingHistory(true);
    } catch (e) { console.error('Failed to load session:', e); }
  }, []);

  // ── Print assessment ──────────────────────────────────────────
  const printAssessment = useCallback(() => {
    if (!assessment) return;
    const urgencyLabels: Record<UrgencyLevel, string> = {
      low: '✓ Low Risk', moderate: '⚠ Moderate Risk', high: '⚠ High Risk', emergency: '🚨 Emergency',
    };
    const html = `<!DOCTYPE html><html><head><title>HealthConnect Assessment Report</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; color: #1e293b; line-height: 1.6; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  .badge { display: inline-block; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700;
    background: ${{ low: '#dcfce7', moderate: '#fef9c3', high: '#fee2e2', emergency: '#fee2e2' }[assessment.urgencyLevel]};
    color: ${{ low: '#15803d', moderate: '#b45309', high: '#b91c1c', emergency: '#b91c1c' }[assessment.urgencyLevel]};
    margin-bottom: 20px; }
  section { margin-bottom: 22px; }
  h2 { font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; }
  ul, ol { padding-left: 22px; margin: 0; }
  li { margin-bottom: 5px; font-size: 14px; }
  .warn li { color: #b45309; }
  .disclaimer { margin-top: 32px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #64748b; }
  @media print { body { margin: 20mm; } }
</style></head><body>
<h1>Health Assessment Report</h1>
<p class="meta">Generated: ${new Date().toLocaleString()} · HealthConnect Navigator</p>
<div class="badge">${urgencyLabels[assessment.urgencyLevel]}</div>
<section><h2>Summary</h2><p>${assessment.summary}</p></section>
${assessment.recommendations.length ? `<section><h2>Recommendations</h2><ul>${assessment.recommendations.map(r => `<li>${r}</li>`).join('')}</ul></section>` : ''}
${assessment.redFlags.length ? `<section><h2>Warning Signs</h2><ul class="warn">${assessment.redFlags.map(f => `<li>${f}</li>`).join('')}</ul></section>` : ''}
${assessment.nextSteps.length ? `<section><h2>Next Steps</h2><ol>${assessment.nextSteps.map(s => `<li>${s}</li>`).join('')}</ol></section>` : ''}
<div class="disclaimer">This AI assessment is for informational purposes only and does not constitute medical advice or diagnosis. Always consult a qualified healthcare professional for proper evaluation and treatment.</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }, [assessment]);

  // ── Input handlers ────────────────────────────────────────────
  const handleKeyDown    = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } };
  const handleTextarea   = (e: React.ChangeEvent<HTMLTextAreaElement>)   => { setInputVal(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; };
  const urgencyColor     = (lvl: string) => ({ low: 'var(--hc-teal,#00D2FF)', moderate: '#fbbf24', high: '#ef4444', emergency: '#dc2626' }[lvl] ?? '#6b7280');

  // ── Notification panel close-outside ─────────────────────────
  useEffect(() => {
    if (!showNotifPanel) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        notifPanelRef.current && !notifPanelRef.current.contains(t) &&
        notifBellRef.current  && !notifBellRef.current.contains(t) &&
        notifMobRef.current   && !notifMobRef.current.contains(t)
      ) setShowNotifPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifPanel]);

  // ── Notifications ─────────────────────────────────────────────
  type NotifItem = {
    id: string;
    icon: React.ComponentType<{ size: number }>;
    color: 'teal' | 'amber' | 'red' | 'mint' | 'violet';
    title: string;
    body: string;
    action?: () => void;
  };

  const notifications = React.useMemo((): NotifItem[] => {
    const list: NotifItem[] = [];
    if (!userLoc && locationPermission !== 'granted') {
      list.push({
        id:    'location',
        icon:  locationPermission === 'denied' ? AlertCircle : Crosshair,
        color: locationPermission === 'denied' ? 'red' : 'amber',
        title: locationPermission === 'denied' ? 'Location access blocked' : 'Enable GPS for nearby facilities',
        body:  locationPermission === 'denied'
          ? 'Open your browser settings and allow location access to find clinics and hospitals near you.'
          : 'Allow GPS access so we can show the nearest hospitals, clinics and pharmacies during your assessment.',
        action: locationPermission === 'denied' ? undefined : getLocation,
      });
    }
    if (liveRisk === 'emergency' || liveRisk === 'high') {
      list.push({
        id:    'risk',
        icon:  liveRisk === 'emergency' ? Phone : AlertTriangle,
        color: 'red',
        title: liveRisk === 'emergency' ? 'Emergency symptoms detected' : 'High-risk symptoms detected',
        body:  liveRisk === 'emergency'
          ? 'Your symptoms suggest a possible emergency. Call 193 immediately or go to the nearest ER.'
          : 'Your symptoms may need prompt medical attention. Consider seeking care today.',
        action: liveRisk === 'emergency' ? () => window.open('tel:193', '_self') : () => router.push('/facilities'),
      });
    }
    if (liveRisk === 'moderate') {
      list.push({
        id:    'risk-moderate',
        icon:  AlertTriangle,
        color: 'amber',
        title: 'Moderate risk symptoms',
        body:  'Your symptoms may need attention. Consider seeing a doctor within 24–48 hours if they persist.',
        action: () => router.push('/facilities'),
      });
    }
    if (canAssess && step === 'chat' && !assessedRef.current) {
      list.push({
        id:     'assess',
        icon:   TrendingUp,
        color:  'teal',
        title:  'Full assessment ready',
        body:   "You've shared enough information. Generate your complete AI health assessment report now.",
        action: () => { setShowNotifPanel(false); genAssessment(messages); },
      });
    }
    if (assessment?.facilityRecommendation) {
      list.push({
        id:     'facility',
        icon:   MapPin,
        color:  'violet',
        title:  'Healthcare facility recommended',
        body:   'Based on your assessment, visiting a clinic or hospital for professional evaluation is advised.',
        action: () => router.push('/facilities'),
      });
    }
    if (facError && userLoc) {
      list.push({
        id:     'fac-error',
        icon:   AlertCircle,
        color:  'amber',
        title:  'Could not load nearby facilities',
        body:   'The facility search failed. Tap to retry.',
        action: fetchFacilities,
      });
    }
    if (userLoc && !loadingFac && !facError && nearby.length === 0) {
      list.push({
        id:     'no-nearby',
        icon:   MapPin,
        color:  'amber',
        title:  'No facilities found within 5 km',
        body:   'There are no mapped healthcare facilities near your location. Try the full facility finder.',
        action: () => router.push('/facilities'),
      });
    }
    if (sessionHistory.length === 0 && messages.filter(m => m.role === 'user').length === 0) {
      list.push({
        id:    'start',
        icon:  MessageSquare,
        color: 'mint',
        title: 'Start your first assessment',
        body:  'Describe your symptoms in the chat and our AI will guide you through a personalised health check.',
      });
    }
    if (list.length === 0) {
      list.push({ id: 'empty', icon: CheckCircle, color: 'mint', title: 'All caught up!', body: 'No new alerts for this session.' });
    }
    return list;
  }, [userLoc, locationPermission, liveRisk, canAssess, step, assessment, sessionHistory, messages, facError, loadingFac, nearby, getLocation, genAssessment, fetchFacilities, router]);

  const hasUnread       = notifications.some(n => n.id !== 'empty' && n.id !== 'start') && !notifsRead;
  const toggleNotifPanel = () => { setShowNotifPanel(p => !p); setNotifsRead(true); };

  // ── Derived ───────────────────────────────────────────────────
  const riskLevel = assessment?.urgencyLevel ?? liveRisk;
  const userName  = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image || null;
  const userInit  = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const userCount = messages.filter(m => m.role === 'user').length;

  const quickSymptoms = [
    { label: 'Headache',            icon: <Brain size={13} /> },
    { label: 'Fever',               icon: <Thermometer size={13} /> },
    { label: 'Chest pain',          icon: <Heart size={13} /> },
    { label: 'Nausea',              icon: <Activity size={13} /> },
    { label: 'Shortness of breath', icon: <Activity size={13} /> },
    { label: 'Back pain',           icon: <Activity size={13} /> },
    { label: 'Dizziness',           icon: <Activity size={13} /> },
    { label: 'Fatigue',             icon: <Clock size={13} /> },
    { label: 'Sore throat',         icon: <Stethoscope size={13} /> },
    { label: 'Stomach pain',        icon: <Activity size={13} /> },
  ];

  // ── Loading / unauth guards ───────────────────────────────────
  if (status === 'loading') return (
    <div className="sc-loading">
      <Bot size={44} className="sc-spin-slow" />
      <p>Loading AI Symptom Checker…</p>
    </div>
  );
  if (status === 'unauthenticated') return null;

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout activeTab="/symptom-checker" locked showFooter={false} className="hc-layout--has-mob-topbar">

      {/* ── Welcome modal ── */}
      {showWelcome && (
        <ModalPortal>
          <div className="sc-overlay" onClick={() => setShowWelcome(false)}>
            <div className="sc-modal--welcome" onClick={e => e.stopPropagation()}>
              <div className="sc-modal-header">
                <div className="sc-modal-icon"><Bot size={32} /></div>
                <h3>Welcome to AI Symptom Checker</h3>
                <p>Personalised health insights powered by HealthConnect AI</p>
                <button className="sc-modal-close" onClick={() => setShowWelcome(false)} type="button"><X size={16} /></button>
              </div>
              <div className="sc-modal-body">
                <div className="sc-disclaimer">
                  <h4><Shield size={14} /> Medical Disclaimer</h4>
                  <ul>
                    <li>This tool provides general health information only</li>
                    <li>It cannot replace professional medical diagnosis</li>
                    <li>Always consult healthcare professionals for medical advice</li>
                    <li>For life-threatening emergencies, call 193 immediately</li>
                  </ul>
                </div>
                <div className="sc-modal-features">
                  <div className="sc-modal-feature"><MessageSquare size={18} /><h5>Interactive Chat</h5><p>Conversational symptom assessment</p></div>
                  <div className="sc-modal-feature"><Brain size={18} /><h5>AI Analysis</h5><p>Advanced health insights</p></div>
                  <div className="sc-modal-feature"><Zap size={18} /><h5>Instant Guidance</h5><p>Immediate information & next steps</p></div>
                </div>
              </div>
              <div className="sc-modal-footer">
                <button className="sc-start-btn" onClick={() => setShowWelcome(false)} type="button">
                  Start Health Assessment <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ── Emergency modal ── */}
      {showEmergency && (
        <ModalPortal>
          <div className="sc-overlay" onClick={() => setShowEmergency(false)}>
            <div className="sc-modal--emergency" onClick={e => e.stopPropagation()}>
              <div className="sc-modal-header--danger">
                <AlertTriangle size={28} />
                <h2>Emergency Symptoms Detected</h2>
                <button className="sc-modal-close-danger" onClick={() => setShowEmergency(false)} type="button"><X size={18} /></button>
              </div>
              <div className="sc-modal-body">
                <p className="sc-emergency-copy">If you are experiencing a medical emergency, please seek immediate help. Do not delay — every second counts.</p>
                <div className="sc-emergency-btns">
                  <button className="sc-btn sc-btn--danger" onClick={() => window.open('tel:193', '_self')} type="button">
                    <Phone size={16} /> Call 193 — Emergency Services
                  </button>
                  <button className="sc-btn sc-btn--outline-danger" onClick={() => router.push('/facilities')} type="button">
                    <MapPin size={16} /> Find Nearest Hospital
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ── Main page shell ── */}
      <div className="sc-page">

        {/* Topbar — desktop */}
        <div className="db-topbar">
          <div className="db-topbar__search">
            <button className="db-topbar__search-icon-btn" type="button" onClick={handleSearchSubmit}><Search size={15} /></button>
            <input
              ref={facRef}
              className="db-topbar__search-input"
              type="search"
              placeholder="Search facilities..."
              value={facQ}
              onChange={e => setFacQ(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {facQ.trim() && <button className="db-topbar__search-submit" type="button" onClick={handleSearchSubmit}>Go</button>}
          </div>
          <div className="db-topbar__right">
            <div className="db-topbar__live"><span className="db-topbar__live-dot" />Live</div>
            <button className="db-topbar__icon-btn" type="button" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button ref={notifBellRef} className="db-topbar__icon-btn" style={{ position: 'relative' }} type="button" aria-label="Notifications" onClick={toggleNotifPanel}>
              <Bell size={18} />{hasUnread && <span className="db-topbar__notif-dot" />}
            </button>
            <button className="db-topbar__icon-btn sc-emergency-btn" type="button" onClick={() => setShowEmergency(true)}><Phone size={18} /></button>
            <button className="db-topbar__user" type="button" onClick={() => router.push('/profile')}>
              <div className="db-topbar__user-avatar">
                {userImage ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" /> : userInit}
              </div>
              <div className="db-topbar__user-info">
                <span className="db-topbar__user-name">{userName}</span>
                <span className="db-topbar__user-id">HC-{userEmail.slice(0, 5).toUpperCase()}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Notification panel */}
        {showNotifPanel && (
          <>
            <div className="db-notif-panel" ref={notifPanelRef} role="dialog" aria-label="Notifications">
              <div className="db-notif-panel__header">
                <span className="db-notif-panel__title">Notifications</span>
                {notifications.some(n => n.id !== 'empty' && n.id !== 'start') && (
                  <span className="db-notif-panel__count">
                    {notifications.filter(n => n.id !== 'empty' && n.id !== 'start').length}
                  </span>
                )}
                <button className="db-notif-panel__close" onClick={() => setShowNotifPanel(false)} type="button" aria-label="Close"><X size={15} /></button>
              </div>
              <div className="db-notif-panel__list">
                {notifications.map(n => {
                  const Icon = n.icon;
                  return (
                    <button key={n.id} className={`db-notif-item db-notif-item--${n.color}`}
                      onClick={() => { setShowNotifPanel(false); n.action?.(); }}
                      type="button" disabled={!n.action}>
                      <div className={`db-notif-item__icon db-notif-item__icon--${n.color}`}><Icon size={14} /></div>
                      <div className="db-notif-item__body">
                        <p className="db-notif-item__title">{n.title}</p>
                        <p className="db-notif-item__body-text">{n.body}</p>
                      </div>
                      {n.action && <ChevronRight size={13} className="db-notif-item__arrow" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="db-notif-overlay" onClick={() => setShowNotifPanel(false)} />
          </>
        )}

        {/* Mobile top bar */}
        <div className="sc-mob-topbar">
          <div className="sc-mob-topbar__left">
            <Heart size={18} className="sc-mob-topbar__logo-icon" />
            <span className="sc-mob-topbar__logo-text">HealthConnect</span>
          </div>
          <div className="sc-mob-topbar__right">
            <button className="sc-mob-topbar__btn" type="button" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button ref={notifMobRef} className="sc-mob-topbar__btn" type="button" style={{ position: 'relative' }} aria-label="Notifications" onClick={toggleNotifPanel}>
              <Bell size={18} />{hasUnread && <span className="sc-mob-topbar__bell-dot" />}
            </button>
            <button className="sc-mob-topbar__sos" type="button" onClick={() => setShowEmergency(true)}>
              <Phone size={13} /> SOS
            </button>
            <button className="sc-mob-topbar__avatar-btn" type="button" onClick={() => router.push('/profile')}>
              <div className="sc-mob-topbar__avatar">
                {userImage ? <img src={userImage} alt={userName} referrerPolicy="no-referrer" /> : userInit}
              </div>
            </button>
          </div>
        </div>

        {/* Mobile risk bar */}
        <div className="sc-mob-risk-bar">
          <div className="sc-mob-risk-bar__row1">
            <span className="sc-mob-risk-bar__label">Risk Assessment</span>
            <div className="sc-mob-risk-bar__actions">
              <span className={`sc-mob-risk-bar__badge sc-mob-risk-bar__badge--${riskLevel}`}>
                <span className="sc-mob-risk-bar__dot" />
                {riskLevel === 'low' ? 'Low Risk' : riskLevel === 'moderate' ? 'Moderate' : riskLevel === 'high' ? 'High Risk' : 'Emergency'}
              </span>
              {userCount > 0 && (
                <button className="sc-mob-new-chat-btn" type="button" onClick={startNewChat} aria-label="New chat">
                  <Plus size={11} /> New
                </button>
              )}
              <button className="sc-mob-risk-bar__panel-btn" type="button" onClick={() => setMobPanelOpen(o => !o)}>
                <TrendingUp size={11} /> Details
              </button>
            </div>
          </div>
          <div className="sc-mob-risk-bar__track-wrap">
            <div className="sc-mob-risk-bar__track">
              <div className="sc-mob-risk-bar__fill" style={{
                width:      riskLevel === 'low' ? '20%' : riskLevel === 'moderate' ? '55%' : riskLevel === 'high' ? '80%' : '100%',
                background: urgencyColor(riskLevel),
              }} />
            </div>
            <div className="sc-mob-risk-bar__ticks"><span>Low</span><span>Moderate</span><span>High</span></div>
          </div>
        </div>

        {/* Mobile quick pills */}
        <div className="sc-mob-quick-pills">
          {quickSymptoms.map(s => (
            <button key={s.label} className="sc-mob-quick-pill" type="button"
              onClick={() => { setInputVal(s.label); textareaRef.current?.focus(); }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Three-column grid */}
        <div className={`sc-grid${rightOpen ? ' sc-grid--right-open' : ''}`}>

          {/* ── Left sidebar ── */}
          <aside className="sc-left">
            <div className="sc-left-section">
              <p className="sc-section-label">QUICK SYMPTOMS</p>
              <div className="sc-quick-list">
                {quickSymptoms.map(s => (
                  <button key={s.label} className="sc-quick-btn" type="button"
                    onClick={() => { setInputVal(s.label); textareaRef.current?.focus(); }}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sc-left-section sc-left-section--grow">
              <p className="sc-section-label">PAST SESSIONS</p>
              {sessionHistory.length === 0
                ? (
                  <div className="sc-empty-state">
                    <Clock size={20} />
                    <p>No sessions yet</p>
                    <span>Complete a chat to build history</span>
                  </div>
                ) : (
                  <div className="sc-hist-list">
                    {sessionHistory.map((h, i) => (
                      <div key={i}
                        className={`sc-hist-item${h.id === chatSessionId ? ' sc-hist-item--active' : ''}${h.status === 'completed' ? ' sc-hist-item--completed' : ''}`}
                        onClick={() => h.id && loadSession(h.id)}
                        style={{ cursor: h.id ? 'pointer' : 'default' }}>
                        {h.id && (
                          <button type="button" onClick={e => { e.stopPropagation(); deleteHistory(h.id!); }}
                            className="sc-hist-delete" aria-label="Delete">
                            <X size={11} />
                          </button>
                        )}
                        <div className="sc-hist-item__top">
                          <p className="sc-hist-date">{h.date}</p>
                          {h.status === 'completed' && <span className="sc-hist-done">✓ Done</span>}
                        </div>
                        <p className="sc-hist-title">{h.title}</p>
                        <span className={`sc-hist-badge sc-hist-badge--${h.badge}`}>
                          {h.badge === 'low' ? 'Low risk' : h.badge === 'moderate' ? 'Moderate' : 'High risk'} · {h.sub}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </aside>

          {/* ── Center chat ── */}
          <div className="sc-center">
            {step === 'chat' ? (
              <>
                {/* Chat header */}
                <div className="sc-chat-header">
                  <div className="sc-chat-header-left">
                    <div className="sc-bot-icon"><Bot size={20} /></div>
                    <div>
                      <p className="sc-chat-title">AI Symptom Checker</p>
                      <p className="sc-chat-subtitle">Powered by HealthConnect AI — Not a medical diagnosis</p>
                    </div>
                  </div>
                  <div className="sc-chat-header-right">
                    {userCount > 0 && (
                      <div className={`sc-risk-pill sc-risk-pill--${riskLevel}`}>
                        <span className="sc-risk-dot" />
                        {riskLevel === 'low' ? 'Low Risk' : riskLevel === 'moderate' ? 'Moderate Risk' : riskLevel === 'high' ? 'High Risk' : '🚨 Emergency'}
                      </div>
                    )}
                    {canAssess && !assessedRef.current && (
                      <button className="sc-header-btn sc-header-btn--teal" onClick={() => genAssessment(messages)} type="button">
                        <TrendingUp size={13} /> Get Assessment
                      </button>
                    )}
                    {userCount > 0 && (
                      <button className="sc-header-btn" onClick={startNewChat} type="button">
                        <Plus size={13} /> New Chat
                      </button>
                    )}
                    <button
                      className={`sc-header-btn${rightOpen ? ' sc-header-btn--active' : ''}`}
                      onClick={() => setRightOpen(o => !o)}
                      type="button">
                      <Activity size={13} /> {rightOpen ? 'Hide Panel' : 'Risk & Facilities'}
                      {!rightOpen && userCount > 0 && <span className="sc-header-btn__dot" />}
                    </button>
                  </div>
                </div>

                {/* History banner — shown when viewing a past session */}
                {isViewingHistory && (
                  <div className="sc-history-banner">
                    <Clock size={12} />
                    <span>You're viewing a past session</span>
                    <button type="button" onClick={startNewChat} className="sc-history-banner__btn">
                      <Plus size={11} /> New chat
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div className="sc-messages">
                  {messages.map(msg => (
                    <div key={msg.id} className={`sc-msg sc-msg--${msg.role}`}>
                      <div className={`sc-avatar sc-avatar--${msg.role === 'assistant' ? 'bot' : 'user'}`}>
                        {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                      </div>
                      <div className="sc-msg-body">
                        <div className={`sc-bubble sc-bubble--${msg.role === 'assistant' ? 'bot' : 'user'}`}>
                          {msg.role === 'assistant' ? renderMarkdown(msg.content) : <p className="sc-md-p">{msg.content}</p>}
                        </div>
                        <span className="sc-time">{msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="sc-msg sc-msg--assistant">
                      <div className="sc-avatar sc-avatar--bot"><Bot size={14} /></div>
                      <div className="sc-msg-body">
                        <div className="sc-bubble sc-bubble--bot sc-typing"><span /><span /><span /></div>
                      </div>
                    </div>
                  )}
                  <div ref={msgEndRef} />
                </div>

                {/* Suggested symptom chips — visible before first message */}
                {userCount === 0 && (
                  <div className="sc-chips">
                    {['Nausea', 'Chest pain', 'Fever', 'Dizziness', 'Headache', 'Fatigue', 'Back pain', 'Shortness of breath'].map(c => (
                      <button key={c} className="sc-chip" type="button"
                        onClick={() => { setInputVal(c); textareaRef.current?.focus(); }}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input bar */}
                <div className={`sc-input-bar${inputFocused ? ' sc-input-bar--focused' : ''}`}>
                  <div className="sc-input-inner">
                    <textarea
                      ref={textareaRef}
                      value={inputVal}
                      onChange={handleTextarea}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => { setTimeout(() => setInputFocused(false), 150); }}
                      placeholder="Describe your symptom or ask a health question…"
                      className="sc-textarea"
                      rows={1}
                      disabled={isProcessing}
                    />
                    <button className="sc-send" onClick={handleSend} disabled={!inputVal.trim() || isProcessing} type="button" aria-label="Send">
                      {isProcessing ? <Loader2 size={16} className="sc-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <p className="sc-input-hint">
                    <Shield size={10} /> Be specific — include duration, severity, and location of symptoms · Enter to send
                  </p>
                </div>
              </>
            ) : (
              assessment && (
                <div className="sc-assess-view">
                  <div className="sc-assess-card">
                    <div className="sc-assess-head" style={{ borderLeftColor: urgencyColor(assessment.urgencyLevel) }}>
                      <div className="sc-assess-icon" style={{ background: urgencyColor(assessment.urgencyLevel) + '18', color: urgencyColor(assessment.urgencyLevel) }}>
                        <TrendingUp size={24} />
                      </div>
                      <div className="sc-assess-head-text">
                        <h2>Health Assessment Report</h2>
                        <p>Based on your {userCount} responses</p>
                      </div>
                      <div className={`sc-assess-urgency sc-assess-urgency--${assessment.urgencyLevel}`}>
                        {assessment.urgencyLevel === 'low' ? '✓ Low Risk' : assessment.urgencyLevel === 'moderate' ? '⚠ Moderate' : assessment.urgencyLevel === 'high' ? '⚠ High Risk' : '🚨 Emergency'}
                      </div>
                    </div>

                    <div className="sc-assess-body">
                      <section className="sc-assess-section">
                        <h3><FileText size={15} /> Summary</h3>
                        <p>{assessment.summary}</p>
                      </section>

                      {assessment.recommendations.length > 0 && (
                        <section className="sc-assess-section">
                          <h3><CheckCircle size={15} /> Recommendations</h3>
                          <ul className="sc-assess-list sc-assess-list--bullet">
                            {assessment.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </section>
                      )}

                      {assessment.redFlags.length > 0 && (
                        <section className="sc-assess-section sc-assess-section--warn">
                          <h3><AlertTriangle size={15} /> Warning Signs</h3>
                          <ul className="sc-assess-list sc-assess-list--warn">
                            {assessment.redFlags.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </section>
                      )}

                      <section className="sc-assess-section">
                        <h3><Activity size={15} /> Next Steps</h3>
                        <ol className="sc-assess-list sc-assess-list--numbered">
                          {assessment.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                      </section>

                      {assessment.facilityRecommendation && (
                        <div className="sc-assess-facility-rec">
                          <MapPin size={20} />
                          <div>
                            <h4>Healthcare Facility Recommended</h4>
                            <p>Based on your symptoms, consider visiting a clinic or hospital for professional evaluation.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sc-assess-actions">
                      <button className="sc-btn sc-btn--teal" onClick={() => router.push('/facilities')} type="button">
                        <MapPin size={14} /> Find Facilities
                      </button>
                      <button className="sc-btn sc-btn--ghost" onClick={() => setStep('chat')} type="button">
                        <MessageSquare size={14} /> Continue Chat
                      </button>
                      <button className="sc-btn sc-btn--ghost" onClick={printAssessment} type="button">
                        <Printer size={14} /> Save / Print
                      </button>
                      <button className="sc-btn sc-btn--ghost" onClick={startNewChat} type="button">
                        <RefreshCw size={14} /> New Assessment
                      </button>
                    </div>

                    <div className="sc-assess-disclaimer">
                      <Shield size={14} />
                      <p>This AI assessment is for informational purposes only and does not constitute medical advice or diagnosis. Always consult a qualified healthcare professional.</p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* ── Right panel ── */}
          <aside className="sc-right">
            <div className="sc-right-inner">
              <div className="sc-right-header">
                <span className="sc-right-title-label">Risk &amp; Facilities</span>
                <button className="sc-right-close" onClick={() => setRightOpen(false)} type="button"><X size={13} /></button>
              </div>

              {/* Risk gauge */}
              <div className="sc-right-block">
                <p className="sc-right-section-title">Risk Assessment</p>
                <div className="sc-risk-row">
                  <span className="sc-risk-label">Current Status</span>
                  <span className="sc-risk-value" style={{ color: urgencyColor(riskLevel) }}>
                    ● {riskLevel === 'low' ? 'Low Risk' : riskLevel === 'moderate' ? 'Moderate Risk' : riskLevel === 'high' ? 'High Risk' : 'Emergency'}
                  </span>
                </div>
                <div className="sc-gauge-track"><div className={`sc-gauge-fill sc-gauge-fill--${riskLevel}`} /></div>
                <div className="sc-gauge-labels"><span>Low</span><span>Moderate</span><span>High</span></div>
                <p className="sc-gauge-hint">
                  {userCount === 0 && 'Start a conversation to begin your risk assessment'}
                  {userCount > 0 && riskLevel === 'low'       && 'Symptoms appear mild. Continue monitoring.'}
                  {userCount > 0 && riskLevel === 'moderate'  && 'Consider seeing a doctor within 24–48 hours.'}
                  {userCount > 0 && riskLevel === 'high'      && 'Seek medical attention soon.'}
                  {userCount > 0 && riskLevel === 'emergency' && '🚨 Seek emergency care immediately. Call 193.'}
                </p>
                {canAssess && step === 'chat' && !assessedRef.current && (
                  <button className="sc-btn sc-btn--teal" onClick={() => genAssessment(messages)} type="button" style={{ marginTop: 10, width: '100%' }}>
                    <TrendingUp size={13} /> Generate Full Assessment
                  </button>
                )}
              </div>

              {/* Session history */}
              <div className="sc-right-block">
                <p className="sc-right-section-title">
                  Session History {sessionHistory.length > 0 && <span className="sc-right-count">{sessionHistory.length}</span>}
                </p>
                {sessionHistory.length === 0
                  ? <p className="sc-right-empty">Complete a chat session to see history here</p>
                  : (
                    <div className="sc-sess-list">
                      {sessionHistory.map((h, i) => (
                        <div key={i}
                          className={`sc-sess-item${h.id === chatSessionId ? ' sc-sess-item--active' : ''}${h.status === 'completed' ? ' sc-sess-item--completed' : ''}`}
                          onClick={() => { if (h.id) { loadSession(h.id); setMobPanelOpen(false); } }}
                          style={{ cursor: h.id ? 'pointer' : 'default' }}>
                          {h.id && (
                            <button type="button" onClick={e => { e.stopPropagation(); deleteHistory(h.id!); }}
                              className="sc-hist-delete" aria-label="Delete">
                              <X size={12} />
                            </button>
                          )}
                          <div className="sc-hist-item__top">
                            <p className="sc-sess-date">{h.date}</p>
                            {h.status === 'completed' && <span className="sc-hist-done">✓ Done</span>}
                          </div>
                          <p className="sc-sess-title-text">{h.title}</p>
                          <p className="sc-sess-sub">
                            <span className={`sc-sess-dot sc-sess-dot--${h.badge}`} />
                            {h.badge === 'low' ? 'Low risk' : h.badge === 'moderate' ? 'Moderate risk' : 'High risk'} · {h.sub}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* Nearest facilities */}
              <div className="sc-right-block sc-right-block--grow">
                <p className="sc-right-section-title">
                  Nearest Facility
                  {userLoc && (
                    <>
                      <button className="sc-right-refresh" onClick={fetchFacilities} disabled={loadingFac} type="button">
                        {loadingFac ? <Loader2 size={11} className="sc-spin" /> : <RefreshCw size={11} />}
                      </button>
                      <button className="sc-see-all" onClick={() => router.push('/facilities')} type="button">See all →</button>
                    </>
                  )}
                </p>
                {!userLoc && !loadingFac && (
                  <div className="sc-fac-enable">
                    <MapPin size={24} />
                    <p>Enable Location</p>
                    <span>Allow GPS to find nearby facilities</span>
                    <button className="sc-fac-enable-btn" onClick={getLocation} disabled={loadingLoc} type="button">
                      {loadingLoc ? <><Loader2 size={12} className="sc-spin" /> Getting…</> : <><Crosshair size={12} /> Enable GPS</>}
                    </button>
                  </div>
                )}
                {loadingFac && (
                  <div className="sc-fac-state"><Loader2 size={16} className="sc-spin" /><span>Locating nearby facilities…</span></div>
                )}
                {!loadingFac && facError && userLoc && (
                  <div className="sc-fac-state sc-fac-state--error">
                    <Crosshair size={15} />
                    <div><p>{facError}</p><button className="sc-link" onClick={fetchFacilities} type="button"><RefreshCw size={11} /> Retry</button></div>
                  </div>
                )}
                {!loadingFac && nearby.length > 0 && (
                  <div className="sc-fac-list">
                    {nearby.map(f => {
                      const { label, isOpen } = facStatus(f);
                      const FIcon = f.type === 'hospital' ? Hospital : f.type === 'pharmacy' ? Pill : Stethoscope;
                      return (
                        <div key={f.id} className="db-facility-item">
                          <div className="db-facility-item__header">
                            <div className="db-facility-item__name"><FIcon size={13} /><span>{f.name}</span></div>
                            <div className="db-facility-item__rating"><Star size={11} />{f.rating.toFixed(1)}</div>
                          </div>
                          <div className="db-facility-item__meta">
                            {f.type} · {f.distance.toFixed(1)} km{f.city ? ` · ${f.city}` : ''}
                          </div>
                          <div className="db-facility-item__footer">
                            <span className={`db-facility-item__status db-facility-item__status--${isOpen ? 'open' : 'closed'}`}>
                              <span className="db-facility-item__status-dot" />{label}
                            </span>
                            <div className="db-facility-item__actions">
                              {f.phone && f.phone !== 'Not available' && (
                                <button className="db-facility-item__btn" onClick={() => window.open(`tel:${f.phone}`)} type="button"><Phone size={12} /></button>
                              )}
                              <button className="db-facility-item__btn"
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.name)}`, '_blank')}
                                type="button"><Navigation size={12} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* ── Mobile bottom sheet — Risk & Facilities ── */}
        {mobPanelOpen && (
          <>
            <div className="sc-mob-panel-backdrop open" onClick={() => setMobPanelOpen(false)} />
            <div className="sc-mob-panel-sheet open">
              <div className="sc-mob-panel-sheet__handle" onClick={() => setMobPanelOpen(false)} />
              <div className="sc-mob-panel-sheet__header">
                <span className="sc-mob-panel-sheet__title">Risk &amp; Facilities</span>
                <button className="sc-mob-panel-sheet__close" type="button" onClick={() => setMobPanelOpen(false)}><X size={14} /></button>
              </div>
              <div className="sc-mob-panel-sheet__body">

                {/* Risk assessment */}
                <div className="sc-right-block">
                  <p className="sc-right-section-title">Risk Assessment</p>
                  <div className="sc-risk-row">
                    <span className="sc-risk-label">Current Status</span>
                    <span className="sc-risk-value" style={{ color: urgencyColor(riskLevel) }}>
                      ● {riskLevel === 'low' ? 'Low Risk' : riskLevel === 'moderate' ? 'Moderate Risk' : riskLevel === 'high' ? 'High Risk' : 'Emergency'}
                    </span>
                  </div>
                  <div className="sc-gauge-track"><div className={`sc-gauge-fill sc-gauge-fill--${riskLevel}`} /></div>
                  <div className="sc-gauge-labels"><span>Low</span><span>Moderate</span><span>High</span></div>
                  <p className="sc-gauge-hint">
                    {userCount === 0 && 'Start a conversation to begin your risk assessment'}
                    {userCount > 0 && riskLevel === 'low'       && 'Symptoms appear mild. Continue monitoring.'}
                    {userCount > 0 && riskLevel === 'moderate'  && 'Consider seeing a doctor within 24–48 hours.'}
                    {userCount > 0 && riskLevel === 'high'      && 'Seek medical attention soon.'}
                    {userCount > 0 && riskLevel === 'emergency' && '🚨 Seek emergency care immediately. Call 193.'}
                  </p>
                </div>

                {/* Session history */}
                <div className="sc-right-block">
                  <p className="sc-right-section-title">
                    Session History {sessionHistory.length > 0 && <span className="sc-right-count">{sessionHistory.length}</span>}
                  </p>
                  {sessionHistory.length === 0
                    ? <p className="sc-right-empty">Complete a chat session to see history here</p>
                    : (
                      <div className="sc-sess-list">
                        {sessionHistory.map((h, i) => (
                          <div key={i}
                            className={`sc-sess-item${h.id === chatSessionId ? ' sc-sess-item--active' : ''}${h.status === 'completed' ? ' sc-sess-item--completed' : ''}`}
                            onClick={() => { if (h.id) { loadSession(h.id); setMobPanelOpen(false); } }}
                            style={{ cursor: h.id ? 'pointer' : 'default' }}>
                            <div className="sc-hist-item__top">
                              <p className="sc-sess-date">{h.date}</p>
                              {h.status === 'completed' && <span className="sc-hist-done">✓ Done</span>}
                            </div>
                            <p className="sc-sess-title-text">{h.title}</p>
                            <p className="sc-sess-sub">
                              <span className={`sc-sess-dot sc-sess-dot--${h.badge}`} />
                              {h.badge === 'low' ? 'Low risk' : h.badge === 'moderate' ? 'Moderate risk' : 'High risk'} · {h.sub}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Nearest facilities */}
                <div className="sc-right-block">
                  <p className="sc-right-section-title">
                    Nearest Facility
                    {userLoc && (
                      <>
                        <button className="sc-right-refresh" onClick={fetchFacilities} disabled={loadingFac} type="button">
                          {loadingFac ? <Loader2 size={11} className="sc-spin" /> : <RefreshCw size={11} />}
                        </button>
                        <button className="sc-see-all" onClick={() => { setMobPanelOpen(false); router.push('/facilities'); }} type="button">See all →</button>
                      </>
                    )}
                  </p>
                  {!userLoc && !loadingFac && (
                    <div className="sc-fac-enable">
                      <MapPin size={24} />
                      <p>Enable Location</p>
                      <span>Allow GPS to find nearby facilities</span>
                      <button className="sc-fac-enable-btn" onClick={getLocation} disabled={loadingLoc} type="button">
                        {loadingLoc ? <><Loader2 size={12} className="sc-spin" /> Getting…</> : <><Crosshair size={12} /> Enable GPS</>}
                      </button>
                    </div>
                  )}
                  {loadingFac && (
                    <div className="sc-fac-state"><Loader2 size={16} className="sc-spin" /><span>Locating nearby facilities…</span></div>
                  )}
                  {!loadingFac && nearby.length > 0 && (
                    <div className="sc-fac-list">
                      {nearby.map(f => {
                        const { label, isOpen } = facStatus(f);
                        const FIcon = f.type === 'hospital' ? Hospital : f.type === 'pharmacy' ? Pill : Stethoscope;
                        return (
                          <div key={f.id} className="db-facility-item">
                            <div className="db-facility-item__header">
                              <div className="db-facility-item__name"><FIcon size={13} /><span>{f.name}</span></div>
                              <div className="db-facility-item__rating"><Star size={11} />{f.rating.toFixed(1)}</div>
                            </div>
                            <div className="db-facility-item__meta">
                              {f.type} · {f.distance.toFixed(1)} km{f.city ? ` · ${f.city}` : ''}
                            </div>
                            <div className="db-facility-item__footer">
                              <span className={`db-facility-item__status db-facility-item__status--${isOpen ? 'open' : 'closed'}`}>
                                <span className="db-facility-item__status-dot" />{label}
                              </span>
                              <div className="db-facility-item__actions">
                                {f.phone && f.phone !== 'Not available' && (
                                  <button className="db-facility-item__btn" onClick={() => window.open(`tel:${f.phone}`)} type="button"><Phone size={12} /></button>
                                )}
                                <button className="db-facility-item__btn"
                                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.name)}`, '_blank')}
                                  type="button"><Navigation size={12} /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        )}

        {/* ── Mobile bottom tab bar ── */}
        <nav className={`sc-mob-tab-bar${inputFocused ? ' sc-mob-tab-bar--hidden' : ''}`} aria-label="Main navigation">
          <div className="sc-mob-tab-bar__inner">
            <button className="sc-mob-tab-btn" type="button" onClick={() => router.push('/dashboard')} aria-label="Home">
              <Heart size={22} /><span>Home</span>
            </button>
            <button className="sc-mob-tab-btn" type="button" onClick={() => router.push('/facilities')} aria-label="Find facilities">
              <MapPin size={22} /><span>Find</span>
            </button>
            <button className="sc-mob-tab-btn active" type="button" aria-current="page" aria-label="Symptom Checker">
              <Bot size={22} /><span>Check</span>
            </button>
            <button className="sc-mob-tab-btn sc-mob-tab-btn--sos" type="button" onClick={() => router.push('/emergency')} aria-label="Emergency">
              <span className="sc-mob-sos-icon-wrap">
                <Phone size={20} />
                <span className="sc-mob-sos-dot" />
              </span>
              <span>SOS</span>
            </button>
            <button className="sc-mob-tab-btn" type="button" onClick={() => router.push('/profile')} aria-label="Profile">
              <User size={22} /><span>Profile</span>
            </button>
          </div>
        </nav>

      </div>
    </DashboardLayout>
  );
}