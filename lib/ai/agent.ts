import { createAgent, modelCallLimitMiddleware, toolCallLimitMiddleware } from "langchain";
import { AI_CONFIG } from "./config";
import { chatContextSchema } from "./context";
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
    ],
  });
}

let agent: ReturnType<typeof buildAgent> | null = null;

/** Built on first use so a missing API key doesn't break the build or other pages. */
export function getAgent() {
  agent ??= buildAgent();
  return agent;
}
