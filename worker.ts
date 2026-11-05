import { GoogleGenAI } from "@google/genai";
import { VOICE_MODEL, voiceConfig } from "./src/lib/voiceConfig";
interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GEMINI_API_KEY: string;
  VOICE_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
}
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/config")
      return json({ liveVoiceAvailable: Boolean(env.GEMINI_API_KEY) });
    if (url.pathname === "/api/voice/session") {
      if (request.method !== "POST")
        return json({ error: "Method not allowed" }, 405);
      if (request.headers.get("Origin") !== url.origin)
        return json(
          { error: "Please start your call from the demo page." },
          403,
        );
      if (!env.GEMINI_API_KEY)
        return json(
          {
            error:
              "Voice is not configured yet. Please try the text conversation.",
          },
          503,
        );
      if (
        env.VOICE_LIMITER &&
        !(
          await env.VOICE_LIMITER.limit({
            key: request.headers.get("CF-Connecting-IP") || "unknown",
          })
        ).success
      )
        return json(
          { error: "Please wait a minute before starting another call." },
          429,
        );
      try {
        const ai = new GoogleGenAI({
          apiKey: env.GEMINI_API_KEY,
          httpOptions: { apiVersion: "v1alpha" },
        });
        const token = await ai.authTokens.create({
          config: {
            uses: 1,
            newSessionExpireTime: new Date(Date.now() + 60000).toISOString(),
            expireTime: new Date(Date.now() + 6 * 60000).toISOString(),
            liveConnectConstraints: {
              model: VOICE_MODEL,
              config: voiceConfig as any,
            },
          },
        });
        return json({ token: token.name, model: VOICE_MODEL });
      } catch {
        return json(
          {
            error:
              "Voice service is temporarily unavailable. Please try again shortly.",
          },
          503,
        );
      }
    }
    if (url.pathname.startsWith("/api/"))
      return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
