import { accountTools } from "./account";
import { cartTools } from "./cart";
import { catalogTools } from "./catalog";
import { generalTools } from "./general";
import { graphTools } from "./graph";
import { skillTools } from "./skills";

/** The agent's tools, grouped by where their data comes from. */
export const toolGroups = {
  skills: skillTools,
  general: generalTools,
  catalog: catalogTools,
  graph: graphTools,
  account: accountTools,
  cart: cartTools,
};

/** Every tool the agent can call. */
export const tools = Object.values(toolGroups).flat();
