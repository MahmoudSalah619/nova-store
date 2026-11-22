import { tool } from "langchain";
import { z } from "zod";
import { SKILL_NAMES, getSkill } from "../skills";
import { result, status, type Runtime } from "./shared";

/** Returns a skill's full playbook. The model sees only names and one-line descriptions until it calls this. */
export const loadSkill = tool(
  ({ name }, runtime: Runtime) => {
    const skill = getSkill(name);
    if (!skill) return result({ error: "unknown_skill", available: SKILL_NAMES });
    status(runtime, "Getting ready…");
    return skill.instructions;
  },
  {
    name: "load_skill",
    description:
      "Load the step-by-step playbook for a kind of request (see the Skills list in your instructions). " +
      "Call it before starting a matching task, then follow it. Load each skill at most once per reply.",
    schema: z.object({ name: z.enum(SKILL_NAMES).describe("The skill to load") }),
  },
);

export const skillTools = [loadSkill];
