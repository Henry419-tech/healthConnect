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
import '@/styles/symptom-checker-layout-fix.css';
import '@/styles/symptom-checker-mobile.css';
import {
  Bot, AlertTriangle, CheckCircle, Clock, Thermometer, Heart,
  Brain, Activity, Phone, MapPin, ChevronRight, X, Shield,
  User, Loader2, FileText, Send, MessageSquare, Zap,
  Navigation, Crosshair, Search, Bell, AlertCircle,
  RefreshCw, Plus, Stethoscope, TrendingUp, Sun, Moon,
  Pill, Hospital, Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type UrgencyLevel = 'low' | 'moderate' | 'high' | 'emergency';
interface ChatMessage  { id: string; role: 'user'|'assistant'; content: string; timestamp: Date; }
interface AssessmentResult { urgencyLevel: UrgencyLevel; summary: string; recommendations: string[]; redFlags: string[]; nextSteps: string[]; facilityRecommendation: boolean; }
interface NearbyFacility   { id: string; name: string; type: string; distance: number; rating: number; hours: string; emergencyServices: boolean; city?: string; phone?: string; coordinates?: [number,number]; }

// ─── Risk keywords ────────────────────────────────────────────────────────────
const RISK_KW: Record<UrgencyLevel,string[]> = {
  emergency: ['chest pain','heart attack','stroke','not breathing',"can't breathe",'unconscious','severe bleeding','choking','collapsed','seizure','overdose','poisoning','severe allergic','anaphylaxis'],
  high:      ['high fever','difficulty breathing','shortness of breath','sharp pain','vomiting blood','severe headache','vision loss','numbness','paralysis','confusion','chest tightness','rapid heartbeat','fainting','coughing blood'],
  moderate:  ['fever','chest','breathing','dizziness','nausea','vomiting','abdominal pain','stomach pain','back pain','throat','infection','rash','swelling','joint pain','migraine','weakness'],
  low:       [],
};
function computeRisk(msgs: ChatMessage[]): UrgencyLevel {
  const t = msgs.map(m=>m.content).join(' ').toLowerCase();
  for (const kw of RISK_KW.emergency) if (t.includes(kw)) return 'emergency';
  for (const kw of RISK_KW.high)      if (t.includes(kw)) return 'high';
  for (const kw of RISK_KW.moderate)  if (t.includes(kw)) return 'moderate';
  return 'low';
}

// ─── Portal ───────────────────────────────────────────────────────────────────
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); return () => setM(false); }, []);
  if (!m) return null;
  return createPortal(children, document.body);
}

