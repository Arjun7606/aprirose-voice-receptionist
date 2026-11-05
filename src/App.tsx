import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Headphones,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import type {
  BuyerFacts,
  SimulatedMeetingState,
} from "./data/apriroseKnowledge";
import {
  checkCommercialReadiness,
  checkSimulatedMeetingReadiness,
  extractFactsAndProcessTurn,
} from "./lib/apriroseGroundedEngine";
import { GeminiLiveReceptionistClient } from "./lib/geminiLiveService";

type Turn = {
  id: string;
  role: "caller" | "receptionist";
  text: string;
  time: string;
};
const time = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const welcome = (): Turn => ({
  id: crypto.randomUUID(),
  role: "receptionist",
  text: "Welcome to Aprirose. Start a call to tell us what you’re looking for, or type your enquiry below.",
  time: time(),
});
const fields: [keyof BuyerFacts, string][] = [
  ["company", "Company"],
  ["companyCountry", "Company country"],
  ["buyerType", "Business type"],
  ["contactName", "Contact name"],
  ["email", "Email"],
  ["phone", "Phone / WhatsApp"],
  ["material", "Product"],
  ["application", "Application"],
  ["requestedGrade", "Grade"],
  ["mfi", "MFI / specification"],
  ["quantity", "Order quantity"],
  ["monthlyVolume", "Monthly requirement"],
  ["dischargePort", "Discharge port"],
  ["destinationCountry", "Destination country"],
  ["shippingTermRequested", "Shipping terms"],
  ["paymentTermsRequested", "Payment terms"],
  ["shipmentTiming", "Shipment timing"],
  ["preferredProducer", "Preferred producer"],
  ["preferredOrigin", "Origin"],
  ["technicalDocumentRequested", "Documents requested"],
  ["preferredContactMethod", "Contact preference"],
  ["equivalentGradeAcceptable", "Equivalent grades"],
];
const examples = [
  {
    label: "Request a quotation",
    text: "We need 100 MT of PP raffia for woven bags, delivered CIF to Mombasa, Kenya. Our company is East Africa Packaging, a manufacturer in Kenya.",
  },
  {
    label: "Explore products",
    text: "Which polymers and industrial chemicals can Aprirose help us source?",
  },
  {
    label: "Arrange a meeting",
    text: "I would like to arrange a simulated sales meeting to discuss my requirements.",
  },
];

