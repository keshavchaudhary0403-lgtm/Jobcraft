import { createServiceClient } from "@/lib/supabase/server";
import { JOB_BOARDS } from "@/lib/company-domain";

/** A company website reduced to its domain (acme.co.in), or null for job boards / junk. */
export function toDomain(site?: string | null): string | null {
  if (!site) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`);
    const host = u.hostname.toLowerCase().replace(/^(www|careers|jobs|career)\./, "");
    if (!host.includes(".") || JOB_BOARDS.test(host + ".")) return null;
    return host;
  } catch {
    return null;
  }
}

const norm = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/\b(pvt|private|ltd|limited|inc|llp|corp|co)\b\.?/g, "").replace(/[^a-z0-9]/g, "");

/**
 * The company's website from Brandfetch's search - but only when a result's name matches the company
 * exactly (a near-miss like "Curefit" -> "curefit.jp" is a different company, so it's rejected).
 */
export async function findDomain(company: string): Promise<string | null> {
  const id = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;
  const want = norm(company);
  if (!id || want.length < 2) return null;
  try {
    const res = await fetch(`https://api.brandfetch.io/v2/search/${encodeURIComponent(company)}?c=${id}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const list = (await res.json()) as { name?: string | null; domain?: string; claimed?: boolean; verified?: boolean; qualityScore?: number; _score?: number }[];
    // Best-ranked result with exactly this name - and only if Brandfetch trusts it (claimed / verified / high quality).
    // That rejects look-alikes such as curefit.jp (unclaimed, 0.5) for India's Curefit.
    const top = list.filter((x) => x.domain && x.name && norm(x.name) === want).sort((x, y) => (y._score ?? 0) - (x._score ?? 0))[0];
    if (!top) return null;
    return top.claimed || top.verified || (top.qualityScore ?? 0) >= 0.75 ? top.domain! : null;
  } catch {
    return null;
  }
}

/** Keep the logo the job page showed (LinkedIn/Naukri image links expire). Public: it's a company logo, not personal data. */
export async function saveLogo(userId: string, appId: string, dataUrl?: string | null): Promise<string | null> {
  const m = /^data:(image\/(png|jpeg|webp|gif|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!m) return null;
  const bytes = Buffer.from(m[3], "base64");
  if (bytes.length > 300 * 1024 || bytes.length < 100) return null;
  const s = createServiceClient();
  const { data: b } = await s.storage.getBucket("logos");
  if (!b) await s.storage.createBucket("logos", { public: true, fileSizeLimit: 300 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] });
  if (m[1] === "image/svg+xml") return null; // no SVGs (can carry scripts)
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const path = `${userId}/${appId}.${ext}`;
  const { error } = await s.storage.from("logos").upload(path, bytes, { contentType: m[1], upsert: true });
  if (error) return null;
  return s.storage.from("logos").getPublicUrl(path).data.publicUrl;
}
