import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Copy,
  Check,
  Settings,
  Send,
  BookOpen,
  Kanban,
  ArrowUpRight,
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
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
    category: 'RFQ Intake',
    label: 'PP Raffia 100 MT to Tamatave',
    prompt:
      'Hi, we are ABC Plastics Ltd based in Madagascar. We are a manufacturer looking for 100 MT of PP Raffia grade around MFI 3.5, ideally Jinneng, shipped CIF to Tamatave port on LC payment terms, and our monthly consumption is 250 MT per month.',
  },
  {
    category: 'Contact',
    label: 'Provide Caller Name, Email & WhatsApp',
    prompt:
      'My name is John Smith. You can reach me at john.smith@abcplastics.mg and my WhatsApp phone number is +261 34 12 345 67.',
  },
  {
    category: 'Scheduling',
    label: 'Book Demo Call (Tomorrow 10:30 AM Mumbai)',
    prompt:
      'Can we schedule a sales meeting for tomorrow at 10:30 AM joining from Mumbai, India?',
  },
  {
    category: 'Validation',
    label: 'Test Ambiguous "930 IST" Timezone Rule',
    prompt: 'I would like to book a meeting for Friday at 930 IST.',
  },
  {
    category: 'Financials',
    label: 'Ask 2025 Revenue ($62M vs $63M) & Scale',
    prompt:
      'What is Aprirose Trading’s 2025 turnover, annual polymer volume, and total employee headcount?',
  },
  {
    category: 'Technical',
    label: 'Ask Polyurethane vs PVC / PET Boundary',
    prompt:
      'Which polyurethanes do you supply, and are PVC or PET considered polyurethanes?',
  },
  {
    category: 'Directory',
    label: 'Global Offices & Fax Policy',
    prompt: 'Where are your offices located and what is your London fax number?',
  },
  {
    category: 'Handoff',
    label: 'Request Transfer to Human Representative',
    prompt: 'Could I please speak to a human representative from the sales team?',
  },
];

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<
    'receptionist' | 'crm' | 'meetings' | 'knowledge'
  >('receptionist');

  // Voice Engine State
  const [engineMode, setEngineMode] = useState<'gemini-live' | 'browser-voice'>('browser-voice');
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    () => localStorage.getItem('aprirose_gemini_api_key') || ''
  );
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.8-live');
  const [geminiVoice, setGeminiVoice] = useState<string>('Aoede');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPromptsBar, setShowPromptsBar] = useState(true);

  const [callStatus, setCallStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected'
  );
  const [statusDetail, setStatusDetail] = useState<string>('Ready');
  const [callSeconds, setCallSeconds] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isListeningStt, setIsListeningStt] = useState(false);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const [audioLevels, setAudioLevels] = useState<{ input: number; output: number }>({
    input: 0,
    output: 0,
  });

  // Active Call & Qualification Data
  const [activeLeadId, setActiveLeadId] = useState<string>('lead-live-session');
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([
    {
      id: 'welcome-turn',
      role: 'receptionist',
      text: 'Welcome to Aprirose Trading Limited. I can assist you with polymer or chemical procurement, technical grade references, global office routing, or scheduling a commercial meeting. How may I help you today?',
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

  // CRM State
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
  const [crmViewMode, setCrmViewMode] = useState<'table' | 'kanban'>('table');
  const [crmSearch, setCrmSearch] = useState('');
  const [crmOfficeFilter, setCrmOfficeFilter] = useState<string>('ALL');
  const [selectedLead, setSelectedLead] = useState<CrmLeadRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Knowledge Base Sub-tab
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

  useEffect(() => {
    if (callStatus !== 'connected') return;
    const timer = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

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
      .catch(() => {});
  }, []);

  const syncLeadsToBackend = (leadsToSave: CrmLeadRecord[]) => {
    localStorage.setItem('aprirose_crm_leads_v2', JSON.stringify(leadsToSave));
    fetch('/api/crm/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: leadsToSave }),
    }).catch(() => {});
  };

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
        referenceCode: existingIdx >= 0 ? prev[existingIdx].referenceCode : 'APR-2026-845',
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
        callDurationSec: callSeconds || 45,
        facts: { ...buyerFacts },
        factEvidence: { ...factEvidence },
        meeting: { ...meetingState },
        claims: [...groundedClaims],
        notes:
          existingIdx >= 0
            ? prev[existingIdx].notes
            : 'Captured via Aprirose Voice Receptionist.',
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
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const speakText = (text: string) => {
    if (!isTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
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
      setStatusDetail('Call Ended');
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
      setStatusDetail('Active Voice Call');
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
      setStatusDetail('Active Call');
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
    showToast('New caller session initialized');
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
    showToast(`Stage updated to ${newStage}`);
  };

  const readiness = checkCommercialReadiness(buyerFacts);
  const activeOfficeRouting = inferAssignedOffice(buyerFacts);

  const formatLeadSummaryText = (
    facts: BuyerFacts = buyerFacts,
    meeting: SimulatedMeetingState = meetingState
  ) => {
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
    showToast('Lead summary copied to clipboard');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const filteredLeads = crmLeads.filter((lead) => {
    const matchesOffice = crmOfficeFilter === 'ALL' || lead.assignedOffice === crmOfficeFilter;
    const q = crmSearch.toLowerCase().trim();
    if (!q) return matchesOffice;
    const hay = `${lead.referenceCode} ${lead.facts.company || ''} ${lead.facts.companyCountry || ''} ${lead.facts.material || ''} ${lead.facts.contactName || ''} ${lead.facts.dischargePort || ''}`.toLowerCase();
    return matchesOffice && hay.includes(q);
  });

  const bookedMeetingsList = crmLeads.filter(
    (l) => l.meeting.status === 'demo_booked' || l.meeting.status === 'collecting'
  );

  const stageBadgeColor = (stage: CrmStage) => {
    switch (stage) {
      case 'New Voice Intake':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Qualified for Review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Sourcing & TDS Review':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Quotation Issued':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Won / Allocated':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* SUBTLE TOAST */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-slate-800 flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CLEAN WHITE ENTERPRISE SIDEBAR */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Brand Header */}
          <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-xs tracking-tight">
                AT
              </div>
              <div>
                <div className="font-bold text-xs tracking-wider text-slate-900 uppercase">
                  Aprirose Trading
                </div>
                <div className="text-[11px] text-slate-500">Commercial Desk</div>
              </div>
            </div>
          </div>

          {/* Primary Navigation */}
          <div className="p-3">
            <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => setActiveWorkspace('receptionist')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeWorkspace === 'receptionist'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4" />
                  Voice Receptionist
                </span>
                {callStatus === 'connected' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveWorkspace('crm')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeWorkspace === 'crm'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Kanban className="w-4 h-4" />
                  CRM Pipeline
                </span>
                <span className="font-mono-tech text-[11px] text-slate-500">{crmLeads.length}</span>
              </button>

              <button
                onClick={() => setActiveWorkspace('meetings')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeWorkspace === 'meetings'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4" />
                  Meetings
                </span>
                <span className="font-mono-tech text-[11px] text-slate-500">
                  {bookedMeetingsList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveWorkspace('knowledge')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  activeWorkspace === 'knowledge'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4" />
                  Knowledge Base
                </span>
              </button>
            </nav>
          </div>

          {/* Regional Routing List */}
          <div className="px-3 py-2 border-t border-slate-100">
            <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Regional Desks
            </div>
            <div className="space-y-0.5 text-xs">
              {[
                { city: 'London HQ', code: 'UK', active: activeOfficeRouting.office === 'London HQ' },
                { city: 'Dubai (DMCC)', code: 'AE', active: activeOfficeRouting.office === 'Dubai Branch (DMCC)' },
                { city: 'Nairobi Hub', code: 'KE', active: activeOfficeRouting.office === 'Nairobi Regional Hub' },
                { city: 'Mumbai Desk', code: 'IN', active: activeOfficeRouting.office === 'Mumbai Desk' },
                { city: 'Incheon Office', code: 'KR', active: activeOfficeRouting.office === 'Incheon Office' },
                { city: 'Ha Noi Desk', code: 'VN', active: activeOfficeRouting.office === 'Ha Noi Desk' },
              ].map((desk) => (
                <div
                  key={desk.city}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md ${
                    desk.active
                      ? 'bg-blue-50/70 text-blue-700 font-medium'
                      : 'text-slate-600'
                  }`}
                >
                  <span>{desk.city}</span>
                  <span className="font-mono-tech text-[10px] text-slate-400">{desk.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Audio Stack Selector */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/60">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 px-1">
            <span className="font-medium">Voice Engine</span>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              API Key
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-0.5 rounded-md">
            <button
              onClick={() => setEngineMode('browser-voice')}
              className={`py-1 px-2 rounded text-[11px] font-medium transition cursor-pointer ${
                engineMode === 'browser-voice'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Browser TTS
            </button>
            <button
              onClick={() => {
                setEngineMode('gemini-live');
                if (!geminiApiKey) setShowSettingsModal(true);
              }}
              className={`py-1 px-2 rounded text-[11px] font-medium transition cursor-pointer ${
                engineMode === 'gemini-live'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gemini Live
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER BAR */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-900">
              {activeWorkspace === 'receptionist' && 'Voice Receptionist & Real-Time Qualification'}
              {activeWorkspace === 'crm' && 'Commercial Inquiries & Deal Pipeline'}
              {activeWorkspace === 'meetings' && 'Scheduled Meetings & Timezone Registry'}
              {activeWorkspace === 'knowledge' && 'Corporate Knowledge Base & Compliance Reference'}
            </h1>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs text-slate-500">
              Aprirose Trading Limited (London · Dubai · Nairobi · Mumbai · Incheon · Ha Noi)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartFreshCallSession}
              className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              New Session
            </button>

            <button
              onClick={() => {
                const liveRecord = crmLeads.find((l) => l.id === activeLeadId) || crmLeads[0];
                if (liveRecord) setSelectedLead(liveRecord);
                setActiveWorkspace('crm');
              }}
              className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>View in CRM</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* WORKSPACE 1: VOICE RECEPTIONIST */}
        {activeWorkspace === 'receptionist' && (
          <div className="p-6 space-y-5 max-w-[1500px]">
            {/* COMPACT HORIZONTAL CALL CONTROL BAR */}
            <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      callStatus === 'connected'
                        ? 'bg-emerald-500 animate-pulse'
                        : callStatus === 'connecting'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-slate-300'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        London Inbound Line (+44 20 8951 0377)
                      </span>
                      <span className="font-mono-tech text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {formatTimer(callSeconds)}
                      </span>
                      {humanPaused && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Human Handoff Active (Intake Paused)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isSpeakingTts
                        ? 'Receptionist speaking...'
                        : isListeningStt
                        ? 'Listening to microphone...'
                        : statusDetail}
                    </p>
                  </div>
                </div>

                {/* Clean 12-Bar Audio Level Meter */}
                <div className="hidden md:flex items-center gap-0.5 h-6 px-3 border-l border-slate-200">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const activeLevel = Math.max(audioLevels.input, audioLevels.output);
                    const isActive =
                      callStatus === 'connected' || isSpeakingTts || isListeningStt;
                    const barHeight = isActive
                      ? Math.max(
                          4,
                          Math.min(20, Math.round(activeLevel * 22 * ((i % 4) * 0.25 + 0.5)))
                        )
                      : 4;
                    return (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isActive && activeLevel > 0.05 ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                        style={{ height: `${barHeight}px` }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMicMute}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                    isMicMuted
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isMicMuted ? 'Mic Muted' : 'Mic On'}</span>
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
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                    !isTtsEnabled
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {isTtsEnabled ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                  <span>{isTtsEnabled ? 'Speaker On' : 'Muted'}</span>
                </button>

                <button
                  onClick={handleToggleCall}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    callStatus === 'connected'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {callStatus === 'connected' ? (
                    <>
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>End Call</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-3.5 h-3.5" />
                      <span>Start Voice Call</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* TWO-COLUMN MAIN DESK */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT 7 COLS: CONVERSATION TRANSCRIPT & CALLER PROMPTS */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden">
                {/* Clean Collapsible Demo Scenarios Strip */}
                <div className="border-b border-slate-200 bg-slate-50/70">
                  <button
                    onClick={() => setShowPromptsBar(!showPromptsBar)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Sample Caller Utterances (Click to simulate spoken input)</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        showPromptsBar ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {showPromptsBar && (
                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {QUICK_SCENARIOS.map((sc, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCallerInput(sc.prompt, false)}
                          className="text-left px-3 py-1.5 rounded-md bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between gap-2 cursor-pointer group"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-[10px] font-mono-tech uppercase text-blue-600 font-medium shrink-0">
                              {sc.category}
                            </span>
                            <span className="text-xs text-slate-700 group-hover:text-slate-900 truncate">
                              {sc.label}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transcript Feed */}
                <div className="p-5 flex-1 min-h-[420px] max-h-[500px] overflow-y-auto space-y-4">
                  {transcript.map((turn) => (
                    <div
                      key={turn.id}
                      className={`flex flex-col ${
                        turn.role === 'caller' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-0.5">
                        <span className="text-[11px] font-medium text-slate-500">
                          {turn.role === 'caller' ? 'Caller' : 'Aprirose Receptionist'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono-tech">
                          {turn.timestamp}
                        </span>
                        {turn.role === 'receptionist' && (
                          <button
                            onClick={() => speakText(turn.text)}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Replay audio"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                          turn.role === 'caller'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-50 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <p>{turn.text}</p>

                        {turn.extractedKeys && turn.extractedKeys.length > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-blue-500/40 flex flex-wrap items-center gap-1">
                            {turn.extractedKeys.map((k) => (
                              <span
                                key={k}
                                className="text-[10px] font-mono-tech px-1.5 py-0.5 rounded bg-blue-700 text-blue-100"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!inputText.trim()) return;
                    handleCallerInput(inputText, false);
                    setInputText('');
                  }}
                  className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a caller statement or speak into microphone..."
                    className="flex-1 text-xs sm:text-sm px-3.5 py-2 rounded-md border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </form>
              </div>

              {/* RIGHT 5 COLS: SINGLE UNIFIED RFQ QUALIFICATION SHEET */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200 flex flex-col justify-between">
                {/* Header & Readiness */}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tech text-[11px] font-semibold text-blue-600">
                          APR-2026-845
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-600">
                          Desk: <strong className="text-slate-900">{activeOfficeRouting.office}</strong>
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                        {buyerFacts.company || 'Live Buyer Qualification Record'}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleCopySummary()}
                      className="px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedSummary ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Summary
                        </>
                      )}
                    </button>
                  </div>

                  {/* Clean Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Qualification Completeness</span>
                      <span className="font-mono-tech font-semibold text-slate-900">
                        {readiness.score}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${readiness.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Structured Key-Value Rows */}
                <div className="p-4 space-y-2.5 text-xs flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Buyer & Material Details
                  </div>

                  <div className="divide-y divide-slate-100">
                    {[
                      { label: 'Company', value: buyerFacts.company },
                      { label: 'Country', value: buyerFacts.companyCountry },
                      { label: 'Business Type', value: buyerFacts.buyerType },
                      { label: 'Product / Material', value: buyerFacts.material },
                      { label: 'Application', value: buyerFacts.application },
                      {
                        label: 'MFI / Producer',
                        value: [buyerFacts.mfi, buyerFacts.preferredProducer]
                          .filter(Boolean)
                          .join(' · '),
                        mono: true,
                      },
                      { label: 'Order Quantity', value: buyerFacts.quantity, mono: true },
                      { label: 'Monthly Volume', value: buyerFacts.monthlyVolume, mono: true },
                      {
                        label: 'Discharge Port',
                        value: [buyerFacts.dischargePort, buyerFacts.destinationCountry]
                          .filter(Boolean)
                          .join(', '),
                      },
                      {
                        label: 'Terms (Payment / Incoterm)',
                        value: [buyerFacts.paymentTermsRequested, buyerFacts.shippingTermRequested]
                          .filter(Boolean)
                          .join(' / '),
                        mono: true,
                      },
                      { label: 'Contact Name', value: buyerFacts.contactName },
                      { label: 'Email', value: buyerFacts.email, mono: true },
                      { label: 'Phone / WhatsApp', value: buyerFacts.phone, mono: true },
                    ].map((row) => (
                      <div key={row.label} className="py-1.5 flex items-center justify-between gap-4">
                        <span className="text-slate-500">{row.label}</span>
                        <span
                          className={`text-right truncate ${
                            row.value ? 'font-medium text-slate-900' : 'text-slate-300'
                          } ${row.mono ? 'font-mono-tech' : ''}`}
                        >
                          {row.value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated Meeting Section */}
                <div className="p-4 bg-slate-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Simulated Meeting Slot
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono-tech font-medium border ${
                        meetingState.status === 'demo_booked'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : meetingState.status === 'collecting'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {meetingState.status === 'demo_booked'
                        ? 'Demo Booked'
                        : meetingState.status === 'collecting'
                        ? 'Collecting Slot'
                        : 'Not Requested'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-400">Date</div>
                      <div className="font-medium text-slate-900 mt-0.5 truncate">
                        {meetingState.date || '—'}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-400">Time</div>
                      <div className="font-mono-tech font-medium text-slate-900 mt-0.5">
                        {meetingState.clockTime
                          ? `${meetingState.clockTime} ${meetingState.amPm || ''}`
                          : '—'}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-400">Timezone</div>
                      <div className="font-mono-tech font-medium text-blue-600 mt-0.5 truncate">
                        {meetingState.timezone || '—'}
                      </div>
                    </div>
                  </div>

                  {meetingState.validationNotes && meetingState.validationNotes.length > 0 && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{meetingState.validationNotes.join(' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE 2: CRM PIPELINE */}
        {activeWorkspace === 'crm' && (
          <div className="p-6 space-y-5 max-w-[1500px]">
            {/* Clean Metric Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active Inquiries', value: crmLeads.length, sub: 'Synced to local CRM DB' },
                { label: 'Polymer & Chemical Vol', value: '1,050 MT', sub: '+ 4 FCL container orders' },
                {
                  label: 'Meetings Scheduled',
                  value: crmLeads.filter((l) => l.meeting.status === 'demo_booked').length,
                  sub: 'Confirmed demo slots',
                },
                {
                  label: 'Avg Qualification',
                  value: `${Math.round(
                    crmLeads.reduce((acc, l) => acc + l.readinessScore, 0) /
                      Math.max(1, crmLeads.length)
                  )}%`,
                  sub: '25-field schema coverage',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white border border-slate-200 rounded-lg p-4"
                >
                  <div className="text-xs text-slate-500">{stat.label}</div>
                  <div className="text-2xl font-bold font-mono-tech text-slate-900 mt-1">
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Filter & View Controls */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative min-w-[240px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={crmSearch}
                    onChange={(e) => setCrmSearch(e.target.value)}
                    placeholder="Filter by company, material, or port..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <select
                  value={crmOfficeFilter}
                  onChange={(e) => setCrmOfficeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="ALL">All Desks (6 Offices)</option>
                  <option value="London HQ">London HQ</option>
                  <option value="Dubai Branch (DMCC)">Dubai Branch (DMCC)</option>
                  <option value="Nairobi Regional Hub">Nairobi Regional Hub</option>
                  <option value="Mumbai Desk">Mumbai Desk</option>
                  <option value="Incheon Office">Incheon Office</option>
                  <option value="Ha Noi Desk">Ha Noi Desk</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                <button
                  onClick={() => setCrmViewMode('table')}
                  className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    crmViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setCrmViewMode('kanban')}
                  className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    crmViewMode === 'kanban'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Board View
                </button>
              </div>
            </div>

            {crmViewMode === 'table' ? (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Organization</th>
                        <th className="py-3 px-4">Material & Grade</th>
                        <th className="py-3 px-4">Quantity</th>
                        <th className="py-3 px-4">Port & Terms</th>
                        <th className="py-3 px-4">Assigned Desk</th>
                        <th className="py-3 px-4">Stage</th>
                        <th className="py-3 px-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="hover:bg-slate-50/80 cursor-pointer transition"
                        >
                          <td className="py-3 px-4 font-mono-tech font-medium text-blue-600">
                            {lead.referenceCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              {lead.facts.company || 'Inbound Caller'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {lead.facts.companyCountry} · {lead.facts.buyerType}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">
                              {lead.facts.material || '—'}
                            </div>
                            <div className="text-[11px] font-mono-tech text-slate-500">
                              {[lead.facts.mfi, lead.facts.preferredProducer]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono-tech">
                            <div className="font-semibold text-slate-900">
                              {lead.facts.quantity || '—'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {lead.facts.monthlyVolume || ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">
                              {lead.facts.dischargePort || '—'}
                            </div>
                            <div className="text-[11px] font-mono-tech text-slate-500">
                              {[lead.facts.shippingTermRequested, lead.facts.paymentTermsRequested]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{lead.assignedOffice}</div>
                            <div className="text-[11px] text-slate-500">{lead.assignedOwner}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${stageBadgeColor(
                                lead.stage
                              )}`}
                            >
                              {lead.stage}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-blue-600 font-medium hover:underline">
                              Inspect
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {CRM_STAGES.map((stage) => {
                  const stageLeads = filteredLeads.filter((l) => l.stage === stage);
                  return (
                    <div
                      key={stage}
                      className="bg-slate-100/80 rounded-lg p-3 border border-slate-200 flex flex-col min-h-[440px]"
                    >
                      <div className="flex items-center justify-between px-1 pb-2.5 mb-2 border-b border-slate-200">
                        <span className="text-xs font-semibold text-slate-700">{stage}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white text-slate-600 font-mono-tech text-[11px] border border-slate-200">
                          {stageLeads.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 flex-1">
                        {stageLeads.map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className="bg-white rounded-md p-3 border border-slate-200 hover:border-blue-400 transition cursor-pointer shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono-tech font-medium text-blue-600">
                                {lead.referenceCode}
                              </span>
                              <span className="text-[10px] font-mono-tech text-slate-400">
                                {lead.readinessScore}%
                              </span>
                            </div>

                            <div className="font-semibold text-xs text-slate-900">
                              {lead.facts.company || 'Inbound Caller'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {lead.facts.material || 'Material pending'}
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono-tech text-slate-600">
                              <span>{lead.facts.quantity || 'TBD'}</span>
                              <span>{lead.facts.dischargePort || lead.facts.companyCountry || ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 3: SIMULATED MEETINGS */}
        {activeWorkspace === 'meetings' && (
          <div className="p-6 max-w-[1500px]">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Simulated Sales Meeting Schedule
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All meetings booked via the voice receptionist are recorded as simulated CRM entries.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {bookedMeetingsList.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="p-4 hover:bg-slate-50 transition cursor-pointer flex flex-wrap items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tech font-medium text-blue-600">
                          {lead.referenceCode}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {lead.facts.company || 'Caller Inquiry'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {lead.meeting.status === 'demo_booked' ? 'Demo Booked' : 'Collecting Slot'}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Contact: {lead.facts.contactName} ({lead.facts.email} · {lead.facts.phone})
                      </div>
                    </div>

                    <div className="flex items-center gap-6 font-mono-tech">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Date & Time</div>
                        <div className="font-medium text-slate-900">
                          {lead.meeting.date} · {lead.meeting.clockTime} {lead.meeting.amPm}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Timezone</div>
                        <div className="font-medium text-blue-600">{lead.meeting.timezone}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Assigned Desk</div>
                        <div className="font-sans font-medium text-slate-700">
                          {lead.assignedOffice}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE 4: KNOWLEDGE BASE */}
        {activeWorkspace === 'knowledge' && (
          <div className="p-6 max-w-[1500px] space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
              <div className="flex flex-wrap gap-1.5 pb-3 border-b border-slate-200">
                {(
                  [
                    ['guardrails', 'Source Guardrails'],
                    ['products', 'Polymers & Chemicals'],
                    ['mfi', 'MFI Grade Reference'],
                    ['offices', 'Global Offices (6)'],
                    ['history', 'Timeline & Evidence'],
                    ['compliance', 'Compliance Policies (4)'],
                  ] as [typeof kbSubTab, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setKbSubTab(id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      kbSubTab === id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {kbSubTab === 'guardrails' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900 mb-1">
                      2025 Financial Figures (Unresolved Conflict)
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Earlier owner-confirmed 2025 consolidated group turnover is{' '}
                      <strong>US$62M</strong> vs latest public website 2025 revenue of{' '}
                      <strong>US$63M</strong>. Neither is presented as settled; entity/reporting
                      basis requires commercial confirmation.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900 mb-1">
                      Dated 2022 Scale vs. Undated Profile Snapshot
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      <strong>2022 Dated:</strong> 70,000 MTS polymer volume & US$79M turnover.{' '}
                      <br />
                      <strong>Undated Profile Snapshot:</strong> 80,000 MT polymer, 25,000 MT
                      chemical, 50 employees, 50+ countries, US$100M turnover.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900 mb-1">
                      Polymer vs. Polyurethane Classification
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      <strong>PVC</strong> is a thermoplastic vinyl polymer and{' '}
                      <strong>PET</strong> is a thermoplastic polyester — neither is a
                      polyurethane. Polyurethanes focus exclusively on <strong>TDI</strong> and{' '}
                      <strong>Polyol</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900 mb-1">
                      Warehouses vs. Representatives & No-Fax Rule
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Profile lists an associate company/warehouse in <strong>Kenya</strong> and a
                      warehouse partnership in <strong>Djibouti</strong>. France, Portugal, and
                      Vietnam are representatives. <strong>Fax is no longer used.</strong>
                    </p>
                  </div>
                </div>
              )}

              {kbSubTab === 'products' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.polymers.map((poly) => (
                    <div
                      key={poly.group}
                      className="p-4 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <h4 className="font-semibold text-slate-900">{poly.group}</h4>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {poly.subtypes.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono-tech text-[11px] text-slate-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-slate-600">
                        <strong>Applications:</strong> {poly.applications.join(', ')}
                      </p>
                      <p className="mt-1 text-[11px] font-mono-tech text-blue-600">
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
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                        <th className="py-2.5 px-3">Family</th>
                        <th className="py-2.5 px-3">Grade / Process</th>
                        <th className="py-2.5 px-3">MFI / Reference</th>
                        <th className="py-2.5 px-3">Applications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {APRIROSE_KNOWLEDGE_BASE.historicalMfiGrades.map((g, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono-tech font-semibold text-slate-900">
                            {g.family}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">{g.gradeType}</td>
                          <td className="py-2 px-3 font-mono-tech text-blue-600">{g.mfiOrSpec}</td>
                          <td className="py-2 px-3 text-slate-600">{g.applications}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {kbSubTab === 'offices' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.offices.map((off) => (
                    <div
                      key={off.id}
                      className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {off.city}, {off.country}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                          {off.role}
                        </span>
                      </div>
                      <p className="text-slate-600">{off.address}</p>
                      <div className="flex flex-wrap gap-4 pt-1 font-mono-tech text-[11px] text-slate-700">
                        <span>{off.phone}</span>
                        <span className="text-blue-600">{off.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {kbSubTab === 'history' && (
                <div className="divide-y divide-slate-200 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.companyOverview.historicalTimeline.map((item) => (
                    <div key={item.year} className="py-2.5 flex items-start gap-4">
                      <span className="font-mono-tech font-semibold text-blue-600 w-12 shrink-0">
                        {item.year}
                      </span>
                      <span className="text-slate-700">{item.event}</span>
                    </div>
                  ))}
                </div>
              )}

              {kbSubTab === 'compliance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.compliancePolicies.map((pol) => (
                    <div
                      key={pol.id}
                      className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
                    >
                      <h4 className="font-semibold text-slate-900">{pol.title}</h4>
                      <div className="font-mono-tech text-[11px] text-blue-600">
                        {pol.coverageOrDate}
                      </div>
                      <p className="text-slate-700">{pol.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SLIDE-OVER CRM LEAD INSPECTOR */}
      {selectedLead && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tech text-xs font-semibold text-blue-600">
                      {selectedLead.referenceCode}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-600">{selectedLead.assignedOffice}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">
                    {selectedLead.facts.company || 'Inbound Caller'}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pipeline Stage Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Pipeline Stage
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CRM_STAGES.map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateLeadStage(selectedLead.id, st)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer ${
                        selectedLead.stage === st
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* 25-Field Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Qualification Schema (25 Fields)
                  </span>
                  <button
                    onClick={() => handleCopySummary(selectedLead.facts, selectedLead.meeting)}
                    className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Summary
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 text-xs">
                  {(
                    [
                      ['company', 'Company Name'],
                      ['companyCountry', 'Company Country'],
                      ['buyerType', 'Buyer Type'],
                      ['contactName', 'Contact Name'],
                      ['email', 'Email'],
                      ['phone', 'Phone / WhatsApp'],
                      ['material', 'Material / Product'],
                      ['application', 'Application'],
                      ['requestedGrade', 'Requested Grade'],
                      ['mfi', 'MFI / Spec'],
                      ['quantity', 'Order Quantity'],
                      ['monthlyVolume', 'Monthly Volume'],
                      ['dischargePort', 'Discharge Port'],
                      ['destinationCountry', 'Destination Country'],
                      ['shippingTermRequested', 'Incoterm'],
                      ['paymentTermsRequested', 'Payment Terms'],
                      ['shipmentTiming', 'Shipment Timing'],
                      ['preferredProducer', 'Preferred Producer'],
                      ['technicalDocumentRequested', 'Technical Documents'],
                      ['equivalentGradeAcceptable', 'Equivalent Acceptable'],
                    ] as [keyof BuyerFacts, string][]
                  ).map(([k, label]) => {
                    const val = selectedLead.facts[k];
                    return (
                      <div key={k} className="px-3.5 py-2 flex items-center justify-between gap-4">
                        <span className="text-slate-500">{label}</span>
                        <span
                          className={`text-right ${
                            val ? 'font-medium text-slate-900' : 'text-slate-300'
                          }`}
                        >
                          {val || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GEMINI API KEY MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Gemini Live API Configuration
                </h3>
                <p className="text-xs text-slate-500">
                  Connect via WebSockets (`@google/genai` `ai.live.connect`)
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Gemini API Key</label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => {
                    setGeminiApiKey(e.target.value);
                    localStorage.setItem('aprirose_gemini_api_key', e.target.value);
                  }}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 rounded-md border border-slate-200 font-mono-tech focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Model</label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white"
                >
                  <option value="gemini-3.8-live">gemini-3.8-live</option>
                  <option value="gemini-3.1-flash-live-preview">gemini-3.1-flash-live-preview</option>
                  <option value="gemini-2.5-flash-native-audio-preview-12-2025">
                    gemini-2.5-flash-native-audio-preview-12-2025
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Voice</label>
                <select
                  value={geminiVoice}
                  onChange={(e) => setGeminiVoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white"
                >
                  <option value="Aoede">Aoede</option>
                  <option value="Kore">Kore</option>
                  <option value="Puck">Puck</option>
                  <option value="Charon">Charon</option>
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
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
