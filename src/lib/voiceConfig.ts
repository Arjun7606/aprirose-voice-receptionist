import { Type, Behavior, type FunctionDeclaration } from "@google/genai";
import { buildVoiceReceptionistSystemPrompt } from "../data/apriroseKnowledge";
const updateBuyerQualificationTool: FunctionDeclaration = {
  name: "update_buyer_qualification",
  behavior: Behavior.NON_BLOCKING,
  description:
    "Record or update buyer qualification fields extracted from what the caller stated during the conversation. Keep order quantity and monthlyVolume separate. Never convert FCL containers into invented tonnage.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      company: { type: Type.STRING, description: "Buyer company name" },
      companyCountry: {
        type: Type.STRING,
        description: "Country where the buyer company is based",
      },
      buyerType: {
        type: Type.STRING,
        description:
          "Buyer business activity/type (e.g., Manufacturer, Converter, Distributor / Trader, End User)",
      },
      contactName: {
        type: Type.STRING,
        description: "Caller full name or first name",
      },
      email: { type: Type.STRING, description: "Caller email address" },
      phone: {
        type: Type.STRING,
        description: "Caller phone or WhatsApp number",
      },
      material: {
        type: Type.STRING,
        description:
          "Product or material family (e.g., PP Raffia, HDPE, LLDPE, LDPE, PVC, PET, Caustic Soda, Sodium Sulfate Anhydrous, TDI, Polyol)",
      },
      application: {
        type: Type.STRING,
        description:
          "Intended application (e.g., Raffia, Injection, Film, Blow Moulding, Pipe, Rotomoulding, Bottle, Profiles)",
      },
      requestedGrade: {
        type: Type.STRING,
        description: "Specific grade requested or discussed",
      },
      mfi: {
        type: Type.STRING,
        description: "Melt Flow Index (MFI) or IV/K-value specification",
      },
      quantity: {
        type: Type.STRING,
        description:
          "Order quantity with unit (e.g., 100 MT, 2 FCL, 500 KG). Independent from monthlyVolume.",
      },
      monthlyVolume: {
        type: Type.STRING,
        description: "Regular monthly demand or consumption volume with unit",
      },
      dischargePort: {
        type: Type.STRING,
        description:
          "Named destination discharge port (e.g., Mombasa, Tamatave, Lagos, Chittagong, Nhava Sheva)",
      },
      destinationCountry: {
        type: Type.STRING,
        description: "Destination country for shipment",
      },
      destinationCity: {
        type: Type.STRING,
        description: "Destination city for shipment",
      },
      shippingTermRequested: {
        type: Type.STRING,
        description: "Incoterm / shipping term requested (e.g., CIF, CFR, FOB)",
      },
      paymentTermsRequested: {
        type: Type.STRING,
        description: "Payment terms preference (e.g., T/T, LC, DA, OA)",
      },
      shipmentTiming: {
        type: Type.STRING,
        description:
          "Requested shipment or delivery timing (never copy meeting time here)",
      },
      preferredProducer: {
        type: Type.STRING,
        description:
          "Preferred producer or brand (e.g., Sinopec, Borouge, Jinneng, SABIC)",
      },
      preferredOrigin: {
        type: Type.STRING,
        description: "Preferred country/region of origin",
      },
      preferredContactMethod: {
        type: Type.STRING,
        description: "Preferred contact channel (Email, WhatsApp, Phone)",
      },
      technicalDocumentRequested: {
        type: Type.STRING,
        description: "Requested technical documents (e.g., TDS, COA, MSDS)",
      },
      equivalentGradeAcceptable: {
        type: Type.STRING,
        description: "Whether equivalent grades are acceptable",
      },
      evidenceQuote: {
        type: Type.STRING,
        description:
          "Short verbatim quote from the caller supporting these facts",
      },
    },
  },
};

const updateSimulatedMeetingTool: FunctionDeclaration = {
  name: "update_simulated_meeting",
  description:
    'Update or confirm a simulated demo sales meeting. Only set status="demo_booked" when customer name, company name, email, phone, product requirement, future date, unambiguous clock time (with AM/PM), and valid timezone are all known.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description: '"collecting", "demo_booked", or "cancelled"',
      },
      date: { type: Type.STRING, description: "Meeting date" },
      clockTime: {
        type: Type.STRING,
        description: "Meeting clock time (e.g., 10:30)",
      },
      amPm: {
        type: Type.STRING,
        description: '"AM", "PM", "resolved_24h", or "ambiguous"',
      },
      timezone: {
        type: Type.STRING,
        description:
          "IANA timezone (e.g., Asia/Kolkata, Europe/London, Asia/Dubai, Africa/Nairobi) or Ambiguous",
      },
      locationLabel: {
        type: Type.STRING,
        description: "Joining city/country label",
      },
    },
    required: ["status"],
  },
};

const requestHumanHandoffTool: FunctionDeclaration = {
  name: "request_human_handoff",
  description:
    "Pause or resume proactive qualification when the caller asks to speak to a human representative.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      paused: {
        type: Type.BOOLEAN,
        description:
          "True when caller asks for a human; false when caller explicitly asks to resume qualification.",
      },
    },
    required: ["paused"],
  },
};

export const VOICE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
export const voiceConfig = {
  responseModalities: ["AUDIO"],
  systemInstruction:
    buildVoiceReceptionistSystemPrompt() +
    "\nUse English unless the caller explicitly requests another language. Never infer a language switch from unclear audio. If unclear, ask the caller to repeat. Speak with a warm, smooth, relaxed feminine delivery. Greet only once per call; thereafter continue the conversation. Replace superseded details when corrected. Never say a real booking, email or transfer was completed. Current UTC date: " +
    new Date().toISOString().slice(0, 10),
  speechConfig: {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
  },
  inputAudioTranscription: {},
  outputAudioTranscription: {},
  maxOutputTokens: 1024,
  thinkingConfig: { thinkingBudget: 0 },
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
