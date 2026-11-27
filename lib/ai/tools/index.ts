import { accountTools } from "./account";
import { cartTools } from "./cart";
import { catalogTools } from "./catalog";
import { generalTools } from "./general";
import { graphTools } from "./graph";
import { skillTools } from "./skills";

/** Every tool the agent can call, grouped by where its data comes from. */
export const tools = [...skillTools, ...generalTools, ...catalogTools, ...graphTools, ...accountTools, ...cartTools];
