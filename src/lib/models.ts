// No imports here - safe to use in browser components.

/**
 * Models the admin can pick. Prices are USD per 1M tokens, from OpenAI's pricing page (Nov 2026).
 * Update here if OpenAI changes prices.
 */
export const AI_MODELS = {
  "gpt-6-luna": {
    label: "GPT-6 Luna - cheapest",
    note: "Lowest cost. Fine for practice chats; writing is plainer.",
    input: 0.1,
    cached: 0.01,
    output: 0.5,
    noneEffort: true,
  },
  "gpt-6.1-terra": {
    label: "GPT-6.1 Terra - recommended",
    note: "Clear, natural writing at a low price. Best balance for resumes and outreach.",
    input: 1.0,
    cached: 0.05,
    output: 5.0,
    noneEffort: true,
  },
  "gpt-6.2-sol": {
    label: "GPT-6.2 Sol - higher quality",
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
