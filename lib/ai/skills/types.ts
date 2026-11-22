/**
 * A skill is a playbook the agent loads only when a request needs it (progressive disclosure):
 * the system prompt lists each skill's name and description, and the full instructions arrive
 * through the load_skill tool. This keeps the always-on prompt short and each playbook detailed.
 */
export type Skill = {
  /** kebab-case id the model passes to load_skill */
  name: string;
  /** One line shown in the system prompt so the model knows when to load it */
  description: string;
  /** The full playbook, returned by load_skill */
  instructions: string;
};
