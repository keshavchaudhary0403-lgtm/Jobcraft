import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO, demoStructured } from "./demo";

import { AI_MODELS, type ModelId } from "./models";
export { AI_MODELS, DEFAULT_MODEL, isModelId, type ModelId } from "./models";
import { DEFAULT_MODEL, isModelId, PROVIDERS, providerOf } from "./models";

let _client: OpenAI | null = null;
export function openai() {
  if (!_client) _client = new OpenAI(); // reads OPENAI_API_KEY
  return _client;
}

let _claude: Anthropic | null = null;
export function claude() {
  if (!_claude) _claude = new Anthropic(); // reads ANTHROPIC_API_KEY
  return _claude;
}

/**
 * Claude Opus 5.5 / Sonnet 5.5 can decline a request on safety grounds. With fallbacks on,
 * the API re-runs a declined request on Anthropic's recommended fallback model in the same call.
 */
export function claudeFallback(model: ModelId): { betas?: Anthropic.Beta.AnthropicBeta[]; fallbacks?: "default" } {
  return model === "claude-opus-5-5" || model === "claude-sonnet-5-5" ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {};
}

/** Token usage in one shape for both providers. `input` includes cached and cache-write tokens. */
export type Usage = { input: number; cached: number; cacheWrite: number; output: number };
export function usageFromOpenAI(u: OpenAI.Responses.ResponseUsage | null | undefined): Usage | null {
  if (!u) return null;
  return { input: u.input_tokens ?? 0, cached: u.input_tokens_details?.cached_tokens ?? 0, cacheWrite: 0, output: u.output_tokens ?? 0 };
}
export function usageFromClaude(u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null } | null | undefined): Usage | null {
  if (!u) return null;
  const cached = u.cache_read_input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  return { input: u.input_tokens + cached + cacheWrite, cached, cacheWrite, output: u.output_tokens };
}
/** OpenAI reasoning effort -> Claude effort (Claude has no "none"; thinking stays adaptive). */
export const claudeEffort = (e: "none" | "low" | "medium" | "high") => (e === "none" ? "low" : e);

export type Settings = {
  ai_model: string;
  default_monthly_limit_inr: number | null;
  total_monthly_limit_inr: number | null;
  usd_to_inr: number;
  fx_auto: boolean;
  fx_updated_at: string | null;
  fx_source: string | null;
  demo_enabled: boolean;
  voice_name: string;
  feature_limits: Record<string, number>;
};

const FX_MAX_AGE_MS = 6 * 3600 * 1000; // refresh the live rate every 6 hours

/** Live USD→INR from free public sources (no key, no user data sent). Returns null if all fail. */
async function fetchUsdInr(): Promise<{ rate: number; source: string } | null> {
  const sources: [string, string, (d: Record<string, unknown>) => unknown][] = [
    ["open.er-api.com", "https://open.er-api.com/v6/latest/USD", (d) => (d.rates as Record<string, number>)?.INR],
    ["Frankfurter (ECB)", "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR", (d) => (d.rates as Record<string, number>)?.INR],
  ];
  for (const [source, url, pick] of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000), cache: "no-store" });
      if (!res.ok) continue;
      const rate = Number(pick(await res.json()));
      if (rate > 50 && rate < 200) return { rate, source }; // sanity check
    } catch {
      // try the next source
    }
  }
  return null;
}

export async function getSettings(admin: SupabaseClient): Promise<Settings & { model: ModelId }> {
  const { data } = await admin.from("app_settings").select("*").eq("id", 1).maybeSingle();
  const s: Settings = {
    ai_model: data?.ai_model ?? DEFAULT_MODEL,
    default_monthly_limit_inr: data?.default_monthly_limit_inr != null ? Number(data.default_monthly_limit_inr) : null,
    total_monthly_limit_inr: data?.total_monthly_limit_inr != null ? Number(data.total_monthly_limit_inr) : null,
    usd_to_inr: Number(data?.usd_to_inr ?? 88),
    fx_auto: data?.fx_auto ?? true,
    fx_updated_at: data?.fx_updated_at ?? null,
    fx_source: data?.fx_source ?? null,
    demo_enabled: !!data?.demo_enabled,
    voice_name: data?.voice_name ?? "marin",
    feature_limits: (data?.feature_limits as Record<string, number>) ?? {},
  };
  const stale = !s.fx_updated_at || Date.now() - new Date(s.fx_updated_at).getTime() > FX_MAX_AGE_MS;
  if (s.fx_auto && stale) {
    const live = await fetchUsdInr();
    if (live) {
      s.usd_to_inr = Math.round(live.rate * 100) / 100;
      s.fx_updated_at = new Date().toISOString();
      s.fx_source = live.source;
      await admin
        .from("app_settings")
        .update({ usd_to_inr: s.usd_to_inr, fx_updated_at: s.fx_updated_at, fx_source: s.fx_source })
        .eq("id", 1);
    }
    // If every source fails, keep the last saved rate.
  }
  const envModel = process.env.OPENAI_MODEL;
  const model: ModelId = isModelId(s.ai_model) ? s.ai_model : envModel && isModelId(envModel) ? envModel : DEFAULT_MODEL;
  return { ...s, model };
}

