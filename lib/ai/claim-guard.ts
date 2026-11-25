import { AIMessage, createMiddleware, HumanMessage, ToolMessage, type BaseMessage } from "langchain";
import type { ToolStreamPayload } from "./events";

/**
 * Checks the model's replies before they stand. It's named for its main job, false change claims:
 *
 * - A final reply (no tool calls) that claims a cart or wishlist change no tool made, names a product no
 *   successful tool call changed, or states a count the tools didn't produce is a false claim. Prompt rules
 *   alone weren't enough: with a few earlier "Done, added it!" replies in the history, models copy the
 *   pattern and skip the tool call.
 * - A final reply in Arabic script breaks the English-only rule (history full of Arabic replies pulls models back).
 * - Text written alongside a tool call (narration, or a claim before the tool has run) is never kept.
 *
 * The API route holds each model call's text until this guard's verdict, so rejected text is never shown.
 * On a false claim or wrong language, the text is dropped and the model is asked once more
 * with a correction. If the second answer still claims a false change, a fixed honest reply replaces it.
 */

/** Tools that change the cart or wishlist. Add any new tool that does (open_page only navigates, so it isn't here). */
const CHANGE_TOOLS = new Set([
  "add_to_cart",
  "update_cart_quantity",
  "remove_from_cart",
  "add_to_wishlist",
  "remove_from_wishlist",
]);

/**
 * Phrases that say a change already happened. Replies are in English (see the prompt's Language section);
 * a few Egyptian Arabic and Franco-Arabic forms are included in case the model slips.
 */
