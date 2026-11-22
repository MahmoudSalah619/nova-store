/**
 * Cart tools. The site's cart lives in the user's browser (localStorage), not in the API cart,
 * so these tools read the snapshot the widget sends and return actions the widget applies.
 * Prices always come from the store API, never from the model or the browser.
 */
import { tool } from "langchain";
import { z } from "zod";
import { getProduct } from "@/lib/api";
import { toCartProduct } from "@/lib/cart";
import { clientAction, result, safely, status, type Runtime } from "./shared";

const MAX_QTY = 10;

export const viewCart = tool(
  async (_input, runtime: Runtime) => {
    const cart = runtime.context?.cart ?? [];
    return result({
      items: cart.map((l) => ({ productId: l.id, title: l.title, quantity: l.quantity, price: l.price, lineTotal: l.price * l.quantity })),
      itemCount: cart.reduce((n, l) => n + l.quantity, 0),
      itemsTotal: cart.reduce((n, l) => n + l.price * l.quantity, 0),
      note: "Shipping and tax, if any, are set by the store when the order is placed.",
      cartUrl: "/cart",
    });
  },
  {
    name: "view_cart",
    description: "What's in the user's cart right now, with quantities and the items total.",
    schema: z.object({}),
  },
);

export const addToCart = tool(
  ({ productId, quantity }, runtime: Runtime) =>
    safely(async () => {
      status(runtime, "Adding to your cart…");
      const product = await getProduct(productId);
      if (!product) return result({ error: "not_found", message: "No product with that id." });
      if (product.quantity <= 0) return result({ error: "out_of_stock", message: `${product.title} is out of stock.` });
      const inCart = runtime.context?.cart.find((l) => l.id === productId)?.quantity ?? 0;
      const allowed = Math.min(quantity, MAX_QTY - inCart, product.quantity - inCart);
      if (allowed <= 0) return result({ error: "limit", message: `The cart already has the maximum of ${product.title}.` });
      clientAction(runtime, { type: "cart_add", product: toCartProduct(product), quantity: allowed });
      return result({ added: allowed, title: product.title, newQuantity: inCart + allowed, cartUrl: "/cart" });
    }),
  {
    name: "add_to_cart",
    description: `Add a product to the user's cart. Only when the user asks. Max ${MAX_QTY} of one product.`,
    schema: z.object({ productId: z.string(), quantity: z.number().int().min(1).max(MAX_QTY).default(1) }),
  },
);

export const updateCartQuantity = tool(
  async ({ productId, quantity }, runtime: Runtime) => {
    const line = runtime.context?.cart.find((l) => l.id === productId);
    if (!line) return result({ error: "not_in_cart", message: "That product isn't in the cart." });
    clientAction(runtime, { type: "cart_set_quantity", productId, quantity });
    return result({ title: line.title, quantity });
  },
  {
    name: "update_cart_quantity",
    description: `Set how many of a product are in the cart (1-${MAX_QTY}). Only when the user asks.`,
    schema: z.object({ productId: z.string(), quantity: z.number().int().min(1).max(MAX_QTY) }),
  },
);

export const removeFromCart = tool(
  async ({ productId }, runtime: Runtime) => {
    const line = runtime.context?.cart.find((l) => l.id === productId);
    if (!line) return result({ error: "not_in_cart", message: "That product isn't in the cart." });
    clientAction(runtime, { type: "cart_remove", productId });
    return result({ removed: line.title });
  },
  {
    name: "remove_from_cart",
    description: "Remove a product from the cart. Only when the user asks.",
    schema: z.object({ productId: z.string() }),
  },
);

export const cartTools = [viewCart, addToCart, updateCartQuantity, removeFromCart];
