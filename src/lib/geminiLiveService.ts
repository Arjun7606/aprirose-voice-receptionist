import { GoogleGenAI, Modality, Type, FunctionDeclaration } from '@google/genai';
import {
  buildVoiceReceptionistSystemPrompt,
  BuyerFacts,
  SimulatedMeetingState,
} from '../data/apriroseKnowledge';

export interface LiveSessionCallbacks {
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'error', detail?: string) => void;
  onUserTranscript: (text: string, isFinal: boolean) => void;
  onAssistantTranscript: (text: string, isFinal: boolean) => void;
  onFactsUpdated: (facts: Partial<BuyerFacts>, evidence?: Record<string, string>) => void;
  onMeetingUpdated: (meeting: Partial<SimulatedMeetingState>) => void;
  onHumanHandoff: (paused: boolean) => void;
  onAudioLevel: (inputLevel: number, outputLevel: number) => void;
}

const updateBuyerQualificationTool: FunctionDeclaration = {
  name: 'update_buyer_qualification',
  description:
    'Record or update buyer qualification fields extracted from what the caller stated during the conversation. Keep order quantity and monthlyVolume separate. Never convert FCL containers into invented tonnage.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      company: { type: Type.STRING, description: 'Buyer company name' },
      companyCountry: { type: Type.STRING, description: 'Country where the buyer company is based' },
      buyerType: {
        type: Type.STRING,
        description: 'Buyer business activity/type (e.g., Manufacturer, Converter, Distributor / Trader, End User)',
      },
      contactName: { type: Type.STRING, description: 'Caller full name or first name' },
      email: { type: Type.STRING, description: 'Caller email address' },
      phone: { type: Type.STRING, description: 'Caller phone or WhatsApp number' },
      material: {
        type: Type.STRING,
        description: 'Product or material family (e.g., PP Raffia, HDPE, LLDPE, LDPE, PVC, PET, Caustic Soda, Sodium Sulfate Anhydrous, TDI, Polyol)',
      },
      application: {
        type: Type.STRING,
        description: 'Intended application (e.g., Raffia, Injection, Film, Blow Moulding, Pipe, Rotomoulding, Bottle, Profiles)',
      },
      requestedGrade: { type: Type.STRING, description: 'Specific grade requested or discussed' },
      mfi: { type: Type.STRING, description: 'Melt Flow Index (MFI) or IV/K-value specification' },
      quantity: {
        type: Type.STRING,
        description: 'Order quantity with unit (e.g., 100 MT, 2 FCL, 500 KG). Independent from monthlyVolume.',
      },
      monthlyVolume: {
        type: Type.STRING,
        description: 'Regular monthly demand or consumption volume with unit',
      },
      dischargePort: {
        type: Type.STRING,
        description: 'Named destination discharge port (e.g., Mombasa, Tamatave, Lagos, Chittagong, Nhava Sheva)',
      },
      destinationCountry: { type: Type.STRING, description: 'Destination country for shipment' },
      destinationCity: { type: Type.STRING, description: 'Destination city for shipment' },
      shippingTermRequested: {
        type: Type.STRING,
        description: 'Incoterm / shipping term requested (e.g., CIF, CFR, FOB)',
      },
      paymentTermsRequested: {
        type: Type.STRING,
        description: 'Payment terms preference (e.g., T/T, LC, DA, OA)',
      },
      shipmentTiming: { type: Type.STRING, description: 'Requested shipment or delivery timing (never copy meeting time here)' },
      preferredProducer: { type: Type.STRING, description: 'Preferred producer or brand (e.g., Sinopec, Borouge, Jinneng, SABIC)' },
      preferredOrigin: { type: Type.STRING, description: 'Preferred country/region of origin' },
      preferredContactMethod: { type: Type.STRING, description: 'Preferred contact channel (Email, WhatsApp, Phone)' },
      technicalDocumentRequested: { type: Type.STRING, description: 'Requested technical documents (e.g., TDS, COA, MSDS)' },
      equivalentGradeAcceptable: { type: Type.STRING, description: 'Whether equivalent grades are acceptable' },
      evidenceQuote: { type: Type.STRING, description: 'Short verbatim quote from the caller supporting these facts' },
    },
  },
};

const updateSimulatedMeetingTool: FunctionDeclaration = {
  name: 'update_simulated_meeting',
  description:
    'Update or confirm a simulated demo sales meeting. Only set status="demo_booked" when customer name, company name, email, phone, product requirement, future date, unambiguous clock time (with AM/PM), and valid timezone are all known.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description: '"collecting", "demo_booked", or "cancelled"',
      },
      date: { type: Type.STRING, description: 'Meeting date' },
      clockTime: { type: Type.STRING, description: 'Meeting clock time (e.g., 10:30)' },
      amPm: { type: Type.STRING, description: '"AM", "PM", "resolved_24h", or "ambiguous"' },
      timezone: {
        type: Type.STRING,
        description: 'IANA timezone (e.g., Asia/Kolkata, Europe/London, Asia/Dubai, Africa/Nairobi) or Ambiguous',
      },
      locationLabel: { type: Type.STRING, description: 'Joining city/country label' },
    },
    required: ['status'],
  },
};

