import { createServiceClient } from "@/lib/supabase/server";

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

/** Per-user limits for AI features — stops anyone burning credits in a burst. */
export const AI_LIMITS = {
  generate: [20, 60],
  chat: [40, 60],
  detect: [30, 60],
  parse: [10, 3600],
  insight: [20, 3600],
  voice: [12, 3600],
} as const;

export async function aiLimited(userId: string, feature: keyof typeof AI_LIMITS) {
  const [max, win] = AI_LIMITS[feature];
  return overLimit(`ai:${feature}:${userId}`, max, win);
}

export const TOO_FAST = "You're going a bit fast — wait a minute and try again.";
