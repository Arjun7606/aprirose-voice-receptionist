# Aprirose Trading Limited — AI Voice Receptionist & Commercial Desk CRM

Enterprise client demonstration suite for **Aprirose Trading Limited** (London HQ · Dubai DMCC · Nairobi Hub · Mumbai · Incheon · Ha Noi), grounded in the 38-page Aprirose Client Reference Knowledge Base (Snapshot `25 October 2026`, Revision `1529929`).

---

## Core Capabilities

1. **Voice Receptionist & Real-Time Qualification Desk**
   - Supports **Browser Neural Voice (Web Speech STT + UK Neural TTS)** out of the box and **Gemini Live Native Audio WebSockets** (`@google/genai` `ai.live.connect` with `gemini-3.8-live` and fallback preview models).
   - Enforces phonetic pronunciation of **Aprirose** as **"Ap-ree-rose"** (`AP-ree-roze`).
   - Extracts up to **25 structured commercial RFQ fields** in real time while keeping `quantity` (current order) and `monthlyVolume` (ongoing consumption) strictly independent and preserving container units (`FCL`).
   - Automatically routes inquiries to the appropriate regional desk (**London HQ**, **Dubai DMCC**, **Nairobi Hub**, **Mumbai**, **Incheon**, or **Ha Noi**).

2. **Interactive Commercial Meetings Calendar (`Week Grid` & `Agenda View`)**
   - Voice-booked or quick-booked simulated sales meetings (`Demo booked`) plot directly onto the **5-Day Weekly Time Grid (`Mon 2 Nov – Fri 6 Nov 2026`, `09:00 AM – 05:00 PM`)**.
   - Enforces the 4 mandatory scheduling criteria:
     1. Company & Customer Name
     2. Email & Phone / WhatsApp
     3. Product / Material Requirement
     4. Explicit Date, Clock Time (`AM`/`PM`), and Validated IANA Timezone (with city/country alias resolution and ambiguous `930 IST` safeguarding).
   - Click any empty calendar cell (`+ Book Slot`) to schedule a meeting or click any booked event to inspect the dossier, reschedule inline, cancel, or export a `.ics` calendar invite.

3. **Persistent B2B CRM Pipeline (`Table View`, `Board View`, & `CSV Export`)**
   - Syncs live voice intake records to the local backend database (`/api/crm/leads` & `/api/crm/sync` in `data/crm-db.json` + `localStorage`).
   - Includes a 25-field slide-over Lead Inspector, stage transitions, one-click WhatsApp/Email lead summary copy, **CSV export**, and a **Reset Demo** button for clean client walkthroughs.

4. **Grounded Knowledge Base & Compliance Reference**
   - Enforces all source-conflict guardrails:
     - **2025 Turnover Conflict**: Reports both earlier owner-confirmed **US$62M** consolidated group turnover and latest public website **US$63M** revenue figure without picking one as settled.
     - **Dated 2022 vs. Undated Profile**: Distinguishes 2022 figures (**70,000 MTS** / **US$79M**) from the undated company profile snapshot (**80,000 MT** polymers, **25,000 MT** chemicals, **50 employees**, **US$100M** turnover).
     - **Polyurethane Boundary**: Clarifies that **PVC** (vinyl polymer) and **PET** (thermoplastic polyester) are not polyurethanes (**TDI** and **Polyol**).
     - **No-Fax Policy**: States that fax is no longer used and directs inquiries to phone or email.

---

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173/** in Chrome or Edge.
