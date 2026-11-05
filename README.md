# Aprirose voice receptionist — client preview

Live demo: https://aprirose-receptionist.tng-jewellery-commerce-template.workers.dev

A responsive Aprirose branded call desk built on the original knowledge base and qualification engine. The call and conversation are on the left; captured enquiry details are on the right.

## Client testing

Open the HTTPS demo, select **Start a call**, and allow microphone access. Let the receptionist finish its greeting, then share a product, quantity, destination, and company/contact details. Correct requirements, mute/unmute the microphone or speaker, copy the summary, and select **New conversation** to clear the page. Calls last up to five minutes.

Desktop Chrome/Edge, Android Chrome, and iPhone Safari are the intended targets. Automated checks cover Chromium desktop and a mobile-sized viewport; a physical iPhone/Safari call has not been verified here.

Text entry works without starting a call using the existing grounded engine. During a call, text goes to the live voice model. Meetings are simulations: this preview does not place orders, send invitations, transfer telephone calls, notify staff, or persist leads to a shared CRM. Conversation and enquiry details remain in memory until reset, refresh or closing the page. Voice is processed by Google Gemini.

## Development

```powershell
npm ci
# Put GEMINI_API_KEY=<your key> in the ignored .dev.vars file.
npm run dev
```

This builds the frontend and starts the Cloudflare Worker locally, including the voice-session backend (default port 8787). Rebuild after frontend changes when using Worker preview. `npm run dev:ui` runs only Vite and cannot create voice sessions. `npm run build` performs TypeScript and production compilation.

## Deploy

```powershell
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

The long-lived key is a Cloudflare secret, never sent to the browser. The backend creates one-use, short-lived, model-constrained tokens. Session starts are rate limited to five per minute per IP. Keep `.dev.vars`, `.env*`, and credentials out of Git and shared archives.

Voice uses Aoede with a warm feminine delivery instruction. Microphone and playback share one hardware-rate AudioContext to avoid competing sample rates on iOS. AudioWorklet capture has a ScriptProcessor fallback. Cleanup stops microphone tracks and playback, cancels pending requests, and ignores stale callbacks.

The factual source remains the original Aprirose knowledge snapshot dated 25 October 2026 (revision 1529929). No commercial claims were refreshed here.
