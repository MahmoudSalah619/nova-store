/** Tunables for the shopping assistant. Everything the agent is allowed to cost or do in one turn lives here. */
export const AI_CONFIG = {
  /** Any OpenRouter model id (https://openrouter.ai/models). Override with CHAT_MODEL. It must support tool calling. */
  model: process.env.CHAT_MODEL || "z-ai/glm-5.3-flash",
  /** Models OpenRouter tries, in order, if the main one is down or refuses. Comma-separated in CHAT_FALLBACK_MODELS. */
  fallbackModels: (process.env.CHAT_FALLBACK_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  /** Reasoning effort for models that support it. Shopping chat is short and tool-driven; "low" keeps replies quick. */
  effort: (process.env.CHAT_EFFORT as "low" | "medium" | "high") || "low",
  maxOutputTokens: 4096,
  /** Shown on your OpenRouter dashboard as the app making the requests. */
  siteUrl: process.env.SITE_URL || "http://localhost:3000",
  siteName: "Nova Store",

  /** Model calls allowed per user message (each tool round trip is one call). */
  maxModelCallsPerTurn: 8,
  /** Tool calls allowed per user message. */
  maxToolCallsPerTurn: 12,

  /** Request limits, checked in the API route before any model call. */
  maxMessageChars: 1000,
  maxHistoryMessages: 20,
  rateLimit: { requests: 15, windowMs: 60_000 },

  /** Run the scope check before the agent. Set CHAT_SCOPE_GUARD=off to rely on the system prompt alone. */
  scopeGuard: process.env.CHAT_SCOPE_GUARD !== "off",
} as const;

export function isAiConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}
