// No imports here — safe to use in browser components.

/**
 * Models the admin can pick. Prices are USD per 1M tokens, from OpenAI's pricing page (Nov 2026).
 * Update here if OpenAI changes prices.
 */
export const AI_MODELS = {
  "gpt-6-luna": {
    label: "GPT-6 Luna — cheapest",
    note: "Lowest cost. Fine for practice chats; writing is plainer.",
    input: 0.1,
    cached: 0.01,
    output: 0.5,
    noneEffort: true,
  },
  "gpt-6.1-terra": {
    label: "GPT-6.1 Terra — recommended",
    note: "Clear, natural writing at a low price. Best balance for resumes and outreach.",
    input: 1.0,
    cached: 0.05,
    output: 5.0,
    noneEffort: true,
  },
  "gpt-6.2-sol": {
    label: "GPT-6.2 Sol — higher quality",
    note: "Smarter, about 2× Terra's cost.",
    input: 2.0,
    cached: 0.1,
    output: 10.0,
    noneEffort: false,
  },
} as const;

export type ModelId = keyof typeof AI_MODELS;
export const DEFAULT_MODEL: ModelId = "gpt-6.1-terra";

export function isModelId(m: string): m is ModelId {
  return m in AI_MODELS;
}

