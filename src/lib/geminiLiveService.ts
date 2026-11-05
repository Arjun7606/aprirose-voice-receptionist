import { GoogleGenAI, Modality } from "@google/genai";
import type {
  BuyerFacts,
  SimulatedMeetingState,
} from "../data/apriroseKnowledge";
export interface LiveSessionCallbacks {
  onStatusChange: (
    status: "disconnected" | "connecting" | "connected" | "error",
    detail?: string,
  ) => void;
  onUserTranscript: (text: string, final: boolean) => void;
  onAssistantTranscript: (text: string, final: boolean) => void;
  onFactsUpdated: (
    facts: Partial<BuyerFacts>,
    evidence?: Record<string, string>,
  ) => void;
  onMeetingUpdated: (meeting: Partial<SimulatedMeetingState>) => void;
  onHumanHandoff: (paused: boolean) => void;
  onAudioLevel: (input: number, output: number) => void;
}
export class GeminiLiveReceptionistClient {
  private session: any;
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: AudioWorkletNode | ScriptProcessorNode | null = null;
  private sink: GainNode | null = null;
  private gain: GainNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextPlay = 0;
  private closed = false;
  private ready = false;
  private muted = false;
  private speaker = true;
  private abort = new AbortController();
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private rejectSetup: ((reason: Error) => void) | undefined;
  private userText = "";
  private assistantText = "";
  private assistantHasSpoken = false;
  private levelAt = 0;
  constructor(private callbacks: LiveSessionCallbacks) {}
  async connect() {
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error("Microphone access needs HTTPS and a supported browser.");
      // Unlock on the original tap. Share the hardware-rate context for iPhone.
      const Audio = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new Audio({ latencyHint: "interactive" });
      const resumed = this.context!.resume();
      this.callbacks.onStatusChange(
        "connecting",
        "Allow microphone access to begin.",
      );
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      await resumed;
      if (this.closed) {
        this.cleanup();
        return;
      }
      this.gain = this.context!.createGain();
      this.gain.gain.value = this.speaker ? 1 : 0;
      this.gain.connect(this.context!.destination);
      this.callbacks.onStatusChange("connecting", "Connecting to Aprirose…");
      const response = await fetch("/api/voice/session", {
        method: "POST",
        signal: this.abort.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.token)
        throw Error(data.error || "Voice is unavailable. Please try again.");
      if (this.closed) return;
      const ai = new GoogleGenAI({
        apiKey: data.token,
        httpOptions: { apiVersion: "v1alpha" },
      });
      let resolveSetup!: () => void;
      const setup = new Promise<void>((resolve, reject) => {
        resolveSetup = resolve;
        this.rejectSetup = reject;
      });
      setup.catch(() => {});
      const timer = setTimeout(
        () =>
          this.rejectSetup?.(Error("Connection timed out. Please try again.")),
        15000,
      );
      try {
        const connecting = ai.live.connect({
          model: data.model,
          config: { responseModalities: [Modality.AUDIO] },
          callbacks: {
            onopen: () => {},
            onmessage: (message: any) => {
              if (!this.closed) {
                if (message.setupComplete) resolveSetup();
                this.handleMessage(message);
              }
            },
            onerror: () =>
              this.fail(
                "The connection was interrupted. Please start a new call.",
              ),
            onclose: () => {
              if (!this.closed)
                this.fail("The call disconnected. Please start a new call.");
            },
          },
        });
        connecting
          .then((s) => {
            if (this.closed) s.close();
          })
          .catch(() => {});
        this.session = await Promise.race([
          connecting,
          setup.then(() => connecting),
        ]);
        await setup;
      } finally {
        clearTimeout(timer);
      }
      if (this.closed) {
        this.session?.close();
        return;
      }
      await this.startCapture();
      if (this.closed) return;
      this.ready = true;
      this.callbacks.onStatusChange("connected", "Listening. How can we help?");
      this.sendTextMessage(
        "A new caller connected. Greet once: Welcome to Ap-ree-rose Trading Limited. How can I help you today?",
      );
      this.timeout = setTimeout(
        () =>
          this.disconnect("Demo call complete. You can start another call."),
        5 * 60000,
      );
    } catch (error: any) {
      if (!this.closed)
        this.fail(
          error?.name === "NotAllowedError"
            ? "Please allow microphone access in your browser, then try again."
            : error?.message || "Could not connect. Please try again.",
        );
    }
  }
  private async startCapture() {
    const context = this.context!;
    this.source = context.createMediaStreamSource(this.stream!);
    this.sink = context.createGain();
    this.sink.gain.value = 0;
    this.sink.connect(context.destination);
    if (context.audioWorklet)
      try {
        await context.audioWorklet.addModule("/audio/pcm-capture.js");
        if (this.closed) return;
        const node = new AudioWorkletNode(context, "pcm-capture");
        node.port.onmessage = ({ data }) => this.sendAudio(data.samples);
        node.onprocessorerror = () =>
          this.fail("Microphone audio stopped. Please reconnect.");
        this.processor = node;
      } catch {
        /* Older browsers use hardware-rate ScriptProcessor capture. */
      }
    if (this.closed) return;
    if (!this.processor) {
      const node = context.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = (event) =>
        this.sendAudio(event.inputBuffer.getChannelData(0));
      this.processor = node;
    }
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
  }
  private sendAudio(samples: Float32Array) {
    if (!this.ready || this.closed || this.muted || !this.session) return;
    const pcm = new Int16Array(samples.length);
    let energy = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = v < 0 ? v * 32768 : v * 32767;
      energy += v * v;
    }
    const now = performance.now();
    if (now - this.levelAt > 100) {
      this.levelAt = now;
      this.callbacks.onAudioLevel(
        Math.min(1, Math.sqrt(energy / samples.length) * 4),
        this.sources.size ? 0.55 : 0,
      );
    }
    const bytes = new Uint8Array(pcm.buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    try {
      this.session.sendRealtimeInput({
        audio: {
          data: btoa(binary),
          mimeType: `audio/pcm;rate=${this.context!.sampleRate}`,
        },
      });
    } catch {
      this.fail("Microphone connection lost. Please reconnect.");
    }
  }
  sendTextMessage(text: string) {
    if (!this.ready || this.closed || !text.trim()) return;
    this.assistantHasSpoken = false;
    this.stopPlayback();
    try {
      this.session.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });
    } catch {
      this.fail("Message could not be sent. Please reconnect.");
    }
  }
  private handleMessage(message: any) {
    const c = message.serverContent;
    if (c?.interrupted) {
      this.stopPlayback();
      this.finishAssistant();
    }
    if (c?.inputTranscription?.text) {
      if (!this.userText) this.assistantHasSpoken = false;
      this.userText += c.inputTranscription.text;
      this.callbacks.onUserTranscript(this.userText, false);
    }
    if (c?.inputTranscription?.finished) this.finishUser();
    // Some native-audio models omit transcription.finished. The model beginning
    // its reply also closes the caller turn, so qualification need not wait for
    // the entire spoken answer to finish.
    if (
      (c?.outputTranscription?.text || c?.modelTurn?.parts?.length) &&
      this.userText
    )
      this.finishUser();
    if (c?.outputTranscription?.text && !c.interrupted) {
      this.assistantHasSpoken = true;
      this.assistantText += c.outputTranscription.text.replace(
        /\bAp-?ree-?rose\b/gi,
        "Aprirose",
      );
      this.callbacks.onAssistantTranscript(this.assistantText, false);
    }
    if (c?.outputTranscription?.finished) this.finishAssistant();
    for (const part of c?.modelTurn?.parts || [])
      if (!c.interrupted && part.inlineData?.data)
        this.play(
          part.inlineData.data,
          Number(/rate=(\d+)/.exec(part.inlineData.mimeType || "")?.[1]) ||
            24000,
        );
    const responses = [];
    for (const call of message.toolCall?.functionCalls || []) {
      const args = call.args || {};
      if (call.name === "update_buyer_qualification") {
        const { evidenceQuote, ...fields } = args;
        const facts = Object.fromEntries(
          Object.entries(fields).filter(
            ([, v]) => typeof v === "string" && v.trim(),
          ),
        );
        this.callbacks.onFactsUpdated(
          facts,
          Object.fromEntries(
            Object.keys(facts).map((k) => [k, evidenceQuote || ""]),
          ),
        );
      } else if (call.name === "update_simulated_meeting")
        this.callbacks.onMeetingUpdated(args);
      else if (call.name === "request_human_handoff")
        this.callbacks.onHumanHandoff(Boolean(args.paused));
      responses.push({
        id: call.id,
        name: call.name,
        ...(call.name === "update_buyer_qualification"
          ? { scheduling: this.assistantHasSpoken ? "SILENT" : "WHEN_IDLE" }
          : {}),
        response: {
          result:
            "Details recorded. Do not repeat your answer or re-ask for fields already supplied. MT means metric tonnes. If you have not yet answered, answer the caller now.",
        },
      });
    }
    if (responses.length && this.session)
      this.session.sendToolResponse({ functionResponses: responses });
    if (c?.turnComplete) {
      this.finishUser();
      this.finishAssistant();
    }
  }
  private finishUser() {
    if (this.userText) this.callbacks.onUserTranscript(this.userText, true);
    this.userText = "";
  }
  private finishAssistant() {
    if (this.assistantText)
      this.callbacks.onAssistantTranscript(this.assistantText, true);
    this.assistantText = "";
  }
  private play(data: string, rate: number) {
    this.assistantHasSpoken = true;
    if (!this.context || this.closed) return;
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const pcm = new Int16Array(bytes.buffer);
    const buffer = this.context.createBuffer(1, pcm.length, rate);
    buffer.copyToChannel(
      Float32Array.from(pcm, (v) => v / 32768),
      0,
    );
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain!);
    const start = Math.max(this.context.currentTime + 0.015, this.nextPlay);
    source.start(start);
    this.nextPlay = start + buffer.duration;
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      if (!this.sources.size) this.callbacks.onAudioLevel(0, 0);
    };
    this.callbacks.onAudioLevel(0, this.speaker ? 0.55 : 0);
  }
  setMuted(value: boolean) {
    this.muted = value;
    this.stream?.getAudioTracks().forEach((t) => (t.enabled = !value));
    if (!value) this.context?.resume().catch(() => {});
    if (value && this.ready)
      this.session?.sendRealtimeInput({ audioStreamEnd: true });
  }
  setSpeakerEnabled(value: boolean) {
    this.speaker = value;
    if (this.gain) this.gain.gain.value = value ? 1 : 0;
    if (value) this.context?.resume().catch(() => {});
  }
  private stopPlayback() {
    for (const s of this.sources)
      try {
        s.stop();
      } catch {}
    this.sources.clear();
    this.nextPlay = this.context?.currentTime || 0;
  }
  private fail(detail: string) {
    if (this.closed) return;
    this.closed = true;
    this.cleanup();
    this.callbacks.onStatusChange("error", detail);
  }
  private cleanup() {
    this.ready = false;
    this.abort.abort();
    clearTimeout(this.timeout);
    this.rejectSetup?.(Error("Call closed"));
    this.rejectSetup = undefined;
    try {
      this.session?.close();
    } catch {}
    this.session = null;
    this.stopPlayback();
    if (this.processor && "port" in this.processor) {
      this.processor.port.onmessage = null;
      this.processor.port.close();
    } else if (this.processor) this.processor.onaudioprocess = null;
    this.processor?.disconnect();
    this.source?.disconnect();
    this.sink?.disconnect();
    this.gain?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.context?.close().catch(() => {});
    this.context = null;
    this.callbacks.onAudioLevel(0, 0);
  }
  disconnect(detail = "Call ended. Start again whenever you like.") {
    this.closed = true;
    this.cleanup();
    this.callbacks.onStatusChange("disconnected", detail);
  }
}
