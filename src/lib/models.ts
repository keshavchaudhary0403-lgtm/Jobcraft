// No imports here - safe to use in browser components.

/**
 * Models the admin can pick. Prices are USD per 1M tokens, from OpenAI's pricing page (Nov 2026).
 * Update here if OpenAI changes prices.
 */
export type Provider = "openai" | "anthropic";
export const PROVIDERS: Record<Provider, { label: string; short: string; key: string }> = {
  openai: { label: "ChatGPT (OpenAI)", short: "ChatGPT", key: "OPENAI_API_KEY" },
  anthropic: { label: "Claude (Anthropic)", short: "Claude", key: "ANTHROPIC_API_KEY" },
};

/**
 * Models the admin can pick. Prices are USD per 1M tokens (Nov 2026).
 * `cached` = cache read price, `cacheWrite` = cache write price (Claude only).
 * Update here if a provider changes prices.
 */
export const AI_MODELS = {
  "gpt-6-luna": {
    provider: "openai",
    label: "GPT-6 Luna - cheapest",
    note: "Lowest cost. Fine for practice chats; writing is plainer.",
    input: 0.1,
    cached: 0.01,
    cacheWrite: 0.1,
    output: 0.5,
    noneEffort: true,
  },
  "gpt-6.1-terra": {
    provider: "openai",
    label: "GPT-6.1 Terra - recommended",
    note: "Clear, natural writing at a low price. Best balance for resumes and outreach.",
    input: 1.0,
    cached: 0.05,
    cacheWrite: 1.0,
    output: 5.0,
    noneEffort: true,
  },
  "gpt-6.2-sol": {
    provider: "openai",
    label: "GPT-6.2 Sol - higher quality",
    note: "Smarter, about 2× Terra's cost.",
    input: 2.0,
    cached: 0.1,
    cacheWrite: 2.0,
    output: 10.0,
    noneEffort: false,
  },
  "claude-opus-5-5": {
    provider: "anthropic",
    label: "Claude Opus 5.5 - most capable",
    note: "Anthropic's strongest model. Best writing and judgement; about 4× Terra's cost.",
    input: 4.0,
    cached: 0.2,
    cacheWrite: 5.0,
    output: 20.0,
    noneEffort: false,
  },
  "claude-sonnet-5-5": {
    provider: "anthropic",
    label: "Claude Sonnet 5.5 - balanced",
    note: "Fast and strong at about half of Opus's cost.",
    input: 2.0,
    cached: 0.1,
    cacheWrite: 2.5,
    output: 10.0,
    noneEffort: false,
  },
  "claude-haiku-5-5": {
    provider: "anthropic",
    label: "Claude Haiku 5.5 - cheapest",
    note: "Lowest Claude cost. Quick, plainer writing. Prices go up for very long inputs.",
    input: 0.1,
    cached: 0.01,
    cacheWrite: 0.125,
    output: 0.5,
    noneEffort: false,
  },
} as const satisfies Record<string, { provider: Provider; label: string; note: string; input: number; cached: number; cacheWrite: number; output: number; noneEffort: boolean }>;

export type ModelId = keyof typeof AI_MODELS;
export const DEFAULT_MODEL: ModelId = "gpt-6.1-terra";

export function isModelId(m: string): m is ModelId {
  return m in AI_MODELS;
}

export const providerOf = (m: ModelId): Provider => AI_MODELS[m].provider;
/** The model each provider starts on when the admin switches to it. */
export const PROVIDER_DEFAULT: Record<Provider, ModelId> = { openai: "gpt-6.1-terra", anthropic: "claude-opus-5-5" };
/** Cheapest model of the same provider, for tiny background jobs (reading a job title from a JD). */
export const LIGHT_MODEL: Record<Provider, ModelId> = { openai: "gpt-6-luna", anthropic: "claude-haiku-5-5" };


/** Realistic voice (speech-to-speech) for interview practice. USD per 1M tokens (Nov 2026). */
export const REALTIME_MODEL = "gpt-realtime-2.1-mini";
export const REALTIME_PRICE = { textIn: 0.6, textOut: 2.4, audioIn: 10, audioOut: 20, cachedIn: 0.3 };
export const TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

export const VOICES = [
  { id: "marin", label: "Marin", note: "Warm, natural - recommended" },
  { id: "cedar", label: "Cedar", note: "Calm, deeper" },
  { id: "coral", label: "Coral", note: "Bright, friendly" },
  { id: "sage", label: "Sage", note: "Measured, professional" },
  { id: "ash", label: "Ash", note: "Confident, direct" },
] as const;
export type VoiceId = (typeof VOICES)[number]["id"];
export const isVoiceId = (v: string): v is VoiceId => VOICES.some((x) => x.id === v);

export type RealtimeUsage = {
  input_token_details?: { text_tokens?: number; audio_tokens?: number; cached_tokens?: number };
  output_token_details?: { text_tokens?: number; audio_tokens?: number };
};

/** Cost of one realtime response, from the usage block in `response.done`. */
export function realtimeCostUsd(u: RealtimeUsage) {
  const i = u.input_token_details ?? {};
  const o = u.output_token_details ?? {};
  const cached = Math.max(0, i.cached_tokens ?? 0);
  const audioIn = Math.max(0, (i.audio_tokens ?? 0) - cached);
  return (
    ((i.text_tokens ?? 0) * REALTIME_PRICE.textIn +
      audioIn * REALTIME_PRICE.audioIn +
      cached * REALTIME_PRICE.cachedIn +
      (o.text_tokens ?? 0) * REALTIME_PRICE.textOut +
      (o.audio_tokens ?? 0) * REALTIME_PRICE.audioOut) /
    1_000_000
  );
}
