import { END, START, Annotation, MessagesAnnotation, StateGraph, type Runtime } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from "langchain";
import { guardedModelCall } from "./claim-guard";
import { AI_CONFIG } from "./config";
import type { ChatContext } from "./context";
import type { GraphStreamPayload } from "./events";
import { OUT_OF_SCOPE_REPLY } from "./identity";
import { createChatModel } from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import { repeatedLookup } from "./loop-guard";
import { isInScope, type ChatTurn } from "./scope-guard";
import { tools } from "./tools";
import { result } from "./tools/shared";

/**
 * The assistant as a LangGraph state graph:
 *
 *   START → guard ──out of scope──► END
 *             └─► agent ⇄ tools
 *                   ├─ no tool calls ──────────► END
 *                   └─ over the call limits ───► finish → END
 *
 * - guard:  the scope check (scope-guard.ts). Out of scope → a "denied" event and the agent never runs.
 * - agent:  one model call with the tools bound. Adds the live page state to the latest user message.
 *           The call goes through the claim guard (claim-guard.ts), which rejects false "Done, I added it"
 *           replies and non-English ones and asks the model again.
 * - tools:  runs the tool calls the model asked for (LangGraph's ToolNode, which passes our context and writer).
 *           Identical catalog lookups repeated in one turn are answered by the loop guard instead (loop-guard.ts).
 * - finish: the call limits were reached. Pending tool calls are answered with "not run" and the model
 *           writes a final reply without tools, so the user still gets an answer instead of silence.
 */

const ChatState = Annotation.Root({
  ...MessagesAnnotation.spec,
  /** Model calls made so far in this turn. */
  modelCalls: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
  /** Tool calls the model has asked for so far in this turn (counted before they run). */
  toolCalls: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
  /** Set by the guard when the latest message is out of scope. */
  denied: Annotation<boolean>({ reducer: (_, b) => b, default: () => false }),
});

type State = typeof ChatState.State;
/** Node runtime. Its `context` is the ChatContext the API route passes to `stream()`. */
type Config = Runtime;
const contextOf = (config: Config) => config.context as ChatContext | undefined;

const send = (config: Config, payload: GraphStreamPayload) => config.writer?.(payload);

/** The conversation as plain turns, for the scope guard. Only the input history exists when the guard runs. */
function toTurns(messages: BaseMessage[]): ChatTurn[] {
  return messages
    .filter((m) => HumanMessage.isInstance(m) || AIMessage.isInstance(m))
    .map((m) => ({ role: HumanMessage.isInstance(m) ? "user" : "assistant", content: m.text }));
}

/**
 * Attach the real cart and sign-in state to the latest user message. Earlier assistant messages can be
 * wrong or out of date (the user can change the cart outside the chat), so the model gets the facts each
 * call instead of trusting the conversation. Added at call time only, so the graph state stays clean.
 */
function withLiveState(messages: BaseMessage[], context: ChatContext | undefined): BaseMessage[] {
  const cartLines = context?.cart ?? [];
  const cart = cartLines.length
    ? cartLines.map((l) => `${l.quantity} × ${l.title} (productId ${l.id})`).join("; ")
    : "empty";
  const note =
    `\n\n<page_state>Current cart: ${cart}. Signed in: ${context?.user ? "yes" : "no"}. ` +
    "This is the live state from the page; it overrides anything said earlier in the chat. " +
    // Repeated here, next to the reply, because a history full of Arabic or emoji replies outweighs the system prompt.
    "Reply in plain English with no emojis, whatever language or style earlier messages used.</page_state>";

  let last = -1;
  messages.forEach((m, i) => HumanMessage.isInstance(m) && (last = i));
  return messages.map((m, i) => (i === last ? new HumanMessage(m.text + note) : m));
}

