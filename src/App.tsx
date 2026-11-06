import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Package,
  Globe2,
  ShieldCheck,
  UserCheck,
  Copy,
  Check,
  Send,
  RotateCcw,
  BookOpen,
  FileText,
  Sparkles,
  Award,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import {
  APRIROSE_KNOWLEDGE_BASE,
  BuyerFacts,
  SimulatedMeetingState,
  VOICE_PERSONA_OPTIONS,
} from './data/apriroseKnowledge';
import {
  checkCommercialReadiness,
  extractFactsAndProcessTurn,
} from './lib/apriroseGroundedEngine';
import { GeminiLiveReceptionistClient } from './lib/geminiLiveService';

interface TranscriptTurn {
  id: string;
  role: 'caller' | 'receptionist';
  text: string;
  timestamp: string;
}

const QUICK_TOPICS = [
  {
    label: 'PP Raffia Quotation (100 MT)',
    prompt:
      'Hello, we are ABC Plastics Ltd based in Madagascar. We manufacture woven sacks and are looking for 100 MT of PP Raffia around MFI 3.5 shipped CIF to Tamatave on LC terms.',
  },
  {
    label: 'Provide Contact Details',
    prompt:
      'My name is John Smith. My email is john.smith@abcplastics.mg and my WhatsApp number is +261 34 12 345 67.',
  },
  {
    label: 'Schedule Sales Call',
    prompt:
      'Could we schedule a call with the commercial team for tomorrow at 10:30 AM joining from Mumbai?',
  },
  {
    label: 'Global Offices & Contacts',
    prompt:
      'Could you share the contact details for your London headquarters, Dubai branch, and Nairobi hub?',
  },
  {
    label: 'Polymers & Chemicals Portfolio',
    prompt:
      'What polymer families, MFI grades, and industrial chemicals does Aprirose supply?',
  },
];

