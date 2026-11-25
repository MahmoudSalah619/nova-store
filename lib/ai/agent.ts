import { createAgent, modelCallLimitMiddleware, toolCallLimitMiddleware } from "langchain";
import { claimGuardMiddleware } from "./claim-guard";
import { AI_CONFIG } from "./config";
import { chatContextSchema } from "./context";
import { loopGuardMiddleware } from "./loop-guard";
import { createChatModel } from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import { tools } from "./tools";

function buildAgent() {
  return createAgent({
    model: createChatModel({ maxTokens: AI_CONFIG.maxOutputTokens, effort: AI_CONFIG.effort }),
    tools,
    systemPrompt: SYSTEM_PROMPT,
    contextSchema: chatContextSchema,
    middleware: [
      // Hard stops so one message can't loop forever or run up the bill.
      modelCallLimitMiddleware({ runLimit: AI_CONFIG.maxModelCallsPerTurn, exitBehavior: "end" }),
      toolCallLimitMiddleware({ runLimit: AI_CONFIG.maxToolCallsPerTurn, exitBehavior: "end" }),
      // Catches "Done, I added it" when no tool made the change (see claim-guard.ts).
      claimGuardMiddleware(),
      // Skips identical catalog lookups repeated in one turn (see loop-guard.ts).
      loopGuardMiddleware(),
    ],
  });
}

let agent: ReturnType<typeof buildAgent> | null = null;

/** Built on first use so a missing API key doesn't break the build or other pages. */
export function getAgent() {
  agent ??= buildAgent();
  return agent;
}
