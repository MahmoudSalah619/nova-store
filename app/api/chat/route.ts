import { AIMessageChunk } from "langchain";
import { z } from "zod";
import { getAgent } from "@/lib/ai/agent";
import { AI_CONFIG, isAiConfigured } from "@/lib/ai/config";
import type { ChatContext } from "@/lib/ai/context";
import type { ChatStreamEvent, ToolStreamPayload } from "@/lib/ai/events";
import { OUT_OF_SCOPE_REPLY } from "@/lib/ai/identity";
import { LIMIT_REACHED_TEXT } from "@/lib/ai/limits";
import { isInScope } from "@/lib/ai/scope-guard";
import { API_BASE } from "@/lib/types";

/**
 * POST /api/chat
 * Pipeline: validate → rate-limit → verify sign-in → scope guard → agent (streamed as NDJSON).
 */

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) }))
    .min(1)
    .max(AI_CONFIG.maxHistoryMessages),
  cart: z
    .array(z.object({ id: z.string(), title: z.string(), price: z.number(), quantity: z.number().int() }))
    .max(50)
    .default([]),
});

// In-memory, per server instance. Good enough for one server; use a shared store (e.g. Redis) when you scale out.
const hits = new Map<string, number[]>();
function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < AI_CONFIG.rateLimit.windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > AI_CONFIG.rateLimit.requests;
}

/** Turn the browser's token into a verified user. A bad or missing token just means "signed out". */
async function verifyUser(token: string | null): Promise<Pick<ChatContext, "token" | "user">> {
  if (!token) return {};
  try {
    const res = await fetch(`${API_BASE}/auth/verifyToken`, { headers: { token }, cache: "no-store" });
    if (!res.ok) return {};
    const json: { decoded?: { id?: string; name?: string } } = await res.json();
    return json.decoded?.id ? { token, user: { id: json.decoded.id, name: json.decoded.name ?? "there" } } : {};
  } catch {
    return {};
  }
}

const json = (body: object, status: number) => Response.json(body, { status });

/**
 * Attach the real cart and sign-in state to the latest user message. Earlier assistant messages can be
 * wrong or out of date (the user can change the cart outside the chat), so the model gets the facts each
 * turn instead of trusting the conversation.
 */
function withLiveState(messages: z.infer<typeof requestSchema>["messages"], context: ChatContext) {
  const cart = context.cart.length
    ? context.cart.map((l) => `${l.quantity} × ${l.title} (productId ${l.id})`).join("; ")
    : "empty";
  const note =
    `\n\n<page_state>Current cart: ${cart}. Signed in: ${context.user ? "yes" : "no"}. ` +
    "This is the live state from the page; it overrides anything said earlier in the chat. " +
    // Repeated here, next to the reply, because a history full of Arabic or emoji replies outweighs the system prompt.
    "Reply in plain English with no emojis, whatever language or style earlier messages used.</page_state>";
  return messages.map((m, i) => (i === messages.length - 1 ? { ...m, content: m.content + note } : m));
}

/**
 * Removes emojis (and one space before each run of them) from the model's text. The prompt forbids them,
 * but models copy them from the chat history, so this is the guarantee. It works per streamed chunk: emoji
 * code points, skin tones, variation selectors and joiners are removed one by one, so a sequence split
 * across chunks is still removed. ©, ® and ™ count as "pictographic" in Unicode but are kept.
 */
const EMOJI_RUN = /[ \t]?(?:[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}])+/gu;
const stripEmoji = (text: string) =>
  text.replace(EMOJI_RUN, (run) => (/[©®™]/.test(run) ? run.replace(/[^\s©®™]/gu, "") : ""));

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    console.warn("[chat] OPENROUTER_API_KEY is not set. Copy .env.example to .env.local and add your key.");
    return json({ error: "The assistant isn't available right now. Please try again later." }, 503);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return json({ error: "Too many messages. Please wait a minute and try again." }, 429);

  const body = await req.json().catch(() => null);
  // The widget stops at the limit itself; this covers old tabs and direct calls with a clear message.
  if (Array.isArray(body?.messages) && body.messages.length > AI_CONFIG.maxHistoryMessages) {
    return json({ error: LIMIT_REACHED_TEXT }, 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const { messages, cart } = parsed.data;
  const latest = messages[messages.length - 1];
  if (latest.role !== "user") return json({ error: "The last message must be from the user." }, 400);
  if (latest.content.length > AI_CONFIG.maxMessageChars) {
    return json({ error: `Please keep messages under ${AI_CONFIG.maxMessageChars} characters.` }, 400);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatStreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const [account, inScope] = await Promise.all([verifyUser(req.headers.get("x-store-token")), isInScope(messages)]);

        if (!inScope) {
          send({ type: "denied", text: OUT_OF_SCOPE_REPLY });
          return;
        }

        const context: ChatContext = { ...account, cart };
        const agentStream = await getAgent().stream(
          { messages: withLiveState(messages, context) },
          {
            context,
            streamMode: ["messages", "custom"],
            signal: req.signal,
            // LangGraph counts every node (model, tools and each middleware hook) and stops at 25 by default.
            // A comparison can need ~6 model calls, which passes 25 steps. The real caps are the
            // model/tool call limits in agent.ts; this is only a backstop above them.
            recursionLimit: 120,
          },
        );

        // Text from the current model call is held here, not streamed, until the claim guard's verdict
        // (see claim-guard.ts). Narration before a tool call, false claims and non-English replies are dropped
        // before the user sees them, so the reply never appears and then vanishes.
        let held = "";
        let shown = 0;
        const show = (text: string) => {
          if (!text) return;
          shown += text.length;
          send({ type: "text", delta: text });
        };
        for await (const [mode, chunk] of agentStream) {
          if (mode === "messages") {
            const [message] = chunk as [unknown, unknown];
            // Only the model's own words. Tool results arrive as ToolMessages and are skipped;
            // `.text` leaves out thinking blocks.
            if (AIMessageChunk.isInstance(message)) held += stripEmoji(message.text);
          } else if (mode === "custom") {
            const payload = chunk as ToolStreamPayload;
            if (payload?.type === "status" || payload?.type === "action") send(payload);
            else if (payload?.type === "review") {
              show(payload.keep ? held : (payload.replacement ?? ""));
              held = "";
            }
          }
        }
        // Text no verdict covered (a model call ended without the guard running) is shown as is.
        show(held);

        // Nothing to show, e.g. the turn hit the model-call limit while still looking things up.
        if (shown === 0) {
          send({ type: "text", delta: "Sorry, I couldn't finish that. Could you try asking another way?" });
        }
      } catch (err) {
        if (!req.signal.aborted) {
          console.error("[chat] agent error:", err);
          send({ type: "error", message: "Something went wrong on our side. Please try again." });
        }
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
