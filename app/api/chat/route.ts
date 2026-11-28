import { AIMessage, AIMessageChunk, HumanMessage } from "langchain";
import { z } from "zod";
import { RECURSION_LIMIT, REPLY_NODES, getAgent } from "@/lib/ai/agent";
import { AI_CONFIG, isAiConfigured } from "@/lib/ai/config";
import type { ChatContext } from "@/lib/ai/context";
import type { ChatStreamEvent, GraphStreamPayload } from "@/lib/ai/events";
import { API_BASE } from "@/lib/types";

/**
 * POST /api/chat
 * Pipeline: validate → rate-limit → verify sign-in → LangGraph graph (scope guard → agent ⇄ tools), streamed as NDJSON.
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

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    console.warn("[chat] OPENROUTER_API_KEY is not set. Copy .env.example to .env.local and add your key.");
    return json({ error: "The assistant isn't available right now. Please try again later." }, 503);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return json({ error: "Too many messages. Please wait a minute and try again." }, 429);

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
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
        const context: ChatContext = { ...(await verifyUser(req.headers.get("x-store-token"))), cart };
        const history = messages.map((m) => (m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)));
        const graphStream = await getAgent().stream(
          { messages: history },
          { context, streamMode: ["messages", "custom"], signal: req.signal, recursionLimit: RECURSION_LIMIT },
        );

        let wroteText = false;
        let denied = false;
        for await (const [mode, chunk] of graphStream) {
          if (mode === "messages") {
            const [message, metadata] = chunk as [unknown, { langgraph_node?: string }];
            // Only stream the reply: skip the scope guard's classifier output and tool results (ToolMessages).
            // `.text` leaves out thinking blocks.
            if (REPLY_NODES.has(metadata?.langgraph_node ?? "") && AIMessageChunk.isInstance(message) && message.text) {
              wroteText = true;
              send({ type: "text", delta: message.text });
            }
          } else if (mode === "custom") {
            const payload = chunk as GraphStreamPayload;
            if (payload?.type === "denied") denied = true;
            if (payload?.type === "status" || payload?.type === "action" || payload?.type === "denied") send(payload);
          }
        }

        if (!wroteText && !denied) {
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
