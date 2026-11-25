/**
 * Chat length limits, shared by the API route and the chat widget (so no env vars or server-only code here).
 * Each exchange is two messages: the user's and the assistant's reply.
 */
export const CHAT_LIMITS = {
  /** Most messages one chat can hold. The widget stops new messages here; the API rejects longer histories. */
  maxMessages: 20,
  /** Warn the user once this many (or fewer) messages are left for them to send. */
  warnWhenTurnsLeft: 2,
} as const;

/** How many more messages the user can send in this chat. `count` is the messages already in it. */
export const turnsLeft = (count: number) => Math.max(0, Math.floor((CHAT_LIMITS.maxMessages - count) / 2));

export const LIMIT_REACHED_TEXT = "This chat has reached its length limit. Start a new chat to keep going.";