/** First moment of the current month in India time, as an ISO string. */
export function monthStartIST(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const startIstAsUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1);
  return new Date(startIstAsUtc - 5.5 * 3600 * 1000).toISOString();
}

export function costUsd(model: ModelId, input: number, cached: number, output: number, cacheWrite = 0) {
  const p = AI_MODELS[model];
  return (Math.max(0, input - cached - cacheWrite) * p.input + cached * p.cached + cacheWrite * p.cacheWrite + output * p.output) / 1_000_000;
}

async function sumCost(admin: SupabaseClient, userId?: string) {
  let q = admin.from("usage_events").select("cost_usd").gte("created_at", monthStartIST());
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  return (data ?? []).reduce((t, r) => t + Number(r.cost_usd), 0);
}

export type AiMode = "real" | "demo" | "off";

/** A provider can only be used when its key is on the server. */
export const providerReady = (m: ModelId) => !!process.env[PROVIDERS[providerOf(m)].key];

/**
 * App settings with this person's own AI model applied (admin sets it per person; empty = app default).
 * A personal model whose provider has no key falls back to the app model.
 */
export async function personalSettings<T extends Settings & { model: ModelId }>(admin: SupabaseClient, userId: string, s: T): Promise<T> {
  const { data, error } = await admin.from("profiles").select("ai_model").eq("id", userId).maybeSingle();
  if (error || !data) return s; // before migration 010 the columns don't exist yet
  const model = data.ai_model && isModelId(data.ai_model) && providerReady(data.ai_model) ? data.ai_model : s.model;
  return { ...s, model };
}

/**
 * Can this user use AI right now?
 * - ai_mode "off"  → blocked
 * - ai_mode "demo" → sample answers, no AI call, no cost, no limits
 * - ai_mode "real" → monthly per-user + total limits apply
 */
export async function checkLimits(admin: SupabaseClient, userId: string, profile: { monthly_limit_inr: number | null; ai_mode?: string | null }) {
  const s = await personalSettings(admin, userId, await getSettings(admin));
  const mode = (profile.ai_mode ?? "real") as AiMode;
  if (mode === "off") return { error: "AI is turned off for your account. Ask your admin to turn it on.", settings: s, demo: false };
  if (mode === "demo") return { error: null, settings: s, demo: true };
  const userLimitInr = profile.monthly_limit_inr;
  const limit = userLimitInr ?? s.default_monthly_limit_inr;
  if (limit != null) {
    const spentInr = (await sumCost(admin, userId)) * s.usd_to_inr;
    if (spentInr >= limit) {
      return { error: `You've used your AI limit for this month (₹${limit}). It resets on the 1st - or ask your admin to raise it.`, settings: s, demo: false };
    }
  }
  if (s.total_monthly_limit_inr != null) {
    const allInr = (await sumCost(admin)) * s.usd_to_inr;
    if (allInr >= s.total_monthly_limit_inr) {
      return { error: "Jobcraft has reached its AI budget for this month. Please contact your admin.", settings: s, demo: false };
    }
  }
  return { error: null, settings: s, demo: false };
}

export async function logUsage(
  admin: SupabaseClient,
  e: { userId: string; sessionId?: string | null; feature: string; model: ModelId; usage?: Usage | null },
) {
  if (!e.usage) return;
  const { input, cached, cacheWrite, output } = e.usage;
  await admin.from("usage_events").insert({
    user_id: e.userId,
    session_id: e.sessionId ?? null,
    feature: e.feature,
    model: e.model,
    input_tokens: input,
    cached_tokens: cached,
    output_tokens: output,
    cost_usd: costUsd(e.model, input, cached, output, cacheWrite),
  });
}

/** Month-to-date spend in ₹ for every user (admin view). */
export async function spendByUser(admin: SupabaseClient, usdToInr: number) {
  const { data } = await admin.from("usage_events").select("user_id, cost_usd").gte("created_at", monthStartIST());
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[r.user_id] = (out[r.user_id] ?? 0) + Number(r.cost_usd) * usdToInr;
  return out;
}