function buildGraph() {
  const model = createChatModel({ maxTokens: AI_CONFIG.maxOutputTokens, effort: AI_CONFIG.effort });
  const withTools = model.bindTools(tools);
  // Tools stay bound so the history (which has tool calls in it) is valid for every provider; the model just can't call them.
  const noTools = model.bindTools(tools, { tool_choice: "none" });

  type Bound = typeof withTools;
  /** One model call through the claim guard, which may make a second call with a correction. */
  const reply = (bound: Bound, messages: BaseMessage[], config: Config) =>
    guardedModelCall(
      (msgs) => bound.invoke([new SystemMessage(SYSTEM_PROMPT), ...withLiveState(msgs, contextOf(config))], config),
      messages,
      config.writer,
    );
  const toolNode = new ToolNode(tools);

  async function guard(state: State, config: Config) {
    if (await isInScope(toTurns(state.messages))) return {};
    send(config, { type: "denied", text: OUT_OF_SCOPE_REPLY });
    return { denied: true };
  }

  async function agent(state: State, config: Config) {
    const answer = await reply(withTools, state.messages, config);
    return { messages: [answer], modelCalls: 1, toolCalls: answer.tool_calls?.length ?? 0 };
  }

  async function finish(state: State, config: Config) {
    const last = state.messages[state.messages.length - 1];
    const skipped = (AIMessage.isInstance(last) ? (last.tool_calls ?? []) : []).map(
      (call) =>
        new ToolMessage({
          tool_call_id: call.id ?? "",
          name: call.name,
          content: result({
            error: "limit_reached",
            message: "Not run: this reply has used its tool budget. Answer now with what you already found.",
          }),
        }),
    );
    const answer = await reply(noTools, [...state.messages, ...skipped], config);
    return { messages: [...skipped, answer], modelCalls: 1 };
  }

  /** Runs the requested tool calls, except repeated catalog lookups, which get the loop guard's note instead. */
  async function runTools(state: State, config: Config) {
    const last = state.messages[state.messages.length - 1];
    const calls = AIMessage.isInstance(last) ? (last.tool_calls ?? []) : [];
    const skipped = calls.map((c) => repeatedLookup(c, state.messages)).filter((m): m is ToolMessage => m !== null);
    const toRun = calls.filter((c) => !skipped.some((m) => m.tool_call_id === c.id));
    if (!toRun.length) return { messages: skipped };

    const input = { messages: [...state.messages.slice(0, -1), new AIMessage({ content: last.content, id: last.id, tool_calls: toRun })] };
    const ran: { messages: BaseMessage[] } = await toolNode.invoke(input, config);
    return { messages: [...skipped, ...ran.messages] };
  }

  const afterGuard = (state: State) => (state.denied ? END : "agent");

  function afterAgent(state: State) {
    const last = state.messages[state.messages.length - 1];
    if (!AIMessage.isInstance(last) || !last.tool_calls?.length) return END;
    // Hard stops so one message can't loop forever or run up the bill. `finish` is the last model call,
    // so the agent stops one short of the model limit to leave room for it.
    const overModel = state.modelCalls >= AI_CONFIG.maxModelCallsPerTurn - 1;
    // toolCalls already includes the calls this message asks for.
    const overTools = state.toolCalls > AI_CONFIG.maxToolCallsPerTurn;
    return overModel || overTools ? "finish" : "tools";
  }

  return new StateGraph(ChatState)
    .addNode("guard", guard)
    .addNode("agent", agent)
    .addNode("tools", runTools)
    .addNode("finish", finish)
    .addEdge(START, "guard")
    .addConditionalEdges("guard", afterGuard, ["agent", END])
    .addConditionalEdges("agent", afterAgent, ["tools", "finish", END])
    .addEdge("tools", "agent")
    .addEdge("finish", END)
    .compile({ name: "nova-assistant" });
}

/** Graph nodes whose model output is the reply to the user (the guard's classifier output is not). */
export const REPLY_NODES = new Set(["agent", "finish"]);

/**
 * Upper bound on graph steps for one turn: guard + (agent, tools) per tool round + finish.
 * The real caps are the model/tool call limits above; this is a backstop.
 */
export const RECURSION_LIMIT = 2 * AI_CONFIG.maxModelCallsPerTurn + 5;

let graph: ReturnType<typeof buildGraph> | null = null;

/** Built on first use so a missing API key doesn't break the build or other pages. */
export function getAgent() {
  graph ??= buildGraph();
  return graph;
}