export default function App() {
  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [detail, setDetail] = useState("Ready when you are");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [level, setLevel] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([welcome()]);
  const [input, setInput] = useState("");
  const [facts, setFacts] = useState<BuyerFacts>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [meeting, setMeeting] = useState<SimulatedMeetingState>({
    status: "none",
    validationNotes: [],
  });
  const [copied, setCopied] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const client = useRef<GeminiLiveReceptionistClient | null>(null);
  const callId = useRef(0);
  const active = useRef(false);
  const factsRef = useRef<BuyerFacts>({});
  const meetingRef = useRef<SimulatedMeetingState>({
    status: "none",
    validationNotes: [],
  });
  const pausedRef = useRef(false);
  const conversation = useRef<HTMLDivElement>(null);
  const userTurnId = useRef("");
  const assistantTurnId = useRef("");
  useEffect(() => {
    const el = conversation.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);
  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(
    () => () => {
      callId.current++;
      client.current?.disconnect();
    },
    [],
  );

  function mergeFacts(
    next: Partial<BuyerFacts>,
    quotes?: Record<string, string>,
  ) {
    factsRef.current = { ...factsRef.current, ...next };
    setFacts(factsRef.current);
    if (quotes) setEvidence((prev) => ({ ...prev, ...quotes }));
  }
  function mergeMeeting(next: Partial<SimulatedMeetingState>) {
    const clean = Object.fromEntries(
      Object.entries(next).filter(([, v]) => v !== undefined),
    );
    const candidate = { ...meetingRef.current, ...clean };
    if (
      candidate.status === "demo_booked" &&
      !checkSimulatedMeetingReadiness(factsRef.current, candidate).canBookDemo
    )
      candidate.status = "collecting";
    meetingRef.current = candidate;
    setMeeting(candidate);
  }
  function processInput(text: string, fromLive = false) {
    if (!text.trim()) return;
    const result = extractFactsAndProcessTurn(
      text.trim(),
      factsRef.current,
      meetingRef.current,
      pausedRef.current,
    );
    mergeFacts(result.updatedFacts, result.factEvidence);
    if (result.updatedMeeting) mergeMeeting(result.updatedMeeting);
    if (result.humanHandoffTriggered || result.humanHandoffResumed) {
      pausedRef.current = Boolean(result.humanHandoffTriggered);
      setPaused(pausedRef.current);
    }
    if (fromLive) return;
    const turn: Turn = {
      id: crypto.randomUUID(),
      role: "caller",
      text: text.trim(),
      time: time(),
    };
    if (active.current && client.current) {
      setTurns((prev) => [...prev, turn]);
      client.current.sendTextMessage(text.trim());
    } else
      setTurns((prev) => [
        ...prev,
        turn,
        {
          id: crypto.randomUUID(),
          role: "receptionist",
          text: result.replyText,
          time: time(),
        },
      ]);
    setInput("");
  }
  function streamTurn(role: Turn["role"], text: string, final: boolean) {
    if (!text) return;
    const ref = role === "caller" ? userTurnId : assistantTurnId;
    if (!ref.current) ref.current = crypto.randomUUID();
    const id = ref.current;
    setTurns((prev) =>
      prev.some((t) => t.id === id)
        ? prev.map((t) => (t.id === id ? { ...t, text } : t))
        : [...prev, { id, role, text, time: time() }],
    );
    if (final) ref.current = "";
  }
  function endCall() {
    callId.current++;
    active.current = false;
    client.current?.disconnect();
    client.current = null;
    setStatus("disconnected");
    setDetail("Call ended. Start again whenever you like.");
    setLevel(0);
  }
  async function toggleCall() {
    if (status === "connected" || status === "connecting") {
      endCall();
      return;
    }
    const id = ++callId.current;
    setStatus("connecting");
    setDetail("Preparing your call…");
    setMuted(false);
    setSeconds(0);
    userTurnId.current = "";
    assistantTurnId.current = "";
    if (id !== callId.current) return;
    const live = new GeminiLiveReceptionistClient({
      onStatusChange: (next, message) => {
        if (id !== callId.current) return;
        active.current = next === "connected";
        setStatus(next);
        if (message) setDetail(message);
      },
      onUserTranscript: (text, final) => {
        if (id !== callId.current) return;
        streamTurn("caller", text, final);
        if (final) processInput(text, true);
      },
      onAssistantTranscript: (text, final) => {
        if (id === callId.current) streamTurn("receptionist", text, final);
      },
      onFactsUpdated: (next, quotes) => {
        if (id === callId.current) mergeFacts(next, quotes);
      },
      onMeetingUpdated: (next) => {
        if (id === callId.current) mergeMeeting(next);
      },
      onHumanHandoff: (value) => {
        if (id === callId.current) {
          pausedRef.current = value;
          setPaused(value);
        }
      },
      onAudioLevel: (i, o) => {
        if (id === callId.current) setLevel(Math.max(i, o));
      },
    });
    client.current = live;
    live.setSpeakerEnabled(speaker);
    await live.connect();
  }
  function reset() {
    endCall();
    factsRef.current = {};
    meetingRef.current = { status: "none", validationNotes: [] };
    pausedRef.current = false;
    setFacts({});
    setEvidence({});
    setMeeting(meetingRef.current);
    setPaused(false);
    setTurns([welcome()]);
    setInput("");
    setDetail("Ready when you are");
    setCopied(false);
  }
  async function copySummary() {
    const summary = [
      "Aprirose Trading Limited — Demo enquiry",
      ...fields
        .filter(([key]) => facts[key])
        .map(([key, label]) => `${label}: ${facts[key]}`),
      meeting.status !== "none"
        ? `Simulated meeting: ${meeting.status} — ${[meeting.date, meeting.clockTime, meeting.amPm, meeting.timezone].filter(Boolean).join(" ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setDetail(
        "Copy unavailable in this browser. Select the enquiry details to copy them.",
      );
    }
  }
  const readiness = checkCommercialReadiness(facts);
  const connected = status === "connected";
  const busy = connected || status === "connecting";
  const captured = fields.filter(([key]) => Boolean(facts[key]));

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href="/"
          aria-label="Aprirose Trading Limited home"
        >
          <img src="/brand/aprirose-logo.png" alt="Aprirose Trading Limited" />
        </a>
        <div className="header-actions">
          <span className="demo-label">Client preview</span>
          <button className="quiet-button" onClick={reset}>
            <RotateCcw size={15} />
            <span>New conversation</span>
          </button>
        </div>
      </header>
      <main>
        <div className="page-intro">
          <div>
            <p className="section-label">
              Your commercial desk, in conversation
            </p>
            <h1>Let’s talk requirements.</h1>
            <p>Speak with Aprirose. Watch your enquiry come together.</p>
          </div>
          <span className="preview-note">
            <span /> Interactive voice demo
          </span>
        </div>
        <div className="workspace">
          <section
            className="conversation-side"
            aria-label="Voice receptionist"
          >
            <div className="call-panel">
              <div className="call-topline">
                <span>
                  <span className={`status-dot ${connected ? "live" : ""}`} />
                  {connected
                    ? "Call in progress"
                    : "Aprirose voice receptionist"}
                </span>
                <span>
                  {connected
                    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
                    : "Polymers & chemicals"}
                </span>
              </div>
              <div className="call-body">
                <div
                  className={`voice-mark ${connected ? "active" : ""}`}
                  style={{ transform: `scale(${1 + level * 0.09})` }}
                >
                  <Headphones size={32} strokeWidth={1.35} />
                </div>
                <div className="call-copy">
                  <h2>
                    {connected
                      ? "We’re listening."
                      : "A good conversation starts here."}
                  </h2>
                  <p>
                    Products, quotations or a meeting with our team.
                    <br />
                    Tell us what you have in mind.
                  </p>
                </div>
                <button
                  className={`call-button ${busy ? "end-call" : ""}`}
                  onClick={toggleCall}
                >
                  {busy ? <PhoneOff size={17} /> : <Phone size={17} />}
                  <span>
                    {status === "connecting"
                      ? "Cancel call"
                      : connected
                        ? "End call"
                        : "Start a call"}
                  </span>
                </button>
              </div>
              <div className="call-bottom">
                <p
                  className={status === "error" ? "error-text" : ""}
                  role="status"
                >
                  {connected && muted ? "Microphone muted" : detail}
                </p>
                <div className="audio-controls">
                  <button
                    disabled={!connected}
                    aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                    aria-pressed={muted}
                    onClick={() => {
                      const next = !muted;
                      setMuted(next);
                      client.current?.setMuted(next);
                    }}
                  >
                    {muted ? <MicOff size={15} /> : <Mic size={15} />}
                    <span>{muted ? "Mic off" : "Microphone"}</span>
                  </button>
                  <button
                    aria-label={speaker ? "Mute speaker" : "Unmute speaker"}
                    aria-pressed={!speaker}
                    onClick={() => {
                      setSpeaker(!speaker);
                      client.current?.setSpeakerEnabled(!speaker);
                    }}
                  >
                    {speaker ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    <span>{speaker ? "Speaker on" : "Speaker off"}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="conversation-panel">
              <div className="panel-heading">
                <h2>Conversation</h2>
                <span>
                  {connected ? "Live transcript" : "Speak or type below"}
                </span>
              </div>
              <div
                className="transcript"
                ref={conversation}
                role="log"
                aria-label="Conversation transcript"
                aria-live="polite"
              >
                {turns.map((turn) => (
                  <article key={turn.id} className={`turn ${turn.role}`}>
                    <div className="turn-meta">
                      <strong>
                        {turn.role === "caller" ? "You" : "Aprirose"}
                      </strong>
                      <time>{turn.time}</time>
                    </div>
                    <p>{turn.text}</p>
                  </article>
                ))}
              </div>
              <form
                className="message-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  processInput(input);
                }}
              >
                <label className="sr-only" htmlFor="message">
                  Your message
                </label>
                <input
                  id="message"
                  placeholder="Or type your message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!input.trim() || status === "connecting"}
                >
                  <ArrowUp size={20} />
                </button>
              </form>
            </div>
            <div className="examples">
              <span>Try an enquiry</span>
              {examples.map((example) => (
                <button
                  key={example.label}
                  disabled={status === "connecting"}
                  onClick={() => processInput(example.text)}
                >
                  {example.label}
                  <span>↗</span>
                </button>
              ))}
            </div>
          </section>
          <aside className="enquiry-panel" aria-label="Live enquiry summary">
            <div className="panel-heading">
              <div>
                <p className="section-label">Captured as you speak</p>
                <h2>Your enquiry</h2>
              </div>
              <span className="live-tag">
                <span /> Live
              </span>
            </div>
            <div className="readiness">
              <div>
                <span>Enquiry completeness</span>
                <strong>{readiness.score}%</strong>
              </div>
              <div className="progress-track">
                <div style={{ width: `${readiness.score}%` }} />
              </div>
              <p>
                {readiness.isReady
                  ? "Ready for commercial review."
                  : captured.length
                    ? `${captured.length} details captured. Keep the conversation going.`
                    : "Details appear here as you share them."}
              </p>
            </div>
            <div className="enquiry-fields">
              {fields.slice(0, 16).map(([key, label]) => (
                <div
                  className={`fact ${facts[key] ? "filled" : ""}`}
                  key={key}
                  title={evidence[key] || undefined}
                >
                  <span>{label}</span>
                  <strong>{facts[key] || "—"}</strong>
                  {facts[key] ? <Check size={13} /> : null}
                </div>
              ))}
            </div>
            {fields.slice(16).some(([key]) => facts[key]) ? (
              <details className="extra-details" open>
                <summary>
                  Additional details
                  <ChevronDown size={14} />
                </summary>
                {fields
                  .slice(16)
                  .filter(([key]) => facts[key])
                  .map(([key, label]) => (
                    <div className="fact filled" key={key}>
                      <span>{label}</span>
                      <strong>{facts[key]}</strong>
                    </div>
                  ))}
              </details>
            ) : null}
            <div className="meeting-note">
              <CheckCheck size={18} />
              <div>
                <strong>
                  {meeting.status === "demo_booked"
                    ? "Simulated meeting recorded"
                    : meeting.status === "collecting"
                      ? "Meeting details in progress"
                      : "Planning a conversation with sales?"}
                </strong>
                <p>
                  {meeting.status === "none"
                    ? "Ask the receptionist to arrange a demo meeting."
                    : [
                        meeting.date,
                        meeting.clockTime,
                        meeting.amPm,
                        meeting.timezone,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                      "Share your preferred date, time and joining timezone."}
                </p>
              </div>
            </div>
            {paused ? (
              <p className="handoff-note">
                Human follow-up requested. Your enquiry is captured here; this
                demo does not transfer calls.
              </p>
            ) : null}
            <button
              className="copy-button"
              disabled={!captured.length}
              onClick={copySummary}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "Enquiry copied" : "Copy enquiry summary"}</span>
            </button>
            <p className="privacy-note">
              Demo only. No orders, calendar invitations or staff notifications
              are sent. Details stay in this page until you reset or close it.
              Voice is processed by Google.
            </p>
          </aside>
        </div>
        <footer>
          <span>Aprirose Trading Limited</span>
          <span>Client testing preview · Calls up to 5 minutes</span>
        </footer>
      </main>
    </div>
  );
}
