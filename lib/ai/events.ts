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
  /** Drop the last `chars` characters of the reply (a false claim the claim guard caught), then keep streaming. */
  | { type: "retract"; chars: number }
  | { type: "error"; message: string }
  | { type: "done" };

/** What a tool or middleware writes through `runtime.writer`. */
export type ToolStreamPayload =
  | { type: "status"; label: string }
  | { type: "action"; action: ClientAction }
  /** From the claim guard: discard the reply streamed by the last model call, optionally replacing it with `text`. */
  | { type: "retract"; text?: string };
