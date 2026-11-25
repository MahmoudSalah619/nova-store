import { AIMessage, createMiddleware, HumanMessage, ToolMessage } from "langchain";

/**
 * Stops the model from running the same lookup again and again in one turn.
 *
 * Seen in testing: a model browsed a category, didn't find trousers in the first page of results, and
 * repeated the identical search until it hit the model-call limit, so the user got no answer. Catalog data
 * doesn't change within a turn, so a repeat can't help: instead of running it, the model is told to answer
 * with what it has or search differently.
 *
 * Only read-only catalog tools are covered. Cart, wishlist and account tools can legitimately be called
 * again after a change.
 */
const CACHEABLE = new Set([
  "search_products",
  "get_product_details",
  "list_categories",
  "list_subcategories",
  "list_brands",
  "get_product_reviews",
  "get_store_info",
]);

/** Same arguments in any key order. */
const key = (name: string, args: unknown) =>
  name + JSON.stringify(args, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));

const REPEAT_NOTE =
  "You already ran this exact lookup in this turn and the result would be identical (see the earlier result). " +
  "Don't repeat it. Answer with what you have, or try a different search: for a product type, pass it as " +
  "query (e.g. query 'pants'), because titles and descriptions name the type more often than the category does.";

export const loopGuardMiddleware = () =>
  createMiddleware({
    name: "loopGuard",
    wrapToolCall: async (request, handler) => {
      const { toolCall, state } = request;
      if (!CACHEABLE.has(toolCall.name)) return handler(request);

      const messages = state.messages;
      let start = messages.length;
      while (start > 0 && !HumanMessage.isInstance(messages[start - 1])) start--;
      const turn = messages.slice(start);

      const answered = new Set(turn.filter((m) => ToolMessage.isInstance(m)).map((m) => (m as ToolMessage).tool_call_id));
      const wanted = key(toolCall.name, toolCall.args);
      const repeat = turn.some(
        (m) =>
          AIMessage.isInstance(m) &&
          (m.tool_calls ?? []).some((c) => c.id !== toolCall.id && c.id && answered.has(c.id) && key(c.name, c.args) === wanted),
      );
      if (!repeat) return handler(request);

      console.warn(`[chat] repeated ${toolCall.name} call skipped`);
      return new ToolMessage({ content: REPEAT_NOTE, tool_call_id: toolCall.id ?? "", name: toolCall.name });
    },
  });
