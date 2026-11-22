import { accountTools } from "./account";
import { cartTools } from "./cart";
import { catalogTools } from "./catalog";
import { generalTools } from "./general";

/** Every tool the agent can call, grouped by where its data comes from. */
export const tools = [...generalTools, ...catalogTools, ...accountTools, ...cartTools];