export function aiErrorMessage(err: unknown) {
  if (err instanceof Anthropic.RateLimitError) return "Claude is busy or the Anthropic credits have run out. Try again in a minute.";
  if (err instanceof Anthropic.AuthenticationError) return "The Claude key is not set up correctly. Ask your admin.";
  if (err instanceof Anthropic.APIError) return `Claude service error (${err.status ?? "network"}). Please try again.`;
  if (err instanceof OpenAI.RateLimitError) return "ChatGPT is busy or its credits have run out. Try again in a minute.";
  if (err instanceof OpenAI.AuthenticationError) return "The ChatGPT key is not set up correctly. Ask your admin.";
  if (err instanceof OpenAI.APIError) return `ChatGPT service error (${err.status ?? "network"}). Please try again.`;
  return "Something went wrong. Please try again.";
}

/** Input for one structured call: plain text, or a PDF plus a short note (resume upload). */
export type AiInput = string | { pdf: { base64: string; filename: string }; text: string };

/** One structured-output call on whichever provider the model belongs to. Returns parsed JSON + usage. */
export async function runStructured<T>(opts: {
  model: ModelId;
  name: string;
  schema: object;
  instructions: string;
  input: AiInput;
  effort?: "none" | "low" | "medium" | "high";
  userId: string;
  /** Sample answer instead of a real AI call (user in demo mode). */
  demo?: boolean;
}): Promise<{ data: T; usage: Usage | null }> {
  if (DEMO || opts.demo) return { data: await demoStructured<T>(opts.name), usage: null };
  let effort = opts.effort ?? "low";

  if (providerOf(opts.model) === "anthropic") {
    const content: Anthropic.Beta.BetaContentBlockParam[] =
      typeof opts.input === "string"
        ? [{ type: "text", text: opts.input }]
        : [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: opts.input.pdf.base64 }, title: opts.input.pdf.filename },
            { type: "text", text: opts.input.text },
          ];
    const res = await claude().beta.messages.create({
      ...claudeFallback(opts.model),
      model: opts.model,
      max_tokens: 16000,
      system: opts.instructions,
      messages: [{ role: "user", content }],
      output_config: { effort: claudeEffort(effort), format: { type: "json_schema", schema: opts.schema as Record<string, unknown> } },
      metadata: { user_id: opts.userId },
    });
    if (res.stop_reason === "refusal") throw new Error("The AI declined this request. Try rewording it.");
    if (res.stop_reason === "max_tokens") throw new Error("The AI answer was cut short. Please try again.");
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return { data: humanise(JSON.parse(text)) as T, usage: usageFromClaude(res.usage) };
  }

  if (effort === "none" && !AI_MODELS[opts.model].noneEffort) effort = "low";
  const input: string | OpenAI.Responses.ResponseInputItem[] =
    typeof opts.input === "string"
      ? opts.input
      : [
          {
            role: "user",
            content: [
              { type: "input_file", filename: opts.input.pdf.filename, file_data: `data:application/pdf;base64,${opts.input.pdf.base64}` },
              { type: "input_text", text: opts.input.text },
            ],
          },
        ];
  const res = await openai().responses.create({
    model: opts.model,
    instructions: opts.instructions,
    input,
    reasoning: { effort },
    text: { format: { type: "json_schema", name: opts.name, schema: opts.schema as Record<string, unknown>, strict: true } },
    max_output_tokens: 32000,
    store: false,
    safety_identifier: opts.userId,
  });
  if (res.status === "incomplete") throw new Error("The AI answer was cut short. Please try again.");
  return { data: humanise(JSON.parse(res.output_text)) as T, usage: usageFromOpenAI(res.usage) };
}

/** Strip typographic tells (long dashes, curly quotes, ellipsis characters) from AI text. */
export function humaniseText(t: string) {
  return t.replace(/\s*[\u2014\u2013]\s*/g, (m) => (/\s/.test(m) ? " - " : "-")).replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/\u2026/g, "...");
}
/** Removes model notes such as "(inferred from UC)" or "(SCM; inferred)" from short name fields. */
export function cleanField(t: string) {
  return t.replace(/\s*\([^()]*\b(inferred|likely|assumed|guess(ed)?|probably|unclear|not stated)\b[^()]*\)/gi, "").trim();
}
const NAME_FIELDS = new Set(["company", "role", "location", "company_type", "seniority"]);
function humanise(v: unknown, key = ""): unknown {
  if (typeof v === "string") return NAME_FIELDS.has(key) ? cleanField(humaniseText(v)) : humaniseText(v);
  if (Array.isArray(v)) return v.map((x) => humanise(x));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, humanise(x, k)]));
  return v;
}
