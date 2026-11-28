import { HumanMessage, SystemMessage } from "langchain";
import { AI_CONFIG } from "./config";
import { createChatModel } from "./model";
import { SCOPE_GUARD_PROMPT } from "./prompt";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** How the classifier runs. Exported so the drawn graph (npm run agent:graph) can show it. */
export const SCOPE_GUARD_SETTINGS = { maxTokens: 1024, effort: "low", recentTurns: 6 } as const;

let classifier: ReturnType<typeof createChatModel> | null = null;
function getClassifier() {
  classifier ??= createChatModel({ maxTokens: SCOPE_GUARD_SETTINGS.maxTokens, effort: SCOPE_GUARD_SETTINGS.effort });
  return classifier;
}

/**
 * Layer 1 of scope enforcement: a separate model call that only answers IN_SCOPE / OUT_OF_SCOPE.
 * It sees the last few turns so short follow-ups ("and the black one?") are judged in context.
 * Layer 2 is the agent's system prompt, which refuses anything that slips through.
 *
 * Fails open (returns true) on errors: the agent's own rules still apply, and a store outage
 * shouldn't be reported to the user as "I can't help with that".
 */
export async function isInScope(history: ChatTurn[]): Promise<boolean> {
  if (!AI_CONFIG.scopeGuard) return true;
  const recent = history.slice(-SCOPE_GUARD_SETTINGS.recentTurns);
  const latest = recent[recent.length - 1];
  const earlier = recent
    .slice(0, -1)
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content.slice(0, 400)}`)
    .join("\n");

  try {
    const reply = await getClassifier().invoke([
      new SystemMessage(SCOPE_GUARD_PROMPT),
      new HumanMessage(
        `${earlier ? `<earlier_conversation>\n${earlier}\n</earlier_conversation>\n\n` : ""}` +
          `<latest_user_message>\n${latest.content}\n</latest_user_message>\n\nIN_SCOPE or OUT_OF_SCOPE?`,
      ),
    ]);
    // A provider content filter means this isn't something the store assistant should touch.
    if (reply.response_metadata?.normalized_finish_reason === "content_filter") return false;
    return !reply.text.toUpperCase().includes("OUT_OF_SCOPE");
  } catch (err) {
    console.error("[chat] scope guard failed, letting the agent decide:", err);
    return true;
  }
}
