"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatStreamEvent, ClientAction } from "@/lib/ai/events";
import { CHAT_LIMITS, turnsLeft } from "@/lib/ai/limits";
import { useAccount } from "../account-provider";
import { useCart } from "../cart-provider";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** What the page actually did for this reply, written by the page, not the model. */
  receipts?: string[];
  denied?: boolean;
  error?: boolean;
};

/** Removes receipt-looking text the model wrote itself; only the page may produce receipts. */
export const stripFakeReceipts = (text: string) => text.replace(/\(Applied:[^)]*\)/g, "").trimEnd();

/** Sent back to the model so it can tell real changes from claims (see the prompt's "(Applied: …)" rule). */
const forModel = (m: ChatMessage) => {
  const text = m.role === "assistant" ? stripFakeReceipts(m.content) : m.content;
  return m.receipts?.length ? `${text}\n\n(Applied: ${m.receipts.join("; ")})` : text;
};

const STORAGE_KEY = "nova-chat";
const uid = () => Math.random().toString(36).slice(2);

/** Chat state, the streaming request to /api/chat, and applying the actions tools send back. */
export function useChat() {
  const router = useRouter();
  const cart = useCart();
  const { token, refreshWishlist } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Failed replies aren't sent to the model, so they don't count toward the chat's length limit.
  const counted = messages.filter((m) => !m.error);
  const left = turnsLeft(counted.length);

  // Keep the conversation for this browser tab. Nothing is saved until the stored chat has been read back,
  // otherwise the first (empty) render overwrites it (React runs effects twice in development).
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-CHAT_LIMITS.maxMessages)));
    } catch {}
  }, [messages, restored]);

  /** The only things the assistant can make the page do. Returns a receipt line for the chat, or null. */
  const applyAction = useCallback(
    (action: ClientAction): string | null => {
      const titleOf = (id: string) => cart.items.find((i) => i.id === id)?.title ?? "item";
      switch (action.type) {
        case "cart_add":
          cart.add(action.product, action.quantity);
          return `Added ${action.quantity} × ${action.product.title} to cart`;
        case "cart_set_quantity":
          cart.setQuantity(action.productId, action.quantity);
          return `Set ${titleOf(action.productId)} to ${action.quantity} in cart`;
        case "cart_remove": {
          const title = titleOf(action.productId);
          cart.remove(action.productId);
          return `Removed ${title} from cart`;
        }
        case "wishlist_changed":
          refreshWishlist();
          return "Wishlist updated";
        case "navigate":
          if (!action.path.startsWith("/") || action.path.startsWith("//")) return null;
          router.push(action.path);
          return `Opened ${action.path}`;
      }
    },
    [cart, refreshWishlist, router],
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy || left === 0) return;

      const userMsg: ChatMessage = { id: uid(), role: "user", content };
      const replyId = uid();
      const history = [...counted, userMsg];
      setMessages((prev) => [...prev, userMsg, { id: replyId, role: "assistant", content: "" }]);
      setBusy(true);
      setStatus("Thinking…");

      const update = (patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) =>
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m)));

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", ...(token ? { "x-store-token": token } : {}) },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: forModel(m) })),
            cart: cart.items.map(({ id, title, price, quantity }) => ({ id, title, price, quantity })),
          }),
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          update({ content: body?.error ?? "The assistant is unavailable right now.", error: true });
          return;
        }

        // Newline-delimited JSON: one ChatStreamEvent per line.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as ChatStreamEvent;
            if (event.type === "text") {
              setStatus(null);
              update((m) => ({ content: m.content + event.delta }));
            } else if (event.type === "status") setStatus(event.label);
            else if (event.type === "action") {
              const receipt = applyAction(event.action);
              if (receipt) update((m) => ({ receipts: [...(m.receipts ?? []), receipt] }));
            }
            else if (event.type === "retract") update((m) => ({ content: m.content.slice(0, Math.max(0, m.content.length - event.chars)) }));
            else if (event.type === "denied") update({ content: event.text, denied: true });
            else if (event.type === "error") update({ content: event.message, error: true });
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") update({ content: "Connection lost. Please try again.", error: true });
        else update((m) => ({ content: m.content || "Stopped." }));
      } finally {
        setBusy(false);
        setStatus(null);
        abortRef.current = null;
      }
    },
    [busy, left, counted, token, cart.items, applyAction],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, status, busy, send, stop, reset, turnsLeft: left };
}