/** "I did something": every product these sentences name must have been changed by a tool. */
const ACTION_PATTERNS: RegExp[] = [
  /\bi(?:'ve| have)?\s+(?:just\s+|now\s+|also\s+)?(?:added|updated|set|changed|removed|deleted|saved|increased|reduced|decreased|adjusted|put|placed|moved)\b/i,
  /\b(?:has|have|was|were)\s+(?:been\s+)?(?:added|updated|set|changed|removed|deleted|saved|increased|reduced|decreased|adjusted)\b/i,
  /^\W*(?:done|all set|updated|added|removed|deleted|saved|changed|increased|reduced)\b/im,
  /(?:^|\s)(?:تم|ضفت|ضفتلك|ظبطت|ظبطتلك|شلت|شيلت|غيرت|عدلت)(?:\s|$|[،.!؟])/,
  /\b(?:defto|deftlak|deftlk|zabatt|zabtt|3mlt|3amalt|shelt)\b/i,
];
/** "Here's how things are now": implies a change, but can list products that weren't touched (a cart summary). */
const STATE_PATTERNS: RegExp[] = [/\b(?:is|are)\s+now\s+(?:in|on|set)\b/i, /\byour (?:cart|wishlist) now\b/i];

const claimsAction = (text: string) => ACTION_PATTERNS.some((p) => p.test(text));
export const claimsChange = (text: string) => claimsAction(text) || STATE_PATTERNS.some((p) => p.test(text));

/** Splits a reply into sentences and lines, so a claim can be tied to the products it names. */
const sentences = (text: string) => text.split(/\n+|(?<=[.!?؟])\s+/).filter((s) => s.trim());

/** Product ids linked as [title](/product/<id>) in the sentences that claim an action. */
export function claimedProductIds(text: string) {
  const ids = new Set<string>();
  for (const s of sentences(text)) {
    if (!claimsAction(s)) continue;
    for (const m of s.matchAll(/\/product\/([A-Za-z0-9_-]+)/g)) ids.add(m[1]);
  }
  return ids;
}

/**
 * What change tools did successfully since the latest user message: whether any succeeded, and the
 * product ids they changed (taken from the tool call's own arguments, not from the model's reply).
 */
export function changesThisTurn(messages: BaseMessage[]) {
  let start = messages.length;
  while (start > 0 && !HumanMessage.isInstance(messages[start - 1])) start--;
  const turn = messages.slice(start);

  const productOfCall = new Map<string, string | undefined>();
  for (const m of turn) {
    if (!AIMessage.isInstance(m)) continue;
    for (const call of m.tool_calls ?? []) {
      if (call.id && CHANGE_TOOLS.has(call.name)) productOfCall.set(call.id, call.args?.productId);
    }
  }

  let any = false;
  const productIds = new Set<string>();
  /** Quantities the tools really produced, per product: how many were added and the new total in the cart. */
  const quantities = new Map<string, Set<number>>();
  for (const m of turn) {
    if (!ToolMessage.isInstance(m) || !m.name || !CHANGE_TOOLS.has(m.name) || isError(m)) continue;
    any = true;
    const id = productOfCall.get(m.tool_call_id);
    if (!id) continue;
    productIds.add(id);
    const data = parse(m.text);
    // add_to_cart returns { added, newQuantity }; update_cart_quantity returns { quantity }.
    for (const key of ["added", "newQuantity", "quantity"]) {
      const n = data?.[key];
      if (typeof n === "number") {
        if (!quantities.has(id)) quantities.set(id, new Set());
        quantities.get(id)!.add(n);
      }
    }
  }
  return { any, productIds, quantities };
}

function parse(text: string): Record<string, unknown> | null {
  try {
    const data = JSON.parse(text);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const NUM = String.raw`(\d+|one|two|three|four|five|six|seven|eight|nine|ten)`;

/** Ways a reply states an item count: "10 ×", "to 10", "added 3", "2 more", "now have 4", "quantity is 5". */
const QUANTITY_PATTERNS = [
  new RegExp(String.raw`\b${NUM}\s*(?:×|x\b)`, "gi"),
  new RegExp(String.raw`\bto\s+${NUM}\b`, "gi"),
  new RegExp(String.raw`\b(?:added|removed|put|set)\s+${NUM}\b`, "gi"),
  new RegExp(String.raw`\b${NUM}\s+(?:more|units?|pieces?|pcs|items?|pairs?|of)\b`, "gi"),
  new RegExp(String.raw`\b(?:now\s+(?:have|has|at|contains)|quantity(?:\s+(?:is|of))?(?:\s+now)?(?:\s+is)?)\s+${NUM}\b`, "gi"),
];

/**
 * Item counts stated in one sentence. Product titles, prices, percentages and ratings are removed first,
 * so "Dell Inspiron 15", "EGP 2,199", "30%" and "4.3/5" aren't read as quantities.
 */
const withoutPrices = (text: string) => text.replace(/\b(?:EGP|LE|E£)\s*[\d,.]+|[\d,.]+\s*(?:EGP|LE)\b/gi, " ");

export function statedQuantities(sentence: string) {
  const clean = withoutPrices(sentence.replace(/\[[^\]]*\]\([^)]*\)/g, " item "))
    // Limits and stock: "up to 10", "maximum of 10", "the limit is 10", "only 3 left", "5 in stock".
    .replace(/\b(?:up\s+to|max(?:imum)?(?:\s+of)?|limit(?:\s+(?:of|is))?)\s+\d+/gi, " ")
    .replace(/\b\d+\s+(?:(?:units?|pieces?|items?)\s+)?(?:left|in\s+stock|available)\b/gi, " ")
    .replace(/\d+(?:\.\d+)?\s*(?:%|\/\s*5|stars?|ratings?|reviews?)/gi, " ");
  const found: number[] = [];
  for (const p of QUANTITY_PATTERNS) {
    for (const m of clean.matchAll(p)) found.push(WORD_NUMBERS[m[1].toLowerCase()] ?? Number(m[1]));
  }
  return found;
}

export const changedThisTurn = (messages: BaseMessage[]) => changesThisTurn(messages).any;

function isError(m: ToolMessage) {
  return m.status === "error" || Boolean(parse(m.text) && "error" in parse(m.text)!);
}

const linkedIds = (sentence: string) => [...sentence.matchAll(/\/product\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]);

/**
 * A false claim is a reply that:
 * - says something changed when nothing did,
 * - says a product changed when no tool changed that product (one item was added, the reply claims two), or
 * - states a count for a changed product that the tools didn't produce (asked for 5, the cap allowed 3,
 *   the reply says "added 5").
 */
export function isFalseClaim(text: string, messages: BaseMessage[]) {
  if (!claimsChange(text)) return false;
  const done = changesThisTurn(messages);
  if (!done.any) return true;
  if ([...claimedProductIds(text)].some((id) => !done.productIds.has(id))) return true;

  // Quantity check, on sentences that claim a change or state where things are now ("You now have 2").
  for (const s of sentences(text)) {
    if (!claimsChange(s) && !/\bnow\b/i.test(s)) continue;
    const sentenceLinks = linkedIds(s).length;
    // A sentence naming several products ("10 × [A] and 2 × [B]", "set [A] to 10 and [B] to 5") is split
    // into parts so each count is matched to the product next to it.
    const parts = sentenceLinks > 1 ? withoutPrices(s).split(/[,;]|\band\b|\s[-–]\s/) : [s];
    for (const part of parts) {
      const stated = statedQuantities(part);
      if (!stated.length) continue;
      // The products this part is about: the ones it links, or else everything changed this turn
      // ("Done, it's now 10."). A product no tool changed is just a summary, not checked here.
      const linked = linkedIds(part);
      if (sentenceLinks && !linked.length) continue;
      const about = linked.length ? linked.filter((id) => done.productIds.has(id)) : [...done.productIds];
      if (!about.length) continue;
      const real = new Set(about.flatMap((id) => [...(done.quantities.get(id) ?? [])]));
      if (!real.size) continue; // e.g. wishlist changes have no counts
      if (stated.some((n) => !real.has(n))) return true;
    }
  }
  return false;
}

const isFalseFinalReply = (response: AIMessage, messages: BaseMessage[]) =>
  !response.tool_calls?.length && isFalseClaim(response.text, messages);

const CORRECTION =
  "[Automatic check, not from the user] Your last reply claims a cart or wishlist change " +
  "that doesn't match what the tools did in this turn: no tool made that change, it names a product no tool " +
  "changed, or it states a quantity the tool results don't show. If the user asked for a change that hasn't " +
  "happened, call the right tool now. Otherwise, reply again claiming only the changes and quantities the tool " +
  "results confirm (if fewer were added than asked, say so and why), and say plainly what the current state is. " +
  "Don't mention this check.";

/**
 * Replies must be in English (see the prompt's Language section), but a chat history full of Arabic replies
 * pulls some models back into Arabic. Store data is in English, so Arabic letters in a reply mean the model
 * switched language.
 */
export const isNotEnglish = (text: string) => (text.match(/[؀-ۿ]/g)?.length ?? 0) >= 3;

const LANGUAGE_CORRECTION =
  "[Automatic check, not from the user] Your last reply wasn't in English. Write the same reply again in plain " +
  "English, keeping the same facts and links, with no emojis and no \"(Applied: …)\" line. Don't mention this check.";

export const HONEST_FALLBACK =
  "Sorry, I couldn't make that change. Please try again, or update it yourself on [your cart](/cart).";

export const claimGuardMiddleware = () =>
  createMiddleware({
    name: "claimGuard",
    wrapModelCall: async (request, handler) => {
      // The API route holds each model call's text until it hears the verdict here, so rejected text is never
      // shown: "keep" releases it, "drop" discards it (and can send a fixed replacement instead).
      const verdict = (keep: boolean, replacement?: string) =>
        request.runtime.writer?.({ type: "review", keep, replacement } satisfies ToolStreamPayload);
      const first = await handler(request);
      if (!AIMessage.isInstance(first)) return first;

      // Text written alongside a tool call is either narration ("Let me check…") or a claim made before the
      // tool has run ("Done, added it!"), which may still fail. Neither belongs in the answer: drop it.
      // The reply after the tool results says what really happened.
      if (first.tool_calls?.length) {
        verdict(false);
        return first;
      }
      const falseClaim = isFalseFinalReply(first, request.messages);
      const notEnglish = isNotEnglish(first.text);
      if (!falseClaim && !notEnglish) {
        verdict(true);
        return first;
      }

      verdict(false);
      console.warn(`[chat] reply rejected (${[falseClaim && "false claim", notEnglish && "not English"].filter(Boolean).join(", ")}); asking the model again`);

      const corrections = [falseClaim && CORRECTION, notEnglish && LANGUAGE_CORRECTION].filter(Boolean).join("\n\n");
      const second = await handler({
        ...request,
        messages: [...request.messages, first, new HumanMessage(corrections)],
      });
      if (!AIMessage.isInstance(second)) return second;
      // The retry called a tool to make the change for real: same rule as above, its text is dropped.
      if (second.tool_calls?.length) {
        verdict(false);
        return second;
      }
      // A second reply still in Arabic is let through: an answer in the wrong language beats no answer.
      if (!isFalseFinalReply(second, request.messages)) {
        verdict(true);
        return second;
      }

      // This reply doesn't come from a model call, so the route sends it as the replacement.
      verdict(false, HONEST_FALLBACK);
      console.warn("[chat] reply still claimed a change; sending the fixed reply");
      return new AIMessage({ content: HONEST_FALLBACK, id: second.id });
    },
  });
