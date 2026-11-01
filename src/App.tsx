import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  Package,
  Globe2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Copy,
  Check,
  Settings,
  Send,
  RotateCcw,
  BookOpen,
  FileText,
  Clock,
  Radio,
  Award,
  LayoutDashboard,
  Kanban,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Search,
  Database,
  PlusCircle,
  X,
  Filter,
  TrendingUp,
  Users,
  Briefcase,
  MapPin,
  Mail,
  Layers,
} from 'lucide-react';
import {
  APRIROSE_KNOWLEDGE_BASE,
  BuyerFacts,
  GroundedClaim,
  SimulatedMeetingState,
} from './data/apriroseKnowledge';
import {
  CrmLeadRecord,
  CrmStage,
  INITIAL_CRM_LEADS,
  inferAssignedOffice,
} from './data/mockCrmData';
import {
  checkCommercialReadiness,
  checkSimulatedMeetingReadiness,
  extractFactsAndProcessTurn,
} from './lib/apriroseGroundedEngine';
import { GeminiLiveReceptionistClient } from './lib/geminiLiveService';

interface TranscriptTurn {
  id: string;
  role: 'caller' | 'receptionist' | 'system';
  text: string;
  timestamp: string;
  extractedKeys?: string[];
  askedFields?: string[];
}

const CRM_STAGES: CrmStage[] = [
  'New Voice Intake',
  'Qualified for Review',
  'Sourcing & TDS Review',
  'Quotation Issued',
  'Won / Allocated',
];

const QUICK_SCENARIOS = [
  {
    tag: 'RFQ Intake',
    label: 'PP Raffia 100 MT → Tamatave',
    prompt:
      'Hi, we are ABC Plastics Ltd based in Madagascar. We are a manufacturer looking for 100 MT of PP Raffia grade around MFI 3.5, ideally Jinneng, shipped CIF to Tamatave port on LC payment terms, and our monthly consumption is 250 MT per month.',
  },
  {
    tag: 'Contact Details',
    label: 'Caller Name, Email & WhatsApp',
    prompt:
      'My name is John Smith. You can reach me at john.smith@abcplastics.mg and my WhatsApp phone number is +261 34 12 345 67.',
  },
  {
    tag: 'Demo Booking',
    label: 'Book Tomorrow 10:30 AM Mumbai',
    prompt:
      'Can we schedule a sales meeting for tomorrow at 10:30 AM joining from Mumbai, India?',
  },
  {
    tag: 'Timezone Guardrail',
    label: 'Test Ambiguous "930 IST"',
    prompt: 'I would like to book a meeting for Friday at 930 IST.',
  },
  {
    tag: 'Financial Guardrail',
    label: '2025 Revenue ($62M vs $63M) & Scale',
    prompt:
      'What is Aprirose Trading’s 2025 turnover, annual polymer volume, and total employee headcount?',
  },
  {
    tag: 'Polymer Guardrail',
    label: 'Polyurethane vs PVC / PET',
    prompt:
      'Which polyurethanes do you supply, and are PVC or PET considered polyurethanes?',
  },
  {
    tag: 'Directory & Fax',
    label: 'Global Offices & No-Fax Policy',
    prompt: 'Where are your offices located and what is your London fax number?',
  },
  {
    tag: 'Escalation',
    label: 'Transfer to Human Specialist',
    prompt: 'Could I please speak to a human representative from the sales team?',
  },
];

