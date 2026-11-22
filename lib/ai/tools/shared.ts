import type { ToolRuntime } from "@langchain/core/tools";
import type { Product } from "@/lib/api";
import { discountPercent, salePrice } from "@/lib/format";
import { API_BASE } from "@/lib/types";
import type { ChatContext } from "../context";
import type { ClientAction, ToolStreamPayload } from "../events";

export type Runtime = ToolRuntime<unknown, ChatContext>;

/** Tool results go back to the model as compact JSON. */
export const result = (data: unknown) => JSON.stringify(data);

/** Show a short progress line in the chat while a tool runs. */
export function status(runtime: Runtime, label: string) {
  runtime.writer?.({ type: "status", label } satisfies ToolStreamPayload);
}

/** Ask the browser to do something (see ClientAction for the allow-list). */
export function clientAction(runtime: Runtime, action: ClientAction) {
  runtime.writer?.({ type: "action", action } satisfies ToolStreamPayload);
}

export const NOT_SIGNED_IN = result({
  error: "not_signed_in",
  message: "The user isn't signed in. Ask them to sign in at /login, then try again.",
});

/** Call an endpoint that needs the user's token. The token comes from server-side context, never from the model. */
export async function accountApi<T>(runtime: Runtime, path: string, init: RequestInit = {}): Promise<T> {
  const token = runtime.context?.token;
  if (!token) throw new NotSignedInError();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", token, ...init.headers },
    cache: "no-store",
  });
  if (res.status === 401) throw new NotSignedInError();
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? body?.errors?.msg ?? `Store API error ${res.status}`);
  }
  return res.json();
}

export class NotSignedInError extends Error {}

/** Wrap a tool body so failures become a readable result instead of crashing the turn. */
export async function safely(fn: () => Promise<string>): Promise<string> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof NotSignedInError) return NOT_SIGNED_IN;
    return result({ error: "tool_failed", message: err instanceof Error ? err.message : "Unknown error" });
  }
}

/** The fields the model needs to talk about a product, without images or long text. */
export function productSummary(p: Product) {
  const off = discountPercent(p);
  return {
    id: p._id,
    title: p.title,
    url: `/product/${p._id}`,
    brand: p.brand?.name ?? null,
    category: p.category.name,
    subcategory: p.subcategory[0]?.name ?? null,
    price: salePrice(p),
    ...(off > 0 ? { originalPrice: p.price, discountPercent: off } : {}),
    rating: p.ratingsAverage,
    ratingsCount: p.ratingsQuantity,
    inStock: p.quantity > 0,
    stock: p.quantity,
    sold: p.sold,
  };
}
