# Aprirose Trading Limited — AI Voice Receptionist & Live CRM

Interactive AI Voice Receptionist and Real-Time Buyer Qualification Dashboard built for **Aprirose Trading Limited** (grounded in the 38-page Client Reference Knowledge Base, Snapshot `25 October 2026`, Source Revision `1529929`).

## Features
- **Dual Voice Engine**:
  - **Gemini Multimodal Live API (`gemini-3.8-live`)**: Real-time bidirectional 16kHz/24kHz PCM audio streaming over WebSockets (`@google/genai` `ai.live.connect`) with live audio transcription and real-time function calling (`update_buyer_qualification`, `update_simulated_meeting`, `request_human_handoff`).
  - **Instant Grounded Voice Mode**: Zero-config browser speech recognition + neural voice synthesis powered by the deterministic Aprirose Grounded NLU Engine.
- **Live Buyer Qualification & Sales Lead Summary (25 CRM Fields)**:
  - Automatically extracts Company, Country, Buyer Type, Material/Product, Application, Grade/MFI, Order Quantity, Monthly Volume (kept strictly independent from order quantity), Discharge Port, Payment Terms (`T/T`, `LC`, `DA`, `OA`), Shipping Terms (`CIF`, `CFR`, `FOB`), and Caller Contact details with verbatim caller evidence quotes.
- **Simulated Meeting Booking Gate**:
  - Timezone-aware demo booking (`Asia/Kolkata`, `Asia/Dubai`, `Europe/London`, `Africa/Nairobi`, etc.) with `IST` ambiguity detection (`India / Israel / Ireland`) and 4-point completion verification.
- **Strict Factual Grounding & Source Audit**:
  - Enforces Aprirose source boundaries: 2025 `US$62M` vs `US$63M` financial conflict disclosure, 2022 `70,000 MTS / US$79M` dated figures vs undated profile snapshot (`80,000 MT` polymer, `25,000 MT` chemical, `50` employees, `50+` countries, `US$100M` turnover), `PVC`/`PET` vs Polyurethane (`TDI` & `Polyol`) distinction, 6 authoritative public offices, and no-fax policy.

## Quick Start

```bash
npm install
npm run dev
```
