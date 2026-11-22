import { ChatOpenRouter } from "@langchain/openrouter";
import { AI_CONFIG } from "./config";

/**
 * The one place that knows which LLM provider we use (OpenRouter).
 * The agent and the scope guard both get their model from here, so switching provider means changing this file only.
 */
export function createChatModel({ maxTokens, effort }: { maxTokens: number; effort: "low" | "medium" | "high" }) {
  return new ChatOpenRouter({
    model: AI_CONFIG.model,
    apiKey: process.env.OPENROUTER_API_KEY,
    maxTokens,
    // OpenRouter's unified reasoning setting; models without reasoning ignore it.
    modelKwargs: { reasoning: { effort } },
    // If the main model fails, OpenRouter tries these in order within the same request.
    ...(AI_CONFIG.fallbackModels.length ? { models: [AI_CONFIG.model, ...AI_CONFIG.fallbackModels], route: "fallback" as const } : {}),
    siteUrl: AI_CONFIG.siteUrl,
    siteName: AI_CONFIG.siteName,
  });
}