export default function App() {
  const geminiApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  const geminiModel = 'gemini-3.8-live';
  const [geminiVoice, setGeminiVoice] = useState<string>('uk_aoede');
  const activePersona =
    VOICE_PERSONA_OPTIONS.find((p) => p.id === geminiVoice) || VOICE_PERSONA_OPTIONS[0];

  const [callStatus, setCallStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [statusDetail, setStatusDetail] = useState<string>('Ready to connect');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [audioLevels, setAudioLevels] = useState<{ input: number; output: number }>({ input: 0, output: 0 });

  const [transcript, setTranscript] = useState<TranscriptTurn[]>([
    {
      id: 'welcome-turn',
      role: 'receptionist',
      text: 'Welcome to Aprirose Trading Limited. Click "Start Call" to speak live with Sophie, our AI Receptionist & Commercial Desk Specialist, regarding polymer and chemical procurement, technical grade references, global offices, or scheduling a commercial consultation.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [buyerFacts, setBuyerFacts] = useState<BuyerFacts>({});
  const [meetingState, setMeetingState] = useState<SimulatedMeetingState>({
    status: 'none',
    validationNotes: [],
  });
  const [humanPaused, setHumanPaused] = useState(false);

  const [activeRightTab, setActiveRightTab] = useState<'crm' | 'kb'>('crm');
  const [mobileSection, setMobileSection] = useState<'call' | 'crm' | 'kb'>('call');
  const [kbSubTab, setKbSubTab] = useState<'products' | 'mfi' | 'offices' | 'history' | 'compliance'>('products');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);

  const liveClientRef = useRef<GeminiLiveReceptionistClient | null>(null);
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

  // Sync caller utterance into live CRM state alongside Gemini tool calls
  const syncCallerUtteranceToCrm = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    const result = extractFactsAndProcessTurn(
      trimmed,
      buyerFactsRef.current,
      meetingStateRef.current,
      humanPausedRef.current
    );

    if (Object.keys(result.updatedFacts).length > 0) {
      setBuyerFacts((prev) => ({ ...prev, ...result.updatedFacts }));
    }
    if (result.updatedMeeting) {
      setMeetingState((prev) => ({ ...prev, ...result.updatedMeeting }));
    }
    if (result.humanHandoffTriggered) {
      setHumanPaused(true);
    } else if (result.humanHandoffResumed) {
      setHumanPaused(false);
    }
  };

  const startLiveCall = async (overrideKey?: string, overrideVoiceId?: string) => {
    const keyToUse = (overrideKey ?? geminiApiKey).trim();
    const voiceToUse = overrideVoiceId ?? geminiVoice;

    const client = new GeminiLiveReceptionistClient({
      onStatusChange: (status, detail) => {
        setCallStatus(status);
        if (detail) setStatusDetail(detail);
      },
      onUserTranscript: (fullTurnText, isFinal) => {
        if (fullTurnText.trim()) {
          syncCallerUtteranceToCrm(fullTurnText);
        }
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'caller' && last.id.startsWith('live-user-')) {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                id: isFinal ? `caller-final-${Date.now()}` : last.id,
                text: fullTurnText,
              },
            ];
          }
          return [
            ...prev,
            {
              id: isFinal ? `caller-final-${Date.now()}` : `live-user-${Date.now()}`,
              role: 'caller',
              text: fullTurnText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ];
        });
      },
      onAssistantTranscript: (fullTurnText, isFinal) => {
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'receptionist' && last.id.startsWith('live-rec-')) {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                id: isFinal ? `rec-final-${Date.now()}` : last.id,
                text: fullTurnText,
              },
            ];
          }
          return [
            ...prev,
            {
              id: isFinal ? `rec-final-${Date.now()}` : `live-rec-${Date.now()}`,
              role: 'receptionist',
              text: fullTurnText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ];
        });
      },
      onFactsUpdated: (facts) => {
        setBuyerFacts((prev) => ({ ...prev, ...facts }));
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
      await client.connect(keyToUse, geminiModel, voiceToUse);
    } catch {
      // Handled via onStatusChange
    }
  };

  const handleToggleCall = async () => {
    if (callStatus === 'connected' || callStatus === 'connecting') {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      setAudioLevels({ input: 0, output: 0 });
      setCallStatus('disconnected');
      setStatusDetail('Call ended');
      return;
    }

    await startLiveCall();
  };

  const handleSendPromptToCall = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    syncCallerUtteranceToCrm(trimmed);

    const callerTurn: TranscriptTurn = {
      id: `caller-${Date.now()}`,
      role: 'caller',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTranscript((prev) => [...prev, callerTurn]);

    if (callStatus === 'connected' && liveClientRef.current) {
      liveClientRef.current.sendTextMessage(trimmed);
    } else {
      await startLiveCall();
      setTimeout(() => {
        liveClientRef.current?.sendTextMessage(trimmed);
      }, 900);
    }
  };

  const handleToggleMicMute = () => {
    const nextMute = !isMicMuted;
    setIsMicMuted(nextMute);
    if (liveClientRef.current) {
      liveClientRef.current.setMuted(nextMute);
    }
  };

  const handleResetSession = () => {
    setBuyerFacts({});
    setMeetingState({ status: 'none', validationNotes: [] });
    setHumanPaused(false);
    setTranscript([
      {
        id: `welcome-${Date.now()}`,
        role: 'receptionist',
        text: 'Session reset. Click "Start Call" to begin a new live voice inquiry with Aprirose Trading Limited.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const readiness = checkCommercialReadiness(buyerFacts);

  const formatLeadSummaryText = () => {
    return [
      'New Buyer Inquiry — Aprirose Trading Limited',
      `• Company: ${buyerFacts.company || 'Pending'}`,
      `• Country: ${buyerFacts.companyCountry || 'Pending'}`,
      `• Buyer Type: ${buyerFacts.buyerType || 'Pending'}`,
      `• Product: ${buyerFacts.material || 'Pending'}${buyerFacts.application ? ` (${buyerFacts.application})` : ''}`,
      `• Grade / MFI: ${[buyerFacts.requestedGrade, buyerFacts.mfi, buyerFacts.preferredProducer].filter(Boolean).join(' | ') || 'For commercial discussion'}`,
      `• Order Quantity: ${buyerFacts.quantity || 'Pending'}`,
      `• Monthly Volume: ${buyerFacts.monthlyVolume || 'Not specified'}`,
      `• Payment Term: ${buyerFacts.paymentTermsRequested || 'Not specified'}`,
      `• Shipping Term: ${buyerFacts.shippingTermRequested || 'Not specified'}`,
      `• Destination: ${[buyerFacts.dischargePort, buyerFacts.destinationCity, buyerFacts.destinationCountry].filter(Boolean).join(', ') || 'Pending'}`,
      `• Contact: ${buyerFacts.contactName || 'Pending'}`,
      `• Email: ${buyerFacts.email || 'Pending'}`,
      `• WhatsApp / Phone: ${buyerFacts.phone || 'Pending'}`,
      `• Meeting Consultation: ${
        meetingState.status === 'demo_booked'
          ? `Confirmed (${meetingState.date} at ${meetingState.clockTime} ${meetingState.amPm || ''} — ${meetingState.timezone})`
          : 'Not scheduled'
      }`,
    ].join('\n');
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(formatLeadSummaryText());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7F6] text-[#0D2B2F] pb-20 lg:pb-0">
      {/* EXECUTIVE TOP HEADER */}
      <header className="bg-[#0B2E33] text-white border-b border-[#19464C] sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1560px] mx-auto px-3.5 sm:px-8 py-2.5 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-[#143F45] border border-[#285E66] flex items-center justify-center font-serif-editorial font-bold text-base sm:text-lg text-[#D8B47C]">
              A
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="tracking-[0.22em] sm:tracking-[0.26em] font-semibold text-xs sm:text-base text-white">
                  APRIROSE
                </span>
                <span className="h-3 w-[1px] bg-[#B88A4B]" />
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.16em] text-[#D8C3A5] font-medium truncate">
                  Trading Limited
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#9BBEC2] mt-0.5 truncate">
                London HQ · AI Voice Reception & Commercial Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#11393F] border border-[#215259] text-xs text-[#C7DFE1]">
              <span
                className={`w-2 h-2 rounded-full ${
                  callStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-[#D8B47C]'
                }`}
              />
              <span>
                {callStatus === 'connected' ? 'Live Voice Active' : 'Voice Line Ready'}
              </span>
            </div>

            <button
              onClick={handleResetSession}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#143F45] hover:bg-[#1B5158] text-xs text-[#C7DFE1] border border-[#285E66] flex items-center gap-1.5 transition cursor-pointer touch-manipulation"
              title="Reset Inquiry"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-3 sm:px-8 py-3 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* LEFT COLUMN (5 COLS): VOICE RECEPTIONIST CALL CONSOLE */}
        <section
          className={`lg:col-span-5 flex flex-col gap-4 ${
            mobileSection === 'call' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="bg-white rounded-2xl border border-[#D5E0DF] shadow-xs overflow-hidden flex flex-col">
            {/* Voice Receptionist Stage */}
            <div className="bg-gradient-to-br from-[#0B2E33] via-[#103B41] to-[#082226] p-4 sm:p-6 text-white relative">
              <div className="flex items-center justify-between gap-2 mb-3 sm:mb-5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 shrink-0 rounded-full ${
                      callStatus === 'connected'
                        ? 'bg-emerald-400 animate-pulse'
                        : callStatus === 'connecting'
                        ? 'bg-amber-400 animate-ping'
                        : callStatus === 'error'
                        ? 'bg-rose-400'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-[11px] sm:text-xs font-medium tracking-wide text-[#B8D2D5] truncate">
                    {statusDetail}
                  </span>
                </div>

                {humanPaused ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-amber-500/20 text-amber-200 border border-amber-400/40 shrink-0">
                    <UserCheck className="w-3 h-3" />
                    Sales Rep Requested
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] text-[#9BBEC2] font-mono-tech shrink-0">
                    +44 20 8951 0377
                  </span>
                )}
              </div>

              {/* Central Interactive Call Orb */}
              <div className="flex flex-col items-center justify-center py-2 sm:py-5">
                <div className="relative flex items-center justify-center">
                  {callStatus === 'connected' && (
                    <>
                      <div
                        className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#B88A4B]/30 animate-pulse-ring"
                        style={{
                          transform: `scale(${1 + Math.max(audioLevels.input, audioLevels.output) * 0.5})`,
                        }}
                      />
                      <div className="absolute w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-emerald-400/15 animate-pulse" />
                    </>
                  )}

                  <button
                    onClick={handleToggleCall}
                    className={`relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-xl cursor-pointer touch-manipulation active:scale-95 ${
                      callStatus === 'connected'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-400/30'
                        : callStatus === 'connecting'
                        ? 'bg-amber-600 text-white ring-4 ring-amber-400/30'
                        : 'bg-[#B88A4B] hover:bg-[#A3773C] text-white ring-4 ring-[#B88A4B]/30'
                    }`}
                  >
                    {callStatus === 'connected' ? (
                      <>
                        <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
                        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">End Call</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
                        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
                          {callStatus === 'connecting' ? 'Connecting' : 'Start Call'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-3 sm:mt-4 text-center">
                  <h2 className="text-base sm:text-lg font-serif-editorial font-semibold text-white">
                    {activePersona.receptionistName} · Aprirose AI Receptionist
                  </h2>
                  <p className="text-[11px] text-[#D8B47C] font-medium mt-0.5">
                    {activePersona.accentSummary}
                  </p>
                  <p className="text-[11px] sm:text-xs text-[#A9C6C9] mt-1 max-w-sm px-2">
                    {callStatus === 'connected'
                      ? 'Connected — Speak naturally into your phone or microphone.'
                      : `Tap Start Call to speak live with ${activePersona.receptionistName} regarding polymers, chemicals, or scheduling.`}
                  </p>
                </div>

                {/* Microphone & Voice Controls */}
                <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-3.5 sm:mt-5">
                  <button
                    onClick={handleToggleMicMute}
                    disabled={callStatus !== 'connected'}
                    className={`px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition cursor-pointer touch-manipulation disabled:opacity-50 ${
                      isMicMuted
                        ? 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                        : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                    }`}
                  >
                    {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isMicMuted ? 'Microphone Muted' : 'Microphone Live'}
                  </button>

                  <select
                    value={geminiVoice}
                    onChange={async (e) => {
                      const nextVoiceId = e.target.value;
                      setGeminiVoice(nextVoiceId);
                      if (callStatus === 'connected' || callStatus === 'connecting') {
                        if (liveClientRef.current) {
                          liveClientRef.current.disconnect();
                          liveClientRef.current = null;
                        }
                        await startLiveCall(undefined, nextVoiceId);
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg text-base sm:text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/15 text-white cursor-pointer focus:outline-none truncate"
                    title="Select British or American Female Voice Persona"
                  >
                    <optgroup label="🇬🇧 British Female Voices (UK)" className="text-[#0D2B2F] bg-white font-semibold">
                      {VOICE_PERSONA_OPTIONS.filter((p) => p.group === 'British Female').map((persona) => (
                        <option key={persona.id} value={persona.id} className="text-[#0D2B2F] bg-white font-normal">
                          🇬🇧 {persona.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🇺🇸 American Female Voices (US)" className="text-[#0D2B2F] bg-white font-semibold">
                      {VOICE_PERSONA_OPTIONS.filter((p) => p.group === 'American Female').map((persona) => (
                        <option key={persona.id} value={persona.id} className="text-[#0D2B2F] bg-white font-normal">
                          🇺🇸 {persona.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Conversation Starters */}
            <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#EDF3F2] border-b border-[#D5E0DF]">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#3B5E63] flex items-center gap-1.5 mb-1.5 sm:mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#B88A4B]" />
                Quick Inquiry Topics (Tap to Send)
              </span>
              <div className="flex overflow-x-auto sm:flex-wrap gap-1.5 no-scrollbar pb-0.5">
                {QUICK_TOPICS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendPromptToCall(item.prompt)}
                    className="shrink-0 text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#0B2E33] active:bg-[#0B2E33] text-[#0B2E33] hover:text-white active:text-white border border-[#C6D6D5] transition font-medium cursor-pointer touch-manipulation shadow-2xs"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Call Transcript */}
            <div className="p-3.5 sm:p-4 h-[230px] sm:h-[360px] overflow-y-auto space-y-3 bg-[#F9FBFA]">
              {transcript.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex flex-col ${
                    turn.role === 'caller' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#4A6B70]">
                      {turn.role === 'caller' ? 'Caller' : `${activePersona.receptionistName} · Aprirose Reception`}
                    </span>
                    <span className="text-[10px] text-[#7A969A] font-mono-tech">{turn.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[90%] sm:max-w-[88%] rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      turn.role === 'caller'
                        ? 'bg-[#0B2E33] text-white rounded-br-xs'
                        : 'bg-white text-[#0D2B2F] border border-[#D5E0DF] rounded-bl-xs'
                    }`}
                  >
                    <p>{turn.text}</p>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            {/* Optional Written Input During Call */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inputText.trim()) return;
                handleSendPromptToCall(inputText);
                setInputText('');
              }}
              className="p-2.5 sm:p-3 bg-white border-t border-[#D5E0DF] flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type an email, grade, or message..."
                className="flex-1 text-base sm:text-sm px-3.5 py-2 rounded-xl border border-[#C6D6D5] bg-[#F6F9F8] focus:outline-none focus:border-[#0B2E33]"
              />
              <button
                type="submit"
                className="px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-xl bg-[#0B2E33] hover:bg-[#14454C] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer touch-manipulation shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT COLUMN (7 COLS): LIVE COMMERCIAL CRM & CORPORATE KNOWLEDGE BASE */}
        <section
          className={`lg:col-span-7 flex flex-col gap-4 ${
            mobileSection !== 'call' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Desktop Navigation Bar */}
          <div className="hidden lg:flex bg-white rounded-xl p-1.5 border border-[#D5E0DF] flex-wrap gap-1.5 shadow-2xs">
            <button
              onClick={() => setActiveRightTab('crm')}
              className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeRightTab === 'crm'
                  ? 'bg-[#0B2E33] text-white shadow-xs'
                  : 'text-[#3B5E63] hover:bg-[#EAF0EF]'
              }`}
            >
              <FileText className="w-4 h-4 text-[#D8B47C]" />
              Live Buyer Qualification & Meeting Desk ({readiness.score}%)
            </button>

            <button
              onClick={() => setActiveRightTab('kb')}
              className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeRightTab === 'kb'
                  ? 'bg-[#0B2E33] text-white shadow-xs'
                  : 'text-[#3B5E63] hover:bg-[#EAF0EF]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#D8B47C]" />
              Aprirose Corporate Portfolio & Global Directory
            </button>
          </div>

          {/* TAB 1: LIVE COMMERCIAL CRM & MEETING DESK */}
          {activeRightTab === 'crm' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Live Buyer Inquiry Summary Card */}
                <div className="bg-white rounded-2xl border border-[#D5E0DF] p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6EEEE]">
                      <div>
                        <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#B88A4B] font-semibold">
                          Commercial Desk · Lead Summary
                        </span>
                        <h3 className="text-base font-serif-editorial font-semibold text-[#0B2E33]">
                          New Buyer Inquiry
                        </h3>
                      </div>
                      <button
                        onClick={handleCopySummary}
                        className="px-3 py-1.5 rounded-lg bg-[#EAF0EF] hover:bg-[#D8E5E3] text-[#0B2E33] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedSummary ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy for Sales
                          </>
                        )}
                      </button>
                    </div>

                    {/* Qualification Readiness Meter */}
                    <div className="my-3.5 bg-[#F4F8F7] rounded-xl p-3.5 border border-[#DCE7E6]">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-[#0B2E33]">
                          Buyer Qualification Progress
                        </span>
                        <span
                          className={`font-mono-tech font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                            readiness.isReady
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {readiness.isReady ? 'Complete for Quotation' : `${readiness.score}%`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#DCE7E6] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0B2E33] transition-all duration-300"
                          style={{ width: `${readiness.score}%` }}
                        />
                      </div>
                      {!readiness.isReady && (
                        <p className="text-[11px] text-[#527378] mt-1.5">
                          Remaining details to gather: {readiness.missingCore.join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Structured Lead Fields */}
                    <ul className="space-y-2 text-xs mt-3">
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Company:</span>
                        <span className="font-semibold text-[#0D2B2F]">{buyerFacts.company || '—'}</span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Country:</span>
                        <span className="font-semibold text-[#0D2B2F]">{buyerFacts.companyCountry || '—'}</span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Business Type:</span>
                        <span className="font-semibold text-[#0D2B2F]">{buyerFacts.buyerType || '—'}</span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Product & Application:</span>
                        <span className="font-semibold text-[#0D2B2F]">
                          {[buyerFacts.material, buyerFacts.application].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Grade / MFI / Producer:</span>
                        <span className="font-semibold text-[#0D2B2F]">
                          {[buyerFacts.requestedGrade, buyerFacts.mfi, buyerFacts.preferredProducer]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Order Quantity:</span>
                        <span className="font-mono-tech font-semibold text-[#0B2E33]">
                          {buyerFacts.quantity || '—'}
                        </span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Monthly Volume:</span>
                        <span className="font-mono-tech font-semibold text-[#0D2B2F]">
                          {buyerFacts.monthlyVolume || '—'}
                        </span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Payment & Shipping Terms:</span>
                        <span className="font-semibold text-[#0D2B2F]">
                          {[buyerFacts.paymentTermsRequested, buyerFacts.shippingTermRequested]
                            .filter(Boolean)
                            .join(' / ') || '—'}
                        </span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Destination Port / Country:</span>
                        <span className="font-semibold text-[#0D2B2F]">
                          {[buyerFacts.dischargePort, buyerFacts.destinationCountry]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Contact Name:</span>
                        <span className="font-semibold text-[#0D2B2F]">{buyerFacts.contactName || '—'}</span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Email:</span>
                        <span className="font-mono-tech text-[#0D2B2F]">{buyerFacts.email || '—'}</span>
                      </li>
                      <li className="flex justify-between py-1">
                        <span className="text-[#527378] font-medium">WhatsApp / Phone:</span>
                        <span className="font-mono-tech text-[#0D2B2F]">{buyerFacts.phone || '—'}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Commercial Consultation / Meeting Scheduler Card */}
                <div className="bg-white rounded-2xl border border-[#D5E0DF] p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6EEEE]">
                      <div>
                        <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#B88A4B] font-semibold">
                          Consultation Desk
                        </span>
                        <h3 className="text-base font-serif-editorial font-semibold text-[#0B2E33] flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#B88A4B]" />
                          Commercial Meeting Schedule
                        </h3>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-mono-tech font-semibold ${
                          meetingState.status === 'demo_booked'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : meetingState.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : meetingState.status === 'collecting'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {meetingState.status === 'demo_booked'
                          ? 'DEMO BOOKED'
                          : meetingState.status === 'cancelled'
                          ? 'CANCELLED'
                          : meetingState.status === 'collecting'
                          ? 'COLLECTING DETAILS'
                          : 'NOT SCHEDULED'}
                      </span>
                    </div>

                    <div className="mt-3.5 bg-[#F4F8F7] rounded-xl p-3.5 border border-[#DCE7E6] space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Requested Date:</span>
                        <span className="font-semibold text-[#0D2B2F]">{meetingState.date || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Requested Time:</span>
                        <span className="font-mono-tech font-semibold text-[#0D2B2F]">
                          {meetingState.clockTime
                            ? `${meetingState.clockTime} ${
                                meetingState.amPm && meetingState.amPm !== 'resolved_24h'
                                  ? meetingState.amPm
                                  : ''
                              }`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Joining Timezone:</span>
                        <span className="font-mono-tech font-semibold text-[#0B2E33]">
                          {meetingState.timezone || '—'}
                        </span>
                      </div>
                      {meetingState.locationLabel && (
                        <div className="flex justify-between">
                          <span className="text-[#527378]">Joining Location:</span>
                          <span className="font-medium text-[#0D2B2F]">{meetingState.locationLabel}</span>
                        </div>
                      )}
                    </div>

                    {meetingState.validationNotes && meetingState.validationNotes.length > 0 && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                        {meetingState.validationNotes.map((note, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4A6B70] mb-2">
                        Meeting Confirmation Requirements:
                      </p>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              buyerFacts.contactName && buyerFacts.company
                                ? 'text-emerald-600'
                                : 'text-slate-300'
                            }`}
                          />
                          <span>Caller Name & Company Name</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              buyerFacts.email && buyerFacts.phone
                                ? 'text-emerald-600'
                                : 'text-slate-300'
                            }`}
                          />
                          <span>Verified Email Address & Phone / WhatsApp</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              buyerFacts.material ? 'text-emerald-600' : 'text-slate-300'
                            }`}
                          />
                          <span>Product / Material Requirement</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              meetingState.date &&
                              meetingState.clockTime &&
                              meetingState.amPm !== 'ambiguous' &&
                              meetingState.timezone &&
                              !meetingState.timezone.includes('Ambiguous')
                                ? 'text-emerald-600'
                                : 'text-slate-300'
                            }`}
                          />
                          <span>Confirmed Date, Time (AM/PM) & Joining Timezone</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E6EEEE] text-[11px] text-[#527378] leading-relaxed">
                    Meetings booked through the interactive showcase are recorded as simulated bookings in the CRM for commercial team review.
                  </div>
                </div>
              </div>

              {/* Expandable Full 25-Field CRM View */}
              <div className="bg-white rounded-2xl border border-[#D5E0DF] p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#B88A4B] font-semibold">
                      CRM Data Record
                    </span>
                    <h3 className="text-sm font-serif-editorial font-semibold text-[#0B2E33]">
                      Complete 25-Field Buyer Profile
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAllFields(!showAllFields)}
                    className="text-xs font-semibold text-[#0B2E33] hover:text-[#B88A4B] flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showAllFields ? 'Hide Extended Fields' : 'View All 25 CRM Fields'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showAllFields && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs mt-4 pt-3 border-t border-[#E6EEEE]">
                    {(
                      [
                        ['company', 'Company Name'],
                        ['companyCountry', 'Company Country'],
                        ['buyerType', 'Buyer Business Type'],
                        ['contactName', 'Contact Name'],
                        ['email', 'Email'],
                        ['phone', 'Phone / WhatsApp'],
                        ['material', 'Product / Material'],
                        ['application', 'Application'],
                        ['requestedGrade', 'Requested Grade'],
                        ['mfi', 'MFI Specification'],
                        ['technicalSpecification', 'Technical Spec'],
                        ['quantity', 'Order Quantity'],
                        ['monthlyVolume', 'Monthly Volume'],
                        ['dischargePort', 'Discharge Port'],
                        ['destinationCountry', 'Destination Country'],
                        ['destinationCity', 'Destination City'],
                        ['shippingTermRequested', 'Shipping Term (Incoterm)'],
                        ['paymentTermsRequested', 'Payment Terms'],
                        ['shipmentTiming', 'Shipment Timing'],
                        ['preferredProducer', 'Preferred Producer'],
                        ['preferredOrigin', 'Preferred Origin'],
                        ['preferredContactMethod', 'Preferred Contact Method'],
                        ['technicalDocumentRequested', 'Technical Doc Requested'],
                        ['specialRequirements', 'Special Requirements'],
                        ['equivalentGradeAcceptable', 'Equivalent Acceptable'],
                      ] as [keyof BuyerFacts, string][]
                    ).map(([key, label]) => {
                      const val = buyerFacts[key];
                      return (
                        <div
                          key={key}
                          className={`p-2.5 rounded-xl border transition ${
                            val
                              ? 'bg-[#F2F8F7] border-[#9BC2BE]'
                              : 'bg-[#FAFBFB] border-[#E5ECEB] opacity-75'
                          }`}
                        >
                          <span className="text-[11px] font-medium text-[#4A6B70] block">{label}</span>
                          <div className="font-semibold text-[#0D2B2F] mt-1 truncate">
                            {val || <span className="text-[#9AB0B3] font-normal">—</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APRIROSE CORPORATE PORTFOLIO & GLOBAL DIRECTORY */}
          {activeRightTab === 'kb' && (
            <div className="bg-white rounded-2xl border border-[#D5E0DF] p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap gap-1.5 pb-3 border-b border-[#E6EEEE]">
                {(
                  [
                    ['products', 'Polymers, Chemicals & Brands'],
                    ['mfi', 'Technical Grade & MFI Reference'],
                    ['offices', 'Global Offices & Markets'],
                    ['history', 'Company Milestones & Testimonials'],
                    ['compliance', 'Compliance & ESG Policies'],
                  ] as [typeof kbSubTab, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setKbSubTab(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      kbSubTab === id
                        ? 'bg-[#B88A4B] text-white'
                        : 'bg-[#F2F6F5] text-[#35565B] hover:bg-[#E3ECEB]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {kbSubTab === 'products' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.polymers.map((poly) => (
                      <div key={poly.group} className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                        <h4 className="font-serif-editorial font-semibold text-sm text-[#0B2E33]">
                          {poly.group}
                        </h4>
                        <div className="mt-1.5 flex flex-wrap gap-1">
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
                        <p className="mt-1 text-[11px] font-mono-tech text-[#0B2E33]">
                          {poly.publicRangeSummary}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                      <h4 className="font-semibold text-[#0B2E33] mb-1.5">Industrial Chemicals & PU</h4>
                      <ul className="space-y-1 text-[#35565B]">
                        {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.chemicals.map((c) => (
                          <li key={c}>• {c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                      <h4 className="font-semibold text-[#0B2E33] mb-1.5">Additives & Bulk Commodities</h4>
                      <ul className="space-y-1 text-[#35565B]">
                        {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.additivesAndMasterbatches.map((a) => (
                          <li key={a}>• {a}</li>
                        ))}
                      </ul>
                      <h5 className="font-semibold text-[#0B2E33] mt-3 mb-1">Bulk Commodities</h5>
                      <p className="text-[#35565B]">
                        {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.bulkCommodities.join(' · ')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                      <h4 className="font-semibold text-[#0B2E33] mb-1.5">Published Brands (Reference)</h4>
                      <p className="text-[#35565B] mb-2">
                        <strong>Polymers:</strong>{' '}
                        {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.publishedBrands.polymers.join(', ')}
                      </p>
                      <p className="text-[#35565B] mb-2">
                        <strong>Chemicals:</strong>{' '}
                        {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.publishedBrands.chemicals.join(', ')}
                      </p>
                      <p className="text-[11px] text-[#68878B] italic">
                        {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.publishedBrands.boundaryNote}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {kbSubTab === 'mfi' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#F4F8F7] border border-[#C6D6D5] text-[#2D4D52]">
                    <strong>Technical Reference Note:</strong> Exact grade suitability, food-contact status, pressure ratings, and test conditions require manufacturer Technical Data Sheets (TDS) and commercial review.
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#0B2E33] text-white text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3 rounded-tl-lg">Family</th>
                          <th className="py-2.5 px-3">Grade / Process</th>
                          <th className="py-2.5 px-3">MFI / Reference Range</th>
                          <th className="py-2.5 px-3 rounded-tr-lg">Typical Applications</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5ECEB]">
                        {APRIROSE_KNOWLEDGE_BASE.historicalMfiGrades.map((g, i) => (
                          <tr key={i} className="hover:bg-[#F4F8F7]">
                            <td className="py-2 px-3 font-mono-tech font-semibold text-[#0B2E33]">
                              {g.family}
                            </td>
                            <td className="py-2 px-3 font-semibold">{g.gradeType}</td>
                            <td className="py-2 px-3 font-mono-tech text-[#B88A4B] font-medium">
                              {g.mfiOrSpec}
                            </td>
                            <td className="py-2 px-3 text-[#4A6B70]">{g.applications}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {kbSubTab === 'offices' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {APRIROSE_KNOWLEDGE_BASE.offices.map((off) => (
                      <div key={off.id} className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-serif-editorial font-semibold text-sm text-[#0B2E33] flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#B88A4B]" />
                            {off.city}, {off.country}
                          </span>
                          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-[#0B2E33] text-white">
                            {off.role}
                          </span>
                        </div>
                        <p className="text-[#35565B]">{off.address}</p>
                        <div className="flex flex-wrap gap-3 pt-1 font-mono-tech text-[11px] text-[#0B2E33]">
                          <span>Tel: {off.phone}</span>
                          <span>Email: {off.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                    <h4 className="font-semibold text-[#0B2E33] mb-2 flex items-center gap-1.5">
                      <Globe2 className="w-4 h-4 text-[#B88A4B]" />
                      Selected Global Markets (25 Countries)
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {APRIROSE_KNOWLEDGE_BASE.selectedMarkets.map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#C6D6D5] text-[#0D2B2F] font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {kbSubTab === 'history' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <h4 className="font-serif-editorial font-semibold text-sm text-[#0B2E33] mb-2">
                      Corporate Timeline & Milestones (1996 – 2023)
                    </h4>
                    <div className="space-y-2">
                      {APRIROSE_KNOWLEDGE_BASE.companyOverview.historicalTimeline.map((item) => (
                        <div
                          key={item.year}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F6F9F8] border border-[#E2ECEB]"
                        >
                          <span className="font-mono-tech font-bold text-[#B88A4B] px-2 py-0.5 bg-white rounded border border-[#DEC9A8]">
                            {item.year}
                          </span>
                          <span className="text-[#2D4D52]">{item.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-serif-editorial font-semibold text-sm text-[#0B2E33] mb-2 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#B88A4B]" />
                      Published Client Testimonials
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {APRIROSE_KNOWLEDGE_BASE.customerTestimonials.map((t) => (
                        <div key={t.person} className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                          <div className="font-semibold text-[#0B2E33]">
                            {t.person} — <span className="text-[#B88A4B]">{t.role}, {t.company}</span>
                          </div>
                          <p className="text-[#35565B] mt-1 leading-relaxed">{t.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {kbSubTab === 'compliance' && (
                <div className="space-y-3 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.compliancePolicies.map((pol) => (
                    <div key={pol.id} className="p-4 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF] space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-serif-editorial font-semibold text-sm text-[#0B2E33] flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#B88A4B]" />
                          {pol.title}
                        </h4>
                        <span className="font-mono-tech text-[11px] px-2.5 py-0.5 rounded bg-white border border-[#C6D6D5] text-[#4A6B70]">
                          {pol.coverageOrDate}
                        </span>
                      </div>
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
          )}
        </section>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (PHONE & TABLET PORTRAIT) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B2E33] text-white border-t border-[#1F5057] shadow-lg pb-safe">
        <div className="grid grid-cols-3 h-14">
          <button
            onClick={() => setMobileSection('call')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition cursor-pointer touch-manipulation ${
              mobileSection === 'call'
                ? 'text-[#D8B47C] bg-[#143F45]'
                : 'text-[#A9C6C9] hover:text-white'
            }`}
          >
            <div className="relative">
              <Phone className="w-4 h-4" />
              {callStatus === 'connected' && (
                <span className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <span>Voice Call</span>
          </button>

          <button
            onClick={() => {
              setMobileSection('crm');
              setActiveRightTab('crm');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition cursor-pointer touch-manipulation ${
              mobileSection === 'crm'
                ? 'text-[#D8B47C] bg-[#143F45]'
                : 'text-[#A9C6C9] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Live CRM ({readiness.score}%)</span>
          </button>

          <button
            onClick={() => {
              setMobileSection('kb');
              setActiveRightTab('kb');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition cursor-pointer touch-manipulation ${
              mobileSection === 'kb'
                ? 'text-[#D8B47C] bg-[#143F45]'
                : 'text-[#A9C6C9] hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Company Info</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
