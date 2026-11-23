import { createServiceClient } from "@/lib/supabase/server";
import { FEATURES, effectiveLimit, type FeatureKey, type FeatureLimits } from "@/lib/features";

/**
 * Shared rate limiting backed by Postgres (one counter per key across all server
 * instances). If the database can't be reached, falls back to a per-instance memory
 * counter so limits never silently disappear.
 */
const mem = new Map<string, number[]>();

function memoryHit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (mem.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  mem.set(key, recent);
  if (mem.size > 5000) for (const [k, v] of mem) if (!v.some((t) => now - t < windowMs)) mem.delete(k);
  return recent.length > max;
}

/** The caller's real IP. On Vercel this header is set by the platform and can't be spoofed. */
export function clientIp(req: Request) {
  return (
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

/** Counts one hit; returns true if `key` is over `max` hits per `windowSec`. */
export async function overLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  try {
    const { data, error } = await createServiceClient().rpc("hit_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSec });
    if (error) throw error;
    return data === true;
  } catch {
    return memoryHit(key, max, windowSec * 1000);
  }
}

/**
 * Per-person AI feature gate, using the limits the admin set (person → app default → built-in).
 * Returns "off" if the feature is switched off for them, "limited" if they're going too fast, else null.
 */
export async function aiLimited(userId: string, feature: FeatureKey, userLimits?: FeatureLimits | null): Promise<"off" | "limited" | null> {
  let appLimits: FeatureLimits | null = null;
  try {
    const { data } = await createServiceClient().from("app_settings").select("feature_limits").eq("id", 1).maybeSingle();
    appLimits = (data?.feature_limits as FeatureLimits) ?? null;
  } catch {}
  const max = effectiveLimit(feature, userLimits, appLimits);
  if (max <= 0) return "off";
  return (await overLimit(`ai:${feature}:${userId}`, max, FEATURES[feature].window)) ? "limited" : null;
}

export function gateResponse(gate: "off" | "limited", feature: FeatureKey) {
  return gate === "off"
    ? Response.json({ error: `${FEATURES[feature].label} is switched off for your account. Ask your admin.` }, { status: 403 })
    : Response.json({ error: `You've hit your limit for ${FEATURES[feature].label.toLowerCase()} (${FEATURES[feature].per}). Wait a little and try again.` }, { status: 429 });
}
