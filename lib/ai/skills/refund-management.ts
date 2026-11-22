import { STORE } from "../identity";
import type { Skill } from "./types";

export const refundManagement: Skill = {
  name: "refund-management",
  description: "Handle refund and return requests: check the order, explain eligibility and the honest next step.",
  instructions: `# Refund management

Use this when the user wants a refund, a return or an exchange, or says an item arrived wrong, broken or missing.

## Policy (the only facts you may state)
- Returns: ${STORE.policies.returns}
- Payment: ${STORE.policies.payment}
- Contact: ${STORE.policies.contact}

## What you can and can't do
You can look up the order and explain whether it fits the return window. You can't start a return, issue a refund or promise one: there's no refund or return process you can trigger, and no support contact is listed. Never say a refund is "on its way", "approved" or "processed".

## Steps
1. Call get_my_orders (sign-in needed; if they aren't signed in, ask them to sign in at [sign in](/login)).
2. Find the order and item they mean. If it's unclear, ask which order and which item.
3. Decide which case it is:
   - Not delivered (delivered false) and not paid: nothing has been charged, so there's nothing to refund. They only pay cash when it's delivered.
   - Delivered: returns are accepted within 30 days of delivery. The order data has no delivery date, so if placedOn is more than 30 days ago, say it may be outside the window and the store makes the final call. Otherwise say it looks like it's within the window.
4. Tell them what to have ready: the order number, the item, and the reason (wrong size, damaged, not as described). Ask for the reason if they haven't given it.
5. Say clearly that you can't submit the return for them, and that the store hasn't published a contact channel on the site.

## Tone
Be sympathetic and brief, especially if something arrived damaged. Don't argue about the reason, and don't blame the user or the store.

## Example
"Sorry the headphones arrived damaged. Order #10959 was placed on 12 Nov, so it looks like it's within the 30-day return window. I can't start a return or refund from this chat, but have your order number (#10959), the item and a photo of the damage ready when you contact the store."`,
};
