/**
 * Small in-memory rate limiter (per server instance). Good enough to slow down
 * password guessing and demo-login spam; Supabase Auth adds its own limits on top.
 */
const hits = new Map<string, number[]>();

export function rateLimited(req: Request, bucket: string, max: number, windowMs: number): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return recent.length > max;
}
