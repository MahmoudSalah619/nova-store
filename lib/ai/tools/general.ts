/**
 * General tools: store knowledge, navigation, arithmetic and time.
 * None of these call the store API.
 */
import { tool } from "langchain";
import { z } from "zod";
import { STORE, type PolicyTopic, type StorePage } from "../identity";
import { clientAction, result, type Runtime } from "./shared";

const policyTopics = Object.keys(STORE.policies) as [PolicyTopic, ...PolicyTopic[]];
const pageNames = Object.keys(STORE.pages) as [StorePage, ...StorePage[]];

export const getStoreInfo = tool(
  async ({ topic }) =>
    result({
      store: STORE.name,
      currency: STORE.currency,
      ...(topic ? { [topic]: STORE.policies[topic] } : { policies: STORE.policies }),
    }),
  {
    name: "get_store_info",
    description:
      "Get the store's own policies: payment, shipping, returns, account, orders, cart, contact. " +
      "Use this for any question about how shopping on the site works. Omit topic to get all policies.",
    schema: z.object({ topic: z.enum(policyTopics).optional() }),
  },
);

export const openPage = tool(
  async ({ page, productId }, runtime: Runtime) => {
    const path = page === "product" ? `/product/${productId}` : STORE.pages[page].path;
    if (page === "product" && !productId) return result({ error: "productId is required for page=product" });
    clientAction(runtime, { type: "navigate", page, path });
    return result({ opened: path });
  },
  {
    name: "open_page",
    description:
      "Open a page of the store in the user's browser. Use only when the user asks to go somewhere " +
      `(e.g. "take me to checkout", "show me my orders"). Pages: ${pageNames
        .map((p) => `${p} (${STORE.pages[p].description})`)
        .join("; ")}; product (one product page, needs productId).`,
    schema: z.object({
      page: z.enum([...pageNames, "product"]),
      productId: z.string().optional().describe("Required when page is 'product'."),
    }),
  },
);

export const calculate = tool(
  async ({ operation, a, b }) => {
    const value = {
      add: a + b,
      subtract: a - b,
      multiply: a * b,
      divide: b === 0 ? NaN : a / b,
      percent_of: (a / 100) * b,
      percent_change: a === 0 ? NaN : ((b - a) / a) * 100,
    }[operation];
    if (!Number.isFinite(value)) return result({ error: "Not a valid calculation (division by zero?)" });
    return result({ operation, a, b, result: Math.round(value * 100) / 100 });
  },
  {
    name: "calculate",
    description:
      "Exact arithmetic for shopping questions: totals for several items, savings, splitting a price. " +
      "percent_of = a% of b. percent_change = change from a to b, in %. Use instead of doing math in your head.",
    schema: z.object({
      operation: z.enum(["add", "subtract", "multiply", "divide", "percent_of", "percent_change"]),
      a: z.number(),
      b: z.number(),
    }),
  },
);

export const getCurrentTime = tool(
  async () =>
    result({
      now: new Date().toLocaleString("en-US", {
        timeZone: "Africa/Cairo",
        dateStyle: "full",
        timeStyle: "short",
      }),
      timeZone: "Africa/Cairo",
    }),
  {
    name: "get_current_time",
    description: "The current date and time in Egypt. Use for questions like 'how long ago did I order'.",
    schema: z.object({}),
  },
);

export const generalTools = [getStoreInfo, openPage, calculate, getCurrentTime];
