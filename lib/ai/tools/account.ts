/**
 * Account tools: store API endpoints that need the signed-in user's token.
 * Wishlist (read + add/remove), orders (read) and saved addresses (read).
 *
 * Deliberately NOT exposed: sign-in/sign-up, password and profile changes (credentials don't belong in chat),
 * placing orders or checkout sessions (money moves only from the checkout page),
 * review writes, and the API's GET /users and GET /orders (they expose every customer's data).
 */
import { tool } from "langchain";
import { z } from "zod";
import type { Order, Product } from "@/lib/types";
import { API_BASE } from "@/lib/types";
import { accountApi, clientAction, NOT_SIGNED_IN, productSummary, result, safely, status, type Runtime } from "./shared";

export const getAccountStatus = tool(
  async (_input, runtime: Runtime) => {
    const user = runtime.context?.user;
    return result(user ? { signedIn: true, name: user.name } : { signedIn: false, signInUrl: "/login" });
  },
  {
    name: "get_account_status",
    description: "Whether the user is signed in, and their first name if so.",
    schema: z.object({}),
  },
);

export const getMyWishlist = tool(
  (_input, runtime: Runtime) =>
    safely(async () => {
      status(runtime, "Opening your wishlist…");
      const json = await accountApi<{ count: number; data: Product[] }>(runtime, "/wishlist");
      return result({ count: json.count, products: json.data.map(productSummary) });
    }),
  {
    name: "get_my_wishlist",
    description: "Products saved on the signed-in user's wishlist.",
    schema: z.object({}),
  },
);

export const addToWishlist = tool(
  ({ productId }, runtime: Runtime) =>
    safely(async () => {
      status(runtime, "Saving to your wishlist…");
      const json = await accountApi<{ message: string; data: string[] }>(runtime, "/wishlist", {
        method: "POST",
        body: JSON.stringify({ productId }),
      });
      clientAction(runtime, { type: "wishlist_changed" });
      return result({ ok: true, wishlistSize: json.data.length });
    }),
  {
    name: "add_to_wishlist",
    description: "Save a product to the signed-in user's wishlist. Only when the user asks.",
    schema: z.object({ productId: z.string() }),
  },
);

export const removeFromWishlist = tool(
  ({ productId }, runtime: Runtime) =>
    safely(async () => {
      status(runtime, "Updating your wishlist…");
      const json = await accountApi<{ data: string[] }>(runtime, `/wishlist/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      clientAction(runtime, { type: "wishlist_changed" });
      return result({ ok: true, wishlistSize: json.data.length });
    }),
  {
    name: "remove_from_wishlist",
    description: "Remove a product from the signed-in user's wishlist. Only when the user asks.",
    schema: z.object({ productId: z.string() }),
  },
);

export const getMyOrders = tool(
  ({ limit }, runtime: Runtime) =>
    safely(async () => {
      const user = runtime.context?.user;
      if (!user) return NOT_SIGNED_IN;
      status(runtime, "Checking your orders…");
      // The user id comes from the token the API route verified, not from the model or the browser.
      const res = await fetch(`${API_BASE}/orders/user/${user.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Store API error ${res.status}`);
      const orders: Order[] = await res.json();
      const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return result({
        totalOrders: orders.length,
        ordersUrl: "/orders",
        orders: sorted.slice(0, limit).map((o) => ({
          orderNumber: o.id,
          placedOn: o.createdAt.slice(0, 10),
          total: o.totalOrderPrice,
          payment: o.paymentMethodType,
          paid: o.isPaid,
          delivered: o.isDelivered,
          city: o.shippingAddress?.city ?? null,
          items: o.cartItems.map((i) => ({ title: i.product.title, quantity: i.count, price: i.price })),
        })),
      });
    }),
  {
    name: "get_my_orders",
    description: "The signed-in user's orders, newest first, with items, totals, payment and delivery status.",
    schema: z.object({ limit: z.number().int().min(1).max(10).default(5) }),
  },
);

export const getMyAddresses = tool(
  (_input, runtime: Runtime) =>
    safely(async () => {
      status(runtime, "Checking your addresses…");
      const json = await accountApi<{ data: { name: string; details: string; city: string }[] }>(runtime, "/addresses");
      // Phone numbers are left out on purpose; the model doesn't need them.
      return result(json.data.map((a) => ({ label: a.name, details: a.details, city: a.city })));
    }),
  {
    name: "get_my_addresses",
    description: "Addresses saved on the signed-in user's account (read-only).",
    schema: z.object({}),
  },
);

export const accountTools = [getAccountStatus, getMyWishlist, addToWishlist, removeFromWishlist, getMyOrders, getMyAddresses];