// ─── Markdown ─────────────────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n'); const nodes: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = []; let nums: React.ReactNode[] = []; let k=0;
  const flushB = () => { if (bullets.length) { nodes.push(<ul key={k++} className="sc-md-ul">{bullets}</ul>); bullets=[]; } };
  const flushN = () => { if (nums.length)    { nodes.push(<ol key={k++} className="sc-md-ol">{nums}</ol>);    nums=[];    } };
  for (const raw of lines) {
    const line = raw.trim(); if (!line) continue;
    if (/^\d+[.)]\s+/.test(line)) { flushB(); nums.push(<li key={k++} className="sc-md-li">{fmt(line.replace(/^\d+[.)]\s+/,''))}</li>); continue; }
    if (/^[•*\-]\s+/.test(line))  { flushN(); bullets.push(<li key={k++} className="sc-md-li">{fmt(line.replace(/^[•*\-]\s+/,''))}</li>); continue; }
    flushB(); flushN();
    if (/^\*\*[^*]+:?\*\*$/.test(line)||/^\*\*[^*]+\*\*:$/.test(line)) { nodes.push(<p key={k++} className="sc-md-heading">{line.replace(/\*\*/g,'').replace(/:$/,'')}</p>); continue; }
    nodes.push(<p key={k++} className="sc-md-p">{fmt(line)}</p>);
  }
  flushB(); flushN(); return nodes;
}
function fmt(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []; const re=/\*\*([^*]+)\*\*|\*([^*]+)\*/g; let last=0; let m: RegExpExecArray|null;
  while ((m=re.exec(text))!==null) { if (m.index>last) parts.push(text.slice(last,m.index)); if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>); else if (m[2]) parts.push(<em key={m.index}>{m[2]}</em>); last=m.index+m[0].length; }
  if (last<text.length) parts.push(text.slice(last)); return <>{parts}</>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SymptomChecker() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const [step,         setStep]         = useState<'chat'|'assessment'>('chat');
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [inputVal,     setInputVal]     = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assessment,   setAssessment]   = useState<AssessmentResult|null>(null);
  const [liveRisk,     setLiveRisk]     = useState<UrgencyLevel>('low');
  const [showEmergency,setShowEmergency]= useState(false);
  const [showWelcome,  setShowWelcome]  = useState(true);
  const [canAssess,    setCanAssess]    = useState(false);
  const [rightOpen,    setRightOpen]    = useState(false);
  const [mobPanelOpen, setMobPanelOpen] = useState(false);

  const { searchQuery: facQ, setSearchQuery: setFacQ, searchInputRef: facRef, handleSearchSubmit, handleSearchKeyDown } = useFacilitySearch();

  const [nearby,          setNearby]          = useState<NearbyFacility[]>([]);
  const [loadingFac,      setLoadingFac]      = useState(false);
  const [facError,        setFacError]        = useState<string|null>(null);
  const [userLoc,         setUserLoc]         = useState<[number,number]|null>(null);
  const [loadingLoc,      setLoadingLoc]      = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted'|'prompt'|'denied'|'unknown'>('unknown');
  const [sessionHistory,  setSessionHistory]  = useState<{date:string;title:string;badge:string;sub:string;id?:string}[]>([]);

  /* ── Notification panel ─────────────────────────────────── */
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifsRead,     setNotifsRead]     = useState(false);
  const notifBellRef  = useRef<HTMLButtonElement>(null);
  const notifMobRef   = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  const msgEndRef   = useRef<HTMLDivElement>(null);
  const msgScrollRef= useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const assessedRef = useRef(false);

  // Auth guard
  useEffect(() => { if (status==='unauthenticated') router.push('/auth/signin'); }, [status,router]);

  // Dark mode sync
  useEffect(() => { document.documentElement.classList.toggle('dark-mode', isDarkMode); }, [isDarkMode]);

  // Auto-scroll
  useEffect(() => { msgEndRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages,isProcessing]);

  // Live risk
  useEffect(() => {
    if (!messages.length) { setLiveRisk('low'); return; }
    const r = computeRisk(messages);
    setLiveRisk(r);
    if (r==='emergency') setShowEmergency(true);
    setCanAssess(messages.filter(m=>m.role==='user').length >= 3);
  }, [messages]);

  // Distance util
  const calcDist = useCallback((la1:number,lo1:number,la2:number,lo2:number) => {
    const R=6371,dLat=(la2-la1)*Math.PI/180,dLng=(lo2-lo1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }, []);

  // Fetch facilities
  const fetchFacilities = useCallback(async () => {
    if (!userLoc) return;
    setLoadingFac(true); setFacError(null);
    const [lat,lng]=userLoc;
    const q=`[out:json][timeout:30];(node["amenity"="hospital"](around:5000,${lat},${lng});way["amenity"="hospital"](around:5000,${lat},${lng});node["amenity"="clinic"](around:5000,${lat},${lng});node["amenity"="pharmacy"](around:5000,${lat},${lng});node["healthcare"](around:5000,${lat},${lng}););out center body;`;
    try {
      const ctrl=new AbortController(); setTimeout(()=>ctrl.abort(),25000);
      const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`data=${encodeURIComponent(q)}`,signal:ctrl.signal});
      if (!res.ok) throw new Error('fetch failed');
      const data=await res.json(); const list:NearbyFacility[]=[];
      (data.elements||[]).forEach((el:any)=>{
        try {
          const coords=el.lat&&el.lon?[el.lat,el.lon]:el.center?[el.center.lat,el.center.lon]:null;
          if (!coords||!el.tags) return;
          const name=el.tags.name||el.tags['name:en']||'Healthcare Facility';
          if (name.length<3) return;
          const dist=calcDist(lat,lng,coords[0],coords[1]);
          if (dist>5) return;
          const amenity=el.tags.amenity||el.tags.healthcare||'clinic';
          list.push({id:`osm_${el.type}_${el.id}`,name,type:amenity==='hospital'?'hospital':amenity==='pharmacy'?'pharmacy':'clinic',distance:dist,rating:3.5+Math.random()*1.5,phone:el.tags.phone||'Not available',hours:el.tags.opening_hours||(amenity==='hospital'?'24/7':'Call for hours'),city:el.tags['addr:city'],coordinates:coords as [number,number],emergencyServices:el.tags.emergency==='yes'||amenity==='hospital'});
        } catch { /* skip */ }
      });
      list.sort((a,b)=>a.distance-b.distance); setNearby(list.slice(0,4));
      if (!list.length) setFacError('No facilities found within 5km.');
    } catch(e:any) { setFacError(e.name==='AbortError'?'Request timed out.':'Unable to load facilities.'); }
    finally { setLoadingFac(false); }
  }, [userLoc,calcDist]);

  useEffect(() => { if (userLoc) fetchFacilities(); }, [userLoc,fetchFacilities]);

  // Auto-request location + track permission
  useEffect(() => {
    if (status!=='authenticated'||!navigator.geolocation) return;
    navigator.permissions?.query({ name: 'geolocation' }).then(r => {
      setLocationPermission(r.state as 'granted'|'prompt'|'denied');
      r.onchange = () => setLocationPermission(r.state as 'granted'|'prompt'|'denied');
      if (r.state === 'granted') {
        navigator.geolocation.getCurrentPosition(
          p=>{ setUserLoc([p.coords.latitude, p.coords.longitude]); },
          ()=>{},{enableHighAccuracy:true,timeout:10000,maximumAge:60000}
        );
      }
    }).catch(() => {
      setLocationPermission('unknown');
      navigator.geolocation.getCurrentPosition(
        p=>{ setUserLoc([p.coords.latitude, p.coords.longitude]); },
        ()=>{},{enableHighAccuracy:true,timeout:10000,maximumAge:60000}
      );
    });
  }, [status]);

  const getLocation = useCallback(() => {
    setLoadingLoc(true);
    if (!navigator.geolocation) { setLoadingLoc(false); return; }
    navigator.geolocation.getCurrentPosition(
      p=>{ setUserLoc([p.coords.latitude,p.coords.longitude]); setLocationPermission('granted'); setLoadingLoc(false); },
      ()=>setLoadingLoc(false),
      {enableHighAccuracy:true,timeout:30000,maximumAge:0}
    );
  }, []);

  // Load session history
  useEffect(() => {
    if (status!=='authenticated') return;
    fetch('/api/activities?type=symptom_checked&limit=10').then(r=>r.json()).then(({activities})=>{
      setSessionHistory((activities||[]).map((a:any)=>({date:new Date(a.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),title:(a.title?.slice(0,40)||(a.title?.length>40?'…':''))||'Symptom check',badge:a.metadata?.urgencyLevel||'low',sub:a.description?.slice(0,60)||'Assessment completed',id:a.id})));
    }).catch(()=>{});
  }, [status]);

  // Welcome message
  useEffect(() => {
    if (!showWelcome && messages.length===0) {
      const first=session?.user?.name?.split(' ')[0]||'there';
      setMessages([{id:'welcome',role:'assistant',timestamp:new Date(),content:`Hi ${first}! I'm your AI health assistant, powered by HealthConnect AI.\n\nDescribe how you're feeling and I'll ask follow-up questions to better understand your situation.\n\nHow I can help:\n• Answer questions about symptoms and common health conditions\n• Provide health education and context\n• Help you understand when to seek medical care\n• Discuss possible causes of your symptoms\n\nImportant:\n• I provide information, not diagnoses\n• For life-threatening emergencies, call 193 immediately\n• Always consult a healthcare professional for medical advice\n\nLet's get started — what symptoms or health concerns are you experiencing today?`}]);
    }
  }, [showWelcome,messages.length,session?.user?.name]);

  // Send to AI
  const sendToAI = useCallback(async (history:ChatMessage[],userText:string): Promise<string> => {
    setIsProcessing(true);
    try {
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:'You are a warm, knowledgeable medical information assistant for HealthConnect Navigator in Ghana. Your goal is to gather thorough symptom information through focused conversation. FORMATTING: NEVER use ** bold or # headers. Use • for bullet lists. Ask ONE question at a time. Keep responses under 180 words. For emergencies (chest pain, difficulty breathing, severe bleeding): advise calling 193 immediately. Always end with one follow-up question. Never diagnose. IMPORTANT: append <risk>low|moderate|high|emergency</risk> on the last line of every response.'},...history.map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content})),{role:'user',content:userText}],temperature:0.35,max_tokens:500})});
      if (!res.ok) throw new Error('API error');
      const data=await res.json();
      if (data.riskLevel&&['low','moderate','high','emergency'].includes(data.riskLevel)) setLiveRisk(data.riskLevel);
      return data.message||"I'm sorry, I couldn't process that. Please try again.";
    } catch { return "I'm having trouble connecting. For urgent concerns, visit your nearest clinic or call 193."; }
    finally { setIsProcessing(false); }
  }, []);

  // Handle send
  const handleSend = useCallback(async () => {
    const text=inputVal.trim(); if (!text||isProcessing) return;
    const userMsg:ChatMessage={id:Date.now().toString(),role:'user',content:text,timestamp:new Date()};
    const updated=[...messages,userMsg];
    setMessages(updated); setInputVal('');
    if (textareaRef.current) textareaRef.current.style.height='auto';
    const reply=await sendToAI(updated,text);
    const withReply:ChatMessage[]=[...updated,{id:(Date.now()+1).toString(),role:'assistant',content:reply,timestamp:new Date()}];
    setMessages(withReply);
    if (withReply.filter(m=>m.role==='user').length>=5&&!assessedRef.current) setTimeout(()=>genAssessment(withReply),800);
  }, [inputVal,isProcessing,messages,sendToAI]);

  // Generate assessment
  const genAssessment = useCallback(async (history:ChatMessage[]) => {
    if (assessedRef.current) return; assessedRef.current=true;
    try {
      const summary=history.filter(m=>m.role==='user').map(m=>m.content).join('. ');
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:'You are a medical assessment assistant. Respond ONLY with valid JSON. No markdown, no prose, no code fences.'},{role:'user',content:`Based on this health consultation from a patient in Ghana: "${summary}"\n\nReturn ONLY valid JSON:\n{"urgencyLevel":"low","summary":"2-3 sentence summary","recommendations":["rec1","rec2","rec3"],"redFlags":["flag1","flag2"],"nextSteps":["step1","step2","step3"],"facilityRecommendation":false}\nurgencyLevel: low|moderate|high|emergency`}],temperature:0.1,max_tokens:600})});
      if (!res.ok) return;
      const data=await res.json();
      const result:AssessmentResult=JSON.parse((data.message||'').replace(/```json\n?|```\n?/g,'').trim());
      setAssessment(result); setStep('assessment');
      setSessionHistory(prev=>[{date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),title:summary.split(' ').slice(0,6).join(' ')+'…',badge:result.urgencyLevel==='emergency'?'high':result.urgencyLevel,sub:result.recommendations[0]||'Assessment completed'},...prev].slice(0,5));
      trackActivity(activityTypes.SYMPTOM_CHECKED,'Assessment completed',summary.slice(0,200),{urgencyLevel:result.urgencyLevel}).catch(()=>{});
    } catch(e){ console.error('Assessment error:',e); }
  }, []);

  const startNewChat = useCallback(() => {
    assessedRef.current=false; setStep('chat'); setMessages([]); setAssessment(null); setInputVal(''); setLiveRisk('low'); setCanAssess(false);
  }, []);

  const deleteHistory = useCallback(async (id:string) => {
    await fetch('/api/activities',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).catch(()=>{});
    setSessionHistory(prev=>prev.filter(h=>h.id!==id));
  }, []);

  const handleKeyDown=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{ if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();void handleSend();} };
  const handleTextarea=(e:React.ChangeEvent<HTMLTextAreaElement>)=>{ setInputVal(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; };

  const urgencyColor=(lvl:string)=>({low:'var(--hc-teal,#00D2FF)',moderate:'#fbbf24',high:'#ef4444',emergency:'#dc2626'}[lvl]??'#6b7280');
  const facStatus=(f:NearbyFacility)=>{ const h=new Date().getHours(); if(f.emergencyServices) return{label:'Open 24/7',isOpen:true}; return h>=8&&h<18?{label:'Open Now',isOpen:true}:{label:'Closed',isOpen:false}; };

  const riskLevel   = assessment?.urgencyLevel??liveRisk;
  const userName    = session?.user?.name||'User';
  const userEmail   = session?.user?.email||'';
  const userImage   = session?.user?.image||null;
  const userInit    = userName.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2);
  const userCount   = messages.filter(m=>m.role==='user').length;

  const quickSymptoms=[
    {label:'Headache',icon:<Brain size={13}/>},{label:'Fever',icon:<Thermometer size={13}/>},
    {label:'Chest pain',icon:<Heart size={13}/>},{label:'Nausea',icon:<Activity size={13}/>},
    {label:'Shortness of breath',icon:<Activity size={13}/>},{label:'Back pain',icon:<Activity size={13}/>},
    {label:'Dizziness',icon:<Activity size={13}/>},{label:'Fatigue',icon:<Clock size={13}/>},
    {label:'Sore throat',icon:<Stethoscope size={13}/>},{label:'Stomach pain',icon:<Activity size={13}/>},
  ];

  // Click-outside: close notification panel
  useEffect(() => {
    if (!showNotifPanel) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        notifPanelRef.current && !notifPanelRef.current.contains(t) &&
        notifBellRef.current  && !notifBellRef.current.contains(t)  &&
        notifMobRef.current   && !notifMobRef.current.contains(t)
      ) setShowNotifPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifPanel]);

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

    // Location not granted — most important, always first
    if (!userLoc && locationPermission !== 'granted') {
      list.push({
        id: 'location',
        icon: locationPermission === 'denied' ? AlertCircle : Crosshair,
        color: locationPermission === 'denied' ? 'red' : 'amber',
        title: locationPermission === 'denied'
          ? 'Location access blocked'
          : 'Enable GPS for nearby facilities',
        body: locationPermission === 'denied'
          ? 'Open your browser settings and allow location access to find clinics and hospitals near you.'
          : 'Allow GPS access so we can show the nearest hospitals, clinics and pharmacies during your assessment.',
        action: locationPermission === 'denied' ? undefined : getLocation,
      });
    }

    // Live risk escalations mid-chat
    if (liveRisk === 'emergency' || liveRisk === 'high') {
      list.push({
        id: 'risk',
        icon: liveRisk === 'emergency' ? Phone : AlertTriangle,
        color: 'red',
        title: liveRisk === 'emergency'
          ? 'Emergency symptoms detected'
          : 'High-risk symptoms detected',
        body: liveRisk === 'emergency'
          ? 'Your symptoms suggest a possible emergency. Call 193 immediately or go to the nearest ER.'
          : 'Your symptoms may need prompt medical attention. Consider seeking care today.',
        action: liveRisk === 'emergency'
          ? () => window.open('tel:193', '_self')
          : () => router.push('/facilities'),
      });
    }

    // Moderate risk — quieter amber nudge
    if (liveRisk === 'moderate') {
      list.push({
        id: 'risk-moderate',
        icon: AlertTriangle,
        color: 'amber',
        title: 'Moderate risk symptoms',
        body: 'Your symptoms may need attention. Consider seeing a doctor within 24–48 hours if they persist.',
        action: () => router.push('/facilities'),
      });
    }

    // Assessment ready nudge
    if (canAssess && step === 'chat' && !assessedRef.current) {
      list.push({
        id: 'assess',
        icon: TrendingUp,
        color: 'teal',
        title: 'Full assessment ready',
        body: 'You\'ve shared enough information. Generate your complete AI health assessment report now.',
        action: () => { setShowNotifPanel(false); genAssessment(messages); },
      });
    }

    // Facility recommendation from a completed assessment
    if (assessment?.facilityRecommendation) {
      list.push({
        id: 'facility',
        icon: MapPin,
        color: 'violet',
        title: 'Healthcare facility recommended',
        body: 'Based on your assessment, visiting a clinic or hospital for professional evaluation is advised.',
        action: () => router.push('/facilities'),
      });
    }

    // Facility fetch error (shown in sidebar inline, but many users won't have it open)
    if (facError && userLoc)
      list.push({
        id: 'fac-error',
        icon: AlertCircle,
        color: 'amber',
        title: 'Could not load nearby facilities',
        body: 'The facility search failed. Tap to retry.',
        action: fetchFacilities,
      });

    // GPS granted but no facilities found within range
    if (userLoc && !loadingFac && !facError && nearby.length === 0)
      list.push({
        id: 'no-nearby',
        icon: MapPin,
        color: 'amber',
        title: 'No facilities found within 5 km',
        body: 'There are no mapped healthcare facilities near your location. Try the full facility finder.',
        action: () => router.push('/facilities'),
      });

    // No history yet — onboarding nudge
    if (sessionHistory.length === 0 && messages.filter(m => m.role === 'user').length === 0) {
      list.push({
        id: 'start',
        icon: MessageSquare,
        color: 'mint',
        title: 'Start your first assessment',
        body: 'Describe your symptoms in the chat and our AI will guide you through a personalised health check.',
      });
    }

    if (list.length === 0)
      list.push({ id: 'empty', icon: CheckCircle, color: 'mint', title: 'All caught up!', body: 'No new alerts for this session.' });

    return list;
  }, [userLoc, locationPermission, liveRisk, canAssess, step, assessment, sessionHistory, messages, facError, loadingFac, nearby, getLocation, genAssessment, fetchFacilities, router]);

  const hasUnread = notifications.some(n => n.id !== 'empty' && n.id !== 'start') && !notifsRead;
  const toggleNotifPanel = () => { setShowNotifPanel(p => !p); setNotifsRead(true); };

  if (status==='loading') return <div className="sc-loading"><Bot size={44} className="sc-spin-slow"/><p>Loading AI Symptom Checker…</p></div>;
  if (status==='unauthenticated') return null;

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    
<DashboardLayout activeTab="/symptom-checker" showFooter={true}>

      {/* Welcome modal */}
      {showWelcome && (
        <ModalPortal>
          <div className="sc-overlay" onClick={()=>setShowWelcome(false)}>
            <div className="sc-modal--welcome" onClick={e=>e.stopPropagation()}>
              <div className="sc-modal-header">
                <div className="sc-modal-icon"><Bot size={32}/></div>
                <h3>Welcome to AI Symptom Checker</h3>
                <p>Personalised health insights powered by HealthConnect AI</p>
                <button className="sc-modal-close" onClick={()=>setShowWelcome(false)} type="button"><X size={16}/></button>
              </div>
              <div className="sc-modal-body">
                <div className="sc-disclaimer">
                  <h4><Shield size={14}/> Medical Disclaimer</h4>
                  <ul>
                    <li>This tool provides general health information only</li>
                    <li>It cannot replace professional medical diagnosis</li>
                    <li>Always consult healthcare professionals for medical advice</li>
                    <li>For life-threatening emergencies, call 193 immediately</li>
                  </ul>
                </div>
                <div className="sc-modal-features">
                  <div className="sc-modal-feature"><MessageSquare size={18}/><h5>Interactive Chat</h5><p>Conversational symptom assessment</p></div>
                  <div className="sc-modal-feature"><Brain size={18}/><h5>AI Analysis</h5><p>Advanced health insights</p></div>
                  <div className="sc-modal-feature"><Zap size={18}/><h5>Instant Guidance</h5><p>Immediate information & next steps</p></div>
                </div>
              </div>
              <div className="sc-modal-footer">
                <button className="sc-start-btn" onClick={()=>setShowWelcome(false)} type="button">Start Health Assessment <ChevronRight size={16}/></button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Emergency modal */}
      {showEmergency && (
        <ModalPortal>
          <div className="sc-overlay" onClick={()=>setShowEmergency(false)}>
            <div className="sc-modal--emergency" onClick={e=>e.stopPropagation()}>
              <div className="sc-modal-header--danger">
                <AlertTriangle size={28}/><h2>Emergency Symptoms Detected</h2>
                <button className="sc-modal-close-danger" onClick={()=>setShowEmergency(false)} type="button"><X size={18}/></button>
              </div>
              <div className="sc-modal-body">
                <p className="sc-emergency-copy">If you are experiencing a medical emergency, please seek immediate help. Do not delay — every second counts.</p>
                <div className="sc-emergency-btns">
                  <button className="sc-btn sc-btn--danger" onClick={()=>window.open('tel:193','_self')} type="button"><Phone size={16}/> Call 193 — Emergency Services</button>
                  <button className="sc-btn sc-btn--outline-danger" onClick={()=>router.push('/facilities')} type="button"><MapPin size={16}/> Find Nearest Hospital</button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Main page shell — position:absolute fills hc-layout__main */}
      <div className="sc-page">

        {/* Topbar */}
        <div className="db-topbar">
          <div className="db-topbar__search">
            <button className="db-topbar__search-icon-btn" type="button" onClick={handleSearchSubmit}><Search size={15}/></button>
            <input ref={facRef} className="db-topbar__search-input" type="search" placeholder="Search facilities..." value={facQ} onChange={e=>setFacQ(e.target.value)} onKeyDown={handleSearchKeyDown}/>
            {facQ.trim()&&<button className="db-topbar__search-submit" type="button" onClick={handleSearchSubmit}>Go</button>}
          </div>
          <div className="db-topbar__right">
            <div className="db-topbar__live"><span className="db-topbar__live-dot"/>Live</div>
            <button className="db-topbar__icon-btn" type="button" onClick={toggleDarkMode}>{isDarkMode?<Sun size={18}/>:<Moon size={18}/>}</button>
            <button ref={notifBellRef} className="db-topbar__icon-btn" style={{position:'relative'}} type="button" aria-label="Notifications" onClick={toggleNotifPanel}>
              <Bell size={18}/>{hasUnread && <span className="db-topbar__notif-dot"/>}
            </button>
            <button className="db-topbar__icon-btn sc-emergency-btn" type="button" onClick={()=>setShowEmergency(true)}><Phone size={18}/></button>
            <button className="db-topbar__user" type="button" onClick={()=>router.push('/profile')}>
              <div className="db-topbar__user-avatar">{userImage?<img src={userImage} alt={userName} referrerPolicy="no-referrer"/>:userInit}</div>
              <div className="db-topbar__user-info"><span className="db-topbar__user-name">{userName}</span><span className="db-topbar__user-id">HC-{userEmail.slice(0,5).toUpperCase()}</span></div>
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
                <button className="db-notif-panel__close" onClick={() => setShowNotifPanel(false)} type="button" aria-label="Close"><X size={15}/></button>
              </div>
              <div className="db-notif-panel__list">
                {notifications.map(n => {
                  const Icon = n.icon;
                  return (
                    <button key={n.id} className={`db-notif-item db-notif-item--${n.color}`}
                      onClick={() => { setShowNotifPanel(false); n.action?.(); }}
                      type="button" disabled={!n.action}>
                      <div className={`db-notif-item__icon db-notif-item__icon--${n.color}`}><Icon size={14}/></div>
                      <div className="db-notif-item__body">
                        <p className="db-notif-item__title">{n.title}</p>
                        <p className="db-notif-item__body-text">{n.body}</p>
                      </div>
                      {n.action && <ChevronRight size={13} className="db-notif-item__arrow"/>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="db-notif-overlay" onClick={() => setShowNotifPanel(false)}/>
          </>
        )}

        {/* Mobile top bar — hidden on desktop via CSS */}
        <div className="sc-mob-topbar">
          <div className="sc-mob-topbar__left">
            <Heart size={20} className="sc-mob-topbar__logo-icon"/>
            <span className="sc-mob-topbar__logo-text">HealthConnect</span>
          </div>
          <div className="sc-mob-topbar__right">
            <button className="sc-mob-topbar__btn" type="button" onClick={toggleDarkMode}>{isDarkMode?<Sun size={16}/>:<Moon size={16}/>}</button>
            <button ref={notifMobRef} className="sc-mob-topbar__btn" type="button" style={{position:'relative'}} aria-label="Notifications" onClick={toggleNotifPanel}>
              <Bell size={16}/>{hasUnread && <span className="sc-mob-topbar__bell-dot"/>}
            </button>
            <button className="sc-mob-topbar__sos" type="button" onClick={()=>setShowEmergency(true)}><Phone size={13}/> SOS</button>
            <button className="sc-mob-topbar__avatar-btn" type="button" onClick={()=>router.push('/profile')}>
              <div className="sc-mob-topbar__avatar">{userImage?<img src={userImage} alt={userName} referrerPolicy="no-referrer"/>:userInit}</div>
            </button>
          </div>
        </div>

        {/* Mobile risk bar — hidden on desktop via CSS */}
        <div className="sc-mob-risk-bar">
          <div className="sc-mob-risk-bar__row1">
            <span className="sc-mob-risk-bar__label">Risk Assessment</span>
            <div className="sc-mob-risk-bar__actions">
              <span className={`sc-mob-risk-bar__badge sc-mob-risk-bar__badge--${riskLevel}`}>
                <span className="sc-mob-risk-bar__dot"/>
                {riskLevel==='low'?'Low Risk':riskLevel==='moderate'?'Moderate':riskLevel==='high'?'High Risk':'Emergency'}
              </span>
              <button className="sc-mob-risk-bar__panel-btn" type="button" onClick={()=>setMobPanelOpen(o=>!o)}>
                <TrendingUp size={11}/> Details
              </button>
            </div>
          </div>
          <div className="sc-mob-risk-bar__track-wrap">
            <div className="sc-mob-risk-bar__track">
              <div className="sc-mob-risk-bar__fill" style={{
                width: riskLevel==='low'?'20%':riskLevel==='moderate'?'55%':riskLevel==='high'?'80%':'100%',
                background: urgencyColor(riskLevel),
              }}/>
            </div>
            <div className="sc-mob-risk-bar__ticks"><span>Low</span><span>Moderate</span><span>High</span></div>
          </div>
        </div>

        {/* Mobile quick pills — replaces left sidebar on mobile */}
        <div className="sc-mob-quick-pills">
          {quickSymptoms.map(s=>(
            <button key={s.label} className="sc-mob-quick-pill" type="button"
              onClick={()=>{setInputVal(s.label);textareaRef.current?.focus();}}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Three-column grid */}
        <div className={`sc-grid${rightOpen?' sc-grid--right-open':''}`}>

          {/* Left sidebar */}
          <aside className="sc-left">
            <div className="sc-left-section">
              <p className="sc-section-label">QUICK SYMPTOMS</p>
              <div className="sc-quick-list">
                {quickSymptoms.map(s=>(
                  <button key={s.label} className="sc-quick-btn" type="button" onClick={()=>{setInputVal(s.label);textareaRef.current?.focus();}}>{s.icon} {s.label}</button>
                ))}
              </div>
            </div>
            <div className="sc-left-section sc-left-section--grow">
              <p className="sc-section-label">PAST SESSIONS</p>
              {sessionHistory.length===0
                ? <div className="sc-empty-state"><Clock size={20}/><p>No sessions yet</p><span>Complete a chat to build history</span></div>
                : <div className="sc-hist-list">{sessionHistory.map((h,i)=>(
                    <div key={i} className="sc-hist-item">
                      {h.id&&<button type="button" onClick={()=>deleteHistory(h.id!)} className="sc-hist-delete" aria-label="Delete"><X size={11}/></button>}
                      <p className="sc-hist-date">{h.date}</p>
                      <p className="sc-hist-title">{h.title}</p>
                      <span className={`sc-hist-badge sc-hist-badge--${h.badge}`}>{h.badge==='low'?'Low risk':h.badge==='moderate'?'Moderate':'High risk'} · {h.sub}</span>
                    </div>
                  ))}</div>
              }
            </div>
          </aside>

          {/* Center chat */}
          <div className="sc-center">
            {step==='chat' ? (
              <>
                {/* Chat header */}
                <div className="sc-chat-header">
                  <div className="sc-chat-header-left">
                    <div className="sc-bot-icon"><Bot size={20}/></div>
                    <div><p className="sc-chat-title">AI Symptom Checker</p><p className="sc-chat-subtitle">Powered by HealthConnect AI — Not a medical diagnosis</p></div>
                  </div>
                  <div className="sc-chat-header-right">
                    {userCount>0&&<div className={`sc-risk-pill sc-risk-pill--${riskLevel}`}><span className="sc-risk-dot"/>{riskLevel==='low'?'Low Risk':riskLevel==='moderate'?'Moderate Risk':riskLevel==='high'?'High Risk':'🚨 Emergency'}</div>}
                    {canAssess&&!assessedRef.current&&<button className="sc-header-btn sc-header-btn--teal" onClick={()=>genAssessment(messages)} type="button"><TrendingUp size={13}/> Get Assessment</button>}
                    {userCount>0&&<button className="sc-header-btn" onClick={startNewChat} type="button"><Plus size={13}/> New Chat</button>}
                    <button className={`sc-header-btn${rightOpen?' sc-header-btn--active':''}`} onClick={()=>setRightOpen(o=>!o)} type="button">
                      <Activity size={13}/> {rightOpen?'Hide Panel':'Risk & Facilities'}
                      {!rightOpen&&userCount>0&&<span className="sc-header-btn__dot"/>}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="sc-messages" ref={msgScrollRef}>
                  {messages.map(msg=>(
                    <div key={msg.id} className={`sc-msg sc-msg--${msg.role}`}>
                      <div className={`sc-avatar sc-avatar--${msg.role==='assistant'?'bot':'user'}`}>{msg.role==='assistant'?<Bot size={14}/>:<User size={14}/>}</div>
                      <div className="sc-msg-body">
                        <div className={`sc-bubble sc-bubble--${msg.role==='assistant'?'bot':'user'}`}>{msg.role==='assistant'?renderMarkdown(msg.content):<p className="sc-md-p">{msg.content}</p>}</div>
                        <span className="sc-time">{msg.timestamp.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    </div>
                  ))}
                  {isProcessing&&<div className="sc-msg sc-msg--assistant"><div className="sc-avatar sc-avatar--bot"><Bot size={14}/></div><div className="sc-msg-body"><div className="sc-bubble sc-bubble--bot sc-typing"><span/><span/><span/></div></div></div>}
                  <div ref={msgEndRef}/>
                </div>

                {/* Chips */}
                {userCount===0&&(
                  <div className="sc-chips">
                    {['Nausea','Chest pain','Fever','Dizziness','Headache','Fatigue','Back pain','Shortness of breath'].map(c=>(
                      <button key={c} className="sc-chip" type="button" onClick={()=>{setInputVal(c);textareaRef.current?.focus();}}>{c}</button>
                    ))}
                  </div>
                )}

                {/* Input bar */}
                <div className="sc-input-bar">
                  <div className="sc-input-inner">
                    <textarea ref={textareaRef} value={inputVal} onChange={handleTextarea} onKeyDown={handleKeyDown} placeholder="Describe your symptom or ask a health question…" className="sc-textarea" rows={1} disabled={isProcessing}/>
                    <button className="sc-send" onClick={handleSend} disabled={!inputVal.trim()||isProcessing} type="button" aria-label="Send">
                      {isProcessing?<Loader2 size={16} className="sc-spin"/>:<Send size={16}/>}
                    </button>
                  </div>
                  <p className="sc-input-hint"><Shield size={10}/> AI information only — not a substitute for professional medical advice. Emergency: call 193.</p>
                </div>
              </>
            ) : (
              assessment&&(
                <div className="sc-assess-view">
                  <div className="sc-assess-card">
                    <div className="sc-assess-head" style={{borderLeftColor:urgencyColor(assessment.urgencyLevel)}}>
                      <div className="sc-assess-icon" style={{background:urgencyColor(assessment.urgencyLevel)+'18',color:urgencyColor(assessment.urgencyLevel)}}><TrendingUp size={24}/></div>
                      <div className="sc-assess-head-text"><h2>Health Assessment Report</h2><p>Based on your {userCount} responses</p></div>
                      <div className={`sc-assess-urgency sc-assess-urgency--${assessment.urgencyLevel}`}>{assessment.urgencyLevel==='low'?'✓ Low Risk':assessment.urgencyLevel==='moderate'?'⚠ Moderate':assessment.urgencyLevel==='high'?'⚠ High Risk':'🚨 Emergency'}</div>
                    </div>
                    <div className="sc-assess-body">
                      <section className="sc-assess-section"><h3><FileText size={15}/> Summary</h3><p>{assessment.summary}</p></section>
                      {assessment.recommendations.length>0&&<section className="sc-assess-section"><h3><CheckCircle size={15}/> Recommendations</h3><ul className="sc-assess-list sc-assess-list--bullet">{assessment.recommendations.map((r,i)=><li key={i}>{r}</li>)}</ul></section>}
                      {assessment.redFlags.length>0&&<section className="sc-assess-section sc-assess-section--warn"><h3><AlertTriangle size={15}/> Warning Signs</h3><ul className="sc-assess-list sc-assess-list--warn">{assessment.redFlags.map((f,i)=><li key={i}>{f}</li>)}</ul></section>}
                      <section className="sc-assess-section"><h3><Activity size={15}/> Next Steps</h3><ol className="sc-assess-list sc-assess-list--numbered">{assessment.nextSteps.map((s,i)=><li key={i}>{s}</li>)}</ol></section>
                      {assessment.facilityRecommendation&&<div className="sc-assess-facility-rec"><MapPin size={20}/><div><h4>Healthcare Facility Recommended</h4><p>Based on your symptoms, consider visiting a clinic or hospital for professional evaluation.</p></div></div>}
                    </div>
                    <div className="sc-assess-actions">
                      <button className="sc-btn sc-btn--teal" onClick={()=>router.push('/facilities')} type="button"><MapPin size={14}/> Find Healthcare Facilities</button>
                      <button className="sc-btn sc-btn--ghost" onClick={startNewChat} type="button"><RefreshCw size={14}/> New Assessment</button>
                    </div>
                    <div className="sc-assess-disclaimer"><Shield size={14}/><p>This AI assessment is for informational purposes only and does not constitute medical advice or diagnosis. Always consult a qualified healthcare professional.</p></div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Right panel */}
          <aside className="sc-right">
            <div className="sc-right-inner">
              <div className="sc-right-header">
                <span className="sc-right-title-label">Risk &amp; Facilities</span>
                <button className="sc-right-close" onClick={()=>setRightOpen(false)} type="button"><X size={13}/></button>
              </div>

              <div className="sc-right-block">
                <p className="sc-right-section-title">Risk Assessment</p>
                <div className="sc-risk-row"><span className="sc-risk-label">Current Status</span><span className="sc-risk-value" style={{color:urgencyColor(riskLevel)}}>● {riskLevel==='low'?'Low Risk':riskLevel==='moderate'?'Moderate Risk':riskLevel==='high'?'High Risk':'Emergency'}</span></div>
                <div className="sc-gauge-track"><div className={`sc-gauge-fill sc-gauge-fill--${riskLevel}`}/></div>
                <div className="sc-gauge-labels"><span>Low</span><span>Moderate</span><span>High</span></div>
                <p className="sc-gauge-hint">
                  {userCount===0&&'Start a conversation to begin your risk assessment'}
                  {userCount>0&&riskLevel==='low'&&'Symptoms appear mild. Continue monitoring.'}
                  {userCount>0&&riskLevel==='moderate'&&'Consider seeing a doctor within 24–48 hours.'}
                  {userCount>0&&riskLevel==='high'&&'Seek medical attention soon.'}
                  {userCount>0&&riskLevel==='emergency'&&'🚨 Seek emergency care immediately. Call 193.'}
                </p>
                {canAssess&&step==='chat'&&!assessedRef.current&&(
                  <button className="sc-btn sc-btn--teal" onClick={()=>genAssessment(messages)} type="button" style={{marginTop:10,width:'100%'}}><TrendingUp size={13}/> Generate Full Assessment</button>
                )}
              </div>

              <div className="sc-right-block">
                <p className="sc-right-section-title">Session History {sessionHistory.length>0&&<span className="sc-right-count">{sessionHistory.length}</span>}</p>
                {sessionHistory.length===0
                  ? <p className="sc-right-empty">Complete a chat session to see history here</p>
                  : <div className="sc-sess-list">{sessionHistory.map((h,i)=>(
                      <div key={i} className="sc-sess-item">
                        {h.id&&<button type="button" onClick={()=>deleteHistory(h.id!)} className="sc-hist-delete" aria-label="Delete"><X size={12}/></button>}
                        <p className="sc-sess-date">{h.date}</p>
                        <p className="sc-sess-title-text">{h.title}</p>
                        <p className="sc-sess-sub"><span className={`sc-sess-dot sc-sess-dot--${h.badge}`}/>{h.badge==='low'?'Low risk':h.badge==='moderate'?'Moderate risk':'High risk'} · {h.sub}</p>
                      </div>
                    ))}</div>
                }
              </div>

              <div className="sc-right-block sc-right-block--grow">
                <p className="sc-right-section-title">
                  Nearest Facility
                  {userLoc&&<><button className="sc-right-refresh" onClick={fetchFacilities} disabled={loadingFac} type="button">{loadingFac?<Loader2 size={11} className="sc-spin"/>:<RefreshCw size={11}/>}</button><button className="sc-see-all" onClick={()=>router.push('/facilities')} type="button">See all →</button></>}
                </p>
                {!userLoc&&!loadingFac&&(
                  <div className="sc-fac-enable"><MapPin size={24}/><p>Enable Location</p><span>Allow GPS to find nearby facilities</span>
                    <button className="sc-fac-enable-btn" onClick={getLocation} disabled={loadingLoc} type="button">{loadingLoc?<><Loader2 size={12} className="sc-spin"/> Getting…</>:<><Crosshair size={12}/> Enable GPS</>}</button>
                  </div>
                )}
                {loadingFac&&<div className="sc-fac-state"><Loader2 size={16} className="sc-spin"/><span>Locating nearby facilities…</span></div>}
                {!loadingFac&&facError&&userLoc&&<div className="sc-fac-state sc-fac-state--error"><Crosshair size={15}/><div><p>{facError}</p><button className="sc-link" onClick={fetchFacilities} type="button"><RefreshCw size={11}/> Retry</button></div></div>}
                {!loadingFac&&nearby.length>0&&(
                  <div className="sc-fac-list">
                    {nearby.map(f=>{
                      const {label,isOpen}=facStatus(f);
                      const FIcon=f.type==='hospital'?Hospital:f.type==='pharmacy'?Pill:Stethoscope;
                      return (
                        <div key={f.id} className="db-facility-item">
                          <div className="db-facility-item__header"><div className="db-facility-item__name"><FIcon size={13}/><span>{f.name}</span></div><div className="db-facility-item__rating"><Star size={11}/>{f.rating.toFixed(1)}</div></div>
                          <div className="db-facility-item__meta">{f.type} · {f.distance.toFixed(1)} km{f.city?` · ${f.city}`:''}</div>
                          <div className="db-facility-item__footer">
                            <span className={`db-facility-item__status db-facility-item__status--${isOpen?'open':'closed'}`}><span className="db-facility-item__status-dot"/>{label}</span>
                            <div className="db-facility-item__actions">
                              {f.phone&&f.phone!=='Not available'&&<button className="db-facility-item__btn" onClick={()=>window.open(`tel:${f.phone}`)} type="button"><Phone size={12}/></button>}
                              <button className="db-facility-item__btn" onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.name)}`,'_blank')} type="button"><Navigation size={12}/></button>
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
        {/* Mobile panel sheet — Risk & Facilities bottom sheet */}
        {mobPanelOpen && (
          <>
            <div className="sc-mob-panel-backdrop open" onClick={()=>setMobPanelOpen(false)}/>
            <div className="sc-mob-panel-sheet open">
              <div className="sc-mob-panel-sheet__handle" onClick={()=>setMobPanelOpen(false)}/>
              <div className="sc-mob-panel-sheet__header">
                <span className="sc-mob-panel-sheet__title">Risk &amp; Facilities</span>
                <button className="sc-mob-panel-sheet__close" type="button" onClick={()=>setMobPanelOpen(false)}><X size={14}/></button>
              </div>
              <div className="sc-mob-panel-sheet__body">
                {/* Risk assessment */}
                <div className="sc-right-block">
                  <p className="sc-right-section-title">Risk Assessment</p>
                  <div className="sc-risk-row"><span className="sc-risk-label">Current Status</span><span className="sc-risk-value" style={{color:urgencyColor(riskLevel)}}>● {riskLevel==='low'?'Low Risk':riskLevel==='moderate'?'Moderate Risk':riskLevel==='high'?'High Risk':'Emergency'}</span></div>
                  <div className="sc-gauge-track"><div className={`sc-gauge-fill sc-gauge-fill--${riskLevel}`}/></div>
                  <div className="sc-gauge-labels"><span>Low</span><span>Moderate</span><span>High</span></div>
                  <p className="sc-gauge-hint">
                    {userCount===0&&'Start a conversation to begin your risk assessment'}
                    {userCount>0&&riskLevel==='low'&&'Symptoms appear mild. Continue monitoring.'}
                    {userCount>0&&riskLevel==='moderate'&&'Consider seeing a doctor within 24–48 hours.'}
                    {userCount>0&&riskLevel==='high'&&'Seek medical attention soon.'}
                    {userCount>0&&riskLevel==='emergency'&&'🚨 Seek emergency care immediately. Call 193.'}
                  </p>
                </div>
                {/* Session history */}
                <div className="sc-right-block">
                  <p className="sc-right-section-title">Session History {sessionHistory.length>0&&<span className="sc-right-count">{sessionHistory.length}</span>}</p>
                  {sessionHistory.length===0
                    ? <p className="sc-right-empty">Complete a chat session to see history here</p>
                    : <div className="sc-sess-list">{sessionHistory.map((h,i)=>(
                        <div key={i} className="sc-sess-item">
                          <p className="sc-sess-date">{h.date}</p>
                          <p className="sc-sess-title-text">{h.title}</p>
                          <p className="sc-sess-sub"><span className={`sc-sess-dot sc-sess-dot--${h.badge}`}/>{h.badge==='low'?'Low risk':h.badge==='moderate'?'Moderate risk':'High risk'} · {h.sub}</p>
                        </div>
                      ))}</div>
                  }
                </div>
                {/* Nearest facilities */}
                <div className="sc-right-block">
                  <p className="sc-right-section-title">
                    Nearest Facility
                    {userLoc&&<><button className="sc-right-refresh" onClick={fetchFacilities} disabled={loadingFac} type="button">{loadingFac?<Loader2 size={11} className="sc-spin"/>:<RefreshCw size={11}/>}</button><button className="sc-see-all" onClick={()=>{setMobPanelOpen(false);router.push('/facilities');}} type="button">See all →</button></>}
                  </p>
                  {!userLoc&&!loadingFac&&(
                    <div className="sc-fac-enable"><MapPin size={24}/><p>Enable Location</p><span>Allow GPS to find nearby facilities</span>
                      <button className="sc-fac-enable-btn" onClick={getLocation} disabled={loadingLoc} type="button">{loadingLoc?<><Loader2 size={12} className="sc-spin"/> Getting…</>:<><Crosshair size={12}/> Enable GPS</>}</button>
                    </div>
                  )}
                  {loadingFac&&<div className="sc-fac-state"><Loader2 size={16} className="sc-spin"/><span>Locating nearby facilities…</span></div>}
                  {!loadingFac&&nearby.length>0&&(
                    <div className="sc-fac-list">
                      {nearby.map(f=>{
                        const {label,isOpen}=facStatus(f);
                        const FIcon=f.type==='hospital'?Hospital:f.type==='pharmacy'?Pill:Stethoscope;
                        return (
                          <div key={f.id} className="db-facility-item">
                            <div className="db-facility-item__header"><div className="db-facility-item__name"><FIcon size={13}/><span>{f.name}</span></div><div className="db-facility-item__rating"><Star size={11}/>{f.rating.toFixed(1)}</div></div>
                            <div className="db-facility-item__meta">{f.type} · {f.distance.toFixed(1)} km{f.city?` · ${f.city}`:''}</div>
                            <div className="db-facility-item__footer">
                              <span className={`db-facility-item__status db-facility-item__status--${isOpen?'open':'closed'}`}><span className="db-facility-item__status-dot"/>{label}</span>
                              <div className="db-facility-item__actions">
                                {f.phone&&f.phone!=='Not available'&&<button className="db-facility-item__btn" onClick={()=>window.open(`tel:${f.phone}`)} type="button"><Phone size={12}/></button>}
                                <button className="db-facility-item__btn" onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.name)}`,'_blank')} type="button"><Navigation size={12}/></button>
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

        {/* Mobile bottom tab bar — hidden on desktop via CSS */}
        <nav className="sc-mob-tab-bar">
          <div className="sc-mob-tab-bar__inner">
            <button className="sc-mob-tab-btn" type="button" onClick={()=>router.push('/dashboard')}>
              <Heart size={20}/><span>Home</span>
            </button>
            <button className="sc-mob-tab-btn" type="button" onClick={()=>router.push('/facilities')}>
              <MapPin size={20}/><span>Find</span>
            </button>
            <button className="sc-mob-tab-btn active" type="button">
              <Bot size={20}/><span>Check</span>
            </button>
            <button className="sc-mob-tab-btn" type="button" onClick={()=>router.push('/emergency')}>
              <Phone size={20}/><span>SOS</span><span className="sc-mob-tab-btn__dot"/>
            </button>
            <button className="sc-mob-tab-btn" type="button" onClick={()=>router.push('/profile')}>
              <div className="sc-mob-topbar__avatar" style={{width:22,height:22,fontSize:9}}>{userImage?<img src={userImage} alt={userName} referrerPolicy="no-referrer"/>:userInit}</div>
              <span>Profile</span>
            </button>
          </div>
        </nav>

      </div>
    </DashboardLayout>
  );
}