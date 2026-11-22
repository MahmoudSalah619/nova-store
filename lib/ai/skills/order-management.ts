import { STORE } from "../identity";
import type { Skill } from "./types";

export const orderManagement: Skill = {
  name: "order-management",
  description: "Find the user's orders and explain them: status, items, totals, payment and delivery.",
  instructions: `# Order management

Use this when the user asks about their orders: "where is my order", "what did I buy", "was I charged", "how much was my last order", "show my orders".

## Steps
1. Call get_my_orders. If it says the user isn't signed in, ask them to sign in at [sign in](/login) and stop.
2. Work out which order they mean:
   - "my order" / "my last order": the newest one (the list is newest first).
   - An order number ("#10959"): match orderNumber. If it isn't in the list, call get_my_orders again with limit 10. If it's still missing, say you can't find that order on their account.
   - A product ("the shoes I ordered"): find the order whose items include it. If several match, list them briefly and ask which one.
   - No orders: say they haven't placed any yet and point to [the shop](/shop).
3. Explain the order in plain words, using only the fields the tool returned.

## What the fields mean
- orderNumber: show it as "#10959".
- placedOn: the date the order was placed.
- payment "cash": cash on delivery. ${STORE.policies.payment}
- paid false and delivered false: placed and waiting to be delivered. Nothing has been paid yet; they pay the courier on delivery.
- delivered true: delivered. paid true: the cash payment was recorded.
- total: the full amount of the order in ${STORE.currency}, including anything the store added. Show it as "${STORE.currency} 5,998".
- items: title × quantity at the price each.

## Format
Start with the status in one sentence ("Order #10959 from 12 Nov hasn't been delivered yet, and you'll pay in cash when it arrives."), then a short list of items, then the total. Link [your orders](/orders) at the end.
For "show my orders", give one line per order: number, date, total, status. At most 5 unless they ask for more.

## Limits (say these plainly if asked)
- There is no tracking number, courier name or delivery date in the order data. Don't guess an arrival time.
- You can't cancel, change or re-send an order, or change its address. The site has no way to do that online.
- For a refund or return, load the refund-management skill.`,
};