export default function App() {
  // Primary Workspace Navigation
  const [activeWorkspace, setActiveWorkspace] = useState<
    'receptionist' | 'crm' | 'meetings' | 'knowledge'
  >('receptionist');

  // Engine & Connection State
  const [engineMode, setEngineMode] = useState<'gemini-live' | 'browser-voice'>('browser-voice');
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    () => localStorage.getItem('aprirose_gemini_api_key') || ''
  );
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.8-live');
  const [geminiVoice, setGeminiVoice] = useState<string>('Aoede');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showScenariosDrawer, setShowScenariosDrawer] = useState(true);

  const [callStatus, setCallStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected'
  );
  const [statusDetail, setStatusDetail] = useState<string>('Standby · London Trunk Ready');
  const [callSeconds, setCallSeconds] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isListeningStt, setIsListeningStt] = useState(false);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const [audioLevels, setAudioLevels] = useState<{ input: number; output: number }>({
    input: 0,
    output: 0,
  });

  // Live Call Conversation & Active Lead State
  const [activeLeadId, setActiveLeadId] = useState<string>('lead-live-session');
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([
    {
      id: 'welcome-turn',
      role: 'receptionist',
      text: 'Welcome to Aprirose Trading Limited. I can assist you with polymer or chemical procurement, technical grade references, global office routing, or scheduling a simulated commercial meeting. How may I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [buyerFacts, setBuyerFacts] = useState<BuyerFacts>({});
  const [factEvidence, setFactEvidence] = useState<Record<string, string>>({});
  const [meetingState, setMeetingState] = useState<SimulatedMeetingState>({
    status: 'none',
    validationNotes: [],
  });
  const [humanPaused, setHumanPaused] = useState(false);
  const [groundedClaims, setGroundedClaims] = useState<GroundedClaim[]>([]);

  // Mock Backend CRM State
  const [crmLeads, setCrmLeads] = useState<CrmLeadRecord[]>(() => {
    const saved = localStorage.getItem('aprirose_crm_leads_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_CRM_LEADS;
  });
  const [crmViewMode, setCrmViewMode] = useState<'kanban' | 'table'>('kanban');
  const [crmSearch, setCrmSearch] = useState('');
  const [crmOfficeFilter, setCrmOfficeFilter] = useState<string>('ALL');
  const [selectedLead, setSelectedLead] = useState<CrmLeadRecord | null>(null);
  const [backendSyncedAt, setBackendSyncedAt] = useState<string>('Synced');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Knowledge Base Sub-navigation
  const [kbSubTab, setKbSubTab] = useState<
    'guardrails' | 'products' | 'mfi' | 'offices' | 'history' | 'compliance'
  >('guardrails');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Refs
  const liveClientRef = useRef<GeminiLiveReceptionistClient | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const buyerFactsRef = useRef<BuyerFacts>(buyerFacts);
  const meetingStateRef = useRef<SimulatedMeetingState>(meetingState);
  const humanPausedRef = useRef<boolean>(humanPaused);

  useEffect(() => {
    buyerFactsRef.current = buyerFacts;
  }, [buyerFacts]);

  useEffect(() => {
    meetingStateRef.current = meetingState;
  }, [meetingState]);

  useEffect(() => {
    humanPausedRef.current = humanPaused;
  }, [humanPaused]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Call duration timer
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const timer = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  // Initial load from Vite `/api/crm/leads` backend if available
  useEffect(() => {
    fetch('/api/crm/leads')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.leads) && data.leads.length > 0) {
          setCrmLeads(data.leads);
        } else {
          syncLeadsToBackend(crmLeads);
        }
      })
      .catch(() => {
        // Offline / static mode
      });
  }, []);

  const syncLeadsToBackend = (leadsToSave: CrmLeadRecord[]) => {
    localStorage.setItem('aprirose_crm_leads_v2', JSON.stringify(leadsToSave));
    fetch('/api/crm/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: leadsToSave }),
    })
      .then(() => {
        setBackendSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      })
      .catch(() => {});
  };

  // Auto-upsert the active voice call into the CRM Pipeline whenever buyerFacts or meetingState changes
  useEffect(() => {
    const hasAnyFact =
      Object.values(buyerFacts).some((v) => Boolean(v)) || meetingState.status !== 'none';
    if (!hasAnyFact) return;

    const readiness = checkCommercialReadiness(buyerFacts);
    const routing = inferAssignedOffice(buyerFacts);
    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

    setCrmLeads((prev) => {
      const existingIdx = prev.findIndex((l) => l.id === activeLeadId);
      const updatedRecord: CrmLeadRecord = {
        id: activeLeadId,
        referenceCode: existingIdx >= 0 ? prev[existingIdx].referenceCode : 'APR-LIVE-845',
        createdAt: existingIdx >= 0 ? prev[existingIdx].createdAt : nowStamp,
        updatedAt: nowStamp,
        stage:
          readiness.isReady
            ? 'Qualified for Review'
            : existingIdx >= 0
            ? prev[existingIdx].stage
            : 'New Voice Intake',
        assignedOffice: routing.office,
        assignedOwner: routing.owner,
        readinessScore: readiness.score,
        isLiveSession: true,
        callDurationSec: callSeconds || 48,
        facts: { ...buyerFacts },
        factEvidence: { ...factEvidence },
        meeting: { ...meetingState },
        claims: [...groundedClaims],
        notes:
          existingIdx >= 0
            ? prev[existingIdx].notes
            : 'Captured automatically via Aprirose AI Voice Receptionist.',
      };

      const nextList =
        existingIdx >= 0
          ? prev.map((item, i) => (i === existingIdx ? updatedRecord : item))
          : [updatedRecord, ...prev];

      syncLeadsToBackend(nextList);
      return nextList;
    });
  }, [buyerFacts, meetingState, groundedClaims]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Speak text using Browser Neural SpeechSynthesis (used in browser-voice mode)
  const speakText = (text: string) => {
    if (!isTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    // Replace "Aprirose" with phonetic "Apree-rose" for TTS so it never slurs it as "Aprose"
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\bAprirose\b/gi, 'Apree-rose');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => /Google UK English Female|Libby|Sonia|Hazel|Natural/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en-GB')) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.03;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeakingTts(true);
      setAudioLevels({ input: 0, output: 0.7 });
    };
    utterance.onend = () => {
      setIsSpeakingTts(false);
      setAudioLevels({ input: 0, output: 0 });
    };
    utterance.onerror = () => {
      setIsSpeakingTts(false);
      setAudioLevels({ input: 0, output: 0 });
    };

    window.speechSynthesis.speak(utterance);
  };

  // Process a user message through the Grounded Engine (and/or send to Gemini Live)
  const handleCallerInput = (rawText: string, fromGeminiLiveTranscript = false) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    const result = extractFactsAndProcessTurn(
      trimmed,
      buyerFactsRef.current,
      meetingStateRef.current,
      humanPausedRef.current
    );

    const extractedKeys = Object.keys(result.updatedFacts);
    if (extractedKeys.length > 0) {
      setBuyerFacts((prev) => ({ ...prev, ...result.updatedFacts }));
      setFactEvidence((prev) => ({ ...prev, ...result.factEvidence }));
    }

    if (result.updatedMeeting) {
      setMeetingState((prev) => ({ ...prev, ...result.updatedMeeting }));
    }

    if (result.humanHandoffTriggered) {
      setHumanPaused(true);
    } else if (result.humanHandoffResumed) {
      setHumanPaused(false);
    }

    if (result.claims.length > 0) {
      setGroundedClaims((prev) => [...result.claims, ...prev]);
    }

    if (!fromGeminiLiveTranscript) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const callerTurn: TranscriptTurn = {
        id: `caller-${Date.now()}`,
        role: 'caller',
        text: trimmed,
        timestamp: now,
        extractedKeys,
      };

      if (engineMode === 'gemini-live' && callStatus === 'connected' && liveClientRef.current) {
        setTranscript((prev) => [...prev, callerTurn]);
        liveClientRef.current.sendTextMessage(trimmed);
        return;
      }

      const receptionistTurn: TranscriptTurn = {
        id: `rec-${Date.now() + 1}`,
        role: 'receptionist',
        text: result.replyText,
        timestamp: now,
        askedFields: result.askedFields,
      };

      setTranscript((prev) => [...prev, callerTurn, receptionistTurn]);
      speakText(result.replyText);
    }
  };

  // Start or Stop Call
  const handleToggleCall = async () => {
    if (callStatus === 'connected' || callStatus === 'connecting') {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsListeningStt(false);
      setIsSpeakingTts(false);
      setCallStatus('disconnected');
      setStatusDetail('Call Ended · Lead Synced to CRM');
      return;
    }

    setCallSeconds(0);

    if (engineMode === 'gemini-live') {
      if (!geminiApiKey.trim()) {
        setShowSettingsModal(true);
        return;
      }

      const client = new GeminiLiveReceptionistClient({
        onStatusChange: (status, detail) => {
          setCallStatus(status);
          if (detail) setStatusDetail(detail);
        },
        onUserTranscript: (text, isFinal) => {
          if (isFinal && text.trim()) {
            handleCallerInput(text, true);
          }
          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'caller' && last.id.startsWith('live-user-')) {
              return [
                ...prev.slice(0, -1),
                { ...last, text: isFinal ? text : `${last.text} ${text}`.trim() },
              ];
            }
            return [
              ...prev,
              {
                id: isFinal ? `caller-final-${Date.now()}` : `live-user-${Date.now()}`,
                role: 'caller',
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
          });
        },
        onAssistantTranscript: (text, isFinal) => {
          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'receptionist' && last.id.startsWith('live-rec-')) {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  id: isFinal ? `rec-final-${Date.now()}` : last.id,
                  text: `${last.text}${text}`,
                },
              ];
            }
            return [
              ...prev,
              {
                id: isFinal ? `rec-final-${Date.now()}` : `live-rec-${Date.now()}`,
                role: 'receptionist',
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
          });
        },
        onFactsUpdated: (facts, evidence) => {
          setBuyerFacts((prev) => ({ ...prev, ...facts }));
          if (evidence) setFactEvidence((prev) => ({ ...prev, ...evidence }));
        },
        onMeetingUpdated: (meeting) => {
          setMeetingState((prev) => ({ ...prev, ...meeting }));
        },
        onHumanHandoff: (paused) => {
          setHumanPaused(paused);
        },
        onAudioLevel: (input, output) => {
          setAudioLevels({ input, output });
        },
      });

      liveClientRef.current = client;
      try {
        await client.connect(geminiApiKey.trim(), geminiModel, geminiVoice);
      } catch {
        // handled in callback
      }
    } else {
      setCallStatus('connected');
      setStatusDetail('Live Voice Session · London Desk');
      speakText(
        'Welcome to Aprirose Trading Limited. How can I help you with your polymer or chemical requirements today?'
      );
      startBrowserSpeechRecognition();
    }
  };

  const startBrowserSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusDetail('Voice Active (Use caller prompt chips or text bar)');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-GB';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListeningStt(true);
    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult && lastResult.isFinal) {
        const spoken = lastResult[0].transcript;
        if (spoken && spoken.trim()) {
          handleCallerInput(spoken.trim(), false);
        }
      }
    };
    recognition.onerror = () => setIsListeningStt(false);
    recognition.onend = () => setIsListeningStt(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // ignore
    }
  };

  const handleToggleMicMute = () => {
    const nextMute = !isMicMuted;
    setIsMicMuted(nextMute);
    if (liveClientRef.current) {
      liveClientRef.current.setMuted(nextMute);
    }
    if (engineMode === 'browser-voice' && recognitionRef.current) {
      if (nextMute) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      } else if (callStatus === 'connected') {
        startBrowserSpeechRecognition();
      }
    }
  };

  const handleStartFreshCallSession = () => {
    const newId = `lead-live-${Date.now()}`;
    setActiveLeadId(newId);
    setBuyerFacts({});
    setFactEvidence({});
    setMeetingState({ status: 'none', validationNotes: [] });
    setHumanPaused(false);
    setGroundedClaims([]);
    setCallSeconds(0);
    setTranscript([
      {
        id: `welcome-${Date.now()}`,
        role: 'receptionist',
        text: 'Welcome to Aprirose Trading Limited. How can we assist you with your polymer or chemical inquiry today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showToast('Started fresh caller intake session');
  };

  const handleUpdateLeadStage = (leadId: string, newStage: CrmStage) => {
    setCrmLeads((prev) => {
      const next = prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              stage: newStage,
              updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : l
      );
      syncLeadsToBackend(next);
      return next;
    });
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, stage: newStage } : null));
    }
    showToast(`Moved inquiry to "${newStage}"`);
  };

  const readiness = checkCommercialReadiness(buyerFacts);
  const activeOfficeRouting = inferAssignedOffice(buyerFacts);

  const formatLeadSummaryText = (facts: BuyerFacts = buyerFacts, meeting: SimulatedMeetingState = meetingState) => {
    return [
      'New Buyer Inquiry — Aprirose Trading Limited',
      `• Company: ${facts.company || 'Pending'}`,
      `• Country: ${facts.companyCountry || 'Pending'}`,
      `• Buyer Type: ${facts.buyerType || 'Pending'}`,
      `• Product: ${facts.material || 'Pending'}${facts.application ? ` (${facts.application})` : ''}`,
      `• Grade / MFI: ${[facts.requestedGrade, facts.mfi, facts.preferredProducer].filter(Boolean).join(' | ') || 'For commercial discussion'}`,
      `• Order Quantity: ${facts.quantity || 'Pending'}`,
      `• Monthly Volume: ${facts.monthlyVolume || 'Not specified'}`,
      `• Payment Term: ${facts.paymentTermsRequested || 'Not specified'}`,
      `• Shipping Term: ${facts.shippingTermRequested || 'Not specified'}`,
      `• Destination: ${[facts.dischargePort, facts.destinationCity, facts.destinationCountry].filter(Boolean).join(', ') || 'Pending'}`,
      `• Contact: ${facts.contactName || 'Pending'}`,
      `• Email: ${facts.email || 'Pending'}`,
      `• WhatsApp / Phone: ${facts.phone || 'Pending'}`,
      `• Simulated Meeting: ${
        meeting.status === 'demo_booked'
          ? `DEMO BOOKED — ${meeting.date} at ${meeting.clockTime} ${meeting.amPm || ''} (${meeting.timezone})`
          : 'Not booked'
      }`,
    ].join('\n');
  };

  const handleCopySummary = (facts?: BuyerFacts, meeting?: SimulatedMeetingState) => {
    navigator.clipboard.writeText(formatLeadSummaryText(facts, meeting));
    setCopiedSummary(true);
    showToast('Copied Sales RFQ Summary to clipboard');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Filtered CRM leads
  const filteredLeads = crmLeads.filter((lead) => {
    const matchesOffice = crmOfficeFilter === 'ALL' || lead.assignedOffice === crmOfficeFilter;
    const q = crmSearch.toLowerCase().trim();
    if (!q) return matchesOffice;
    const hay = `${lead.referenceCode} ${lead.facts.company || ''} ${lead.facts.companyCountry || ''} ${lead.facts.material || ''} ${lead.facts.contactName || ''} ${lead.facts.dischargePort || ''}`.toLowerCase();
    return matchesOffice && hay.includes(q);
  });

  const bookedMeetingsList = crmLeads.filter((l) => l.meeting.status === 'demo_booked' || l.meeting.status === 'collecting');

  return (
    <div className="min-h-screen flex bg-[#F0F4F3] text-[#0B2528]">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#082225] text-white px-4 py-2.5 rounded-xl shadow-xl border border-[#C4975A]/50 flex items-center gap-2.5 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#C4975A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT EXECUTIVE NAVIGATION SIDEBAR */}
      <aside className="w-64 bg-[#071E21] text-white flex flex-col justify-between shrink-0 border-r border-[#14393E] select-none">
        <div>
          {/* Brand Crest */}
          <div className="px-6 py-5 border-b border-[#13363A]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C4975A] to-[#8F6834] flex items-center justify-center font-serif-editorial font-bold text-white text-base shadow-sm">
                A
              </div>
              <div>
                <div className="tracking-[0.22em] font-semibold text-sm text-white">APRIROSE</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#C4975A] font-medium">
                  Trading Limited · UK
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[#7FA4A8] bg-[#0C2A2E] px-2.5 py-1.5 rounded-lg border border-[#163F44]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                CRM Backend Online
              </span>
              <span className="font-mono-tech text-[10px] text-[#A5C3C6]">Rev 1529929</span>
            </div>
          </div>

          {/* Primary Navigation Items */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-mono-tech uppercase tracking-widest text-[#648C90]">
              Commercial Operations
            </div>

            <button
              onClick={() => setActiveWorkspace('receptionist')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeWorkspace === 'receptionist'
                  ? 'bg-[#123A3F] text-white border border-[#C4975A]/40 shadow-xs'
                  : 'text-[#9BBABF] hover:bg-[#0C2A2E] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#C4975A]" />
                Voice Reception Desk
              </span>
              {callStatus === 'connected' && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-tech text-[10px]">
                  LIVE
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveWorkspace('crm')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeWorkspace === 'crm'
                  ? 'bg-[#123A3F] text-white border border-[#C4975A]/40 shadow-xs'
                  : 'text-[#9BBABF] hover:bg-[#0C2A2E] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Kanban className="w-4 h-4 text-[#C4975A]" />
                CRM Deal Pipeline
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#0C2A2E] text-[#C4975A] font-mono-tech text-[10px] border border-[#1B494F]">
                {crmLeads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveWorkspace('meetings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeWorkspace === 'meetings'
                  ? 'bg-[#123A3F] text-white border border-[#C4975A]/40 shadow-xs'
                  : 'text-[#9BBABF] hover:bg-[#0C2A2E] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#C4975A]" />
                Simulated Meetings
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#0C2A2E] text-emerald-300 font-mono-tech text-[10px] border border-[#1B494F]">
                {bookedMeetingsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveWorkspace('knowledge')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeWorkspace === 'knowledge'
                  ? 'bg-[#123A3F] text-white border border-[#C4975A]/40 shadow-xs'
                  : 'text-[#9BBABF] hover:bg-[#0C2A2E] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[#C4975A]" />
                Knowledge & Guardrails
              </span>
              <span className="text-[10px] font-mono-tech text-[#7FA4A8]">38p</span>
            </button>
          </nav>

          {/* Regional Desks Status */}
          <div className="px-4 py-3 mt-2">
            <div className="px-2 py-1 text-[10px] font-mono-tech uppercase tracking-widest text-[#648C90]">
              Global Commercial Desks
            </div>
            <div className="mt-1.5 space-y-1.5 text-[11px] text-[#9BBABF]">
              {[
                { city: 'London HQ', contact: 'parag@aprirose.com', active: activeOfficeRouting.office === 'London HQ' },
                { city: 'Dubai (DMCC)', contact: 'bijal@aprirose.com', active: activeOfficeRouting.office === 'Dubai Branch (DMCC)' },
                { city: 'Nairobi Hub', contact: 'esther@aprirose.com', active: activeOfficeRouting.office === 'Nairobi Regional Hub' },
                { city: 'Mumbai Desk', contact: 'kartik@aprirose.com', active: activeOfficeRouting.office === 'Mumbai Desk' },
                { city: 'Incheon Office', contact: 'skbahn@aprirose.com', active: activeOfficeRouting.office === 'Incheon Office' },
                { city: 'Ha Noi Desk', contact: 'katy@aprirose.com', active: activeOfficeRouting.office === 'Ha Noi Desk' },
              ].map((desk) => (
                <div
                  key={desk.city}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
                    desk.active
                      ? 'bg-[#C4975A]/15 text-white border border-[#C4975A]/40'
                      : 'hover:bg-[#0C2A2E]'
                  }`}
                >
                  <span className="font-medium">{desk.city}</span>
                  <span className="text-[10px] font-mono-tech text-[#7FA4A8]">{desk.contact.split('@')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Voice Engine Card */}
        <div className="p-4 border-t border-[#13363A] bg-[#051719]">
          <div className="text-[11px] text-[#9BBABF] flex items-center justify-between mb-2">
            <span>Voice AI Stack</span>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-[#C4975A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              Configure
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-[#0C2A2E] p-1 rounded-lg border border-[#163F44]">
            <button
              onClick={() => setEngineMode('browser-voice')}
              className={`py-1.5 px-2 rounded text-[11px] font-medium transition cursor-pointer ${
                engineMode === 'browser-voice'
                  ? 'bg-[#C4975A] text-white'
                  : 'text-[#89AEB2] hover:text-white'
              }`}
            >
              Instant Voice
            </button>
            <button
              onClick={() => {
                setEngineMode('gemini-live');
                if (!geminiApiKey) setShowSettingsModal(true);
              }}
              className={`py-1.5 px-2 rounded text-[11px] font-medium transition cursor-pointer ${
                engineMode === 'gemini-live'
                  ? 'bg-[#C4975A] text-white'
                  : 'text-[#89AEB2] hover:text-white'
              }`}
            >
              Gemini 3.8 Live
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP COMMAND HEADER */}
        <header className="bg-white border-b border-[#D5E2E0] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-serif-editorial font-semibold text-[#082225]">
                {activeWorkspace === 'receptionist' && 'AI Voice Receptionist & Live Qualification Desk'}
                {activeWorkspace === 'crm' && 'Enterprise B2B CRM Deal Pipeline & RFQ Desk'}
                {activeWorkspace === 'meetings' && 'Simulated Sales Meetings & Timezone Dispatch'}
                {activeWorkspace === 'knowledge' && 'Aprirose Corporate Knowledge Base & Guardrail Audit'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono-tech bg-[#EAF2F1] text-[#0D3438] border border-[#C5D8D6]">
                Snapshot: 25 Oct 2026
              </span>
            </div>
            <p className="text-xs text-[#527378] mt-0.5">
              Polymers · Industrial Chemicals · Masterbatches · Global Supply Chain Facilitation (Europe · Africa · Asia)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4F8F7] border border-[#D5E2E0] text-xs text-[#385A5E]">
              <Database className="w-3.5 h-3.5 text-[#C4975A]" />
              <span>CRM API:</span>
              <span className="font-mono-tech font-medium text-[#082225]">{backendSyncedAt}</span>
            </div>

            <button
              onClick={handleStartFreshCallSession}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F2F6F5] text-[#0D3438] border border-[#C6D6D5] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#C4975A]" />
              New Caller Session
            </button>

            <button
              onClick={() => {
                const liveRecord = crmLeads.find((l) => l.id === activeLeadId) || crmLeads[0];
                if (liveRecord) setSelectedLead(liveRecord);
                setActiveWorkspace('crm');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#082225] hover:bg-[#113A3F] text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <span>Open in CRM Deal Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#C4975A]" />
            </button>
          </div>
        </header>

        {/* WORKSPACE 1: VOICE RECEPTIONIST DESK */}
        {activeWorkspace === 'receptionist' && (
          <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
            {/* LEFT 6 COLS: TELEPHONY POD & LIVE TRANSCRIPT */}
            <div className="xl:col-span-6 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-[#D2DFDD] shadow-xs overflow-hidden flex flex-col flex-1">
                {/* Dark Executive Telephony Header */}
                <div className="bg-gradient-to-br from-[#071E21] via-[#0D3438] to-[#082225] p-6 text-white">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          callStatus === 'connected'
                            ? 'bg-emerald-400 animate-pulse'
                            : callStatus === 'connecting'
                            ? 'bg-amber-400 animate-ping'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className="text-xs font-mono-tech uppercase tracking-wider text-[#B6D2D5]">
                        {statusDetail}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {humanPaused && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-200 border border-amber-400/40 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Human Escalation (Intake Paused)
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-white/10 font-mono-tech text-xs text-white border border-white/10">
                        {formatTimer(callSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Call Orb & Equalizer Bars */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
                    <div className="flex items-center gap-5">
                      <div className="relative flex items-center justify-center">
                        {(callStatus === 'connected' || isSpeakingTts || isListeningStt) && (
                          <div
                            className="absolute w-24 h-24 rounded-full bg-[#C4975A]/30 animate-pulse-ring"
                            style={{
                              transform: `scale(${1 + Math.max(audioLevels.input, audioLevels.output) * 0.4})`,
                            }}
                          />
                        )}
                        <button
                          onClick={handleToggleCall}
                          className={`relative z-10 w-18 h-18 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 shadow-lg cursor-pointer ${
                            callStatus === 'connected'
                              ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-400/25'
                              : 'bg-[#C4975A] hover:bg-[#B08347] text-white ring-4 ring-[#C4975A]/25'
                          }`}
                        >
                          {callStatus === 'connected' ? (
                            <>
                              <PhoneOff className="w-6 h-6 mb-0.5" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider">End</span>
                            </>
                          ) : (
                            <>
                              <Phone className="w-6 h-6 mb-0.5" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider">Start</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div>
                        <div className="text-xs font-mono-tech uppercase tracking-wider text-[#C4975A]">
                          Inbound Trade Line · +44 20 8951 0377
                        </div>
                        <h2 className="text-lg font-serif-editorial font-semibold text-white mt-0.5">
                          Aprirose AI Commercial Receptionist
                        </h2>
                        <p className="text-xs text-[#9BBABF] mt-0.5">
                          {isSpeakingTts
                            ? 'Speaking with caller (Ap-ree-rose Trading)...'
                            : isListeningStt
                            ? 'Listening to caller microphone...'
                            : callStatus === 'connected'
                            ? 'Line open — Speak naturally or trigger a demo prompt below'
                            : 'Click Start to open live voice line or test any scenario below'}
                        </p>
                      </div>
                    </div>

                    {/* Audio Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleMicMute}
                        className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                          isMicMuted
                            ? 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                            : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                        }`}
                      >
                        {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        <span>{isMicMuted ? 'Muted' : 'Mic'}</span>
                      </button>

                      <button
                        onClick={() => {
                          const next = !isTtsEnabled;
                          setIsTtsEnabled(next);
                          if (!next && 'speechSynthesis' in window) {
                            window.speechSynthesis.cancel();
                            setIsSpeakingTts(false);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                          !isTtsEnabled
                            ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                            : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                        }`}
                      >
                        {isTtsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        <span>{isTtsEnabled ? 'Speaker' : 'Silent'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Demo Scenarios Bar */}
                <div className="bg-[#EEF4F3] border-b border-[#D2DFDD]">
                  <button
                    onClick={() => setShowScenariosDrawer(!showScenariosDrawer)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-[#174247] hover:bg-[#E4EEEC] transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#C4975A]" />
                      Interactive Client Demo Scenarios (One-Click Spoken Caller Utterances)
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showScenariosDrawer ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showScenariosDrawer && (
                    <div className="px-4 pb-3.5 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {QUICK_SCENARIOS.map((sc, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCallerInput(sc.prompt, false)}
                          className="text-left px-3 py-2 rounded-xl bg-white hover:bg-[#082225] text-[#0B2528] hover:text-white border border-[#C6D6D5] transition group cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[#C4975A]">
                              {sc.tag}
                            </div>
                            <div className="text-xs font-medium truncate">{sc.label}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Conversation Transcript */}
                <div className="p-5 flex-1 min-h-[360px] max-h-[450px] overflow-y-auto space-y-3.5 bg-[#F9FBFA]">
                  {transcript.map((turn) => (
                    <div
                      key={turn.id}
                      className={`flex flex-col ${
                        turn.role === 'caller' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-semibold text-[#4A6B70]">
                          {turn.role === 'caller' ? 'Caller (Buyer Line)' : 'Aprirose AI Receptionist'}
                        </span>
                        <span className="text-[10px] text-[#7A969A] font-mono-tech">{turn.timestamp}</span>
                        {turn.role === 'receptionist' && (
                          <button
                            onClick={() => speakText(turn.text)}
                            className="text-[#4A6B70] hover:text-[#082225] cursor-pointer"
                            title="Replay spoken audio"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                          turn.role === 'caller'
                            ? 'bg-[#082225] text-white rounded-br-xs'
                            : 'bg-white text-[#0B2528] border border-[#D2DFDD] rounded-bl-xs'
                        }`}
                      >
                        <p>{turn.text}</p>

                        {turn.extractedKeys && turn.extractedKeys.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/15 flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-mono-tech text-[#A2C1C4] mr-1">
                              CRM Extracted:
                            </span>
                            {turn.extractedKeys.map((k) => (
                              <span
                                key={k}
                                className="text-[10px] font-mono-tech px-1.5 py-0.5 rounded bg-[#C4975A]/30 text-[#F7E8D4]"
                              >
                                +{k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>

                {/* Caller Utterance Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!inputText.trim()) return;
                    handleCallerInput(inputText, false);
                    setInputText('');
                  }}
                  className="p-3.5 bg-white border-t border-[#D2DFDD] flex items-center gap-2.5"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Speak into microphone or type caller statement..."
                    className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-[#C6D6D5] bg-[#F5F8F7] focus:outline-none focus:border-[#082225]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#082225] hover:bg-[#113A3F] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#C4975A]" />
                    Send
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT 6 COLS: REAL-TIME CRM LEAD BUILDER & SIMULATED MEETING GATE */}
            <div className="xl:col-span-6 flex flex-col gap-4">
              {/* Live Lead Summary & Regional Routing Card */}
              <div className="bg-white rounded-2xl border border-[#D2DFDD] p-6 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#E5EEED]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-tech uppercase tracking-wider bg-[#C4975A]/15 text-[#946B33] font-semibold">
                        Live CRM Intake · APR-LIVE-845
                      </span>
                      <span className="text-xs font-medium text-[#4A6B70]">
                        Routed to: <strong className="text-[#082225]">{activeOfficeRouting.office}</strong>
                      </span>
                    </div>
                    <h3 className="text-lg font-serif-editorial font-semibold text-[#082225] mt-1">
                      {buyerFacts.company || 'Awaiting Caller Company Identification...'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopySummary()}
                      className="px-3 py-1.5 rounded-xl bg-[#EEF4F3] hover:bg-[#DCE8E6] text-[#082225] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedSummary ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Sales Summary
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Readiness Bar */}
                <div className="my-4 p-3.5 rounded-xl bg-[#F5F9F8] border border-[#D8E5E3]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#082225]">
                      Commercial Qualification Readiness
                    </span>
                    <span
                      className={`font-mono-tech font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                        readiness.isReady
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {readiness.isReady ? '100% · Ready for Quotation' : `${readiness.score}% Qualified`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#DCE7E6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#082225] to-[#C4975A] transition-all duration-300"
                      style={{ width: `${readiness.score}%` }}
                    />
                  </div>
                  {!readiness.isReady && (
                    <p className="text-[11px] text-[#527378] mt-2">
                      <strong>Pending Intake:</strong> {readiness.missingCore.join(' · ')}
                    </p>
                  )}
                </div>

                {/* Structured Qualification Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#FAFDFC] border border-[#E2ECEB]">
                    <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[#64878B]">
                      Buyer & Organization
                    </div>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Company:</span>
                        <span className="font-semibold text-[#082225]">{buyerFacts.company || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Country:</span>
                        <span className="font-semibold text-[#082225]">{buyerFacts.companyCountry || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Activity Type:</span>
                        <span className="font-semibold text-[#082225]">{buyerFacts.buyerType || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAFDFC] border border-[#E2ECEB]">
                    <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[#64878B]">
                      Material & Technical Spec
                    </div>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Product Family:</span>
                        <span className="font-semibold text-[#082225]">{buyerFacts.material || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Application:</span>
                        <span className="font-semibold text-[#082225]">{buyerFacts.application || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">MFI / Producer:</span>
                        <span className="font-mono-tech font-semibold text-[#946B33]">
                          {[buyerFacts.mfi, buyerFacts.preferredProducer].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAFDFC] border border-[#E2ECEB]">
                    <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[#64878B]">
                      Volume & Logistics (Strictly Independent)
                    </div>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Order Quantity:</span>
                        <span className="font-mono-tech font-semibold text-[#082225]">
                          {buyerFacts.quantity || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Monthly Volume:</span>
                        <span className="font-mono-tech font-semibold text-[#082225]">
                          {buyerFacts.monthlyVolume || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Discharge Port:</span>
                        <span className="font-semibold text-[#082225]">
                          {[buyerFacts.dischargePort, buyerFacts.destinationCountry].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAFDFC] border border-[#E2ECEB]">
                    <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[#64878B]">
                      Commercial Terms & Contact
                    </div>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Payment / Incoterm:</span>
                        <span className="font-mono-tech font-semibold text-[#082225]">
                          {[buyerFacts.paymentTermsRequested, buyerFacts.shippingTermRequested]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Caller Name:</span>
                        <span className="font-semibold text-[#082225]">{buyerFacts.contactName || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Reachable Contact:</span>
                        <span className="font-mono-tech text-[#082225] truncate max-w-[160px]">
                          {buyerFacts.email || buyerFacts.phone || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated Meeting Booking Gate Card */}
              <div className="bg-white rounded-2xl border border-[#D2DFDD] p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5EEED]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#EEF4F3] flex items-center justify-center text-[#082225]">
                      <Calendar className="w-4 h-4 text-[#C4975A]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-serif-editorial font-semibold text-[#082225]">
                        Simulated Meeting Booking Gate
                      </h4>
                      <p className="text-[11px] text-[#527378]">
                        Validates 4 required criteria + IANA timezone aliases before marking `Demo booked`
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-mono-tech font-semibold ${
                      meetingState.status === 'demo_booked'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : meetingState.status === 'collecting'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {meetingState.status === 'demo_booked'
                      ? 'DEMO BOOKED'
                      : meetingState.status === 'collecting'
                      ? 'COLLECTING SLOT'
                      : 'STANDBY'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 my-3.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#F5F9F8] border border-[#DCE7E6]">
                    <div className="text-[10px] text-[#527378]">Requested Date</div>
                    <div className="font-semibold text-[#082225] mt-0.5">{meetingState.date || '—'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F5F9F8] border border-[#DCE7E6]">
                    <div className="text-[10px] text-[#527378]">Clock & AM/PM</div>
                    <div className="font-mono-tech font-semibold text-[#082225] mt-0.5">
                      {meetingState.clockTime
                        ? `${meetingState.clockTime} ${meetingState.amPm || ''}`
                        : '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F5F9F8] border border-[#DCE7E6]">
                    <div className="text-[10px] text-[#527378]">Joining Timezone</div>
                    <div className="font-mono-tech font-semibold text-[#946B33] mt-0.5 truncate">
                      {meetingState.timezone || '—'}
                    </div>
                  </div>
                </div>

                {meetingState.validationNotes && meetingState.validationNotes.length > 0 && (
                  <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{meetingState.validationNotes.join(' ')}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Name & Company', ok: Boolean(buyerFacts.contactName && buyerFacts.company) },
                    { label: 'Both Email & Phone', ok: Boolean(buyerFacts.email && buyerFacts.phone) },
                    { label: 'Material Requirement', ok: Boolean(buyerFacts.material) },
                    {
                      label: 'Valid Date, AM/PM & Timezone',
                      ok: Boolean(
                        meetingState.date &&
                          meetingState.clockTime &&
                          meetingState.amPm !== 'ambiguous' &&
                          meetingState.timezone &&
                          !meetingState.timezone.includes('Ambiguous')
                      ),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                        item.ok
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : 'bg-[#FAFDFC] border-[#E5EEED] text-[#64878B]'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          item.ok ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE 2: MOCK BACKEND CRM DEAL PIPELINE */}
        {activeWorkspace === 'crm' && (
          <div className="p-6 space-y-5 flex-1">
            {/* Executive KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-[#D2DFDD] shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono-tech uppercase tracking-wider text-[#527378]">
                    Active B2B Inquiries
                  </span>
                  <div className="text-2xl font-serif-editorial font-bold text-[#082225] mt-1">
                    {crmLeads.length} Deals
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Synced with `/api/crm/leads`
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#EEF4F3] flex items-center justify-center text-[#082225]">
                  <Briefcase className="w-5 h-5 text-[#C4975A]" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#D2DFDD] shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono-tech uppercase tracking-wider text-[#527378]">
                    Pipeline Polymer & Chem Vol
                  </span>
                  <div className="text-2xl font-serif-editorial font-bold text-[#082225] mt-1">
                    1,050+ MT
                  </div>
                  <span className="text-[11px] text-[#527378]">
                    Plus 4 FCL container orders
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#EEF4F3] flex items-center justify-center text-[#082225]">
                  <TrendingUp className="w-5 h-5 text-[#C4975A]" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#D2DFDD] shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono-tech uppercase tracking-wider text-[#527378]">
                    Demo Meetings Booked
                  </span>
                  <div className="text-2xl font-serif-editorial font-bold text-[#082225] mt-1">
                    {crmLeads.filter((l) => l.meeting.status === 'demo_booked').length} Confirmed
                  </div>
                  <span className="text-[11px] text-[#527378]">
                    Across Nairobi, Dubai & Mumbai
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#EEF4F3] flex items-center justify-center text-[#082225]">
                  <Calendar className="w-5 h-5 text-[#C4975A]" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#D2DFDD] shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono-tech uppercase tracking-wider text-[#527378]">
                    Avg Qualification Score
                  </span>
                  <div className="text-2xl font-serif-editorial font-bold text-[#082225] mt-1">
                    {Math.round(
                      crmLeads.reduce((acc, l) => acc + l.readinessScore, 0) /
                        Math.max(1, crmLeads.length)
                    )}
                    %
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    25-Field Automated Extraction
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-[#EEF4F3] flex items-center justify-center text-[#082225]">
                  <ShieldCheck className="w-5 h-5 text-[#C4975A]" />
                </div>
              </div>
            </div>

            {/* Filter & View Switcher Bar */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#D2DFDD] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative min-w-[240px] flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#64878B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    placeholder="Search company, material (PP, HDPE, Labsa), port (Mombasa, Tamatave)..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#C6D6D5] bg-[#F6F9F8] text-xs focus:outline-none focus:border-[#082225]"
                  />
                </div>

                <select
                  value={crmOfficeFilter}
                  onChange={(e) => setCrmOfficeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#C6D6D5] bg-white text-xs font-medium text-[#082225]"
                >
                  <option value="ALL">All Global Desks (6 Offices)</option>
                  <option value="London HQ">London HQ</option>
                  <option value="Dubai Branch (DMCC)">Dubai Branch (DMCC)</option>
                  <option value="Nairobi Regional Hub">Nairobi Regional Hub</option>
                  <option value="Mumbai Desk">Mumbai Desk</option>
                  <option value="Incheon Office">Incheon Office</option>
                  <option value="Ha Noi Desk">Ha Noi Desk</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#EEF4F3] p-1 rounded-xl border border-[#D2DFDD]">
                <button
                  onClick={() => setCrmViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    crmViewMode === 'kanban'
                      ? 'bg-[#082225] text-white'
                      : 'text-[#4A6B70] hover:text-[#082225]'
                  }`}
                >
                  Kanban Board
                </button>
                <button
                  onClick={() => setCrmViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    crmViewMode === 'table'
                      ? 'bg-[#082225] text-white'
                      : 'text-[#4A6B70] hover:text-[#082225]'
                  }`}
                >
                  Executive Table
                </button>
              </div>
            </div>

            {/* KANBAN PIPELINE VIEW */}
            {crmViewMode === 'kanban' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {CRM_STAGES.map((stage) => {
                  const stageLeads = filteredLeads.filter((l) => l.stage === stage);
                  return (
                    <div
                      key={stage}
                      className="bg-[#E7EFEE] rounded-2xl p-3 border border-[#CBDAD8] flex flex-col min-h-[480px]"
                    >
                      <div className="flex items-center justify-between px-1 pb-2.5 mb-2 border-b border-[#C5D6D4]">
                        <span className="text-xs font-semibold text-[#082225]">{stage}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white text-[#082225] font-mono-tech text-[11px] font-semibold">
                          {stageLeads.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 flex-1">
                        {stageLeads.map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className={`bg-white rounded-xl p-3.5 border transition cursor-pointer shadow-2xs hover:shadow-md ${
                              lead.isLiveSession
                                ? 'border-[#C4975A] ring-2 ring-[#C4975A]/20'
                                : 'border-[#D2DFDD] hover:border-[#082225]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[10px] font-mono-tech font-semibold px-2 py-0.5 rounded bg-[#EEF4F3] text-[#082225]">
                                {lead.referenceCode}
                              </span>
                              {lead.isLiveSession && (
                                <span className="text-[10px] font-mono-tech font-semibold px-2 py-0.5 rounded bg-[#C4975A] text-white">
                                  LIVE CALL
                                </span>
                              )}
                            </div>

                            <h4 className="font-serif-editorial font-semibold text-sm text-[#082225]">
                              {lead.facts.company || 'Unidentified Caller'}
                            </h4>
                            <p className="text-[11px] text-[#527378] mt-0.5">
                              {lead.facts.companyCountry || 'Country pending'} · {lead.facts.buyerType || 'Buyer'}
                            </p>

                            <div className="mt-2.5 p-2 rounded-lg bg-[#F5F9F8] border border-[#E2ECEB] text-xs">
                              <div className="font-semibold text-[#082225] truncate">
                                {lead.facts.material || 'Material pending'}
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[11px] font-mono-tech text-[#946B33]">
                                <span>Qty: {lead.facts.quantity || 'TBD'}</span>
                                <span>{lead.facts.dischargePort || lead.facts.destinationCountry || ''}</span>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-[#EBF2F1] flex items-center justify-between text-[11px]">
                              <span className="text-[#4A6B70] truncate">{lead.assignedOffice}</span>
                              <span className="font-mono-tech font-semibold text-emerald-800">
                                {lead.readinessScore}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE PIPELINE VIEW */
              <div className="bg-white rounded-2xl border border-[#D2DFDD] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#082225] text-white text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Ref</th>
                        <th className="py-3 px-4">Company & Country</th>
                        <th className="py-3 px-4">Material & Grade</th>
                        <th className="py-3 px-4">Order Qty / Monthly</th>
                        <th className="py-3 px-4">Port & Terms</th>
                        <th className="py-3 px-4">Routed Desk</th>
                        <th className="py-3 px-4">Stage</th>
                        <th className="py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EEED]">
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="hover:bg-[#F4F8F7] cursor-pointer transition"
                        >
                          <td className="py-3 px-4 font-mono-tech font-semibold text-[#082225]">
                            {lead.referenceCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#082225]">{lead.facts.company || '—'}</div>
                            <div className="text-[11px] text-[#527378]">
                              {lead.facts.companyCountry} · {lead.facts.buyerType}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#082225]">{lead.facts.material || '—'}</div>
                            <div className="text-[11px] font-mono-tech text-[#946B33]">
                              {[lead.facts.mfi, lead.facts.preferredProducer].filter(Boolean).join(' · ')}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono-tech">
                            <div className="font-semibold text-[#082225]">{lead.facts.quantity || '—'}</div>
                            <div className="text-[11px] text-[#527378]">{lead.facts.monthlyVolume || ''}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#082225]">{lead.facts.dischargePort || '—'}</div>
                            <div className="text-[11px] font-mono-tech text-[#527378]">
                              {[lead.facts.shippingTermRequested, lead.facts.paymentTermsRequested]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#082225]">{lead.assignedOffice}</div>
                            <div className="text-[11px] text-[#527378]">{lead.assignedOwner}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-full bg-[#EEF4F3] text-[#082225] font-semibold text-[11px]">
                              {lead.stage}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button className="text-[#C4975A] font-semibold hover:underline">
                              Inspect →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 3: SIMULATED MEETINGS & DISPATCH */}
        {activeWorkspace === 'meetings' && (
          <div className="p-6 space-y-5 flex-1">
            <div className="bg-white rounded-2xl border border-[#D2DFDD] p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5EEED]">
                <div>
                  <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#C4975A] font-semibold">
                    Section 11 · Demo CRM Meeting Simulation
                  </span>
                  <h3 className="text-base font-serif-editorial font-semibold text-[#082225]">
                    Scheduled Commercial Demo Calls & Timezone Registry
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                  Safeguard Active: Clearly labelled simulated bookings only
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {bookedMeetingsList.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="p-4 rounded-2xl bg-[#F8FBFB] border border-[#C6D6D5] hover:border-[#082225] transition cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono-tech font-semibold bg-emerald-100 text-emerald-800">
                        {lead.meeting.status === 'demo_booked' ? 'DEMO BOOKED' : 'COLLECTING SLOT'}
                      </span>
                      <span className="text-xs font-mono-tech text-[#527378]">{lead.referenceCode}</span>
                    </div>

                    <div>
                      <h4 className="font-serif-editorial font-semibold text-base text-[#082225]">
                        {lead.facts.company || 'Caller Inquiry'}
                      </h4>
                      <p className="text-xs text-[#527378]">
                        Attendee: <strong>{lead.facts.contactName || 'Pending'}</strong> ({lead.facts.email || 'No email'})
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#DCE7E6] space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Date:</span>
                        <span className="font-semibold text-[#082225]">{lead.meeting.date || 'TBD'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Caller Time:</span>
                        <span className="font-mono-tech font-semibold text-[#082225]">
                          {lead.meeting.clockTime} {lead.meeting.amPm}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">IANA Timezone:</span>
                        <span className="font-mono-tech font-semibold text-[#946B33]">
                          {lead.meeting.timezone}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Assigned Desk:</span>
                        <span className="font-medium text-[#082225]">{lead.assignedOffice}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE 4: KNOWLEDGE BASE & GUARDRAILS */}
        {activeWorkspace === 'knowledge' && (
          <div className="p-6 space-y-4 flex-1">
            <div className="bg-white rounded-2xl border border-[#D2DFDD] p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap gap-2 pb-3 border-b border-[#E5EEED]">
                {(
                  [
                    ['guardrails', 'Source Guardrails & Live Claims'],
                    ['products', 'Polymers, Chemicals & Brands'],
                    ['mfi', 'MFI & Grade Reference Tables'],
                    ['offices', '6 Authoritative Offices & 25 Markets'],
                    ['history', 'Historical Timeline & Customer Evidence'],
                    ['compliance', '4 Compliance & ESG Policies'],
                  ] as [typeof kbSubTab, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setKbSubTab(id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      kbSubTab === id
                        ? 'bg-[#082225] text-white'
                        : 'bg-[#EEF4F3] text-[#35565B] hover:bg-[#DCE8E6]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {kbSubTab === 'guardrails' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                      <div className="font-semibold text-amber-950 flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        2025 Financial Conflict (Unresolved)
                      </div>
                      <p className="text-amber-900 leading-relaxed">
                        Earlier owner-confirmed 2025 consolidated group turnover is <strong>US$62M</strong> vs latest public website 2025 revenue of <strong>US$63M</strong>. Neither is chosen as settled; entity/reporting basis requires commercial team confirmation.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F4F8F7] border border-[#CFE0DF]">
                      <div className="font-semibold text-[#082225] flex items-center gap-1.5 mb-1">
                        <Clock className="w-4 h-4 text-[#C4975A]" />
                        Undated Profile Snapshot vs 2022 Dated Scale
                      </div>
                      <p className="text-[#35565B] leading-relaxed">
                        <strong>2022 Dated:</strong> 70,000 MTS polymer volume & US$79M turnover. <br />
                        <strong>Undated Profile Snapshot:</strong> 80,000 MT polymer, 25,000 MT chemical, 50 employees, 50+ countries, US$100M turnover (never presented as current verified figures).
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F4F8F7] border border-[#CFE0DF]">
                      <div className="font-semibold text-[#082225] flex items-center gap-1.5 mb-1">
                        <Package className="w-4 h-4 text-[#C4975A]" />
                        Polymer vs Polyurethane Classification
                      </div>
                      <p className="text-[#35565B] leading-relaxed">
                        <strong>PVC</strong> is a thermoplastic vinyl polymer and <strong>PET</strong> is a thermoplastic polyester — <em>neither is a polyurethane</em>. Polyurethanes focus exclusively on <strong>TDI</strong> and <strong>Polyol</strong>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F4F8F7] border border-[#CFE0DF]">
                      <div className="font-semibold text-[#082225] flex items-center gap-1.5 mb-1">
                        <Globe2 className="w-4 h-4 text-[#C4975A]" />
                        Warehouses vs Representatives & No Fax
                      </div>
                      <p className="text-[#35565B] leading-relaxed">
                        Profile lists an associate company/warehouse in <strong>Kenya</strong> and a warehouse partnership in <strong>Djibouti</strong>. France, Portugal, and Vietnam are representatives, not verified warehouses. <strong>Fax is no longer used.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {kbSubTab === 'products' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.polymers.map((poly) => (
                    <div key={poly.group} className="p-4 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                      <h4 className="font-serif-editorial font-semibold text-sm text-[#082225]">
                        {poly.group}
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {poly.subtypes.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded bg-white border border-[#C6D6D5] font-mono-tech text-[11px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[#4A6B70]">
                        <strong>Applications:</strong> {poly.applications.join(', ')}
                      </p>
                      <p className="mt-1 text-[11px] font-mono-tech text-[#946B33]">
                        {poly.publicRangeSummary}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {kbSubTab === 'mfi' && (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#082225] text-white text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Family</th>
                        <th className="py-2.5 px-3">Grade / Process</th>
                        <th className="py-2.5 px-3">MFI / Reference Range</th>
                        <th className="py-2.5 px-3">Applications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5ECEB]">
                      {APRIROSE_KNOWLEDGE_BASE.historicalMfiGrades.map((g, i) => (
                        <tr key={i} className="hover:bg-[#F4F8F7]">
                          <td className="py-2 px-3 font-mono-tech font-semibold text-[#082225]">
                            {g.family}
                          </td>
                          <td className="py-2 px-3 font-semibold">{g.gradeType}</td>
                          <td className="py-2 px-3 font-mono-tech text-[#946B33] font-medium">
                            {g.mfiOrSpec}
                          </td>
                          <td className="py-2 px-3 text-[#4A6B70]">{g.applications}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {kbSubTab === 'offices' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.offices.map((off) => (
                    <div key={off.id} className="p-4 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-serif-editorial font-semibold text-sm text-[#082225]">
                          {off.city}, {off.country}
                        </span>
                        <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-[#082225] text-white">
                          {off.role}
                        </span>
                      </div>
                      <p className="text-[#35565B]">{off.address}</p>
                      <div className="flex flex-wrap gap-3 pt-1 font-mono-tech text-[11px] text-[#946B33]">
                        <span>Tel: {off.phone}</span>
                        <span>Email: {off.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {kbSubTab === 'history' && (
                <div className="space-y-2 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.companyOverview.historicalTimeline.map((item) => (
                    <div
                      key={item.year}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[#F6F9F8] border border-[#E2ECEB]"
                    >
                      <span className="font-mono-tech font-bold text-[#946B33] px-2 py-0.5 bg-white rounded border border-[#DEC9A8]">
                        {item.year}
                      </span>
                      <span className="text-[#2D4D52]">{item.event}</span>
                    </div>
                  ))}
                </div>
              )}

              {kbSubTab === 'compliance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.compliancePolicies.map((pol) => (
                    <div key={pol.id} className="p-4 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF] space-y-1.5">
                      <h4 className="font-serif-editorial font-semibold text-sm text-[#082225]">
                        {pol.title}
                      </h4>
                      <div className="font-mono-tech text-[11px] text-[#946B33]">{pol.coverageOrDate}</div>
                      <p className="font-medium text-[#2D4D52]">{pol.summary}</p>
                      <ul className="space-y-1 text-[#4A6B70] pt-1">
                        {pol.highlights.map((h, i) => (
                          <li key={i}>• {h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SLIDE-OVER CRM LEAD INSPECTOR DRAWER */}
      {selectedLead && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-[#D2DFDD] flex flex-col justify-between overflow-y-auto">
            <div className="p-6 space-y-5">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E5EEED]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded font-mono-tech text-xs font-semibold bg-[#082225] text-white">
                      {selectedLead.referenceCode}
                    </span>
                    <span className="text-xs text-[#527378]">
                      Routed to <strong>{selectedLead.assignedOffice}</strong> ({selectedLead.assignedOwner})
                    </span>
                  </div>
                  <h2 className="text-xl font-serif-editorial font-semibold text-[#082225] mt-1.5">
                    {selectedLead.facts.company || 'Inbound Voice Caller'}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-2 rounded-lg bg-[#EEF4F3] hover:bg-[#DCE8E6] text-[#082225] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stage Selector */}
              <div className="p-4 rounded-xl bg-[#F5F9F8] border border-[#D8E5E3] flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#082225]">Commercial Deal Stage:</span>
                <div className="flex flex-wrap gap-1.5">
                  {CRM_STAGES.map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateLeadStage(selectedLead.id, st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        selectedLead.stage === st
                          ? 'bg-[#082225] text-white'
                          : 'bg-white text-[#4A6B70] border border-[#C6D6D5] hover:border-[#082225]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complete 25-Field Customer Fact Inventory */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-mono-tech uppercase tracking-wider text-[#64878B] font-semibold">
                    Complete 25-Field Customer Fact Inventory & Voice Evidence
                  </h4>
                  <button
                    onClick={() => handleCopySummary(selectedLead.facts, selectedLead.meeting)}
                    className="text-xs font-semibold text-[#946B33] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Lead Summary
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {(
                    [
                      ['company', 'Company Name'],
                      ['companyCountry', 'Company Country'],
                      ['buyerType', 'Buyer Business Type'],
                      ['contactName', 'Contact Name'],
                      ['email', 'Email Address'],
                      ['phone', 'Phone / WhatsApp'],
                      ['material', 'Product / Material'],
                      ['application', 'Application'],
                      ['requestedGrade', 'Requested Grade'],
                      ['mfi', 'MFI / Technical Spec'],
                      ['quantity', 'Order Quantity'],
                      ['monthlyVolume', 'Monthly Demand'],
                      ['dischargePort', 'Discharge Port'],
                      ['destinationCountry', 'Destination Country'],
                      ['shippingTermRequested', 'Shipping Term (Incoterm)'],
                      ['paymentTermsRequested', 'Payment Terms'],
                      ['shipmentTiming', 'Shipment Timing'],
                      ['preferredProducer', 'Preferred Producer'],
                      ['technicalDocumentRequested', 'Technical Documents'],
                      ['equivalentGradeAcceptable', 'Equivalent Acceptable'],
                    ] as [keyof BuyerFacts, string][]
                  ).map(([k, label]) => {
                    const val = selectedLead.facts[k];
                    const ev = selectedLead.factEvidence?.[k];
                    return (
                      <div
                        key={k}
                        className={`p-2.5 rounded-xl border ${
                          val
                            ? 'bg-[#F4F9F8] border-[#B8D4D1]'
                            : 'bg-[#FAFDFC] border-[#E8F0EF] opacity-70'
                        }`}
                      >
                        <div className="flex justify-between text-[10px] text-[#527378]">
                          <span>{label}</span>
                          <span className="font-mono-tech">{k}</span>
                        </div>
                        <div className="font-semibold text-[#082225] mt-0.5">{val || '—'}</div>
                        {ev && (
                          <div className="text-[10px] italic text-[#527378] mt-1 truncate">
                            Quote: "{ev}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GEMINI LIVE API SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#D5E0DF] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6EEEE] pb-3">
              <div>
                <h3 className="text-base font-serif-editorial font-semibold text-[#082225]">
                  Gemini Multimodal Live API Configuration
                </h3>
                <p className="text-xs text-[#527378]">
                  Real-time bidirectional voice (`@google/genai` `ai.live.connect`)
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-xs text-[#527378] hover:text-[#082225] cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#082225] mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => {
                    setGeminiApiKey(e.target.value);
                    localStorage.setItem('aprirose_gemini_api_key', e.target.value);
                  }}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 rounded-lg border border-[#C6D6D5] font-mono-tech focus:outline-none focus:border-[#082225]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#082225] mb-1">Live API Model</label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#C6D6D5] bg-white"
                >
                  <option value="gemini-3.8-live">gemini-3.8-live (Default)</option>
                  <option value="gemini-3.1-flash-live-preview">gemini-3.1-flash-live-preview</option>
                  <option value="gemini-2.5-flash-native-audio-preview-12-2025">
                    gemini-2.5-flash-native-audio-preview-12-2025
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#082225] mb-1">Receptionist Voice</label>
                <select
                  value={geminiVoice}
                  onChange={(e) => setGeminiVoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#C6D6D5] bg-white"
                >
                  <option value="Aoede">Aoede (Warm, Professional British/International)</option>
                  <option value="Kore">Kore (Clear, Composed)</option>
                  <option value="Puck">Puck (Conversational)</option>
                  <option value="Charon">Charon (Authoritative)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  if (geminiApiKey.trim()) {
                    setEngineMode('gemini-live');
                  }
                  setShowSettingsModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#082225] hover:bg-[#113A3F] text-white text-xs font-semibold cursor-pointer"
              >
                Save & Activate Gemini Live Voice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
