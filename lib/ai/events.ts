import type { CartProduct } from "@/lib/cart";
import type { StorePage } from "./identity";

/**
 * Things a tool asks the browser to do. The chat widget applies only these, so the
 * model can never trigger anything outside this list.
 */
export type ClientAction =
  | { type: "cart_add"; product: CartProduct; quantity: number }
  | { type: "cart_set_quantity"; productId: string; quantity: number }
  | { type: "cart_remove"; productId: string }
  | { type: "wishlist_changed" }
  | { type: "navigate"; page: StorePage | "product"; path: string };

/** One line of the newline-delimited JSON stream from POST /api/chat. */
export type ChatStreamEvent =
  | { type: "text"; delta: string }
  | { type: "status"; label: string }
  | { type: "action"; action: ClientAction }
  | { type: "denied"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

/** What a tool or graph node writes through `runtime.writer`. */
export type ToolStreamPayload =
  | { type: "status"; label: string }
  | { type: "action"; action: ClientAction }
  /** From the claim guard, after each model call: show that call's held-back text, or drop it (optionally showing `replacement`). */
  | { type: "review"; keep: boolean; replacement?: string };

/** What graph nodes write to the `custom` stream: tool and guard payloads plus the scope guard's refusal. */
export type GraphStreamPayload = ToolStreamPayload | { type: "denied"; text: string };
