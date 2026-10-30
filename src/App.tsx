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
  HelpCircle,
  Radio,
  Award,
} from 'lucide-react';
import {
  APRIROSE_KNOWLEDGE_BASE,
  BuyerFacts,
  GroundedClaim,
  SimulatedMeetingState,
} from './data/apriroseKnowledge';
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

const QUICK_SCENARIOS = [
  {
    label: '1. PP Raffia Enquiry (100 MT to Tamatave)',
    prompt:
      'Hi, we are ABC Plastics Ltd based in Madagascar. We are a manufacturer looking for 100 MT of PP Raffia grade around MFI 3.5, ideally Jinneng, shipped CIF to Tamatave port on LC payment terms, and our monthly consumption is 250 MT per month.',
  },
  {
    label: '2. Supply Caller Contact Details',
    prompt:
      'My name is John Smith. You can reach me at john.smith@abcplastics.mg and my WhatsApp phone number is +261 34 12 345 67.',
  },
  {
    label: '3. Book Simulated Meeting (Tomorrow 10:30 AM Mumbai)',
    prompt:
      'Can we schedule a sales meeting for tomorrow at 10:30 AM joining from Mumbai, India?',
  },
  {
    label: '4. Test "930 IST" Ambiguity Guardrail',
    prompt:
      'I would like to book a meeting for Friday at 930 IST.',
  },
  {
    label: '5. Ask 2025 Revenue ($62M vs $63M) & Scale',
    prompt:
      'What is Aprirose Trading’s 2025 turnover, annual polymer volume, and total employee headcount?',
  },
  {
    label: '6. Ask Polyurethane vs PVC/PET Boundary',
    prompt:
      'Which polyurethanes do you supply, and are PVC or PET considered polyurethanes?',
  },
  {
    label: '7. Ask Global Offices & Fax Number',
    prompt:
      'Where are your offices located and what is your London fax number?',
  },
  {
    label: '8. Request Human Handoff',
    prompt:
      'Could I please speak to a human representative from the sales team?',
  },
];

