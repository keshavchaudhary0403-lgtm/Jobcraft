import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AI_MODELS, type ModelId } from "./models";
export { AI_MODELS, DEFAULT_MODEL, isModelId, type ModelId } from "./models";
import { DEFAULT_MODEL, isModelId } from "./models";

let _client: OpenAI | null = null;
export function openai() {
  if (!_client) _client = new OpenAI(); // reads OPENAI_API_KEY
  return _client;
}

export type Settings = {
  ai_model: string;
  default_monthly_limit_inr: number | null;
  total_monthly_limit_inr: number | null;
  usd_to_inr: number;
};

export async function getSettings(admin: SupabaseClient): Promise<Settings & { model: ModelId }> {
  const { data } = await admin.from("app_settings").select("*").eq("id", 1).maybeSingle();
  const s: Settings = {
    ai_model: data?.ai_model ?? DEFAULT_MODEL,
    default_monthly_limit_inr: data?.default_monthly_limit_inr != null ? Number(data.default_monthly_limit_inr) : null,
    total_monthly_limit_inr: data?.total_monthly_limit_inr != null ? Number(data.total_monthly_limit_inr) : null,
    usd_to_inr: Number(data?.usd_to_inr ?? 88),
  };
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

export function costUsd(model: ModelId, input: number, cached: number, output: number) {
  const p = AI_MODELS[model];
  return ((input - cached) * p.input + cached * p.cached + output * p.output) / 1_000_000;
}

async function sumCost(admin: SupabaseClient, userId?: string) {
  let q = admin.from("usage_events").select("cost_usd").gte("created_at", monthStartIST());
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  return (data ?? []).reduce((t, r) => t + Number(r.cost_usd), 0);
}

/** Returns an error message if this user (or the whole app) has hit its monthly limit, else null. */
export async function checkLimits(admin: SupabaseClient, userId: string, userLimitInr: number | null) {
  const s = await getSettings(admin);
  const limit = userLimitInr ?? s.default_monthly_limit_inr;
  if (limit != null) {
    const spentInr = (await sumCost(admin, userId)) * s.usd_to_inr;
    if (spentInr >= limit) {
      return { error: `You've used your AI limit for this month (₹${limit}). It resets on the 1st — or ask your admin to raise it.`, settings: s };
    }
  }
  if (s.total_monthly_limit_inr != null) {
    const allInr = (await sumCost(admin)) * s.usd_to_inr;
    if (allInr >= s.total_monthly_limit_inr) {
      return { error: "Jobcraft has reached its AI budget for this month. Please contact your admin.", settings: s };
    }
  }
  return { error: null, settings: s };
}

export async function logUsage(
  admin: SupabaseClient,
  e: { userId: string; sessionId?: string | null; feature: string; model: ModelId; usage?: OpenAI.Responses.ResponseUsage | null },
) {
  if (!e.usage) return;
  const input = e.usage.input_tokens ?? 0;
  const cached = e.usage.input_tokens_details?.cached_tokens ?? 0;
  const output = e.usage.output_tokens ?? 0;
  await admin.from("usage_events").insert({
    user_id: e.userId,
    session_id: e.sessionId ?? null,
    feature: e.feature,
    model: e.model,
    input_tokens: input,
    cached_tokens: cached,
    output_tokens: output,
    cost_usd: costUsd(e.model, input, cached, output),
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
  if (err instanceof OpenAI.RateLimitError) return "The AI is busy or the OpenAI credits have run out. Try again in a minute.";
  if (err instanceof OpenAI.AuthenticationError) return "The AI key is not set up correctly (OPENAI_API_KEY).";
  if (err instanceof OpenAI.APIError) return `AI service error (${err.status ?? "network"}). Please try again.`;
  return "Something went wrong. Please try again.";
}
