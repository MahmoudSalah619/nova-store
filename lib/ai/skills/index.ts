import { orderManagement } from "./order-management";
import { productAnalysis } from "./product-analysis";
import { refundManagement } from "./refund-management";
import type { Skill } from "./types";

/**
 * Every skill the assistant can load. To add one, write a file like order-management.ts and list it here.
 * Skills must stay inside the store's scope: the scope guard still refuses anything else.
 */
export const SKILLS: readonly Skill[] = [orderManagement, refundManagement, productAnalysis];

export const SKILL_NAMES = SKILLS.map((s) => s.name) as [string, ...string[]];

export function getSkill(name: string): Skill | undefined {
  return SKILLS.find((s) => s.name === name);
}

/** The short list that goes in the system prompt. */
export const SKILL_CATALOG = SKILLS.map((s) => `- ${s.name}: ${s.description}`).join("\n");