const requestHumanHandoffTool: FunctionDeclaration = {
  name: 'request_human_handoff',
  description: 'Pause or resume proactive qualification when the caller asks to speak to a human representative.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      paused: {
        type: Type.BOOLEAN,
        description: 'True when caller asks for a human; false when caller explicitly asks to resume qualification.',
      },
    },
    required: ['paused'],
  },
};

function downsampleTo16kPCM(float32Array: Float32Array, inputSampleRate: number): ArrayBuffer {
  if (inputSampleRate === 16000) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(float32Array.length / ratio);
  const buffer = new ArrayBuffer(newLength * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = Math.min(float32Array.length - 1, Math.floor(i * ratio));
    const s = Math.max(-1, Math.min(1, float32Array[srcIndex]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export class GeminiLiveReceptionistClient {
  private session: any = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private callbacks: LiveSessionCallbacks;
  private isMuted = false;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public async connect(apiKey: string, preferredModel = 'gemini-3.8-live', voiceName = 'Aoede') {
    const candidateModels = Array.from(
      new Set([
        preferredModel,
        'gemini-2.5-flash-native-audio-preview-12-2025',
        'gemini-3.1-flash-live-preview',
        'gemini-3.8-live',
      ])
    );

    try {
      this.callbacks.onStatusChange('connecting', 'Requesting microphone access...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (micErr: any) {
      this.callbacks.onStatusChange(
        'error',
        `Microphone access denied: ${micErr?.message || 'Please allow microphone access in your browser.'}`
      );
      throw micErr;
    }

    const ai = new GoogleGenAI({ apiKey });
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        this.callbacks.onStatusChange('connecting', `Connecting to Gemini Live (${modelName})...`);

        const config: any = {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: buildVoiceReceptionistSystemPrompt() }],
          },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [
            {
              functionDeclarations: [
                updateBuyerQualificationTool,
                updateSimulatedMeetingTool,
                requestHumanHandoffTool,
              ],
            },
          ],
        };

        this.outputAudioCtx = new AudioContext({ sampleRate: 24000 });
        if (this.outputAudioCtx.state === 'suspended') {
          await this.outputAudioCtx.resume();
        }
        this.nextPlayTime = this.outputAudioCtx.currentTime;

        this.session = await ai.live.connect({
          model: modelName,
          config,
          callbacks: {
            onopen: () => {
              this.callbacks.onStatusChange('connected', `Live Voice Call Active (${modelName})`);
            },
            onmessage: (message: any) => {
              this.handleServerMessage(message);
            },
            onerror: (err: any) => {
              console.error('Gemini Live error:', err);
              this.callbacks.onStatusChange('error', err?.message || 'Live API WebSocket error');
            },
            onclose: (ev: any) => {
              this.callbacks.onStatusChange('disconnected', ev?.reason || 'Call ended');
              this.cleanupAudio();
            },
          },
        });

        await this.startMicrophonePipeline();

        this.sendTextMessage(
          'A caller just connected to the Apree-rose Trading Limited voice receptionist line. Greet them warmly with a natural, realistic feminine voice, introduce yourself as Sophie from Apree-rose Trading Limited in 2 sentences, and ask how you can help them today. Remember: never say "Thank you, [Company Name]" or "Thank you and [Company Name]" when the caller tells you their company name.'
        );
        return;
      } catch (err: any) {
        console.warn(`Model ${modelName} failed to connect, trying next fallback if available...`, err);
        lastError = err;
      }
    }

    this.cleanupAudio();
    this.callbacks.onStatusChange(
      'error',
      lastError?.message || 'Could not connect to Gemini Live API. Please check your API key.'
    );
    throw lastError;
  }

  public sendTextMessage(text: string) {
    if (!this.session) return;
    const phoneticText = text.replace(/\bAprirose\b/gi, 'Apree-rose');
    try {
      this.session.sendRealtimeInput({ text: phoneticText });
    } catch {
      try {
        this.session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: phoneticText }] }],
          turnComplete: true,
        });
      } catch (e) {
        console.error('Failed to send text to Live session:', e);
      }
    }
  }

  private handleServerMessage(message: any) {
    const content = message?.serverContent;

    if (content?.interrupted) {
      this.stopPlaybackQueue();
    }

    if (content?.inputTranscription?.text) {
      this.callbacks.onUserTranscript(content.inputTranscription.text, Boolean(content.turnComplete));
    }

    if (content?.outputTranscription?.text) {
      const normalizedTranscript = content.outputTranscription.text.replace(
        /\bAp-?ree[\s-]*rose\b/gi,
        'Aprirose'
      );
      this.callbacks.onAssistantTranscript(normalizedTranscript, Boolean(content.turnComplete));
    }

    if (content?.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.enqueueAudioChunk(part.inlineData.data);
        }
      }
    }

    if (message?.toolCall?.functionCalls) {
      const functionResponses: any[] = [];
      for (const fc of message.toolCall.functionCalls) {
        const args = (fc.args || {}) as Record<string, any>;
        if (fc.name === 'update_buyer_qualification') {
          const { evidenceQuote, ...factFields } = args;
          const cleanFacts: Partial<BuyerFacts> = {};
          const evidenceMap: Record<string, string> = {};
          for (const [k, v] of Object.entries(factFields)) {
            if (typeof v === 'string' && v.trim()) {
              (cleanFacts as any)[k] = v.trim();
              if (evidenceQuote) evidenceMap[k] = evidenceQuote;
            }
          }
          this.callbacks.onFactsUpdated(cleanFacts, evidenceMap);
          functionResponses.push({
            name: fc.name,
            id: fc.id,
            response: { result: 'Buyer qualification fields updated in live CRM.' },
          });
        } else if (fc.name === 'update_simulated_meeting') {
          this.callbacks.onMeetingUpdated({
            status: args.status || 'collecting',
            date: args.date,
            clockTime: args.clockTime,
            amPm: args.amPm,
            timezone: args.timezone,
            locationLabel: args.locationLabel,
            confirmedAt:
              args.status === 'demo_booked'
                ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : undefined,
          });
          functionResponses.push({
            name: fc.name,
            id: fc.id,
            response: {
              result: `Simulated meeting state updated to ${args.status}. Remember: label as DEMO/SIMULATED booking only.`,
            },
          });
        } else if (fc.name === 'request_human_handoff') {
          this.callbacks.onHumanHandoff(Boolean(args.paused));
          functionResponses.push({
            name: fc.name,
            id: fc.id,
            response: { result: `Human handoff state set to paused=${Boolean(args.paused)}.` },
          });
        }
      }

      if (functionResponses.length > 0 && this.session) {
        this.session.sendToolResponse({ functionResponses });
      }
    }
  }

  private async startMicrophonePipeline() {
    if (!this.mediaStream) return;

    this.inputAudioCtx = new AudioContext();
    if (this.inputAudioCtx.state === 'suspended') {
      await this.inputAudioCtx.resume();
    }
    const nativeRate = this.inputAudioCtx.sampleRate;
    const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
    this.processorNode = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      if (this.isMuted || !this.session) {
        this.callbacks.onAudioLevel(0, 0);
        return;
      }
      const inputData = event.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.min(1, Math.sqrt(sum / inputData.length) * 4);
      this.callbacks.onAudioLevel(rms, 0);

      const pcm16kBuffer = downsampleTo16kPCM(inputData, nativeRate);
      const base64Audio = arrayBufferToBase64(pcm16kBuffer);

      try {
        this.session.sendRealtimeInput({
          audio: {
            data: base64Audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } catch {
        // Ignore transient send errors on close
      }
    };

    source.connect(this.processorNode);
    this.processorNode.connect(this.inputAudioCtx.destination);
  }

  private enqueueAudioChunk(base64Pcm24k: string) {
    if (!this.outputAudioCtx) return;
    const int16 = base64ToInt16Array(base64Pcm24k);
    const float32 = new Float32Array(int16.length);
    let sum = 0;
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
      sum += float32[i] * float32[i];
    }
    const outLevel = Math.min(1, Math.sqrt(sum / Math.max(1, float32.length)) * 3.5);
    this.callbacks.onAudioLevel(0, outLevel);

    const audioBuffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const sourceNode = this.outputAudioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.outputAudioCtx.destination);

    const now = this.outputAudioCtx.currentTime;
    const startAt = Math.max(now, this.nextPlayTime);
    sourceNode.start(startAt);
    this.nextPlayTime = startAt + audioBuffer.duration;
    this.activeSources.push(sourceNode);

    sourceNode.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== sourceNode);
    };
  }

  private stopPlaybackQueue() {
    for (const s of this.activeSources) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  private cleanupAudio() {
    this.stopPlaybackQueue();
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.inputAudioCtx) {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  public disconnect() {
    if (this.session) {
      try {
        this.session.close();
      } catch {
        // ignore
      }
      this.session = null;
    }
    this.cleanupAudio();
    this.callbacks.onStatusChange('disconnected', 'Call ended');
  }
}