export default function App() {
  // Engine & Connection State
  const [engineMode, setEngineMode] = useState<'gemini-live' | 'browser-voice'>('browser-voice');
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    () => localStorage.getItem('aprirose_gemini_api_key') || ''
  );
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.8-live');
  const [geminiVoice, setGeminiVoice] = useState<string>('Aoede');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [callStatus, setCallStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [statusDetail, setStatusDetail] = useState<string>('Ready to start voice call');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isListeningStt, setIsListeningStt] = useState(false);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const [audioLevels, setAudioLevels] = useState<{ input: number; output: number }>({ input: 0, output: 0 });

  // Conversation & CRM State
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([
    {
      id: 'welcome-turn',
      role: 'receptionist',
      text: 'Hi! Welcome to Aprirose Trading Limited. I can assist you with requesting a polymer or chemical quotation, learning about Aprirose’s grades, producers, global offices, and compliance policies, or scheduling a simulated sales meeting. How can we help you today?',
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

  // Right Panel Tabs
  const [activeRightTab, setActiveRightTab] = useState<'crm' | 'claims' | 'kb'>('crm');
  const [kbSubTab, setKbSubTab] = useState<'products' | 'mfi' | 'offices' | 'history' | 'compliance'>('products');
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

  // Speak text using Browser Neural SpeechSynthesis (used in browser-voice mode)
  const speakText = (text: string) => {
    if (!isTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\*\*/g, '');
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
      setAudioLevels({ input: 0, output: 0.65 });
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

      // If connected to Gemini Live API via WebSocket, send text to the live session
      if (engineMode === 'gemini-live' && callStatus === 'connected' && liveClientRef.current) {
        setTranscript((prev) => [...prev, callerTurn]);
        liveClientRef.current.sendTextMessage(trimmed);
        return;
      }

      // Otherwise respond immediately with our Grounded Aprirose Receptionist Engine + Neural TTS
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
      setStatusDetail('Call ended');
      return;
    }

    // Starting a call
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
                { ...last, text: isFinal ? text : `${ last.text } ${text}`.trim() },
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
        // Error already handled in callback
      }
    } else {
      // Browser Voice Mode (Web Speech API STT + Neural TTS)
      setCallStatus('connected');
      setStatusDetail('Live Browser Voice Call Active');
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
      setStatusDetail('Voice Call Active (Use scenario chips or text input; SpeechRecognition unsupported in this browser)');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-GB';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListeningStt(true);
    };

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult && lastResult.isFinal) {
        const spoken = lastResult[0].transcript;
        if (spoken && spoken.trim()) {
          handleCallerInput(spoken.trim(), false);
        }
      }
    };

    recognition.onerror = () => {
      setIsListeningStt(false);
    };

    recognition.onend = () => {
      setIsListeningStt(false);
    };

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

  const handleResetSession = () => {
    setBuyerFacts({});
    setFactEvidence({});
    setMeetingState({ status: 'none', validationNotes: [] });
    setHumanPaused(false);
    setGroundedClaims([]);
    setTranscript([
      {
        id: `welcome-${Date.now()}`,
        role: 'receptionist',
        text: 'Hi! Welcome to Aprirose Trading Limited. How can we help you today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const readiness = checkCommercialReadiness(buyerFacts);
  const meetingReadiness = checkSimulatedMeetingReadiness(buyerFacts, meetingState);

  const formatLeadSummaryText = () => {
    return [
      'New Buyer Inquiry — Aprirose Trading Limited',
      `• Company: ${buyerFacts.company || 'Pending'}`,
      `• Country: ${buyerFacts.companyCountry || 'Pending'}`,
      `• Buyer Type: ${buyerFacts.buyerType || 'Pending'}`,
      `• Product: ${buyerFacts.material || 'Pending'}${buyerFacts.application ? ` (${buyerFacts.application})` : ''}`,
      `• Grade / MFI: ${[buyerFacts.requestedGrade, buyerFacts.mfi, buyerFacts.preferredProducer].filter(Boolean).join(' | ') || 'For commercial discussion'}`,
      `• Order Quantity: ${buyerFacts.quantity || 'Pending (Required for commercial readiness)'}`,
      `• Monthly Volume: ${buyerFacts.monthlyVolume || 'Not specified'}`,
      `• Payment Term: ${buyerFacts.paymentTermsRequested || 'Not specified'}`,
      `• Shipping Term: ${buyerFacts.shippingTermRequested || 'Not specified'}`,
      `• Destination: ${[buyerFacts.dischargePort, buyerFacts.destinationCity, buyerFacts.destinationCountry].filter(Boolean).join(', ') || 'Pending'}`,
      `• Contact: ${buyerFacts.contactName || 'Pending'}`,
      `• Email: ${buyerFacts.email || 'Pending'}`,
      `• WhatsApp / Phone: ${buyerFacts.phone || 'Pending'}`,
      `• Simulated Meeting: ${
        meetingState.status === 'demo_booked'
          ? `DEMO BOOKED — ${meetingState.date} at ${meetingState.clockTime} ${meetingState.amPm || ''} (${meetingState.timezone})`
          : 'Not booked'
      }`,
    ].join('\n');
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(formatLeadSummaryText());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7F6] text-[#0D2B2F]">
      {/* TOP CORPORATE HEADER */}
      <header className="bg-[#0D3438] text-white border-b border-[#1B4B50] sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <span className="tracking-[0.28em] font-semibold text-sm sm:text-base text-white">
                  APRIROSE
                </span>
                <span className="h-3.5 w-[1px] bg-[#B08448]" />
                <span className="text-xs uppercase tracking-[0.16em] text-[#D8C3A5] font-medium">
                  Trading Limited
                </span>
              </div>
              <p className="text-xs text-[#A3C1C4] mt-0.5">
                AI Voice Receptionist & Live Buyer Qualification Desk · Snapshot 25 Oct 2026 (Rev 1529929)
              </p>
            </div>
          </div>

          {/* Engine Mode Switcher & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-[#082225] p-1 border border-[#1E4E54]">
              <button
                onClick={() => setEngineMode('browser-voice')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  engineMode === 'browser-voice'
                    ? 'bg-[#B08448] text-white shadow-xs'
                    : 'text-[#A3C1C4] hover:text-white'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                Instant Grounded Voice
              </button>
              <button
                onClick={() => {
                  setEngineMode('gemini-live');
                  if (!geminiApiKey) setShowSettingsModal(true);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  engineMode === 'gemini-live'
                    ? 'bg-[#B08448] text-white shadow-xs'
                    : 'text-[#A3C1C4] hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                Gemini Live API ({geminiModel})
              </button>
            </div>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3 py-1.5 rounded-lg bg-[#154348] hover:bg-[#1D555B] text-xs font-medium text-[#E2ECEB] border border-[#276066] flex items-center gap-1.5 transition cursor-pointer"
              title="Configure Gemini Live API Key & Voice"
            >
              <Settings className="w-3.5 h-3.5 text-[#D8C3A5]" />
              <span>{geminiApiKey ? 'API Key Configured' : 'Set Gemini API Key'}</span>
            </button>

            <button
              onClick={handleResetSession}
              className="px-2.5 py-1.5 rounded-lg bg-[#154348] hover:bg-[#1D555B] text-xs text-[#E2ECEB] border border-[#276066] flex items-center gap-1 transition cursor-pointer"
              title="Reset Call & CRM Intake"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (5 COLS): VOICE RECEPTIONIST CONSOLE & TRANSCRIPT */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* Interactive Voice Receptionist Call Card */}
          <div className="bg-white rounded-2xl border border-[#D5E0DF] shadow-xs overflow-hidden">
            <div className="bg-gradient-to-br from-[#0D3438] via-[#113F44] to-[#0A2629] p-5 text-white relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      callStatus === 'connected'
                        ? 'bg-emerald-400 animate-pulse'
                        : callStatus === 'connecting'
                        ? 'bg-amber-400 animate-ping'
                        : callStatus === 'error'
                        ? 'bg-rose-400'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs font-mono-tech uppercase tracking-wider text-[#B8D2D5]">
                    {statusDetail}
                  </span>
                </div>

                {humanPaused && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-200 border border-amber-400/40">
                    <UserCheck className="w-3.5 h-3.5" />
                    Human Handoff Active (Intake Paused)
                  </span>
                )}
              </div>

              {/* Central Voice Orb & Controls */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative flex items-center justify-center">
                  {(callStatus === 'connected' || isSpeakingTts || isListeningStt) && (
                    <>
                      <div
                        className="absolute w-28 h-28 rounded-full bg-[#B08448]/30 animate-pulse-ring"
                        style={{
                          transform: `scale(${1 + Math.max(audioLevels.input, audioLevels.output) * 0.45})`,
                        }}
                      />
                      <div className="absolute w-24 h-24 rounded-full bg-emerald-400/15 animate-pulse" />
                    </>
                  )}

                  <button
                    onClick={handleToggleCall}
                    className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-lg cursor-pointer ${
                      callStatus === 'connected'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-400/30'
                        : 'bg-[#B08448] hover:bg-[#9B713B] text-white ring-4 ring-[#B08448]/30'
                    }`}
                  >
                    {callStatus === 'connected' ? (
                      <>
                        <PhoneOff className="w-7 h-7 mb-0.5" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">End</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-7 h-7 mb-0.5" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Call</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <h2 className="text-lg font-serif-editorial font-semibold text-white">
                    Aprirose London Reception & Commercial Desk
                  </h2>
                  <p className="text-xs text-[#A9C6C9] mt-0.5">
                    {isSpeakingTts
                      ? 'Receptionist speaking...'
                      : isListeningStt
                      ? 'Listening to caller microphone...'
                      : callStatus === 'connected'
                      ? 'Connected — Speak into your microphone or select a caller prompt below'
                      : 'Click Call to start live voice session or test any buyer scenario below'}
                  </p>
                </div>

                {/* Audio Toolbar */}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleToggleMicMute}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                      isMicMuted
                        ? 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                        : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                    }`}
                  >
                    {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isMicMuted ? 'Mic Muted' : 'Mic Active'}
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                      !isTtsEnabled
                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                        : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                    }`}
                  >
                    {isTtsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    {isTtsEnabled ? 'Voice Audio On' : 'Voice Muted'}
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Caller Scenario Chips */}
            <div className="p-3.5 bg-[#EAF0EF] border-b border-[#D5E0DF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#335C62] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#B08448]" />
                  Simulate Caller Voice Prompts (Tests KB Qualification & Guardrails)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SCENARIOS.map((sc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCallerInput(sc.prompt, false)}
                    className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#0D3438] text-[#0D3438] hover:text-white border border-[#C6D6D5] transition font-medium cursor-pointer shadow-2xs"
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Conversation Transcript */}
            <div className="p-4 h-[390px] overflow-y-auto space-y-3 bg-[#F9FBFA]">
              {transcript.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex flex-col ${
                    turn.role === 'caller' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4A6B70]">
                      {turn.role === 'caller' ? 'Caller (Buyer)' : 'Aprirose Voice Receptionist'}
                    </span>
                    <span className="text-[10px] text-[#7A969A] font-mono-tech">{turn.timestamp}</span>
                    {turn.role === 'receptionist' && (
                      <button
                        onClick={() => speakText(turn.text)}
                        className="text-[#4A6B70] hover:text-[#0D3438] cursor-pointer"
                        title="Replay spoken audio"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-2xs ${
                      turn.role === 'caller'
                        ? 'bg-[#0D3438] text-white rounded-br-xs'
                        : 'bg-white text-[#0D2B2F] border border-[#D5E0DF] rounded-bl-xs'
                    }`}
                  >
                    <p>{turn.text}</p>

                    {turn.extractedKeys && turn.extractedKeys.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-white/15 flex flex-wrap gap-1">
                        {turn.extractedKeys.map((k) => (
                          <span
                            key={k}
                            className="text-[10px] font-mono-tech px-1.5 py-0.5 rounded bg-[#B08448]/30 text-[#F5E6D3]"
                          >
                            +{k}
                          </span>
                        ))}
                      </div>
                    )}

                    {turn.askedFields && turn.askedFields.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-[#E6EEEE] flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-mono-tech text-[#5A7A7E]">askedFields:</span>
                        {turn.askedFields.map((f) => (
                          <span
                            key={f}
                            className="text-[10px] font-mono-tech px-1.5 py-0.5 rounded bg-[#EAF0EF] text-[#0D3438]"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            {/* Spoken / Text Utterance Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inputText.trim()) return;
                handleCallerInput(inputText, false);
                setInputText('');
              }}
              className="p-3 bg-white border-t border-[#D5E0DF] flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Speak into mic or type what the caller says (e.g. 'We need 40 MT HDPE PE100 pipe grade to Mombasa')..."
                className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-[#C6D6D5] bg-[#F6F9F8] focus:outline-none focus:border-[#0D3438]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0D3438] hover:bg-[#164A50] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT COLUMN (7 COLS): LIVE CRM, SIMULATED MEETING & KNOWLEDGE BASE */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Navigation Tabs */}
          <div className="bg-white rounded-xl p-1.5 border border-[#D5E0DF] flex flex-wrap gap-1.5 shadow-2xs">
            <button
              onClick={() => setActiveRightTab('crm')}
              className={`flex-1 min-w-[180px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeRightTab === 'crm'
                  ? 'bg-[#0D3438] text-white shadow-xs'
                  : 'text-[#3B5E63] hover:bg-[#EAF0EF]'
              }`}
            >
              <FileText className="w-4 h-4 text-[#B08448]" />
              Live Buyer Qualification & Lead Summary ({readiness.score}%)
            </button>

            <button
              onClick={() => setActiveRightTab('claims')}
              className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeRightTab === 'claims'
                  ? 'bg-[#0D3438] text-white shadow-xs'
                  : 'text-[#3B5E63] hover:bg-[#EAF0EF]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#B08448]" />
              Source Grounding & Guardrails ({groundedClaims.length})
            </button>

            <button
              onClick={() => setActiveRightTab('kb')}
              className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeRightTab === 'kb'
                  ? 'bg-[#0D3438] text-white shadow-xs'
                  : 'text-[#3B5E63] hover:bg-[#EAF0EF]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#B08448]" />
              Aprirose Knowledge Base (38-Page Reference)
            </button>
          </div>

          {/* TAB 1: LIVE BUYER QUALIFICATION & SIMULATED MEETING */}
          {activeRightTab === 'crm' && (
            <div className="space-y-4">
              {/* Top Row: Sales Lead Summary Card (Page 38 Spec) + Simulated Meeting Card (Page 22 Spec) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sales Team Lead Summary Card */}
                <div className="bg-white rounded-2xl border border-[#D5E0DF] p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6EEEE]">
                      <div>
                        <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#B08448] font-semibold">
                          Page 21 & 38 Spec · Sales Handoff
                        </span>
                        <h3 className="text-base font-serif-editorial font-semibold text-[#0D3438]">
                          Live Buyer Inquiry Summary
                        </h3>
                      </div>
                      <button
                        onClick={handleCopySummary}
                        className="px-2.5 py-1.5 rounded-lg bg-[#EAF0EF] hover:bg-[#D8E5E3] text-[#0D3438] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedSummary ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
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

                    {/* Commercial Readiness Progress */}
                    <div className="my-3 bg-[#F4F8F7] rounded-xl p-3 border border-[#DCE7E6]">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-[#0D3438]">
                          Commercial Readiness Check
                        </span>
                        <span
                          className={`font-mono-tech font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                            readiness.isReady
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {readiness.isReady ? 'Ready for Sales Review' : `${readiness.score}% Complete`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#DCE7E6] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0D3438] transition-all duration-300"
                          style={{ width: `${readiness.score}%` }}
                        />
                      </div>
                      {!readiness.isReady && (
                        <p className="text-[11px] text-[#527378] mt-1.5">
                          Missing context: {readiness.missingCore.join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Key Lead Summary Bullet List */}
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
                        <span className="text-[#527378] font-medium">Buyer Type:</span>
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
                        <span className="font-mono-tech font-semibold text-[#0D3438]">
                          {buyerFacts.quantity || '—'}
                        </span>
                      </li>
                      <li className="flex justify-between py-1 border-b border-[#F0F4F4]">
                        <span className="text-[#527378] font-medium">Monthly Volume (Independent):</span>
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

                {/* Simulated Meeting Booking Card (Section 11 & 13 Spec) */}
                <div className="bg-white rounded-2xl border border-[#D5E0DF] p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6EEEE]">
                      <div>
                        <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#B08448] font-semibold">
                          Section 11 Spec · Demo CRM Simulation
                        </span>
                        <h3 className="text-base font-serif-editorial font-semibold text-[#0D3438] flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#B08448]" />
                          Simulated Meeting Status
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
                          ? 'COLLECTING SLOT'
                          : 'NO MEETING REQUESTED'}
                      </span>
                    </div>

                    {/* Slot Details */}
                    <div className="mt-3 bg-[#F4F8F7] rounded-xl p-3.5 border border-[#DCE7E6] space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Date:</span>
                        <span className="font-semibold text-[#0D2B2F]">{meetingState.date || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Clock Time & AM/PM:</span>
                        <span className="font-mono-tech font-semibold text-[#0D2B2F]">
                          {meetingState.clockTime
                            ? `${meetingState.clockTime} (${meetingState.amPm || 'ambiguous'})`
                            : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#527378]">Joining Timezone (IANA):</span>
                        <span className="font-mono-tech font-semibold text-[#0D3438]">
                          {meetingState.timezone || 'Not set'}
                        </span>
                      </div>
                      {meetingState.locationLabel && (
                        <div className="flex justify-between">
                          <span className="text-[#527378]">Mapped Location Alias:</span>
                          <span className="font-medium text-[#0D2B2F]">{meetingState.locationLabel}</span>
                        </div>
                      )}
                    </div>

                    {/* Validation Warnings (e.g. IST ambiguity or missing AM/PM) */}
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

                    {/* Minimum Criteria Checklist for Demo Booking */}
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4A6B70] mb-2">
                        Mandatory Demo Booking Gate (All 4 Required):
                      </p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              buyerFacts.contactName && buyerFacts.company
                                ? 'text-emerald-600'
                                : 'text-slate-300'
                            }`}
                          />
                          <span>1. Customer Name & Company Name</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              buyerFacts.email && buyerFacts.phone
                                ? 'text-emerald-600'
                                : 'text-slate-300'
                            }`}
                          />
                          <span>2. Both Valid Email AND Phone/WhatsApp</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              buyerFacts.material ? 'text-emerald-600' : 'text-slate-300'
                            }`}
                          />
                          <span>3. Relevant Product / Material Requirement</span>
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
                          <span>4. Unambiguous Date, Clock (AM/PM) & Joining Timezone</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E6EEEE] text-[11px] text-[#527378] leading-relaxed">
                    <strong>Safeguard:</strong> Simulated bookings are clearly labelled as a demo in the CRM. The assistant never claims a real calendar invite, live availability check, or staff alert was sent.
                  </div>
                </div>
              </div>

              {/* Complete 25-Field Customer Fact Inventory */}
              <div className="bg-white rounded-2xl border border-[#D5E0DF] p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#B08448] font-semibold">
                      Section 10 · Complete Customer-Fact Field Inventory (25 Fields)
                    </span>
                    <h3 className="text-sm font-serif-editorial font-semibold text-[#0D3438]">
                      Extracted Schema & Verbatim Caller Evidence
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
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
                      ['mfi', 'MFI'],
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
                    const ev = factEvidence[key];
                    return (
                      <div
                        key={key}
                        className={`p-2.5 rounded-xl border transition ${
                          val
                            ? 'bg-[#F2F8F7] border-[#9BC2BE]'
                            : 'bg-[#FAFBFB] border-[#E5ECEB] opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-[#4A6B70]">{label}</span>
                          <span className="text-[10px] font-mono-tech text-[#7A969A]">{key}</span>
                        </div>
                        <div className="font-semibold text-[#0D2B2F] mt-1 truncate">
                          {val || <span className="text-[#9AB0B3] font-normal">Not supplied</span>}
                        </div>
                        {ev && (
                          <div className="text-[10px] text-[#527378] mt-1 truncate italic">
                            Evidence: "{ev}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SOURCE GROUNDING & SAFEGUARDS */}
          {activeRightTab === 'claims' && (
            <div className="bg-white rounded-2xl border border-[#D5E0DF] p-5 shadow-2xs space-y-4">
              <div className="border-b border-[#E6EEEE] pb-3">
                <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#B08448] font-semibold">
                  Section 01 & 13 · Factual Grounding Contract
                </span>
                <h3 className="text-base font-serif-editorial font-semibold text-[#0D3438]">
                  Active Source-Conflict & Boundary Guardrails
                </h3>
                <p className="text-xs text-[#527378] mt-0.5">
                  Every affirmative company statement is grounded in the supplied snapshot (Revision 1529929) with explicit date and provenance qualifications.
                </p>
              </div>

              {/* Core Distinctions Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="font-semibold text-amber-950 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    2025 Financial Conflict (Unresolved)
                  </div>
                  <p className="text-amber-900 leading-relaxed">
                    Prior owner-confirmed 2025 consolidated group turnover is <strong>US$62M</strong> vs latest public website 2025 revenue of <strong>US$63M</strong>. The receptionist never picks one as settled and states that entity/reporting basis requires team confirmation.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F4F8F7] border border-[#CFE0DF]">
                  <div className="font-semibold text-[#0D3438] flex items-center gap-1.5 mb-1">
                    <Clock className="w-4 h-4 text-[#B08448]" />
                    Undated Profile Snapshot vs 2022 Dated Scale
                  </div>
                  <p className="text-[#35565B] leading-relaxed">
                    <strong>2022 Dated:</strong> 70,000 MTS polymer volume & US$79M turnover. <br />
                    <strong>Undated Profile Snapshot:</strong> 80,000 MT polymer, 25,000 MT chemical, 50 employees, 50+ countries, US$100M turnover (never presented as current verified capacity).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F4F8F7] border border-[#CFE0DF]">
                  <div className="font-semibold text-[#0D3438] flex items-center gap-1.5 mb-1">
                    <Package className="w-4 h-4 text-[#B08448]" />
                    Polymer vs Polyurethane Classification
                  </div>
                  <p className="text-[#35565B] leading-relaxed">
                    <strong>PVC</strong> is a thermoplastic vinyl polymer and <strong>PET</strong> is a thermoplastic polyester — <em>neither is a polyurethane</em>. Polyurethanes focus exclusively on <strong>TDI</strong> and <strong>Polyol</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F4F8F7] border border-[#CFE0DF]">
                  <div className="font-semibold text-[#0D3438] flex items-center gap-1.5 mb-1">
                    <Globe2 className="w-4 h-4 text-[#B08448]" />
                    Warehouses vs Representatives & No Fax
                  </div>
                  <p className="text-[#35565B] leading-relaxed">
                    Profile lists an associate company/warehouse in <strong>Kenya</strong> and a warehouse partnership in <strong>Djibouti</strong>. France, Portugal, and Vietnam are representatives, not verified warehouses. <strong>Fax is no longer used.</strong>
                  </p>
                </div>
              </div>

              {/* Live Grounded Claims Log */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#4A6B70] mb-2.5">
                  Verified Business Claims Emitted in Current Session ({groundedClaims.length})
                </h4>
                {groundedClaims.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-[#F9FBFA] border border-[#E5ECEB] text-xs text-[#68878B]">
                    Ask about Aprirose financials, offices, warehouses, polyurethanes, brands, or compliance policies to see live `businessClaims` with `sourceId` and verbatim `evidenceQuote`.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {groundedClaims.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl bg-[#F4F8F7] border border-[#C6D6D5] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono-tech text-[11px] px-2 py-0.5 rounded bg-[#0D3438] text-white">
                            sourceId: {c.sourceId}
                          </span>
                          <span className="text-[10px] font-mono-tech text-[#68878B]">{c.timestamp}</span>
                        </div>
                        <p className="font-semibold text-[#0D2B2F]">{c.claimText}</p>
                        <p className="text-[11px] text-[#4A6B70] italic bg-white p-2 rounded-lg border border-[#E2ECEB]">
                          Verbatim Evidence: "{c.evidenceQuote}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COMPLETE APRIROSE KNOWLEDGE BASE EXPLORER */}
          {activeRightTab === 'kb' && (
            <div className="bg-white rounded-2xl border border-[#D5E0DF] p-5 shadow-2xs space-y-4">
              {/* Sub-navigation */}
              <div className="flex flex-wrap gap-1.5 pb-3 border-b border-[#E6EEEE]">
                {(
                  [
                    ['products', 'Products & Brands'],
                    ['mfi', 'MFI & Grade Tables'],
                    ['offices', '6 Offices & 25 Markets'],
                    ['history', 'Timeline & Testimonials'],
                    ['compliance', '4 Compliance Policies'],
                  ] as [typeof kbSubTab, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setKbSubTab(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      kbSubTab === id
                        ? 'bg-[#B08448] text-white'
                        : 'bg-[#F2F6F5] text-[#35565B] hover:bg-[#E3ECEB]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Sub-tab: Products & Brands */}
              {kbSubTab === 'products' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.polymers.map((poly) => (
                      <div key={poly.group} className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                        <h4 className="font-serif-editorial font-semibold text-sm text-[#0D3438]">
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
                        <p className="mt-1 text-[11px] font-mono-tech text-[#0D3438]">
                          {poly.publicRangeSummary}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                      <h4 className="font-semibold text-[#0D3438] mb-1.5">Industrial Chemicals & PU</h4>
                      <ul className="space-y-1 text-[#35565B]">
                        {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.chemicals.map((c) => (
                          <li key={c}>• {c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                      <h4 className="font-semibold text-[#0D3438] mb-1.5">Additives & Bulk Commodities</h4>
                      <ul className="space-y-1 text-[#35565B]">
                        {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.additivesAndMasterbatches.map((a) => (
                          <li key={a}>• {a}</li>
                        ))}
                      </ul>
                      <h5 className="font-semibold text-[#0D3438] mt-3 mb-1">Bulk Commodities</h5>
                      <p className="text-[#35565B]">
                        {APRIROSE_KNOWLEDGE_BASE.productsAndPortfolio.bulkCommodities.join(' · ')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                      <h4 className="font-semibold text-[#0D3438] mb-1.5">Published Brands (Reference)</h4>
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

              {/* Sub-tab: MFI & Grade Tables */}
              {kbSubTab === 'mfi' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <strong>Technical Reference Boundary:</strong> MFI test temperature/load conditions are not specified in these reference lines. Exact grade selection, food-contact status, pressure suitability, and COA require manufacturer TDS and commercial review.
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#0D3438] text-white text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3 rounded-tl-lg">Family</th>
                          <th className="py-2.5 px-3">Grade / Process</th>
                          <th className="py-2.5 px-3">MFI / Reference Range</th>
                          <th className="py-2.5 px-3 rounded-tr-lg">Typical Applications</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5ECEB]">
                        {APRIROSE_KNOWLEDGE_BASE.historicalMfiGrades.map((g, i) => (
                          <tr key={i} className="hover:bg-[#F4F8F7]">
                            <td className="py-2 px-3 font-mono-tech font-semibold text-[#0D3438]">
                              {g.family}
                            </td>
                            <td className="py-2 px-3 font-semibold">{g.gradeType}</td>
                            <td className="py-2 px-3 font-mono-tech text-[#B08448] font-medium">
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

              {/* Sub-tab: Offices & Markets */}
              {kbSubTab === 'offices' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {APRIROSE_KNOWLEDGE_BASE.offices.map((off) => (
                      <div key={off.id} className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-serif-editorial font-semibold text-sm text-[#0D3438]">
                            {off.city}, {off.country}
                          </span>
                          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-[#0D3438] text-white">
                            {off.role}
                          </span>
                        </div>
                        <p className="text-[#35565B]">{off.address}</p>
                        <div className="flex flex-wrap gap-3 pt-1 font-mono-tech text-[11px] text-[#0D3438]">
                          <span>Tel: {off.phone}</span>
                          <span>Email: {off.email}</span>
                        </div>
                        {off.notes && <p className="text-[11px] text-[#68878B] italic pt-0.5">{off.notes}</p>}
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                    <h4 className="font-semibold text-[#0D3438] mb-2">
                      Selected Markets Retained in Knowledge Base (25 Countries)
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

              {/* Sub-tab: Timeline & Customer Testimonials */}
              {kbSubTab === 'history' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <h4 className="font-serif-editorial font-semibold text-sm text-[#0D3438] mb-2">
                      Published Timeline & Profile Milestones (1996 – 2023)
                    </h4>
                    <div className="space-y-2">
                      {APRIROSE_KNOWLEDGE_BASE.companyOverview.historicalTimeline.map((item) => (
                        <div
                          key={item.year}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F6F9F8] border border-[#E2ECEB]"
                        >
                          <span className="font-mono-tech font-bold text-[#B08448] px-2 py-0.5 bg-white rounded border border-[#DEC9A8]">
                            {item.year}
                          </span>
                          <span className="text-[#2D4D52]">{item.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-serif-editorial font-semibold text-sm text-[#0D3438] mb-2 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#B08448]" />
                      Published Customer Evidence (Historical Context)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {APRIROSE_KNOWLEDGE_BASE.customerTestimonials.map((t) => (
                        <div key={t.person} className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF]">
                          <div className="font-semibold text-[#0D3438]">
                            {t.person} — <span className="text-[#B08448]">{t.role}, {t.company}</span>
                          </div>
                          <p className="text-[#35565B] mt-1 leading-relaxed">{t.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab: Compliance & Sustainability Policies */}
              {kbSubTab === 'compliance' && (
                <div className="space-y-3 text-xs">
                  {APRIROSE_KNOWLEDGE_BASE.compliancePolicies.map((pol) => (
                    <div key={pol.id} className="p-4 rounded-xl bg-[#F6F9F8] border border-[#D5E0DF] space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-serif-editorial font-semibold text-sm text-[#0D3438]">
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

      {/* GEMINI LIVE API SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#D5E0DF] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6EEEE] pb-3">
              <div>
                <h3 className="text-base font-serif-editorial font-semibold text-[#0D3438]">
                  Gemini Multimodal Live API Configuration
                </h3>
                <p className="text-xs text-[#527378]">
                  Connect directly via WebSockets (`@google/genai` `ai.live.connect`)
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-xs text-[#527378] hover:text-[#0D3438] cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#0D3438] mb-1">
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
                  className="w-full px-3 py-2 rounded-lg border border-[#C6D6D5] font-mono-tech focus:outline-none focus:border-[#0D3438]"
                />
                <p className="text-[11px] text-[#68878B] mt-1">
                  Stored locally in your browser. If you don't have a key handy, use <strong>Instant Grounded Voice</strong> mode which works with zero configuration.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#0D3438] mb-1">
                  Live API Model
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#C6D6D5] bg-white"
                >
                  <option value="gemini-3.8-live">gemini-3.8-live (Current Default Live Model)</option>
                  <option value="gemini-3.1-flash-live-preview">gemini-3.1-flash-live-preview</option>
                  <option value="gemini-2.5-flash-native-audio-preview-12-2025">
                    gemini-2.5-flash-native-audio-preview-12-2025
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0D3438] mb-1">
                  Receptionist Prebuilt Voice
                </label>
                <select
                  value={geminiVoice}
                  onChange={(e) => setGeminiVoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#C6D6D5] bg-white"
                >
                  <option value="Aoede">Aoede (Warm, Professional British/International)</option>
                  <option value="Kore">Kore (Clear, Composed)</option>
                  <option value="Puck">Puck (Energetic, Conversational)</option>
                  <option value="Charon">Charon (Deep, Authoritative)</option>
                  <option value="Fenrir">Fenrir (Direct, Crisp)</option>
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
                className="px-4 py-2 rounded-xl bg-[#0D3438] hover:bg-[#164A50] text-white text-xs font-semibold cursor-pointer"
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
