# Nova Assistant (AI)

A LangGraph agent (`@langchain/langgraph`, with LangChain models and tools) that answers questions about the Nova store only. It calls the LLM through OpenRouter (`@langchain/openrouter`), so any OpenRouter model with tool calling works.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `OPENROUTER_API_KEY` (get one at https://openrouter.ai/keys). Optionally set `CHAT_MODEL` to another OpenRouter model id.
3. Restart `npm run dev`. Without a key the chat button still shows, replies say the assistant is unavailable, and the server log explains why.

## How a message flows

```
ChatWidget (browser)                      components/chat/
  └─ POST /api/chat  { messages, cart }   app/api/chat/route.ts
       1. validate body, length and rate limit
       2. verify the sign-in token  ─────► Route API /auth/verifyToken
       3. graph.stream()  ──────────────► agent.ts  (LangGraph StateGraph)
            guard ── out of scope ──► "denied" event, fixed reply from identity.ts
              └─► agent ⇄ tools        model call with tools / LangGraph ToolNode
                    └─ over the limits ─► finish   final reply without tools
            └─ tools call the store API, write status + actions
  ◄── NDJSON events: text | status | action | denied | error | done
  └─ applies actions (cart, wishlist refresh, navigation)
```

## Files

| File | What it owns |
|---|---|
| `config.ts` | Model, fallback models, effort, limits (calls per turn, message size, rate limit), feature switches. |
| `model.ts` | Creates the chat model (OpenRouter). The only file that knows the provider. |
| `identity.ts` | Store facts and policies, page list, and the fixed out-of-scope reply. **Edit policies here.** |
| `prompt.ts` | The agent's system prompt and the scope-guard prompt. |
| `scope-guard.ts` | Layer 1 of scope enforcement: the classifier the graph's `guard` node runs. |
| `agent.ts` | The LangGraph graph: guard → agent ⇄ tools → finish, call limits, live page state. |
| `context.ts` | Per-request data tools can read (token, verified user, cart). Never sent to the model. |
| `events.ts` | The stream protocol and the allow-list of browser actions. |
| `tools/general.ts` | Store info, open a page, calculator, current time. |
| `tools/catalog.ts` | Public API: products, categories, subcategories, brands, reviews. |
| `tools/account.ts` | Signed-in API: account status, wishlist (read/add/remove), orders, addresses. |
| `tools/cart.ts` | The browser cart: view, add, change quantity, remove. |
| `tools/shared.ts` | Helpers: authed API calls, error wrapping, product summaries, status/actions. |
| `tools/skills.ts` | `load_skill`: returns a skill's full playbook. |
| `skills/` | The playbooks: `order-management`, `refund-management`, `product-analysis`. |

## Skills

Skills are playbooks for request types that need more than a tool call: which tools to use in what order, how to read the data, what to say, and what not to promise. The system prompt lists only each skill's name and one-line description. When a request matches, the agent calls `load_skill` and gets the full instructions for that reply. That keeps the always-on prompt short while each playbook can be detailed.

| Skill | Used for |
| --- | --- |
| `order-management` | "Where is my order?", order history, what was charged. Explains status, payment and items from `get_my_orders`. |
| `refund-management` | Refunds, returns, damaged or wrong items. Checks the order against the 30-day policy and says plainly that it can't start a refund (the API has no refund endpoint). |
| `product-analysis` | "Which is better?", "best X under Y". Compares 2–4 products on price, rating (and how many ratings), stock and reviews, then recommends one. |

To add a skill: write `skills/<name>.ts` exporting a `Skill`, then add it to `SKILLS` in `skills/index.ts`. Skills must stay inside the store's scope; the scope guard still refuses anything else (a general code-review skill was left out for that reason).

## Staying on topic

1. **Scope guard** (`scope-guard.ts`): a separate call that only answers IN_SCOPE or OUT_OF_SCOPE, with the last few turns for context. If it's OUT_OF_SCOPE, the user gets the fixed reply from `identity.ts` and the agent never runs.
2. **System prompt** (`prompt.ts`): the agent refuses anything outside the store with the same fixed reply, never changes persona, and treats tool results (product text, reviews) as data, not instructions.
3. **Tools**: the agent can only do what its tools allow, and the browser only applies actions listed in `events.ts`.

## Keeping claims honest

Models sometimes say "Done!" without calling the tool, especially when earlier messages claimed a change. Two things stop that:

- **Live state:** the graph's `agent` node appends a `<page_state>` note with the real cart and sign-in status to the latest user message, so the model doesn't rely on the conversation.
- **Receipts:** every action the page actually applies shows as a green line under the reply (e.g. "Removed … from cart"). The page writes these, not the model; any "(Applied: …)" text the model writes itself is stripped. Receipts are sent back in later turns so the model can tell real changes from claims.

## What the agent can't do (on purpose)

- Sign in, register, or change passwords or profile details. Credentials don't belong in a chat.
- Place orders or start a card checkout. Money moves only from `/checkout`.
- Write, edit or delete reviews.
- Call `GET /users` or `GET /orders`. Those endpoints return every customer's data.

## Adding a tool

1. Add it to the right file in `tools/` with `tool(fn, { name, description, schema })`.
2. Wrap API calls in `safely()` so failures come back as a readable result.
3. If it changes something in the browser, add a variant to `ClientAction` in `events.ts` and handle it in `components/chat/use-chat.ts`.
4. Add it to that file's exported array. `tools/index.ts` collects them all.
